#!/usr/bin/env node

/**
 * Script para sincronizar la base de datos de desarrollo a producción
 * 
 * Este script:
 * 1. Lee los datos de desarrollo (SQLite local)
 * 2. Limpia la base de datos de producción (PostgreSQL)
 * 3. Migra los datos de desarrollo a producción
 * 4. Preserva las reservas existentes en producción si es necesario
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class DevToProdMigrator {
    constructor() {
        this.devDbPath = './data/database.sqlite';
        this.devDb = null;
        this.prodPool = null;
    }

    async connectDevDb() {
        return new Promise((resolve, reject) => {
            this.devDb = new sqlite3.Database(this.devDbPath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a SQLite de desarrollo:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado a base de datos de desarrollo (SQLite)');
                    resolve();
                }
            });
        });
    }

    async connectProdDb() {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurado');
        }

        this.prodPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        const client = await this.prodPool.connect();
        console.log('✅ Conectado a base de datos de producción (PostgreSQL)');
        client.release();
    }

    async readDevData() {
        console.log('\n📖 LEYENDO DATOS DE DESARROLLO');
        console.log('==============================');

        const ciudades = await this.queryDev('SELECT * FROM ciudades ORDER BY id');
        const complejos = await this.queryDev(`
            SELECT c.*, ci.nombre as ciudad_nombre 
            FROM complejos c 
            JOIN ciudades ci ON c.ciudad_id = ci.id 
            ORDER BY c.id
        `);
        const canchas = await this.queryDev(`
            SELECT ca.*, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM canchas ca 
            JOIN complejos co ON ca.complejo_id = co.id 
            JOIN ciudades ci ON co.ciudad_id = ci.id 
            ORDER BY ca.id
        `);
        const reservas = await this.queryDev('SELECT * FROM reservas ORDER BY id');

        console.log(`📊 Datos de desarrollo:`);
        console.log(`   - Ciudades: ${ciudades.length}`);
        ciudades.forEach(ciudad => {
            console.log(`     * ${ciudad.nombre} (ID: ${ciudad.id})`);
        });
        
        console.log(`   - Complejos: ${complejos.length}`);
        complejos.forEach(complejo => {
            console.log(`     * ${complejo.nombre} en ${complejo.ciudad_nombre} (ID: ${complejo.id})`);
        });
        
        console.log(`   - Canchas: ${canchas.length}`);
        canchas.forEach(cancha => {
            console.log(`     * ${cancha.nombre} en ${cancha.complejo_nombre} (ID: ${cancha.id}) - $${cancha.precio_hora}`);
        });
        
        console.log(`   - Reservas: ${reservas.length}`);

        return { ciudades, complejos, canchas, reservas };
    }

    async cleanProdDb() {
        console.log('\n🧹 LIMPIANDO BASE DE DATOS DE PRODUCCIÓN');
        console.log('=======================================');

        const client = await this.prodPool.connect();
        
        try {
            // Verificar datos actuales
            const ciudadesActuales = await client.query('SELECT * FROM ciudades');
            const complejosActuales = await client.query('SELECT * FROM complejos');
            const canchasActuales = await client.query('SELECT * FROM canchas');
            const reservasActuales = await client.query('SELECT COUNT(*) as count FROM reservas');

            console.log(`📊 Estado actual de producción:`);
            console.log(`   - Ciudades: ${ciudadesActuales.rows.length}`);
            console.log(`   - Complejos: ${complejosActuales.rows.length}`);
            console.log(`   - Canchas: ${canchasActuales.rows.length}`);
            console.log(`   - Reservas: ${reservasActuales.rows[0].count}`);

            // Limpiar datos (excepto usuarios y configuraciones)
            console.log('\n🗑️ Eliminando datos existentes...');
            
            // Primero eliminar reservas
            await client.query('DELETE FROM reservas');
            console.log('✅ Reservas eliminadas');
            
            // Eliminar canchas
            await client.query('DELETE FROM canchas');
            console.log('✅ Canchas eliminadas');
            
            // Actualizar usuarios para que no referencien complejos
            await client.query('UPDATE usuarios SET complejo_id = NULL');
            console.log('✅ Referencias de usuarios a complejos eliminadas');
            
            // Ahora eliminar complejos
            await client.query('DELETE FROM complejos');
            console.log('✅ Complejos eliminados');
            
            // Eliminar ciudades
            await client.query('DELETE FROM ciudades');
            console.log('✅ Ciudades eliminadas');

        } finally {
            client.release();
        }
    }

    async migrateData(devData) {
        console.log('\n🚀 MIGRANDO DATOS A PRODUCCIÓN');
        console.log('==============================');

        const client = await this.prodPool.connect();
        
        try {
            // 1. Migrar ciudades
            console.log('\n🏙️ Migrando ciudades...');
            for (const ciudad of devData.ciudades) {
                const result = await client.query(
                    'INSERT INTO ciudades (id, nombre) VALUES ($1, $2)',
                    [ciudad.id, ciudad.nombre]
                );
                console.log(`✅ Ciudad migrada: ${ciudad.nombre} (ID: ${ciudad.id})`);
            }

            // 2. Migrar complejos
            console.log('\n🏢 Migrando complejos...');
            for (const complejo of devData.complejos) {
                const result = await client.query(`
                    INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    complejo.id, 
                    complejo.nombre, 
                    complejo.ciudad_id,
                    complejo.direccion || null,
                    complejo.telefono || null,
                    complejo.email || null
                ]);
                console.log(`✅ Complejo migrado: ${complejo.nombre} (ID: ${complejo.id})`);
            }

            // 3. Migrar canchas
            console.log('\n🏟️ Migrando canchas...');
            for (const cancha of devData.canchas) {
                const result = await client.query(`
                    INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    cancha.id,
                    cancha.complejo_id,
                    cancha.nombre,
                    cancha.tipo,
                    cancha.precio_hora
                ]);
                console.log(`✅ Cancha migrada: ${cancha.nombre} en ${cancha.complejo_nombre} (ID: ${cancha.id})`);
            }

            // 4. Migrar reservas
            console.log('\n📋 Migrando reservas...');
            for (const reserva of devData.reservas) {
                const result = await client.query(`
                    INSERT INTO reservas (
                        id, codigo_reserva, cancha_id, usuario_id, nombre_cliente, 
                        email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, 
                        hora_fin, estado, estado_pago, precio_total, created_at, fecha_creacion
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                `, [
                    reserva.id,
                    reserva.codigo_reserva,
                    reserva.cancha_id,
                    reserva.usuario_id,
                    reserva.nombre_cliente,
                    reserva.email_cliente,
                    reserva.telefono_cliente || null,
                    reserva.rut_cliente || null,
                    reserva.fecha,
                    reserva.hora_inicio,
                    reserva.hora_fin,
                    reserva.estado,
                    reserva.estado_pago || 'pendiente',
                    reserva.precio_total,
                    reserva.created_at,
                    reserva.fecha_creacion || reserva.created_at
                ]);
                console.log(`✅ Reserva migrada: ${reserva.codigo_reserva} (ID: ${reserva.id})`);
            }

        } finally {
            client.release();
        }
    }

    async verifyMigration() {
        console.log('\n🔍 VERIFICANDO MIGRACIÓN');
        console.log('=======================');

        const client = await this.prodPool.connect();
        
        try {
            const ciudades = await client.query('SELECT * FROM ciudades ORDER BY id');
            const complejos = await client.query(`
                SELECT c.*, ci.nombre as ciudad_nombre 
                FROM complejos c 
                JOIN ciudades ci ON c.ciudad_id = ci.id 
                ORDER BY c.id
            `);
            const canchas = await client.query(`
                SELECT ca.*, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
                FROM canchas ca 
                JOIN complejos co ON ca.complejo_id = co.id 
                JOIN ciudades ci ON co.ciudad_id = ci.id 
                ORDER BY ca.id
            `);
            const reservas = await client.query('SELECT COUNT(*) as count FROM reservas');

            console.log('\n🎯 RESULTADO FINAL DE PRODUCCIÓN:');
            console.log(`   - Ciudades: ${ciudades.rows.length}`);
            ciudades.rows.forEach(ciudad => {
                console.log(`     * ${ciudad.nombre} (ID: ${ciudad.id})`);
            });
            
            console.log(`   - Complejos: ${complejos.rows.length}`);
            complejos.rows.forEach(complejo => {
                console.log(`     * ${complejo.nombre} en ${complejo.ciudad_nombre} (ID: ${complejo.id})`);
            });
            
            console.log(`   - Canchas: ${canchas.rows.length}`);
            canchas.rows.forEach(cancha => {
                console.log(`     * ${cancha.nombre} en ${cancha.complejo_nombre} (ID: ${cancha.id}) - $${cancha.precio_hora}`);
            });
            
            console.log(`   - Reservas: ${reservas.rows[0].count}`);

            // Verificar integridad
            const reservasInvalidas = await client.query(`
                SELECT COUNT(*) as count 
                FROM reservas r 
                LEFT JOIN canchas c ON r.cancha_id = c.id 
                WHERE c.id IS NULL
            `);

            if (reservasInvalidas.rows[0].count > 0) {
                console.log(`⚠️ ADVERTENCIA: ${reservasInvalidas.rows[0].count} reservas tienen canchas inválidas`);
            } else {
                console.log(`✅ Todas las reservas son válidas`);
            }

        } finally {
            client.release();
        }
    }

    async queryDev(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.devDb.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        if (this.devDb) {
            this.devDb.close();
            console.log('✅ Conexión SQLite cerrada');
        }
        
        if (this.prodPool) {
            await this.prodPool.end();
            console.log('✅ Conexión PostgreSQL cerrada');
        }
    }

    async migrate() {
        try {
            console.log('🚀 INICIANDO MIGRACIÓN DE DESARROLLO A PRODUCCIÓN');
            console.log('================================================');
            console.log('⚠️ ADVERTENCIA: Esta operación reemplazará todos los datos de producción');
            console.log('📋 Con los datos actuales de desarrollo');
            
            // Conectar a ambas bases de datos
            await this.connectDevDb();
            await this.connectProdDb();
            
            // Leer datos de desarrollo
            const devData = await this.readDevData();
            
            // Limpiar base de datos de producción
            await this.cleanProdDb();
            
            // Migrar datos
            await this.migrateData(devData);
            
            // Verificar migración
            await this.verifyMigration();
            
            console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
            console.log('===================================');
            console.log('✅ Base de datos de producción actualizada con datos de desarrollo');
            console.log('🌐 Puedes verificar los cambios en tu aplicación web');
            
        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const migrator = new DevToProdMigrator();
    migrator.migrate()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = DevToProdMigrator;

#!/usr/bin/env node

/**
 * Script para limpiar bases de datos y dejar solo lo esencial:
 * - 1 ciudad: Los Ángeles
 * - 1 complejo: MagnaSports
 * - 2 canchas: Cancha Techada 1 y Cancha Techada 2
 * - 0 reservas (limpio)
 */

const { Pool } = require('pg');
require('dotenv').config();

class EssentialDatabaseCleaner {
    constructor() {
        this.postgresPool = null;
    }

    async connectPostgreSQL() {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL no está configurado');
        }

        this.postgresPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        const client = await this.postgresPool.connect();
        console.log('✅ Conectado a PostgreSQL');
        client.release();
    }

    async getCurrentData() {
        console.log('\n📊 DATOS ACTUALES:');
        console.log('==================');

        const client = await this.postgresPool.connect();
        
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
            const usuarios = await client.query('SELECT COUNT(*) as count FROM usuarios');
            const reservas = await client.query('SELECT COUNT(*) as count FROM reservas');

            console.log(`🏙️ Ciudades (${ciudades.rows.length}):`);
            ciudades.rows.forEach(ciudad => {
                console.log(`   - ID: ${ciudad.id}, Nombre: ${ciudad.nombre}`);
            });
            
            console.log(`🏢 Complejos (${complejos.rows.length}):`);
            complejos.rows.forEach(complejo => {
                console.log(`   - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Ciudad: ${complejo.ciudad_nombre}`);
            });
            
            console.log(`🏟️ Canchas (${canchas.rows.length}):`);
            canchas.rows.forEach(cancha => {
                console.log(`   - ID: ${cancha.id}, Nombre: ${cancha.nombre}, Complejo: ${cancha.complejo_nombre}, Ciudad: ${cancha.ciudad_nombre}`);
            });
            
            console.log(`👥 Usuarios: ${usuarios.rows[0].count}`);
            console.log(`📋 Reservas: ${reservas.rows[0].count}`);

            return { ciudades: ciudades.rows, complejos: complejos.rows, canchas: canchas.rows };
        } finally {
            client.release();
        }
    }

    async cleanToEssential() {
        console.log('\n🧹 LIMPIANDO A ESTRUCTURA ESENCIAL');
        console.log('==================================');

        const client = await this.postgresPool.connect();
        
        try {
            // 1. Eliminar todas las reservas
            await client.query('DELETE FROM reservas');
            console.log('✅ Reservas eliminadas');

            // 2. Eliminar todas las canchas
            await client.query('DELETE FROM canchas');
            console.log('✅ Canchas eliminadas');

            // 3. Actualizar usuarios para que no referencien complejos
            await client.query('UPDATE usuarios SET complejo_id = NULL');
            console.log('✅ Referencias de usuarios a complejos eliminadas');

            // 4. Eliminar todos los complejos
            await client.query('DELETE FROM complejos');
            console.log('✅ Complejos eliminados');

            // 5. Eliminar todas las ciudades
            await client.query('DELETE FROM ciudades');
            console.log('✅ Ciudades eliminadas');

        } finally {
            client.release();
        }
    }

    async createEssentialStructure() {
        console.log('\n🏗️ CREANDO ESTRUCTURA ESENCIAL');
        console.log('===============================');

        const client = await this.postgresPool.connect();
        
        try {
            // 1. Crear ciudad Los Ángeles
            const ciudadResult = await client.query(`
                INSERT INTO ciudades (id, nombre) VALUES (1, 'Los Ángeles')
            `);
            console.log('✅ Ciudad Los Ángeles creada (ID: 1)');

            // 2. Crear complejo MagnaSports
            const complejoResult = await client.query(`
                INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
                VALUES (1, 'MagnaSports', 1, 'Monte Perdido 1685', '+56987654321', 'reservas@magnasports.cl')
            `);
            console.log('✅ Complejo MagnaSports creado (ID: 1)');

            // 3. Crear canchas de MagnaSports
            const cancha1Result = await client.query(`
                INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
                VALUES (1, 1, 'Cancha Techada 1', 'futbol', 28000)
            `);
            console.log('✅ Cancha Techada 1 creada (ID: 1)');

            const cancha2Result = await client.query(`
                INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
                VALUES (2, 1, 'Cancha Techada 2', 'futbol', 28000)
            `);
            console.log('✅ Cancha Techada 2 creada (ID: 2)');

        } finally {
            client.release();
        }
    }

    async verifyEssentialStructure() {
        console.log('\n🔍 VERIFICANDO ESTRUCTURA ESENCIAL');
        console.log('===================================');

        const client = await this.postgresPool.connect();
        
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
            const usuarios = await client.query('SELECT COUNT(*) as count FROM usuarios');
            const reservas = await client.query('SELECT COUNT(*) as count FROM reservas');

            console.log('\n🎯 ESTRUCTURA FINAL:');
            console.log(`🏙️ Ciudades (${ciudades.rows.length}):`);
            ciudades.rows.forEach(ciudad => {
                console.log(`   ✅ ${ciudad.nombre} (ID: ${ciudad.id})`);
            });
            
            console.log(`🏢 Complejos (${complejos.rows.length}):`);
            complejos.rows.forEach(complejo => {
                console.log(`   ✅ ${complejo.nombre} en ${complejo.ciudad_nombre} (ID: ${complejo.id})`);
            });
            
            console.log(`🏟️ Canchas (${canchas.rows.length}):`);
            canchas.rows.forEach(cancha => {
                console.log(`   ✅ ${cancha.nombre} en ${cancha.complejo_nombre} - $${cancha.precio_hora} (ID: ${cancha.id})`);
            });
            
            console.log(`👥 Usuarios: ${usuarios.rows[0].count} (preservados)`);
            console.log(`📋 Reservas: ${reservas.rows[0].count} (limpias)`);

            // Verificar que es exactamente lo que queremos
            const isCorrect = (
                ciudades.rows.length === 1 &&
                ciudades.rows[0].nombre === 'Los Ángeles' &&
                complejos.rows.length === 1 &&
                complejos.rows[0].nombre === 'MagnaSports' &&
                canchas.rows.length === 2 &&
                canchas.rows.every(c => c.complejo_nombre === 'MagnaSports') &&
                canchas.rows.some(c => c.nombre === 'Cancha Techada 1') &&
                canchas.rows.some(c => c.nombre === 'Cancha Techada 2')
            );

            if (isCorrect) {
                console.log('\n🎉 ¡ESTRUCTURA ESENCIAL PERFECTA!');
                console.log('=================================');
                console.log('✅ Solo Los Ángeles, MagnaSports y sus 2 canchas');
                console.log('✅ Sin ciudades innecesarias');
                console.log('✅ Sin complejos innecesarios');
                console.log('✅ Estructura limpia y optimizada');
                return true;
            } else {
                console.log('\n⚠️ La estructura no es la esperada');
                return false;
            }

        } finally {
            client.release();
        }
    }

    async close() {
        if (this.postgresPool) {
            await this.postgresPool.end();
            console.log('✅ Conexión PostgreSQL cerrada');
        }
    }

    async cleanDatabase() {
        try {
            console.log('🧹 LIMPIANDO BASE DE DATOS A ESTRUCTURA ESENCIAL');
            console.log('===============================================');
            console.log('🎯 Objetivo: Solo Los Ángeles + MagnaSports + 2 canchas');
            
            // Conectar
            await this.connectPostgreSQL();
            
            // Mostrar datos actuales
            await this.getCurrentData();
            
            // Limpiar todo
            await this.cleanToEssential();
            
            // Crear estructura esencial
            await this.createEssentialStructure();
            
            // Verificar resultado
            const isCorrect = await this.verifyEssentialStructure();
            
            if (isCorrect) {
                console.log('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
                console.log('==================================');
                console.log('✅ Base de datos limpia y optimizada');
                console.log('✅ Solo la estructura esencial mantenida');
                console.log('🚀 Lista para usar');
            } else {
                console.log('\n⚠️ LIMPIEZA COMPLETADA CON ADVERTENCIAS');
                console.log('=====================================');
                console.log('Verifica la estructura manualmente');
            }
            
        } catch (error) {
            console.error('❌ Error durante la limpieza:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const cleaner = new EssentialDatabaseCleaner();
    cleaner.cleanDatabase()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = EssentialDatabaseCleaner;

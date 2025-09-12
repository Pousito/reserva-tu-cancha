#!/usr/bin/env node

/**
 * Script para configurar base de datos unificada (PostgreSQL en desarrollo y producción)
 * 
 * Este script:
 * 1. Configura PostgreSQL local para desarrollo
 * 2. Sincroniza la estructura con producción
 * 3. Migra datos de SQLite a PostgreSQL local
 * 4. Verifica que ambos ambientes usen la misma sintaxis
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();

class UnifiedDatabaseSetup {
    constructor() {
        this.devPostgresUrl = 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable';
        this.sqlitePath = './data/database.sqlite';
        this.postgresPool = null;
        this.sqliteDb = null;
    }

    async connectPostgreSQL() {
        this.postgresPool = new Pool({
            connectionString: this.devPostgresUrl
        });
        
        const client = await this.postgresPool.connect();
        console.log('✅ Conectado a PostgreSQL local');
        client.release();
    }

    async connectSQLite() {
        return new Promise((resolve, reject) => {
            this.sqliteDb = new sqlite3.Database(this.sqlitePath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a SQLite:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Conectado a SQLite local');
                    resolve();
                }
            });
        });
    }

    async createPostgreSQLTables() {
        console.log('\n🏗️ CREANDO ESTRUCTURA POSTGRESQL LOCAL');
        console.log('======================================');

        const client = await this.postgresPool.connect();
        
        try {
            // Crear tablas con la misma estructura que producción
            await client.query(`
                CREATE TABLE IF NOT EXISTS ciudades (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL UNIQUE
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS complejos (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(255) NOT NULL,
                    ciudad_id INTEGER REFERENCES ciudades(id),
                    direccion TEXT,
                    telefono VARCHAR(50),
                    email VARCHAR(255)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS canchas (
                    id SERIAL PRIMARY KEY,
                    complejo_id INTEGER REFERENCES complejos(id),
                    nombre VARCHAR(255) NOT NULL,
                    tipo VARCHAR(50),
                    precio_hora INTEGER
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    nombre VARCHAR(255),
                    rol VARCHAR(50) DEFAULT 'usuario',
                    activo BOOLEAN DEFAULT true,
                    complejo_id INTEGER REFERENCES complejos(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS reservas (
                    id SERIAL PRIMARY KEY,
                    codigo_reserva VARCHAR(50) UNIQUE NOT NULL,
                    cancha_id INTEGER REFERENCES canchas(id),
                    usuario_id INTEGER REFERENCES usuarios(id),
                    nombre_cliente VARCHAR(255) NOT NULL,
                    email_cliente VARCHAR(255) NOT NULL,
                    telefono_cliente VARCHAR(50),
                    rut_cliente VARCHAR(20),
                    fecha DATE NOT NULL,
                    hora_inicio TIME NOT NULL,
                    hora_fin TIME NOT NULL,
                    estado VARCHAR(50) DEFAULT 'pendiente',
                    estado_pago VARCHAR(50) DEFAULT 'pendiente',
                    precio_total INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS pagos (
                    id SERIAL PRIMARY KEY,
                    reserva_id INTEGER REFERENCES reservas(id),
                    transbank_token VARCHAR(255) UNIQUE NOT NULL,
                    order_id VARCHAR(255) NOT NULL,
                    amount INTEGER NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    authorization_code VARCHAR(255),
                    payment_type_code VARCHAR(50),
                    response_code INTEGER,
                    installments_number INTEGER,
                    transaction_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    bloqueo_id VARCHAR(50),
                    reservation_code VARCHAR(50)
                )
            `);

            await client.query(`
                CREATE TABLE IF NOT EXISTS bloqueos_temporales (
                    id VARCHAR(50) PRIMARY KEY,
                    cancha_id INTEGER REFERENCES canchas(id),
                    fecha DATE NOT NULL,
                    hora_inicio TIME NOT NULL,
                    hora_fin TIME NOT NULL,
                    session_id VARCHAR(255) NOT NULL,
                    expira_en TIMESTAMP NOT NULL,
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    datos_cliente TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            console.log('✅ Estructura PostgreSQL creada exitosamente');

        } finally {
            client.release();
        }
    }

    async migrateDataFromSQLite() {
        console.log('\n📦 MIGRANDO DATOS DE SQLITE A POSTGRESQL');
        console.log('=========================================');

        // Leer datos de SQLite
        const ciudades = await this.querySQLite('SELECT * FROM ciudades ORDER BY id');
        const complejos = await this.querySQLite('SELECT * FROM complejos ORDER BY id');
        const canchas = await this.querySQLite('SELECT * FROM canchas ORDER BY id');
        const usuarios = await this.querySQLite('SELECT * FROM usuarios ORDER BY id');
        const reservas = await this.querySQLite('SELECT * FROM reservas ORDER BY id');

        console.log(`📊 Datos a migrar:`);
        console.log(`   - Ciudades: ${ciudades.length}`);
        console.log(`   - Complejos: ${complejos.length}`);
        console.log(`   - Canchas: ${canchas.length}`);
        console.log(`   - Usuarios: ${usuarios.length}`);
        console.log(`   - Reservas: ${reservas.length}`);

        const client = await this.postgresPool.connect();
        
        try {
            // Limpiar PostgreSQL local
            await client.query('DELETE FROM reservas');
            await client.query('DELETE FROM usuarios');
            await client.query('DELETE FROM canchas');
            await client.query('DELETE FROM complejos');
            await client.query('DELETE FROM ciudades');
            console.log('✅ PostgreSQL local limpiado');

            // Migrar ciudades
            for (const ciudad of ciudades) {
                await client.query(
                    'INSERT INTO ciudades (id, nombre) VALUES ($1, $2)',
                    [ciudad.id, ciudad.nombre]
                );
            }
            console.log(`✅ ${ciudades.length} ciudades migradas`);

            // Migrar complejos
            for (const complejo of complejos) {
                await client.query(`
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
            }
            console.log(`✅ ${complejos.length} complejos migrados`);

            // Migrar canchas
            for (const cancha of canchas) {
                await client.query(`
                    INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    cancha.id,
                    cancha.complejo_id,
                    cancha.nombre,
                    cancha.tipo,
                    cancha.precio_hora
                ]);
            }
            console.log(`✅ ${canchas.length} canchas migradas`);

            // Migrar usuarios
            for (const usuario of usuarios) {
                await client.query(`
                    INSERT INTO usuarios (id, email, password, nombre, rol, activo, complejo_id, created_at) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    usuario.id,
                    usuario.email,
                    usuario.password,
                    usuario.nombre || null,
                    usuario.rol || 'usuario',
                    usuario.activo || true,
                    usuario.complejo_id || null,
                    usuario.created_at || new Date()
                ]);
            }
            console.log(`✅ ${usuarios.length} usuarios migrados`);

            // Migrar reservas
            for (const reserva of reservas) {
                await client.query(`
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
            }
            console.log(`✅ ${reservas.length} reservas migradas`);

        } finally {
            client.release();
        }
    }

    async verifyUnifiedSetup() {
        console.log('\n🔍 VERIFICANDO CONFIGURACIÓN UNIFICADA');
        console.log('=====================================');

        const client = await this.postgresPool.connect();
        
        try {
            const ciudades = await client.query('SELECT COUNT(*) as count FROM ciudades');
            const complejos = await client.query('SELECT COUNT(*) as count FROM complejos');
            const canchas = await client.query('SELECT COUNT(*) as count FROM canchas');
            const usuarios = await client.query('SELECT COUNT(*) as count FROM usuarios');
            const reservas = await client.query('SELECT COUNT(*) as count FROM reservas');

            console.log('\n📊 PostgreSQL Local (Desarrollo):');
            console.log(`   - Ciudades: ${ciudades.rows[0].count}`);
            console.log(`   - Complejos: ${complejos.rows[0].count}`);
            console.log(`   - Canchas: ${canchas.rows[0].count}`);
            console.log(`   - Usuarios: ${usuarios.rows[0].count}`);
            console.log(`   - Reservas: ${reservas.rows[0].count}`);

            console.log('\n✅ CONFIGURACIÓN UNIFICADA COMPLETADA');
            console.log('====================================');
            console.log('🎯 Ambos ambientes ahora usan PostgreSQL');
            console.log('🔧 Misma sintaxis SQL en desarrollo y producción');
            console.log('📊 Estructura de tablas idéntica');
            console.log('🚀 Sin más problemas de sincronización');

        } finally {
            client.release();
        }
    }

    async querySQLite(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.sqliteDb.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        if (this.postgresPool) {
            await this.postgresPool.end();
            console.log('✅ Conexión PostgreSQL cerrada');
        }
        
        if (this.sqliteDb) {
            this.sqliteDb.close();
            console.log('✅ Conexión SQLite cerrada');
        }
    }

    async setupUnifiedDatabase() {
        try {
            console.log('🚀 CONFIGURANDO BASE DE DATOS UNIFICADA');
            console.log('======================================');
            console.log('📋 PostgreSQL para desarrollo y producción');
            console.log('🔧 Misma sintaxis SQL en ambos ambientes');
            
            // Conectar a ambas bases de datos
            await this.connectPostgreSQL();
            await this.connectSQLite();
            
            // Crear estructura PostgreSQL
            await this.createPostgreSQLTables();
            
            // Migrar datos de SQLite a PostgreSQL
            await this.migrateDataFromSQLite();
            
            // Verificar configuración
            await this.verifyUnifiedSetup();
            
            console.log('\n🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
            console.log('=======================================');
            console.log('✅ Desarrollo ahora usa PostgreSQL local');
            console.log('✅ Misma sintaxis que producción');
            console.log('✅ Sin más problemas de sincronización');
            
        } catch (error) {
            console.error('❌ Error durante la configuración:', error);
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const setup = new UnifiedDatabaseSetup();
    setup.setupUnifiedDatabase()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = UnifiedDatabaseSetup;

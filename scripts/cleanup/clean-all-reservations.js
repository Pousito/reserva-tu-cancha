#!/usr/bin/env node

/**
 * Script para limpiar todas las reservas de ambas bases de datos (local y producción)
 * 
 * ⚠️ ADVERTENCIA: Este script eliminará TODAS las reservas de ambas bases de datos
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

class ReservationCleaner {
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

    async getReservationCounts() {
        console.log('\n📊 CONTEO ACTUAL DE RESERVAS');
        console.log('=============================');

        // Contar reservas en desarrollo
        const devCount = await new Promise((resolve, reject) => {
            this.devDb.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        console.log(`🏠 Desarrollo (SQLite): ${devCount} reservas`);

        // Contar reservas en producción
        const client = await this.prodPool.connect();
        try {
            const prodResult = await client.query('SELECT COUNT(*) as count FROM reservas');
            const prodCount = prodResult.rows[0].count;
            console.log(`🌐 Producción (PostgreSQL): ${prodCount} reservas`);
            
            return { devCount, prodCount };
        } finally {
            client.release();
        }
    }

    async cleanDevReservations() {
        console.log('\n🧹 LIMPIANDO RESERVAS DE DESARROLLO');
        console.log('===================================');

        return new Promise((resolve, reject) => {
            this.devDb.run('DELETE FROM reservas', function(err) {
                if (err) {
                    console.error('❌ Error limpiando reservas de desarrollo:', err.message);
                    reject(err);
                } else {
                    console.log(`✅ ${this.changes} reservas eliminadas de desarrollo`);
                    resolve(this.changes);
                }
            });
        });
    }

    async cleanProdReservations() {
        console.log('\n🧹 LIMPIANDO RESERVAS DE PRODUCCIÓN');
        console.log('====================================');

        const client = await this.prodPool.connect();
        try {
            const result = await client.query('DELETE FROM reservas');
            console.log(`✅ ${result.rowCount} reservas eliminadas de producción`);
            return result.rowCount;
        } finally {
            client.release();
        }
    }

    async verifyCleanState() {
        console.log('\n🔍 VERIFICANDO ESTADO LIMPIO');
        console.log('============================');

        // Verificar desarrollo
        const devCount = await new Promise((resolve, reject) => {
            this.devDb.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        console.log(`🏠 Desarrollo: ${devCount} reservas`);

        // Verificar producción
        const client = await this.prodPool.connect();
        try {
            const prodResult = await client.query('SELECT COUNT(*) as count FROM reservas');
            const prodCount = prodResult.rows[0].count;
            console.log(`🌐 Producción: ${prodCount} reservas`);
            
            if (devCount === 0 && prodCount === 0) {
                console.log('\n✅ ÉXITO: Ambas bases de datos tienen 0 reservas');
                return true;
            } else {
                console.log('\n⚠️ ADVERTENCIA: Algunas bases de datos aún tienen reservas');
                return false;
            }
        } finally {
            client.release();
        }
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

    async cleanAllReservations() {
        try {
            console.log('🧹 INICIANDO LIMPIEZA DE RESERVAS');
            console.log('=================================');
            console.log('⚠️ ADVERTENCIA: Se eliminarán TODAS las reservas de ambas bases de datos');
            
            // Conectar a ambas bases de datos
            await this.connectDevDb();
            await this.connectProdDb();
            
            // Mostrar conteo actual
            const { devCount, prodCount } = await this.getReservationCounts();
            
            if (devCount === 0 && prodCount === 0) {
                console.log('\n✅ Ambas bases de datos ya están limpias');
                return;
            }
            
            // Limpiar desarrollo
            await this.cleanDevReservations();
            
            // Limpiar producción
            await this.cleanProdReservations();
            
            // Verificar estado final
            const isClean = await this.verifyCleanState();
            
            if (isClean) {
                console.log('\n🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
                console.log('==================================');
                console.log('✅ Ambas bases de datos tienen 0 reservas');
                console.log('🚀 Puedes comenzar a hacer reservas desde cero');
            } else {
                console.log('\n⚠️ LIMPIEZA COMPLETADA CON ADVERTENCIAS');
                console.log('=====================================');
                console.log('Algunas bases de datos pueden tener reservas restantes');
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
    const cleaner = new ReservationCleaner();
    cleaner.cleanAllReservations()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = ReservationCleaner;

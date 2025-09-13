#!/usr/bin/env node

/**
 * Script para limpiar todas las reservas de la base de datos PostgreSQL
 * 
 * ⚠️ ADVERTENCIA: Este script eliminará TODAS las reservas de la base de datos
 */

const { Pool } = require('pg');
require('dotenv').config();

class ReservationCleaner {
    constructor() {
        this.pool = null;
    }

    async connect() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        console.log('✅ Conectado a base de datos PostgreSQL');
    }

    async cleanAllReservations() {
        console.log('🧹 LIMPIANDO TODAS LAS RESERVAS');
        console.log('===============================');
        
        try {
            // 1. Eliminar todas las reservas
            const reservasResult = await this.pool.query('DELETE FROM reservas');
            console.log(`✅ Reservas eliminadas: ${reservasResult.rowCount}`);
            
            // 2. Eliminar bloqueos temporales
            const bloqueosResult = await this.pool.query('DELETE FROM bloqueos_temporales');
            console.log(`✅ Bloqueos temporales eliminados: ${bloqueosResult.rowCount}`);
            
            // 3. Eliminar pagos
            const pagosResult = await this.pool.query('DELETE FROM pagos');
            console.log(`✅ Pagos eliminados: ${pagosResult.rowCount}`);
            
            // 4. Verificar estado final
            console.log('\n📊 ESTADO FINAL:');
            console.log('================');
            
            const reservas = await this.pool.query('SELECT COUNT(*) as count FROM reservas');
            const bloqueos = await this.pool.query('SELECT COUNT(*) as count FROM bloqueos_temporales');
            const pagos = await this.pool.query('SELECT COUNT(*) as count FROM pagos');
            
            console.log(`📅 Reservas: ${reservas.rows[0].count}`);
            console.log(`🔒 Bloqueos temporales: ${bloqueos.rows[0].count}`);
            console.log(`💳 Pagos: ${pagos.rows[0].count}`);
            
            console.log('\n✅ Limpieza completada exitosamente');
            
        } catch (error) {
            console.error('❌ Error durante la limpieza:', error.message);
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}

// Ejecutar si se llama directamente
async function main() {
    const cleaner = new ReservationCleaner();
    
    try {
        await cleaner.connect();
        await cleaner.cleanAllReservations();
    } catch (error) {
        console.error('❌ Error general:', error.message);
    } finally {
        await cleaner.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { ReservationCleaner };
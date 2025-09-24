#!/usr/bin/env node

/**
 * Script para limpiar bloqueos temporales en producción
 */

require('dotenv').config();
const { Pool } = require('pg');

async function cleanupTempBlocks() {
    console.log('🧹 Limpiando bloqueos temporales en producción...\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Conectado a la base de datos de producción');

        // Verificar bloqueos temporales existentes
        const existingBlocks = await client.query(`
            SELECT id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en
            FROM bloqueos_temporales
            ORDER BY creado_en DESC
        `);

        console.log(`📊 Bloqueos temporales encontrados: ${existingBlocks.rows.length}`);
        
        if (existingBlocks.rows.length > 0) {
            console.log('📋 Bloqueos existentes:');
            existingBlocks.rows.forEach(block => {
                console.log(`   - ID: ${block.id}, Cancha: ${block.cancha_id}, Fecha: ${block.fecha} ${block.hora_inicio}-${block.hora_fin}, Expira: ${block.expira_en}`);
            });

            // Eliminar todos los bloqueos temporales
            const deleteResult = await client.query('DELETE FROM bloqueos_temporales');
            console.log(`\n🗑️ Eliminados ${deleteResult.rowCount} bloqueos temporales`);
        } else {
            console.log('✅ No hay bloqueos temporales para limpiar');
        }

        client.release();
        console.log('\n✅ Limpieza completada');

    } catch (error) {
        console.error('❌ Error limpiando bloqueos:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

cleanupTempBlocks();

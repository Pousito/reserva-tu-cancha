/**
 * Script para forzar actualización de precios en producción
 * Ejecutar: node scripts/force-update-prices.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function forceUpdatePrices() {
    console.log('🔄 FORZANDO ACTUALIZACIÓN DE PRECIOS');
    console.log('====================================');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Conectado a la base de datos de producción');

        // Verificar precios actuales
        console.log('\n📊 Precios actuales:');
        const currentPrices = await client.query(`
            SELECT id, nombre, precio_hora 
            FROM canchas 
            ORDER BY id
        `);
        
        currentPrices.rows.forEach(cancha => {
            console.log(`  Cancha ${cancha.id}: ${cancha.nombre} - $${cancha.precio_hora}`);
        });

        // Forzar actualización a $5.000
        console.log('\n🔄 Forzando actualización a $5.000...');
        const updateResult = await client.query(`
            UPDATE canchas 
            SET precio_hora = 5000
            WHERE id IN (1, 2)
        `);

        console.log(`✅ ${updateResult.rowCount} canchas actualizadas`);

        // Verificar precios actualizados
        console.log('\n📊 Precios después de la actualización:');
        const updatedPrices = await client.query(`
            SELECT id, nombre, precio_hora 
            FROM canchas 
            ORDER BY id
        `);
        
        updatedPrices.rows.forEach(cancha => {
            console.log(`  Cancha ${cancha.id}: ${cancha.nombre} - $${cancha.precio_hora}`);
        });

        // Verificar que la API devuelva los precios correctos
        console.log('\n🔍 Verificando API...');
        const apiCheck = await client.query(`
            SELECT id, nombre, precio_hora 
            FROM canchas 
            WHERE id IN (1, 2)
            ORDER BY id
        `);
        
        console.log('📋 Datos que debería devolver la API:');
        apiCheck.rows.forEach(cancha => {
            console.log(`  {"id":${cancha.id},"precio_hora":${cancha.precio_hora}}`);
        });

        console.log('\n🎯 ¡Actualización forzada completada!');
        console.log('💡 Si la API sigue devolviendo $50, puede ser un problema de caché del servidor');

        client.release();
        
    } catch (error) {
        console.error('❌ Error actualizando precios:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    forceUpdatePrices();
}

module.exports = { forceUpdatePrices };

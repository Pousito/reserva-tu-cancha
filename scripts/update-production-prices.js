#!/usr/bin/env node

/**
 * Script para actualizar precios de MagnaSports en producción
 * Cambiar de $28,000 a $50 para transacción de prueba
 */

require('dotenv').config();
const { Pool } = require('pg');

async function updateProductionPrices() {
    console.log('💰 Actualizando precios de MagnaSports en producción...\n');
    
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
        console.log('\n🔍 Verificando precios actuales...');
        const currentPrices = await client.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE co.nombre = 'MagnaSports'
        `);

        console.log('📊 Precios actuales de MagnaSports:');
        currentPrices.rows.forEach(cancha => {
            console.log(`   - ${cancha.nombre}: $${cancha.precio_hora}`);
        });

        // Actualizar precios a $50
        console.log('\n🔄 Actualizando precios a $50...');
        const updateResult = await client.query(`
            UPDATE canchas 
            SET precio_hora = 50
            WHERE complejo_id = (
                SELECT id FROM complejos WHERE nombre = 'MagnaSports'
            )
        `);

        console.log(`✅ ${updateResult.rowCount} canchas actualizadas`);

        // Verificar precios después de la actualización
        console.log('\n🔍 Verificando precios después de la actualización...');
        const newPrices = await client.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE co.nombre = 'MagnaSports'
        `);

        console.log('📊 Nuevos precios de MagnaSports:');
        newPrices.rows.forEach(cancha => {
            console.log(`   - ${cancha.nombre}: $${cancha.precio_hora}`);
        });

        client.release();
        console.log('\n✅ Precios actualizados exitosamente en producción');
        console.log('🚀 Ahora las reservas de MagnaSports costarán $50');

    } catch (error) {
        console.error('❌ Error actualizando precios:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

updateProductionPrices();

/**
 * Script para verificar precios en producción
 * Ejecutar: node scripts/check-production-prices.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkProductionPrices() {
    console.log('🔍 VERIFICANDO PRECIOS EN PRODUCCIÓN');
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
        console.log('\n📊 Precios actuales en producción:');
        const currentPrices = await client.query(`
            SELECT id, nombre, precio_hora 
            FROM canchas 
            ORDER BY id
        `);
        
        if (currentPrices.rows.length === 0) {
            console.log('❌ No se encontraron canchas en la base de datos');
        } else {
            currentPrices.rows.forEach(cancha => {
                console.log(`  Cancha ${cancha.id}: ${cancha.nombre} - $${cancha.precio_hora}`);
            });
        }

        // Verificar si hay reservas recientes
        console.log('\n📋 Reservas recientes:');
        const recentReservations = await client.query(`
            SELECT codigo_reserva, precio_total, fecha_creacion
            FROM reservas 
            ORDER BY fecha_creacion DESC 
            LIMIT 5
        `);
        
        if (recentReservations.rows.length === 0) {
            console.log('  No hay reservas recientes');
        } else {
            recentReservations.rows.forEach(reserva => {
                console.log(`  ${reserva.codigo_reserva}: $${reserva.precio_total} - ${reserva.fecha_creacion}`);
            });
        }

        client.release();
        
    } catch (error) {
        console.error('❌ Error verificando precios:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkProductionPrices();
}

module.exports = { checkProductionPrices };

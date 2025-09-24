/**
 * Script para actualizar precios de canchas a $5.000 para transacción de prueba
 * Ejecutar: node scripts/update-prices-5000.js
 */

const { Pool } = require('pg');
require('dotenv').config();

async function updatePricesTo5000() {
    console.log('💰 ACTUALIZANDO PRECIOS A $5.000');
    console.log('==================================');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Conectado a la base de datos');

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

        // Actualizar precios a $5.000
        console.log('\n🔄 Actualizando precios a $5.000...');
        const updateResult = await client.query(`
            UPDATE canchas 
            SET precio_hora = 5000
            WHERE precio_hora != 5000
        `);

        console.log(`✅ ${updateResult.rowCount} canchas actualizadas`);

        // Verificar precios actualizados
        console.log('\n📊 Precios actualizados:');
        const updatedPrices = await client.query(`
            SELECT id, nombre, precio_hora 
            FROM canchas 
            ORDER BY id
        `);
        
        updatedPrices.rows.forEach(cancha => {
            console.log(`  Cancha ${cancha.id}: ${cancha.nombre} - $${cancha.precio_hora}`);
        });

        console.log('\n🎯 ¡Precios actualizados exitosamente!');
        console.log('💡 Ahora puedes hacer la transacción de prueba con $5.000');
        console.log('⚠️  Recuerda cambiar los precios de vuelta después de la prueba');

        client.release();
        
    } catch (error) {
        console.error('❌ Error actualizando precios:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    updatePricesTo5000();
}

module.exports = { updatePricesTo5000 };

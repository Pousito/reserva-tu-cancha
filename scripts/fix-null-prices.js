#!/usr/bin/env node

const { Pool } = require('pg');

async function fixNullPrices() {
    console.log('🔧 CORRIGIENDO PRECIOS NULL EN RESERVAS');
    console.log('=====================================');
    
    // URL de la base de datos de producción en Neon
    const DATABASE_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔍 Conectando a la base de datos de Neon...');
        
        // Buscar reservas con precio_total NULL
        console.log('\n🔍 Buscando reservas con precio_total NULL...');
        const reservasNull = await pool.query(`
            SELECT r.id, r.codigo_reserva, r.precio_total, c.precio_hora, c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.precio_total IS NULL
            ORDER BY r.fecha_creacion DESC
        `);
        
        if (reservasNull.rows.length === 0) {
            console.log('✅ No se encontraron reservas con precio_total NULL');
            return;
        }
        
        console.log(`📊 Se encontraron ${reservasNull.rows.length} reservas con precio_total NULL:`);
        reservasNull.rows.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.complejo_nombre} - ${reserva.cancha_nombre} - Precio cancha: $${reserva.precio_hora}`);
        });
        
        // Actualizar precios NULL con el precio de la cancha
        console.log('\n💰 Actualizando precios NULL...');
        const updateResult = await pool.query(`
            UPDATE reservas 
            SET precio_total = c.precio_hora
            FROM canchas c
            WHERE reservas.cancha_id = c.id 
            AND reservas.precio_total IS NULL
        `);
        
        console.log(`✅ ${updateResult.rowCount} reservas actualizadas`);
        
        // Verificar que se corrigieron
        console.log('\n🔍 Verificando corrección...');
        const reservasCorregidas = await pool.query(`
            SELECT r.id, r.codigo_reserva, r.precio_total, c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.id IN (${reservasNull.rows.map(r => r.id).join(',')})
            ORDER BY r.fecha_creacion DESC
        `);
        
        console.log('📊 Reservas corregidas:');
        reservasCorregidas.rows.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.complejo_nombre} - ${reserva.cancha_nombre} - Precio: $${reserva.precio_total}`);
        });
        
        console.log('\n🎉 Corrección completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    fixNullPrices().catch(console.error);
}

module.exports = { fixNullPrices };




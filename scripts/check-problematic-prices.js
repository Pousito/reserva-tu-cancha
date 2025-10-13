#!/usr/bin/env node

const { Pool } = require('pg');

async function checkProblematicPrices() {
    console.log('🔍 VERIFICANDO PRECIOS PROBLEMÁTICOS EN RESERVAS');
    console.log('==============================================');
    
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
        
        // Buscar reservas con precios problemáticos
        console.log('\n🔍 Buscando reservas con precios problemáticos...');
        const reservasProblematicas = await pool.query(`
            SELECT r.id, r.codigo_reserva, r.precio_total, r.porcentaje_pagado, 
                   c.precio_hora, c.nombre as cancha_nombre, co.nombre as complejo_nombre,
                   r.fecha_creacion
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.precio_total IS NULL 
               OR r.precio_total = 0 
               OR r.precio_total < 0
            ORDER BY r.fecha_creacion DESC
        `);
        
        if (reservasProblematicas.rows.length === 0) {
            console.log('✅ No se encontraron reservas con precios problemáticos');
        } else {
            console.log(`⚠️ Se encontraron ${reservasProblematicas.rows.length} reservas con precios problemáticos:`);
            reservasProblematicas.rows.forEach((reserva, index) => {
                console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                console.log(`      Precio reserva: ${reserva.precio_total} | Precio cancha: $${reserva.precio_hora} | Porcentaje: ${reserva.porcentaje_pagado}%`);
                console.log(`      Fecha creación: ${reserva.fecha_creacion}`);
                console.log('');
            });
        }
        
        // Verificar todas las reservas para ver el rango de precios
        console.log('\n📊 Estadísticas de precios en todas las reservas:');
        const estadisticas = await pool.query(`
            SELECT 
                COUNT(*) as total_reservas,
                MIN(precio_total) as precio_minimo,
                MAX(precio_total) as precio_maximo,
                AVG(precio_total) as precio_promedio,
                COUNT(CASE WHEN precio_total IS NULL THEN 1 END) as precios_null,
                COUNT(CASE WHEN precio_total = 0 THEN 1 END) as precios_cero,
                COUNT(CASE WHEN precio_total < 0 THEN 1 END) as precios_negativos
            FROM reservas
        `);
        
        const stats = estadisticas.rows[0];
        console.log(`   Total de reservas: ${stats.total_reservas}`);
        console.log(`   Precio mínimo: $${stats.precio_minimo}`);
        console.log(`   Precio máximo: $${stats.precio_maximo}`);
        console.log(`   Precio promedio: $${Math.round(stats.precio_promedio)}`);
        console.log(`   Precios NULL: ${stats.precios_null}`);
        console.log(`   Precios en 0: ${stats.precios_cero}`);
        console.log(`   Precios negativos: ${stats.precios_negativos}`);
        
        // Verificar reservas recientes
        console.log('\n📅 Últimas 10 reservas creadas:');
        const reservasRecientes = await pool.query(`
            SELECT r.codigo_reserva, r.precio_total, r.porcentaje_pagado, 
                   c.nombre as cancha_nombre, co.nombre as complejo_nombre,
                   r.fecha_creacion
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            ORDER BY r.fecha_creacion DESC
            LIMIT 10
        `);
        
        reservasRecientes.rows.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.codigo_reserva} - $${reserva.precio_total} (${reserva.porcentaje_pagado}%) - ${reserva.complejo_nombre}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkProblematicPrices().catch(console.error);
}

module.exports = { checkProblematicPrices };



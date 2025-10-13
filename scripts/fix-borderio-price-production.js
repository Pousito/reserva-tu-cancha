#!/usr/bin/env node

const { Pool } = require('pg');

async function fixBordeRioPriceProduction() {
    console.log('💰 CORRIGIENDO PRECIO DE BORDE RÍO EN NEON (PRODUCCIÓN)');
    console.log('======================================================');
    
    // URL de la base de datos de producción en Neon
    const DATABASE_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔍 Conectando a la base de datos de Neon (producción)...');
        
        // Verificar cancha actual
        const canchaCheck = await pool.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE co.nombre LIKE '%Borde Río%' OR co.nombre LIKE '%Borde Rio%'
        `);
        
        if (canchaCheck.rows.length === 0) {
            console.log('❌ No se encontró la cancha de Borde Río');
            return;
        }
        
        const cancha = canchaCheck.rows[0];
        console.log('📊 Cancha encontrada:');
        console.log(`   🆔 ID: ${cancha.id}`);
        console.log(`   ⚽ Nombre: ${cancha.nombre}`);
        console.log(`   🏢 Complejo: ${cancha.complejo_nombre}`);
        console.log(`   💰 Precio actual: $${cancha.precio_hora}`);
        
        // Actualizar precio a $50
        console.log('\n💰 Actualizando precio a $50...');
        const updateResult = await pool.query(`
            UPDATE canchas 
            SET precio_hora = 50 
            WHERE id = $1
        `, [cancha.id]);
        
        console.log(`✅ Precio actualizado exitosamente`);
        console.log(`   💰 Nuevo precio: $50`);
        console.log(`   📊 Filas afectadas: ${updateResult.rowCount}`);
        
        // Verificar actualización
        console.log('\n🔍 Verificando actualización...');
        const verifyResult = await pool.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE c.id = $1
        `, [cancha.id]);
        
        const canchaActualizada = verifyResult.rows[0];
        console.log('📊 Verificación exitosa:');
        console.log(`   ⚽ Cancha: ${canchaActualizada.nombre}`);
        console.log(`   🏢 Complejo: ${canchaActualizada.complejo_nombre}`);
        console.log(`   💰 Precio: $${canchaActualizada.precio_hora}`);
        
        console.log('\n🎉 Actualización completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    fixBordeRioPriceProduction().catch(console.error);
}

module.exports = { fixBordeRioPriceProduction };

#!/usr/bin/env node

const { Pool } = require('pg');

async function updateBordeRioPrice() {
    console.log('💰 ACTUALIZANDO PRECIO DE CANCHA BORDE RÍO');
    console.log('==========================================');
    
    // Usar la URL de la base de datos de producción desde las variables de entorno
    const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/reserva_tu_cancha';
    
    if (!DATABASE_URL.includes('render.com')) {
        console.log('⚠️  No se detectó URL de producción de Render');
        console.log('🔍 DATABASE_URL actual:', DATABASE_URL);
        console.log('💡 Este script debe ejecutarse en el entorno de producción');
        return;
    }
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔍 Verificando cancha actual...');
        
        // Verificar cancha actual
        const canchaCheck = await pool.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE c.id = 10 AND co.nombre LIKE '%Borde Río%'
        `);
        
        if (canchaCheck.rows.length === 0) {
            console.log('❌ No se encontró la cancha principal de Borde Río');
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
            WHERE id = 10
        `);
        
        console.log(`✅ Precio actualizado exitosamente`);
        console.log(`   💰 Nuevo precio: $50`);
        console.log(`   📊 Filas afectadas: ${updateResult.rowCount}`);
        
        // Verificar actualización
        console.log('\n🔍 Verificando actualización...');
        const verifyResult = await pool.query(`
            SELECT c.id, c.nombre, c.precio_hora, co.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            WHERE c.id = 10
        `);
        
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
    updateBordeRioPrice().catch(console.error);
}

module.exports = { updateBordeRioPrice };




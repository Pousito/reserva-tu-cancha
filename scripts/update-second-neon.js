#!/usr/bin/env node

/**
 * Script para actualizar el segundo complejo en Neon
 */

const { Pool } = require('pg');

async function updateSecondNeon() {
    console.log('🚀 ACTUALIZANDO SEGUNDO COMPLEJO EN NEON');
    console.log('========================================');
    
    // URL de Neon desde el archivo de configuración
    const NEON_DATABASE_URL = "postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    
    const pool = new Pool({
        connectionString: NEON_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔌 Conectando a Neon...');
        const client = await pool.connect();
        console.log('✅ Conectado a Neon exitosamente');
        
        // Buscar específicamente el complejo Borde Río
        console.log('\n🔍 Buscando Espacio Deportivo Borde Río...');
        const bordeRio = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.nombre LIKE '%Borde%' AND c.nombre LIKE '%Río%'
        `);
        
        if (bordeRio.rows.length > 0) {
            const complejo = bordeRio.rows[0];
            console.log(`📋 Encontrado: ID ${complejo.id} - ${complejo.nombre} - ${complejo.ciudad_nombre}`);
            
            console.log('🔄 Actualizando a "Complejo Demo 2"...');
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', complejo.id]);
            console.log('✅ Actualizado en Neon: Espacio Deportivo Borde Río -> Complejo Demo 2');
            
        } else {
            console.log('❌ No se encontró Espacio Deportivo Borde Río');
        }
        
        // Verificar todos los complejos después del cambio
        console.log('\n🔍 Verificando todos los complejos en Neon...');
        const todosComplejos = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Todos los complejos en Neon:');
        todosComplejos.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Segundo cambio aplicado exitosamente en NEON');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

// Ejecutar
updateSecondNeon();

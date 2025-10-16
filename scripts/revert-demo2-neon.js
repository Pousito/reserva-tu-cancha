#!/usr/bin/env node

/**
 * Script para revertir Complejo Demo 2 a Espacio Deportivo Borde Río en Neon
 */

const { Pool } = require('pg');

async function revertDemo2Neon() {
    console.log('🔄 REVIRTIENDO COMPLEJO DEMO 2 EN NEON');
    console.log('======================================');
    
    // URL de Neon
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
        
        // Buscar Complejo Demo 2
        console.log('\n🔍 Buscando Complejo Demo 2...');
        const demo2 = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.nombre = 'Complejo Demo 2'
        `);
        
        if (demo2.rows.length > 0) {
            const complejo = demo2.rows[0];
            console.log(`📋 Encontrado: ID ${complejo.id} - ${complejo.nombre} - ${complejo.ciudad_nombre}`);
            
            console.log('🔄 Revirtiendo a "Espacio Deportivo Borde Río"...');
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Espacio Deportivo Borde Río', complejo.id]);
            console.log('✅ Revertido en Neon: Complejo Demo 2 -> Espacio Deportivo Borde Río');
            
        } else {
            console.log('❌ No se encontró Complejo Demo 2');
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
        
        console.log('\n✅ Reversión aplicada exitosamente en NEON');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

// Ejecutar
revertDemo2Neon();

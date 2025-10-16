#!/usr/bin/env node

/**
 * Script para actualizar complejos directamente en Neon
 */

const { Pool } = require('pg');

async function updateNeonComplexes() {
    console.log('🚀 ACTUALIZANDO COMPLEJOS EN NEON');
    console.log('==================================');
    
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
        
        // Verificar complejos actuales
        console.log('\n🔍 Verificando complejos actuales en Neon...');
        const complejos = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados en Neon:');
        complejos.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        // Buscar los complejos específicos que necesitamos cambiar
        const fundacionGunnen = complejos.rows.find(c => 
            c.nombre.toLowerCase().includes('gunnen') || 
            c.nombre.toLowerCase().includes('fundacion')
        );
        
        const bordeRio = complejos.rows.find(c => 
            c.nombre.toLowerCase().includes('borde') && 
            c.nombre.toLowerCase().includes('rio')
        );
        
        console.log('\n🎯 Complejos a cambiar en Neon:');
        if (fundacionGunnen) {
            console.log(`- Fundación Gunnen: ID ${fundacionGunnen.id} -> "Complejo Demo 1"`);
        }
        if (bordeRio) {
            console.log(`- Borde Río: ID ${bordeRio.id} -> "Complejo Demo 2"`);
        }
        
        // Realizar los cambios en Neon
        if (fundacionGunnen) {
            console.log('\n🔄 Actualizando Fundación Gunnen en Neon...');
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado en Neon: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río en Neon...');
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado en Neon: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios en Neon
        console.log('\n🔍 Verificando cambios aplicados en Neon...');
        const complejosActualizados = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos en Neon después de los cambios:');
        complejosActualizados.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Cambios aplicados exitosamente en NEON');
        
    } catch (error) {
        console.error('❌ Error conectando a Neon:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

// Ejecutar
updateNeonComplexes();

#!/usr/bin/env node

const { Pool } = require('pg');

async function updateComplexNames() {
    console.log('🏢 ACTUALIZANDO NOMBRES DE COMPLEJOS');
    console.log('====================================');
    
    // Usar la URL de la base de datos local
    const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/reserva_tu_cancha_local';
    
    console.log('🔍 DATABASE_URL:', DATABASE_URL);
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        // No usar SSL para desarrollo local
    });
    
    try {
        console.log('🔍 Verificando complejos actuales...');
        
        // Verificar complejos actuales
        const complejosCheck = await pool.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados:');
        complejosCheck.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log('   ---');
        });
        
        // Buscar los complejos específicos que necesitamos cambiar
        const fundacionGunnen = complejosCheck.rows.find(c => 
            c.nombre.toLowerCase().includes('gunnen') || 
            c.nombre.toLowerCase().includes('fundacion')
        );
        
        const bordeRio = complejosCheck.rows.find(c => 
            c.nombre.toLowerCase().includes('borde') && 
            c.nombre.toLowerCase().includes('rio')
        );
        
        console.log('\n🎯 Complejos a cambiar:');
        if (fundacionGunnen) {
            console.log(`- Fundación Gunnen: ID ${fundacionGunnen.id} -> "Complejo Demo 1"`);
        }
        if (bordeRio) {
            console.log(`- Borde Río: ID ${bordeRio.id} -> "Complejo Demo 2"`);
        }
        
        // Realizar los cambios
        if (fundacionGunnen) {
            console.log('\n🔄 Actualizando Fundación Gunnen...');
            await pool.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río...');
            await pool.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await pool.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos después de los cambios:');
        complejosActualizados.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log('   ---');
        });
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await pool.end();
    }
}

updateComplexNames();

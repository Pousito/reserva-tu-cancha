#!/usr/bin/env node

/**
 * Script para actualizar complejos usando SQL directo
 * Se conecta directamente a la base de datos usando la configuración del servidor
 */

const { Pool } = require('pg');

async function directSQLUpdate() {
    console.log('🏢 ACTUALIZACIÓN DIRECTA VÍA SQL');
    console.log('=================================');
    
    // Usar la misma configuración que el servidor
    const pool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'reserva_tu_cancha_local',
        user: 'pousito',
        password: '', // Contraseña vacía para desarrollo local
    });
    
    try {
        console.log('🔌 Conectando directamente a PostgreSQL...');
        const client = await pool.connect();
        console.log('✅ Conexión exitosa');
        
        // Configurar zona horaria
        await client.query("SET timezone = 'America/Santiago'");
        
        // Verificar complejos actuales
        console.log('\n🔍 Verificando complejos actuales...');
        const complejos = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados:');
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
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río...');
            await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await client.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos después de los cambios:');
        complejosActualizados.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        client.release();
        await pool.end();
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
        
        // Intentar con diferentes configuraciones
        console.log('\n🔄 Intentando con configuración alternativa...');
        
        const altPool = new Pool({
            host: 'localhost',
            port: 5432,
            database: 'reserva_tu_cancha_local',
            user: 'postgres',
            password: 'postgres',
        });
        
        try {
            const altClient = await altPool.connect();
            console.log('✅ Conexión alternativa exitosa');
            
            // Repetir el proceso con la configuración alternativa
            const complejos = await altClient.query(`
                SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
                FROM complejos c
                JOIN ciudades ci ON c.ciudad_id = ci.id
                ORDER BY c.id
            `);
            
            console.log('📊 Complejos encontrados:');
            complejos.rows.forEach(complejo => {
                console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
            });
            
            // Buscar y actualizar
            const fundacionGunnen = complejos.rows.find(c => 
                c.nombre.toLowerCase().includes('gunnen') || 
                c.nombre.toLowerCase().includes('fundacion')
            );
            
            const bordeRio = complejos.rows.find(c => 
                c.nombre.toLowerCase().includes('borde') && 
                c.nombre.toLowerCase().includes('rio')
            );
            
            if (fundacionGunnen) {
                await altClient.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
                console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
            }
            
            if (bordeRio) {
                await altClient.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
                console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
            }
            
            altClient.release();
            await altPool.end();
            
        } catch (altError) {
            console.error('❌ Error en configuración alternativa:', altError.message);
        }
    }
}

// Ejecutar
directSQLUpdate();

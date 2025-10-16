#!/usr/bin/env node

/**
 * Script para actualizar los IDs correctos que vemos en la API
 */

// Configurar entorno de producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

const DatabaseManager = require('../src/config/database');

async function updateCorrectIds() {
    console.log('🎯 ACTUALIZANDO IDs CORRECTOS EN PRODUCCIÓN');
    console.log('==========================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        await db.connect();
        
        // Buscar por nombre en lugar de por ID
        console.log('\n🔍 Buscando complejos por nombre...');
        
        // Buscar Fundación Gunnen
        const fundacionGunnen = await db.get(`
            SELECT id, nombre FROM complejos 
            WHERE nombre LIKE '%Fundación%' OR nombre LIKE '%Gunnen%'
        `);
        
        if (fundacionGunnen) {
            console.log(`📋 Encontrado: ID ${fundacionGunnen.id} - ${fundacionGunnen.nombre}`);
            console.log('🔄 Actualizando a "Complejo Demo 1"...');
            const result1 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Resultado:', result1);
        } else {
            console.log('❌ No se encontró Fundación Gunnen');
        }
        
        // Buscar Espacio Deportivo Borde Río
        const bordeRio = await db.get(`
            SELECT id, nombre FROM complejos 
            WHERE nombre LIKE '%Borde%' AND nombre LIKE '%Río%'
        `);
        
        if (bordeRio) {
            console.log(`📋 Encontrado: ID ${bordeRio.id} - ${bordeRio.nombre}`);
            console.log('🔄 Actualizando a "Complejo Demo 2"...');
            const result2 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Resultado:', result2);
        } else {
            console.log('❌ No se encontró Espacio Deportivo Borde Río');
        }
        
        // Verificar todos los complejos después de los cambios
        console.log('\n🔍 Verificando todos los complejos después de los cambios...');
        const todosComplejos = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Todos los complejos en producción:');
        todosComplejos.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        console.log('\n✅ Actualización por nombre completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
updateCorrectIds();

#!/usr/bin/env node

/**
 * Script para actualizar complejos específicos en PRODUCCIÓN
 * Basado en los IDs que vemos en la API externa
 */

// Configurar entorno de producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

const DatabaseManager = require('../src/config/database');

async function updateSpecificProduction() {
    console.log('🏢 ACTUALIZANDO COMPLEJOS ESPECÍFICOS EN PRODUCCIÓN');
    console.log('==================================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        await db.connect();
        
        // Actualizar complejo ID 2 (Fundación Gunnen)
        console.log('\n🔄 Actualizando complejo ID 2 (Fundación Gunnen)...');
        const result1 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', 2]);
        console.log('✅ Resultado ID 2:', result1);
        
        // Actualizar complejo ID 7 (Espacio Deportivo Borde Río)
        console.log('\n🔄 Actualizando complejo ID 7 (Espacio Deportivo Borde Río)...');
        const result2 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', 7]);
        console.log('✅ Resultado ID 7:', result2);
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.id IN (2, 7)
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos actualizados en producción:');
        complejosActualizados.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        console.log('\n✅ Cambios específicos aplicados en PRODUCCIÓN');
        
    } catch (error) {
        console.error('❌ Error en producción:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
updateSpecificProduction();

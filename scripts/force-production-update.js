#!/usr/bin/env node

/**
 * Script para forzar la actualización en producción
 * Basado en los IDs reales que vemos en la API
 */

// Configurar entorno de producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

const DatabaseManager = require('../src/config/database');

async function forceProductionUpdate() {
    console.log('🚀 FORZANDO ACTUALIZACIÓN EN PRODUCCIÓN');
    console.log('======================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        await db.connect();
        
        // Actualizar complejo ID 2 (Fundación Gunnen) -> Complejo Demo 1
        console.log('\n🔄 Actualizando ID 2: Fundación Gunnen -> Complejo Demo 1');
        const result1 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', 2]);
        console.log('✅ Resultado ID 2:', result1);
        
        // Actualizar complejo ID 7 (Espacio Deportivo Borde Río) -> Complejo Demo 2
        console.log('\n🔄 Actualizando ID 7: Espacio Deportivo Borde Río -> Complejo Demo 2');
        const result2 = await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', 7]);
        console.log('✅ Resultado ID 7:', result2);
        
        // Verificar los cambios específicos
        console.log('\n🔍 Verificando cambios específicos...');
        const complejo2 = await db.get('SELECT id, nombre FROM complejos WHERE id = 2');
        const complejo7 = await db.get('SELECT id, nombre FROM complejos WHERE id = 7');
        
        console.log('📊 Verificación:');
        if (complejo2) {
            console.log(`   🆔 ID 2: ${complejo2.nombre}`);
        } else {
            console.log('   ❌ ID 2: No encontrado');
        }
        
        if (complejo7) {
            console.log(`   🆔 ID 7: ${complejo7.nombre}`);
        } else {
            console.log('   ❌ ID 7: No encontrado');
        }
        
        // Verificar todos los complejos
        console.log('\n🔍 Verificando todos los complejos...');
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
        
        console.log('\n✅ Actualización forzada completada en PRODUCCIÓN');
        
    } catch (error) {
        console.error('❌ Error en producción:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
forceProductionUpdate();

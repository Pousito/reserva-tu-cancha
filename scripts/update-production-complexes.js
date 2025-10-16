#!/usr/bin/env node

/**
 * Script para actualizar nombres de complejos en PRODUCCIÓN
 * Usa la configuración de producción (DATABASE_URL de Render)
 */

// Configurar entorno de producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

const DatabaseManager = require('../src/config/database');

async function updateProductionComplexes() {
    console.log('🏢 ACTUALIZANDO COMPLEJOS EN PRODUCCIÓN');
    console.log('=======================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        await db.connect();
        
        // Verificar complejos actuales en producción
        console.log('🔍 Verificando complejos actuales en producción...');
        const complejos = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados en producción:');
        complejos.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        // Buscar los complejos específicos que necesitamos cambiar
        const fundacionGunnen = complejos.find(c => 
            c.nombre.toLowerCase().includes('gunnen') || 
            c.nombre.toLowerCase().includes('fundacion')
        );
        
        const bordeRio = complejos.find(c => 
            c.nombre.toLowerCase().includes('borde') && 
            c.nombre.toLowerCase().includes('rio')
        );
        
        console.log('\n🎯 Complejos a cambiar en producción:');
        if (fundacionGunnen) {
            console.log(`- Fundación Gunnen: ID ${fundacionGunnen.id} -> "Complejo Demo 1"`);
        }
        if (bordeRio) {
            console.log(`- Borde Río: ID ${bordeRio.id} -> "Complejo Demo 2"`);
        }
        
        // Realizar los cambios en producción
        if (fundacionGunnen) {
            console.log('\n🔄 Actualizando Fundación Gunnen en producción...');
            await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado en producción: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río en producción...');
            await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado en producción: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios en producción
        console.log('\n🔍 Verificando cambios aplicados en producción...');
        const complejosActualizados = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos en producción después de los cambios:');
        complejosActualizados.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        console.log('\n✅ Cambios aplicados exitosamente en PRODUCCIÓN');
        
    } catch (error) {
        console.error('❌ Error en producción:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
updateProductionComplexes();

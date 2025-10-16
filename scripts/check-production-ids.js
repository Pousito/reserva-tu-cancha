#!/usr/bin/env node

/**
 * Script para verificar todos los IDs de complejos en producción
 */

// Configurar entorno de producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

const DatabaseManager = require('../src/config/database');

async function checkProductionIds() {
    console.log('🔍 VERIFICANDO IDs DE COMPLEJOS EN PRODUCCIÓN');
    console.log('=============================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        await db.connect();
        
        // Verificar todos los complejos
        console.log('🔍 Verificando todos los complejos en producción...');
        const complejos = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Todos los complejos en producción:');
        complejos.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        // Buscar específicamente los que necesitamos cambiar
        console.log('\n🔍 Buscando complejos específicos...');
        const fundacionGunnen = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.nombre LIKE '%Gunnen%' OR c.nombre LIKE '%Fundación%'
        `);
        
        const bordeRio = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.nombre LIKE '%Borde%' AND c.nombre LIKE '%Río%'
        `);
        
        console.log('🎯 Fundación Gunnen encontrados:');
        fundacionGunnen.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        console.log('🎯 Borde Río encontrados:');
        bordeRio.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
checkProductionIds();

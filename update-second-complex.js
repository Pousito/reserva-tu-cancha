#!/usr/bin/env node

/**
 * Script para actualizar el segundo complejo (Borde Río)
 */

// Configurar entorno de desarrollo ANTES de importar DatabaseManager
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: './env.postgresql' });

const DatabaseManager = require('./src/config/database');

async function updateSecondComplex() {
    console.log('🏢 ACTUALIZANDO SEGUNDO COMPLEJO');
    console.log('=================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        await db.connect();
        
        // Buscar el complejo Borde Río
        console.log('🔍 Buscando complejo Borde Río...');
        const bordeRio = await db.get(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.nombre LIKE '%Borde%' AND c.nombre LIKE '%Río%'
        `);
        
        if (bordeRio) {
            console.log(`📋 Complejo encontrado: ID ${bordeRio.id} | ${bordeRio.nombre} | ${bordeRio.ciudad_nombre}`);
            
            console.log('🔄 Actualizando Borde Río...');
            await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
            
            // Verificar el cambio
            console.log('\n🔍 Verificando cambio aplicado...');
            const complejosActualizados = await db.all(`
                SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
                FROM complejos c
                JOIN ciudades ci ON c.ciudad_id = ci.id
                ORDER BY c.id
            `);
            
            console.log('📊 Complejos después de los cambios:');
            complejosActualizados.forEach(complejo => {
                console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
            });
            
        } else {
            console.log('❌ No se encontró el complejo Borde Río');
        }
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
updateSecondComplex();

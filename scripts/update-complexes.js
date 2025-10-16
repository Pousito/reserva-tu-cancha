#!/usr/bin/env node

/**
 * Script para actualizar nombres de complejos
 * Uso: node scripts/update-complexes.js
 */

const DatabaseHelper = require('./db-helper');

async function updateComplexNames() {
    console.log('🏢 ACTUALIZANDO NOMBRES DE COMPLEJOS');
    console.log('====================================');
    
    const db = new DatabaseHelper();
    
    try {
        // Configurar entorno de desarrollo
        process.env.NODE_ENV = 'development';
        require('dotenv').config({ path: './env.postgresql' });
        
        // Verificar complejos actuales
        console.log('🔍 Verificando complejos actuales...');
        const complejos = await db.getComplexes();
        
        console.log('📊 Complejos encontrados:');
        complejos.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log(`   📍 Dirección: ${complejo.direccion}`);
            console.log('   ---');
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
            await db.updateComplexName(fundacionGunnen.id, 'Complejo Demo 1');
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río...');
            await db.updateComplexName(bordeRio.id, 'Complejo Demo 2');
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await db.getComplexes();
        
        console.log('📊 Complejos después de los cambios:');
        complejosActualizados.forEach(complejo => {
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
        await db.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    updateComplexNames();
}

module.exports = { updateComplexNames };

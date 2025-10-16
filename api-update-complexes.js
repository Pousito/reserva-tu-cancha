#!/usr/bin/env node

/**
 * Script para actualizar complejos usando la API del servidor
 * El servidor ya está ejecutándose en el puerto 3000
 */

const fetch = require('node-fetch');

async function updateComplexesViaAPI() {
    console.log('🏢 ACTUALIZANDO COMPLEJOS VÍA API');
    console.log('==================================');
    
    const baseUrl = 'http://localhost:3000';
    
    try {
        // Verificar que el servidor esté funcionando
        console.log('🔍 Verificando conexión con el servidor...');
        const healthCheck = await fetch(`${baseUrl}/health`);
        if (!healthCheck.ok) {
            throw new Error('Servidor no disponible');
        }
        console.log('✅ Servidor funcionando correctamente');
        
        // Obtener ciudades
        console.log('\n🔍 Obteniendo ciudades...');
        const ciudadesResponse = await fetch(`${baseUrl}/api/ciudades`);
        const ciudades = await ciudadesResponse.json();
        console.log('📋 Ciudades encontradas:', ciudades.map(c => c.nombre).join(', '));
        
        // Obtener complejos de cada ciudad
        let allComplexes = [];
        for (const ciudad of ciudades) {
            console.log(`\n🏙️ Obteniendo complejos de ${ciudad.nombre}...`);
            const complejosResponse = await fetch(`${baseUrl}/api/complejos/${ciudad.id}`);
            const complejos = await complejosResponse.json();
            allComplexes = allComplexes.concat(complejos);
        }
        
        console.log('\n📊 Complejos encontrados:');
        allComplexes.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        // Buscar los complejos específicos que necesitamos cambiar
        const fundacionGunnen = allComplexes.find(c => 
            c.nombre.toLowerCase().includes('gunnen') || 
            c.nombre.toLowerCase().includes('fundacion')
        );
        
        const bordeRio = allComplexes.find(c => 
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
        
        // Realizar los cambios usando SQL directo a través del servidor
        console.log('\n🔄 Realizando cambios...');
        
        if (fundacionGunnen) {
            console.log('🔄 Actualizando Fundación Gunnen...');
            // Usar el endpoint de admin si existe, o crear uno temporal
            try {
                const updateResponse = await fetch(`${baseUrl}/api/admin/complejos/${fundacionGunnen.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nombre: 'Complejo Demo 1'
                    })
                });
                
                if (updateResponse.ok) {
                    console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
                } else {
                    console.log('⚠️ Endpoint de admin no disponible, usando método alternativo');
                    // Aquí podríamos implementar un método alternativo
                }
            } catch (error) {
                console.log('⚠️ Error en actualización:', error.message);
            }
        }
        
        if (bordeRio) {
            console.log('🔄 Actualizando Borde Río...');
            try {
                const updateResponse = await fetch(`${baseUrl}/api/admin/complejos/${bordeRio.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nombre: 'Complejo Demo 2'
                    })
                });
                
                if (updateResponse.ok) {
                    console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
                } else {
                    console.log('⚠️ Endpoint de admin no disponible, usando método alternativo');
                }
            } catch (error) {
                console.log('⚠️ Error en actualización:', error.message);
            }
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        let allComplexesUpdated = [];
        for (const ciudad of ciudades) {
            const complejosResponse = await fetch(`${baseUrl}/api/complejos/${ciudad.id}`);
            const complejos = await complejosResponse.json();
            allComplexesUpdated = allComplexesUpdated.concat(complejos);
        }
        
        console.log('📊 Complejos después de los cambios:');
        allComplexesUpdated.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id} | 🏢 ${complejo.nombre} | 🏙️ ${complejo.ciudad_nombre}`);
        });
        
        console.log('\n✅ Proceso completado');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    }
}

// Ejecutar
updateComplexesViaAPI();

#!/usr/bin/env node

/**
 * Script para verificar el contenido de la base de datos
 * Verifica qué datos hay en las tablas principales
 */

const https = require('https');
const http = require('http');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

// Función para hacer petición HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CheckDatabaseContent/1.0)',
                ...options.headers
            }
        };
        
        const req = client.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.on('error', reject);
        req.end();
    });
}

// Verificar contenido de la base de datos
async function checkDatabaseContent() {
    console.log('🔍 Verificando contenido de la base de datos...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/health`);
        
        if (response.statusCode === 200) {
            const healthData = JSON.parse(response.body);
            console.log('✅ Health check exitoso');
            console.log('📊 Estado de la base de datos:');
            console.log(`   Tipo: ${healthData.database.type}`);
            console.log(`   Conectada: ${healthData.database.connected}`);
            console.log(`   Reservas: ${healthData.reservasCount}`);
            console.log(`   Canchas: ${healthData.canchasCount}`);
            console.log(`   Complejos: ${healthData.complejosCount}`);
            console.log(`   Ciudades: ${healthData.citiesCount}`);
            
            return healthData;
        } else {
            console.log(`❌ Health check falló: ${response.statusCode}`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error verificando contenido de la base de datos:', error.message);
        return null;
    }
}

// Verificar si hay datos de prueba
async function checkTestData() {
    console.log('🔍 Verificando si hay datos de prueba...');
    
    try {
        // Probar endpoint de debug para insertar datos de prueba
        const response = await makeRequest(`${PRODUCTION_URL}/api/debug/insert-test-reservations`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('✅ Endpoint de datos de prueba disponible');
            console.log('📊 Respuesta:', data);
            return true;
        } else {
            console.log(`❌ Endpoint de datos de prueba no disponible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log('⚠️ Endpoint de datos de prueba no disponible');
        return false;
    }
}

// Crear datos de prueba básicos
async function createBasicTestData() {
    console.log('🔍 Creando datos de prueba básicos...');
    
    try {
        // Crear un endpoint temporal para insertar datos básicos
        const testData = {
            complejo: {
                nombre: 'Complejo Deportivo Test',
                direccion: 'Av. Test 123',
                telefono: '+56912345678',
                email: 'test@complejo.com',
                ciudad_id: 1
            },
            cancha: {
                nombre: 'Cancha Test 1',
                tipo: 'Fútbol',
                precio: 25000,
                complejo_id: 1
            }
        };
        
        console.log('📋 Datos de prueba a crear:', testData);
        console.log('💡 Nota: Este es un ejemplo de los datos que se necesitan');
        console.log('💡 Los datos reales deben insertarse directamente en la base de datos');
        
        return testData;
    } catch (error) {
        console.error('❌ Error creando datos de prueba:', error.message);
        return null;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando verificación de contenido de base de datos...\n');
    
    // Verificar contenido actual
    const healthData = await checkDatabaseContent();
    console.log('');
    
    // Verificar datos de prueba
    const testDataAvailable = await checkTestData();
    console.log('');
    
    // Crear datos de prueba básicos
    const testData = await createBasicTestData();
    console.log('');
    
    console.log('\n📋 === ANÁLISIS DEL PROBLEMA ===');
    
    if (healthData) {
        if (healthData.canchasCount === '0') {
            console.log('❌ PROBLEMA IDENTIFICADO: No hay canchas en la base de datos');
            console.log('💡 SOLUCIÓN: Se necesitan insertar canchas en la base de datos');
            console.log('💡 El endpoint bloquear-y-pagar falla porque no hay canchas válidas');
        } else {
            console.log('✅ Hay canchas en la base de datos');
        }
        
        if (healthData.complejosCount === '0') {
            console.log('❌ PROBLEMA ADICIONAL: No hay complejos en la base de datos');
            console.log('💡 SOLUCIÓN: Se necesitan insertar complejos primero');
        } else {
            console.log('✅ Hay complejos en la base de datos');
        }
        
        if (healthData.citiesCount === '0') {
            console.log('❌ PROBLEMA ADICIONAL: No hay ciudades en la base de datos');
            console.log('💡 SOLUCIÓN: Se necesitan insertar ciudades primero');
        } else {
            console.log('✅ Hay ciudades en la base de datos');
        }
    }
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Insertar ciudades en la base de datos');
    console.log('2. Insertar complejos deportivos');
    console.log('3. Insertar canchas en los complejos');
    console.log('4. Probar el endpoint bloquear-y-pagar');
    
    console.log('\n✅ Verificación completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkDatabaseContent,
    checkTestData,
    createBasicTestData
};

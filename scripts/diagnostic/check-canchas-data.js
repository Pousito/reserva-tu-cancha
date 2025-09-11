#!/usr/bin/env node

/**
 * Script para verificar los datos de canchas en la base de datos
 * Verifica qué canchas existen y sus IDs
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
                'User-Agent': 'Mozilla/5.0 (compatible; CheckCanchasData/1.0)',
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

// Verificar canchas disponibles
async function checkCanchasData() {
    console.log('🔍 Verificando datos de canchas...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/api/canchas/1`);
        
        if (response.statusCode === 200) {
            const canchas = JSON.parse(response.body);
            console.log('✅ Canchas obtenidas exitosamente');
            console.log(`📊 Total de canchas: ${canchas.length}`);
            
            canchas.forEach((cancha, index) => {
                console.log(`🏟️ Cancha ${index + 1}:`);
                console.log(`   ID: ${cancha.id}`);
                console.log(`   Nombre: ${cancha.nombre}`);
                console.log(`   Tipo: ${cancha.tipo}`);
                console.log(`   Complejo ID: ${cancha.complejo_id}`);
                console.log(`   Precio: $${cancha.precio}`);
                console.log('');
            });
            
            return canchas;
        } else {
            console.log(`❌ Error obteniendo canchas: ${response.statusCode}`);
            console.log('📋 Respuesta:', response.body.substring(0, 500));
            return null;
        }
    } catch (error) {
        console.error('❌ Error verificando canchas:', error.message);
        return null;
    }
}

// Probar endpoint bloquear-y-pagar con cancha_id válido
async function testBlockAndPayWithValidCancha(canchas) {
    console.log('🔍 Probando endpoint bloquear-y-pagar con cancha válida...');
    
    if (!canchas || canchas.length === 0) {
        console.log('❌ No hay canchas disponibles para probar');
        return false;
    }
    
    const cancha = canchas[0]; // Usar la primera cancha
    console.log(`🏟️ Usando cancha: ${cancha.nombre} (ID: ${cancha.id})`);
    
    try {
        const testData = {
            cancha_id: cancha.id, // Usar ID válido
            nombre_cliente: 'Test Cliente',
            email_cliente: 'test@example.com',
            telefono_cliente: '+56912345678',
            rut_cliente: '12345678-9',
            fecha: '2024-12-31',
            hora_inicio: '10:00',
            hora_fin: '11:00',
            precio_total: cancha.precio || 25000,
            session_id: 'TEST_' + Date.now()
        };
        
        console.log('📋 Datos de prueba:', testData);
        
        const response = await makeRequest(`${PRODUCTION_URL}/api/reservas/bloquear-y-pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`📡 Endpoint responde con código: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('✅ Endpoint bloquear-y-pagar funciona correctamente');
            console.log('📊 Respuesta:', data);
            return true;
        } else {
            console.log(`❌ Error en endpoint: ${response.statusCode}`);
            console.log('📋 Respuesta:', response.body.substring(0, 1000));
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando endpoint:', error.message);
        return false;
    }
}

// Verificar complejos disponibles
async function checkComplejosData() {
    console.log('🔍 Verificando datos de complejos...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/api/complejos/1`);
        
        if (response.statusCode === 200) {
            const complejos = JSON.parse(response.body);
            console.log('✅ Complejos obtenidos exitosamente');
            console.log(`📊 Total de complejos: ${complejos.length}`);
            
            complejos.forEach((complejo, index) => {
                console.log(`🏢 Complejo ${index + 1}:`);
                console.log(`   ID: ${complejo.id}`);
                console.log(`   Nombre: ${complejo.nombre}`);
                console.log(`   Ciudad: ${complejo.ciudad}`);
                console.log('');
            });
            
            return complejos;
        } else {
            console.log(`❌ Error obteniendo complejos: ${response.statusCode}`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error verificando complejos:', error.message);
        return null;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando verificación de datos de canchas...\n');
    
    // Verificar complejos
    const complejos = await checkComplejosData();
    console.log('');
    
    // Verificar canchas
    const canchas = await checkCanchasData();
    console.log('');
    
    // Probar endpoint con cancha válida
    const testResult = await testBlockAndPayWithValidCancha(canchas);
    
    console.log('\n📋 === RESULTADOS ===');
    console.log(`Complejos: ${complejos ? '✅' : '❌'}`);
    console.log(`Canchas: ${canchas ? '✅' : '❌'}`);
    console.log(`Endpoint con cancha válida: ${testResult ? '✅' : '❌'}`);
    
    if (testResult) {
        console.log('\n🎉 ¡PROBLEMA RESUELTO!');
        console.log('✅ El endpoint bloquear-y-pagar funciona con cancha_id válido');
        console.log('\n💡 El problema era que se estaba usando cancha_id = 1 que no existe');
        console.log('💡 La solución es usar un cancha_id válido de la base de datos');
    } else {
        console.log('\n⚠️ PROBLEMA PERSISTE');
        console.log('❌ El endpoint aún no funciona correctamente');
    }
    
    console.log('\n✅ Verificación completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkCanchasData,
    checkComplejosData,
    testBlockAndPayWithValidCancha
};

#!/usr/bin/env node

/**
 * Script para diagnosticar el error 502 en Render
 * Fecha: 2025-10-03
 */

const https = require('https');
const http = require('http');

console.log('🔍 DIAGNÓSTICO DEL ERROR 502 EN RENDER');
console.log('=====================================\n');

// Función para hacer peticiones HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const req = protocol.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

async function diagnoseRender() {
    const baseUrl = 'https://www.reservatuscanchas.cl';
    
    console.log('📊 Verificando endpoints...\n');
    
    // 1. Verificar página principal
    try {
        console.log('1. Página principal...');
        const mainPage = await makeRequest(baseUrl);
        console.log(`   Status: ${mainPage.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(mainPage.headers, null, 2)}`);
        console.log(`   Data: ${mainPage.data.substring(0, 200)}...\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // 2. Verificar endpoint de salud
    try {
        console.log('2. Endpoint de salud...');
        const health = await makeRequest(`${baseUrl}/health`);
        console.log(`   Status: ${health.statusCode}`);
        console.log(`   Data: ${health.data}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // 3. Verificar endpoint de API
    try {
        console.log('3. Endpoint de API...');
        const api = await makeRequest(`${baseUrl}/api`);
        console.log(`   Status: ${api.statusCode}`);
        console.log(`   Data: ${api.data}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // 4. Verificar endpoint de calendario (sin auth)
    try {
        console.log('4. Endpoint de calendario (sin auth)...');
        const calendar = await makeRequest(`${baseUrl}/api/admin/calendar/week`);
        console.log(`   Status: ${calendar.statusCode}`);
        console.log(`   Data: ${calendar.data}\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // 5. Verificar si es problema de DNS
    try {
        console.log('5. Verificando DNS...');
        const dns = require('dns');
        dns.lookup('www.reservatuscanchas.cl', (err, address) => {
            if (err) {
                console.log(`   ❌ Error DNS: ${err.message}\n`);
            } else {
                console.log(`   ✅ DNS resuelve a: ${address}\n`);
            }
        });
    } catch (error) {
        console.log(`   ❌ Error DNS: ${error.message}\n`);
    }
    
    console.log('🔍 DIAGNÓSTICO COMPLETADO');
    console.log('==========================');
    console.log('\n📋 POSIBLES CAUSAS DEL ERROR 502:');
    console.log('1. Servidor de Render caído o reiniciando');
    console.log('2. Problema con variables de entorno');
    console.log('3. Error en el código que impide el arranque');
    console.log('4. Problema con la base de datos');
    console.log('5. Límite de recursos alcanzado');
    console.log('6. Problema de configuración en Render');
    
    console.log('\n🛠️ SOLUCIONES RECOMENDADAS:');
    console.log('1. Verificar logs en Render Dashboard');
    console.log('2. Verificar variables de entorno');
    console.log('3. Hacer rollback a commit anterior');
    console.log('4. Verificar estado de la base de datos');
    console.log('5. Contactar soporte de Render si persiste');
}

// Ejecutar diagnóstico
diagnoseRender().catch(console.error);

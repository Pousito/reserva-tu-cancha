#!/usr/bin/env node

/**
 * Script para verificar que los gráficos funcionen correctamente en producción
 * Este script verifica la configuración de CSP y Chart.js
 */

const https = require('https');
const http = require('http');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';
const DEVELOPMENT_URL = 'http://localhost:3000';

// Función para hacer petición HTTP/HTTPS
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        }).on('error', reject);
    });
}

// Verificar CSP headers
async function checkCSPHeaders(url) {
    console.log(`🔍 Verificando CSP headers en ${url}...`);
    
    try {
        const response = await makeRequest(url);
        const cspHeader = response.headers['content-security-policy'];
        
        if (cspHeader) {
            console.log('📋 CSP Header encontrado:', cspHeader);
            
            // Verificar si incluye 'unsafe-eval'
            if (cspHeader.includes("'unsafe-eval'")) {
                console.log('✅ CSP permite unsafe-eval - Chart.js debería funcionar');
            } else {
                console.log('❌ CSP NO permite unsafe-eval - Chart.js puede fallar');
                console.log('💡 Solución: Agregar \'unsafe-eval\' a scriptSrc en CSP');
            }
            
            // Verificar si incluye cdn.jsdelivr.net
            if (cspHeader.includes('cdn.jsdelivr.net')) {
                console.log('✅ CSP permite cdn.jsdelivr.net - Chart.js CDN accesible');
            } else {
                console.log('❌ CSP NO permite cdn.jsdelivr.net - Chart.js CDN bloqueado');
            }
        } else {
            console.log('⚠️ No se encontró CSP header');
        }
        
        return cspHeader;
    } catch (error) {
        console.error('❌ Error verificando CSP:', error.message);
        return null;
    }
}

// Verificar carga de Chart.js
async function checkChartJSLoad(url) {
    console.log(`🔍 Verificando carga de Chart.js en ${url}/admin-reports.html...`);
    
    try {
        const response = await makeRequest(`${url}/admin-reports.html`);
        
        if (response.statusCode === 200) {
            const body = response.body;
            
            // Verificar si Chart.js está incluido
            if (body.includes('chart.js')) {
                console.log('✅ Chart.js está incluido en admin-reports.html');
                
                // Verificar versión específica
                const versionMatch = body.match(/chart\.js@([\d.]+)/);
                if (versionMatch) {
                    console.log(`📊 Versión de Chart.js: ${versionMatch[1]}`);
                }
            } else {
                console.log('❌ Chart.js NO está incluido en admin-reports.html');
            }
            
            // Verificar si hay scripts de gráficos
            if (body.includes('admin-reports.js')) {
                console.log('✅ admin-reports.js está incluido');
            } else {
                console.log('❌ admin-reports.js NO está incluido');
            }
        } else {
            console.log(`❌ Error cargando admin-reports.html: ${response.statusCode}`);
        }
    } catch (error) {
        console.error('❌ Error verificando Chart.js:', error.message);
    }
}

// Verificar endpoint de reportes
async function checkReportsEndpoint(url) {
    console.log(`🔍 Verificando endpoint de reportes en ${url}...`);
    
    try {
        // Hacer petición POST al endpoint de reportes
        const postData = JSON.stringify({
            dateFrom: '2024-09-01',
            dateTo: '2024-12-31'
        });
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const response = await makeRequest(`${url}/api/admin/reports`);
        
        if (response.statusCode === 401) {
            console.log('✅ Endpoint de reportes requiere autenticación (correcto)');
        } else if (response.statusCode === 200) {
            console.log('✅ Endpoint de reportes responde correctamente');
        } else {
            console.log(`⚠️ Endpoint de reportes responde con código: ${response.statusCode}`);
        }
    } catch (error) {
        console.error('❌ Error verificando endpoint de reportes:', error.message);
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando verificación de gráficos en producción...\n');
    
    // Verificar producción
    console.log('🌐 === VERIFICACIÓN DE PRODUCCIÓN ===');
    await checkCSPHeaders(PRODUCTION_URL);
    await checkChartJSLoad(PRODUCTION_URL);
    await checkReportsEndpoint(PRODUCTION_URL);
    
    console.log('\n🏠 === VERIFICACIÓN DE DESARROLLO ===');
    await checkCSPHeaders(DEVELOPMENT_URL);
    await checkChartJSLoad(DEVELOPMENT_URL);
    await checkReportsEndpoint(DEVELOPMENT_URL);
    
    console.log('\n📋 === RESUMEN ===');
    console.log('1. Verifica que CSP permita \'unsafe-eval\' para Chart.js');
    console.log('2. Verifica que CSP permita cdn.jsdelivr.net');
    console.log('3. Verifica que admin-reports.html incluya Chart.js');
    console.log('4. Verifica que el endpoint /api/admin/reports funcione');
    
    console.log('\n✅ Verificación completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkCSPHeaders,
    checkChartJSLoad,
    checkReportsEndpoint
};

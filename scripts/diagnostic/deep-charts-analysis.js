#!/usr/bin/env node

/**
 * Análisis profundo de problemas con gráficos en producción
 * Verifica múltiples aspectos del problema
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';
const DEVELOPMENT_URL = 'http://localhost:3000';

// Función para hacer petición HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ChartsDiagnostic/1.0)',
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

// Verificar si el servidor está usando middleware de seguridad
async function checkSecurityMiddleware() {
    console.log('🔍 Verificando middleware de seguridad...');
    
    try {
        // Verificar si hay headers de seguridad
        const response = await makeRequest(PRODUCTION_URL);
        
        const securityHeaders = [
            'content-security-policy',
            'x-frame-options',
            'x-content-type-options',
            'strict-transport-security'
        ];
        
        console.log('📋 Headers de seguridad encontrados:');
        securityHeaders.forEach(header => {
            if (response.headers[header]) {
                console.log(`  ✅ ${header}: ${response.headers[header]}`);
            } else {
                console.log(`  ❌ ${header}: No encontrado`);
            }
        });
        
        return response.headers;
    } catch (error) {
        console.error('❌ Error verificando middleware de seguridad:', error.message);
        return null;
    }
}

// Verificar carga de Chart.js desde CDN
async function checkChartJSCDN() {
    console.log('🔍 Verificando carga de Chart.js desde CDN...');
    
    try {
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
        const response = await makeRequest(cdnUrl);
        
        if (response.statusCode === 200) {
            console.log('✅ Chart.js CDN accesible');
            console.log(`📊 Tamaño del archivo: ${(response.body.length / 1024).toFixed(2)} KB`);
            
            // Verificar si contiene funciones específicas de Chart.js
            const chartFunctions = ['Chart', 'registerables', 'ChartJS'];
            chartFunctions.forEach(func => {
                if (response.body.includes(func)) {
                    console.log(`  ✅ Función ${func} encontrada`);
                } else {
                    console.log(`  ❌ Función ${func} NO encontrada`);
                }
            });
        } else {
            console.log(`❌ Chart.js CDN no accesible: ${response.statusCode}`);
        }
        
        return response.statusCode === 200;
    } catch (error) {
        console.error('❌ Error verificando Chart.js CDN:', error.message);
        return false;
    }
}

// Verificar archivos locales de reportes
async function checkLocalReportsFiles() {
    console.log('🔍 Verificando archivos locales de reportes...');
    
    const filesToCheck = [
        'public/admin-reports.html',
        'public/admin-reports.js',
        'public/js/admin-utils.js',
        'public/js/url-config.js'
    ];
    
    filesToCheck.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${file} existe`);
            
            // Verificar contenido específico
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (file.includes('admin-reports.html')) {
                if (content.includes('chart.js')) {
                    console.log(`  ✅ Chart.js incluido en HTML`);
                } else {
                    console.log(`  ❌ Chart.js NO incluido en HTML`);
                }
            }
            
            if (file.includes('admin-reports.js')) {
                if (content.includes('new Chart')) {
                    console.log(`  ✅ Código de Chart.js encontrado`);
                } else {
                    console.log(`  ❌ Código de Chart.js NO encontrado`);
                }
            }
        } else {
            console.log(`❌ ${file} NO existe`);
        }
    });
}

// Verificar configuración del servidor
async function checkServerConfiguration() {
    console.log('🔍 Verificando configuración del servidor...');
    
    const serverFiles = [
        'server.js',
        'src/app.js',
        'middleware/security.js'
    ];
    
    serverFiles.forEach(file => {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            console.log(`✅ ${file} existe`);
            
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (file === 'server.js') {
                if (content.includes('helmet') || content.includes('security')) {
                    console.log(`  ✅ Middleware de seguridad configurado`);
                } else {
                    console.log(`  ❌ Middleware de seguridad NO configurado`);
                }
                
                if (content.includes('express.static')) {
                    console.log(`  ✅ Archivos estáticos configurados`);
                } else {
                    console.log(`  ❌ Archivos estáticos NO configurados`);
                }
            }
            
            if (file === 'middleware/security.js') {
                if (content.includes("'unsafe-eval'")) {
                    console.log(`  ✅ CSP permite unsafe-eval`);
                } else {
                    console.log(`  ❌ CSP NO permite unsafe-eval`);
                }
            }
        } else {
            console.log(`❌ ${file} NO existe`);
        }
    });
}

// Verificar respuesta del endpoint de reportes
async function checkReportsEndpoint() {
    console.log('🔍 Verificando endpoint de reportes...');
    
    try {
        // Probar sin autenticación
        const response = await makeRequest(`${PRODUCTION_URL}/api/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateFrom: '2024-09-01',
                dateTo: '2024-12-31'
            })
        });
        
        console.log(`📡 Endpoint responde con código: ${response.statusCode}`);
        
        if (response.statusCode === 401) {
            console.log('✅ Endpoint requiere autenticación (correcto)');
        } else if (response.statusCode === 200) {
            console.log('✅ Endpoint responde correctamente');
            try {
                const data = JSON.parse(response.body);
                console.log('📊 Datos de respuesta:', Object.keys(data));
            } catch (e) {
                console.log('⚠️ Respuesta no es JSON válido');
            }
        } else {
            console.log(`⚠️ Respuesta inesperada: ${response.statusCode}`);
        }
        
        return response.statusCode;
    } catch (error) {
        console.error('❌ Error verificando endpoint:', error.message);
        return null;
    }
}

// Verificar carga de página de reportes
async function checkReportsPage() {
    console.log('🔍 Verificando carga de página de reportes...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/admin-reports.html`);
        
        if (response.statusCode === 200) {
            console.log('✅ Página de reportes accesible');
            
            const body = response.body;
            
            // Verificar elementos críticos
            const criticalElements = [
                'chart.js',
                'admin-reports.js',
                'admin-utils.js',
                'url-config.js',
                'canvas',
                'Chart'
            ];
            
            criticalElements.forEach(element => {
                if (body.includes(element)) {
                    console.log(`  ✅ ${element} encontrado`);
                } else {
                    console.log(`  ❌ ${element} NO encontrado`);
                }
            });
            
            // Verificar si hay errores en el HTML
            if (body.includes('error') || body.includes('Error')) {
                console.log('⚠️ Posibles errores en el HTML');
            }
            
        } else {
            console.log(`❌ Página de reportes no accesible: ${response.statusCode}`);
        }
        
        return response.statusCode === 200;
    } catch (error) {
        console.error('❌ Error verificando página de reportes:', error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando análisis profundo de gráficos en producción...\n');
    
    // Ejecutar todas las verificaciones
    await checkSecurityMiddleware();
    console.log('');
    
    await checkChartJSCDN();
    console.log('');
    
    await checkLocalReportsFiles();
    console.log('');
    
    await checkServerConfiguration();
    console.log('');
    
    await checkReportsEndpoint();
    console.log('');
    
    await checkReportsPage();
    console.log('');
    
    console.log('📋 === RESUMEN DEL ANÁLISIS ===');
    console.log('1. Verificar si el servidor usa middleware de seguridad');
    console.log('2. Verificar si Chart.js CDN es accesible');
    console.log('3. Verificar archivos locales de reportes');
    console.log('4. Verificar configuración del servidor');
    console.log('5. Verificar endpoint de reportes');
    console.log('6. Verificar carga de página de reportes');
    
    console.log('\n✅ Análisis completado');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkSecurityMiddleware,
    checkChartJSCDN,
    checkLocalReportsFiles,
    checkServerConfiguration,
    checkReportsEndpoint,
    checkReportsPage
};

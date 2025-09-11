#!/usr/bin/env node

/**
 * Script para verificar que el fix de gráficos funcione correctamente
 * Ejecuta verificaciones automáticas hasta que los gráficos funcionen
 */

const https = require('https');
const http = require('http');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';
const MAX_ATTEMPTS = 10;
const RETRY_DELAY = 30000; // 30 segundos

// Función para hacer petición HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ChartsVerification/1.0)',
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

// Verificar si Chart.js está funcionando correctamente
async function verifyChartJS() {
    console.log('🔍 Verificando Chart.js...');
    
    try {
        // Verificar versión 3.9.1
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        const response = await makeRequest(cdnUrl);
        
        if (response.statusCode === 200) {
            const content = response.body;
            
            // Verificar funciones críticas
            const criticalFunctions = [
                'Chart',
                'Chart.register',
                'Chart.defaults',
                'Chart.controllers',
                'Chart.scales'
            ];
            
            let functionsFound = 0;
            criticalFunctions.forEach(func => {
                if (content.includes(func)) {
                    console.log(`  ✅ ${func} encontrado`);
                    functionsFound++;
                } else {
                    console.log(`  ❌ ${func} NO encontrado`);
                }
            });
            
            if (functionsFound >= 3) {
                console.log('✅ Chart.js 3.9.1 funciona correctamente');
                return true;
            } else {
                console.log('❌ Chart.js 3.9.1 no funciona correctamente');
                return false;
            }
        } else {
            console.log(`❌ Chart.js CDN no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando Chart.js:', error.message);
        return false;
    }
}

// Verificar si el HTML de reportes está actualizado
async function verifyReportsHTML() {
    console.log('🔍 Verificando HTML de reportes...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/admin-reports.html`);
        
        if (response.statusCode === 200) {
            const html = response.body;
            
            // Verificar versión de Chart.js
            if (html.includes('chart.js@3.9.1')) {
                console.log('✅ Chart.js 3.9.1 incluido en HTML');
                return true;
            } else if (html.includes('chart.js@4.3.0') || html.includes('chart.js@4.4.0')) {
                console.log('❌ Versión problemática de Chart.js aún incluida');
                return false;
            } else {
                console.log('❌ Versión de Chart.js no identificada');
                return false;
            }
        } else {
            console.log(`❌ HTML de reportes no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando HTML de reportes:', error.message);
        return false;
    }
}

// Verificar si el JavaScript de reportes está actualizado
async function verifyReportsJS() {
    console.log('🔍 Verificando JavaScript de reportes...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/admin-reports.js`);
        
        if (response.statusCode === 200) {
            const js = response.body;
            
            // Verificar verificaciones de Chart.js
            if (js.includes('typeof Chart === \'undefined\'')) {
                console.log('✅ Verificación de Chart.js incluida');
                return true;
            } else {
                console.log('❌ Verificación de Chart.js NO incluida');
                return false;
            }
        } else {
            console.log(`❌ JavaScript de reportes no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando JavaScript de reportes:', error.message);
        return false;
    }
}

// Función principal de verificación
async function verifyChartsFix() {
    console.log('🚀 Iniciando verificación del fix de gráficos...\n');
    
    const results = {
        chartJS: await verifyChartJS(),
        reportsHTML: await verifyReportsHTML(),
        reportsJS: await verifyReportsJS()
    };
    
    console.log('\n📋 === RESULTADOS DE VERIFICACIÓN ===');
    console.log(`Chart.js 3.9.1: ${results.chartJS ? '✅' : '❌'}`);
    console.log(`HTML actualizado: ${results.reportsHTML ? '✅' : '❌'}`);
    console.log(`JavaScript actualizado: ${results.reportsJS ? '✅' : '❌'}`);
    
    const allPassed = results.chartJS && results.reportsHTML && results.reportsJS;
    
    if (allPassed) {
        console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON!');
        console.log('✅ Los gráficos deberían funcionar correctamente en producción');
        console.log('\n💡 Para verificar manualmente:');
        console.log('1. Ir a https://www.reservatuscanchas.cl/admin-reports.html');
        console.log('2. Iniciar sesión como administrador');
        console.log('3. Verificar que los gráficos se muestren correctamente');
        return true;
    } else {
        console.log('\n⚠️ ALGUNAS VERIFICACIONES FALLARON');
        console.log('❌ Los gráficos pueden no funcionar correctamente');
        return false;
    }
}

// Función para verificación automática con reintentos
async function verifyWithRetries() {
    console.log(`🔄 Iniciando verificación automática (máximo ${MAX_ATTEMPTS} intentos)...\n`);
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`\n--- INTENTO ${attempt}/${MAX_ATTEMPTS} ---`);
        
        const success = await verifyChartsFix();
        
        if (success) {
            console.log(`\n🎉 ¡ÉXITO en el intento ${attempt}!`);
            return true;
        }
        
        if (attempt < MAX_ATTEMPTS) {
            console.log(`\n⏳ Esperando ${RETRY_DELAY/1000} segundos antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
    
    console.log(`\n❌ FALLO después de ${MAX_ATTEMPTS} intentos`);
    return false;
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    const useRetries = args.includes('--retry') || args.includes('-r');
    
    if (useRetries) {
        await verifyWithRetries();
    } else {
        await verifyChartsFix();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    verifyChartJS,
    verifyReportsHTML,
    verifyReportsJS,
    verifyChartsFix,
    verifyWithRetries
};

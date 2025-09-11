#!/usr/bin/env node

/**
 * Verificación final de que los gráficos funcionen en producción
 * Verifica directamente si Chart.js local funciona
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
                'User-Agent': 'Mozilla/5.0 (compatible; FinalVerification/1.0)',
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

// Verificar si Chart.js local está disponible
async function verifyLocalChartJS() {
    console.log('🔍 Verificando Chart.js local...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/js/chart.min.js`);
        
        if (response.statusCode === 200) {
            console.log('✅ Chart.js local accesible');
            console.log(`📊 Tamaño: ${(response.body.length / 1024).toFixed(2)} KB`);
            
            // Verificar contenido
            if (response.body.includes('Chart') && response.body.includes('register')) {
                console.log('✅ Chart.js local es funcional');
                return true;
            } else {
                console.log('❌ Chart.js local no es funcional');
                return false;
            }
        } else {
            console.log(`❌ Chart.js local no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando Chart.js local:', error.message);
        return false;
    }
}

// Verificar si admin-reports.html usa Chart.js local
async function verifyAdminReportsHTML() {
    console.log('🔍 Verificando admin-reports.html...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/admin-reports.html`);
        
        if (response.statusCode === 200) {
            const html = response.body;
            
            if (html.includes('/js/chart.min.js')) {
                console.log('✅ admin-reports.html usa Chart.js local');
                return true;
            } else if (html.includes('chart.js@')) {
                console.log('❌ admin-reports.html aún usa CDN');
                return false;
            } else {
                console.log('❌ No se encontró Chart.js en admin-reports.html');
                return false;
            }
        } else {
            console.log(`❌ admin-reports.html no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando admin-reports.html:', error.message);
        return false;
    }
}

// Verificar si admin-reports.js tiene verificaciones
async function verifyAdminReportsJS() {
    console.log('🔍 Verificando admin-reports.js...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/admin-reports.js`);
        
        if (response.statusCode === 200) {
            const js = response.body;
            
            if (js.includes('typeof Chart === \'undefined\'')) {
                console.log('✅ admin-reports.js tiene verificaciones de Chart.js');
                return true;
            } else {
                console.log('❌ admin-reports.js no tiene verificaciones de Chart.js');
                return false;
            }
        } else {
            console.log(`❌ admin-reports.js no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando admin-reports.js:', error.message);
        return false;
    }
}

// Verificar si PostgreSQL funciona
async function verifyPostgreSQL() {
    console.log('🔍 Verificando PostgreSQL...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/health`);
        
        if (response.statusCode === 200) {
            const healthData = JSON.parse(response.body);
            
            if (healthData.database && healthData.database.connected) {
                console.log('✅ PostgreSQL conectado');
                console.log(`📊 Reservas: ${healthData.reservasCount}`);
                console.log(`📊 Canchas: ${healthData.canchasCount}`);
                console.log(`📊 Complejos: ${healthData.complejosCount}`);
                return true;
            } else {
                console.log('❌ PostgreSQL no conectado');
                return false;
            }
        } else {
            console.log(`❌ Health check no accesible: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando PostgreSQL:', error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando verificación final de gráficos...\n');
    
    const results = {
        localChartJS: await verifyLocalChartJS(),
        adminReportsHTML: await verifyAdminReportsHTML(),
        adminReportsJS: await verifyAdminReportsJS(),
        postgreSQL: await verifyPostgreSQL()
    };
    
    console.log('\n📋 === RESULTADOS FINALES ===');
    console.log(`Chart.js local: ${results.localChartJS ? '✅' : '❌'}`);
    console.log(`HTML actualizado: ${results.adminReportsHTML ? '✅' : '❌'}`);
    console.log(`JavaScript actualizado: ${results.adminReportsJS ? '✅' : '❌'}`);
    console.log(`PostgreSQL: ${results.postgreSQL ? '✅' : '❌'}`);
    
    const allPassed = results.localChartJS && results.adminReportsHTML && results.adminReportsJS && results.postgreSQL;
    
    if (allPassed) {
        console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON!');
        console.log('✅ Los gráficos deberían funcionar correctamente en producción');
        console.log('\n💡 Para verificar manualmente:');
        console.log('1. Ir a https://www.reservatuscanchas.cl/admin-reports.html');
        console.log('2. Iniciar sesión como administrador');
        console.log('3. Verificar que los gráficos se muestren correctamente');
        console.log('4. Probar filtros y actualización de datos');
        return true;
    } else {
        console.log('\n⚠️ ALGUNAS VERIFICACIONES FALLARON');
        console.log('❌ Los gráficos pueden no funcionar correctamente');
        return false;
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    verifyLocalChartJS,
    verifyAdminReportsHTML,
    verifyAdminReportsJS,
    verifyPostgreSQL
};

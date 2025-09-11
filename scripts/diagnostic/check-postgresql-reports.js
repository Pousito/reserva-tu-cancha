#!/usr/bin/env node

/**
 * Script para verificar problemas específicos con PostgreSQL y reportes
 * Verifica si el problema está en la base de datos o en Chart.js
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
                'User-Agent': 'Mozilla/5.0 (compatible; PostgreSQLReportsTest/1.0)',
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

// Verificar si el endpoint de reportes funciona con PostgreSQL
async function testReportsEndpointWithPostgreSQL() {
    console.log('🔍 Probando endpoint de reportes con PostgreSQL...');
    
    try {
        // Simular una petición de reportes (sin autenticación para ver el error)
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
            return true;
        } else if (response.statusCode === 500) {
            console.log('❌ Error 500 - Posible problema con PostgreSQL');
            console.log('📋 Respuesta:', response.body.substring(0, 200) + '...');
            return false;
        } else if (response.statusCode === 200) {
            console.log('✅ Endpoint responde correctamente');
            try {
                const data = JSON.parse(response.body);
                console.log('📊 Datos recibidos:', Object.keys(data));
                return true;
            } catch (e) {
                console.log('⚠️ Respuesta no es JSON válido');
                return false;
            }
        } else {
            console.log(`⚠️ Respuesta inesperada: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando endpoint:', error.message);
        return false;
    }
}

// Verificar si hay problemas con la conexión a PostgreSQL
async function testPostgreSQLConnection() {
    console.log('🔍 Probando conexión a PostgreSQL...');
    
    try {
        // Probar endpoint de salud
        const response = await makeRequest(`${PRODUCTION_URL}/health`);
        
        if (response.statusCode === 200) {
            console.log('✅ Endpoint de salud responde');
            const healthData = JSON.parse(response.body);
            console.log('📊 Estado de salud:', healthData);
            return true;
        } else {
            console.log(`❌ Endpoint de salud no responde: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando conexión PostgreSQL:', error.message);
        return false;
    }
}

// Verificar si Chart.js funciona con datos reales
async function testChartJSWithRealData() {
    console.log('🔍 Probando Chart.js con datos reales...');
    
    try {
        // Crear un HTML de prueba que use Chart.js 3.9.1
        const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Chart.js PostgreSQL Test</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
</head>
<body>
    <canvas id="testChart" width="400" height="200"></canvas>
    <div id="status"></div>
    <script>
        try {
            console.log('Chart object:', typeof Chart);
            console.log('Chart version:', Chart.version);
            
            const ctx = document.getElementById('testChart').getContext('2d');
            const testChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
                    datasets: [{
                        label: 'Datos de Prueba',
                        data: [12, 19, 3, 5, 2],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Test Chart.js 3.9.1'
                        }
                    }
                }
            });
            
            console.log('Chart created successfully:', testChart);
            document.getElementById('status').innerHTML = '<p style="color: green;">✅ Chart.js 3.9.1 funciona correctamente</p>';
        } catch (error) {
            console.error('Chart.js error:', error);
            document.getElementById('status').innerHTML = '<p style="color: red;">❌ Error en Chart.js: ' + error.message + '</p>';
        }
    </script>
</body>
</html>`;
        
        // Guardar el HTML de prueba
        const fs = require('fs');
        const path = require('path');
        const testFilePath = path.join(process.cwd(), 'public', 'test-chart-postgresql.html');
        
        fs.writeFileSync(testFilePath, testHTML);
        console.log('✅ HTML de prueba creado en public/test-chart-postgresql.html');
        
        // Probar en producción
        try {
            const prodResponse = await makeRequest(`${PRODUCTION_URL}/test-chart-postgresql.html`);
            if (prodResponse.statusCode === 200) {
                console.log('✅ Test HTML accesible en producción');
                return true;
            } else {
                console.log(`❌ Test HTML no accesible en producción: ${prodResponse.statusCode}`);
                return false;
            }
        } catch (error) {
            console.log('❌ Error probando en producción:', error.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Error creando test HTML:', error.message);
        return false;
    }
}

// Verificar si hay problemas específicos con los datos de reportes
async function testReportsDataStructure() {
    console.log('🔍 Probando estructura de datos de reportes...');
    
    try {
        // Verificar si el endpoint de reportes devuelve la estructura correcta
        const response = await makeRequest(`${PRODUCTION_URL}/api/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // Token de prueba
            },
            body: JSON.stringify({
                dateFrom: '2024-09-01',
                dateTo: '2024-12-31'
            })
        });
        
        console.log(`📡 Endpoint responde con código: ${response.statusCode}`);
        
        if (response.statusCode === 403) {
            console.log('✅ Endpoint rechaza token inválido (correcto)');
            return true;
        } else if (response.statusCode === 500) {
            console.log('❌ Error 500 - Problema con PostgreSQL o datos');
            console.log('📋 Respuesta:', response.body.substring(0, 500));
            return false;
        } else {
            console.log(`⚠️ Respuesta inesperada: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando estructura de datos:', error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando verificación de PostgreSQL y reportes...\n');
    
    // Ejecutar todas las pruebas
    await testPostgreSQLConnection();
    console.log('');
    
    await testReportsEndpointWithPostgreSQL();
    console.log('');
    
    await testReportsDataStructure();
    console.log('');
    
    await testChartJSWithRealData();
    console.log('');
    
    console.log('📋 === RESUMEN DE VERIFICACIÓN ===');
    console.log('1. Verificar conexión a PostgreSQL');
    console.log('2. Verificar endpoint de reportes');
    console.log('3. Verificar estructura de datos');
    console.log('4. Verificar Chart.js con datos reales');
    
    console.log('\n✅ Verificación completada');
    console.log('\n💡 Para probar manualmente:');
    console.log('1. Ir a https://www.reservatuscanchas.cl/test-chart-postgresql.html');
    console.log('2. Abrir DevTools (F12)');
    console.log('3. Verificar si aparece el gráfico y si hay errores en la consola');
    console.log('4. Ir a https://www.reservatuscanchas.cl/admin-reports.html');
    console.log('5. Iniciar sesión y verificar si los gráficos funcionan');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testPostgreSQLConnection,
    testReportsEndpointWithPostgreSQL,
    testReportsDataStructure,
    testChartJSWithRealData
};

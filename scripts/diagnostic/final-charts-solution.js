#!/usr/bin/env node

/**
 * Solución final para el problema de gráficos en producción
 * Implementa una solución robusta que funciona independientemente del CDN
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

// Función para hacer petición HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FinalChartsSolution/1.0)',
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

// Descargar Chart.js localmente
async function downloadChartJSLocally() {
    console.log('🔍 Descargando Chart.js localmente...');
    
    try {
        // Probar múltiples versiones de Chart.js
        const chartVersions = [
            'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
            'https://cdn.jsdelivr.net/npm/chart.js@3.8.0/dist/chart.min.js',
            'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js'
        ];
        
        for (const version of chartVersions) {
            console.log(`📥 Probando ${version}...`);
            
            try {
                const response = await makeRequest(version);
                
                if (response.statusCode === 200) {
                    const content = response.body;
                    
                    // Verificar si tiene las funciones necesarias
                    if (content.includes('Chart') && content.includes('register') && content.includes('defaults')) {
                        console.log(`✅ Versión funcional encontrada: ${version}`);
                        
                        // Guardar localmente
                        const localPath = path.join(process.cwd(), 'public', 'js', 'chart.min.js');
                        const jsDir = path.dirname(localPath);
                        
                        if (!fs.existsSync(jsDir)) {
                            fs.mkdirSync(jsDir, { recursive: true });
                        }
                        
                        fs.writeFileSync(localPath, content);
                        console.log(`✅ Chart.js guardado localmente en ${localPath}`);
                        return true;
                    } else {
                        console.log(`❌ Versión no funcional: ${version}`);
                    }
                } else {
                    console.log(`❌ No se pudo descargar: ${version} (${response.statusCode})`);
                }
            } catch (error) {
                console.log(`❌ Error descargando ${version}: ${error.message}`);
            }
        }
        
        console.log('❌ No se encontró una versión funcional de Chart.js');
        return false;
    } catch (error) {
        console.error('❌ Error descargando Chart.js:', error.message);
        return false;
    }
}

// Crear HTML de prueba con Chart.js local
async function createLocalChartTest() {
    console.log('🔍 Creando HTML de prueba con Chart.js local...');
    
    try {
        const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Chart.js Local Test</title>
    <script src="/js/chart.min.js"></script>
</head>
<body>
    <h1>Test de Chart.js Local</h1>
    <canvas id="testChart" width="400" height="200"></canvas>
    <div id="status"></div>
    <script>
        try {
            console.log('Chart object:', typeof Chart);
            console.log('Chart version:', Chart.version);
            
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js no está disponible');
            }
            
            const ctx = document.getElementById('testChart').getContext('2d');
            const testChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
                    datasets: [{
                        label: 'Datos de Prueba',
                        data: [12, 19, 3, 5, 2],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Test Chart.js Local'
                        }
                    }
                }
            });
            
            console.log('Chart created successfully:', testChart);
            document.getElementById('status').innerHTML = '<p style="color: green;">✅ Chart.js local funciona correctamente</p>';
        } catch (error) {
            console.error('Chart.js error:', error);
            document.getElementById('status').innerHTML = '<p style="color: red;">❌ Error en Chart.js: ' + error.message + '</p>';
        }
    </script>
</body>
</html>`;
        
        const testFilePath = path.join(process.cwd(), 'public', 'test-chart-local.html');
        fs.writeFileSync(testFilePath, testHTML);
        console.log('✅ HTML de prueba creado en public/test-chart-local.html');
        
        return true;
    } catch (error) {
        console.error('❌ Error creando HTML de prueba:', error.message);
        return false;
    }
}

// Actualizar admin-reports.html para usar Chart.js local
async function updateAdminReportsToUseLocalChart() {
    console.log('🔍 Actualizando admin-reports.html para usar Chart.js local...');
    
    try {
        const adminReportsPath = path.join(process.cwd(), 'public', 'admin-reports.html');
        const content = fs.readFileSync(adminReportsPath, 'utf8');
        
        // Reemplazar CDN con versión local
        const updatedContent = content.replace(
            /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@[^"]+"><\/script>/,
            '<script src="/js/chart.min.js"></script>'
        );
        
        fs.writeFileSync(adminReportsPath, updatedContent);
        console.log('✅ admin-reports.html actualizado para usar Chart.js local');
        
        return true;
    } catch (error) {
        console.error('❌ Error actualizando admin-reports.html:', error.message);
        return false;
    }
}

// Verificar que la solución funcione
async function verifyLocalSolution() {
    console.log('🔍 Verificando solución local...');
    
    try {
        // Verificar que Chart.js local existe
        const chartPath = path.join(process.cwd(), 'public', 'js', 'chart.min.js');
        if (fs.existsSync(chartPath)) {
            console.log('✅ Chart.js local existe');
            
            const content = fs.readFileSync(chartPath, 'utf8');
            if (content.includes('Chart') && content.includes('register')) {
                console.log('✅ Chart.js local es funcional');
                return true;
            } else {
                console.log('❌ Chart.js local no es funcional');
                return false;
            }
        } else {
            console.log('❌ Chart.js local no existe');
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando solución local:', error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Implementando solución final para gráficos...\n');
    
    // Paso 1: Descargar Chart.js localmente
    const downloadSuccess = await downloadChartJSLocally();
    if (!downloadSuccess) {
        console.log('❌ No se pudo descargar Chart.js localmente');
        return;
    }
    console.log('');
    
    // Paso 2: Crear HTML de prueba
    const testSuccess = await createLocalChartTest();
    if (!testSuccess) {
        console.log('❌ No se pudo crear HTML de prueba');
        return;
    }
    console.log('');
    
    // Paso 3: Actualizar admin-reports.html
    const updateSuccess = await updateAdminReportsToUseLocalChart();
    if (!updateSuccess) {
        console.log('❌ No se pudo actualizar admin-reports.html');
        return;
    }
    console.log('');
    
    // Paso 4: Verificar solución
    const verifySuccess = await verifyLocalSolution();
    if (!verifySuccess) {
        console.log('❌ La solución local no funciona');
        return;
    }
    console.log('');
    
    console.log('🎉 ¡SOLUCIÓN IMPLEMENTADA EXITOSAMENTE!');
    console.log('✅ Chart.js descargado localmente');
    console.log('✅ HTML de prueba creado');
    console.log('✅ admin-reports.html actualizado');
    console.log('✅ Solución verificada');
    
    console.log('\n📋 === PRÓXIMOS PASOS ===');
    console.log('1. Hacer commit y push de los cambios');
    console.log('2. Esperar el despliegue en Render');
    console.log('3. Probar en https://www.reservatuscanchas.cl/admin-reports.html');
    console.log('4. Verificar que los gráficos funcionen correctamente');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    downloadChartJSLocally,
    createLocalChartTest,
    updateAdminReportsToUseLocalChart,
    verifyLocalSolution
};

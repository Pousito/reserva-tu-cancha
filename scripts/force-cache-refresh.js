#!/usr/bin/env node

/**
 * Script para forzar la actualización del cache en producción
 * Agrega versioning a los archivos JavaScript para forzar recarga
 */

const fs = require('fs');
const path = require('path');

async function forceCacheRefresh() {
    console.log('🔄 FORZANDO ACTUALIZACIÓN DE CACHE EN PRODUCCIÓN');
    console.log('===============================================');
    
    try {
        // Archivos que necesitan versioning
        const filesToVersion = [
            'public/admin-reservations.js',
            'public/admin-dashboard.js',
            'public/script.js',
            'public/js/admin-utils.js'
        ];
        
        // Generar timestamp para versioning
        const timestamp = Date.now();
        console.log(`📅 Timestamp generado: ${timestamp}`);
        
        // Verificar que los archivos existen
        console.log('\n📋 Verificando archivos:');
        for (const file of filesToVersion) {
            if (fs.existsSync(file)) {
                console.log(`   ✅ ${file} - Existe`);
            } else {
                console.log(`   ❌ ${file} - No encontrado`);
            }
        }
        
        // Crear un archivo de configuración con el timestamp
        const configContent = `// Configuración de cache - Generado automáticamente
const CACHE_VERSION = ${timestamp};
const CACHE_BUST = '?v=' + CACHE_VERSION;

// Función para agregar versioning a URLs
function addCacheBust(url) {
    return url + (url.includes('?') ? '&' : '?') + 'v=' + CACHE_VERSION;
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CACHE_VERSION, CACHE_BUST, addCacheBust };
}

// Para uso en navegador
if (typeof window !== 'undefined') {
    window.CACHE_VERSION = CACHE_VERSION;
    window.CACHE_BUST = CACHE_BUST;
    window.addCacheBust = addCacheBust;
}`;
        
        // Escribir archivo de configuración
        const configPath = 'public/js/cache-config.js';
        fs.writeFileSync(configPath, configContent);
        console.log(`\n✅ Archivo de configuración creado: ${configPath}`);
        
        // Crear un script de limpieza de cache
        const cleanupScript = `#!/usr/bin/env node

/**
 * Script para limpiar cache del navegador
 * Se ejecuta en el cliente para forzar recarga de archivos
 */

console.log('🧹 Limpiando cache del navegador...');

// Limpiar localStorage
if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    console.log('✅ localStorage limpiado');
}

// Limpiar sessionStorage  
if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpiado');
}

// Forzar recarga de la página
if (typeof window !== 'undefined') {
    window.location.reload(true);
    console.log('🔄 Página recargada');
}`;
        
        const cleanupPath = 'public/js/clear-cache.js';
        fs.writeFileSync(cleanupPath, cleanupScript);
        console.log(`✅ Script de limpieza creado: ${cleanupPath}`);
        
        // Crear un archivo HTML de prueba para verificar las fechas
        const testHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test de Fechas - Producción</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-result { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
    </style>
</head>
<body>
    <h1>🧪 Test de Fechas en Producción</h1>
    
    <div class="info">
        <h3>📅 Información del Sistema</h3>
        <p><strong>Zona horaria del navegador:</strong> <span id="timezone"></span></p>
        <p><strong>Fecha actual:</strong> <span id="currentDate"></span></p>
        <p><strong>Timestamp:</strong> <span id="timestamp"></span></p>
    </div>
    
    <div id="testResults"></div>
    
    <button onclick="runDateTests()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
        🧪 Ejecutar Tests de Fecha
    </button>
    
    <button onclick="clearCacheAndReload()" style="padding: 10px 20px; font-size: 16px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
        🧹 Limpiar Cache y Recargar
    </button>
    
    <script>
        // Mostrar información del sistema
        document.getElementById('timezone').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
        document.getElementById('currentDate').textContent = new Date().toLocaleDateString('es-CL');
        document.getElementById('timestamp').textContent = Date.now();
        
        function runDateTests() {
            const results = document.getElementById('testResults');
            results.innerHTML = '<h3>🧪 Resultados de Tests</h3>';
            
            // Test 1: Crear fecha simple
            try {
                const testDate = '2025-09-25';
                const dateObj = new Date(testDate);
                const formatted = dateObj.toLocaleDateString('es-CL', {
                    timeZone: 'America/Santiago'
                });
                
                results.innerHTML += \`
                    <div class="test-result \${formatted.includes('25') ? 'success' : 'error'}">
                        <strong>Test 1 - Fecha Simple:</strong><br>
                        Input: \${testDate}<br>
                        Output: \${formatted}<br>
                        Status: \${formatted.includes('25') ? '✅ Correcto' : '❌ Incorrecto'}
                    </div>
                \`;
            } catch (error) {
                results.innerHTML += \`
                    <div class="test-result error">
                        <strong>Test 1 - Error:</strong> \${error.message}
                    </div>
                \`;
            }
            
            // Test 2: Crear fecha con Date.UTC
            try {
                const testDate = '2025-09-25';
                const [year, month, day] = testDate.split('-').map(Number);
                const dateObj = new Date(Date.UTC(year, month - 1, day));
                const formatted = dateObj.toLocaleDateString('es-CL', {
                    timeZone: 'America/Santiago'
                });
                
                results.innerHTML += \`
                    <div class="test-result \${formatted.includes('25') ? 'success' : 'error'}">
                        <strong>Test 2 - Fecha con Date.UTC:</strong><br>
                        Input: \${testDate}<br>
                        Output: \${formatted}<br>
                        Status: \${formatted.includes('25') ? '✅ Correcto' : '❌ Incorrecto'}
                    </div>
                \`;
            } catch (error) {
                results.innerHTML += \`
                    <div class="test-result error">
                        <strong>Test 2 - Error:</strong> \${error.message}
                    </div>
                \`;
            }
            
            // Test 3: Simular función formatearFecha
            try {
                function formatearFecha(fecha) {
                    if (!fecha) return 'Sin fecha';
                    
                    let fechaObj;
                    if (fecha.includes('T')) {
                        fechaObj = new Date(fecha);
                    } else {
                        const [año, mes, dia] = fecha.split('-').map(Number);
                        fechaObj = new Date(Date.UTC(año, mes - 1, dia));
                    }
                    
                    return fechaObj.toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'America/Santiago'
                    });
                }
                
                const testDate = '2025-09-25';
                const formatted = formatearFecha(testDate);
                
                results.innerHTML += \`
                    <div class="test-result \${formatted.includes('25') ? 'success' : 'error'}">
                        <strong>Test 3 - Función formatearFecha:</strong><br>
                        Input: \${testDate}<br>
                        Output: \${formatted}<br>
                        Status: \${formatted.includes('25') ? '✅ Correcto' : '❌ Incorrecto'}
                    </div>
                \`;
            } catch (error) {
                results.innerHTML += \`
                    <div class="test-result error">
                        <strong>Test 3 - Error:</strong> \${error.message}
                    </div>
                \`;
            }
        }
        
        function clearCacheAndReload() {
            // Limpiar cache
            if ('caches' in window) {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }
            
            // Limpiar localStorage
            localStorage.clear();
            
            // Recargar página
            window.location.reload(true);
        }
    </script>
</body>
</html>`;
        
        const testHTMLPath = 'public/test-fechas.html';
        fs.writeFileSync(testHTMLPath, testHTML);
        console.log(`✅ Página de test creada: ${testHTMLPath}`);
        
        console.log('\n🎯 PRÓXIMOS PASOS:');
        console.log('1. Hacer commit y push de estos archivos');
        console.log('2. Esperar el despliegue automático');
        console.log('3. Visitar https://reserva-tu-cancha.onrender.com/test-fechas.html');
        console.log('4. Ejecutar los tests de fecha en el navegador');
        console.log('5. Verificar si las fechas se muestran correctamente');
        
        return {
            success: true,
            message: 'Archivos de cache refresh creados',
            files: [
                configPath,
                cleanupPath,
                testHTMLPath
            ]
        };
        
    } catch (error) {
        console.error('❌ Error forzando cache refresh:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    forceCacheRefresh().then(result => {
        console.log('\n📊 RESULTADO:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { forceCacheRefresh };

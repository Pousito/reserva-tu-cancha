#!/usr/bin/env node

/**
 * Script para verificar los archivos JavaScript del frontend en producción
 * Verifica que las correcciones de zona horaria estén aplicadas
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://reserva-tu-cancha.onrender.com';

async function checkFrontendFiles() {
    console.log('🔍 VERIFICANDO ARCHIVOS JAVASCRIPT DEL FRONTEND EN PRODUCCIÓN');
    console.log('===========================================================');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    
    try {
        // Archivos a verificar
        const filesToCheck = [
            {
                name: 'admin-reservations.js',
                url: `${PRODUCTION_URL}/admin-reservations.js`,
                keywords: ['timeZone', 'America/Santiago', 'Date.UTC']
            },
            {
                name: 'admin-dashboard.js', 
                url: `${PRODUCTION_URL}/admin-dashboard.js`,
                keywords: ['timeZone', 'America/Santiago', 'Date.UTC']
            },
            {
                name: 'script.js',
                url: `${PRODUCTION_URL}/script.js`,
                keywords: ['toLocaleDateString', 'timeZone']
            }
        ];
        
        for (const file of filesToCheck) {
            console.log(`\n📄 Verificando ${file.name}:`);
            
            try {
                const response = await fetch(file.url, { timeout: 10000 });
                
                if (!response.ok) {
                    console.log(`   ❌ No disponible (${response.status})`);
                    continue;
                }
                
                const content = await response.text();
                console.log(`   ✅ Archivo disponible`);
                
                // Verificar keywords
                const foundKeywords = [];
                const missingKeywords = [];
                
                for (const keyword of file.keywords) {
                    if (content.includes(keyword)) {
                        foundKeywords.push(keyword);
                    } else {
                        missingKeywords.push(keyword);
                    }
                }
                
                if (foundKeywords.length > 0) {
                    console.log(`   ✅ Keywords encontradas: ${foundKeywords.join(', ')}`);
                }
                
                if (missingKeywords.length > 0) {
                    console.log(`   ❌ Keywords faltantes: ${missingKeywords.join(', ')}`);
                }
                
                // Verificar funciones específicas
                if (file.name === 'admin-reservations.js') {
                    const hasFormatearFecha = content.includes('function formatearFecha');
                    const hasTimeZoneFix = content.includes('timeZone: \'America/Santiago\'');
                    
                    console.log(`   📋 Función formatearFecha: ${hasFormatearFecha ? '✅' : '❌'}`);
                    console.log(`   📋 Fix de zona horaria: ${hasTimeZoneFix ? '✅' : '❌'}`);
                }
                
                if (file.name === 'admin-dashboard.js') {
                    const hasFormatearFechaCorta = content.includes('function formatearFechaCorta');
                    const hasTimeZoneFix = content.includes('timeZone: \'America/Santiago\'');
                    
                    console.log(`   📋 Función formatearFechaCorta: ${hasFormatearFechaCorta ? '✅' : '❌'}`);
                    console.log(`   📋 Fix de zona horaria: ${hasTimeZoneFix ? '✅' : '❌'}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        
        // Verificar si hay problemas específicos
        console.log('\n📊 ANÁLISIS:');
        console.log('   Si las correcciones de zona horaria no están presentes en producción,');
        console.log('   eso explicaría por qué las fechas aparecen incorrectas en el frontend.');
        console.log('   El backend está funcionando correctamente.');
        
        return {
            success: true,
            message: 'Verificación de archivos completada'
        };
        
    } catch (error) {
        console.error('❌ Error verificando archivos:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    checkFrontendFiles().then(result => {
        console.log('\n📊 RESULTADO:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { checkFrontendFiles };

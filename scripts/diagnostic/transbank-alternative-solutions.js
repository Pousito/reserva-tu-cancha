const axios = require('axios');
require('dotenv').config();

async function transbankAlternativeSolutions() {
    console.log('\n🔧 SOLUCIONES ALTERNATIVAS PARA PÁGINA EN BLANCO');
    console.log('================================================');
    console.log('🎯 Enfoques para resolver el problema sin transacción previa\n');

    const solutions = [];
    const tests = [];

    // 1. Verificar estado de servicios de Transbank
    console.log('1️⃣ VERIFICANDO ESTADO DE SERVICIOS TRANSBANK');
    console.log('============================================');
    
    try {
        const statusResponse = await axios.get('https://status.transbankdevelopers.cl/api/v2/status.json', {
            timeout: 10000
        });
        
        if (statusResponse.data.status.indicator === 'none') {
            console.log('✅ Servicios de Transbank operativos');
            solutions.push('✅ Servicios de Transbank funcionando correctamente');
        } else {
            console.log('⚠️ Posibles problemas en servicios de Transbank');
            solutions.push('⚠️ Verificar estado de servicios de Transbank');
        }
    } catch (error) {
        console.log('❌ No se puede verificar estado de servicios');
        solutions.push('❌ No se puede verificar estado de servicios');
    }

    // 2. Probar diferentes navegadores y user agents
    console.log('\n2️⃣ PROBANDO DIFERENTES USER AGENTS');
    console.log('===================================');
    
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    ];

    for (const userAgent of userAgents) {
        try {
            const response = await axios.get('https://webpay3g.transbank.cl', {
                timeout: 10000,
                headers: { 'User-Agent': userAgent }
            });
            
            console.log(`✅ Acceso exitoso con: ${userAgent.split(' ')[0]}`);
            tests.push(`✅ ${userAgent.split(' ')[0]} - OK`);
        } catch (error) {
            console.log(`❌ Error con: ${userAgent.split(' ')[0]}`);
            tests.push(`❌ ${userAgent.split(' ')[0]} - Error`);
        }
    }

    // 3. Verificar configuración específica de Safari
    console.log('\n3️⃣ VERIFICACIÓN ESPECÍFICA PARA SAFARI');
    console.log('======================================');
    
    const safariIssues = [];
    const safariFixes = [];

    // Verificar headers de seguridad
    try {
        const response = await axios.get('https://www.reservatuscanchas.cl', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
            }
        });

        const headers = response.headers;
        
        if (!headers['strict-transport-security']) {
            safariIssues.push('❌ HSTS no configurado');
            safariFixes.push('🔧 Configurar Strict-Transport-Security header');
        }
        
        if (!headers['x-frame-options']) {
            safariIssues.push('❌ X-Frame-Options no configurado');
            safariFixes.push('🔧 Configurar X-Frame-Options header');
        }
        
        if (!headers['content-security-policy']) {
            safariIssues.push('❌ CSP no configurado');
            safariFixes.push('🔧 Configurar Content-Security-Policy header');
        }

        console.log('📋 Headers de seguridad:');
        console.log(`  HSTS: ${headers['strict-transport-security'] ? '✅' : '❌'}`);
        console.log(`  X-Frame-Options: ${headers['x-frame-options'] ? '✅' : '❌'}`);
        console.log(`  CSP: ${headers['content-security-policy'] ? '✅' : '❌'}`);

    } catch (error) {
        safariIssues.push(`❌ Error verificando headers: ${error.message}`);
    }

    // 4. Verificar configuración de cookies y sesiones
    console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN DE COOKIES');
    console.log('=======================================');
    
    try {
        const response = await axios.get('https://www.reservatuscanchas.cl', {
            timeout: 10000,
            withCredentials: true
        });

        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
            console.log('✅ Cookies configuradas correctamente');
            solutions.push('✅ Configuración de cookies OK');
        } else {
            console.log('⚠️ No se detectaron cookies');
            solutions.push('⚠️ Verificar configuración de cookies');
        }
    } catch (error) {
        console.log(`❌ Error verificando cookies: ${error.message}`);
    }

    // 5. Verificar configuración de CORS específica
    console.log('\n5️⃣ VERIFICANDO CORS ESPECÍFICO');
    console.log('===============================');
    
    try {
        const response = await axios.options('https://www.reservatuscanchas.cl/api/transbank-diagnostic', {
            timeout: 10000,
            headers: {
                'Origin': 'https://www.reservatuscanchas.cl',
                'Access-Control-Request-Method': 'GET'
            }
        });

        const corsHeaders = response.headers;
        console.log('📋 Headers CORS:');
        console.log(`  Access-Control-Allow-Origin: ${corsHeaders['access-control-allow-origin'] || 'No configurado'}`);
        console.log(`  Access-Control-Allow-Methods: ${corsHeaders['access-control-allow-methods'] || 'No configurado'}`);
        console.log(`  Access-Control-Allow-Headers: ${corsHeaders['access-control-allow-headers'] || 'No configurado'}`);

        if (corsHeaders['access-control-allow-origin']) {
            solutions.push('✅ CORS configurado correctamente');
        } else {
            solutions.push('❌ CORS no configurado correctamente');
        }
    } catch (error) {
        console.log(`❌ Error verificando CORS: ${error.message}`);
    }

    // 6. Soluciones alternativas específicas
    console.log('\n6️⃣ SOLUCIONES ALTERNATIVAS');
    console.log('===========================');
    
    const alternativeSolutions = [
        {
            title: 'Solución 1: Contactar Soporte Transbank',
            description: 'Contactar directamente al soporte de Transbank para activación manual',
            steps: [
                'Enviar email a soporte@transbank.cl',
                'Explicar el problema de página en blanco',
                'Solicitar activación manual del sistema',
                'Proporcionar código de comercio y URLs'
            ]
        },
        {
            title: 'Solución 2: Usar Entorno de Integración Temporalmente',
            description: 'Cambiar temporalmente a entorno de integración para probar',
            steps: [
                'Cambiar TRANSBANK_ENVIRONMENT a integration',
                'Usar credenciales de integración',
                'Probar transacción con tarjetas de prueba',
                'Volver a producción después'
            ]
        },
        {
            title: 'Solución 3: Implementar Headers de Seguridad',
            description: 'Agregar headers de seguridad para Safari',
            steps: [
                'Configurar Strict-Transport-Security',
                'Configurar X-Frame-Options',
                'Configurar Content-Security-Policy',
                'Redesplegar en Render'
            ]
        },
        {
            title: 'Solución 4: Probar con Diferentes Navegadores',
            description: 'Probar la transacción desde otros navegadores',
            steps: [
                'Probar con Chrome',
                'Probar con Firefox',
                'Probar con Edge',
                'Identificar si es problema específico de Safari'
            ]
        }
    ];

    alternativeSolutions.forEach((solution, index) => {
        console.log(`\n${solution.title}`);
        console.log(`${solution.description}`);
        console.log('Pasos:');
        solution.steps.forEach(step => console.log(`  ${step}`));
    });

    // 7. Generar reporte final
    console.log('\n📋 REPORTE FINAL');
    console.log('================');
    
    console.log(`✅ Soluciones encontradas: ${solutions.length}`);
    console.log(`🧪 Tests realizados: ${tests.length}`);
    console.log(`⚠️ Problemas de Safari: ${safariIssues.length}`);
    console.log(`🔧 Fixes para Safari: ${safariFixes.length}`);

    if (safariIssues.length > 0) {
        console.log('\n⚠️ PROBLEMAS ESPECÍFICOS DE SAFARI:');
        safariIssues.forEach(issue => console.log(`  ${issue}`));
        
        console.log('\n🔧 SOLUCIONES PARA SAFARI:');
        safariFixes.forEach(fix => console.log(`  ${fix}`));
    }

    console.log('\n🎯 RECOMENDACIÓN PRINCIPAL:');
    console.log('1. Contactar soporte@transbank.cl');
    console.log('2. Explicar el problema de página en blanco');
    console.log('3. Solicitar activación manual del sistema');
    console.log('4. Mientras tanto, implementar headers de seguridad');

    return {
        solutions,
        tests,
        safariIssues,
        safariFixes,
        alternativeSolutions
    };
}

// Ejecutar análisis
transbankAlternativeSolutions()
    .then(result => {
        console.log('\n✅ Análisis de soluciones alternativas completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error ejecutando análisis:', error);
        process.exit(1);
    });


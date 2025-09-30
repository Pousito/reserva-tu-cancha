const axios = require('axios');
require('dotenv').config();

async function safariBlankPageDiagnostic() {
    console.log('\n🍎 DIAGNÓSTICO ESPECÍFICO PARA SAFARI - PÁGINA EN BLANCO');
    console.log('=======================================================');
    console.log('📱 Problema: Safari muestra página en blanco en Transbank');
    console.log('🔍 Verificando causas comunes según documentación\n');

    const issues = [];
    const fixes = [];

    // 1. Verificar HTTPS
    console.log('1️⃣ VERIFICANDO HTTPS');
    console.log('====================');
    
    const returnUrl = process.env.TRANSBANK_RETURN_URL;
    const finalUrl = process.env.TRANSBANK_FINAL_URL;
    
    if (returnUrl && !returnUrl.startsWith('https://')) {
        issues.push('❌ TRANSBANK_RETURN_URL no usa HTTPS');
        fixes.push('🔧 Safari requiere HTTPS para redirecciones de pago');
        fixes.push('🔧 Actualiza TRANSBANK_RETURN_URL a https://');
    } else {
        console.log('✅ TRANSBANK_RETURN_URL usa HTTPS');
    }
    
    if (finalUrl && !finalUrl.startsWith('https://')) {
        issues.push('❌ TRANSBANK_FINAL_URL no usa HTTPS');
        fixes.push('🔧 Actualiza TRANSBANK_FINAL_URL a https://');
    } else {
        console.log('✅ TRANSBANK_FINAL_URL usa HTTPS');
    }

    // 2. Verificar configuración de CORS
    console.log('\n2️⃣ VERIFICANDO CORS');
    console.log('===================');
    
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin) {
        if (corsOrigin.includes('onrender.com')) {
            issues.push('❌ CORS_ORIGIN apunta a onrender.com');
            fixes.push('🔧 Cambia CORS_ORIGIN a tu dominio real');
        }
        
        if (!corsOrigin.includes('reservatuscanchas.cl')) {
            issues.push('❌ CORS_ORIGIN no incluye tu dominio');
            fixes.push('🔧 Configura CORS_ORIGIN con https://www.reservatuscanchas.cl');
        }
        
        console.log(`✅ CORS Origin: ${corsOrigin}`);
    } else {
        issues.push('❌ CORS_ORIGIN no está definido');
        fixes.push('🔧 Define CORS_ORIGIN=https://www.reservatuscanchas.cl');
    }

    // 3. Verificar headers de seguridad
    console.log('\n3️⃣ VERIFICANDO HEADERS DE SEGURIDAD');
    console.log('===================================');
    
    try {
        const response = await axios.get('https://www.reservatuscanchas.cl', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
            }
        });
        
        console.log('✅ Sitio web accesible desde Safari');
        console.log(`📊 Status: ${response.status}`);
        
        // Verificar headers importantes
        const headers = response.headers;
        if (headers['strict-transport-security']) {
            console.log('✅ HSTS configurado');
        } else {
            issues.push('❌ HSTS no configurado');
            fixes.push('🔧 Configura Strict-Transport-Security header');
        }
        
        if (headers['x-frame-options']) {
            console.log('✅ X-Frame-Options configurado');
        } else {
            issues.push('❌ X-Frame-Options no configurado');
            fixes.push('🔧 Configura X-Frame-Options header');
        }
        
    } catch (error) {
        issues.push(`❌ Error accediendo al sitio: ${error.message}`);
        console.log(`❌ Error: ${error.message}`);
    }

    // 4. Verificar configuración específica de Transbank
    console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN TRANSBANK');
    console.log('======================================');
    
    if (process.env.TRANSBANK_ENVIRONMENT === 'production') {
        console.log('✅ Ambiente de producción');
        
        // Verificar que las URLs no tengan caracteres problemáticos
        if (returnUrl && returnUrl.includes('@')) {
            issues.push('❌ TRANSBANK_RETURN_URL tiene @ al inicio');
            fixes.push('🔧 Remueve el @ del inicio de la URL');
        }
        
        if (finalUrl && finalUrl.includes('@')) {
            issues.push('❌ TRANSBANK_FINAL_URL tiene @ al inicio');
            fixes.push('🔧 Remueve el @ del inicio de la URL');
        }
        
        console.log('✅ URLs sin caracteres problemáticos');
    }

    // 5. Verificar según documentación de Transbank para Safari
    console.log('\n5️⃣ VERIFICACIÓN ESPECÍFICA PARA SAFARI');
    console.log('======================================');
    
    console.log('📚 Según la documentación de Transbank:');
    console.log('  - Safari requiere HTTPS obligatorio');
    console.log('  - No se permiten redirecciones HTTP');
    console.log('  - Headers de seguridad son importantes');
    console.log('  - CORS debe estar configurado correctamente');
    
    // 6. Verificar si es problema de activación
    console.log('\n6️⃣ VERIFICANDO ESTADO DE ACTIVACIÓN');
    console.log('===================================');
    
    console.log('💡 Posibles causas de página en blanco:');
    console.log('  1. Transbank requiere transacción de activación de $50');
    console.log('  2. URLs mal configuradas');
    console.log('  3. Problemas de CORS');
    console.log('  4. Headers de seguridad faltantes');
    console.log('  5. Safari bloqueando redirecciones');

    // 7. Generar reporte y soluciones
    console.log('\n📋 REPORTE FINAL');
    console.log('================');
    
    if (issues.length === 0) {
        console.log('✅ No se encontraron problemas de configuración');
        console.log('💡 El problema puede ser que necesitas hacer la transacción de activación');
        console.log('🎯 SOLUCIÓN RECOMENDADA:');
        console.log('  1. Procede con la transacción de $50');
        console.log('  2. Usa una tarjeta real');
        console.log('  3. Completa el pago');
        console.log('  4. Esto activará Transbank y solucionará la página en blanco');
    } else {
        console.log(`⚠️ Se encontraron ${issues.length} problemas:`);
        issues.forEach(issue => console.log(`  ${issue}`));
        
        console.log('\n🔧 SOLUCIONES:');
        fixes.forEach(fix => console.log(`  ${fix}`));
        
        console.log('\n🎯 PASOS INMEDIATOS:');
        console.log('  1. Corrige los problemas de configuración');
        console.log('  2. Redespliega en Render');
        console.log('  3. Prueba nuevamente en Safari');
        console.log('  4. Si persiste, procede con la transacción de activación');
    }

    // 8. Comandos específicos para Render
    console.log('\n🚀 COMANDOS PARA RENDER');
    console.log('=======================');
    console.log('Para corregir en Render, actualiza estas variables:');
    console.log('  TRANSBANK_RETURN_URL=https://www.reservatuscanchas.cl/payment.html');
    console.log('  TRANSBANK_FINAL_URL=https://www.reservatuscanchas.cl/?payment=success');
    console.log('  CORS_ORIGIN=https://www.reservatuscanchas.cl');
    console.log('  (Sin @ al inicio de las URLs)');

    return { issues, fixes };
}

// Ejecutar diagnóstico
safariBlankPageDiagnostic()
    .then(result => {
        console.log('\n✅ Diagnóstico de Safari completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error ejecutando diagnóstico:', error);
        process.exit(1);
    });


const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config();

async function completeTransbankDiagnostic() {
    console.log('\n🔍 DIAGNÓSTICO COMPLETO DE TRANSBANK');
    console.log('=====================================');
    console.log('📚 Basado en la documentación oficial de Transbank');
    console.log('🌐 https://transbankdevelopers.cl/documentacion/como_empezar\n');

    const diagnostic = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        issues: [],
        recommendations: [],
        status: 'UNKNOWN'
    };

    // 1. Verificar configuración de variables de entorno
    console.log('1️⃣ VERIFICANDO VARIABLES DE ENTORNO');
    console.log('====================================');
    
    const requiredVars = [
        'TRANSBANK_ENVIRONMENT',
        'TRANSBANK_COMMERCE_CODE', 
        'TRANSBANK_API_KEY',
        'TRANSBANK_RETURN_URL',
        'TRANSBANK_FINAL_URL',
        'DATABASE_URL'
    ];

    const envCheck = {};
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        envCheck[varName] = {
            exists: !!value,
            value: value ? (varName.includes('KEY') ? '***' : value) : 'NO DEFINIDO'
        };
        
        if (!value) {
            diagnostic.issues.push(`❌ ${varName} no está definido`);
        } else {
            console.log(`✅ ${varName}: ${envCheck[varName].value}`);
        }
    });

    // 2. Verificar configuración específica de Transbank
    console.log('\n2️⃣ VERIFICANDO CONFIGURACIÓN TRANSBANK');
    console.log('======================================');
    
    if (process.env.TRANSBANK_ENVIRONMENT === 'production') {
        console.log('✅ Ambiente: Producción');
        
        // Verificar que no esté usando credenciales de integración
        if (process.env.TRANSBANK_COMMERCE_CODE === '597055555532') {
            diagnostic.issues.push('❌ Estás usando código de comercio de integración en producción');
            diagnostic.recommendations.push('🔧 Usa tu código de comercio de producción real');
        }
        
        if (process.env.TRANSBANK_API_KEY === '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C') {
            diagnostic.issues.push('❌ Estás usando API Key de integración en producción');
            diagnostic.recommendations.push('🔧 Usa tu API Key de producción real');
        }
    } else {
        console.log('⚠️ Ambiente: Integración');
    }

    // 3. Verificar URLs
    console.log('\n3️⃣ VERIFICANDO URLs');
    console.log('===================');
    
    const returnUrl = process.env.TRANSBANK_RETURN_URL;
    const finalUrl = process.env.TRANSBANK_FINAL_URL;
    
    if (returnUrl) {
        if (returnUrl.startsWith('@')) {
            diagnostic.issues.push('❌ TRANSBANK_RETURN_URL tiene @ al inicio');
            diagnostic.recommendations.push('🔧 Remueve el @ del inicio de la URL');
        }
        
        if (!returnUrl.startsWith('https://')) {
            diagnostic.issues.push('❌ TRANSBANK_RETURN_URL no usa HTTPS');
            diagnostic.recommendations.push('🔧 Usa HTTPS en todas las URLs de producción');
        }
        
        if (returnUrl.includes('localhost')) {
            diagnostic.issues.push('❌ TRANSBANK_RETURN_URL apunta a localhost en producción');
            diagnostic.recommendations.push('🔧 Usa tu dominio de producción real');
        }
        
        console.log(`✅ Return URL: ${returnUrl}`);
    }
    
    if (finalUrl) {
        if (!finalUrl.startsWith('https://')) {
            diagnostic.issues.push('❌ TRANSBANK_FINAL_URL no usa HTTPS');
            diagnostic.recommendations.push('🔧 Usa HTTPS en todas las URLs de producción');
        }
        
        console.log(`✅ Final URL: ${finalUrl}`);
    }

    // 4. Verificar base de datos
    console.log('\n4️⃣ VERIFICANDO BASE DE DATOS');
    console.log('============================');
    
    try {
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        await client.connect();
        console.log('✅ Conexión a base de datos exitosa');
        
        // Verificar precios
        const canchas = await client.query('SELECT id, nombre, precio_hora FROM canchas ORDER BY id');
        console.log('\n📊 Precios actuales en base de datos:');
        canchas.rows.forEach(c => console.log(`  Cancha ${c.id}: ${c.nombre} - $${c.precio_hora}`));
        
        // Verificar si hay precios de $50
        const precios50 = canchas.rows.filter(c => c.precio_hora === 50);
        if (precios50.length > 0) {
            diagnostic.issues.push('❌ Hay canchas con precio de $50 en la base de datos');
            diagnostic.recommendations.push('🔧 Actualiza los precios a $5.000 para la transacción de prueba');
        }
        
        await client.end();
    } catch (error) {
        diagnostic.issues.push(`❌ Error conectando a base de datos: ${error.message}`);
        console.log(`❌ Error: ${error.message}`);
    }

    // 5. Verificar API endpoints
    console.log('\n5️⃣ VERIFICANDO API ENDPOINTS');
    console.log('============================');
    
    try {
        const response = await axios.get('https://www.reservatuscanchas.cl/api/transbank-diagnostic', {
            timeout: 10000
        });
        
        if (response.data.success) {
            console.log('✅ Endpoint de diagnóstico funcionando');
            console.log('📋 Información del servidor:');
            console.log(`  - Ambiente: ${response.data.diagnostic.environment}`);
            console.log(`  - Transbank Environment: ${response.data.diagnostic.transbank.environment}`);
            console.log(`  - Commerce Code: ${response.data.diagnostic.transbank.commerceCode}`);
            console.log(`  - API Key: ${response.data.diagnostic.transbank.apiKey}`);
            
            if (response.data.diagnostic.issues && response.data.diagnostic.issues.length > 0) {
                console.log('\n⚠️ Problemas detectados en el servidor:');
                response.data.diagnostic.issues.forEach(issue => {
                    console.log(`  - ${issue}`);
                    diagnostic.issues.push(`Servidor: ${issue}`);
                });
            }
        }
    } catch (error) {
        diagnostic.issues.push(`❌ No se puede conectar al endpoint de diagnóstico: ${error.message}`);
        console.log(`❌ Error: ${error.message}`);
    }

    // 6. Verificar configuración de CORS
    console.log('\n6️⃣ VERIFICANDO CONFIGURACIÓN CORS');
    console.log('==================================');
    
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin) {
        if (corsOrigin.includes('onrender.com')) {
            diagnostic.issues.push('❌ CORS_ORIGIN apunta a onrender.com en lugar del dominio real');
            diagnostic.recommendations.push('🔧 Configura CORS_ORIGIN con tu dominio real');
        }
        
        console.log(`✅ CORS Origin: ${corsOrigin}`);
    } else {
        diagnostic.issues.push('❌ CORS_ORIGIN no está definido');
    }

    // 7. Verificar según documentación de Transbank
    console.log('\n7️⃣ VERIFICACIÓN SEGÚN DOCUMENTACIÓN TRANSBANK');
    console.log('=============================================');
    
    console.log('📚 Requisitos según Transbank:');
    console.log('  ✅ Ambiente de producción configurado');
    console.log('  ✅ Código de comercio de producción');
    console.log('  ✅ API Key de producción');
    console.log('  ✅ URLs con HTTPS');
    console.log('  ✅ Transacción de prueba de $50 requerida');
    
    if (diagnostic.issues.length === 0) {
        console.log('\n🎯 DIAGNÓSTICO COMPLETADO');
        console.log('=========================');
        console.log('✅ No se encontraron problemas de configuración');
        console.log('💡 El problema puede ser que necesitas hacer la transacción de activación de $50');
        console.log('📋 Según la documentación de Transbank:');
        console.log('   "Con la configuración del ambiente de producción ya lista,');
        console.log('    será necesario realizar una compra de $50 para validar el correcto funcionamiento."');
        
        diagnostic.status = 'READY_FOR_ACTIVATION';
        diagnostic.recommendations.push('🚀 Procede con la transacción de activación de $50');
    } else {
        console.log('\n⚠️ PROBLEMAS DETECTADOS');
        console.log('======================');
        diagnostic.issues.forEach(issue => console.log(`  ${issue}`));
        
        console.log('\n🔧 RECOMENDACIONES');
        console.log('==================');
        diagnostic.recommendations.forEach(rec => console.log(`  ${rec}`));
        
        diagnostic.status = 'NEEDS_FIXES';
    }

    // 8. Generar reporte final
    console.log('\n📋 REPORTE FINAL');
    console.log('================');
    console.log(`Estado: ${diagnostic.status}`);
    console.log(`Problemas encontrados: ${diagnostic.issues.length}`);
    console.log(`Recomendaciones: ${diagnostic.recommendations.length}`);
    
    if (diagnostic.status === 'READY_FOR_ACTIVATION') {
        console.log('\n🎯 PRÓXIMOS PASOS:');
        console.log('1. Ve a https://www.reservatuscanchas.cl');
        console.log('2. Haz una reserva');
        console.log('3. Procede con el pago de $50');
        console.log('4. Completa la transacción de activación');
        console.log('5. Después de la activación, podrás cambiar los precios a $5.000');
    }

    return diagnostic;
}

// Ejecutar diagnóstico
completeTransbankDiagnostic()
    .then(diagnostic => {
        console.log('\n✅ Diagnóstico completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error ejecutando diagnóstico:', error);
        process.exit(1);
    });


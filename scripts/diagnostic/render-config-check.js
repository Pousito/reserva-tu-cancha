const axios = require('axios');
require('dotenv').config();

async function renderConfigCheck() {
    console.log('\n🚀 VERIFICACIÓN DE CONFIGURACIÓN DE RENDER');
    console.log('==========================================');
    console.log('🔍 Verificando configuración específica para Render.com\n');

    const issues = [];
    const recommendations = [];

    // 1. Verificar variables de entorno críticas
    console.log('1️⃣ VERIFICANDO VARIABLES DE ENTORNO CRÍTICAS');
    console.log('============================================');
    
    const criticalVars = {
        'TRANSBANK_ENVIRONMENT': process.env.TRANSBANK_ENVIRONMENT,
        'TRANSBANK_COMMERCE_CODE': process.env.TRANSBANK_COMMERCE_CODE,
        'TRANSBANK_API_KEY': process.env.TRANSBANK_API_KEY,
        'TRANSBANK_RETURN_URL': process.env.TRANSBANK_RETURN_URL,
        'TRANSBANK_FINAL_URL': process.env.TRANSBANK_FINAL_URL,
        'CORS_ORIGIN': process.env.CORS_ORIGIN,
        'DATABASE_URL': process.env.DATABASE_URL
    };

    Object.entries(criticalVars).forEach(([key, value]) => {
        if (!value) {
            issues.push(`❌ ${key} no está definido en Render`);
            recommendations.push(`🔧 Define ${key} en el dashboard de Render`);
        } else {
            // Verificar valores problemáticos específicos de Render
            if (key === 'TRANSBANK_RETURN_URL' && value.startsWith('@')) {
                issues.push(`❌ ${key} tiene @ al inicio (problema común en Render)`);
                recommendations.push(`🔧 Remueve el @ del inicio de ${key}`);
            }
            
            if (key === 'TRANSBANK_FINAL_URL' && value.startsWith('@')) {
                issues.push(`❌ ${key} tiene @ al inicio (problema común en Render)`);
                recommendations.push(`🔧 Remueve el @ del inicio de ${key}`);
            }
            
            if (key === 'CORS_ORIGIN' && value.includes('onrender.com')) {
                issues.push(`❌ ${key} apunta a onrender.com en lugar del dominio real`);
                recommendations.push(`🔧 Cambia ${key} a tu dominio real`);
            }
            
            console.log(`✅ ${key}: ${value.includes('KEY') ? '***' : value}`);
        }
    });

    // 2. Verificar configuración de dominio
    console.log('\n2️⃣ VERIFICANDO CONFIGURACIÓN DE DOMINIO');
    console.log('=======================================');
    
    const domain = 'www.reservatuscanchas.cl';
    
    try {
        const response = await axios.get(`https://${domain}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
            }
        });
        
        console.log(`✅ Dominio ${domain} accesible`);
        console.log(`📊 Status: ${response.status}`);
        
        // Verificar si está usando Render
        const serverHeader = response.headers['server'];
        if (serverHeader && serverHeader.includes('render')) {
            console.log('✅ Servidor Render detectado');
        }
        
    } catch (error) {
        issues.push(`❌ Error accediendo a ${domain}: ${error.message}`);
        console.log(`❌ Error: ${error.message}`);
    }

    // 3. Verificar endpoints de API
    console.log('\n3️⃣ VERIFICANDO ENDPOINTS DE API');
    console.log('===============================');
    
    const apiEndpoints = [
        'https://www.reservatuscanchas.cl/api/transbank-diagnostic',
        'https://www.reservatuscanchas.cl/api/canchas/1'
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            const response = await axios.get(endpoint, { timeout: 10000 });
            console.log(`✅ ${endpoint} - Status: ${response.status}`);
            
            if (endpoint.includes('transbank-diagnostic')) {
                const data = response.data;
                if (data.success) {
                    console.log('  📋 Diagnóstico del servidor:');
                    console.log(`    - Ambiente: ${data.diagnostic.environment}`);
                    console.log(`    - Transbank: ${data.diagnostic.transbank.environment}`);
                    
                    if (data.diagnostic.issues && data.diagnostic.issues.length > 0) {
                        console.log('  ⚠️ Problemas detectados en el servidor:');
                        data.diagnostic.issues.forEach(issue => {
                            console.log(`    - ${issue}`);
                            issues.push(`Servidor: ${issue}`);
                        });
                    }
                }
            }
            
        } catch (error) {
            issues.push(`❌ Error en ${endpoint}: ${error.message}`);
            console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
    }

    // 4. Verificar configuración específica de Render
    console.log('\n4️⃣ VERIFICACIÓN ESPECÍFICA DE RENDER');
    console.log('====================================');
    
    console.log('📚 Configuración recomendada para Render:');
    console.log('  ✅ Variables de entorno definidas');
    console.log('  ✅ URLs sin @ al inicio');
    console.log('  ✅ CORS configurado correctamente');
    console.log('  ✅ HTTPS habilitado');
    console.log('  ✅ Dominio personalizado configurado');

    // 5. Verificar problemas comunes de Render
    console.log('\n5️⃣ PROBLEMAS COMUNES DE RENDER');
    console.log('==============================');
    
    const commonIssues = [
        'Variables de entorno con @ al inicio',
        'CORS apuntando a onrender.com',
        'URLs HTTP en lugar de HTTPS',
        'Variables de entorno no definidas',
        'Configuración de dominio incorrecta'
    ];
    
    console.log('🔍 Problemas comunes encontrados:');
    commonIssues.forEach(issue => {
        const found = issues.some(i => i.includes(issue.split(' ')[0]));
        if (found) {
            console.log(`  ❌ ${issue}`);
        } else {
            console.log(`  ✅ ${issue} - OK`);
        }
    });

    // 6. Generar comandos de corrección
    console.log('\n6️⃣ COMANDOS DE CORRECCIÓN PARA RENDER');
    console.log('=====================================');
    
    console.log('🔧 Para corregir en el dashboard de Render:');
    console.log('');
    console.log('1. Ve a tu servicio en Render');
    console.log('2. Ve a la pestaña "Environment"');
    console.log('3. Actualiza estas variables:');
    console.log('');
    
    if (issues.some(i => i.includes('@ al inicio'))) {
        console.log('   TRANSBANK_RETURN_URL=https://www.reservatuscanchas.cl/payment.html');
        console.log('   TRANSBANK_FINAL_URL=https://www.reservatuscanchas.cl/?payment=success');
        console.log('   (Sin @ al inicio)');
    }
    
    if (issues.some(i => i.includes('onrender.com'))) {
        console.log('   CORS_ORIGIN=https://www.reservatuscanchas.cl');
    }
    
    console.log('');
    console.log('4. Guarda los cambios');
    console.log('5. Espera a que se redesplegue automáticamente');

    // 7. Verificar si necesita transacción de activación
    console.log('\n7️⃣ VERIFICACIÓN DE ACTIVACIÓN');
    console.log('=============================');
    
    if (issues.length === 0) {
        console.log('✅ Configuración de Render correcta');
        console.log('💡 El problema puede ser que necesitas la transacción de activación');
        console.log('🎯 SEGÚN DOCUMENTACIÓN DE TRANSBANK:');
        console.log('   "Con la configuración del ambiente de producción ya lista,');
        console.log('    será necesario realizar una compra de $50 para validar el correcto funcionamiento."');
        console.log('');
        console.log('🚀 PRÓXIMOS PASOS:');
        console.log('   1. Procede con la transacción de $50');
        console.log('   2. Usa una tarjeta real');
        console.log('   3. Completa el pago');
        console.log('   4. Esto activará Transbank y solucionará la página en blanco');
    } else {
        console.log(`⚠️ Se encontraron ${issues.length} problemas de configuración`);
        console.log('🔧 Corrige estos problemas antes de proceder con la transacción');
    }

    return { issues, recommendations };
}

// Ejecutar verificación
renderConfigCheck()
    .then(result => {
        console.log('\n✅ Verificación de Render completada');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error ejecutando verificación:', error);
        process.exit(1);
    });


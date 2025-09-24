#!/usr/bin/env node

/**
 * Script para verificar variables de entorno en Render
 */

require('dotenv').config();

console.log('🔍 Verificando variables de entorno para Render...\n');

const requiredVars = [
    'TRANSBANK_API_KEY',
    'TRANSBANK_COMMERCE_CODE', 
    'TRANSBANK_ENVIRONMENT',
    'TRANSBANK_RETURN_URL',
    'TRANSBANK_FINAL_URL'
];

console.log('📋 Variables de entorno requeridas para Render:\n');

let allConfigured = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        if (varName.includes('KEY')) {
            console.log(`✅ ${varName}: Configurado (${value.substring(0, 10)}...${value.substring(value.length - 10)})`);
        } else {
            console.log(`✅ ${varName}: ${value}`);
        }
    } else {
        console.log(`❌ ${varName}: NO CONFIGURADO`);
        allConfigured = false;
    }
});

if (!allConfigured) {
    console.log('\n❌ FALTAN VARIABLES DE ENTORNO');
    console.log('\n📋 Variables que debes agregar en el panel de Render:');
    console.log('   1. Ve a: https://dashboard.render.com');
    console.log('   2. Selecciona tu servicio: reserva-tu-cancha');
    console.log('   3. Ve a "Environment"');
    console.log('   4. Agrega estas variables:');
    
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            console.log(`\n   ${varName}=`);
            if (varName === 'TRANSBANK_RETURN_URL') {
                console.log('   https://www.reservatuscanchas.cl/payment.html');
            } else if (varName === 'TRANSBANK_FINAL_URL') {
                console.log('   https://www.reservatuscanchas.cl/?payment=success');
            } else if (varName === 'TRANSBANK_ENVIRONMENT') {
                console.log('   production');
            } else if (varName === 'TRANSBANK_COMMERCE_CODE') {
                console.log('   597053012211');
            } else if (varName === 'TRANSBANK_API_KEY') {
                console.log('   828a495c-ec0a-4d94-a7e1-0e220adf4538');
            }
        }
    });
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   - Después de agregar las variables, Render reiniciará automáticamente');
    console.log('   - Espera 2-3 minutos para que el servicio se reinicie');
    console.log('   - Luego prueba la reserva nuevamente');
    
} else {
    console.log('\n✅ TODAS LAS VARIABLES ESTÁN CONFIGURADAS');
    console.log('🚀 El problema puede ser que Render no tiene las variables actualizadas');
    console.log('💡 Verifica en el panel de Render que las variables estén configuradas');
}

console.log('\n📚 Documentación de Render:');
console.log('   - Panel: https://dashboard.render.com');
console.log('   - Docs: https://render.com/docs/environment-variables');

#!/usr/bin/env node

/**
 * Script para verificar que Transbank esté configurado correctamente para producción
 * Este script valida todas las configuraciones necesarias antes de la validación
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Verificando configuración de Transbank para PRODUCCIÓN...\n');

// Verificaciones
let allChecksPassed = true;

// 1. Verificar variables de entorno
console.log('📋 1. Verificando variables de entorno...');
const requiredEnvVars = [
    'TRANSBANK_API_KEY',
    'TRANSBANK_COMMERCE_CODE',
    'TRANSBANK_ENVIRONMENT',
    'TRANSBANK_RETURN_URL',
    'TRANSBANK_FINAL_URL'
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.log(`   ❌ ${envVar} no está configurado`);
        allChecksPassed = false;
    } else {
        console.log(`   ✅ ${envVar}: ${envVar.includes('KEY') ? 'Configurado' : process.env[envVar]}`);
    }
}

// 2. Verificar que esté en modo producción
console.log('\n📋 2. Verificando modo de entorno...');
if (process.env.TRANSBANK_ENVIRONMENT !== 'production') {
    console.log(`   ❌ TRANSBANK_ENVIRONMENT debe ser 'production', actualmente es: ${process.env.TRANSBANK_ENVIRONMENT}`);
    allChecksPassed = false;
} else {
    console.log('   ✅ TRANSBANK_ENVIRONMENT: production');
}

// 3. Verificar URLs
console.log('\n📋 3. Verificando URLs...');
const returnUrl = process.env.TRANSBANK_RETURN_URL;
const finalUrl = process.env.TRANSBANK_FINAL_URL;

if (!returnUrl || !returnUrl.includes('https://')) {
    console.log(`   ❌ TRANSBANK_RETURN_URL debe ser HTTPS: ${returnUrl}`);
    allChecksPassed = false;
} else {
    console.log(`   ✅ TRANSBANK_RETURN_URL: ${returnUrl}`);
}

if (!finalUrl || !finalUrl.includes('https://')) {
    console.log(`   ❌ TRANSBANK_FINAL_URL debe ser HTTPS: ${finalUrl}`);
    allChecksPassed = false;
} else {
    console.log(`   ✅ TRANSBANK_FINAL_URL: ${finalUrl}`);
}

// 4. Verificar que el código de comercio no sea el de prueba
console.log('\n📋 4. Verificando código de comercio...');
const commerceCode = process.env.TRANSBANK_COMMERCE_CODE;
if (commerceCode === '597055555532') {
    console.log('   ❌ Estás usando el código de comercio de PRUEBA');
    allChecksPassed = false;
} else {
    console.log(`   ✅ Código de comercio de producción: ${commerceCode}`);
}

// 5. Verificar API Key
console.log('\n📋 5. Verificando API Key...');
const apiKey = process.env.TRANSBANK_API_KEY;
if (apiKey === '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C') {
    console.log('   ❌ Estás usando la API Key de PRUEBA');
    allChecksPassed = false;
} else {
    console.log('   ✅ API Key de producción configurada');
}

// 6. Verificar archivos de configuración
console.log('\n📋 6. Verificando archivos de configuración...');
const configFiles = [
    'src/services/paymentService.js',
    'src/routes/payments.js',
    'package.json'
];

for (const file of configFiles) {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}: Existe`);
    } else {
        console.log(`   ❌ ${file}: No encontrado`);
        allChecksPassed = false;
    }
}

// 7. Verificar que el SDK de Transbank esté instalado
console.log('\n📋 7. Verificando dependencias...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (packageJson.dependencies && packageJson.dependencies['transbank-sdk']) {
        console.log(`   ✅ transbank-sdk: ${packageJson.dependencies['transbank-sdk']}`);
    } else {
        console.log('   ❌ transbank-sdk no está instalado');
        allChecksPassed = false;
    }
} catch (error) {
    console.log('   ❌ Error leyendo package.json');
    allChecksPassed = false;
}

// 8. Verificar base de datos PostgreSQL
console.log('\n📋 8. Verificando configuración de base de datos...');
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql://')) {
    console.log('   ✅ DATABASE_URL configurado para PostgreSQL');
} else {
    console.log('   ❌ DATABASE_URL no está configurado para PostgreSQL');
    allChecksPassed = false;
}

// Resultado final
console.log('\n' + '='.repeat(60));
if (allChecksPassed) {
    console.log('✅ TODAS LAS VERIFICACIONES PASARON');
    console.log('🚀 Tu proyecto está listo para la validación de Transbank');
    console.log('\n📋 Próximos pasos para la validación:');
    console.log('   1. Despliega los cambios: git add . && git commit -m "Transbank production ready" && git push origin main');
    console.log('   2. Espera a que Render actualice el despliegue');
    console.log('   3. Realiza una transacción de prueba REAL en https://www.reservatuscanchas.cl');
    console.log('   4. Documenta la transacción (código de autorización, monto, etc.)');
    console.log('   5. Envía la evidencia a Transbank para validación');
    console.log('   6. Una vez validado, podrás procesar pagos reales');
} else {
    console.log('❌ ALGUNAS VERIFICACIONES FALLARON');
    console.log('🔧 Corrige los errores antes de proceder con la validación');
    console.log('\n💡 Para configurar Transbank para producción:');
    console.log('   node scripts/setup-transbank-production.js <COMMERCE_CODE> <API_KEY>');
}

console.log('\n📚 Documentación útil:');
console.log('   - Portal Transbank: https://publico.transbank.cl/');
console.log('   - Soporte: soporte@transbank.cl');
console.log('   - Documentación: https://www.transbankdevelopers.cl/documentacion/webpay-plus');

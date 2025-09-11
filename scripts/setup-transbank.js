#!/usr/bin/env node

/**
 * Script para configurar Transbank en el ambiente de desarrollo
 * Este script ayuda a configurar las variables de entorno necesarias
 */

const fs = require('fs');
const path = require('path');

console.log('🏦 Configurando Transbank para desarrollo...\n');

// Verificar si existe el archivo .env
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
    console.log('📝 Creando archivo .env desde env.example...');
    
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Archivo .env creado exitosamente');
    } else {
        console.log('❌ No se encontró env.example');
        process.exit(1);
    }
}

// Leer el archivo .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Configurar variables de Transbank para desarrollo
const transbankConfig = `
# Transbank Webpay Plus - Configuración de Desarrollo
TRANSBANK_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
TRANSBANK_COMMERCE_CODE=597055555532
TRANSBANK_ENVIRONMENT=integration
TRANSBANK_RETURN_URL=http://localhost:3000/payment.html
TRANSBANK_FINAL_URL=http://localhost:3000/?payment=success
`;

// Verificar si ya existen las variables de Transbank
if (envContent.includes('TRANSBANK_API_KEY')) {
    console.log('⚠️  Las variables de Transbank ya están configuradas en .env');
    console.log('   Si necesitas actualizarlas, edita el archivo .env manualmente');
} else {
    console.log('🔧 Agregando configuración de Transbank al archivo .env...');
    
    // Agregar la configuración al final del archivo
    envContent += transbankConfig;
    
    // Escribir el archivo actualizado
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Configuración de Transbank agregada exitosamente');
}

console.log('\n📋 Configuración de Transbank para Desarrollo:');
console.log('   API Key: 579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C');
console.log('   Commerce Code: 597055555532');
console.log('   Environment: integration (desarrollo)');
console.log('   Return URL: http://localhost:3000/payment.html');
console.log('   Final URL: http://localhost:3000/?payment=success');

console.log('\n🔑 Tarjetas de Prueba de Transbank:');
console.log('   Visa: 4051885600446623');
console.log('   Mastercard: 5186059559590568');
console.log('   American Express: 375095000000000');
console.log('   CVV: 123');
console.log('   Fecha: Cualquier fecha futura');

console.log('\n📚 Documentación:');
console.log('   - Transbank SDK: https://github.com/TransbankDevelopers/transbank-sdk-nodejs');
console.log('   - Webpay Plus: https://www.transbankdevelopers.cl/documentacion/webpay-plus');
console.log('   - Ambiente de Pruebas: https://www.transbankdevelopers.cl/documentacion/ambiente-de-pruebas');

console.log('\n🚀 Próximos pasos:');
console.log('   1. Reinicia el servidor: npm start');
console.log('   2. Crea una reserva en http://localhost:3000');
console.log('   3. Usa una tarjeta de prueba para completar el pago');
console.log('   4. Verifica que la reserva se confirme automáticamente');

console.log('\n✅ Configuración completada!');

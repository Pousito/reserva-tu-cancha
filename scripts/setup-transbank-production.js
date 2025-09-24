#!/usr/bin/env node

/**
 * Script para configurar Transbank para PRODUCCIÓN
 * Este script actualiza las variables de entorno para usar el código de comercio real
 */

const fs = require('fs');
const path = require('path');

console.log('🏦 Configurando Transbank para PRODUCCIÓN...\n');

// Verificar argumentos
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('❌ Error: Faltan argumentos requeridos');
    console.log('📋 Uso: node scripts/setup-transbank-production.js <COMMERCE_CODE> <API_KEY>');
    console.log('📋 Ejemplo: node scripts/setup-transbank-production.js 597000000000 579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C');
    process.exit(1);
}

const commerceCode = args[0];
const apiKey = args[1];

console.log('🔍 Verificando argumentos...');
console.log(`   Commerce Code: ${commerceCode}`);
console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);

// Validaciones básicas
if (!commerceCode || commerceCode.length < 10) {
    console.log('❌ Error: Commerce Code inválido');
    process.exit(1);
}

if (!apiKey || apiKey.length < 60) {
    console.log('❌ Error: API Key inválida');
    process.exit(1);
}

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

// Configurar variables de Transbank para PRODUCCIÓN
const transbankProductionConfig = `
# Transbank Webpay Plus - Configuración de PRODUCCIÓN
TRANSBANK_API_KEY=${apiKey}
TRANSBANK_COMMERCE_CODE=${commerceCode}
TRANSBANK_ENVIRONMENT=production
TRANSBANK_RETURN_URL=https://www.reservatuscanchas.cl/payment.html
TRANSBANK_FINAL_URL=https://www.reservatuscanchas.cl/?payment=success
`;

// Actualizar o agregar las variables de Transbank
const lines = envContent.split('\n');
let updatedLines = [];
let transbankFound = false;

for (let line of lines) {
    if (line.startsWith('TRANSBANK_')) {
        if (!transbankFound) {
            // Reemplazar la primera línea de Transbank con la configuración de producción
            updatedLines.push(transbankProductionConfig.trim());
            transbankFound = true;
        }
        // Omitir las demás líneas de Transbank
    } else {
        updatedLines.push(line);
    }
}

// Si no se encontraron variables de Transbank, agregarlas al final
if (!transbankFound) {
    updatedLines.push(transbankProductionConfig.trim());
}

// Escribir el archivo actualizado
fs.writeFileSync(envPath, updatedLines.join('\n'));
console.log('✅ Configuración de Transbank para PRODUCCIÓN actualizada exitosamente');

console.log('\n📋 Configuración de Transbank para PRODUCCIÓN:');
console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`);
console.log(`   Commerce Code: ${commerceCode}`);
console.log('   Environment: production');
console.log('   Return URL: https://www.reservatuscanchas.cl/payment.html');
console.log('   Final URL: https://www.reservatuscanchas.cl/?payment=success');

console.log('\n⚠️  IMPORTANTE - Pasos para completar la validación:');
console.log('   1. Despliega los cambios a producción: git add . && git commit -m "Transbank production config" && git push origin main');
console.log('   2. Espera a que Render actualice el despliegue');
console.log('   3. Realiza una transacción de prueba REAL en https://www.reservatuscanchas.cl');
console.log('   4. Documenta la transacción exitosa (código de autorización, monto, etc.)');
console.log('   5. Envía la evidencia a Transbank para validación');
console.log('   6. Una vez validado, podrás procesar pagos reales');

console.log('\n🔒 Consideraciones de Seguridad:');
console.log('   - Las variables de entorno están en el archivo .env (no versionado)');
console.log('   - Render usará estas variables en producción');
console.log('   - Mantén la API Key segura y no la compartas');

console.log('\n📚 Documentación de Validación:');
console.log('   - Portal Transbank: https://publico.transbank.cl/');
console.log('   - Soporte: soporte@transbank.cl');
console.log('   - Documentación: https://www.transbankdevelopers.cl/documentacion/webpay-plus');

console.log('\n✅ Configuración de PRODUCCIÓN completada!');
console.log('🚀 Listo para la etapa de VALIDACIÓN de Transbank');

/**
 * Script de diagnóstico para verificar Transbank en producción
 * Ejecutar en Render o localmente con variables de producción
 */

console.log('🔍 DIAGNÓSTICO TRANSBANK EN PRODUCCIÓN');
console.log('=====================================');

// Verificar variables de entorno
console.log('\n📋 Variables de Entorno:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TRANSBANK_ENVIRONMENT:', process.env.TRANSBANK_ENVIRONMENT);
console.log('TRANSBANK_COMMERCE_CODE:', process.env.TRANSBANK_COMMERCE_CODE ? 'Configurado' : '❌ No configurado');
console.log('TRANSBANK_API_KEY:', process.env.TRANSBANK_API_KEY ? 'Configurado' : '❌ No configurado');
console.log('TRANSBANK_RETURN_URL:', process.env.TRANSBANK_RETURN_URL);
console.log('TRANSBANK_FINAL_URL:', process.env.TRANSBANK_FINAL_URL);

// Verificar que las URLs sean HTTPS
console.log('\n🌐 Verificación de URLs:');
if (process.env.TRANSBANK_RETURN_URL && process.env.TRANSBANK_RETURN_URL.startsWith('https://')) {
    console.log('✅ RETURN_URL usa HTTPS');
} else {
    console.log('❌ RETURN_URL NO usa HTTPS:', process.env.TRANSBANK_RETURN_URL);
}

if (process.env.TRANSBANK_FINAL_URL && process.env.TRANSBANK_FINAL_URL.startsWith('https://')) {
    console.log('✅ FINAL_URL usa HTTPS');
} else {
    console.log('❌ FINAL_URL NO usa HTTPS:', process.env.TRANSBANK_FINAL_URL);
}

// Verificar que las URLs apunten al dominio correcto
if (process.env.TRANSBANK_RETURN_URL && process.env.TRANSBANK_RETURN_URL.includes('reservatuscanchas.cl')) {
    console.log('✅ RETURN_URL apunta al dominio correcto');
} else {
    console.log('❌ RETURN_URL NO apunta al dominio correcto');
}

if (process.env.TRANSBANK_FINAL_URL && process.env.TRANSBANK_FINAL_URL.includes('reservatuscanchas.cl')) {
    console.log('✅ FINAL_URL apunta al dominio correcto');
} else {
    console.log('❌ FINAL_URL NO apunta al dominio correcto');
}

// Verificar entorno de Transbank
console.log('\n🏦 Verificación de Entorno:');
if (process.env.TRANSBANK_ENVIRONMENT === 'production') {
    console.log('✅ Entorno configurado como producción');
} else {
    console.log('⚠️  Entorno NO es producción:', process.env.TRANSBANK_ENVIRONMENT);
}

// Verificar credenciales
console.log('\n🔑 Verificación de Credenciales:');
if (process.env.TRANSBANK_COMMERCE_CODE && process.env.TRANSBANK_COMMERCE_CODE.length > 0) {
    console.log('✅ Commerce Code configurado');
} else {
    console.log('❌ Commerce Code NO configurado');
}

if (process.env.TRANSBANK_API_KEY && process.env.TRANSBANK_API_KEY.length > 0) {
    console.log('✅ API Key configurado');
} else {
    console.log('❌ API Key NO configurado');
}

console.log('\n📝 RECOMENDACIONES:');
console.log('1. Verifica que las URLs en Render sean exactamente:');
console.log('   - TRANSBANK_RETURN_URL=https://www.reservatuscanchas.cl/payment.html');
console.log('   - TRANSBANK_FINAL_URL=https://www.reservatuscanchas.cl/?payment=success');
console.log('2. Asegúrate de que TRANSBANK_ENVIRONMENT=production');
console.log('3. Verifica que las credenciales sean las correctas de producción');
console.log('4. Las URLs deben usar HTTPS (no HTTP)');
console.log('5. El dominio debe ser exactamente "reservatuscanchas.cl"');

console.log('\n🔧 Si el problema persiste:');
console.log('- Contacta a Transbank para verificar que tu comercio esté activo');
console.log('- Verifica que las URLs estén autorizadas en tu configuración de comercio');
console.log('- Revisa los logs de Render para errores específicos');

console.log('\n✅ Diagnóstico completado');

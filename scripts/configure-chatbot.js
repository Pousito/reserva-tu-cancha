#!/usr/bin/env node

/**
 * Script para configurar el chatbot con información específica de tu negocio
 * Personaliza las respuestas del asistente virtual
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 CONFIGURADOR DE CHATBOT');
console.log('===========================');

console.log('\n📋 INFORMACIÓN REQUERIDA:');
console.log('=========================');

// Información del negocio (personalizar según tu caso)
const businessInfo = {
    name: 'Reserva Tus Canchas',
    phone: '+56 9 XXXX XXXX', // Cambiar por tu teléfono real
    email: 'soporte@reservatuscanchas.cl',
    address: 'Tu dirección completa aquí', // Cambiar por tu dirección real
    hours: {
        weekdays: '8:00 - 22:00',
        saturday: '8:00 - 20:00',
        sunday: '9:00 - 19:00'
    },
    sports: [
        { name: 'Pádel', price: 28000, description: 'Canchas profesionales con iluminación' },
        { name: 'Fútbol', price: 35000, description: 'Césped sintético de alta calidad' }
    ],
    features: [
        'Estacionamiento gratuito',
        'Vestidores disponibles',
        'Equipamiento incluido',
        'Reservas online 24/7'
    ]
};

console.log('\n🏢 INFORMACIÓN DEL NEGOCIO:');
console.log(`   Nombre: ${businessInfo.name}`);
console.log(`   Teléfono: ${businessInfo.phone}`);
console.log(`   Email: ${businessInfo.email}`);
console.log(`   Dirección: ${businessInfo.address}`);

console.log('\n🕐 HORARIOS:');
console.log(`   Lunes a Viernes: ${businessInfo.hours.weekdays}`);
console.log(`   Sábados: ${businessInfo.hours.saturday}`);
console.log(`   Domingos: ${businessInfo.hours.sunday}`);

console.log('\n⚽ DEPORTES DISPONIBLES:');
businessInfo.sports.forEach(sport => {
    console.log(`   ${sport.name}: $${sport.price.toLocaleString()} - ${sport.description}`);
});

console.log('\n✨ CARACTERÍSTICAS:');
businessInfo.features.forEach(feature => {
    console.log(`   • ${feature}`);
});

// Generar respuestas personalizadas
const personalizedResponses = {
    precios: `💰 **Precios de Canchas:**\n\n${businessInfo.sports.map(sport => `• ${sport.name}: $${sport.price.toLocaleString()} por hora`).join('\n')}\n\n💡 *Los precios pueden variar según el horario y día de la semana.*`,
    
    horarios: `🕐 **Horarios de Atención:**\n\n• Lunes a Viernes: ${businessInfo.hours.weekdays}\n• Sábados: ${businessInfo.hours.saturday}\n• Domingos: ${businessInfo.hours.sunday}\n\n📅 *Las reservas se pueden hacer hasta con 30 días de anticipación.*`,
    
    contacto: `📞 **Información de Contacto:**\n\n• Teléfono: ${businessInfo.phone}\n• Email: ${businessInfo.email}\n• Dirección: ${businessInfo.address}\n\n🕐 *Horario de atención: Lunes a Viernes 9:00-18:00*`,
    
    ubicacion: `📍 **Ubicación:**\n\n• Dirección: ${businessInfo.address}\n• Estacionamiento gratuito disponible\n• Fácil acceso en transporte público\n\n🗺️ *Te enviamos ubicación exacta por WhatsApp*`,
    
    caracteristicas: `✨ **Nuestras Características:**\n\n${businessInfo.features.map(feature => `• ${feature}`).join('\n')}\n\n🏆 *Instalaciones de primer nivel para tu diversión*`
};

console.log('\n📝 RESPUESTAS PERSONALIZADAS GENERADAS:');
console.log('=====================================');

Object.entries(personalizedResponses).forEach(([key, response]) => {
    console.log(`\n${key.toUpperCase()}:`);
    console.log(response);
});

// Crear archivo de configuración
const configFile = path.join(__dirname, '../public/chatbot-config.js');

const configContent = `/**
 * Configuración personalizada del Chatbot
 * Generado automáticamente para ${businessInfo.name}
 */

window.ChatbotConfig = {
    business: {
        name: "${businessInfo.name}",
        phone: "${businessInfo.phone}",
        email: "${businessInfo.email}",
        address: "${businessInfo.address}",
        hours: ${JSON.stringify(businessInfo.hours, null, 2)},
        sports: ${JSON.stringify(businessInfo.sports, null, 2)},
        features: ${JSON.stringify(businessInfo.features, null, 2)}
    },
    responses: ${JSON.stringify(personalizedResponses, null, 2)}
};

console.log('🤖 Chatbot configurado para:', window.ChatbotConfig.business.name);
`;

fs.writeFileSync(configFile, configContent);

console.log('\n✅ ARCHIVO DE CONFIGURACIÓN CREADO:');
console.log(`   📁 ${configFile}`);

console.log('\n🔧 PRÓXIMOS PASOS:');
console.log('==================');
console.log('1. Revisa y actualiza la información en este script');
console.log('2. Ejecuta: node scripts/configure-chatbot.js');
console.log('3. Actualiza index.html para incluir chatbot-config.js');
console.log('4. Modifica chatbot.js para usar la configuración personalizada');
console.log('5. Haz deploy de los cambios');

console.log('\n💡 PERSONALIZACIÓN ADICIONAL:');
console.log('=============================');
console.log('• Modifica los precios en businessInfo.sports');
console.log('• Actualiza horarios en businessInfo.hours');
console.log('• Cambia teléfono y dirección por los reales');
console.log('• Agrega más deportes o características');
console.log('• Personaliza las respuestas en personalizedResponses');

console.log('\n🎯 RESULTADO:');
console.log('=============');
console.log('✅ Chatbot configurado con información de tu negocio');
console.log('✅ Respuestas personalizadas generadas');
console.log('✅ Archivo de configuración listo para usar');
console.log('✅ Fácil de actualizar en el futuro');

console.log('\n📞 INFORMACIÓN IMPORTANTE:');
console.log('==========================');
console.log('⚠️  Recuerda cambiar:');
console.log('   • Teléfono: +56 9 XXXX XXXX → Tu teléfono real');
console.log('   • Dirección: "Tu dirección completa aquí" → Tu dirección real');
console.log('   • Verificar precios y horarios');
console.log('   • Agregar cualquier información específica de tu negocio');

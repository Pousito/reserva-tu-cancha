#!/usr/bin/env node

/**
 * Script para enviar email de prueba con más logging y verificación
 */

process.env.NODE_ENV = 'production';
require('dotenv').config();

console.log('🔍 Verificando configuración de email...');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Configurado' : 'No configurado');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Configurado' : 'No configurado');
console.log('SMTP_RESERVAS_USER:', process.env.SMTP_RESERVAS_USER ? 'Configurado' : 'No configurado');
console.log('SMTP_RESERVAS_PASS:', process.env.SMTP_RESERVAS_PASS ? 'Configurado' : 'No configurado');

const EmailService = require('../src/services/emailService');

async function enviarEmailPrueba() {
    try {
        console.log('\n📧 Preparando email de prueba...');
        
        const emailData = {
            codigo_reserva: 'VIZJ4P',
            email_cliente: 'ignacio.araya.lillo@gmail.com',
            nombre_cliente: 'Bastián Cabrera',
            complejo: 'Complejo Deportivo',
            cancha: 'Cancha',
            fecha: '2025-01-15',
            hora_inicio: '18:00',
            hora_fin: '19:00',
            precio_total: 20700,
            porcentaje_pagado: 50
        };
        
        console.log('\n📋 Datos del email:');
        console.log(JSON.stringify(emailData, null, 2));
        
        console.log('\n📧 Creando instancia del servicio de email...');
        const emailService = new EmailService();
        
        console.log('📧 Verificando configuración del servicio...');
        console.log('isConfigured:', emailService.isConfigured);
        
        console.log('\n📧 Enviando email...');
        const result = await emailService.sendReservationConfirmation(emailData);
        
        console.log('\n✅ Resultado del envío:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('\n✅ Email enviado exitosamente');
            console.log('Message ID:', result.messageId);
        } else {
            console.log('\n❌ Error enviando email');
            console.log('Error:', result.error);
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

enviarEmailPrueba();


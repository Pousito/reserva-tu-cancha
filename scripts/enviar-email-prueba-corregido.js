#!/usr/bin/env node

/**
 * Script para enviar email de prueba con valores corregidos
 * Simula el email que debería recibir Bastián Cabrera
 */

require('dotenv').config();
const EmailService = require('../src/services/emailService');

async function enviarEmailPrueba() {
    console.log('📧 Enviando email de prueba con valores corregidos...');
    
    // Datos de la reserva corregidos según lo que debería ser
    const emailData = {
        codigo_reserva: 'TEST123',
        email_cliente: 'ignacio.araya.lillo@gmail.com',
        nombre_cliente: 'Bastián Cabrera',
        complejo: 'Complejo Deportivo',
        cancha: 'Cancha 1',
        fecha: '2025-01-15',
        hora_inicio: '18:00',
        hora_fin: '19:00',
        precio_total: 20700, // Total de la reserva (correcto)
        porcentaje_pagado: 50 // Pagó 50%
    };
    
    console.log('📋 Datos del email:');
    console.log('   Código:', emailData.codigo_reserva);
    console.log('   Cliente:', emailData.nombre_cliente);
    console.log('   Email:', emailData.email_cliente);
    console.log('   Precio Total:', emailData.precio_total);
    console.log('   Porcentaje Pagado:', emailData.porcentaje_pagado + '%');
    console.log('   Monto Pagado:', Math.round(emailData.precio_total / 2));
    console.log('   Pendiente:', Math.round(emailData.precio_total / 2));
    
    try {
        const emailService = new EmailService();
        const result = await emailService.sendConfirmationEmails(emailData);
        
        console.log('\n✅ Email enviado exitosamente');
        console.log('📧 Resultado:', result);
    } catch (error) {
        console.error('❌ Error enviando email:', error);
    }
}

enviarEmailPrueba();


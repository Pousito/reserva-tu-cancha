#!/usr/bin/env node

/**
 * Script para enviar email de prueba con la reserva de Bastián (VIZJ4P)
 * Solo a ignacio.araya.lillo@gmail.com con los valores corregidos
 * Usa datos proporcionados directamente sin buscar en BD
 */

process.env.NODE_ENV = 'production';
require('dotenv').config();
const EmailService = require('../src/services/emailService');

async function enviarEmailBastian() {
    try {
        console.log('📧 Preparando email de prueba para reserva VIZJ4P...');
        
        // Datos de la reserva según lo que proporcionaste
        // Usando valores corregidos
        const emailData = {
            codigo_reserva: 'VIZJ4P',
            email_cliente: 'ignacio.araya.lillo@gmail.com', // Solo a Ignacio
            nombre_cliente: 'Bastián Cabrera',
            complejo: 'Complejo Deportivo', // Ajusta si conoces el complejo específico
            cancha: 'Cancha', // Ajusta si conoces la cancha específica
            fecha: '2025-01-15', // Ajusta la fecha real si la conoces
            hora_inicio: '18:00', // Ajusta la hora real si la conoces
            hora_fin: '19:00', // Ajusta la hora real si la conoces
            precio_total: 20700, // Valor corregido: Total de la reserva
            porcentaje_pagado: 50 // Pagó 50%
        };
        
        console.log('\n📋 Datos del email:');
        console.log('   Código:', emailData.codigo_reserva);
        console.log('   Cliente:', emailData.nombre_cliente);
        console.log('   Email destino:', emailData.email_cliente);
        console.log('   Complejo:', emailData.complejo);
        console.log('   Cancha:', emailData.cancha);
        console.log('   Fecha:', emailData.fecha);
        console.log('   Horario:', emailData.hora_inicio, '-', emailData.hora_fin);
        console.log('   Precio Total:', emailData.precio_total);
        console.log('   Porcentaje Pagado:', emailData.porcentaje_pagado + '%');
        console.log('   Monto Pagado:', Math.round(emailData.precio_total / 2));
        console.log('   Pendiente:', Math.round(emailData.precio_total / 2));
        
        console.log('\n📧 Enviando email solo a ignacio.araya.lillo@gmail.com...');
        
        const emailService = new EmailService();
        const result = await emailService.sendReservationConfirmation(emailData);
        
        console.log('\n✅ Email enviado exitosamente');
        console.log('📧 Resultado:', result);
        console.log('\n📬 Email enviado a: ignacio.araya.lillo@gmail.com');
        console.log('📋 Con código de reserva: VIZJ4P');
        console.log('👤 Cliente: Bastián Cabrera');
        console.log('💰 Valores mostrados en el email:');
        console.log('   - Total Reserva: $20.700');
        console.log('   - Pagado Online: $10.350 (50%)');
        console.log('   - Pendiente en Complejo: $10.350 (50%)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

enviarEmailBastian();


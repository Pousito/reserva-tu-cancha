#!/usr/bin/env node

/**
 * Script para enviar email de prueba con la reserva real de Bastián (VIZJ4P)
 * Solo a ignacio.araya.lillo@gmail.com con los valores corregidos
 * Usa la base de datos de producción
 */

// Forzar producción
process.env.NODE_ENV = 'production';

require('dotenv').config();
const EmailService = require('../src/services/emailService');
const DatabaseManager = require('../src/config/database-unified');

async function enviarEmailBastianCorregido() {
    let db = null;
    
    try {
        console.log('🔌 Conectando a base de datos de PRODUCCIÓN...');
        console.log('🌍 Entorno:', process.env.NODE_ENV);
        console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado' : 'No configurado');
        
        db = new DatabaseManager();
        await db.connect();
        console.log('✅ Conectado a base de datos');
        
        // Buscar la reserva VIZJ4P
        console.log('\n🔍 Buscando reserva VIZJ4P...');
        const reserva = await db.get(`
            SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
                   r.telefono_cliente, r.rut_cliente,
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                   r.porcentaje_pagado,
                   c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = $1
        `, ['VIZJ4P']);
        
        if (!reserva) {
            console.error('❌ Reserva VIZJ4P no encontrada');
            console.log('\n🔍 Buscando reservas recientes...');
            const reservasRecientes = await db.query(`
                SELECT codigo_reserva, nombre_cliente, email_cliente, precio_total, porcentaje_pagado
                FROM reservas
                ORDER BY fecha_creacion DESC
                LIMIT 5
            `);
            
            console.log(`\n📋 Últimas ${reservasRecientes.length} reservas:`);
            reservasRecientes.forEach((r, i) => {
                console.log(`${i + 1}. ${r.codigo_reserva} - ${r.nombre_cliente} - $${r.precio_total} (${r.porcentaje_pagado || 100}%)`);
            });
            return;
        }
        
        console.log('✅ Reserva encontrada:');
        console.log('   Código:', reserva.codigo_reserva);
        console.log('   Cliente:', reserva.nombre_cliente);
        console.log('   Email original:', reserva.email_cliente);
        console.log('   Complejo:', reserva.complejo_nombre);
        console.log('   Cancha:', reserva.cancha_nombre);
        console.log('   Fecha:', reserva.fecha);
        console.log('   Horario:', reserva.hora_inicio, '-', reserva.hora_fin);
        console.log('   Precio Total (BD):', reserva.precio_total);
        console.log('   Porcentaje Pagado:', reserva.porcentaje_pagado);
        
        // CORREGIR los valores según lo que debería ser
        const precioTotalCorregido = 20700; // Total correcto
        const porcentajePagadoCorregido = 50; // Pagó 50%
        const montoPagadoCorregido = Math.round(precioTotalCorregido / 2); // 10350
        const pendienteCorregido = Math.round(precioTotalCorregido / 2); // 10350
        
        console.log('\n📋 Valores corregidos:');
        console.log('   Precio Total:', precioTotalCorregido);
        console.log('   Porcentaje Pagado:', porcentajePagadoCorregido + '%');
        console.log('   Monto Pagado:', montoPagadoCorregido);
        console.log('   Pendiente:', pendienteCorregido);
        
        // Preparar datos del email con valores corregidos
        const emailData = {
            codigo_reserva: reserva.codigo_reserva,
            email_cliente: 'ignacio.araya.lillo@gmail.com', // Solo a Ignacio
            nombre_cliente: reserva.nombre_cliente,
            complejo: reserva.complejo_nombre || 'Complejo Deportivo',
            cancha: reserva.cancha_nombre || 'Cancha',
            fecha: reserva.fecha,
            hora_inicio: reserva.hora_inicio,
            hora_fin: reserva.hora_fin,
            precio_total: precioTotalCorregido, // Valor corregido
            porcentaje_pagado: porcentajePagadoCorregido // Valor corregido
        };
        
        console.log('\n📧 Enviando email solo a ignacio.araya.lillo@gmail.com...');
        
        // Crear instancia del servicio de email
        const emailService = new EmailService();
        
        // Enviar solo al cliente (que será Ignacio)
        const result = await emailService.sendReservationConfirmation(emailData);
        
        console.log('\n✅ Email enviado exitosamente');
        console.log('📧 Resultado:', result);
        console.log('\n📬 Email enviado a: ignacio.araya.lillo@gmail.com');
        console.log('📋 Con código de reserva: VIZJ4P');
        console.log('💰 Valores mostrados:');
        console.log('   - Total Reserva: $20.700');
        console.log('   - Pagado Online: $10.350 (50%)');
        console.log('   - Pendiente en Complejo: $10.350 (50%)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        if (db) {
            await db.close();
        }
    }
}

enviarEmailBastianCorregido();


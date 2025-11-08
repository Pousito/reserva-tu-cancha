#!/usr/bin/env node

/**
 * Script para buscar reservas recientes y luego enviar email corregido
 */

require('dotenv').config();
const DatabaseManager = require('../src/config/database-unified');

async function buscarYEnviarEmail() {
    let db = null;
    
    try {
        console.log('🔌 Conectando a base de datos...');
        db = new DatabaseManager();
        await db.connect();
        console.log('✅ Conectado a base de datos');
        
        // Buscar reservas recientes de Bastián
        console.log('🔍 Buscando reservas recientes de Bastián...');
        const reservas = await db.query(`
            SELECT r.codigo_reserva, r.nombre_cliente, r.email_cliente,
                   r.precio_total, r.porcentaje_pagado,
                   TO_CHAR(r.fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_creacion
            FROM reservas r
            WHERE LOWER(r.nombre_cliente) LIKE '%basti%' OR LOWER(r.nombre_cliente) LIKE '%cabrera%'
            ORDER BY r.fecha_creacion DESC
            LIMIT 10
        `);
        
        console.log(`\n📋 Encontradas ${reservas.length} reservas:`);
        reservas.forEach((r, i) => {
            console.log(`\n${i + 1}. Código: ${r.codigo_reserva}`);
            console.log(`   Cliente: ${r.nombre_cliente}`);
            console.log(`   Email: ${r.email_cliente}`);
            console.log(`   Precio Total: $${r.precio_total}`);
            console.log(`   Porcentaje Pagado: ${r.porcentaje_pagado || 100}%`);
            console.log(`   Fecha Creación: ${r.fecha_creacion}`);
        });
        
        // Buscar específicamente VIZJ4P
        console.log('\n🔍 Buscando específicamente VIZJ4P...');
        const reservaVIZJ4P = await db.get(`
            SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = $1
        `, ['VIZJ4P']);
        
        if (reservaVIZJ4P) {
            console.log('✅ Reserva VIZJ4P encontrada!');
            console.log('   Cliente:', reservaVIZJ4P.nombre_cliente);
            console.log('   Email:', reservaVIZJ4P.email_cliente);
            console.log('   Precio Total:', reservaVIZJ4P.precio_total);
            console.log('   Porcentaje Pagado:', reservaVIZJ4P.porcentaje_pagado);
        } else {
            console.log('❌ Reserva VIZJ4P no encontrada');
            console.log('💡 Usando la primera reserva de Bastián encontrada...');
            
            if (reservas.length > 0) {
                const primeraReserva = reservas[0];
                console.log(`\n📧 Usando reserva: ${primeraReserva.codigo_reserva}`);
                
                // Obtener datos completos
                const reservaCompleta = await db.get(`
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
                `, [primeraReserva.codigo_reserva]);
                
                if (reservaCompleta) {
                    await enviarEmailCorregido(reservaCompleta);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        if (db) {
            await db.close();
        }
    }
}

async function enviarEmailCorregido(reserva) {
    const EmailService = require('../src/services/emailService');
    
    // CORREGIR los valores según lo que debería ser
    const precioTotalCorregido = 20700; // Total correcto
    const porcentajePagadoCorregido = 50; // Pagó 50%
    
    console.log('\n📋 Valores corregidos:');
    console.log('   Precio Total:', precioTotalCorregido);
    console.log('   Porcentaje Pagado:', porcentajePagadoCorregido + '%');
    console.log('   Monto Pagado:', Math.round(precioTotalCorregido / 2));
    console.log('   Pendiente:', Math.round(precioTotalCorregido / 2));
    
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
    
    const emailService = new EmailService();
    const result = await emailService.sendReservationConfirmation(emailData);
    
    console.log('\n✅ Email enviado exitosamente');
    console.log('📧 Resultado:', result);
    console.log('\n📬 Email enviado a: ignacio.araya.lillo@gmail.com');
    console.log(`📋 Con código de reserva: ${reserva.codigo_reserva}`);
    console.log('💰 Valores mostrados:');
    console.log('   - Total Reserva: $20.700');
    console.log('   - Pagado Online: $10.350 (50%)');
    console.log('   - Pendiente en Complejo: $10.350 (50%)');
}

buscarYEnviarEmail();


#!/usr/bin/env node

/**
 * Script para buscar reserva VIZJ4P en Render y enviar email corregido
 * Busca con diferentes variaciones del código
 */

const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    console.log('💡 Necesitas configurar DATABASE_URL con la URL de Render');
    console.log('   Ejemplo: DATABASE_URL="postgresql://..." node scripts/enviar-email-bastian-render.js');
    process.exit(1);
}

async function buscarYEnviarEmail() {
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    let client = null;
    
    try {
        console.log('🔌 Conectando a base de datos de Render...');
        client = await pool.connect();
        console.log('✅ Conectado');
        
        // Buscar con diferentes variaciones
        const codigosBuscar = ['VIZJ4P', 'vizj4p', 'Vizj4p', 'VIZj4p'];
        
        let reserva = null;
        for (const codigo of codigosBuscar) {
            console.log(`\n🔍 Buscando reserva ${codigo}...`);
            const result = await client.query(`
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
            `, [codigo]);
            
            if (result.rows && result.rows.length > 0) {
                reserva = result.rows[0];
                console.log(`✅ Reserva encontrada con código: ${codigo}`);
                break;
            }
        }
        
        if (!reserva) {
            console.error('\n❌ Reserva VIZJ4P no encontrada con ninguna variación');
            
            // Buscar todas las reservas para ver qué códigos existen
            console.log('\n🔍 Buscando todas las reservas (últimas 50)...');
            const todas = await client.query(`
                SELECT codigo_reserva, nombre_cliente, email_cliente, precio_total, porcentaje_pagado,
                       TO_CHAR(fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_creacion
                FROM reservas
                ORDER BY fecha_creacion DESC
                LIMIT 50
            `);
            
            console.log(`\n📋 Últimas ${todas.rows.length} reservas:`);
            todas.rows.forEach((r, i) => {
                console.log(`${i + 1}. ${r.codigo_reserva} - ${r.nombre_cliente} - $${r.precio_total} (${r.porcentaje_pagado || 100}%) - ${r.fecha_creacion}`);
            });
            
            return;
        }
        
        console.log('\n✅ Reserva encontrada:');
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
        
        console.log('\n📋 Valores corregidos:');
        console.log('   Precio Total:', precioTotalCorregido);
        console.log('   Porcentaje Pagado:', porcentajePagadoCorregido + '%');
        console.log('   Monto Pagado:', Math.round(precioTotalCorregido / 2));
        console.log('   Pendiente:', Math.round(precioTotalCorregido / 2));
        
        // Preparar datos del email con valores corregidos pero datos reales de la reserva
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
        
        const EmailService = require('../src/services/emailService');
        const emailService = new EmailService();
        const resultEmail = await emailService.sendReservationConfirmation(emailData);
        
        console.log('\n✅ Email enviado exitosamente');
        console.log('📧 Resultado:', resultEmail);
        console.log('\n📬 Email enviado a: ignacio.araya.lillo@gmail.com');
        console.log(`📋 Con código de reserva: ${reserva.codigo_reserva}`);
        console.log(`👤 Cliente: ${reserva.nombre_cliente}`);
        console.log(`🏢 Complejo: ${reserva.complejo_nombre}`);
        console.log(`⚽ Cancha: ${reserva.cancha_nombre}`);
        console.log(`📅 Fecha: ${reserva.fecha}`);
        console.log(`🕐 Horario: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
        console.log('💰 Valores mostrados en el email:');
        console.log('   - Total Reserva: $20.700');
        console.log('   - Pagado Online: $10.350 (50%)');
        console.log('   - Pendiente en Complejo: $10.350 (50%)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

buscarYEnviarEmail();


const { Client } = require('pg');
require('dotenv').config();

/**
 * Script para recrear la reserva de Bastian Cabrera (G8PRT5)
 * Este script:
 * 1. Crea la reserva con los datos proporcionados
 * 2. Vincula el pago existente a la reserva
 * 3. Envía los emails de confirmación
 */

async function recrearReservaG8PRT5() {
    console.log('\n🔧 RECREANDO RESERVA G8PRT5');
    console.log('============================\n');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Datos de la reserva
        const datosReserva = {
            codigo_reserva: 'G8PRT5',
            cancha_id: 6, // Cancha Principal de Espacio Deportivo Borde Río
            nombre_cliente: 'Bastian Cabrera',
            email_cliente: 'Eliecer.castillo.cabrera@gmail.com',
            telefono_cliente: '+56948440770',
            rut_cliente: '21432860-7',
            fecha: '2025-11-07',
            hora_inicio: '21:00:00',
            hora_fin: '22:00:00', // Asumiendo 1 hora de reserva
            monto_pagado: 10350, // 50% pagado
            precio_total: 20700, // Total de la reserva (monto_pagado * 2)
            porcentaje_pagado: 50,
            codigo_autorizacion: '025930'
        };

        console.log('📋 Datos de la reserva:');
        console.log(JSON.stringify(datosReserva, null, 2));
        console.log('');

        // Verificar que el pago existe
        const pagoResult = await client.query(`
            SELECT * FROM pagos 
            WHERE reservation_code = $1 OR authorization_code = $2
        `, [datosReserva.codigo_reserva, datosReserva.codigo_autorizacion]);

        if (pagoResult.rows.length === 0) {
            throw new Error('No se encontró el pago con código G8PRT5 o autorización 025930');
        }

        const pago = pagoResult.rows[0];
        console.log('✅ Pago encontrado:');
        console.log(`   ID: ${pago.id}`);
        console.log(`   Monto: $${pago.amount}`);
        console.log(`   Estado: ${pago.status}`);
        console.log(`   Código autorización: ${pago.authorization_code}`);
        console.log('');

        // Verificar que no exista ya una reserva con este código
        const reservaExistente = await client.query(`
            SELECT * FROM reservas WHERE codigo_reserva = $1
        `, [datosReserva.codigo_reserva]);

        if (reservaExistente.rows.length > 0) {
            console.log('⚠️  Ya existe una reserva con este código:');
            console.log(`   ID: ${reservaExistente.rows[0].id}`);
            console.log(`   Cliente: ${reservaExistente.rows[0].nombre_cliente}`);
            throw new Error('Ya existe una reserva con el código G8PRT5');
        }

        // Calcular comisión (3.5% + IVA sobre el precio total)
        const { calculateCommissionWithIVA } = require('./src/config/commissions');
        const comisionData = calculateCommissionWithIVA(datosReserva.precio_total, 'directa');
        const comisionWeb = comisionData.comisionTotal;

        console.log('💰 Cálculo de comisión:');
        console.log(`   Precio total: $${datosReserva.precio_total}`);
        console.log(`   Comisión (3.5% + IVA): $${comisionWeb}`);
        console.log('');

        // Crear la reserva
        console.log('📝 Creando reserva...');
        const reservaResult = await client.query(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente, 
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                codigo_reserva, estado, estado_pago, fecha_creacion, porcentaje_pagado,
                tipo_reserva, comision_aplicada, monto_abonado, metodo_pago
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING id
        `, [
            datosReserva.cancha_id,
            datosReserva.nombre_cliente,
            datosReserva.email_cliente,
            datosReserva.telefono_cliente,
            datosReserva.rut_cliente,
            datosReserva.fecha,
            datosReserva.hora_inicio,
            datosReserva.hora_fin,
            datosReserva.precio_total,
            datosReserva.codigo_reserva,
            'confirmada',
            'pagado',
            new Date().toISOString(),
            datosReserva.porcentaje_pagado,
            'directa',
            comisionWeb,
            datosReserva.monto_pagado,
            'webpay'
        ]);

        const reservaId = reservaResult.rows[0].id;
        console.log(`✅ Reserva creada exitosamente con ID: ${reservaId}`);

        // Actualizar el pago para vincularlo a la reserva
        console.log('\n🔗 Vinculando pago a la reserva...');
        await client.query(`
            UPDATE pagos 
            SET reserva_id = $1
            WHERE id = $2
        `, [reservaId, pago.id]);
        console.log('✅ Pago vinculado a la reserva');

        // Obtener información completa de la reserva para el email
        const reservaCompleta = await client.query(`
            SELECT 
                r.id, r.cancha_id, r.nombre_cliente, r.email_cliente, 
                r.telefono_cliente, r.rut_cliente,
                TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                r.porcentaje_pagado,
                c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.id = $1
        `, [reservaId]);

        if (reservaCompleta.rows.length === 0) {
            throw new Error('No se pudo obtener la información completa de la reserva');
        }

        const reservaInfo = reservaCompleta.rows[0];

        // Enviar emails
        console.log('\n📧 Enviando emails de confirmación...');
        const EmailService = require('./src/services/emailService');
        const emailService = new EmailService();

        const emailData = {
            codigo_reserva: reservaInfo.codigo_reserva,
            email_cliente: reservaInfo.email_cliente,
            nombre_cliente: reservaInfo.nombre_cliente,
            complejo: reservaInfo.complejo_nombre || 'Complejo Deportivo',
            cancha: reservaInfo.cancha_nombre || 'Cancha',
            fecha: reservaInfo.fecha,
            hora_inicio: reservaInfo.hora_inicio,
            hora_fin: reservaInfo.hora_fin,
            precio_total: reservaInfo.precio_total,
            porcentaje_pagado: reservaInfo.porcentaje_pagado || 50
        };

        const emailResults = await emailService.sendConfirmationEmails(emailData);
        
        console.log('\n📧 Resultados del envío de emails:');
        console.log(`   Cliente: ${emailResults.cliente ? '✅ Enviado' : '❌ Falló'}`);
        console.log(`   Admin complejo: ${emailResults.admin_complejo ? '✅ Enviado' : '❌ Falló'}`);
        console.log(`   Super admin: ${emailResults.super_admin ? '✅ Enviado' : '❌ Falló'}`);

        console.log('\n✅ PROCESO COMPLETADO EXITOSAMENTE');
        console.log('=====================================');
        console.log(`Reserva ID: ${reservaId}`);
        console.log(`Código: ${datosReserva.codigo_reserva}`);
        console.log(`Cliente: ${datosReserva.nombre_cliente}`);
        console.log(`Email: ${datosReserva.email_cliente}`);
        console.log(`Monto pagado: $${datosReserva.monto_pagado.toLocaleString()} (50%)`);
        console.log(`Total reserva: $${datosReserva.precio_total.toLocaleString()}`);
        console.log(`Pendiente: $${(datosReserva.precio_total - datosReserva.monto_pagado).toLocaleString()} (50%)`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    recrearReservaG8PRT5();
}

module.exports = { recrearReservaG8PRT5 };






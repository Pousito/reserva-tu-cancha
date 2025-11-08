const { Client } = require('pg');
require('dotenv').config();

/**
 * Script para recuperar información de un pago y recrear la reserva si es necesario
 * Uso: node scripts/recuperar-reserva-pago.js <authorization_code>
 */

async function recuperarReservaPago(authorizationCode) {
    console.log('\n🔍 RECUPERANDO INFORMACIÓN DEL PAGO');
    console.log('====================================');
    console.log(`Código de autorización: ${authorizationCode}\n`);

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Buscar el pago
        const pagoResult = await client.query(`
            SELECT * FROM pagos 
            WHERE authorization_code = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [authorizationCode]);

        if (pagoResult.rows.length === 0) {
            console.log('❌ No se encontró el pago con ese código de autorización');
            return;
        }

        const pago = pagoResult.rows[0];

        console.log('📋 INFORMACIÓN DEL PAGO:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`ID: ${pago.id}`);
        console.log(`Token Transbank: ${pago.transbank_token}`);
        console.log(`Order ID: ${pago.order_id}`);
        console.log(`Código de autorización: ${pago.authorization_code}`);
        console.log(`Monto: $${pago.amount.toLocaleString()}`);
        console.log(`Estado: ${pago.status}`);
        console.log(`Código de reserva: ${pago.reservation_code}`);
        console.log(`Bloqueo ID: ${pago.bloqueo_id}`);
        console.log(`Fecha de creación: ${pago.created_at}`);
        console.log(`Fecha de actualización: ${pago.updated_at}`);
        console.log(`Fecha de transacción: ${pago.transaction_date}`);

        // Verificar si ya existe una reserva
        const reservaResult = await client.query(`
            SELECT * FROM reservas WHERE codigo_reserva = $1
        `, [pago.reservation_code]);

        if (reservaResult.rows.length > 0) {
            console.log('\n✅ RESERVA YA EXISTE:');
            const reserva = reservaResult.rows[0];
            console.log(`   ID: ${reserva.id}`);
            console.log(`   Cliente: ${reserva.nombre_cliente}`);
            console.log(`   Email: ${reserva.email_cliente}`);
            console.log(`   Estado: ${reserva.estado}`);
            console.log(`   Estado pago: ${reserva.estado_pago}`);
            return;
        }

        console.log('\n⚠️  NO HAY RESERVA ASOCIADA');
        console.log(`   Código de reserva esperado: ${pago.reservation_code}`);

        // Intentar buscar el bloqueo temporal (aunque probablemente ya no exista)
        if (pago.bloqueo_id) {
            const bloqueoResult = await client.query(`
                SELECT * FROM bloqueos_temporales WHERE id = $1
            `, [pago.bloqueo_id]);

            if (bloqueoResult.rows.length > 0) {
                const bloqueo = bloqueoResult.rows[0];
                console.log('\n✅ BLOQUEO TEMPORAL ENCONTRADO:');
                console.log(`   ID: ${bloqueo.id}`);
                console.log(`   Session ID: ${bloqueo.session_id}`);
                console.log(`   Cancha ID: ${bloqueo.cancha_id}`);
                console.log(`   Fecha: ${bloqueo.fecha}`);
                console.log(`   Hora inicio: ${bloqueo.hora_inicio}`);
                console.log(`   Hora fin: ${bloqueo.hora_fin}`);
                
                if (bloqueo.datos_cliente) {
                    try {
                        const datosCliente = JSON.parse(bloqueo.datos_cliente);
                        console.log('\n👤 DATOS DEL CLIENTE:');
                        console.log(`   Nombre: ${datosCliente.nombre_cliente}`);
                        console.log(`   Email: ${datosCliente.email_cliente}`);
                        console.log(`   Teléfono: ${datosCliente.telefono_cliente}`);
                        console.log(`   RUT: ${datosCliente.rut_cliente}`);
                        console.log(`   Precio total: $${datosCliente.precio_total}`);
                        console.log(`   Porcentaje pagado: ${datosCliente.porcentaje_pagado || 100}%`);

                        // Aquí podríamos recrear la reserva si tenemos todos los datos
                        console.log('\n💡 Para recrear la reserva, necesitarías ejecutar:');
                        console.log('   node scripts/recrear-reserva.js <pago_id>');
                        
                    } catch (error) {
                        console.log('   Error parseando datos del cliente:', error.message);
                    }
                }
            } else {
                console.log('\n❌ El bloqueo temporal ya no existe');
                console.log('   Esto significa que los datos del cliente se perdieron');
                console.log('   Necesitarás obtener los datos del cliente de otra fuente');
            }
        }

        // Buscar información de canchas y complejos para ayudar
        const canchasResult = await client.query(`
            SELECT c.id, c.nombre, c.tipo, co.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos co ON c.complejo_id = co.id
            ORDER BY c.id
            LIMIT 20
        `);

        console.log('\n📋 CANCHAS DISPONIBLES (para referencia):');
        canchasResult.rows.forEach(cancha => {
            console.log(`   ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo}) - ${cancha.complejo_nombre}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await client.end();
    }
}

const authorizationCode = process.argv[2];

if (!authorizationCode) {
    console.log('❌ Por favor, proporciona el código de autorización');
    console.log('Uso: node scripts/recuperar-reserva-pago.js <codigo_autorizacion>');
    console.log('Ejemplo: node scripts/recuperar-reserva-pago.js 025930');
    process.exit(1);
}

recuperarReservaPago(authorizationCode);


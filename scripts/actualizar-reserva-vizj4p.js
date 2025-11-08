#!/usr/bin/env node

/**
 * Script para actualizar la reserva VIZJ4P de Bastián
 * - Cambiar precio_total de 23000 a 20700
 * - Actualizar monto_abonado a 10350 (50% de 20700)
 * - Actualizar monto en tabla pagos si existe
 */

const { Pool } = require('pg');
require('dotenv').config();

// Usar DATABASE_URL de las variables de entorno (debe estar configurada con la URL de Render)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    console.log('💡 Necesitas configurar DATABASE_URL con la URL de Render');
    process.exit(1);
}

async function actualizarReserva() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    let client = null;
    
    try {
        console.log('🔌 Conectando a base de datos...');
        client = await pool.connect();
        console.log('✅ Conectado');
        
        // Verificar reserva actual
        console.log('\n🔍 Verificando reserva VIZJ4P...');
        const reservaActual = await client.query(`
            SELECT r.id, r.codigo_reserva, r.precio_total, r.porcentaje_pagado, r.monto_abonado,
                   p.id as pago_id, p.amount as monto_pago
            FROM reservas r
            LEFT JOIN pagos p ON r.codigo_reserva = p.reservation_code
            WHERE UPPER(r.codigo_reserva) = UPPER($1)
        `, ['VIZJ4P']);
        
        if (!reservaActual.rows || reservaActual.rows.length === 0) {
            console.error('❌ Reserva VIZJ4P no encontrada');
            return;
        }
        
        const reserva = reservaActual.rows[0];
        console.log('\n📋 Estado actual de la reserva:');
        console.log(`   ID: ${reserva.id}`);
        console.log(`   Código: ${reserva.codigo_reserva}`);
        console.log(`   Precio Total: $${reserva.precio_total}`);
        console.log(`   Porcentaje Pagado: ${reserva.porcentaje_pagado}%`);
        console.log(`   Monto Abonado: $${reserva.monto_abonado || 0}`);
        console.log(`   Pago ID: ${reserva.pago_id || 'No existe'}`);
        console.log(`   Monto en Pago: $${reserva.monto_pago || 'N/A'}`);
        
        // Calcular nuevos valores
        const nuevoPrecioTotal = 20700;
        const nuevoMontoAbonado = Math.round(nuevoPrecioTotal / 2); // 10350
        
        console.log('\n🔄 Actualizando reserva...');
        console.log(`   Precio Total: $${reserva.precio_total} → $${nuevoPrecioTotal}`);
        console.log(`   Monto Abonado: $${reserva.monto_abonado || 0} → $${nuevoMontoAbonado}`);
        
        // Actualizar reserva
        const updateReserva = await client.query(`
            UPDATE reservas 
            SET precio_total = $1, 
                monto_abonado = $2
            WHERE UPPER(codigo_reserva) = UPPER($3)
            RETURNING id, codigo_reserva, precio_total, porcentaje_pagado, monto_abonado
        `, [nuevoPrecioTotal, nuevoMontoAbonado, 'VIZJ4P']);
        
        console.log('✅ Reserva actualizada:', updateReserva.rows[0]);
        
        // Actualizar pago si existe
        if (reserva.pago_id) {
            console.log('\n🔄 Actualizando monto en tabla pagos...');
            const updatePago = await client.query(`
                UPDATE pagos 
                SET amount = $1
                WHERE reservation_code = $2
                RETURNING id, reservation_code, amount, status
            `, [nuevoMontoAbonado, 'VIZJ4P']);
            
            console.log('✅ Pago actualizado:', updatePago.rows[0]);
        } else {
            console.log('\n⚠️ No se encontró registro en tabla pagos, solo se actualizó la reserva');
        }
        
        // Verificar resultado final
        console.log('\n✅ Verificación final:');
        const reservaFinal = await client.query(`
            SELECT r.id, r.codigo_reserva, r.precio_total, r.porcentaje_pagado, r.monto_abonado,
                   p.id as pago_id, p.amount as monto_pago
            FROM reservas r
            LEFT JOIN pagos p ON r.codigo_reserva = p.reservation_code
            WHERE UPPER(r.codigo_reserva) = UPPER($1)
        `, ['VIZJ4P']);
        
        const final = reservaFinal.rows[0];
        console.log(`   Precio Total: $${final.precio_total}`);
        console.log(`   Porcentaje Pagado: ${final.porcentaje_pagado}%`);
        console.log(`   Monto Abonado: $${final.monto_abonado || 0}`);
        console.log(`   Monto en Pago: $${final.monto_pago || 'N/A'}`);
        
        // Calcular montos esperados
        const montoPagadoEsperado = Math.round(final.precio_total / 2);
        const montoPendienteEsperado = Math.round(final.precio_total / 2);
        
        console.log('\n📊 Montos que deberían mostrarse en el modal de info:');
        console.log(`   Pagado Online: $${montoPagadoEsperado} (50%)`);
        console.log(`   Pendiente en Complejo: $${montoPendienteEsperado} (50%)`);
        
        if (montoPagadoEsperado === 10350 && montoPendienteEsperado === 10350) {
            console.log('\n✅ ¡Actualización completada exitosamente!');
            console.log('   Los montos ahora son correctos: $10,350 pagado y $10,350 pendiente');
        } else {
            console.log('\n⚠️ Los montos calculados no coinciden con lo esperado');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

actualizarReserva()
    .then(() => {
        console.log('\n✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Proceso falló:', error);
        process.exit(1);
    });


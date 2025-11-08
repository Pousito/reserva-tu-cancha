// Script para corregir ingreso de reserva IY04YD
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function corregirIngresoIY04YD() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Corrigiendo ingreso para reserva IY04YD...');
    
    // Obtener datos de la reserva
    const reservaResult = await client.query(`
      SELECT r.*, c.complejo_id, c.nombre as cancha_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE r.codigo_reserva = 'IY04YD'
    `);
    
    if (!reservaResult.rows || reservaResult.rows.length === 0) {
      console.log('❌ Reserva IY04YD no encontrada');
      await client.query('ROLLBACK');
      return;
    }
    
    const reserva = reservaResult.rows[0];
    console.log('📋 Datos de la reserva:', {
      monto_abonado: reserva.monto_abonado,
      metodo_pago: reserva.metodo_pago,
      tipo_reserva: reserva.tipo_reserva
    });
    
    // Buscar el ingreso existente
    const ingresoResult = await client.query(`
      SELECT id FROM gastos_ingresos
      WHERE descripcion LIKE '%IY04YD%' AND tipo = 'ingreso'
    `);
    
    if (!ingresoResult.rows || ingresoResult.rows.length === 0) {
      console.log('❌ Ingreso no encontrado');
      await client.query('ROLLBACK');
      return;
    }
    
    const ingresoId = ingresoResult.rows[0].id;
    
    // Determinar método de pago correcto
    let metodoPago = 'efectivo'; // Por defecto efectivo según la reserva
    if (reserva.tipo_reserva === 'directa') {
      metodoPago = 'webpay';
    } else if (reserva.metodo_pago) {
      if (reserva.metodo_pago === 'efectivo') {
        metodoPago = 'efectivo';
      } else if (reserva.metodo_pago === 'transferencia') {
        metodoPago = 'transferencia';
      } else if (reserva.metodo_pago === 'tarjeta') {
        metodoPago = 'tarjeta';
      } else {
        metodoPago = reserva.metodo_pago;
      }
    }
    
    // Usar monto_abonado si existe, sino precio_total
    const montoCorrecto = reserva.monto_abonado || reserva.precio_total || 0;
    
    // Actualizar el ingreso
    const updateResult = await client.query(`
      UPDATE gastos_ingresos
      SET monto = $1,
          metodo_pago = $2,
          descripcion = $3,
          actualizado_en = NOW()
      WHERE id = $4
      RETURNING id, monto, metodo_pago
    `, [
      montoCorrecto,
      metodoPago,
      `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}${reserva.porcentaje_pagado ? ` (Abono ${reserva.porcentaje_pagado}%)` : ''}`,
      ingresoId
    ]);
    
    await client.query('COMMIT');
    
    console.log('✅ Ingreso actualizado exitosamente:', {
      ingreso_id: updateResult.rows[0].id,
      monto_anterior: 15000,
      monto_nuevo: updateResult.rows[0].monto,
      metodo_pago_anterior: 'webpay',
      metodo_pago_nuevo: updateResult.rows[0].metodo_pago
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error corrigiendo ingreso:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

corregirIngresoIY04YD()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


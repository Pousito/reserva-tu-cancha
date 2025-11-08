// Script para sincronizar ingreso de reserva IY04YD
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function sincronizarReservaIY04YD() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Sincronizando ingreso para reserva IY04YD...');
    
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
      codigo: reserva.codigo_reserva,
      estado: reserva.estado,
      monto_abonado: reserva.monto_abonado,
      precio_total: reserva.precio_total,
      metodo_pago: reserva.metodo_pago,
      tipo_reserva: reserva.tipo_reserva,
      complejo_id: reserva.complejo_id
    });
    
    if (reserva.estado !== 'confirmada') {
      console.log('⚠️ La reserva no está confirmada. Estado:', reserva.estado);
      await client.query('ROLLBACK');
      return;
    }
    
    // Verificar si ya existe un ingreso
    const existeIngreso = await client.query(`
      SELECT id FROM gastos_ingresos
      WHERE descripcion LIKE '%IY04YD%' AND tipo = 'ingreso'
    `);
    
    if (existeIngreso.rows.length > 0) {
      console.log('✅ El ingreso ya existe. ID:', existeIngreso.rows[0].id);
      await client.query('ROLLBACK');
      return;
    }
    
    // Buscar categoría de ingresos
    const categoriaIngreso = await client.query(`
      SELECT id FROM categorias_gastos
      WHERE complejo_id = $1
      AND tipo = 'ingreso'
      AND nombre = 'Reservas Web'
      LIMIT 1
    `, [reserva.complejo_id]);
    
    if (!categoriaIngreso.rows || categoriaIngreso.rows.length === 0) {
      console.log('❌ Categoría de ingresos no encontrada para este complejo');
      await client.query('ROLLBACK');
      return;
    }
    
    const montoIngreso = reserva.monto_abonado || reserva.precio_total || 0;
    
    if (montoIngreso <= 0) {
      console.log('⚠️ La reserva no tiene monto válido');
      await client.query('ROLLBACK');
      return;
    }
    
    // Determinar método de pago
    let metodoPago = 'por_definir';
    if (reserva.tipo_reserva === 'directa') {
      metodoPago = 'webpay';
    } else if (reserva.metodo_pago) {
      // Mapear método de pago
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
    
    // Crear ingreso
    const ingresoResult = await client.query(`
      INSERT INTO gastos_ingresos (
        complejo_id,
        categoria_id,
        tipo,
        monto,
        fecha,
        descripcion,
        metodo_pago,
        usuario_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      reserva.complejo_id,
      categoriaIngreso.rows[0].id,
      'ingreso',
      montoIngreso,
      reserva.fecha,
      `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}${reserva.porcentaje_pagado ? ` (Abono ${reserva.porcentaje_pagado}%)` : ''}`,
      metodoPago,
      null
    ]);
    
    await client.query('COMMIT');
    
    console.log('✅ Ingreso creado exitosamente:', {
      ingreso_id: ingresoResult.rows[0].id,
      monto: montoIngreso,
      metodo_pago: metodoPago
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error sincronizando ingreso:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

sincronizarReservaIY04YD()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


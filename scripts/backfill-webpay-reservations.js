#!/usr/bin/env node

/**
 * Script para normalizar reservas web antiguas:
 * - Asigna metodo_pago = 'webpay' cuando esté vacío/nulo
 * - Recalcula monto_abonado y porcentaje_pagado en base al precio y porcentaje
 * - Ajusta estado_pago en función del nuevo monto abonado
 * - Registra un abono en historial_abonos_reservas (si la tabla existe) cuando no haya registros previos
 *
 * Se ejecuta contra la base de datos definida en DATABASE_URL.
 */

const { Pool } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL ||
  '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurado. Exporta la conexión antes de ejecutar el script.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false }
});

async function historialExiste(client) {
  const result = await client.query(
    `SELECT to_regclass('public.historial_abonos_reservas') AS table_name`
  );
  return !!result.rows[0]?.table_name;
}

function calcularMontoAbonado(row) {
  const precioTotal = parseInt(row.precio_total, 10) || 0;
  const porcentajePagado = parseInt(row.porcentaje_pagado, 10) || 0;
  const montoActual = parseInt(row.monto_abonado, 10);

  if (!Number.isNaN(montoActual) && montoActual > 0) {
    return montoActual;
  }

  if (precioTotal > 0 && porcentajePagado > 0) {
    return Math.min(precioTotal, Math.round((precioTotal * porcentajePagado) / 100));
  }

  if ((row.estado_pago || '').toLowerCase() === 'pagado') {
    return precioTotal;
  }

  return 0;
}

function calcularEstadoPago(precioTotal, montoAbonado) {
  if (precioTotal > 0 && montoAbonado >= precioTotal) {
    return 'pagado';
  }
  if (montoAbonado > 0) {
    return 'por_pagar';
  }
  return 'pendiente';
}

function calcularPorcentaje(precioTotal, montoAbonado) {
  if (precioTotal > 0 && montoAbonado > 0) {
    return Math.min(100, Math.round((montoAbonado / precioTotal) * 100));
  }
  return 0;
}

async function procesar() {
  const client = await pool.connect();
  let updated = 0;
  let historialInsertado = 0;

  try {
    const tieneHistorial = await historialExiste(client);

    console.log('🔍 Buscando reservas web con método de pago faltante...');
    const { rows } = await client.query(`
      SELECT id, codigo_reserva, precio_total, porcentaje_pagado,
             COALESCE(monto_abonado, 0) AS monto_abonado,
             COALESCE(estado_pago, 'pendiente') AS estado_pago
      FROM reservas
      WHERE tipo_reserva = 'directa'
        AND (metodo_pago IS NULL OR metodo_pago = '' OR metodo_pago = 'por_definir')
    `);

    if (rows.length === 0) {
      console.log('✅ No hay reservas pendientes de corregir.');
      return;
    }

    console.log(`📦 Se actualizarán ${rows.length} reservas.`);

    for (const row of rows) {
      const precioTotal = parseInt(row.precio_total, 10) || 0;
      const nuevoMonto = calcularMontoAbonado(row);
      const nuevoEstado = calcularEstadoPago(precioTotal, nuevoMonto);
      const nuevoPorcentaje = calcularPorcentaje(precioTotal, nuevoMonto);

      await client.query(
        `
          UPDATE reservas
          SET metodo_pago = 'webpay',
              monto_abonado = $1,
              estado_pago = $2,
              porcentaje_pagado = $3
          WHERE id = $4
        `,
        [nuevoMonto, nuevoEstado, nuevoPorcentaje, row.id]
      );

      updated += 1;

      if (tieneHistorial && nuevoMonto > 0) {
        const existeHistorial = await client.query(
          `
            SELECT 1
            FROM historial_abonos_reservas
            WHERE codigo_reserva = $1
            LIMIT 1
          `,
          [row.codigo_reserva]
        );

        if (existeHistorial.rows.length === 0) {
          await client.query(
            `
              INSERT INTO historial_abonos_reservas (
                reserva_id,
                codigo_reserva,
                monto_abonado,
                metodo_pago,
                notas
              ) VALUES ($1, $2, $3, 'webpay', 'Backfill automático de abono webpay')
            `,
            [row.id, row.codigo_reserva, nuevoMonto]
          );
          historialInsertado += 1;
        }
      }
    }

    console.log('✅ Backfill completado.');
    console.log(`   • Reservas actualizadas: ${updated}`);
    console.log(`   • Historiales insertados: ${historialInsertado}`);
  } catch (error) {
    console.error('❌ Error durante el proceso de backfill:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

procesar();


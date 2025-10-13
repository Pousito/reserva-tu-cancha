#!/usr/bin/env node

/**
 * Script para actualizar las comisiones de reservas existentes
 * Calcula y actualiza las comisiones que no fueron registradas correctamente
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/reserva_tu_cancha'
});

async function updateExistingCommissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Actualizando comisiones de reservas existentes...');
    
    // Obtener reservas que no tienen comisión calculada
    const reservationsWithoutCommission = await client.query(`
      SELECT 
        r.id,
        r.codigo_reserva,
        r.precio_total,
        r.comision_aplicada,
        r.tipo_reserva,
        r.estado,
        r.fecha,
        c.nombre as cancha_nombre,
        co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.estado = 'confirmada'
      AND (r.comision_aplicada IS NULL OR r.comision_aplicada = 0)
      ORDER BY r.fecha DESC
    `);
    
    console.log(`📊 Reservas sin comisión encontradas: ${reservationsWithoutCommission.rows.length}`);
    
    if (reservationsWithoutCommission.rows.length === 0) {
      console.log('✅ Todas las reservas ya tienen comisiones calculadas');
      return;
    }
    
    let updated = 0;
    let totalCommission = 0;
    
    for (const reserva of reservationsWithoutCommission.rows) {
      // Calcular comisión según el tipo de reserva
      let commissionRate = 0.035; // 3.5% por defecto (reservas web)
      
      if (reserva.tipo_reserva === 'administrativa') {
        commissionRate = 0.0175; // 1.75% para reservas administrativas
      }
      
      const newCommission = Math.round(reserva.precio_total * commissionRate);
      
      // Actualizar la comisión en la base de datos
      await client.query(`
        UPDATE reservas 
        SET comision_aplicada = $1
        WHERE id = $2
      `, [newCommission, reserva.id]);
      
      console.log(`✅ ${reserva.codigo_reserva}: $${reserva.precio_total} → Comisión: $${newCommission} (${(commissionRate * 100).toFixed(2)}%)`);
      
      updated++;
      totalCommission += newCommission;
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`  - Reservas actualizadas: ${updated}`);
    console.log(`  - Comisión total calculada: $${totalCommission}`);
    
    // Verificar que los triggers funcionen para las reservas actualizadas
    console.log('\n🔍 Verificando que los triggers funcionen...');
    
    // Obtener algunas reservas actualizadas para verificar
    const updatedReservations = await client.query(`
      SELECT 
        r.codigo_reserva,
        r.comision_aplicada,
        gi.id as gasto_id,
        gi.monto as gasto_monto,
        gi.descripcion
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      LEFT JOIN gastos_ingresos gi ON gi.descripcion LIKE '%Comisión%' || r.codigo_reserva || '%'
      WHERE r.estado = 'confirmada'
      AND r.comision_aplicada > 0
      ORDER BY r.fecha DESC
      LIMIT 5
    `);
    
    console.log(`📋 Verificación de gastos de comisión:`);
    updatedReservations.rows.forEach(reserva => {
      if (reserva.gasto_id) {
        console.log(`  ✅ ${reserva.codigo_reserva}: Comisión $${reserva.comision_aplicada} → Gasto registrado $${reserva.gasto_monto}`);
      } else {
        console.log(`  ❌ ${reserva.codigo_reserva}: Comisión $${reserva.comision_aplicada} → Sin gasto registrado`);
      }
    });
    
    console.log('\n✅ Actualización completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateExistingCommissions()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { updateExistingCommissions };



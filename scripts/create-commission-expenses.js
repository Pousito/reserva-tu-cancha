#!/usr/bin/env node

/**
 * Script para crear gastos de comisión para reservas existentes
 * Este script crea manualmente los gastos de comisión que deberían haberse creado automáticamente
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/reserva_tu_cancha'
});

async function createCommissionExpenses() {
  const client = await pool.connect();
  
  try {
    console.log('💰 Creando gastos de comisión para reservas existentes...');
    
    // Obtener reservas con comisiones que no tienen gastos registrados
    const reservationsWithCommission = await client.query(`
      SELECT 
        r.id,
        r.codigo_reserva,
        r.precio_total,
        r.comision_aplicada,
        r.tipo_reserva,
        r.fecha,
        r.estado,
        c.complejo_id,
        co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.estado = 'confirmada'
      AND r.comision_aplicada > 0
      AND NOT EXISTS (
        SELECT 1 FROM gastos_ingresos gi
        WHERE gi.descripcion LIKE '%Comisión%' || r.codigo_reserva || '%'
        AND gi.tipo = 'gasto'
      )
      ORDER BY r.fecha DESC
    `);
    
    console.log(`📊 Reservas con comisión sin gasto: ${reservationsWithCommission.rows.length}`);
    
    if (reservationsWithCommission.rows.length === 0) {
      console.log('✅ Todas las reservas ya tienen gastos de comisión registrados');
      return;
    }
    
    let created = 0;
    let totalExpenses = 0;
    
    for (const reserva of reservationsWithCommission.rows) {
      // Buscar la categoría de comisión para este complejo
      const commissionCategory = await client.query(`
        SELECT id FROM categorias_gastos
        WHERE complejo_id = $1
        AND nombre = 'Comisión Plataforma'
        AND tipo = 'gasto'
        LIMIT 1
      `, [reserva.complejo_id]);
      
      if (commissionCategory.rows.length === 0) {
        console.log(`❌ No se encontró categoría de comisión para complejo ${reserva.complejo_nombre}`);
        continue;
      }
      
      const categoriaId = commissionCategory.rows[0].id;
      
      // Determinar el tipo de comisión para la descripción
      const tipoComision = reserva.tipo_reserva === 'administrativa' 
        ? 'Admin (1.75% + IVA)' 
        : 'Web (3.5% + IVA)';
      
      // Crear el gasto de comisión
      await client.query(`
        INSERT INTO gastos_ingresos (
          complejo_id, categoria_id, tipo, monto, fecha, 
          descripcion, metodo_pago, usuario_id
        ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico', NULL)
      `, [
        reserva.complejo_id,
        categoriaId,
        reserva.comision_aplicada,
        reserva.fecha,
        `Comisión Reserva #${reserva.codigo_reserva} - ${tipoComision}`
      ]);
      
      console.log(`✅ ${reserva.codigo_reserva}: Gasto de $${reserva.comision_aplicada} creado (${reserva.complejo_nombre})`);
      
      created++;
      totalExpenses += reserva.comision_aplicada;
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`  - Gastos de comisión creados: ${created}`);
    console.log(`  - Total en gastos: $${totalExpenses}`);
    
    // Verificar el resultado
    console.log('\n🔍 Verificando gastos creados...');
    const recentExpenses = await client.query(`
      SELECT 
        gi.monto,
        gi.fecha,
        gi.descripcion,
        co.nombre as complejo_nombre
      FROM gastos_ingresos gi
      JOIN categorias_gastos cat ON gi.categoria_id = cat.id
      JOIN complejos co ON gi.complejo_id = co.id
      WHERE cat.nombre = 'Comisión Plataforma'
      ORDER BY gi.fecha DESC
      LIMIT 5
    `);
    
    console.log(`📋 Últimos gastos de comisión:`);
    recentExpenses.rows.forEach(expense => {
      console.log(`  - ${expense.fecha}: $${expense.monto} - ${expense.descripcion} (${expense.complejo_nombre})`);
    });
    
    console.log('\n✅ Gastos de comisión creados exitosamente');
    
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
  createCommissionExpenses()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createCommissionExpenses };

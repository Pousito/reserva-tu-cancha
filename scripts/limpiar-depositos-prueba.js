#!/usr/bin/env node

/**
 * Script para limpiar depósitos de prueba del sistema
 * Elimina depósitos que tienen observaciones "Depósito de prueba generado automáticamente"
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function limpiarDepositosPrueba() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 LIMPIANDO DEPÓSITOS DE PRUEBA');
    console.log('='.repeat(50));
    
    // Primero mostrar qué depósitos se van a eliminar
    const depositosPrueba = await client.query(`
      SELECT id, complejo_id, monto_total_reservas, observaciones, fecha_deposito
      FROM depositos_complejos 
      WHERE observaciones LIKE '%prueba%' OR observaciones LIKE '%test%'
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📋 Depósitos de prueba encontrados: ${depositosPrueba.rows.length}`);
    
    if (depositosPrueba.rows.length === 0) {
      console.log('✅ No hay depósitos de prueba para eliminar');
      return;
    }
    
    depositosPrueba.rows.forEach((dep, i) => {
      console.log(`${i+1}. ID: ${dep.id} - Monto: $${dep.monto_total_reservas} - ${dep.observaciones}`);
    });
    
    // Eliminar depósitos de prueba
    const resultado = await client.query(`
      DELETE FROM depositos_complejos 
      WHERE observaciones LIKE '%prueba%' OR observaciones LIKE '%test%'
    `);
    
    console.log(`\n✅ ${resultado.rowCount} depósitos de prueba eliminados`);
    
    // Verificar depósitos restantes
    const depositosRestantes = await client.query(`
      SELECT COUNT(*) as total, 
             SUM(monto_total_reservas) as monto_total
      FROM depositos_complejos
    `);
    
    console.log(`\n📊 Depósitos restantes: ${depositosRestantes.rows[0].total}`);
    console.log(`💰 Monto total restante: $${depositosRestantes.rows[0].monto_total || 0}`);
    
    // Verificar reservas reales
    const reservasReales = await client.query(`
      SELECT COUNT(*) as total_reservas,
             SUM(precio_total) as ingresos_totales
      FROM reservas 
      WHERE estado != 'cancelada'
    `);
    
    console.log(`\n📋 Reservas reales: ${reservasReales.rows[0].total_reservas}`);
    console.log(`💰 Ingresos reales: $${reservasReales.rows[0].ingresos_totales || 0}`);
    
    console.log('\n🎉 Limpieza completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error limpiando depósitos:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  limpiarDepositosPrueba();
}

module.exports = { limpiarDepositosPrueba };

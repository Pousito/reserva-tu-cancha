#!/usr/bin/env node

/**
 * Script para limpiar datos de prueba
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupTestData() {
  console.log('🧹 LIMPIANDO DATOS DE PRUEBA');
  console.log('============================');
  
  try {
    // Limpiar reservas de prueba
    const reservasResult = await pool.query(`
      DELETE FROM reservas 
      WHERE email_cliente LIKE '%@test.com' 
      OR nombre_cliente LIKE 'Cliente %'
      OR nombre_cliente LIKE 'Cliente Web%'
      OR nombre_cliente LIKE 'Cliente Admin%'
    `);
    console.log(`✅ Reservas de prueba eliminadas: ${reservasResult.rowCount}`);
    
    // Limpiar bloqueos temporales de prueba
    const bloqueosResult = await pool.query(`
      DELETE FROM bloqueos_temporales 
      WHERE session_id LIKE 'test-session-%'
      OR session_id LIKE 'web-session-%'
      OR session_id LIKE 'admin-session-%'
    `);
    console.log(`✅ Bloqueos temporales de prueba eliminados: ${bloqueosResult.rowCount}`);
    
    // Limpiar pagos de prueba
    const pagosResult = await pool.query(`
      DELETE FROM pagos 
      WHERE codigo_reserva IN (
        SELECT codigo_reserva FROM reservas 
        WHERE email_cliente LIKE '%@test.com'
      )
    `);
    console.log(`✅ Pagos de prueba eliminados: ${pagosResult.rowCount}`);
    
    console.log('\n✅ Limpieza de datos de prueba completada');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanupTestData();
}

module.exports = { cleanupTestData };

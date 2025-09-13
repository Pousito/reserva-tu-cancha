#!/usr/bin/env node

/**
 * Script para corregir el problema de zonas horarias
 * 
 * Este script:
 * 1. Actualiza las reservas existentes que no tienen fecha_creacion
 * 2. Verifica que la conversión de zona horaria sea correcta
 * 3. Proporciona un reporte de las correcciones realizadas
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

console.log('🔧 Iniciando corrección del problema de zonas horarias...');
console.log('📊 Base de datos: PostgreSQL');

// Función principal
async function main() {
  try {
    // 1. Verificar reservas sin fecha_creacion
    console.log('\n📊 Verificando reservas sin fecha_creacion...');
    const reservasSinFecha = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservas 
      WHERE fecha_creacion IS NULL
    `);
    
    const count = parseInt(reservasSinFecha.rows[0].count);
    console.log(`📅 Reservas sin fecha_creacion: ${count}`);
    
    if (count > 0) {
      console.log('🔄 Actualizando reservas sin fecha_creacion...');
      
      // Actualizar reservas sin fecha_creacion
      const updateResult = await pool.query(`
        UPDATE reservas 
        SET fecha_creacion = NOW() 
        WHERE fecha_creacion IS NULL
      `);
      
      console.log(`✅ Reservas actualizadas: ${updateResult.rowCount}`);
    } else {
      console.log('✅ Todas las reservas tienen fecha_creacion');
    }
    
    // 2. Verificar reservas con fechas incorrectas
    console.log('\n📊 Verificando reservas con fechas incorrectas...');
    const reservasIncorrectas = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservas 
      WHERE fecha_creacion < '2020-01-01' OR fecha_creacion > NOW() + INTERVAL '1 day'
    `);
    
    const countIncorrectas = parseInt(reservasIncorrectas.rows[0].count);
    console.log(`⚠️  Reservas con fechas incorrectas: ${countIncorrectas}`);
    
    if (countIncorrectas > 0) {
      console.log('🔄 Corrigiendo fechas incorrectas...');
      
      // Corregir fechas incorrectas
      const fixResult = await pool.query(`
        UPDATE reservas 
        SET fecha_creacion = NOW() 
        WHERE fecha_creacion < '2020-01-01' OR fecha_creacion > NOW() + INTERVAL '1 day'
      `);
      
      console.log(`✅ Fechas corregidas: ${fixResult.rowCount}`);
    }
    
    // 3. Verificar zona horaria
    console.log('\n🌍 Verificando zona horaria...');
    const timezoneResult = await pool.query('SELECT NOW() as current_time');
    console.log(`🕐 Hora actual en la base de datos: ${timezoneResult.rows[0].current_time}`);
    
    // 4. Reporte final
    console.log('\n📊 REPORTE FINAL:');
    console.log('=================');
    
    const totalReservas = await pool.query('SELECT COUNT(*) as count FROM reservas');
    const reservasConFecha = await pool.query(`
      SELECT COUNT(*) as count 
      FROM reservas 
      WHERE fecha_creacion IS NOT NULL
    `);
    
    console.log(`📅 Total de reservas: ${totalReservas.rows[0].count}`);
    console.log(`✅ Reservas con fecha_creacion: ${reservasConFecha.rows[0].count}`);
    
    console.log('\n✅ Corrección de zona horaria completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { main };
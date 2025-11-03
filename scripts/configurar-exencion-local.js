/**
 * Script para configurar exención de comisiones en desarrollo local
 * Ejecutar: node scripts/configurar-exencion-local.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable'
});

async function configurarExencion() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Configurando exención de comisiones para desarrollo local...\n');
    
    await client.query('BEGIN');
    
    // 1. Agregar columna si no existe
    console.log('📋 1. Verificando columna comision_inicio_fecha...');
    const colExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'complejos' 
      AND column_name = 'comision_inicio_fecha'
    `);
    
    if (!colExists.rows || colExists.rows.length === 0) {
      await client.query(`ALTER TABLE complejos ADD COLUMN comision_inicio_fecha DATE`);
      console.log('   ✅ Columna agregada');
    } else {
      console.log('   ✅ Columna ya existe');
    }
    
    // 2. Configurar fecha para Borde Río (complejo ID 7)
    console.log('\n📋 2. Configurando fecha para Espacio Deportivo Borde Río...');
    const updateResult = await client.query(`
      UPDATE complejos 
      SET comision_inicio_fecha = '2026-01-01' 
      WHERE id = 7 AND nombre = 'Espacio Deportivo Borde Río'
      RETURNING id, nombre, comision_inicio_fecha
    `);
    
    if (updateResult.rows.length > 0) {
      console.log('   ✅ Fecha configurada:', updateResult.rows[0]);
    } else {
      console.log('   ⚠️ Complejo no encontrado, verificando complejos existentes...');
      const complejos = await client.query('SELECT id, nombre FROM complejos WHERE nombre LIKE %Borde%');
      console.log('   📊 Complejos encontrados:', complejos.rows);
    }
    
    // 3. Corregir reservas existentes
    console.log('\n📋 3. Corrigiendo reservas existentes...');
    const updateReservas = await client.query(`
      UPDATE reservas 
      SET comision_aplicada = 0 
      FROM canchas c
      WHERE reservas.cancha_id = c.id 
      AND c.complejo_id = 7
      AND reservas.fecha < '2026-01-01'
      AND reservas.comision_aplicada > 0
      RETURNING reservas.codigo_reserva, reservas.fecha, reservas.comision_aplicada
    `);
    
    console.log(`   ✅ ${updateReservas.rows.length} reservas corregidas`);
    if (updateReservas.rows.length > 0) {
      console.log('   📋 Reservas corregidas:');
      updateReservas.rows.forEach(r => {
        console.log(`      - ${r.codigo_reserva}: ${r.fecha} → comisión: ${r.comision_aplicada}`);
      });
    }
    
    await client.query('COMMIT');
    
    // 4. Verificar
    console.log('\n📋 4. Verificando configuración...');
    const verificar = await client.query(`
      SELECT 
        r.codigo_reserva,
        r.fecha,
        r.comision_aplicada,
        comp.nombre as complejo_nombre,
        comp.comision_inicio_fecha
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos comp ON c.complejo_id = comp.id
      WHERE comp.id = 7
      AND r.fecha < '2026-01-01'
      ORDER BY r.fecha DESC
      LIMIT 5
    `);
    
    console.log(`   📊 Total reservas verificadas: ${verificar.rows.length}`);
    if (verificar.rows.length > 0) {
      console.log('   📋 Últimas reservas:');
      verificar.rows.forEach(r => {
        const fechaStr = r.fecha instanceof Date ? r.fecha.toISOString().substring(0, 10) : (r.fecha || '').substring(0, 10);
        console.log(`      - ${r.codigo_reserva}: ${fechaStr} → comisión: $${r.comision_aplicada}`);
      });
    }
    
    const complejo = await client.query('SELECT id, nombre, comision_inicio_fecha FROM complejos WHERE id = 7');
    if (complejo.rows.length > 0) {
      console.log('\n✅ CONFIGURACIÓN COMPLETA');
      console.log('========================');
      console.log(`Complejo: ${complejo.rows[0].nombre}`);
      console.log(`Fecha inicio comisiones: ${complejo.rows[0].comision_inicio_fecha}`);
      console.log(`✅ Exento hasta: 2025-12-31`);
      console.log(`✅ Comisiones desde: 2026-01-01`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

configurarExencion()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


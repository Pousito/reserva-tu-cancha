/**
 * Script para disparar el trigger y sincronizar egresos de comisión
 * Ejecutar: node scripts/disparar-trigger-comisiones.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable'
});

async function dispararTrigger() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Disparando trigger para sincronizar egresos de comisión...\n');
    
    await client.query('BEGIN');
    
    // Actualizar las reservas para disparar el trigger (actualizar comision_aplicada con el mismo valor)
    const reservasExentas = await client.query(`
      SELECT r.id, r.codigo_reserva, r.comision_aplicada
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE c.complejo_id = 7
      AND r.fecha < '2026-01-01'
      AND r.comision_aplicada = 0
    `);
    
    console.log(`📊 Reservas exentas encontradas: ${reservasExentas.rows.length}\n`);
    
    let actualizadas = 0;
    for (const reserva of reservasExentas.rows) {
      // Actualizar el campo comision_aplicada para disparar el trigger
      await client.query(`
        UPDATE reservas 
        SET comision_aplicada = 0
        WHERE id = $1
      `, [reserva.id]);
      actualizadas++;
    }
    
    await client.query('COMMIT');
    
    console.log(`✅ ${actualizadas} reservas actualizadas - trigger disparado\n`);
    
    // Verificar egresos restantes
    const egresosRestantes = await client.query(`
      SELECT 
        gi.id,
        gi.descripcion,
        gi.monto,
        r.codigo_reserva,
        r.comision_aplicada
      FROM gastos_ingresos gi
      JOIN reservas r ON gi.descripcion LIKE '%Comisión Reserva #' || r.codigo_reserva || '%'
      JOIN canchas c ON r.cancha_id = c.id
      WHERE c.complejo_id = 7
      AND gi.tipo = 'gasto'
      AND gi.descripcion LIKE 'Comisión Reserva #%'
      AND r.fecha < '2026-01-01'
      ORDER BY gi.fecha DESC
    `);
    
    if (egresosRestantes.rows.length === 0) {
      console.log('✅ No quedan egresos de comisión para reservas exentas');
    } else {
      console.log(`⚠️ Aún quedan ${egresosRestantes.rows.length} egresos:`);
      egresosRestantes.rows.forEach(e => {
        console.log(`   - ${e.codigo_reserva}: $${e.monto}`);
      });
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

dispararTrigger()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


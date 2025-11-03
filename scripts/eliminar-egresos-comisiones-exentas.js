/**
 * Script para eliminar egresos de comisión de reservas exentas
 * Ejecutar: node scripts/eliminar-egresos-comisiones-exentas.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable'
});

async function eliminarEgresosExentos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Buscando egresos de comisión para reservas exentas...\n');
    
    await client.query('BEGIN');
    
    // 1. Buscar egresos de comisión del complejo 7 con fecha < 2026-01-01
    const egresosExentos = await client.query(`
      SELECT 
        gi.id,
        gi.descripcion,
        gi.monto,
        gi.fecha,
        r.codigo_reserva,
        r.comision_aplicada,
        r.fecha as fecha_reserva
      FROM gastos_ingresos gi
      JOIN reservas r ON gi.descripcion LIKE '%Comisión Reserva #' || r.codigo_reserva || '%'
      JOIN canchas c ON r.cancha_id = c.id
      WHERE c.complejo_id = 7
      AND gi.tipo = 'gasto'
      AND gi.descripcion LIKE 'Comisión Reserva #%'
      AND r.fecha < '2026-01-01'
      AND r.comision_aplicada = 0
      ORDER BY gi.fecha DESC
    `);
    
    console.log(`📊 Egresos encontrados a eliminar: ${egresosExentos.rows.length}\n`);
    
    if (egresosExentos.rows.length > 0) {
      console.log('📋 Egresos a eliminar:');
      egresosExentos.rows.forEach(egreso => {
        const fechaStr = egreso.fecha_reserva instanceof Date ? 
          egreso.fecha_reserva.toISOString().substring(0, 10) : 
          (egreso.fecha_reserva || '').substring(0, 10);
        console.log(`   - ${egreso.codigo_reserva} (${fechaStr}): $${egreso.monto} - ${egreso.descripcion}`);
      });
      
      // 2. Eliminar los egresos
      const idsAEliminar = egresosExentos.rows.map(e => e.id);
      const resultado = await client.query(`
        DELETE FROM gastos_ingresos 
        WHERE id = ANY($1::int[])
        RETURNING id, descripcion, monto
      `, [idsAEliminar]);
      
      await client.query('COMMIT');
      
      console.log(`\n✅ ${resultado.rows.length} egresos eliminados exitosamente\n`);
      
      console.log('📋 Egresos eliminados:');
      resultado.rows.forEach(e => {
        console.log(`   - $${e.monto}: ${e.descripcion}`);
      });
      
    } else {
      await client.query('COMMIT');
      console.log('✅ No hay egresos que eliminar');
    }
    
    // 3. Verificar que no queden egresos incorrectos
    console.log('\n🔍 Verificando que no queden egresos incorrectos...');
    const egresosRestantes = await client.query(`
      SELECT 
        gi.id,
        gi.descripcion,
        gi.monto,
        r.codigo_reserva,
        r.comision_aplicada,
        r.fecha as fecha_reserva
      FROM gastos_ingresos gi
      JOIN reservas r ON gi.descripcion LIKE '%Comisión Reserva #' || r.codigo_reserva || '%'
      JOIN canchas c ON r.cancha_id = c.id
      WHERE c.complejo_id = 7
      AND gi.tipo = 'gasto'
      AND gi.descripcion LIKE 'Comisión Reserva #%'
      AND r.fecha < '2026-01-01'
      ORDER BY gi.fecha DESC
    `);
    
    if (egresosRestantes.rows.length > 0) {
      const incorrectos = egresosRestantes.rows.filter(e => parseFloat(e.comision_aplicada) === 0);
      if (incorrectos.length > 0) {
        console.log(`⚠️ Aún quedan ${incorrectos.length} egresos incorrectos:`);
        incorrectos.forEach(e => {
          const fechaStr = e.fecha_reserva instanceof Date ? 
            e.fecha_reserva.toISOString().substring(0, 10) : 
            (e.fecha_reserva || '').substring(0, 10);
          console.log(`   - ${e.codigo_reserva} (${fechaStr}): $${e.monto}`);
        });
      } else {
        console.log('✅ No quedan egresos incorrectos');
      }
    } else {
      console.log('✅ No quedan egresos para reservas exentas');
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

eliminarEgresosExentos()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


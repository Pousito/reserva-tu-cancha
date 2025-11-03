/**
 * Script para verificar y corregir todas las reservas antiguas del complejo Borde Río
 * Ejecutar: node scripts/verificar-reservas-comisiones.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable'
});

async function verificarYCorregir() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando reservas del complejo Espacio Deportivo Borde Río...\n');
    
    // 1. Verificar todas las reservas del complejo 7
    const todasReservas = await client.query(`
      SELECT 
        r.id,
        r.codigo_reserva,
        r.fecha,
        r.comision_aplicada,
        r.precio_total,
        r.tipo_reserva,
        r.estado,
        comp.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos comp ON c.complejo_id = comp.id
      WHERE comp.id = 7
      ORDER BY r.fecha DESC
    `);
    
    console.log(`📊 Total reservas encontradas: ${todasReservas.rows.length}\n`);
    
    // 2. Separar reservas que deben estar exentas (fecha < 2026-01-01)
    const reservasExentas = todasReservas.rows.filter(r => {
      const fecha = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
      return fecha < new Date('2026-01-01');
    });
    
    const reservasConComision = reservasExentas.filter(r => parseFloat(r.comision_aplicada) > 0);
    
    console.log(`📋 Reservas que deben estar exentas (fecha < 2026-01-01): ${reservasExentas.length}`);
    console.log(`❌ Reservas con comisión que necesitan corrección: ${reservasConComision.length}\n`);
    
    if (reservasConComision.length > 0) {
      console.log('📋 Reservas a corregir:');
      reservasConComision.forEach(r => {
        const fechaStr = r.fecha instanceof Date ? r.fecha.toISOString().substring(0, 10) : (r.fecha || '').substring(0, 10);
        console.log(`   - ${r.codigo_reserva}: ${fechaStr} | Comisión actual: $${r.comision_aplicada} | Precio: $${r.precio_total}`);
      });
      
      console.log('\n🔧 Corrigiendo reservas...');
      await client.query('BEGIN');
      
      const correccion = await client.query(`
        UPDATE reservas 
        SET comision_aplicada = 0 
        FROM canchas c
        WHERE reservas.cancha_id = c.id 
        AND c.complejo_id = 7
        AND reservas.fecha < '2026-01-01'
        AND reservas.comision_aplicada > 0
        RETURNING reservas.codigo_reserva, reservas.comision_aplicada
      `);
      
      await client.query('COMMIT');
      
      console.log(`✅ ${correccion.rows.length} reservas corregidas\n`);
      
      // Verificar corrección
      const verificacion = await client.query(`
        SELECT 
          r.codigo_reserva,
          r.fecha,
          r.comision_aplicada
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        JOIN complejos comp ON c.complejo_id = comp.id
        WHERE comp.id = 7
        AND r.fecha < '2026-01-01'
        ORDER BY r.fecha DESC
      `);
      
      const aunConComision = verificacion.rows.filter(r => parseFloat(r.comision_aplicada) > 0);
      
      if (aunConComision.length === 0) {
        console.log('✅ Todas las reservas exentas están correctas (comisión = 0)');
      } else {
        console.log(`⚠️ Aún quedan ${aunConComision.length} reservas con comisión:`);
        aunConComision.forEach(r => {
          const fechaStr = r.fecha instanceof Date ? r.fecha.toISOString().substring(0, 10) : (r.fecha || '').substring(0, 10);
          console.log(`   - ${r.codigo_reserva}: ${fechaStr} | Comisión: $${r.comision_aplicada}`);
        });
      }
      
    } else {
      console.log('✅ No hay reservas que necesiten corrección');
    }
    
    // 3. Resumen final
    console.log('\n📊 RESUMEN FINAL');
    console.log('================');
    
    const resumen = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN r.fecha < '2026-01-01' THEN 1 END) as antes_2026,
        COUNT(CASE WHEN r.fecha >= '2026-01-01' THEN 1 END) as desde_2026,
        COUNT(CASE WHEN r.fecha < '2026-01-01' AND r.comision_aplicada = 0 THEN 1 END) as exentas_correctas,
        COUNT(CASE WHEN r.fecha < '2026-01-01' AND r.comision_aplicada > 0 THEN 1 END) as exentas_con_comision,
        SUM(CASE WHEN r.fecha < '2026-01-01' THEN r.comision_aplicada ELSE 0 END) as comision_total_exentas
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE c.complejo_id = 7
    `);
    
    const stats = resumen.rows[0];
    console.log(`Total reservas: ${stats.total}`);
    console.log(`Antes de 2026-01-01: ${stats.antes_2026} (deben estar exentas)`);
    console.log(`Desde 2026-01-01: ${stats.desde_2026} (comisiones aplicadas)`);
    console.log(`✅ Exentas correctas (comisión = 0): ${stats.exentas_correctas}`);
    if (stats.exentas_con_comision > 0) {
      console.log(`❌ Exentas con comisión: ${stats.exentas_con_comision} (${stats.comision_total_exentas || 0})`);
    } else {
      console.log(`✅ Todas las exentas están correctas`);
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

verificarYCorregir()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });


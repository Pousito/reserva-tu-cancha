#!/usr/bin/env node

/**
 * Script para registrar retroactivamente los movimientos financieros
 * de reservas existentes que no tienen movimientos registrados
 * Fecha: $(date)
 * Descripción: Registra ingresos y egresos por comisiones para reservas confirmadas
 */

const { Pool } = require('pg');

console.log('💰 ================================================');
console.log('💰 REGISTRANDO MOVIMIENTOS FINANCIEROS RETROACTIVOS');
console.log('💰 ================================================');

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable',
  ssl: false
});

async function registrarMovimientosRetroactivos() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Buscando reservas confirmadas sin movimientos financieros...');
    
    // Buscar reservas confirmadas que no tienen movimientos financieros registrados
    const reservasSinMovimientos = await client.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, co.id as complejo_id
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.estado = 'confirmada'
      AND NOT EXISTS (
        SELECT 1 FROM gastos_ingresos gi
        WHERE gi.complejo_id = co.id
        AND gi.descripcion LIKE '%' || r.codigo_reserva || '%'
      )
      ORDER BY r.fecha_creacion DESC
    `);
    
    console.log(`📊 Reservas encontradas sin movimientos: ${reservasSinMovimientos.rows.length}`);
    
    if (reservasSinMovimientos.rows.length === 0) {
      console.log('✅ No hay reservas pendientes de registro financiero');
      return;
    }
    
    let registradas = 0;
    let errores = 0;
    
    for (const reserva of reservasSinMovimientos.rows) {
      try {
        console.log(`\n💰 Procesando reserva: ${reserva.codigo_reserva} - ${reserva.nombre_cliente}`);
        
        const complejoId = reserva.complejo_id;
        const fechaReserva = new Date(reserva.fecha);
        const montoReserva = parseFloat(reserva.precio_total);
        const comision = parseFloat(reserva.comision_aplicada) || 0;
        
        // Obtener las categorías del complejo
        const categoriaIngreso = await client.query(
          'SELECT id FROM categorias_gastos WHERE complejo_id = $1 AND tipo = $2 AND nombre = $3',
          [complejoId, 'ingreso', 'Reservas Web']
        );
        
        const categoriaEgreso = await client.query(
          'SELECT id FROM categorias_gastos WHERE complejo_id = $1 AND tipo = $2 AND nombre = $3',
          [complejoId, 'gasto', 'Comisión Plataforma']
        );
        
        if (categoriaIngreso.rows.length === 0 || categoriaEgreso.rows.length === 0) {
          console.log(`⚠️ Categorías financieras no encontradas para complejo ${complejoId} - Saltando`);
          continue;
        }
        
        // Registrar ingreso por la reserva
        await client.query(`
          INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          complejoId,
          categoriaIngreso.rows[0].id,
          'ingreso',
          montoReserva,
          fechaReserva,
          `Reserva ${reserva.codigo_reserva} - ${reserva.nombre_cliente}`,
          'Web'
        ]);
        
        console.log(`   ✅ Ingreso registrado: $${montoReserva.toLocaleString()}`);
        
        // Registrar egreso por comisión (solo si hay comisión)
        if (comision > 0) {
          await client.query(`
            INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            complejoId,
            categoriaEgreso.rows[0].id,
            'gasto',
            comision,
            fechaReserva,
            `Comisión plataforma - Reserva ${reserva.codigo_reserva}`,
            'Automático'
          ]);
          
          console.log(`   ✅ Egreso por comisión registrado: $${comision.toLocaleString()}`);
        }
        
        registradas++;
        
      } catch (error) {
        console.error(`   ❌ Error procesando reserva ${reserva.codigo_reserva}:`, error.message);
        errores++;
      }
    }
    
    console.log('\n🎉 ================================================');
    console.log('🎉 REGISTRO RETROACTIVO COMPLETADO');
    console.log('🎉 ================================================');
    console.log(`💰 Reservas procesadas: ${registradas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total reservas encontradas: ${reservasSinMovimientos.rows.length}`);
    
    if (registradas > 0) {
      console.log('\n✅ Los movimientos financieros han sido registrados en el control financiero');
      console.log('💡 Puedes verificar los ingresos y egresos en el panel de administración');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR ejecutando script:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar registro retroactivo
registrarMovimientosRetroactivos()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

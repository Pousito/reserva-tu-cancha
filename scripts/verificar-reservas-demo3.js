const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verificarReservasDemo3() {
  const client = await pool.connect();
  try {
    console.log('🔍 ================================================');
    console.log('🔍 VERIFICANDO RESERVAS DEL COMPLEJO DEMO 3');
    console.log('🔍 ================================================');

    // 1. Buscar todas las reservas del Complejo Demo 3
    console.log('📋 Buscando reservas del Complejo Demo 3...');
    const reservas = await client.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE co.nombre LIKE '%Demo 3%'
      ORDER BY r.created_at DESC
    `);
    
    console.log(`📊 Total reservas encontradas: ${reservas.rows.length}`);
    
    if (reservas.rows.length === 0) {
      console.log('❌ No se encontraron reservas para el Complejo Demo 3');
      
      // Verificar si hay reservas en general
      console.log('\n🔍 Verificando todas las reservas...');
      const todasReservas = await client.query(`
        SELECT r.codigo_reserva, r.estado, r.precio_total, co.nombre as complejo_nombre
        FROM reservas r 
        JOIN canchas c ON r.cancha_id = c.id 
        JOIN complejos co ON c.complejo_id = co.id 
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      
      console.log(`📊 Total reservas en el sistema: ${todasReservas.rows.length}`);
      todasReservas.rows.forEach(r => {
        console.log(`   ${r.codigo_reserva} - ${r.complejo_nombre} - $${r.precio_total} - ${r.estado}`);
      });
      
      return;
    }
    
    // 2. Mostrar detalles de cada reserva
    reservas.rows.forEach((reserva, index) => {
      console.log(`\n📋 Reserva ${index + 1}:`);
      console.log(`   Código: ${reserva.codigo_reserva}`);
      console.log(`   Estado: ${reserva.estado}`);
      console.log(`   Precio Total: $${reserva.precio_total}`);
      console.log(`   Comisión: $${reserva.comision_aplicada}`);
      console.log(`   Complejo ID: ${reserva.complejo_id}`);
      console.log(`   Complejo Nombre: ${reserva.complejo_nombre}`);
      console.log(`   Fecha: ${reserva.fecha}`);
      console.log(`   Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
      console.log(`   Cliente: ${reserva.nombre_cliente}`);
    });
    
    // 3. Verificar movimientos financieros para cada reserva
    console.log('\n💰 Verificando movimientos financieros...');
    for (const reserva of reservas.rows) {
      console.log(`\n🔍 Reserva ${reserva.codigo_reserva}:`);
      
      const movimientos = await client.query(`
        SELECT gi.*, cg.nombre as categoria_nombre, cg.tipo as categoria_tipo
        FROM gastos_ingresos gi
        JOIN categorias_gastos cg ON gi.categoria_id = cg.id
        WHERE gi.complejo_id = $1 
        AND gi.descripcion LIKE $2
        ORDER BY gi.fecha DESC
      `, [reserva.complejo_id, `%${reserva.codigo_reserva}%`]);
      
      console.log(`   Movimientos: ${movimientos.rows.length}`);
      if (movimientos.rows.length > 0) {
        movimientos.rows.forEach(m => {
          console.log(`     - ${m.tipo}: $${m.monto} - ${m.descripcion}`);
        });
      } else {
        console.log(`     ❌ No hay movimientos financieros registrados`);
      }
    }
    
    // 4. Buscar específicamente la reserva 1XJAKD
    console.log('\n🔍 Buscando específicamente la reserva 1XJAKD...');
    const reserva1XJAKD = await client.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE r.codigo_reserva = $1
    `, ['1XJAKD']);
    
    if (reserva1XJAKD.rows.length > 0) {
      console.log('✅ Reserva 1XJAKD encontrada:');
      const r = reserva1XJAKD.rows[0];
      console.log(`   Estado: ${r.estado}`);
      console.log(`   Precio Total: $${r.precio_total}`);
      console.log(`   Complejo ID: ${r.complejo_id}`);
      console.log(`   Complejo Nombre: ${r.complejo_nombre}`);
    } else {
      console.log('❌ Reserva 1XJAKD no encontrada');
    }

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

verificarReservasDemo3();



const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function registrarMovimientosReserva1XJAKD() {
  const client = await pool.connect();
  try {
    console.log('💰 ================================================');
    console.log('💰 REGISTRANDO MOVIMIENTOS FINANCIEROS - RESERVA 1XJAKD');
    console.log('💰 ================================================');

    const codigoReserva = '1XJAKD';

    // 1. Buscar la reserva
    console.log(`🔍 Buscando reserva: ${codigoReserva}`);
    const reserva = await client.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE r.codigo_reserva = $1
    `, [codigoReserva]);
    
    if (reserva.rows.length === 0) {
      console.error(`❌ Reserva ${codigoReserva} no encontrada.`);
      return;
    }
    
    const reservaInfo = reserva.rows[0];
    console.log('📋 Reserva encontrada:');
    console.log(`   Código: ${reservaInfo.codigo_reserva}`);
    console.log(`   Estado: ${reservaInfo.estado}`);
    console.log(`   Precio Total: ${reservaInfo.precio_total}`);
    console.log(`   Comisión: ${reservaInfo.comision_aplicada}`);
    console.log(`   Complejo ID: ${reservaInfo.complejo_id}`);
    console.log(`   Complejo Nombre: ${reservaInfo.complejo_nombre}`);
    
    // 2. Buscar categorías financieras del complejo
    console.log(`\n🔍 Buscando categorías para complejo ID: ${reservaInfo.complejo_id}`);
    const categorias = await client.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [reservaInfo.complejo_id]);
    
    console.log(`📊 Categorías encontradas: ${categorias.rows.length}`);
    categorias.rows.forEach(c => {
      console.log(`   - ${c.nombre} (${c.tipo}) - ID: ${c.id}`);
    });
    
    if (categorias.rows.length === 0) {
      console.error('❌ No hay categorías financieras configuradas para este complejo');
      return;
    }
    
    // 3. Buscar categorías específicas
    const categoriaIngreso = categorias.rows.find(c => c.nombre === 'Reservas Web' && c.tipo === 'ingreso');
    const categoriaEgreso = categorias.rows.find(c => c.nombre === 'Comisión Plataforma' && c.tipo === 'gasto');
    
    if (!categoriaIngreso || !categoriaEgreso) {
      console.error('❌ Categorías financieras incompletas:');
      console.error(`   Categoría Ingreso encontrada: ${!!categoriaIngreso}`);
      console.error(`   Categoría Egreso encontrada: ${!!categoriaEgreso}`);
      return;
    }
    
    console.log('✅ Categorías financieras encontradas:');
    console.log(`   Ingreso: ${categoriaIngreso.nombre} (ID: ${categoriaIngreso.id})`);
    console.log(`   Egreso: ${categoriaEgreso.nombre} (ID: ${categoriaEgreso.id})`);
    
    // 4. Verificar si ya existen movimientos para esta reserva
    console.log('\n🔍 Verificando movimientos existentes...');
    const movimientosExistentes = await client.query(`
      SELECT * FROM gastos_ingresos 
      WHERE complejo_id = $1 
      AND descripcion LIKE $2
      ORDER BY fecha DESC
    `, [reservaInfo.complejo_id, `%${codigoReserva}%`]);
    
    console.log(`📊 Movimientos existentes: ${movimientosExistentes.rows.length}`);
    if (movimientosExistentes.rows.length > 0) {
      console.log('⚠️ Ya existen movimientos para esta reserva:');
      movimientosExistentes.rows.forEach(m => {
        console.log(`   - ${m.tipo}: $${m.monto} - ${m.descripcion}`);
      });
      console.log('❌ No se crearán movimientos duplicados');
      return;
    }
    
    // 5. Registrar movimientos financieros
    console.log('\n💰 Registrando movimientos financieros...');
    const fechaReserva = new Date(reservaInfo.fecha);
    const montoReserva = parseFloat(reservaInfo.precio_total);
    const comision = parseFloat(reservaInfo.comision_aplicada) || 0;
    
    const movimientosCreados = [];
    
    // Ingreso por reserva
    console.log(`➕ Registrando ingreso: $${montoReserva}`);
    const ingresoResult = await client.query(`
      INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, monto, descripcion
    `, [
      reservaInfo.complejo_id, 
      categoriaIngreso.id, 
      'ingreso', 
      montoReserva, 
      fechaReserva,
      `Reserva ${reservaInfo.codigo_reserva} - ${reservaInfo.nombre_cliente}`, 
      'Web'
    ]);
    
    const ingreso = ingresoResult.rows[0];
    movimientosCreados.push({
      tipo: 'ingreso',
      monto: ingreso.monto,
      descripcion: ingreso.descripcion,
      id: ingreso.id
    });
    
    console.log(`✅ Ingreso registrado: ID ${ingreso.id} - $${ingreso.monto}`);
    
    // Egreso por comisión (si existe)
    if (comision > 0) {
      console.log(`➕ Registrando egreso por comisión: $${comision}`);
      const egresoResult = await client.query(`
        INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, monto, descripcion
      `, [
        reservaInfo.complejo_id, 
        categoriaEgreso.id, 
        'gasto', 
        comision, 
        fechaReserva,
        `Comisión plataforma - Reserva ${reservaInfo.codigo_reserva}`, 
        'Automático'
      ]);
      
      const egreso = egresoResult.rows[0];
      movimientosCreados.push({
        tipo: 'gasto',
        monto: egreso.monto,
        descripcion: egreso.descripcion,
        id: egreso.id
      });
      
      console.log(`✅ Egreso registrado: ID ${egreso.id} - $${egreso.monto}`);
    }
    
    console.log('\n🎉 ================================================');
    console.log('🎉 MOVIMIENTOS FINANCIEROS REGISTRADOS EXITOSAMENTE');
    console.log('🎉 ================================================');
    console.log(`📋 Reserva: ${codigoReserva}`);
    console.log(`🏟️  Complejo: ${reservaInfo.complejo_nombre} (ID: ${reservaInfo.complejo_id})`);
    console.log(`💰 Total movimientos: ${movimientosCreados.length}`);
    
    movimientosCreados.forEach(m => {
      console.log(`   ${m.tipo.toUpperCase()}: $${m.monto} - ${m.descripcion}`);
    });
    
    console.log('\n💡 Los movimientos financieros ahora aparecerán en el control financiero');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

registrarMovimientosReserva1XJAKD();



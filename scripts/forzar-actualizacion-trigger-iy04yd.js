// Script para forzar actualización del trigger para IY04YD
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function forzarActualizacionTrigger() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Forzando actualización del trigger para IY04YD...');
    
    // Obtener datos de la reserva
    const reservaResult = await client.query(`
      SELECT r.*, c.complejo_id, c.nombre as cancha_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE r.codigo_reserva = 'IY04YD'
    `);
    
    if (!reservaResult.rows || reservaResult.rows.length === 0) {
      console.log('❌ Reserva IY04YD no encontrada');
      await client.query('ROLLBACK');
      return;
    }
    
    const reserva = reservaResult.rows[0];
    console.log('📋 Datos de la reserva:', {
      estado: reserva.estado,
      monto_abonado: reserva.monto_abonado,
      metodo_pago: reserva.metodo_pago,
      tipo_reserva: reserva.tipo_reserva
    });
    
    // Forzar actualización de la reserva para que el trigger se ejecute
    // Actualizar monto_abonado con el mismo valor para disparar el trigger
    const updateResult = await client.query(`
      UPDATE reservas
      SET monto_abonado = monto_abonado,
          metodo_pago = metodo_pago
      WHERE codigo_reserva = 'IY04YD'
      RETURNING codigo_reserva, monto_abonado, metodo_pago
    `);
    
    console.log('✅ Reserva actualizada para disparar trigger:', updateResult.rows[0]);
    
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar el ingreso después del trigger
    const ingresoResult = await client.query(`
      SELECT * FROM gastos_ingresos
      WHERE descripcion LIKE '%IY04YD%' AND tipo = 'ingreso'
    `);
    
    console.log('\n📊 Ingreso después del trigger:');
    if (ingresoResult.rows.length > 0) {
      console.log(JSON.stringify(ingresoResult.rows[0], null, 2));
    } else {
      console.log('❌ Ingreso no encontrado después del trigger');
    }
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

forzarActualizacionTrigger()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


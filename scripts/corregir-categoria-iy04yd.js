// Script para corregir el ingreso de IY04YD para que use la categoría correcta
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function corregirCategoriaIY04YD() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Corrigiendo categoría del ingreso IY04YD...');
    
    // Obtener datos de la reserva
    const reservaResult = await client.query(`
      SELECT r.tipo_reserva, c.complejo_id as complejo_id_cancha
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
      tipo_reserva: reserva.tipo_reserva,
      complejo_id: reserva.complejo_id_cancha
    });
    
    // Obtener la categoría correcta según el tipo de reserva
    const categoriaNombre = reserva.tipo_reserva === 'administrativa' 
      ? 'Reservas Administrativas' 
      : 'Reservas Web';
    
    const categoriaResult = await client.query(`
      SELECT id FROM categorias_gastos
      WHERE complejo_id = $1
      AND tipo = 'ingreso'
      AND nombre = $2
      LIMIT 1
    `, [reserva.complejo_id_cancha, categoriaNombre]);
    
    if (!categoriaResult.rows || categoriaResult.rows.length === 0) {
      console.log(`❌ Categoría "${categoriaNombre}" no encontrada para complejo ${reserva.complejo_id_cancha}`);
      await client.query('ROLLBACK');
      return;
    }
    
    const categoriaId = categoriaResult.rows[0].id;
    console.log(`✅ Categoría encontrada: "${categoriaNombre}" (ID: ${categoriaId})`);
    
    // Obtener el ingreso actual
    const ingresoActual = await client.query(`
      SELECT id, categoria_id FROM gastos_ingresos
      WHERE descripcion LIKE '%IY04YD%' AND tipo = 'ingreso'
      LIMIT 1
    `);
    
    if (!ingresoActual.rows || ingresoActual.rows.length === 0) {
      console.log('❌ Ingreso IY04YD no encontrado');
      await client.query('ROLLBACK');
      return;
    }
    
    const ingresoId = ingresoActual.rows[0].id;
    const categoriaActualId = ingresoActual.rows[0].categoria_id;
    
    console.log(`📊 Ingreso actual: ID ${ingresoId}, Categoría actual: ${categoriaActualId}`);
    
    // Actualizar la categoría
    const updateResult = await client.query(`
      UPDATE gastos_ingresos
      SET categoria_id = $1,
          actualizado_en = NOW()
      WHERE id = $2
      RETURNING id, categoria_id
    `, [categoriaId, ingresoId]);
    
    console.log('✅ Ingreso actualizado:', updateResult.rows[0]);
    
    // Verificar la categoría actualizada
    const categoriaActualizada = await client.query(`
      SELECT cg.nombre FROM gastos_ingresos gi
      JOIN categorias_gastos cg ON gi.categoria_id = cg.id
      WHERE gi.id = $1
    `, [ingresoId]);
    
    console.log(`✅ Categoría actualizada a: "${categoriaActualizada.rows[0].nombre}"`);
    
    await client.query('COMMIT');
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

corregirCategoriaIY04YD()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


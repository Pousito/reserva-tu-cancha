// Script para normalizar métodos de pago de reservas web directamente en la base de datos
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function normalizarMetodosPago() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Normalizando métodos de pago de reservas web...');
    
    // Estrategia 1: Actualizar ingresos de reservas web usando JOIN con reservas
    const updateQuery1 = `
      UPDATE gastos_ingresos gi
      SET metodo_pago = 'webpay'
      FROM reservas r
      WHERE gi.descripcion LIKE '%Reserva #' || r.codigo_reserva || '%'
      AND gi.tipo = 'ingreso'
      AND r.tipo_reserva = 'directa'
      AND (LOWER(gi.metodo_pago) = 'web' OR LOWER(gi.metodo_pago) = 'automatico' OR gi.metodo_pago = 'Automático')
      AND gi.metodo_pago != 'webpay'
    `;
    
    const result1 = await client.query(updateQuery1);
    console.log(`✅ Actualizados ${result1.rowCount} registros usando JOIN con reservas`);
    
    // Estrategia 2: Actualizar ingresos que tienen descripción de reserva pero no coinciden con JOIN
    // Buscar ingresos que tienen "Reserva #" en la descripción y están en categoría "Reservas Web"
    const updateQuery2 = `
      UPDATE gastos_ingresos gi
      SET metodo_pago = 'webpay'
      FROM categorias_gastos cg
      WHERE gi.categoria_id = cg.id
      AND cg.nombre = 'Reservas Web'
      AND gi.tipo = 'ingreso'
      AND gi.descripcion LIKE 'Reserva%'
      AND (LOWER(gi.metodo_pago) = 'web' OR LOWER(gi.metodo_pago) = 'automatico' OR gi.metodo_pago = 'Automático')
      AND gi.metodo_pago != 'webpay'
    `;
    
    const result2 = await client.query(updateQuery2);
    console.log(`✅ Actualizados ${result2.rowCount} registros usando categoría "Reservas Web"`);
    
    await client.query('COMMIT');
    
    const totalActualizados = result1.rowCount + result2.rowCount;
    console.log(`\n✅ Métodos de pago normalizados: ${totalActualizados} registros actualizados en total`);
    
    // Verificar resultados
    const verificacion = await client.query(`
      SELECT metodo_pago, COUNT(*) as cantidad
      FROM gastos_ingresos
      WHERE descripcion LIKE 'Reserva%'
      AND tipo = 'ingreso'
      GROUP BY metodo_pago
      ORDER BY cantidad DESC
    `);
    
    console.log('\n📊 Estado actual de métodos de pago en reservas:');
    verificacion.rows.forEach(row => {
      console.log(`   ${row.metodo_pago || '(null)'}: ${row.cantidad} registros`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error normalizando métodos de pago:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

normalizarMetodosPago()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


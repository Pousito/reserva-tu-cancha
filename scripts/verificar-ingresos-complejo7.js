// Script para verificar ingreso IY04YD y otros ingresos del complejo 7
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarIngresos() {
  const client = await pool.connect();
  try {
    // Verificar ingreso IY04YD
    const iy04yd = await client.query(`
      SELECT gi.*, cg.nombre as categoria_nombre 
      FROM gastos_ingresos gi 
      JOIN categorias_gastos cg ON gi.categoria_id = cg.id 
      WHERE gi.descripcion LIKE '%IY04YD%' AND gi.tipo = 'ingreso'
    `);
    
    console.log('📋 Ingreso IY04YD:');
    if (iy04yd.rows.length > 0) {
      console.log(JSON.stringify(iy04yd.rows[0], null, 2));
    } else {
      console.log('❌ No encontrado');
    }
    
    // Verificar últimos ingresos del complejo 7
    const ingresos = await client.query(`
      SELECT gi.id, gi.descripcion, gi.metodo_pago, gi.monto, gi.fecha, gi.complejo_id
      FROM gastos_ingresos gi
      WHERE gi.complejo_id = 7 AND gi.tipo = 'ingreso'
      ORDER BY gi.fecha DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Últimos 10 ingresos del complejo 7:');
    ingresos.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}, Método: ${row.metodo_pago}, Monto: $${row.monto}, Fecha: ${row.fecha}, Desc: ${row.descripcion.substring(0, 50)}...`);
    });
    
    // Verificar métodos de pago únicos
    const metodos = await client.query(`
      SELECT DISTINCT metodo_pago, COUNT(*) as cantidad
      FROM gastos_ingresos
      WHERE complejo_id = 7 AND tipo = 'ingreso'
      GROUP BY metodo_pago
      ORDER BY cantidad DESC
    `);
    
    console.log('\n📊 Métodos de pago en complejo 7:');
    metodos.rows.forEach(row => {
      console.log(`  ${row.metodo_pago || '(null)'}: ${row.cantidad} registros`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarIngresos();


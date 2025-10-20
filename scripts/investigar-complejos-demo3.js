const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function investigarComplejosDemo3() {
  const client = await pool.connect();
  try {
    console.log('🔍 ================================================');
    console.log('🔍 INVESTIGANDO COMPLEJOS DEMO 3 EN PRODUCCIÓN');
    console.log('🔍 ================================================');

    // 1. Listar todos los complejos
    console.log('📋 Listando todos los complejos:');
    const todosComplejos = await client.query('SELECT id, nombre FROM complejos ORDER BY id');
    todosComplejos.rows.forEach(c => {
      console.log(`   ${c.id}. ${c.nombre}`);
    });

    // 2. Buscar complejos que contengan "Demo 3"
    console.log('\n🔍 Buscando complejos que contengan "Demo 3":');
    const complejosDemo3 = await client.query("SELECT id, nombre FROM complejos WHERE nombre LIKE '%Demo 3%' ORDER BY id");
    console.log(`📊 Complejos Demo 3 encontrados: ${complejosDemo3.rows.length}`);
    complejosDemo3.rows.forEach(c => {
      console.log(`   ${c.id}. ${c.nombre}`);
    });

    // 3. Buscar la reserva específica
    console.log('\n🔍 Buscando reserva 1XJAKD:');
    const reserva = await client.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE r.codigo_reserva = $1
    `, ['1XJAKD']);
    
    if (reserva.rows.length > 0) {
      const reservaInfo = reserva.rows[0];
      console.log('📋 Reserva encontrada:');
      console.log(`   Código: ${reservaInfo.codigo_reserva}`);
      console.log(`   Cancha ID: ${reservaInfo.cancha_id}`);
      console.log(`   Complejo ID: ${reservaInfo.complejo_id}`);
      console.log(`   Complejo Nombre: ${reservaInfo.complejo_nombre}`);
      console.log(`   Precio Total: ${reservaInfo.precio_total}`);
      console.log(`   Comisión: ${reservaInfo.comision_aplicada}`);
    } else {
      console.log('❌ Reserva 1XJAKD no encontrada');
    }

    // 4. Verificar categorías financieras para cada complejo Demo 3
    console.log('\n🔍 Verificando categorías financieras:');
    for (const complejo of complejosDemo3.rows) {
      console.log(`\n📊 Complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      const categorias = await client.query(`
        SELECT * FROM categorias_gastos 
        WHERE complejo_id = $1 
        ORDER BY tipo, nombre
      `, [complejo.id]);
      
      console.log(`   Categorías: ${categorias.rows.length}`);
      categorias.rows.forEach(c => {
        console.log(`     - ${c.nombre} (${c.tipo})`);
      });
    }

    // 5. Verificar usuarios del Complejo Demo 3
    console.log('\n🔍 Verificando usuarios del Complejo Demo 3:');
    for (const complejo of complejosDemo3.rows) {
      console.log(`\n👥 Complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      const usuarios = await client.query(`
        SELECT email, rol, nombre, complejo_id 
        FROM usuarios 
        WHERE complejo_id = $1 
        ORDER BY rol, email
      `, [complejo.id]);
      
      console.log(`   Usuarios: ${usuarios.rows.length}`);
      usuarios.rows.forEach(u => {
        console.log(`     - ${u.email} (${u.rol}) - ${u.nombre}`);
      });
    }

    console.log('\n🎯 ================================================');
    console.log('🎯 RESUMEN DE LA INVESTIGACIÓN');
    console.log('🎯 ================================================');
    console.log(`📊 Total complejos: ${todosComplejos.rows.length}`);
    console.log(`📊 Complejos Demo 3: ${complejosDemo3.rows.length}`);
    
    if (reserva.rows.length > 0) {
      console.log(`📋 Reserva 1XJAKD: Complejo ID ${reserva.rows[0].complejo_id}`);
    }

  } catch (error) {
    console.error('❌ Error ejecutando investigación:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

investigarComplejosDemo3();



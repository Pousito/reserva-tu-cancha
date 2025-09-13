const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('🔍 Verificando base de datos PostgreSQL...\n');

async function verifyDatabase() {
  try {
    // Verificar ciudades
    const ciudades = await pool.query("SELECT * FROM ciudades ORDER BY id");
    console.log('\n📍 CIUDADES:');
    ciudades.rows.forEach(ciudad => {
      console.log(`  ID ${ciudad.id}: ${ciudad.nombre}`);
    });

    // Verificar complejos
    const complejos = await pool.query(`
      SELECT c.*, ci.nombre as ciudad_nombre 
      FROM complejos c 
      JOIN ciudades ci ON c.ciudad_id = ci.id 
      ORDER BY c.id
    `);
    
    console.log('\n🏢 COMPLEJOS:');
    complejos.rows.forEach(complejo => {
      console.log(`  ID ${complejo.id}: ${complejo.nombre} (${complejo.ciudad_nombre})`);
    });

    // Verificar canchas
    const canchas = await pool.query(`
      SELECT ca.*, co.nombre as complejo_nombre 
      FROM canchas ca 
      JOIN complejos co ON ca.complejo_id = co.id 
      ORDER BY ca.id
    `);
    
    console.log('\n⚽ CANCHAS:');
    canchas.rows.forEach(cancha => {
      console.log(`  ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo}) - ${cancha.complejo_nombre}`);
    });

    // Verificar usuarios
    const usuarios = await pool.query("SELECT * FROM usuarios ORDER BY id");
    console.log('\n👥 USUARIOS:');
    usuarios.rows.forEach(usuario => {
      console.log(`  ID ${usuario.id}: ${usuario.email} (${usuario.rol}) - Activo: ${usuario.activo ? 'Sí' : 'No'}`);
    });

    // Verificar reservas
    const reservas = await pool.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      ORDER BY r.fecha_creacion DESC 
      LIMIT 10
    `);
    
    console.log('\n📅 ÚLTIMAS 10 RESERVAS:');
    reservas.rows.forEach(reserva => {
      console.log(`  ${reserva.codigo_reserva}: ${reserva.nombre_cliente} - ${reserva.fecha} ${reserva.hora_inicio} (${reserva.cancha_nombre})`);
    });

    // Verificar bloqueos temporales
    const bloqueos = await pool.query(`
      SELECT * FROM bloqueos_temporales 
      WHERE expira_en > NOW() 
      ORDER BY creado_en DESC 
      LIMIT 5
    `);
    
    console.log('\n🔒 BLOQUEOS TEMPORALES ACTIVOS:');
    if (bloqueos.rows.length === 0) {
      console.log('  No hay bloqueos temporales activos');
    } else {
      bloqueos.rows.forEach(bloqueo => {
        console.log(`  ${bloqueo.id}: Cancha ${bloqueo.cancha_id} - ${bloqueo.fecha} ${bloqueo.hora_inicio} (Expira: ${bloqueo.expira_en})`);
      });
    }

    console.log('\n✅ Verificación completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  } finally {
    await pool.end();
  }
}

verifyDatabase();
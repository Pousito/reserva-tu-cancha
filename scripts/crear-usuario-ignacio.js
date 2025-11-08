const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// URL de conexión a la base de datos de producción
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:r1a3b5c7d9e11f13g15h17i19j21k23l25m27n29o31p33@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reservatucancha_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearUsuario() {
  try {
    console.log('👤 Creando usuario owner para Ignacio Araya Lillo...\n');
    
    const email = 'ignacio.araya.lillo@gmail.com';
    const nombre = 'Ignacio Araya Lillo';
    const password = 'TempPassword123!';
    const complejo_id = 7; // Espacio Deportivo Borde Río
    
    // Verificar si el usuario ya existe
    const checkUser = await pool.query('SELECT id, email FROM usuarios WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      console.log('❌ El usuario ya existe:');
      console.log('   ID:', checkUser.rows[0].id);
      console.log('   Email:', checkUser.rows[0].email);
      process.exit(1);
    }
    
    // Verificar que el complejo existe
    const complejo = await pool.query('SELECT id, nombre FROM complejos WHERE id = $1', [complejo_id]);
    if (complejo.rows.length === 0) {
      console.log('❌ Complejo no encontrado (ID:', complejo_id, ')');
      process.exit(1);
    }
    
    console.log('✅ Complejo encontrado:', complejo.rows[0].nombre);
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Contraseña hasheada');
    
    // Crear el usuario
    const result = await pool.query(`
      INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id)
      VALUES ($1, $2, $3, 'owner', true, $4)
      RETURNING id, email, nombre, rol, complejo_id, activo
    `, [email, hashedPassword, nombre, complejo_id]);
    
    const usuario = result.rows[0];
    
    console.log('\n✅ USUARIO CREADO EXITOSAMENTE');
    console.log('========================');
    console.log('   ID:', usuario.id);
    console.log('   Email:', usuario.email);
    console.log('   Nombre:', usuario.nombre);
    console.log('   Rol:', usuario.rol);
    console.log('   Complejo ID:', usuario.complejo_id);
    console.log('   Complejo:', complejo.rows[0].nombre);
    console.log('   Activo:', usuario.activo ? 'Sí' : 'No');
    console.log('\n🔑 Credenciales:');
    console.log('   Email: ignacio.araya.lillo@gmail.com');
    console.log('   Contraseña temporal: TempPassword123!');
    console.log('\n⚠️ IMPORTANTE: Cambiar la contraseña después del primer acceso');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

crearUsuario();


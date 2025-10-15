// Endpoint para actualizar MagnaSports a Complejo En Desarrollo en producción
// Se ejecuta desde el servidor de Render con acceso directo a la base de datos

const { Pool } = require('pg');

async function updateMagnasportsInProduction() {
  console.log('🔄 Actualizando MagnaSports a Complejo En Desarrollo en PRODUCCIÓN...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Verificar conexión
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conectado a base de datos:', testQuery.rows[0].current_time);
    
    // 1. Verificar qué complejos existen
    console.log('\n🔍 Verificando complejos existentes...');
    const complejosAntes = await pool.query("SELECT id, nombre, email FROM complejos WHERE nombre LIKE '%MagnaSports%' OR nombre LIKE '%Desarrollo%'");
    console.log('📊 Complejos encontrados:', complejosAntes.rows);
    
    if (complejosAntes.rows.length === 0) {
      console.log('⚠️ No se encontraron complejos con "MagnaSports" o "Desarrollo"');
      return { success: false, message: 'No se encontraron complejos para actualizar' };
    }
    
    // 2. Actualizar el nombre del complejo
    console.log('\n📝 Actualizando nombre del complejo...');
    const updateComplejo = await pool.query(
      "UPDATE complejos SET nombre = 'Complejo En Desarrollo' WHERE nombre = 'MagnaSports'"
    );
    console.log(`✅ Complejo actualizado: ${updateComplejo.rowCount} registro(s)`);
    
    // 3. Actualizar el email del complejo
    console.log('📝 Actualizando email del complejo...');
    const updateEmail = await pool.query(
      "UPDATE complejos SET email = 'reservas@complejodesarrollo.cl' WHERE nombre = 'Complejo En Desarrollo'"
    );
    console.log(`✅ Email actualizado: ${updateEmail.rowCount} registro(s)`);
    
    // 4. Actualizar usuarios
    console.log('📝 Actualizando usuarios...');
    const updateUsuarios = await pool.query(
      "UPDATE usuarios SET nombre = REPLACE(nombre, 'MagnaSports', 'Complejo En Desarrollo') WHERE nombre LIKE '%MagnaSports%'"
    );
    console.log(`✅ Usuarios actualizados: ${updateUsuarios.rowCount} registro(s)`);
    
    // 5. Verificar cambios
    console.log('\n🔍 Verificando cambios...');
    
    const complejo = await pool.query("SELECT * FROM complejos WHERE nombre = 'Complejo En Desarrollo'");
    console.log('📊 Complejo actualizado:', complejo.rows[0]);
    
    const canchas = await pool.query(`
      SELECT c.*, co.nombre as complejo_nombre 
      FROM canchas c 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE co.nombre = 'Complejo En Desarrollo'
    `);
    console.log(`📊 Canchas encontradas: ${canchas.rows.length}`);
    if (canchas.rows.length > 0) {
      console.log('🏟️ Canchas:', canchas.rows.map(c => c.nombre));
    }
    
    const usuarios = await pool.query("SELECT nombre, email FROM usuarios WHERE nombre LIKE '%Desarrollo%'");
    console.log('👥 Usuarios encontrados:', usuarios.rows.map(u => `${u.nombre} (${u.email})`));
    
    console.log('\n✅ Actualización en PRODUCCIÓN completada exitosamente!');
    
    return { 
      success: true, 
      message: 'Actualización completada',
      complejo: complejo.rows[0],
      canchas: canchas.rows.length,
      usuarios: usuarios.rows.length
    };
    
  } catch (error) {
    console.error('❌ Error actualizando datos en producción:', error.message);
    console.error('🔍 Detalles del error:', error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

module.exports = updateMagnasportsInProduction;

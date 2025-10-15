const { Pool } = require('pg');

async function updateNeonViaAPI() {
  console.log('🔄 Actualizando Neon via API de Render...\n');
  
  // Configuración para conectar a Neon directamente
  const neonUrl = process.env.DATABASE_URL;
  
  if (!neonUrl) {
    console.error('❌ DATABASE_URL no está configurada');
    return;
  }
  
  console.log('🔗 DATABASE_URL configurada:', neonUrl.substring(0, 30) + '...');
  
  const pool = new Pool({
    connectionString: neonUrl,
    ssl: true
  });
  
  try {
    // Verificar conexión
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conectado a Neon:', testQuery.rows[0].current_time);
    
    // 1. Verificar qué complejos existen
    console.log('\n🔍 Verificando complejos existentes...');
    const complejosAntes = await pool.query("SELECT id, nombre, email FROM complejos WHERE nombre LIKE '%MagnaSports%' OR nombre LIKE '%Desarrollo%'");
    console.log('📊 Complejos encontrados:', complejosAntes.rows);
    
    if (complejosAntes.rows.length === 0) {
      console.log('⚠️ No se encontraron complejos con "MagnaSports" o "Desarrollo"');
      return;
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
    
  } catch (error) {
    console.error('❌ Error actualizando datos en producción:', error.message);
    console.error('🔍 Detalles del error:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateNeonViaAPI();
}

module.exports = updateNeonViaAPI;

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateMagnasportsToDesarrollo() {
  console.log('🔄 Actualizando MagnaSports a Complejo En Desarrollo...\n');
  
  try {
    // 1. Actualizar el nombre del complejo
    console.log('📝 Actualizando nombre del complejo...');
    const updateComplejo = await pool.query(
      "UPDATE complejos SET nombre = 'Complejo En Desarrollo' WHERE nombre = 'MagnaSports'"
    );
    console.log(`✅ Complejo actualizado: ${updateComplejo.rowCount} registro(s)`);
    
    // 2. Las canchas se actualizan automáticamente al cambiar el complejo (usando complejo_id)
    console.log('📝 Las canchas se actualizan automáticamente al cambiar el complejo...');
    
    // 3. Actualizar usuarios
    console.log('📝 Actualizando usuarios...');
    const updateUsuarios = await pool.query(
      "UPDATE usuarios SET nombre = REPLACE(nombre, 'MagnaSports', 'Complejo En Desarrollo') WHERE nombre LIKE '%MagnaSports%'"
    );
    console.log(`✅ Usuarios actualizados: ${updateUsuarios.rowCount} registro(s)`);
    
    // 4. Verificar cambios
    console.log('\n🔍 Verificando cambios...');
    
    const complejo = await pool.query("SELECT * FROM complejos WHERE nombre LIKE '%Desarrollo%'");
    console.log('📊 Complejo encontrado:', complejo.rows[0]);
    
    const canchas = await pool.query(`
      SELECT c.*, co.nombre as complejo_nombre 
      FROM canchas c 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE co.nombre LIKE '%Desarrollo%'
    `);
    console.log(`📊 Canchas encontradas: ${canchas.rows.length}`);
    
    const usuarios = await pool.query("SELECT nombre FROM usuarios WHERE nombre LIKE '%Desarrollo%'");
    console.log('📊 Usuarios encontrados:', usuarios.rows.map(u => u.nombre));
    
    console.log('\n✅ Actualización completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error actualizando datos:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateMagnasportsToDesarrollo();
}

module.exports = updateMagnasportsToDesarrollo;

const { Pool } = require('pg');
require('dotenv').config();

console.log('🧹 LIMPIEZA DE USUARIOS EN PRODUCCIÓN');
console.log('====================================');

// Configurar conexión PostgreSQL para producción
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupProductionUsers() {
  try {
    console.log('🔍 Verificando usuarios actuales en producción...');
    
    // Obtener todos los usuarios actuales
    const allUsers = await pool.query('SELECT email, nombre, rol, activo FROM usuarios ORDER BY id');
    
    console.log(`📊 Usuarios encontrados: ${allUsers.rows.length}`);
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.rol}) - Activo: ${user.activo ? 'Sí' : 'No'}`);
    });
    
    // Usuarios que SÍ queremos mantener
    const usuariosCorrectos = [
      'admin@reservatuscanchas.cl',
      'naxiin320@gmail.com', 
      'naxiin_320@hotmail.com'
    ];
    
    console.log('\n🧹 Eliminando usuarios no deseados...');
    
    // Eliminar usuarios que NO están en la lista de correctos
    const deleteResult = await pool.query(`
      DELETE FROM usuarios 
      WHERE email NOT IN ($1, $2, $3)
    `, usuariosCorrectos);
    
    console.log(`✅ Eliminados ${deleteResult.rowCount} usuarios no deseados`);
    
    // Actualizar el rol del dueño a 'owner'
    await pool.query(`
      UPDATE usuarios 
      SET rol = 'owner' 
      WHERE email = 'naxiin_320@hotmail.com'
    `);
    console.log('✅ Rol del dueño actualizado a "owner"');
    
    // Actualizar el rol del admin a 'manager'
    await pool.query(`
      UPDATE usuarios 
      SET rol = 'manager' 
      WHERE email = 'naxiin320@gmail.com'
    `);
    console.log('✅ Rol del admin actualizado a "manager"');
    
    // Verificar usuarios finales
    const usuariosFinales = await pool.query('SELECT email, nombre, rol, activo FROM usuarios ORDER BY id');
    
    console.log('\n👥 USUARIOS FINALES EN PRODUCCIÓN:');
    console.log('===================================');
    usuariosFinales.rows.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Nombre: ${user.nombre}`);
      console.log(`   Rol: ${user.rol}`);
      console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
      console.log('');
    });
    
    console.log('🔑 CREDENCIALES FINALES EN PRODUCCIÓN:');
    console.log('======================================');
    console.log('👑 Super Admin:');
    console.log('   Email: admin@reservatuscanchas.cl');
    console.log('   Password: admin123');
    console.log('');
    console.log('👨‍💼 Dueño MagnaSports:');
    console.log('   Email: naxiin_320@hotmail.com');
    console.log('   Password: complejo2024');
    console.log('');
    console.log('👤 Admin MagnaSports:');
    console.log('   Email: naxiin320@gmail.com');
    console.log('   Password: magnasports2024');
    
    console.log('\n✅ Limpieza de producción completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en limpieza de producción:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar limpieza
cleanupProductionUsers().catch(async (error) => {
  console.error('❌ Error general:', error.message);
  await pool.end();
  process.exit(1);
});

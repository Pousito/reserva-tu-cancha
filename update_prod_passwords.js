const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('🔑 ACTUALIZANDO CONTRASEÑAS EN PRODUCCIÓN');
console.log('========================================');

// Configurar conexión PostgreSQL para producción
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateProductionPasswords() {
  try {
    console.log('🔍 Actualizando contraseñas en producción...');
    
    // Contraseñas correctas
    const passwordUpdates = [
      {
        email: 'admin@reservatuscanchas.cl',
        password: 'admin123',
        nombre: 'Super Administrador'
      },
      {
        email: 'naxiin320@gmail.com',
        password: 'magnasports2024',
        nombre: 'Administrador MagnaSports'
      },
      {
        email: 'naxiin_320@hotmail.com',
        password: 'complejo2024',
        nombre: 'Dueño MagnaSports'
      }
    ];
    
    for (const user of passwordUpdates) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(`
        UPDATE usuarios 
        SET password = $1, nombre = $2
        WHERE email = $3
      `, [hashedPassword, user.nombre, user.email]);
      
      console.log(`✅ Contraseña actualizada para: ${user.email}`);
    }
    
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
    
    console.log('🔑 CREDENCIALES ACTUALIZADAS EN PRODUCCIÓN:');
    console.log('==========================================');
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
    
    console.log('\n✅ Contraseñas de producción actualizadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error actualizando contraseñas:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar actualización
updateProductionPasswords().catch(async (error) => {
  console.error('❌ Error general:', error.message);
  await pool.end();
  process.exit(1);
});

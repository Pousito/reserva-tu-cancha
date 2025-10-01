#!/usr/bin/env node

/**
 * Script para crear usuario administrador de Fundación Gunnen
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('🏟️ CREANDO USUARIO ADMINISTRADOR - FUNDACIÓN GUNNEN');
console.log('====================================================');

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createGunnenAdmin() {
  try {
    console.log('\n🔍 Verificando complejo Fundación Gunnen...');
    
    // Buscar el complejo Fundación Gunnen
    const complejoResult = await pool.query(
      'SELECT id, nombre FROM complejos WHERE nombre = $1',
      ['Fundación Gunnen']
    );
    
    if (complejoResult.rows.length === 0) {
      console.log('❌ Complejo Fundación Gunnen no encontrado');
      console.log('💡 Ejecuta primero el script de inicialización de datos');
      return;
    }
    
    const complejo = complejoResult.rows[0];
    console.log(`✅ Complejo encontrado: ${complejo.nombre} (ID: ${complejo.id})`);
    
    // Crear usuarios para Fundación Gunnen
    const usuariosGunnen = [
      {
        email: 'naxiin_320@hotmail.com',
        password: 'gunnen2024',
        nombre: 'Administrador Fundación Gunnen',
        rol: 'owner'
      },
      {
        email: 'ignacio.araya.lillito@hotmail.com',
        password: 'gunnen2024',
        nombre: 'Dueño Fundación Gunnen',
        rol: 'owner'
      }
    ];
    
    console.log('\n🔐 Creando usuarios para Fundación Gunnen...');
    
    const usuariosCreados = [];
    
    for (const adminData of usuariosGunnen) {
      console.log(`📧 Creando usuario: ${adminData.email}`);
      
      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(adminData.password, 12);
      
      // Insertar usuario
      const insertResult = await pool.query(`
        INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id) 
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT (email) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          activo = EXCLUDED.activo,
          complejo_id = EXCLUDED.complejo_id
        RETURNING id, email, nombre, rol, complejo_id
      `, [adminData.email, hashedPassword, adminData.nombre, adminData.rol, complejo.id]);
      
      const usuario = insertResult.rows[0];
      usuariosCreados.push(usuario);
      
      console.log(`✅ Usuario creado/actualizado exitosamente`);
      console.log(`   ID: ${usuario.id}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Rol: ${usuario.rol}`);
      console.log(`   Complejo ID: ${usuario.complejo_id}`);
    }
    
    // Verificar que los usuarios pueden hacer login
    console.log('\n🔍 Verificando acceso de todos los usuarios...');
    
    for (const usuario of usuariosCreados) {
      const verifyResult = await pool.query(
        'SELECT u.*, c.nombre as complejo_nombre FROM usuarios u LEFT JOIN complejos c ON u.complejo_id = c.id WHERE u.email = $1',
        [usuario.email]
      );
      
      if (verifyResult.rows.length > 0) {
        const user = verifyResult.rows[0];
        console.log(`✅ Usuario verificado: ${user.email}`);
        console.log(`   Nombre: ${user.nombre}`);
        console.log(`   Rol: ${user.rol}`);
        console.log(`   Complejo: ${user.complejo_nombre || 'Sin asignar'}`);
        console.log(`   Activo: ${user.activo ? 'Sí' : 'No'}`);
      }
    }
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
    console.log('============================');
    console.log('🏟️ FUNDACIÓN GUNNEN - CREDENCIALES DE ACCESO:');
    console.log('');
    console.log('👤 ADMINISTRADOR:');
    console.log('📧 Email: naxiin_320@hotmail.com');
    console.log('🔑 Password: gunnen2024');
    console.log('');
    console.log('👑 DUEÑO:');
    console.log('📧 Email: ignacio.araya.lillito@hotmail.com');
    console.log('🔑 Password: gunnen2024');
    console.log('');
    console.log('🌐 URL: https://www.reservatuscanchas.cl/admin-login.html');
    console.log('');
    console.log('📋 PERMISOS:');
    console.log('   ✅ Ver reservas del complejo');
    console.log('   ✅ Gestionar canchas');
    console.log('   ✅ Ver reportes y estadísticas');
    console.log('   ✅ Acceder a dashboard');
    console.log('');
    console.log('🔒 SEGURIDAD:');
    console.log('   • Contraseña hasheada con bcrypt');
    console.log('   • Usuario vinculado al complejo');
    console.log('   • Acceso limitado a datos del complejo');
    
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Ejecutar script
createGunnenAdmin().catch(async (error) => {
  console.error('❌ Error general:', error.message);
  await pool.end();
  process.exit(1);
});

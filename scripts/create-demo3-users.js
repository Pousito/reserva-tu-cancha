#!/usr/bin/env node

/**
 * Script para crear usuarios Owner y Manager para el Complejo Demo 3
 * Fecha: $(date)
 * Descripción: Crea usuarios específicos para el complejo demo 3
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('🏟️ ================================================');
console.log('🏟️ CREANDO USUARIOS PARA COMPLEJO DEMO 3');
console.log('🏟️ ================================================');

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable',
  ssl: false
});

async function createDemo3Users() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando complejo Demo 3...');
    
    // Buscar el complejo Demo 3
    const complejoResult = await client.query(
      'SELECT id, nombre FROM complejos WHERE nombre = $1',
      ['Complejo Demo 3']
    );
    
    if (complejoResult.rows.length === 0) {
      console.log('❌ Complejo Demo 3 no encontrado');
      console.log('💡 Asegúrate de que el complejo esté creado en la base de datos');
      return;
    }
    
    const complejo = complejoResult.rows[0];
    console.log(`✅ Complejo encontrado: ${complejo.nombre} (ID: ${complejo.id})`);
    
    // Verificar si ya existen usuarios para este complejo
    const usuariosExistentes = await client.query(
      'SELECT email, rol FROM usuarios WHERE complejo_id = $1',
      [complejo.id]
    );
    
    if (usuariosExistentes.rows.length > 0) {
      console.log('\n⚠️  Usuarios existentes para este complejo:');
      usuariosExistentes.rows.forEach(usuario => {
        console.log(`   - ${usuario.email} (${usuario.rol})`);
      });
      console.log('\n🔄 Continuando con la creación de nuevos usuarios...');
    }
    
    // Crear usuarios para Complejo Demo 3
    const usuariosDemo3 = [
      {
        email: 'owner@complejodemo3.cl',
        password: 'Owner1234!',
        nombre: 'Owner Complejo Demo 3',
        rol: 'owner'
      },
      {
        email: 'manager@complejodemo3.cl',
        password: 'Manager1234!',
        nombre: 'Manager Complejo Demo 3',
        rol: 'manager'
      }
    ];
    
    console.log('\n🔐 Creando usuarios para Complejo Demo 3...');
    
    const usuariosCreados = [];
    
    for (const userData of usuariosDemo3) {
      try {
        // Verificar si el usuario ya existe
        const usuarioExistente = await client.query(
          'SELECT id FROM usuarios WHERE email = $1',
          [userData.email]
        );
        
        if (usuarioExistente.rows.length > 0) {
          console.log(`⚠️  Usuario ${userData.email} ya existe, actualizando...`);
          
          // Hashear la contraseña
          const hashedPassword = await bcrypt.hash(userData.password, 12);
          
          // Actualizar usuario existente
          await client.query(`
            UPDATE usuarios 
            SET password = $1, nombre = $2, rol = $3, complejo_id = $4, activo = true
            WHERE email = $5
          `, [hashedPassword, userData.nombre, userData.rol, complejo.id, userData.email]);
          
          console.log(`   ✅ Usuario actualizado: ${userData.email} (${userData.rol})`);
        } else {
          // Hashear la contraseña
          const hashedPassword = await bcrypt.hash(userData.password, 12);
          
          // Crear nuevo usuario
          const result = await client.query(`
            INSERT INTO usuarios (email, password, nombre, rol, complejo_id, activo) 
            VALUES ($1, $2, $3, $4, $5, true)
            RETURNING id
          `, [userData.email, hashedPassword, userData.nombre, userData.rol, complejo.id]);
          
          const userId = result.rows[0].id;
          console.log(`   ✅ Usuario creado: ${userData.email} (${userData.rol}) - ID: ${userId}`);
        }
        
        usuariosCreados.push({
          email: userData.email,
          password: userData.password,
          rol: userData.rol
        });
        
      } catch (error) {
        console.error(`❌ Error creando usuario ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 ================================================');
    console.log('🎉 USUARIOS CREADOS EXITOSAMENTE');
    console.log('🎉 ================================================');
    console.log(`🏟️  Complejo: ${complejo.nombre} (ID: ${complejo.id})`);
    console.log(`👥 Usuarios creados: ${usuariosCreados.length}`);
    console.log('');
    
    console.log('🔑 CREDENCIALES DE ACCESO:');
    console.log('─'.repeat(50));
    console.log('👑 Owner (Dueño):');
    console.log('  📧 Email:    owner@complejodemo3.cl');
    console.log('  🔑 Password: Owner1234!');
    console.log('  🌐 Login:    http://localhost:3000/admin-login.html');
    console.log('  📊 Permisos: Completos (dashboard + reportes + ingresos)');
    console.log('');
    console.log('👤 Manager (Gestor):');
    console.log('  📧 Email:    manager@complejodemo3.cl');
    console.log('  🔑 Password: Manager1234!');
    console.log('  🌐 Login:    http://localhost:3000/admin-login.html');
    console.log('  📊 Permisos: Limitados (sin reportes ni ingresos)');
    console.log('─'.repeat(50));
    
    console.log('\n🎯 PRÓXIMAS ACCIONES:');
    console.log('─'.repeat(50));
    console.log('1. Abrir navegador en http://localhost:3000/admin-login.html');
    console.log('2. Iniciar sesión con owner@complejodemo3.cl / Owner1234!');
    console.log('3. Verificar que se vea el dashboard del Complejo Demo 3');
    console.log('4. Probar crear una reserva administrativa');
    console.log('5. Verificar que el owner pueda ver reportes');
    console.log('6. Probar login de manager y verificar permisos limitados');
    console.log('═'.repeat(50));
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERROR en la creación de usuarios:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar creación de usuarios
createDemo3Users()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

#!/usr/bin/env node

/**
 * Script para obtener todas las credenciales de producción
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/reserva_tu_cancha'
});

async function getProductionCredentials() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 CREDENCIALES DE PRODUCCIÓN - RESERVA TU CANCHA');
    console.log('================================================');
    
    // Obtener todos los usuarios
    const users = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.nombre,
        u.rol,
        u.activo,
        u.created_at,
        c.nombre as complejo_nombre,
        c.id as complejo_id
      FROM usuarios u
      LEFT JOIN complejos c ON u.complejo_id = c.id
      ORDER BY u.rol, c.nombre, u.nombre
    `);
    
    console.log(`\n👥 TOTAL DE USUARIOS: ${users.rows.length}`);
    console.log('================================================');
    
    // Agrupar por rol
    const superAdmins = users.rows.filter(u => u.rol === 'super_admin');
    const owners = users.rows.filter(u => u.rol === 'owner');
    const managers = users.rows.filter(u => u.rol === 'manager');
    
    // SUPER ADMIN
    console.log('\n🔴 SUPER ADMINISTRADORES');
    console.log('------------------------');
    if (superAdmins.length > 0) {
      superAdmins.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Nombre: ${user.nombre || 'No especificado'}`);
        console.log(`✅ Estado: ${user.activo ? 'Activo' : 'Inactivo'}`);
        console.log(`📅 Creado: ${user.created_at}`);
        console.log('---');
      });
    } else {
      console.log('❌ No hay super administradores registrados');
    }
    
    // OWNERS
    console.log('\n🟡 OWNERS (Propietarios de Complejos)');
    console.log('-------------------------------------');
    if (owners.length > 0) {
      owners.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Nombre: ${user.nombre || 'No especificado'}`);
        console.log(`🏢 Complejo: ${user.complejo_nombre || 'Sin asignar'} (ID: ${user.complejo_id || 'N/A'})`);
        console.log(`✅ Estado: ${user.activo ? 'Activo' : 'Inactivo'}`);
        console.log(`📅 Creado: ${user.created_at}`);
        console.log('---');
      });
    } else {
      console.log('❌ No hay owners registrados');
    }
    
    // MANAGERS
    console.log('\n🟢 MANAGERS (Gerentes)');
    console.log('----------------------');
    if (managers.length > 0) {
      managers.forEach(user => {
        console.log(`📧 Email: ${user.email}`);
        console.log(`👤 Nombre: ${user.nombre || 'No especificado'}`);
        console.log(`🏢 Complejo: ${user.complejo_nombre || 'Sin asignar'} (ID: ${user.complejo_id || 'N/A'})`);
        console.log(`✅ Estado: ${user.activo ? 'Activo' : 'Inactivo'}`);
        console.log(`📅 Creado: ${user.created_at}`);
        console.log('---');
      });
    } else {
      console.log('❌ No hay managers registrados');
    }
    
    // RESUMEN POR COMPLEJO
    console.log('\n🏢 RESUMEN POR COMPLEJO');
    console.log('------------------------');
    
    const complejos = await client.query(`
      SELECT 
        c.id,
        c.nombre,
        c.direccion,
        c.telefono,
        c.email,
        COUNT(u.id) as total_usuarios
      FROM complejos c
      LEFT JOIN usuarios u ON c.id = u.complejo_id
      GROUP BY c.id, c.nombre, c.direccion, c.telefono, c.email
      ORDER BY c.nombre
    `);
    
    for (const complejo of complejos.rows) {
      console.log(`\n🏢 ${complejo.nombre} (ID: ${complejo.id})`);
      console.log(`   📍 Dirección: ${complejo.direccion}`);
      console.log(`   📧 Email: ${complejo.email}`);
      console.log(`   📱 Teléfono: ${complejo.telefono}`);
      console.log(`   👥 Usuarios: ${complejo.total_usuarios}`);
      
      // Obtener usuarios de este complejo
      const usuariosComplejo = await client.query(`
        SELECT email, nombre, rol, activo
        FROM usuarios 
        WHERE complejo_id = $1
        ORDER BY rol, nombre
      `, [complejo.id]);
      
      usuariosComplejo.rows.forEach(usuario => {
        console.log(`      - ${usuario.email} (${usuario.rol}) - ${usuario.activo ? 'Activo' : 'Inactivo'}`);
      });
    }
    
    // ESTADÍSTICAS GENERALES
    console.log('\n📊 ESTADÍSTICAS GENERALES');
    console.log('--------------------------');
    console.log(`🏢 Complejos: ${complejos.rows.length}`);
    
    // ESTADÍSTICAS POR ROL
    const stats = await client.query(`
      SELECT rol, COUNT(*) as total
      FROM usuarios
      GROUP BY rol
      ORDER BY rol
    `);
    
    stats.rows.forEach(stat => {
      console.log(`👤 ${stat.rol}: ${stat.total}`);
    });
    
    const totalUsers = await client.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`👥 Total Usuarios: ${totalUsers.rows[0].total}`);
    
    const activos = await client.query('SELECT COUNT(*) as total FROM usuarios WHERE activo = true');
    const inactivos = await client.query('SELECT COUNT(*) as total FROM usuarios WHERE activo = false');
    console.log(`✅ Activos: ${activos.rows[0].total}`);
    console.log(`❌ Inactivos: ${inactivos.rows[0].total}`);
    
    // INFORMACIÓN DE ACCESO
    console.log('\n🌐 INFORMACIÓN DE ACCESO');
    console.log('-------------------------');
    console.log('🔗 URL de Producción: https://www.reservatuscanchas.cl');
    console.log('🔗 Panel de Administración: https://www.reservatuscanchas.cl/admin-dashboard.html');
    console.log('🔗 Control Financiero: https://www.reservatuscanchas.cl/admin-gastos.html');
    console.log('🔗 Reportes: https://www.reservatuscanchas.cl/admin-reports.html');
    console.log('🔗 Gestión de Canchas: https://www.reservatuscanchas.cl/admin-courts.html');
    
    // INFORMACIÓN ADICIONAL DEL SISTEMA
    console.log('\n🔧 INFORMACIÓN DEL SISTEMA');
    console.log('--------------------------');
    
    // Reservas totales
    const totalReservas = await client.query('SELECT COUNT(*) as total FROM reservas');
    console.log(`📅 Total Reservas: ${totalReservas.rows[0].total}`);
    
    // Reservas por complejo
    const reservasPorComplejo = await client.query(`
      SELECT c.nombre, COUNT(r.id) as total
      FROM complejos c
      LEFT JOIN canchas ca ON c.id = ca.complejo_id
      LEFT JOIN reservas r ON ca.id = r.cancha_id
      GROUP BY c.id, c.nombre
      ORDER BY total DESC
    `);
    
    console.log('\n📊 Reservas por Complejo:');
    reservasPorComplejo.rows.forEach(complejo => {
      console.log(`   ${complejo.nombre}: ${complejo.total} reservas`);
    });
    
    // CONTRASEÑAS
    console.log('\n🔑 NOTAS IMPORTANTES');
    console.log('---------------------');
    console.log('⚠️  Las contraseñas están hasheadas en la base de datos');
    console.log('⚠️  Para resetear contraseñas, usar el sistema de recuperación');
    console.log('⚠️  O contactar al desarrollador para reset manual');
    console.log('⚠️  Contraseña por defecto común: "admin123" o "password123"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  getProductionCredentials()
    .then(() => {
      console.log('\n🎉 Información obtenida exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { getProductionCredentials };




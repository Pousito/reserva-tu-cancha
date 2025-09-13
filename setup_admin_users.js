const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('👑 CONFIGURACIÓN DE USUARIOS ADMINISTRADORES');
console.log('============================================');

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`📊 Base de datos: PostgreSQL`);
console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'No configurado'}`);

// Función para ejecutar consultas
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function run(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { lastID: result.rows[0]?.id || 0, changes: result.rowCount };
  } finally {
    client.release();
  }
}

async function setupAdminUsers() {
  try {
    console.log('\n🔍 VERIFICANDO USUARIOS ADMINISTRADORES...');
    
    // Verificar si la tabla usuarios existe
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'usuarios'
    `);
    
    if (tables.length === 0) {
      console.log('⚠️  Tabla usuarios no existe, creando...');
      await createUsersTable();
    } else {
      console.log('✅ Tabla usuarios existe, verificando contenido...');
      await checkExistingUsers();
    }
  } catch (error) {
    console.error('❌ Error en setupAdminUsers:', error.message);
  }
}

async function createUsersTable() {
  console.log('\n🔨 CREANDO TABLA USUARIOS...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      rol VARCHAR(50) NOT NULL CHECK(rol IN ('super_admin', 'owner', 'manager', 'usuario')),
      activo BOOLEAN DEFAULT true,
      complejo_id INTEGER REFERENCES complejos(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso TIMESTAMP
    );
  `;
  
  try {
    await run(createTableSQL);
    console.log('✅ Tabla usuarios creada exitosamente');
    await createAdminUsers();
  } catch (error) {
    console.error('❌ Error creando tabla usuarios:', error.message);
  }
}

async function checkExistingUsers() {
  console.log('\n👥 VERIFICANDO USUARIOS EXISTENTES...');
  
  try {
    const usuarios = await query("SELECT * FROM usuarios ORDER BY id");
    
    console.log(`📊 Usuarios encontrados: ${usuarios.length}`);
    
    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      console.log('🔄 Creando usuarios administradores...');
      await createAdminUsers();
    } else {
      usuarios.forEach(usuario => {
        console.log(`   - ${usuario.email} (${usuario.rol}) - Activo: ${usuario.activo ? 'Sí' : 'No'}`);
      });
      
      // Verificar si hay super admin
      const superAdmin = usuarios.find(u => u.rol === 'super_admin' && u.activo === true);
      if (!superAdmin) {
        console.log('⚠️  No hay super admin activo, creando...');
        await createAdminUsers();
      } else {
        console.log('✅ Super admin encontrado y activo');
        console.log('🔄 Actualizando contraseñas con hash...');
        await createAdminUsers(); // Siempre actualizar contraseñas
      }
    }
  } catch (error) {
    console.error('❌ Error consultando usuarios:', error.message);
  }
}

async function createAdminUsers() {
  console.log('\n👑 CREANDO USUARIOS ADMINISTRADORES...');
  
  // Usuarios administradores
  const adminUsers = [
    {
      email: 'admin@reservatucancha.com',
      password: 'admin123',
      nombre: 'Super Administrador',
      rol: 'super_admin'
    },
    {
      email: 'admin@magnasports.cl',
      password: 'magnasports2024',
      nombre: 'Administrador MagnaSports',
      rol: 'owner'
    },
    {
      email: 'admin@complejocentral.cl',
      password: 'complejo2024',
      nombre: 'Administrador Complejo Central',
      rol: 'owner'
    }
  ];
  
  for (const usuario of adminUsers) {
    try {
      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(usuario.password, 10);
      
      // Insertar o actualizar usuario
      await run(`
        INSERT INTO usuarios (email, password, nombre, rol, activo) 
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (email) 
        DO UPDATE SET 
          password = EXCLUDED.password,
          nombre = EXCLUDED.nombre,
          rol = EXCLUDED.rol,
          activo = EXCLUDED.activo
      `, [usuario.email, hashedPassword, usuario.nombre, usuario.rol]);
      
      console.log(`✅ Usuario creado/actualizado: ${usuario.email} (${usuario.rol}) con contraseña hasheada`);
    } catch (error) {
      console.error(`❌ Error insertando usuario ${usuario.email}:`, error.message);
    }
  }
  
  console.log('✅ Usuarios administradores creados');
  console.log('\n🔑 CREDENCIALES DE ACCESO:');
  console.log('============================');
  console.log('👑 Super Admin:');
  console.log('   Email: admin@reservatucancha.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('🏢 Admin MagnaSports:');
  console.log('   Email: admin@magnasports.cl');
  console.log('   Password: magnasports2024');
  console.log('');
  console.log('🏟️ Admin Complejo Central:');
  console.log('   Email: admin@complejocentral.cl');
  console.log('   Password: complejo2024');
  console.log('');
  console.log('🎉 Configuración completada exitosamente');
  
  // Verificar usuarios creados
  setTimeout(async () => {
    await checkExistingUsers();
    await pool.end();
  }, 1000);
}

// Ejecutar configuración
setupAdminUsers().catch(async (error) => {
  console.error('❌ Error general:', error.message);
  await pool.end();
  process.exit(1);
});

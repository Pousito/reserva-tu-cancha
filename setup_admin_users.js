const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('👑 CONFIGURACIÓN DE USUARIOS ADMINISTRADORES');
console.log('============================================');

// Ruta de la base de datos
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/database.sqlite'  // Ruta persistente en Render
  : './database.sqlite';                       // Ruta local

console.log(`📁 Ruta de BD: ${dbPath}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    console.error('📍 Ruta intentada:', dbPath);
    return;
  }
  
  console.log('✅ Conectado a la base de datos SQLite');
  
  // Verificar y crear usuarios admin
  setupAdminUsers();
});

function setupAdminUsers() {
  console.log('\n🔍 VERIFICANDO USUARIOS ADMINISTRADORES...');
  
  // Verificar si la tabla usuarios existe
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", (err, tables) => {
    if (err) {
      console.error('❌ Error verificando tabla usuarios:', err.message);
      return;
    }
    
    if (tables.length === 0) {
      console.log('⚠️  Tabla usuarios no existe, creando...');
      createUsersTable();
    } else {
      console.log('✅ Tabla usuarios existe, verificando contenido...');
      checkExistingUsers();
    }
  });
}

function createUsersTable() {
  console.log('\n🔨 CREANDO TABLA USUARIOS...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('super_admin', 'admin', 'usuario')),
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso DATETIME
    );
  `;
  
  db.exec(createTableSQL, (err) => {
    if (err) {
      console.error('❌ Error creando tabla usuarios:', err.message);
      return;
    }
    
    console.log('✅ Tabla usuarios creada exitosamente');
    createAdminUsers();
  });
}

function checkExistingUsers() {
  console.log('\n👥 VERIFICANDO USUARIOS EXISTENTES...');
  
  db.all("SELECT * FROM usuarios", (err, usuarios) => {
    if (err) {
      console.error('❌ Error consultando usuarios:', err.message);
      return;
    }
    
    console.log(`📊 Usuarios encontrados: ${usuarios.length}`);
    
    if (usuarios.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos');
      console.log('🔄 Creando usuarios administradores...');
      createAdminUsers();
    } else {
      usuarios.forEach(usuario => {
        console.log(`   - ${usuario.email} (${usuario.rol}) - Activo: ${usuario.activo ? 'Sí' : 'No'}`);
      });
      
      // Verificar si hay super admin
      const superAdmin = usuarios.find(u => u.rol === 'super_admin' && u.activo === 1);
      if (!superAdmin) {
        console.log('⚠️  No hay super admin activo, creando...');
        createAdminUsers();
      } else {
        console.log('✅ Super admin encontrado y activo');
        console.log('\n🎉 Configuración de usuarios completada');
        db.close();
      }
    }
  });
}

function createAdminUsers() {
  console.log('\n👑 CREANDO USUARIOS ADMINISTRADORES...');
  
  // Usuarios administradores
  const adminUsers = [
    {
      email: 'admin@reservatucancha.com',
      password: 'admin123', // En producción debería ser hash
      nombre: 'Super Administrador',
      rol: 'super_admin'
    },
    {
      email: 'admin@magnasports.cl',
      password: 'magnasports2024',
      nombre: 'Administrador MagnaSports',
      rol: 'admin'
    },
    {
      email: 'admin@complejocentral.cl',
      password: 'complejo2024',
      nombre: 'Administrador Complejo Central',
      rol: 'admin'
    }
  ];
  
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO usuarios (email, password, nombre, rol, activo) 
    VALUES (?, ?, ?, ?, 1)
  `);
  
  adminUsers.forEach(usuario => {
    insertUser.run(usuario.email, usuario.password, usuario.nombre, usuario.rol, (err) => {
      if (err) {
        console.error(`❌ Error insertando usuario ${usuario.email}:`, err.message);
      } else {
        console.log(`✅ Usuario creado: ${usuario.email} (${usuario.rol})`);
      }
    });
  });
  
  insertUser.finalize(() => {
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
    setTimeout(() => {
      checkExistingUsers();
    }, 1000);
  });
}

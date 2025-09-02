const sqlite3 = require('sqlite3').verbose();

console.log('🚨 ARREGLO DE EMERGENCIA - CREANDO TABLA USUARIOS');
console.log('================================================');

// Ruta de la base de datos en Render
const dbPath = '/opt/render/project/src/database.sqlite';

console.log(`📁 Ruta de BD: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    console.error('📍 Ruta intentada:', dbPath);
    return;
  }
  
  console.log('✅ Conectado a la base de datos SQLite');
  createUsersTable();
});

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

function createAdminUsers() {
  console.log('\n👑 CREANDO USUARIOS ADMINISTRADORES...');
  
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
      rol: 'admin'
    },
    {
      email: 'admin@complejocentral.cl',
      password: 'complejo2024',
      nombre: 'Administrador Complejo Central',
      rol: 'admin'
    }
  ];
  
  adminUsers.forEach(usuario => {
    db.run("INSERT OR REPLACE INTO usuarios (email, password, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)", 
      [usuario.email, usuario.password, usuario.nombre, usuario.rol], (err) => {
      if (err) {
        console.error(`❌ Error creando usuario ${usuario.email}:`, err);
      } else {
        console.log(`✅ Usuario creado: ${usuario.email}`);
      }
    });
  });
  
  // Verificar usuarios creados
  setTimeout(() => {
    verifyUsers();
  }, 2000);
}

function verifyUsers() {
  console.log('\n🔍 VERIFICANDO USUARIOS CREADOS...');
  
  db.all("SELECT * FROM usuarios", (err, usuarios) => {
    if (err) {
      console.error('❌ Error verificando usuarios:', err.message);
      return;
    }
    
    console.log(`📊 Usuarios encontrados: ${usuarios.length}`);
    
    usuarios.forEach(usuario => {
      console.log(`   - ${usuario.email} (${usuario.rol}) - Activo: ${usuario.activo ? 'Sí' : 'No'}`);
    });
    
    console.log('\n🎉 ARREGLO COMPLETADO');
    console.log('========================');
    console.log('🔑 CREDENCIALES DE ACCESO:');
    console.log('========================');
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
    console.log('✅ Ahora puedes hacer login en el panel de administrador');
    
    db.close();
  });
}

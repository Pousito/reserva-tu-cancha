const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { BackupSystem } = require('./backup-system');

// Función para inicializar base de datos solo si está vacía
function initDatabaseIfEmpty() {
  console.log('🚀 INICIANDO initDatabaseIfEmpty()');
  console.log('================================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/data/database.sqlite';
  
  console.log(`📁 Ruta de BD: ${dbPath}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`🔧 DB_PATH: ${process.env.DB_PATH || 'undefined'}`);
  console.log(`💾 RENDER_DISK_PATH: ${process.env.RENDER_DISK_PATH || 'undefined'}`);
  console.log(`🔄 DEPLOY_ID: ${process.env.RENDER_DEPLOY_ID || 'undefined'}`);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error conectando a la base de datos:', err.message);
      console.error('📍 Ruta intentada:', dbPath);
      return;
    }
    
    console.log(`✅ Conectado a la base de datos SQLite en: ${dbPath}`);
    console.log('🔍 Verificando persistencia del disco...');
    
    // Verificar si el archivo de base de datos existe y tiene contenido
    const fs = require('fs');
    const path = require('path');
    try {
      const dbDir = path.dirname(dbPath);
      console.log(`📂 Directorio de BD: ${dbDir}`);
      
      // Verificar si el directorio existe
      if (fs.existsSync(dbDir)) {
        console.log(`✅ Directorio existe: ${dbDir}`);
        const dirStats = fs.statSync(dbDir);
        console.log(`📅 Directorio modificado: ${dirStats.mtime}`);
      } else {
        console.log(`❌ Directorio no existe: ${dbDir}`);
      }
      
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`📊 Tamaño de BD: ${stats.size} bytes`);
        console.log(`📅 Última modificación: ${stats.mtime}`);
        console.log(`🔍 Archivo de BD existe y tiene contenido`);
      } else {
        console.log('⚠️  Archivo de BD no existe, se creará nuevo');
      }
    } catch (error) {
      console.log('⚠️  No se pudo verificar el archivo de BD:', error.message);
    }
    
    checkAndInitialize();
  });

  async function checkAndInitialize() {
    console.log('🔍 Verificando estado de la base de datos...');
    
    // Crear instancia del sistema de respaldo unificado
    const backupSystem = new BackupSystem(dbPath);
    await backupSystem.connectDb();
    
    // Primero intentar restaurar desde respaldo si la BD está vacía
    const hasData = await backupSystem.checkDatabaseHasData();
    
    if (!hasData) {
      console.log('🔄 BD vacía, intentando restaurar desde respaldo...');
      const restored = await backupSystem.restoreFromLatestBackup();
      
      if (restored) {
        console.log('✅ BD restaurada desde respaldo, verificando datos...');
        // Verificar nuevamente si ahora tiene datos
        const hasDataAfterRestore = await backupSystem.checkDatabaseHasData();
        if (hasDataAfterRestore) {
          console.log('✅ Datos restaurados exitosamente');
          db.close();
          return;
        }
      }
    }
    
    // Verificar si ya hay datos (tanto ciudades como reservas)
    db.get('SELECT COUNT(*) as count FROM ciudades', (err, row) => {
      if (err) {
        console.log('📋 Tabla ciudades no existe, creando estructura...');
        console.log('❌ Error específico:', err.message);
        createTables();
      } else {
        // Verificar también si hay reservas existentes
        db.get('SELECT COUNT(*) as reservas FROM reservas', (err, reservasRow) => {
          if (err) {
            console.log('📋 Tabla reservas no existe, creando SOLO estructura de tablas...');
            createTablesOnly(); // Solo crear tablas, NO poblar datos
          } else if (row.count === 0) {
            console.log('🌱 Base de datos vacía, poblando con datos de ejemplo...');
            populateWithSampleData();
          } else {
            console.log(`✅ Base de datos ya tiene ${row.count} ciudades y ${reservasRow.reservas} reservas`);
            console.log('✅ No se necesita inicializar - preservando datos existentes');
            
            // Crear respaldo de la BD con datos usando el sistema unificado
            backupSystem.createBackup().then(() => {
              console.log('✅ Respaldo creado exitosamente');
              db.close();
            }).catch(error => {
              console.error('❌ Error creando respaldo:', error);
              db.close();
            });
          }
        });
      }
    });
  }

  function createTables() {
    db.serialize(() => {
      // Crear tablas si no existen
      db.run(`CREATE TABLE IF NOT EXISTS ciudades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS complejos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ciudad_id INTEGER,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        descripcion TEXT,
        FOREIGN KEY (ciudad_id) REFERENCES ciudades (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS canchas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complejo_id INTEGER,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('padel', 'futbol')),
        precio_hora INTEGER NOT NULL,
        descripcion TEXT,
        activa INTEGER DEFAULT 1,
        FOREIGN KEY (complejo_id) REFERENCES complejos (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cancha_id INTEGER,
        fecha TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        nombre_cliente TEXT NOT NULL,
        rut_cliente TEXT NOT NULL,
        email_cliente TEXT NOT NULL,
        codigo_reserva TEXT UNIQUE NOT NULL,
        estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmada', 'cancelada')),
        precio_total INTEGER NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cancha_id) REFERENCES canchas (id)
      )`);

      // Tabla de usuarios administradores
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('super_admin', 'admin', 'usuario')),
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso DATETIME
      )`);

      console.log('✅ Tablas creadas, poblando con datos...');
      populateWithSampleData();
    });
  }

  function createTablesOnly() {
    db.serialize(() => {
      // Crear tablas si no existen (sin poblar datos)
      db.run(`CREATE TABLE IF NOT EXISTS ciudades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS complejos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ciudad_id INTEGER,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        descripcion TEXT,
        FOREIGN KEY (ciudad_id) REFERENCES ciudades (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS canchas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complejo_id INTEGER,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('padel', 'futbol')),
        precio_hora INTEGER NOT NULL,
        descripcion TEXT,
        activa INTEGER DEFAULT 1,
        FOREIGN KEY (complejo_id) REFERENCES complejos (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cancha_id INTEGER,
        fecha TEXT NOT NULL,
        hora_inicio TEXT NOT NULL,
        hora_fin TEXT NOT NULL,
        nombre_cliente TEXT NOT NULL,
        rut_cliente TEXT NOT NULL,
        email_cliente TEXT NOT NULL,
        codigo_reserva TEXT UNIQUE NOT NULL,
        estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmada', 'cancelada')),
        precio_total INTEGER NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cancha_id) REFERENCES canchas (id)
      )`);

      // Tabla de usuarios administradores
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol TEXT NOT NULL CHECK(rol IN ('super_admin', 'admin', 'usuario')),
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        ultimo_acceso DATETIME
      )`);

      console.log('✅ Tablas creadas, preservando datos existentes...');
      db.close();
    });
  }

  function populateWithSampleData() {
  console.log('🌱 Insertando ciudades de ejemplo...');
  
  // Datos de ejemplo
  const ciudades = ['Santiago', 'Valparaíso', 'Concepción', 'Los Ángeles', 'La Serena', 'Antofagasta'];
  
  ciudades.forEach(ciudad => {
    db.run('INSERT OR IGNORE INTO ciudades (nombre) VALUES (?)', [ciudad], (err) => {
      if (err) {
        console.error(`❌ Error insertando ciudad ${ciudad}:`, err.message);
      } else {
        console.log(`✅ Ciudad insertada: ${ciudad}`);
      }
    });
  });

  // Agregar complejos y canchas de ejemplo después de un delay
  setTimeout(() => {
    console.log('🏢 Insertando complejos de ejemplo...');
    insertSampleComplexes();
  }, 1000);
}

function insertSampleComplexes() {
  const complejos = [
    { nombre: 'Complejo Deportivo Central', ciudad: 'Santiago', direccion: 'Av. Providencia 123', telefono: '+56912345678', email: 'info@complejocentral.cl' },
    { nombre: 'Padel Club Premium', ciudad: 'Santiago', direccion: 'Las Condes 456', telefono: '+56987654321', email: 'reservas@padelclub.cl' },
    { nombre: 'MagnaSports', ciudad: 'Los Ángeles', direccion: 'Monte Perdido 1685', telefono: '+56987654321', email: 'reservas@magnasports.cl' },
    { nombre: 'Centro Deportivo Costero', ciudad: 'Valparaíso', direccion: 'Av. Argentina 9012', telefono: '+56 32 2345 6791', email: 'info@costero.cl' },
    { nombre: 'Club Deportivo Norte', ciudad: 'Santiago', direccion: 'Av. Las Condes 5678', telefono: '+56 2 2345 6790', email: 'info@norte.cl' }
  ];
  
  const insertComplejo = db.prepare(`
    INSERT OR IGNORE INTO complejos (nombre, ciudad_id, direccion, telefono, email) 
    SELECT ?, id, ?, ?, ? FROM ciudades WHERE nombre = ?
  `);
  
  complejos.forEach(complejo => {
    insertComplejo.run(complejo.nombre, complejo.direccion, complejo.telefono, complejo.email, complejo.ciudad, (err) => {
      if (err) {
        console.error(`❌ Error insertando complejo ${complejo.nombre}:`, err.message);
      } else {
        console.log(`✅ Complejo insertado: ${complejo.nombre}`);
      }
    });
  });
  
  insertComplejo.finalize(() => {
    console.log('✅ Complejos insertados, agregando canchas...');
    
    // Insertar canchas después de un delay
    setTimeout(() => {
      insertSampleCourts();
    }, 1000);
  });
}

function insertSampleCourts() {
  console.log('⚽ Insertando canchas de ejemplo...');
  
  const canchas = [
    { nombre: 'Cancha Futbol 1', tipo: 'futbol', precio: 25000, complejo: 'Complejo Deportivo Central' },
    { nombre: 'Cancha Futbol 2', tipo: 'futbol', precio: 25000, complejo: 'Complejo Deportivo Central' },
    { nombre: 'Padel 1', tipo: 'padel', precio: 30000, complejo: 'Padel Club Premium' },
    { nombre: 'Padel 2', tipo: 'padel', precio: 30000, complejo: 'Padel Club Premium' },
    { nombre: 'Cancha Techada 1', tipo: 'futbol', precio: 28000, complejo: 'MagnaSports' },
    { nombre: 'Cancha Techada 2', tipo: 'futbol', precio: 28000, complejo: 'MagnaSports' },
    { nombre: 'Cancha Norte 1', tipo: 'futbol', precio: 28000, complejo: 'Club Deportivo Norte' },
    { nombre: 'Cancha Costera 1', tipo: 'futbol', precio: 22000, complejo: 'Centro Deportivo Costero' }
  ];
  
  const insertCancha = db.prepare(`
    INSERT OR IGNORE INTO canchas (complejo_id, nombre, tipo, precio_hora) 
    SELECT id, ?, ?, ? FROM complejos WHERE nombre = ?
  `);
  
  canchas.forEach(cancha => {
    insertCancha.run(cancha.nombre, cancha.tipo, cancha.precio, cancha.complejo, (err) => {
      if (err) {
        console.error(`❌ Error insertando cancha ${cancha.nombre}:`, err.message);
      } else {
        console.log(`✅ Cancha insertada: ${cancha.nombre}`);
      }
    });
  });
  
  insertCancha.finalize(() => {
    console.log('✅ Canchas insertadas, creando usuarios administradores...');
    
    // Crear usuarios administradores después de un delay
    setTimeout(() => {
      createAdminUsers();
    }, 1000);
  });
}

function createAdminUsers() {
  console.log('👑 Creando usuarios administradores...');
  
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
        console.log(`✅ Usuario administrador creado: ${usuario.email}`);
      }
    });
  });
  
  // Cerrar la base de datos después de crear usuarios
  setTimeout(async () => {
    console.log('🎉 Base de datos completamente inicializada con datos de ejemplo y usuarios administradores');
    
    // Crear respaldo de la BD inicializada usando el sistema unificado
    try {
      const backupSystem = new BackupSystem(dbPath);
      await backupSystem.connectDb();
      await backupSystem.createBackup();
      console.log('✅ Respaldo inicial creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando respaldo inicial:', error);
    }
    
    db.close();
  }, 2000);
}
}

// Exportar función para uso en server.js
module.exports = { initDatabaseIfEmpty };

// Si se ejecuta directamente
if (require.main === module) {
  initDatabaseIfEmpty();
}

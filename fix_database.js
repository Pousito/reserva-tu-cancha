const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 REPARACIÓN DE BASE DE DATOS');
console.log('==============================');

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
  
  // Iniciar proceso de reparación
  repairDatabase();
});

function repairDatabase() {
  console.log('\n🔨 INICIANDO REPARACIÓN DE BASE DE DATOS...');
  
  // Verificar si las tablas existen
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Error verificando tablas:', err.message);
      return;
    }
    
    console.log('📊 Tablas encontradas:', tables.map(t => t.name));
    
    if (tables.length === 0) {
      console.log('⚠️  No hay tablas en la base de datos');
      console.log('🔄 Creando estructura completa...');
      createCompleteStructure();
      return;
    }
    
    // Verificar contenido de cada tabla
    checkAndRepairTables();
  });
}

function checkAndRepairTables() {
  console.log('\n📊 VERIFICANDO Y REPARANDO TABLAS...');
  
  // Verificar ciudades
  db.all("SELECT * FROM ciudades", (err, ciudades) => {
    if (err) {
      console.error('❌ Error consultando ciudades:', err.message);
      console.log('🔄 Reparando tabla ciudades...');
      createCompleteStructure();
      return;
    }
    
    console.log(`🏙️  Ciudades encontradas: ${ciudades.length}`);
    if (ciudades.length > 0) {
      ciudades.forEach(ciudad => {
        console.log(`   - ${ciudad.nombre} (ID: ${ciudad.id})`);
      });
    } else {
      console.log('⚠️  No hay ciudades en la base de datos');
      console.log('🔄 Poblando con datos de ejemplo...');
      populateWithCompleteData();
      return;
    }
    
    // Verificar otras tablas
    checkOtherTables();
  });
}

function checkOtherTables() {
  // Verificar complejos
  db.all("SELECT * FROM complejos", (err, complejos) => {
    if (err) {
      console.log('⚠️  Tabla complejos no existe o tiene error');
      createCompleteStructure();
      return;
    }
    
    console.log(`🏢 Complejos encontrados: ${complejos.length}`);
    if (complejos.length === 0) {
      console.log('🔄 Poblando complejos...');
      populateWithCompleteData();
      return;
    }
    
    // Verificar canchas
    db.all("SELECT * FROM canchas", (err, canchas) => {
      if (err) {
        console.log('⚠️  Tabla canchas no existe o tiene error');
        createCompleteStructure();
        return;
      }
      
      console.log(`⚽ Canchas encontradas: ${canchas.length}`);
      if (canchas.length === 0) {
        console.log('🔄 Poblando canchas...');
        populateWithCompleteData();
        return;
      }
      
      console.log('\n✅ Base de datos está funcionando correctamente');
      console.log('🎉 No se necesita reparación');
      db.close();
    });
  });
}

function createCompleteStructure() {
  console.log('\n🔨 CREANDO ESTRUCTURA COMPLETA...');
  
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS ciudades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
    
    CREATE TABLE IF NOT EXISTS complejos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      ciudad_id INTEGER,
      direccion TEXT,
      telefono TEXT,
      email TEXT,
      descripcion TEXT,
      FOREIGN KEY (ciudad_id) REFERENCES ciudades (id)
    );
    
    CREATE TABLE IF NOT EXISTS canchas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complejo_id INTEGER,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('padel', 'futbol')),
      precio_hora INTEGER NOT NULL,
      descripcion TEXT,
      activa INTEGER DEFAULT 1,
      FOREIGN KEY (complejo_id) REFERENCES complejos (id)
    );
    
    CREATE TABLE IF NOT EXISTS reservas (
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
    );
  `;
  
  db.exec(createTablesSQL, (err) => {
    if (err) {
      console.error('❌ Error creando tablas:', err.message);
      return;
    }
    
    console.log('✅ Tablas creadas exitosamente');
    populateWithCompleteData();
  });
}

function populateWithCompleteData() {
  console.log('\n🌱 POBLANDO CON DATOS COMPLETOS...');
  
  // Insertar ciudades
  const ciudades = [
    'Santiago',
    'Valparaíso', 
    'Concepción',
    'Los Ángeles',
    'La Serena',
    'Antofagasta'
  ];
  
  const insertCiudad = db.prepare('INSERT OR IGNORE INTO ciudades (nombre) VALUES (?)');
  
  ciudades.forEach(ciudad => {
    insertCiudad.run(ciudad, (err) => {
      if (err) {
        console.error(`❌ Error insertando ciudad ${ciudad}:`, err.message);
      } else {
        console.log(`✅ Ciudad insertada: ${ciudad}`);
      }
    });
  });
  
  insertCiudad.finalize(() => {
    console.log('✅ Datos de ciudades insertados');
    
    // Insertar complejos después de que las ciudades estén creadas
    setTimeout(() => {
      insertSampleComplexes();
    }, 1000);
  });
}

function insertSampleComplexes() {
  console.log('\n🏢 INSERTANDO COMPLEJOS...');
  
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
    console.log('✅ Datos de complejos insertados');
    
    // Insertar canchas después de que los complejos estén creados
    setTimeout(() => {
      insertSampleCourts();
    }, 1000);
  });
}

function insertSampleCourts() {
  console.log('\n⚽ INSERTANDO CANCHAS...');
  
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
    console.log('✅ Datos de canchas insertados');
    console.log('\n🎉 BASE DE DATOS REPARADA COMPLETAMENTE');
    console.log('🔄 Verificando contenido final...');
    
    // Verificar contenido final
    setTimeout(() => {
      checkAndRepairTables();
    }, 1000);
  });
}

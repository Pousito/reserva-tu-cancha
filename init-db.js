const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Función para inicializar base de datos solo si está vacía
function initDatabaseIfEmpty() {
  const dbPath = process.env.DB_PATH || './database.sqlite';
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error conectando a la base de datos:', err);
      return;
    }
    
    console.log(`✅ Conectado a la base de datos en: ${dbPath}`);
    checkAndInitialize();
  });

  function checkAndInitialize() {
    // Verificar si ya hay datos
    db.get('SELECT COUNT(*) as count FROM ciudades', (err, row) => {
      if (err) {
        console.log('📋 Tabla ciudades no existe, creando estructura...');
        createTables();
      } else if (row.count === 0) {
        console.log('🌱 Base de datos vacía, poblando con datos de ejemplo...');
        populateWithSampleData();
      } else {
        console.log(`✅ Base de datos ya tiene ${row.count} ciudades, no se necesita inicializar`);
        db.close();
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

      console.log('✅ Tablas creadas, poblando con datos...');
      populateWithSampleData();
    });
  }

  function populateWithSampleData() {
    // Datos de ejemplo
    const ciudades = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta'];
    
    ciudades.forEach(ciudad => {
      db.run('INSERT OR IGNORE INTO ciudades (nombre) VALUES (?)', [ciudad]);
    });

    // Agregar complejos y canchas de ejemplo
    setTimeout(() => {
      console.log('✅ Base de datos inicializada con datos de ejemplo');
      db.close();
    }, 1000);
  }
}

// Exportar función para uso en server.js
module.exports = { initDatabaseIfEmpty };

// Si se ejecuta directamente
if (require.main === module) {
  initDatabaseIfEmpty();
}

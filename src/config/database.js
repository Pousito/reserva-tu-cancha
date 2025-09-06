const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDatabaseIfEmpty } = require('../../scripts/database/init-db');

// Configuración de la base de datos
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/database.sqlite'  // Ruta persistente en Render
  : './database.sqlite';                       // Ruta local

// Crear instancia de la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    console.error('Ruta intentada:', dbPath);
  } else {
    console.log(`✅ Conectado a la base de datos SQLite en: ${dbPath}`);
    
    // En producción, usar init-db.js para inicialización inteligente
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Modo producción: Usando inicialización inteligente');
      initDatabaseIfEmpty();
    } else {
      console.log('🖥️  Modo desarrollo: Usando inicialización estándar');
      initDatabase();
    }
  }
});

// Función de inicialización para desarrollo
function initDatabase() {
  db.serialize(() => {
    // Tabla de ciudades
    db.run(`CREATE TABLE IF NOT EXISTS ciudades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    )`);

    // Tabla de complejos deportivos
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

    // Tabla de canchas
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

    // Tabla de reservas
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

    // Migraciones
    db.run(`ALTER TABLE complejos ADD COLUMN descripcion TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna descripcion:', err);
      } else if (!err) {
        console.log('Campo descripcion agregado a la tabla complejos');
      }
    });

    db.run(`ALTER TABLE canchas ADD COLUMN descripcion TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna descripcion a canchas:', err);
      } else if (!err) {
        console.log('Campo descripcion agregado a la tabla canchas');
      }
    });

    db.run(`ALTER TABLE canchas ADD COLUMN activa INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna activa a canchas:', err);
      } else if (!err) {
        console.log('Campo activa agregado a la tabla canchas');
      }
    });

    // Insertar datos de ejemplo
    insertSampleData();
  });
}

// Insertar datos de ejemplo solo si la base de datos está vacía
function insertSampleData() {
  // Verificar si ya hay datos en la base de datos
  db.get("SELECT COUNT(*) as count FROM ciudades", (err, row) => {
    if (err) {
      console.error('Error verificando datos existentes:', err);
      return;
    }
    
    // Si ya hay datos, no insertar nada
    if (row.count > 0) {
      console.log('Base de datos ya contiene datos. Saltando inserción de datos de ejemplo.');
      return;
    }
    
    console.log('Base de datos vacía. Insertando datos de ejemplo...');
    
    // Insertar ciudades
    db.run("INSERT INTO ciudades (nombre) VALUES ('Santiago')");
    db.run("INSERT INTO ciudades (nombre) VALUES ('Valparaíso')");
    db.run("INSERT INTO ciudades (nombre) VALUES ('Concepción')");
    db.run("INSERT INTO ciudades (nombre) VALUES ('Los Ángeles')");
    
    // Insertar complejos después de que las ciudades estén creadas
    db.run("INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ('Complejo Deportivo Central', 1, 'Av. Providencia 123', '+56912345678', 'info@complejocentral.cl')");
    db.run("INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ('Padel Club Premium', 1, 'Las Condes 456', '+56987654321', 'reservas@padelclub.cl')");
    
    // Insertar MagnaSports usando el ID correcto de Los Ángeles
    db.get("SELECT id FROM ciudades WHERE nombre = 'Los Ángeles'", (err, row) => {
      if (err) {
        console.error('Error obteniendo ID de Los Ángeles:', err);
        return;
      }
      if (row) {
        db.run("INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ('MagnaSports', ?, 'Monte Perdido 1685', '+56987654321', 'reservas@magnasports.cl')", [row.id]);
      }
    });
    
    // Insertar canchas
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (1, 'Cancha Futbol 1', 'futbol', 25000)");
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (1, 'Cancha Futbol 2', 'futbol', 25000)");
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (2, 'Padel 1', 'padel', 30000)");
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (2, 'Padel 2', 'padel', 30000)");
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (3, 'Cancha Techada 1', 'futbol', 28000)");
    db.run("INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (3, 'Cancha Techada 2', 'futbol', 28000)");
    
    console.log('Datos de ejemplo insertados correctamente.');
    
    // Crear usuarios administradores
    createAdminUsers();
  });
}

// Crear usuarios administradores
function createAdminUsers() {
  console.log('Creando usuarios administradores...');
  
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
        console.error(`Error creando usuario ${usuario.email}:`, err);
      } else {
        console.log(`Usuario administrador creado: ${usuario.email}`);
      }
    });
  });
}

module.exports = db;

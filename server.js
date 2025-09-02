const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDatabaseIfEmpty } = require('./init-db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos con ruta persistente para Render
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/database.sqlite'  // Ruta persistente en Render
  : './database.sqlite';                       // Ruta local

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

// Inicializar base de datos
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

    // Migración: Agregar campo descripcion a complejos si no existe
    db.run(`ALTER TABLE complejos ADD COLUMN descripcion TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error agregando columna descripcion:', err);
      } else if (!err) {
        console.log('Campo descripcion agregado a la tabla complejos');
      }
    });

    // Migración: Agregar campos descripcion y activa a canchas si no existen
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

// Rutas API

// Endpoint de diagnóstico para verificar el estado de la base de datos
app.get('/api/debug/database', (req, res) => {
  console.log('🔍 SOLICITUD DE DIAGNÓSTICO RECIBIDA');
  
  const diagnosticInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'undefined',
    dbPath: process.env.NODE_ENV === 'production' ? '/opt/render/project/src/database.sqlite' : './database.sqlite',
    serverStatus: 'running',
    databaseConnection: 'unknown'
  };
  
  // Verificar conexión a la base de datos
  db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
    if (err) {
      diagnosticInfo.databaseConnection = 'error';
      diagnosticInfo.databaseError = err.message;
      diagnosticInfo.tables = [];
      diagnosticInfo.usersTable = false;
      diagnosticInfo.usersCount = 0;
      
      console.log('❌ Error en diagnóstico de BD:', err.message);
      res.json(diagnosticInfo);
      return;
    }
    
    // Obtener todas las tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        diagnosticInfo.databaseConnection = 'error';
        diagnosticInfo.databaseError = err.message;
        res.json(diagnosticInfo);
        return;
      }
      
      diagnosticInfo.databaseConnection = 'connected';
      diagnosticInfo.tables = tables.map(t => t.name);
      diagnosticInfo.usersTable = tables.some(t => t.name === 'usuarios');
      
      // Si existe la tabla usuarios, contar usuarios
      if (diagnosticInfo.usersTable) {
        db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
          diagnosticInfo.usersCount = err ? 'error' : row.count;
          
          // Obtener detalles de usuarios si existen
          if (row && row.count > 0) {
            db.all("SELECT email, rol, activo FROM usuarios", (err, usuarios) => {
              diagnosticInfo.users = err ? [] : usuarios;
              console.log('✅ Diagnóstico completado:', diagnosticInfo);
              res.json(diagnosticInfo);
            });
          } else {
            console.log('✅ Diagnóstico completado:', diagnosticInfo);
            res.json(diagnosticInfo);
          }
        });
      } else {
        console.log('✅ Diagnóstico completado:', diagnosticInfo);
        res.json(diagnosticInfo);
      }
    });
  });
});

// Obtener todas las ciudades
app.get('/api/ciudades', (req, res) => {
  db.all("SELECT * FROM ciudades ORDER BY nombre", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Obtener complejos por ciudad
app.get('/api/complejos/:ciudadId', (req, res) => {
  const { ciudadId } = req.params;
  db.all("SELECT * FROM complejos WHERE ciudad_id = ?", [ciudadId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Obtener canchas por complejo y tipo
app.get('/api/canchas/:complejoId/:tipo', (req, res) => {
  const { complejoId, tipo } = req.params;
  db.all("SELECT * FROM canchas WHERE complejo_id = ? AND tipo = ?", [complejoId, tipo], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Obtener disponibilidad de canchas
app.get('/api/disponibilidad/:canchaId/:fecha', (req, res) => {
  const { canchaId, fecha } = req.params;
  db.all(`
    SELECT hora_inicio, hora_fin 
    FROM reservas 
    WHERE cancha_id = ? AND fecha = ? AND estado != 'cancelada'
  `, [canchaId, fecha], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear nueva reserva
app.post('/api/reservas', (req, res) => {
  const { cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, precio_total } = req.body;
  
  // Verificar si ya existe una reserva para la misma cancha, fecha y hora
  db.get(`
    SELECT id FROM reservas 
    WHERE cancha_id = ? AND fecha = ? AND hora_inicio = ? AND estado != 'cancelada'
  `, [cancha_id, fecha, hora_inicio], (err, existingReservation) => {
    if (err) {
      res.status(500).json({ error: 'Error verificando disponibilidad' });
      return;
    }
    
    if (existingReservation) {
      res.status(400).json({ 
        error: 'Ya existe una reserva para esta cancha en la fecha y hora seleccionada',
        code: 'RESERVATION_CONFLICT'
      });
      return;
    }
  
  // Generar código de reserva único
  const codigo_reserva = 'RTC' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  
  db.run(`
    INSERT INTO reservas (cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, codigo_reserva, precio_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, codigo_reserva, precio_total], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Enviar email de confirmación (implementar después)
    // sendConfirmationEmail(email_cliente, codigo_reserva, fecha, hora_inicio);
    
    res.json({
      id: this.lastID,
      codigo_reserva,
      message: 'Reserva creada exitosamente'
      });
    });
  });
});

// Obtener reserva por código
app.get('/api/reservas/:codigo', (req, res) => {
  const { codigo } = req.params;
  db.get(`
    SELECT r.*, c.nombre as nombre_cancha, c.tipo, comp.nombre as nombre_complejo
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    WHERE r.codigo_reserva = ?
  `, [codigo], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    res.json(row);
  });
});

// Ruta de prueba para /api
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API de ReservaTuCancha funcionando correctamente',
    version: '1.0.0',
    endpoints: [
      '/api/ciudades',
      '/api/complejos/:ciudadId',
      '/api/canchas/:complejoId/:tipo',
      '/api/disponibilidad/:canchaId/:fecha',
      '/api/reservas',
      '/api/reservas/:codigo'
    ]
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== RUTAS DE ADMINISTRACIÓN =====

// Middleware de autenticación para admin
function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  
  // Verificación simple del token (en producción usar JWT)
  if (token === 'super-admin-token-123') {
    req.admin = { 
      id: 1, 
      email: 'admin@reservatucancha.com', 
      nombre: 'Super Administrador',
      rol: 'super_admin'
    };
    next();
  } else if (token === 'complex-owner-token-456') {
    req.admin = { 
      id: 2, 
      email: 'magnasports@reservatucancha.com', 
      nombre: 'Dueño MagnaSports',
      rol: 'complex_owner',
      complejo_id: 3
    };
    next();
  } else if (token === 'complex-owner-token-789') {
    req.admin = { 
      id: 3, 
      email: 'deportivo@reservatucancha.com', 
      nombre: 'Dueño Deportivo Central',
      rol: 'complex_owner',
      complejo_id: 1
    };
    next();
  } else {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware para verificar si es super admin
function requireSuperAdmin(req, res, next) {
  if (req.admin.rol !== 'super_admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Administrador.' });
  }
  next();
}

// Middleware para verificar si es dueño de complejo
function requireComplexOwner(req, res, next) {
  if (req.admin.rol !== 'complex_owner') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Dueño de Complejo.' });
  }
  next();
}

// Login de administrador
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  
  // Buscar usuario en la base de datos
  db.get("SELECT * FROM usuarios WHERE email = ? AND password = ? AND activo = 1", [email, password], (err, usuario) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ error: 'Error de conexión. Intenta nuevamente.' });
    }
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token simple (en producción usar JWT)
    const token = `admin-token-${usuario.id}-${Date.now()}`;
    
    // Actualizar último acceso
    db.run("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?", [usuario.id]);
    
    res.json({
      token: token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });
  });
});

// Estadísticas del dashboard
app.get('/api/admin/estadisticas', authenticateAdmin, (req, res) => {
  let whereClause = '';
  let params = [];
  
  // Si es dueño de complejo, filtrar por su complejo
  if (req.admin.rol === 'complex_owner') {
    whereClause = `
      WHERE r.cancha_id IN (
        SELECT id FROM canchas WHERE complejo_id = ?
      )
    `;
    params = [req.admin.complejo_id];
  }
  
  const queries = [
    `SELECT COUNT(*) as total FROM reservas r ${whereClause}`,
    `SELECT SUM(r.precio_total) as ingresos FROM reservas r ${whereClause}`,
    req.admin.rol === 'super_admin' 
      ? 'SELECT COUNT(*) as canchas FROM canchas'
      : `SELECT COUNT(*) as canchas FROM canchas WHERE complejo_id = ${req.admin.complejo_id}`,
    req.admin.rol === 'super_admin' 
      ? 'SELECT COUNT(*) as complejos FROM complejos'
      : 'SELECT 1 as complejos'
  ];
  
  Promise.all(queries.map((query, index) => 
    new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    })
  )).then(results => {
    // Obtener reservas por día (últimos 7 días)
    let reservasPorDiaQuery = `
      SELECT DATE(r.fecha) as fecha, COUNT(*) as cantidad 
      FROM reservas r
      WHERE r.fecha >= date('now', '-7 days')
    `;
    
    if (req.admin.rol === 'complex_owner') {
      reservasPorDiaQuery += ` AND r.cancha_id IN (
        SELECT id FROM canchas WHERE complejo_id = ?
      )`;
    }
    
    reservasPorDiaQuery += ' GROUP BY DATE(r.fecha) ORDER BY fecha';
    
    db.all(reservasPorDiaQuery, params, (err, reservasPorDia) => {
      if (err) {
        console.error('Error al obtener reservas por día:', err);
        reservasPorDia = [];
      }
      
      res.json({
        totalReservas: results[0].total,
        ingresosTotales: results[1].ingresos || 0,
        totalCanchas: results[2].canchas,
        totalComplejos: results[3].complejos,
        reservasPorDia: reservasPorDia,
        rol: req.admin.rol
      });
    });
  }).catch(err => {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
});

// Reservas recientes
app.get('/api/admin/reservas-recientes', authenticateAdmin, (req, res) => {
  let query = `
    SELECT r.*, c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, r.email_cliente as cliente_email
    FROM reservas r
    JOIN canchas can ON r.cancha_id = can.id
    JOIN complejos c ON can.complejo_id = c.id
  `;
  
  const params = [];
  
  // Si es dueño de complejo, filtrar por su complejo
  if (req.admin.rol === 'complex_owner') {
    query += ' WHERE c.id = ?';
    params.push(req.admin.complejo_id);
  }
  
  query += ' ORDER BY r.fecha_creacion DESC LIMIT 5';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error al obtener reservas recientes:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// Reservas de hoy
app.get('/api/admin/reservas-hoy', authenticateAdmin, (req, res) => {
  let query = `
    SELECT r.*, c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, r.email_cliente as cliente_email
    FROM reservas r
    JOIN canchas can ON r.cancha_id = can.id
    JOIN complejos c ON can.complejo_id = c.id
    WHERE DATE(r.fecha) = DATE('now')
  `;
  
  const params = [];
  
  // Si es dueño de complejo, filtrar por su complejo
  if (req.admin.rol === 'complex_owner') {
    query += ' AND c.id = ?';
    params.push(req.admin.complejo_id);
  }
  
  query += ' ORDER BY r.hora_inicio';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error al obtener reservas de hoy:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// Todas las reservas (para página de reservas)
app.get('/api/admin/reservas', authenticateAdmin, (req, res) => {
  const { fecha, complejo_id, estado } = req.query;
  
  let query = `
    SELECT r.*, c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, r.email_cliente as cliente_email
    FROM reservas r
    JOIN canchas can ON r.cancha_id = can.id
    JOIN complejos c ON can.complejo_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  // Si es dueño de complejo, solo mostrar sus reservas
  if (req.admin.rol === 'complex_owner') {
    query += ' AND c.id = ?';
    params.push(req.admin.complejo_id);
  }
  
  if (fecha) {
    query += ' AND DATE(r.fecha) = ?';
    params.push(fecha);
  }
  
  if (complejo_id && req.admin.rol === 'super_admin') {
    query += ' AND c.id = ?';
    params.push(complejo_id);
  }
  
  if (estado) {
    query += ' AND r.estado = ?';
    params.push(estado);
  }
  
  query += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error al obtener reservas:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// Obtener todos los complejos
app.get('/api/admin/complejos', authenticateAdmin, (req, res) => {
  const query = 'SELECT * FROM complejos ORDER BY nombre';
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error al obtener complejos:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
});

// ===== RUTAS DE ADMINISTRACIÓN PARA COMPLEJOS =====

// Obtener todos los complejos (con filtro por rol)
app.get('/api/admin/complejos', authenticateAdmin, (req, res) => {
  let query = `
    SELECT c.*, ci.nombre as ciudad_nombre
    FROM complejos c
    JOIN ciudades ci ON c.ciudad_id = ci.id
  `;
  let params = [];
  
  // Si es dueño de complejo, solo mostrar su complejo
  if (req.admin.rol === 'complex_owner') {
    query += ' WHERE c.id = ?';
    params.push(req.admin.complejo_id);
  }
  
  query += ' ORDER BY c.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error obteniendo complejos:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(rows);
  });
});

// Crear nuevo complejo
app.post('/api/admin/complejos', authenticateAdmin, requireSuperAdmin, (req, res) => {
  const { nombre, ciudad_id, email, telefono, direccion, descripcion } = req.body;
  
  if (!nombre || !ciudad_id) {
    res.status(400).json({ error: 'Nombre y ciudad son requeridos' });
    return;
  }
  
  const query = `
    INSERT INTO complejos (nombre, ciudad_id, email, telefono, direccion, descripcion)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [nombre, ciudad_id, email, telefono, direccion, descripcion], function(err) {
    if (err) {
      console.error('Error creando complejo:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json({ id: this.lastID, message: 'Complejo creado exitosamente' });
  });
});

// Actualizar complejo
app.put('/api/admin/complejos/:id', authenticateAdmin, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, ciudad_id, email, telefono, direccion, descripcion } = req.body;
  
  const query = `
    UPDATE complejos 
    SET nombre = ?, ciudad_id = ?, email = ?, telefono = ?, direccion = ?, descripcion = ?
    WHERE id = ?
  `;
  
  db.run(query, [nombre, ciudad_id, email, telefono, direccion, descripcion, id], function(err) {
    if (err) {
      console.error('Error actualizando complejo:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Complejo no encontrado' });
      return;
    }
    res.json({ message: 'Complejo actualizado exitosamente' });
  });
});

// Eliminar complejo
app.delete('/api/admin/complejos/:id', authenticateAdmin, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  
  // Verificar si el complejo tiene canchas
  db.get('SELECT COUNT(*) as count FROM canchas WHERE complejo_id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error verificando canchas:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    
    if (row.count > 0) {
      res.status(400).json({ error: 'No se puede eliminar un complejo que tiene canchas asociadas' });
      return;
    }
    
    db.run('DELETE FROM complejos WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error eliminando complejo:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Complejo no encontrado' });
        return;
      }
      res.json({ message: 'Complejo eliminado exitosamente' });
    });
  });
});

// ===== RUTAS DE ADMINISTRACIÓN PARA CANCHAS =====

// Obtener todas las canchas (con filtro por rol)
app.get('/api/admin/canchas', authenticateAdmin, (req, res) => {
  let query = `
    SELECT c.*, comp.nombre as complejo_nombre
    FROM canchas c
    JOIN complejos comp ON c.complejo_id = comp.id
  `;
  let params = [];
  
  // Si es dueño de complejo, solo mostrar canchas de su complejo
  if (req.admin.rol === 'complex_owner') {
    query += ' WHERE c.complejo_id = ?';
    params.push(req.admin.complejo_id);
  }
  
  query += ' ORDER BY comp.nombre, c.nombre';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error obteniendo canchas:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(rows);
  });
});

// Crear nueva cancha
app.post('/api/admin/canchas', authenticateAdmin, (req, res) => {
  const { nombre, complejo_id, tipo, precio_hora, descripcion, activa } = req.body;
  
  if (!nombre || !complejo_id || !tipo) {
    res.status(400).json({ error: 'Nombre, complejo y tipo son requeridos' });
    return;
  }
  
  // Si es dueño de complejo, verificar que la cancha pertenezca a su complejo
  if (req.admin.rol === 'complex_owner' && complejo_id != req.admin.complejo_id) {
    res.status(403).json({ error: 'No tienes permisos para crear canchas en este complejo' });
    return;
  }
  
  const query = `
    INSERT INTO canchas (nombre, complejo_id, tipo, precio_hora, descripcion, activa)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [nombre, complejo_id, tipo, precio_hora, descripcion, activa || 1], function(err) {
    if (err) {
      console.error('Error creando cancha:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json({ id: this.lastID, message: 'Cancha creada exitosamente' });
  });
});

// Actualizar cancha
app.put('/api/admin/canchas/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, complejo_id, tipo, precio_hora, descripcion, activa } = req.body;
  
  // Si es dueño de complejo, verificar que la cancha pertenezca a su complejo
  if (req.admin.rol === 'complex_owner') {
    db.get('SELECT complejo_id FROM canchas WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error verificando cancha:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      
      if (!row || row.complejo_id != req.admin.complejo_id) {
        res.status(403).json({ error: 'No tienes permisos para editar esta cancha' });
        return;
      }
      
      updateCancha();
    });
  } else {
    updateCancha();
  }
  
  function updateCancha() {
    const query = `
      UPDATE canchas 
      SET nombre = ?, complejo_id = ?, tipo = ?, precio_hora = ?, descripcion = ?, activa = ?
      WHERE id = ?
    `;
    
    db.run(query, [nombre, complejo_id, tipo, precio_hora, descripcion, activa, id], function(err) {
      if (err) {
        console.error('Error actualizando cancha:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Cancha no encontrada' });
        return;
      }
      res.json({ message: 'Cancha actualizada exitosamente' });
    });
  }
});

// Eliminar cancha
app.delete('/api/admin/canchas/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  
  // Si es dueño de complejo, verificar que la cancha pertenezca a su complejo
  if (req.admin.rol === 'complex_owner') {
    db.get('SELECT complejo_id FROM canchas WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error verificando cancha:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      
      if (!row || row.complejo_id != req.admin.complejo_id) {
        res.status(403).json({ error: 'No tienes permisos para eliminar esta cancha' });
        return;
      }
      
      deleteCancha();
    });
  } else {
    deleteCancha();
  }
  
  function deleteCancha() {
    // Verificar si la cancha tiene reservas
    db.get('SELECT COUNT(*) as count FROM reservas WHERE cancha_id = ?', [id], (err, row) => {
      if (err) {
        console.error('Error verificando reservas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      
      if (row.count > 0) {
        res.status(400).json({ error: 'No se puede eliminar una cancha que tiene reservas asociadas' });
        return;
      }
      
      db.run('DELETE FROM canchas WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error eliminando cancha:', err);
          res.status(500).json({ error: 'Error interno del servidor' });
          return;
        }
        if (this.changes === 0) {
          res.status(404).json({ error: 'Cancha no encontrada' });
          return;
        }
        res.json({ message: 'Cancha eliminada exitosamente' });
      });
    });
  }
});

// ===== RUTAS DE REPORTES =====

// Generar reportes
app.post('/api/admin/reports', authenticateAdmin, (req, res) => {
  const { dateFrom, dateTo, complexId } = req.body;
  
  // Si es dueño de complejo, solo puede ver reportes de su complejo
  if (req.admin.rol === 'complex_owner') {
    if (complexId && complexId != req.admin.complejo_id) {
      res.status(403).json({ error: 'No tienes permisos para ver reportes de otros complejos' });
      return;
    }
  }
  
  // Generar reportes en paralelo
  Promise.all([
    getMetrics(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getRevenueChart(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getTypeChart(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getOccupancyChart(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getHoursChart(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getTopComplexes(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getTopCourts(dateFrom, dateTo, complexId || req.admin.complejo_id),
    getCustomersAnalysis(dateFrom, dateTo, complexId || req.admin.complejo_id)
  ]).then(([metrics, revenueChart, typeChart, occupancyChart, hoursChart, topComplexes, topCourts, customers]) => {
    res.json({
      metrics,
      revenueChart,
      typeChart,
      occupancyChart,
      hoursChart,
      topComplexes,
      topCourts,
      customers
    });
  }).catch(err => {
    console.error('Error generando reportes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
});

// Obtener métricas principales
function getMetrics(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    // Ingresos totales
    const revenueQuery = `
      SELECT COALESCE(SUM(r.precio_total), 0) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
    `;
    
    // Total de reservas
    const reservationsQuery = `
      SELECT COUNT(*) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
    `;
    
    // Clientes únicos
    const customersQuery = `
      SELECT COUNT(DISTINCT r.email_cliente) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
    `;
    
    // Ocupación promedio
    const occupancyQuery = `
      SELECT 
        COALESCE(
          (COUNT(r.id) * 100.0) / 
          (SELECT COUNT(*) * 12 FROM canchas ca2 
           JOIN complejos c2 ON ca2.complejo_id = c2.id 
           WHERE c2.id = COALESCE(?, c2.id) AND ca2.activa = 1), 0
        ) as occupancy
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
    `;
    
    const occupancyParams = complexId ? [complexId, dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    Promise.all([
      new Promise((res, rej) => db.get(revenueQuery, params, (err, row) => err ? rej(err) : res(row))),
      new Promise((res, rej) => db.get(reservationsQuery, params, (err, row) => err ? rej(err) : res(row))),
      new Promise((res, rej) => db.get(customersQuery, params, (err, row) => err ? rej(err) : res(row))),
      new Promise((res, rej) => db.get(occupancyQuery, occupancyParams, (err, row) => err ? rej(err) : res(row)))
    ]).then(([revenue, reservations, customers, occupancy]) => {
      resolve({
        totalRevenue: revenue.total,
        totalReservations: reservations.total,
        uniqueCustomers: customers.total,
        occupancyRate: occupancy.occupancy,
        revenueChange: 0, // TODO: Calcular cambio respecto al período anterior
        reservationsChange: 0,
        customersChange: 0,
        occupancyChange: 0
      });
    }).catch(reject);
  });
}

// Gráfico de ingresos por día
function getRevenueChart(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    const query = `
      SELECT r.fecha, COALESCE(SUM(r.precio_total), 0) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY r.fecha
      ORDER BY r.fecha
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const labels = [];
      const data = [];
      
      // Generar todas las fechas en el rango
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' }));
        
        const row = rows.find(r => r.fecha === dateStr);
        data.push(row ? row.total : 0);
      }
      
      resolve({ labels, data });
    });
  });
}

// Gráfico de tipos de cancha
function getTypeChart(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    const query = `
      SELECT ca.tipo, COUNT(*) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY ca.tipo
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const labels = rows.map(row => row.tipo.toUpperCase());
      const data = rows.map(row => row.total);
      
      resolve({ labels, data });
    });
  });
}

// Gráfico de ocupación por complejo
function getOccupancyChart(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'WHERE c.id = ?' : '';
    const params = complexId ? [complexId] : [];
    
    const query = `
      SELECT 
        c.nombre,
        COALESCE(
          (COUNT(r.id) * 100.0) / 
          (SELECT COUNT(*) * 12 FROM canchas ca2 WHERE ca2.complejo_id = c.id AND ca2.activa = 1), 0
        ) as occupancy
      FROM complejos c
      LEFT JOIN canchas ca ON c.id = ca.complejo_id
      LEFT JOIN reservas r ON ca.id = r.cancha_id 
        AND r.fecha BETWEEN ? AND ? 
        AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY c.id, c.nombre
      ORDER BY occupancy DESC
    `;
    
    const queryParams = complexId ? [complexId, dateFrom, dateTo] : [dateFrom, dateTo];
    
    db.all(query, queryParams, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const labels = rows.map(row => row.nombre);
      const data = rows.map(row => Math.min(row.occupancy, 100)); // Cap at 100%
      
      resolve({ labels, data });
    });
  });
}

// Gráfico de horarios más populares
function getHoursChart(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    const query = `
      SELECT r.hora_inicio, COUNT(*) as total
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY r.hora_inicio
      ORDER BY r.hora_inicio
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const labels = rows.map(row => row.hora_inicio);
      const data = rows.map(row => row.total);
      
      resolve({ labels, data });
    });
  });
}

// Top complejos
function getTopComplexes(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'WHERE c.id = ?' : '';
    const params = complexId ? [complexId, dateFrom, dateTo] : [dateFrom, dateTo];
    
    const query = `
      SELECT 
        c.nombre,
        COUNT(r.id) as reservas,
        COALESCE(SUM(r.precio_total), 0) as ingresos,
        COALESCE(
          (COUNT(r.id) * 100.0) / 
          (SELECT COUNT(*) * 12 FROM canchas ca2 WHERE ca2.complejo_id = c.id AND ca2.activa = 1), 0
        ) as ocupacion
      FROM complejos c
      LEFT JOIN canchas ca ON c.id = ca.complejo_id
      LEFT JOIN reservas r ON ca.id = r.cancha_id 
        AND r.fecha BETWEEN ? AND ? 
        AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY c.id, c.nombre
      ORDER BY ingresos DESC
      LIMIT 10
    `;
    
    const queryParams = complexId ? [complexId, dateFrom, dateTo] : [dateFrom, dateTo];
    
    db.all(query, queryParams, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Top canchas
function getTopCourts(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    const query = `
      SELECT 
        ca.nombre,
        c.nombre as complejo,
        COUNT(r.id) as reservas,
        COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM canchas ca
      JOIN complejos c ON ca.complejo_id = c.id
      LEFT JOIN reservas r ON ca.id = r.cancha_id 
        AND r.fecha BETWEEN ? AND ? 
        AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY ca.id, ca.nombre, c.nombre
      ORDER BY ingresos DESC
      LIMIT 10
    `;
    
    const queryParams = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    db.all(query, queryParams, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Análisis de clientes
function getCustomersAnalysis(dateFrom, dateTo, complexId) {
  return new Promise((resolve, reject) => {
    const complexFilter = complexId ? 'AND c.id = ?' : '';
    const params = complexId ? [dateFrom, dateTo, complexId] : [dateFrom, dateTo];
    
    const query = `
      SELECT 
        r.nombre_cliente as nombre,
        r.email_cliente as email,
        COUNT(r.id) as reservas,
        COALESCE(SUM(r.precio_total), 0) as totalGastado,
        MAX(r.fecha) as ultimaReserva,
        CASE 
          WHEN MAX(r.fecha) >= date('now', '-30 days') THEN 1 
          ELSE 0 
        END as activo
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
      ${complexFilter}
      GROUP BY r.email_cliente, r.nombre_cliente
      ORDER BY totalGastado DESC
      LIMIT 20
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Health check para Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Manejo de rutas no encontradas (DEBE IR AL FINAL)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Local: http://localhost:${PORT}`);
  console.log(`🌐 Red local: http://[TU_IP_LOCAL]:${PORT}`);
  console.log(`📱 Accesible desde otros dispositivos en la misma red`);
});

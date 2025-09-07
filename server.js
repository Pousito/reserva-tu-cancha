const express = require('express');
const cors = require('cors');
const path = require('path');
// PostgreSQL + SQLite Hybrid Database System - Persistence Test
const DatabaseManager = require('./src/config/database');
const { insertEmergencyReservations } = require('./scripts/emergency/insert-reservations');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Sistema de base de datos híbrido (PostgreSQL + SQLite)
const db = new DatabaseManager();

// Inicializar base de datos
async function initializeDatabase() {
  try {
    await db.connect();
    
    // Poblar con datos de ejemplo si está vacía
    await populateSampleData();
    
    console.log('✅ Base de datos inicializada exitosamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

// Función para poblar datos de ejemplo
async function populateSampleData() {
  try {
    // Verificar si ya hay datos
    const ciudades = await db.query('SELECT COUNT(*) as count FROM ciudades');
    const reservas = await db.query('SELECT COUNT(*) as count FROM reservas');
    
    console.log('🔍 Debug - Ciudades encontradas:', ciudades);
    console.log('🔍 Debug - Reservas encontradas:', reservas);
    
    const ciudadesCount = ciudades[0]?.count || 0;
    const reservasCount = reservas[0]?.count || 0;
    
    console.log(`📊 Debug - Ciudades: ${ciudadesCount}, Reservas: ${reservasCount}`);
    
    if (ciudadesCount <= 1) { // Cambiar a <= 1 para incluir la ciudad de prueba
      console.log('🌱 Poblando base de datos con datos de ejemplo...');
    
    // Insertar ciudades
      const ciudadesData = ['Santiago', 'Valparaíso', 'Concepción', 'Los Ángeles', 'La Serena', 'Antofagasta'];
      console.log('🏙️ Insertando ciudades:', ciudadesData);
      for (const ciudad of ciudadesData) {
        try {
          if (db.getDbType() === 'PostgreSQL') {
            const result = await db.run('INSERT INTO ciudades (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [ciudad]);
            console.log(`✅ Ciudad insertada: ${ciudad}`, result);
          } else {
            const result = await db.run('INSERT OR IGNORE INTO ciudades (nombre) VALUES (?)', [ciudad]);
            console.log(`✅ Ciudad insertada: ${ciudad}`, result);
          }
        } catch (error) {
          console.error(`❌ Error insertando ciudad ${ciudad}:`, error);
        }
      }
      
      // Insertar complejos
      const complejosData = [
        { nombre: 'Complejo Deportivo Central', ciudad: 'Santiago', direccion: 'Av. Providencia 123', telefono: '+56912345678', email: 'info@complejocentral.cl' },
        { nombre: 'Padel Club Premium', ciudad: 'Santiago', direccion: 'Las Condes 456', telefono: '+56987654321', email: 'reservas@padelclub.cl' },
        { nombre: 'MagnaSports', ciudad: 'Los Ángeles', direccion: 'Monte Perdido 1685', telefono: '+56987654321', email: 'reservas@magnasports.cl' },
        { nombre: 'Centro Deportivo Costero', ciudad: 'Valparaíso', direccion: 'Av. Argentina 9012', telefono: '+56 32 2345 6791', email: 'info@costero.cl' },
        { nombre: 'Club Deportivo Norte', ciudad: 'Santiago', direccion: 'Av. Las Condes 5678', telefono: '+56 2 2345 6790', email: 'info@norte.cl' }
      ];
      
      for (const complejo of complejosData) {
        const ciudadId = await db.get('SELECT id FROM ciudades WHERE nombre = $1', [complejo.ciudad]);
        if (ciudadId) {
          if (db.getDbType() === 'PostgreSQL') {
            await db.run(
              'INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nombre) DO NOTHING',
              [complejo.nombre, ciudadId.id, complejo.direccion, complejo.telefono, complejo.email]
            );
      } else {
            await db.run(
              'INSERT OR IGNORE INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES (?, ?, ?, ?, ?)',
              [complejo.nombre, ciudadId.id, complejo.direccion, complejo.telefono, complejo.email]
            );
          }
        }
      }
      
      // Insertar canchas
      const canchasData = [
        { nombre: 'Cancha Futbol 1', tipo: 'futbol', precio: 25000, complejo: 'Complejo Deportivo Central' },
        { nombre: 'Cancha Futbol 2', tipo: 'futbol', precio: 25000, complejo: 'Complejo Deportivo Central' },
        { nombre: 'Padel 1', tipo: 'padel', precio: 30000, complejo: 'Padel Club Premium' },
        { nombre: 'Padel 2', tipo: 'padel', precio: 30000, complejo: 'Padel Club Premium' },
        { nombre: 'Cancha Techada 1', tipo: 'futbol', precio: 28000, complejo: 'MagnaSports' },
        { nombre: 'Cancha Techada 2', tipo: 'futbol', precio: 28000, complejo: 'MagnaSports' },
        { nombre: 'Cancha Norte 1', tipo: 'futbol', precio: 28000, complejo: 'Club Deportivo Norte' },
        { nombre: 'Cancha Costera 1', tipo: 'futbol', precio: 22000, complejo: 'Centro Deportivo Costero' }
      ];
      
      for (const cancha of canchasData) {
        const complejoId = await db.get('SELECT id FROM complejos WHERE nombre = $1', [cancha.complejo]);
        if (complejoId) {
          if (db.getDbType() === 'PostgreSQL') {
            await db.run(
              'INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES ($1, $2, $3, $4) ON CONFLICT (nombre) DO NOTHING',
              [complejoId.id, cancha.nombre, cancha.tipo, cancha.precio]
            );
      } else {
            await db.run(
              'INSERT OR IGNORE INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES (?, ?, ?, ?)',
              [complejoId.id, cancha.nombre, cancha.tipo, cancha.precio]
            );
          }
        }
      }
      
      // Insertar usuarios administradores
      const usuariosData = [
        { email: 'admin@reservatucancha.com', password: 'admin123', nombre: 'Super Administrador', rol: 'super_admin' },
        { email: 'admin@magnasports.cl', password: 'magnasports2024', nombre: 'Administrador MagnaSports', rol: 'admin' },
        { email: 'admin@complejocentral.cl', password: 'complejo2024', nombre: 'Administrador Complejo Central', rol: 'admin' }
      ];
      
      for (const usuario of usuariosData) {
        if (db.getDbType() === 'PostgreSQL') {
          await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
            [usuario.email, usuario.password, usuario.nombre, usuario.rol]
          );
        } else {
          await db.run(
            'INSERT OR REPLACE INTO usuarios (email, password, nombre, rol, activo) VALUES (?, ?, ?, ?, 1)',
            [usuario.email, usuario.password, usuario.nombre, usuario.rol]
          );
        }
      }
      
      console.log('✅ Datos de ejemplo insertados exitosamente');
    } else {
      console.log(`✅ Base de datos ya tiene ${ciudadesCount} ciudades y ${reservasCount} reservas`);
    }
  } catch (error) {
    console.error('❌ Error poblando datos de ejemplo:', error);
  }
}

// Inicializar base de datos al arrancar
initializeDatabase();

// ==================== RUTAS API ====================

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    const ciudades = await db.query('SELECT COUNT(*) as count FROM ciudades');
    const reservas = await db.query('SELECT COUNT(*) as count FROM reservas');
    const canchas = await db.query('SELECT COUNT(*) as count FROM canchas');
    const complejos = await db.query('SELECT COUNT(*) as count FROM complejos');
    
      res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: dbInfo,
      citiesCount: ciudades[0].count,
      reservasCount: reservas[0].count,
      canchasCount: canchas[0].count,
      complejosCount: complejos[0].count
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Endpoint de prueba simple para insertar una ciudad
app.get('/api/debug/test-insert', async (req, res) => {
  try {
    console.log('🧪 Insertando ciudad de prueba simple...');
    const result = await db.run('INSERT INTO ciudades (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', ['Santiago']);
    console.log('✅ Resultado inserción Santiago:', result);
    res.json({ success: true, message: 'Ciudad Santiago insertada', result: result });
  } catch (error) {
    console.error('❌ Error insertando Santiago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para insertar todas las ciudades
app.get('/api/debug/insert-all-cities', async (req, res) => {
  try {
    console.log('🏙️ Insertando todas las ciudades...');
    const ciudadesData = ['Valparaíso', 'Concepción', 'Los Ángeles', 'La Serena', 'Antofagasta'];
    const results = [];
    
    for (const ciudad of ciudadesData) {
      const result = await db.run('INSERT INTO ciudades (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [ciudad]);
      results.push({ ciudad, result });
      console.log(`✅ Ciudad insertada: ${ciudad}`, result);
    }
    
    res.json({ success: true, message: 'Todas las ciudades insertadas', results: results });
  } catch (error) {
    console.error('❌ Error insertando ciudades:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para forzar inicialización de datos
app.get('/api/debug/force-init', async (req, res) => {
  try {
    console.log('🔄 Forzando inicialización de datos...');
    
    // Verificar si las tablas existen
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('📋 Tablas existentes:', tables);
    
    // Poblar datos de ejemplo primero
    console.log('🌱 Poblando datos de ejemplo...');
    await populateSampleData();
    
    // Intentar insertar una ciudad directamente
    console.log('🧪 Insertando ciudad de prueba...');
    const result = await db.run('INSERT INTO ciudades (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', ['Ciudad de Prueba']);
    console.log('✅ Resultado inserción:', result);
    res.json({ success: true, message: 'Inicialización forzada exitosamente', tables: tables });
  } catch (error) {
    console.error('❌ Error en inicialización forzada:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint para verificar PostgreSQL
app.get('/debug/postgresql', async (req, res) => {
  try {
    const { Pool } = require('pg');
    
    const debugInfo = {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'Definido' : 'No definido',
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      currentDbType: db.getDbType ? db.getDbType() : 'Unknown'
    };
    
    if (!process.env.DATABASE_URL) {
      return res.json({
        success: false, 
        message: 'DATABASE_URL no está definido',
        debugInfo
      });
    }
    
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      
      client.release();
      await pool.end();
      
      res.json({ 
        success: true, 
        message: 'PostgreSQL conectado exitosamente',
        debugInfo,
        postgresql: {
          currentTime: result.rows[0].current_time,
          version: result.rows[0].pg_version
        }
      });
      
    } catch (pgError) {
      res.json({ 
        success: false, 
        message: 'Error conectando a PostgreSQL',
        debugInfo,
        error: pgError.message
      });
    }
    
  } catch (error) {
    res.status(500).json({
        success: false, 
      message: 'Error en debug endpoint',
      error: error.message
    });
  }
});

// Obtener ciudades
app.get('/api/ciudades', async (req, res) => {
  try {
    const ciudades = await db.query('SELECT * FROM ciudades ORDER BY nombre');
    res.json(ciudades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener complejos por ciudad
app.get('/api/complejos/:ciudadId', async (req, res) => {
  try {
  const { ciudadId } = req.params;
    const complejos = await db.query(
      'SELECT c.*, ci.nombre as ciudad_nombre FROM complejos c JOIN ciudades ci ON c.ciudad_id = ci.id WHERE c.ciudad_id = $1 ORDER BY c.nombre',
      [ciudadId]
    );
    res.json(complejos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener canchas por complejo
app.get('/api/canchas/:complejoId', async (req, res) => {
  try {
    const { complejoId } = req.params;
    const canchas = await db.query(
      'SELECT * FROM canchas WHERE complejo_id = $1 ORDER BY nombre',
      [complejoId]
    );
    res.json(canchas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener canchas por complejo y tipo
app.get('/api/canchas/:complejoId/:tipo', async (req, res) => {
  try {
    const { complejoId, tipo } = req.params;
    const canchas = await db.query(
      'SELECT * FROM canchas WHERE complejo_id = $1 AND tipo = $2 ORDER BY nombre',
      [complejoId, tipo]
    );
    res.json(canchas);
      } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener reservas
app.get('/api/reservas', async (req, res) => {
  try {
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY r.fecha DESC, r.hora_inicio DESC
    `);
    res.json(reservas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear reserva
app.post('/api/reservas', async (req, res) => {
  try {
    const { cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total } = req.body;
    
    // Generar código de reserva único
    const codigo_reserva = 'RES' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const result = await db.run(
      'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, 'pendiente']
    );
    
    res.json({ 
      success: true, 
      id: result.lastID,
      codigo_reserva,
      message: 'Reserva creada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de emergencia para insertar reservas de prueba
app.get('/api/emergency/insert-reservas', async (req, res) => {
  try {
    const reservasAntes = await db.query('SELECT COUNT(*) as count FROM reservas');
    
    // Insertar 4 reservas de prueba
    const reservasPrueba = [
      {
        cancha_id: 1,
        nombre_cliente: 'Juan Pérez',
        email_cliente: 'juan.perez@email.com',
        telefono_cliente: '+56912345678',
        fecha: '2025-09-08',
        hora_inicio: '18:00',
        hora_fin: '19:00',
        precio_total: 25000
      },
      {
        cancha_id: 2,
        nombre_cliente: 'María González',
        email_cliente: 'maria.gonzalez@email.com',
        telefono_cliente: '+56987654321',
        fecha: '2025-09-09',
        hora_inicio: '19:00',
        hora_fin: '20:00',
        precio_total: 25000
      },
      {
        cancha_id: 3,
        nombre_cliente: 'Carlos López',
        email_cliente: 'carlos.lopez@email.com',
        telefono_cliente: '+56911223344',
        fecha: '2025-09-10',
        hora_inicio: '20:00',
        hora_fin: '21:00',
        precio_total: 30000
      },
      {
        cancha_id: 4,
        nombre_cliente: 'Ana Martínez',
        email_cliente: 'ana.martinez@email.com',
        telefono_cliente: '+56955667788',
        fecha: '2025-09-11',
        hora_inicio: '21:00',
        hora_fin: '22:00',
        precio_total: 30000
      }
    ];
    
    let insertadas = 0;
    let errores = 0;
    
    for (const reserva of reservasPrueba) {
      try {
        const codigo_reserva = 'RES' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        await db.run(
          'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [codigo_reserva, reserva.cancha_id, reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.precio_total, 'pendiente']
        );
        insertadas++;
  } catch (error) {
        console.error('Error insertando reserva:', error);
        errores++;
      }
    }
    
    const reservasDespues = await db.query('SELECT COUNT(*) as count FROM reservas');
      
      res.json({
        success: true,
      message: `Reservas insertadas: ${insertadas}, Errores: ${errores}`,
      total: reservasPrueba.length,
      insertadas,
      errores,
      reservasAntes: reservasAntes[0].count,
      reservasDespues: reservasDespues[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de debug
app.get('/api/debug/table-data', async (req, res) => {
  try {
    const ciudades = await db.query('SELECT COUNT(*) as count FROM ciudades');
    const complejos = await db.query('SELECT COUNT(*) as count FROM complejos');
    const canchas = await db.query('SELECT COUNT(*) as count FROM canchas');
    const reservas = await db.query('SELECT COUNT(*) as count FROM reservas');
    const usuarios = await db.query('SELECT COUNT(*) as count FROM usuarios');
    
    const canchasEjemplos = await db.query('SELECT id, nombre, complejo_id FROM canchas LIMIT 5');
    
    res.json({ 
      success: true, 
      data: {
        ciudades: { count: ciudades[0].count },
        complejos: { count: complejos[0].count },
        canchas: { count: canchas[0].count, ejemplos: canchasEjemplos },
        reservas: { count: reservas[0].count },
        usuarios: { count: usuarios[0].count }
      }
    });
      } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Base de datos: ${db.getDatabaseInfo().type}`);
});

// Manejo de cierre graceful
// Función para crear respaldos automáticos
async function createBackup() {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Crear directorio de respaldos si no existe
    const backupDir = './data/backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `database_backup_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copiar base de datos actual al respaldo
    const currentDbPath = process.env.DB_PATH || './database.sqlite';
    if (fs.existsSync(currentDbPath)) {
      fs.copyFileSync(currentDbPath, backupPath);
      console.log(`💾 Respaldo creado: ${backupFileName}`);
    }
    
  } catch (error) {
    console.error('❌ Error creando respaldo:', error.message);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await db.close();
  process.exit(0);
});
// Test de persistencia - Sun Sep  7 02:06:46 -03 2025
// Test de persistencia - Sun Sep  7 02:21:56 -03 2025
// Forzar creación de PostgreSQL - Sun Sep  7 02:25:06 -03 2025

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

// ===== MIDDLEWARE DE AUTENTICACIÓN =====
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// ===== MIDDLEWARE DE PERMISOS POR ROL =====
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = req.user.rol;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permisos insuficientes',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

// ===== MIDDLEWARE DE RESTRICCIÓN POR COMPLEJO =====
const requireComplexAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
  }

  const userRole = req.user.rol;
  const userComplexId = req.user.complejo_id;

  // Super admin puede acceder a todo
  if (userRole === 'super_admin') {
    return next();
  }

  // Dueños y administradores solo pueden acceder a su complejo
  if (userRole === 'owner' || userRole === 'manager') {
    if (!userComplexId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Usuario no tiene complejo asignado' 
      });
    }
    
    // Agregar filtro de complejo a la consulta
    req.complexFilter = userComplexId;
    return next();
  }

  return res.status(403).json({ 
    success: false, 
    error: 'Rol no válido para esta operación' 
  });
};

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
    
    if (ciudadesCount === 0) { // Solo poblar si no hay ciudades
      console.log('🌱 Poblando base de datos con datos de ejemplo...');
    
    // Insertar ciudades
      const ciudadesData = ['Santiago', 'Valparaíso', 'Concepción', 'Los Ángeles', 'La Serena', 'Antofagasta'];
      console.log('🏙️ Insertando ciudades:', ciudadesData);
      for (const ciudad of ciudadesData) {
        try {
          if (db.getDatabaseInfo().type === 'PostgreSQL') {
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
          if (db.getDatabaseInfo().type === 'PostgreSQL') {
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
          if (db.getDatabaseInfo().type === 'PostgreSQL') {
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
        if (db.getDatabaseInfo().type === 'PostgreSQL') {
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

// ===== RUTAS OPTIMIZADAS DE DISPONIBILIDAD =====
const availabilityRoutes = require('./src/routes/availability');
app.use('/api/availability', availabilityRoutes);

// Endpoint para verificar disponibilidad de canchas (legacy - mantener compatibilidad)
app.get('/api/disponibilidad/:canchaId/:fecha', async (req, res) => {
  try {
  const { canchaId, fecha } = req.params;
    console.log(`🔍 Verificando disponibilidad - Cancha: ${canchaId}, Fecha: ${fecha}`);
    
    // Obtener reservas existentes para la cancha y fecha
    const reservas = await db.query(`
      SELECT hora_inicio, hora_fin, estado
    FROM reservas 
      WHERE cancha_id = $1 AND date(fecha) = $2 AND estado IN ('confirmada', 'pendiente')
      ORDER BY hora_inicio
    `, [canchaId, fecha]);
    
    console.log(`✅ ${reservas.length} reservas encontradas para cancha ${canchaId} en ${fecha}`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint optimizado para verificar disponibilidad completa de un complejo
app.get('/api/disponibilidad-completa/:complejoId/:fecha', async (req, res) => {
  try {
    const { complejoId, fecha } = req.params;
    console.log(`🚀 Verificando disponibilidad completa - Complejo: ${complejoId}, Fecha: ${fecha}`);
    
    // Una sola consulta que obtiene todas las reservas del complejo para la fecha
    // Compatible con SQLite y PostgreSQL
    const dbInfo = db.getDatabaseInfo();
    let fechaCondition;
    
    if (dbInfo.type === 'PostgreSQL') {
      fechaCondition = 'date(r.fecha) = $2';
    } else {
      fechaCondition = 'r.fecha = $2';
    }
    
    // Usar parámetros correctos según el tipo de base de datos
    let disponibilidad;
    if (dbInfo.type === 'PostgreSQL') {
      disponibilidad = await db.query(`
        SELECT 
          c.id as cancha_id, 
          c.nombre as cancha_nombre,
          c.tipo as cancha_tipo,
          r.hora_inicio, 
          r.hora_fin, 
          r.estado,
          r.codigo_reserva
        FROM canchas c
        LEFT JOIN reservas r ON c.id = r.cancha_id 
          AND date(r.fecha) = $2
          AND r.estado IN ('confirmada', 'pendiente')
        WHERE c.complejo_id = $1
        ORDER BY c.id, r.hora_inicio
      `, [complejoId, fecha]);
    } else {
      // SQLite
      disponibilidad = await db.query(`
        SELECT 
          c.id as cancha_id, 
          c.nombre as cancha_nombre,
          c.tipo as cancha_tipo,
          r.hora_inicio, 
          r.hora_fin, 
          r.estado,
          r.codigo_reserva
        FROM canchas c
        LEFT JOIN reservas r ON c.id = r.cancha_id 
          AND r.fecha = ?
          AND r.estado IN ('confirmada', 'pendiente')
        WHERE c.complejo_id = ?
        ORDER BY c.id, r.hora_inicio
      `, [fecha, complejoId]);
    }
    
    // Procesar los datos para agrupar por cancha
    const resultado = {};
    disponibilidad.forEach(item => {
      if (!resultado[item.cancha_id]) {
        resultado[item.cancha_id] = {
          cancha_id: item.cancha_id,
          cancha_nombre: item.cancha_nombre,
          cancha_tipo: item.cancha_tipo,
          reservas: []
        };
      }
      
      if (item.hora_inicio) {
        resultado[item.cancha_id].reservas.push({
          hora_inicio: item.hora_inicio,
          hora_fin: item.hora_fin,
          estado: item.estado,
          codigo_reserva: item.codigo_reserva
        });
      }
    });
    
    console.log(`✅ Disponibilidad completa obtenida para ${Object.keys(resultado).length} canchas en ${fecha}`);
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error verificando disponibilidad completa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoints del panel de administrador
app.get('/api/admin/estadisticas', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('📊 Cargando estadísticas del panel de administrador...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin ve todo
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    // Obtener estadísticas con filtros
    const totalReservas = await db.get(`
      SELECT COUNT(*) as count 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      ${whereClause}
    `, params);
    
    const totalCanchas = await db.get(`
      SELECT COUNT(*) as count 
      FROM canchas c
      ${userRole === 'super_admin' ? '' : 'WHERE c.complejo_id = $1'}
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    const totalComplejos = await db.get(`
      SELECT COUNT(*) as count 
      FROM complejos
      ${userRole === 'super_admin' ? '' : 'WHERE id = $1'}
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    // Solo super admin y dueños pueden ver ingresos
    let ingresosTotales = { total: 0 };
    if (userRole === 'super_admin' || userRole === 'owner') {
      ingresosTotales = await db.get(`
        SELECT COALESCE(SUM(r.precio_total), 0) as total 
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        WHERE r.estado = 'confirmada'
        ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = $1'}
      `, userRole === 'super_admin' ? [] : [complexFilter]);
    }
    
    // Reservas por día (últimos 7 días)
    const reservasPorDia = await db.query(`
      SELECT date(r.fecha) as dia, COUNT(*) as cantidad
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE r.fecha >= date('now', '-7 days')
      ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = $1'}
      GROUP BY date(r.fecha)
      ORDER BY dia
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    const stats = {
      totalReservas: totalReservas.count,
      totalCanchas: totalCanchas.count,
      totalComplejos: totalComplejos.count,
      ingresosTotales: parseInt(ingresosTotales.total || 0),
      reservasPorDia: reservasPorDia,
      userRole: userRole,
      complexFilter: complexFilter
    };
    
    console.log('✅ Estadísticas cargadas:', stats);
    res.json(stats);
      } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reservas-recientes', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('📝 Cargando reservas recientes...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin ve todo
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ${whereClause}
      ORDER BY r.fecha_creacion DESC
      LIMIT 10
    `, params);
    
    console.log(`✅ ${reservas.length} reservas recientes cargadas`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error cargando reservas recientes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reservas-hoy', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('📅 Cargando reservas de hoy...');
    
    const reservasHoy = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE date(r.fecha) = date('now')
      ORDER BY r.hora_inicio
    `);
    
    console.log(`✅ ${reservasHoy.length} reservas de hoy cargadas`);
    res.json(reservasHoy);
  } catch (error) {
    console.error('❌ Error cargando reservas de hoy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener todas las reservas (panel de administración)
app.get('/api/admin/reservas', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('📋 Cargando todas las reservas para administración...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin ve todo
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ${whereClause}
      ORDER BY r.fecha_creacion DESC
    `, params);
    
    console.log(`✅ ${reservas.length} reservas cargadas para administración`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error cargando reservas para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener complejos (panel de administración)
app.get('/api/admin/complejos', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('🏢 Cargando complejos para administración...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin ve todo
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.id = $1';
      params = [complexFilter];
    }
    
    const complejos = await db.query(`
      SELECT c.*, ci.nombre as ciudad_nombre
      FROM complejos c
      JOIN ciudades ci ON c.ciudad_id = ci.id
      ${whereClause}
      ORDER BY c.nombre
    `, params);
    
    console.log(`✅ ${complejos.length} complejos cargados para administración`);
    res.json(complejos);
  } catch (error) {
    console.error('❌ Error cargando complejos para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener canchas (panel de administración)
app.get('/api/admin/canchas', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('⚽ Cargando canchas para administración...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin ve todo
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    const canchas = await db.query(`
      SELECT c.*, co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM canchas c
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ${whereClause}
      ORDER BY co.nombre, c.nombre
    `, params);
    
    console.log(`✅ ${canchas.length} canchas cargadas para administración`);
    res.json(canchas);
  } catch (error) {
    console.error('❌ Error cargando canchas para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para confirmar una reserva (panel de administración)
app.put('/api/admin/reservas/:codigoReserva/confirmar', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    console.log(`✅ Confirmando reserva: ${codigoReserva}`);
    
    // Actualizar el estado de la reserva a 'confirmada'
    const result = await db.run(
      'UPDATE reservas SET estado = $1 WHERE codigo_reserva = $2',
      ['confirmada', codigoReserva]
    );
    
    if (result.changes > 0) {
      console.log(`✅ Reserva ${codigoReserva} confirmada exitosamente`);
      res.json({ success: true, message: 'Reserva confirmada exitosamente' });
    } else {
      console.log(`❌ Reserva ${codigoReserva} no encontrada`);
      res.status(404).json({ success: false, message: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error confirmando reserva:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para cancelar una reserva (panel de administración)
app.put('/api/admin/reservas/:codigoReserva/cancelar', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    console.log(`🚫 Cancelando reserva: ${codigoReserva}`);
    
    // Actualizar el estado de la reserva a 'cancelada'
    const result = await db.run(
      'UPDATE reservas SET estado = $1 WHERE codigo_reserva = $2',
      ['cancelada', codigoReserva]
    );
    
    if (result.changes > 0) {
      console.log(`✅ Reserva ${codigoReserva} cancelada exitosamente`);
      res.json({ success: true, message: 'Reserva cancelada exitosamente' });
    } else {
      console.log(`❌ Reserva ${codigoReserva} no encontrada`);
      res.status(404).json({ success: false, message: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error cancelando reserva:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para generar reportes (panel de administración)
app.post('/api/admin/reports', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    const { dateFrom, dateTo, complexId } = req.body;
    console.log('📊 Generando reportes para administración...', { dateFrom, dateTo, complexId });
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const userComplexFilter = req.complexFilter;
    
    // Construir filtros SQL según el rol
    let whereClause = `WHERE date(r.fecha) BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    // Aplicar filtro de complejo según el rol
    if (userRole === 'super_admin') {
      // Super admin puede filtrar por cualquier complejo
      if (complexId) {
        whereClause += ` AND co.id = $3`;
        params.push(complexId);
      }
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo pueden ver su complejo
      whereClause += ` AND co.id = $3`;
      params.push(userComplexFilter);
    }
    
    // Métricas generales
    const totalReservas = await db.get(`
      SELECT COUNT(*) as count 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
    `, params);
    
    const ingresosTotales = await db.get(`
      SELECT COALESCE(SUM(precio_total), 0) as total 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
    `, params);
    
    const reservasConfirmadas = await db.get(`
      SELECT COUNT(*) as count 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
    `, params);
    
    // Reservas por día (solo confirmadas)
    const reservasPorDia = await db.query(`
      SELECT date(r.fecha) as fecha, COUNT(*) as cantidad, COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY date(r.fecha)
      ORDER BY date(r.fecha)
    `, params);
    
    // Reservas por complejo con ocupación real (solo confirmadas)
    const reservasPorComplejo = await db.query(`
      SELECT 
        co.nombre as complejo, 
        COUNT(*) as cantidad, 
        COALESCE(SUM(r.precio_total), 0) as ingresos,
        COUNT(DISTINCT c.id) as canchas_count
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY co.id, co.nombre
      ORDER BY ingresos DESC
    `, params);
    
    // Calcular ocupación real para cada complejo
    const reservasPorComplejoConOcupacion = await Promise.all(reservasPorComplejo.map(async (complejo) => {
      // Calcular días en el rango de fechas
      const fechaInicio = new Date(dateFrom);
      const fechaFin = new Date(dateTo);
      const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
      
      let slotsDisponibles = 0;
      
      // Calcular slots disponibles día por día según el complejo
      for (let i = 0; i < diasDiferencia; i++) {
        const fechaActual = new Date(fechaInicio);
        fechaActual.setDate(fechaInicio.getDate() + i);
        const diaSemana = fechaActual.getDay(); // 0 = domingo, 6 = sábado
        
        let horasPorDia = 0;
        
        if (complejo.complejo === 'MagnaSports') {
          if (diaSemana === 0 || diaSemana === 6) {
            // Fines de semana: 12:00-23:00 (12 horas)
            horasPorDia = 12;
          } else {
            // Entre semana: 16:00-23:00 (8 horas)
            horasPorDia = 8;
          }
        } else {
          // Otros complejos: 08:00-23:00 (16 horas)
          horasPorDia = 16;
        }
        
        slotsDisponibles += complejo.canchas_count * horasPorDia;
      }
      
      // Reservas reales en el período
      const reservasReales = parseInt(complejo.cantidad);
      
      // Calcular ocupación real
      const ocupacionReal = slotsDisponibles > 0 ? (reservasReales / slotsDisponibles * 100) : 0;
      
      return {
        ...complejo,
        ocupacion_real: ocupacionReal.toFixed(1),
        slots_disponibles: slotsDisponibles,
        slots_ocupados: reservasReales
      };
    }));
    
    // Reservas por tipo de cancha (solo confirmadas)
    const reservasPorTipo = await db.query(`
      SELECT c.tipo, COUNT(*) as cantidad, COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY c.tipo
      ORDER BY ingresos DESC
    `, params);
    
    // Top canchas más reservadas (solo confirmadas)
    const topCanchas = await db.query(`
      SELECT c.nombre as cancha, co.nombre as complejo, COUNT(*) as reservas, COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY c.id, c.nombre, co.nombre
      ORDER BY reservas DESC
      LIMIT 10
    `, params);
    
    // Horarios más populares (solo confirmadas)
    const horariosPopulares = await db.query(`
      SELECT r.hora_inicio as hora, COUNT(*) as cantidad, COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY r.hora_inicio
      ORDER BY cantidad DESC, ingresos DESC
      LIMIT 10
    `, params);
    
    const reportData = {
      metrics: {
        totalReservas: parseInt(totalReservas.count),
        ingresosTotales: parseInt(ingresosTotales.total),
        reservasConfirmadas: parseInt(reservasConfirmadas.count),
        tasaConfirmacion: totalReservas.count > 0 ? (reservasConfirmadas.count / totalReservas.count * 100).toFixed(1) : 0
      },
      charts: {
        reservasPorDia: reservasPorDia,
        reservasPorComplejo: reservasPorComplejoConOcupacion,
        reservasPorTipo: reservasPorTipo,
        horariosPopulares: horariosPopulares
      },
      tables: {
        topCanchas: topCanchas
      }
    };
    
    console.log(`✅ Reportes generados exitosamente`);
    res.json(reportData);
  } catch (error) {
    console.error('❌ Error generando reportes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para limpiar complejos duplicados
app.get('/api/debug/clean-duplicate-complexes', async (req, res) => {
  try {
    console.log('🧹 Limpiando complejos duplicados...');
    
    // Eliminar complejos duplicados, manteniendo solo el de menor ID
    const result = await db.run(`
      DELETE FROM complejos 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM complejos 
        GROUP BY nombre, ciudad_id, direccion, telefono, email
      )
    `);
    
    console.log(`✅ Complejos duplicados eliminados: ${result.changes}`);
    
    // Verificar resultado
    const remaining = await db.query('SELECT COUNT(*) as count FROM complejos');
      
      res.json({
      success: true, 
      message: 'Complejos duplicados eliminados', 
      deleted: result.changes,
      remaining: remaining[0].count
    });
  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para verificar estructura de tabla reservas
app.get('/api/debug/check-reservas-structure', async (req, res) => {
  try {
    console.log('🔍 Verificando estructura de tabla reservas...');
    const structure = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reservas' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Estructura de tabla reservas:', structure);
    res.json({ success: true, message: 'Estructura de tabla reservas', structure: structure });
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para insertar reservas de prueba
app.get('/api/debug/insert-test-reservations', async (req, res) => {
  try {
    console.log('📝 Insertando reservas de prueba...');
    const reservasData = [
      { cancha_id: 1, fecha: '2024-09-15', hora_inicio: '10:00', hora_fin: '11:00', nombre_cliente: 'Juan Pérez', email_cliente: 'juan@email.com', telefono_cliente: '+56912345678', precio_total: 25000, codigo_reserva: 'RES001' },
      { cancha_id: 2, fecha: '2024-09-15', hora_inicio: '14:00', hora_fin: '15:00', nombre_cliente: 'María González', email_cliente: 'maria@email.com', telefono_cliente: '+56987654321', precio_total: 25000, codigo_reserva: 'RES002' }
    ];
    const results = [];
    
    for (const reserva of reservasData) {
      try {
        const result = await db.run(
          'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [reserva.codigo_reserva, reserva.cancha_id, reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.precio_total, 'confirmada']
        );
        results.push({ reserva: `${reserva.nombre_cliente} - ${reserva.fecha}`, result });
        console.log(`✅ Reserva insertada: ${reserva.nombre_cliente}`, result);
      } catch (error) {
        console.error(`❌ Error insertando reserva ${reserva.nombre_cliente}:`, error);
        results.push({ reserva: `${reserva.nombre_cliente} - ${reserva.fecha}`, error: error.message });
      }
    }
    
    res.json({ success: true, message: 'Reservas de prueba insertadas', results: results });
  } catch (error) {
    console.error('❌ Error insertando reservas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para insertar canchas
app.get('/api/debug/insert-courts', async (req, res) => {
  try {
    console.log('🏟️ Insertando canchas...');
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
    const results = [];
    
    for (const cancha of canchasData) {
      const complejoId = await db.get('SELECT id FROM complejos WHERE nombre = $1', [cancha.complejo]);
      if (complejoId) {
        const result = await db.run(
          'INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES ($1, $2, $3, $4)',
          [complejoId.id, cancha.nombre, cancha.tipo, cancha.precio]
        );
        results.push({ cancha: cancha.nombre, result });
        console.log(`✅ Cancha insertada: ${cancha.nombre}`, result);
    } else {
        console.log(`❌ Complejo no encontrado: ${cancha.complejo}`);
      }
    }
    
    res.json({ success: true, message: 'Canchas insertadas', results: results });
  } catch (error) {
    console.error('❌ Error insertando canchas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para insertar complejos
app.get('/api/debug/insert-complexes', async (req, res) => {
  try {
    console.log('🏢 Insertando complejos...');
    const complejosData = [
      { nombre: 'Complejo Deportivo Central', ciudad: 'Santiago', direccion: 'Av. Providencia 123', telefono: '+56912345678', email: 'info@complejocentral.cl' },
      { nombre: 'Padel Club Premium', ciudad: 'Santiago', direccion: 'Las Condes 456', telefono: '+56987654321', email: 'reservas@padelclub.cl' },
      { nombre: 'MagnaSports', ciudad: 'Los Ángeles', direccion: 'Monte Perdido 1685', telefono: '+56987654321', email: 'reservas@magnasports.cl' },
      { nombre: 'Centro Deportivo Costero', ciudad: 'Valparaíso', direccion: 'Av. Argentina 9012', telefono: '+56 32 2345 6791', email: 'info@costero.cl' },
      { nombre: 'Club Deportivo Norte', ciudad: 'Santiago', direccion: 'Av. Las Condes 5678', telefono: '+56 2 2345 6790', email: 'info@norte.cl' }
    ];
    const results = [];
    
    for (const complejo of complejosData) {
      const ciudadId = await db.get('SELECT id FROM ciudades WHERE nombre = $1', [complejo.ciudad]);
      if (ciudadId) {
        const result = await db.run(
          'INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ($1, $2, $3, $4, $5)',
          [complejo.nombre, ciudadId.id, complejo.direccion, complejo.telefono, complejo.email]
        );
        results.push({ complejo: complejo.nombre, result });
        console.log(`✅ Complejo insertado: ${complejo.nombre}`, result);
      } else {
        console.log(`❌ Ciudad no encontrada: ${complejo.ciudad}`);
      }
    }
    
    res.json({ success: true, message: 'Complejos insertados', results: results });
  } catch (error) {
    console.error('❌ Error insertando complejos:', error);
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

// Obtener tipos de cancha disponibles por complejo
app.get('/api/tipos-canchas/:complejoId', async (req, res) => {
  try {
    const { complejoId } = req.params;
    const tipos = await db.query(
      'SELECT DISTINCT tipo FROM canchas WHERE complejo_id = $1 ORDER BY tipo',
      [complejoId]
    );
    const tiposArray = tipos.map(t => t.tipo);
    res.json(tiposArray);
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

// Buscar reserva por código o nombre
app.get('/api/reservas/:busqueda', async (req, res) => {
  try {
    const { busqueda } = req.params;
    console.log(`🔍 Buscando reserva: ${busqueda}`);
    
    // Buscar por código de reserva o nombre del cliente
    const reserva = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.codigo_reserva = $1 OR r.nombre_cliente ILIKE $2
      ORDER BY r.fecha_creacion DESC
      LIMIT 1
    `, [busqueda, `%${busqueda}%`]);
    
    if (reserva.length > 0) {
      console.log(`✅ Reserva encontrada: ${reserva[0].codigo_reserva}`);
      res.json(reserva[0]);
    } else {
      console.log(`❌ Reserva no encontrada: ${busqueda}`);
      res.status(404).json({ error: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error buscando reserva:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear reserva
app.post('/api/reservas', async (req, res) => {
  try {
    const { cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total } = req.body;
    
    // Usar teléfono por defecto si no se proporciona
    const telefono = telefono_cliente || 'No proporcionado';
    
    // Generar código de reserva único
    const codigo_reserva = 'RES' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const result = await db.run(
      'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [codigo_reserva, cancha_id, nombre_cliente, email_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 'pendiente']
    );
    
    // Invalidar caché de disponibilidad
    const { invalidateCacheOnReservation } = require('./src/controllers/availabilityController');
    invalidateCacheOnReservation(cancha_id, fecha);
    
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

// ===== ENDPOINT DE LOGIN PARA ADMINISTRADORES =====
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Intento de login admin:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y contraseña son requeridos' 
      });
    }
    
    // Buscar usuario en la base de datos con información del complejo
    let user;
    const dbInfo = db.getDatabaseInfo();
    if (dbInfo.type === 'PostgreSQL') {
      user = await db.get(`
        SELECT u.*, c.nombre as complejo_nombre, c.id as complejo_id
        FROM usuarios u
        LEFT JOIN complejos c ON u.complejo_id = c.id
        WHERE u.email = $1 AND u.activo = true
      `, [email]);
    } else {
      user = await db.get(`
        SELECT u.*, c.nombre as complejo_nombre, c.id as complejo_id
        FROM usuarios u
        LEFT JOIN complejos c ON u.complejo_id = c.id
        WHERE u.email = ? AND u.activo = 1
      `, [email]);
    }
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Verificar contraseña usando bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Generar token JWT con información completa
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        nombre: user.nombre,
        rol: user.rol || 'manager',
        complejo_id: user.complejo_id,
        complejo_nombre: user.complejo_nombre
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login exitoso para:', email, 'Rol:', user.rol);
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol || 'manager',
        complejo_id: user.complejo_id,
        complejo_nombre: user.complejo_nombre
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login admin:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// ===== ENDPOINT DE DEBUG PARA LOGIN =====
app.get('/api/debug/login-test', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Probando funcionalidad de login...');
    
    // Verificar información de la base de datos
    const dbInfo = db.getDatabaseInfo();
    console.log('📊 Info de BD:', dbInfo);
    
    // Probar consulta de usuarios
    let users;
    if (dbInfo.type === 'PostgreSQL') {
      users = await db.query('SELECT id, email, nombre, rol, activo FROM usuarios LIMIT 5');
    } else {
      users = await db.query('SELECT id, email, nombre, rol, activo FROM usuarios LIMIT 5');
    }
    
    console.log('👥 Usuarios encontrados:', users.length);
    
    res.json({
      success: true,
      dbInfo: dbInfo,
      usersCount: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('❌ Error en debug login:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

// ===== ENDPOINT DE DEBUG PARA ESTRUCTURA DE USUARIOS =====
app.get('/api/debug/check-users-structure', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Verificando estructura de tabla usuarios...');
    
    // Verificar si la tabla existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);
    
    console.log('📋 Tabla usuarios existe:', tableExists[0].exists);
    
    if (tableExists[0].exists) {
      // Verificar estructura de la tabla
      const structure = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        ORDER BY ordinal_position
      `);
      
      // Contar registros
      const count = await db.get('SELECT COUNT(*) as count FROM usuarios');
      
      console.log('📊 Estructura de tabla usuarios:', structure);
      console.log('👥 Total de usuarios:', count.count);
      
      res.json({
        success: true,
        tableExists: tableExists[0].exists,
        structure: structure,
        userCount: count.count
      });
    } else {
      res.json({
        success: true,
        tableExists: false,
        message: 'Tabla usuarios no existe'
      });
    }
    
  } catch (error) {
    console.error('❌ Error verificando estructura usuarios:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

// ===== ENDPOINT PARA INSERTAR USUARIOS ADMIN =====
app.post('/api/debug/insert-admin-users', async (req, res) => {
  try {
    console.log('👥 Insertando usuarios administradores...');
    
    const usuariosData = [
      { email: 'admin@reservatucancha.com', password: 'admin123', nombre: 'Super Administrador', rol: 'super_admin' },
      { email: 'admin@magnasports.cl', password: 'magnasports2024', nombre: 'Administrador MagnaSports', rol: 'admin' },
      { email: 'admin@complejocentral.cl', password: 'complejo2024', nombre: 'Administrador Complejo Central', rol: 'admin' }
    ];
    
    const insertedUsers = [];
    
    for (const usuario of usuariosData) {
      try {
        await db.run(
          'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
          [usuario.email, usuario.password, usuario.nombre, usuario.rol]
        );
        insertedUsers.push(usuario.email);
        console.log(`✅ Usuario insertado: ${usuario.email}`);
      } catch (error) {
        console.error(`❌ Error insertando usuario ${usuario.email}:`, error);
      }
    }
    
    // Verificar usuarios insertados
    const count = await db.get('SELECT COUNT(*) as count FROM usuarios');
    
    res.json({
      success: true,
      message: 'Usuarios administradores insertados',
      insertedUsers: insertedUsers,
      totalUsers: count.count
    });
    
  } catch (error) {
    console.error('❌ Error insertando usuarios admin:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// ===== ENDPOINT TEMPORAL PARA LIMPIAR BASE DE DATOS DE PRODUCCIÓN =====
app.post('/api/debug/clean-production-db', async (req, res) => {
  try {
    console.log('🧹 Limpiando base de datos de producción...');
    
    // PASO 1: Limpiar todos los datos existentes
    console.log('PASO 1: Limpiando datos existentes...');
    
    // Actualizar usuarios para eliminar referencias a complejos
    await db.run('UPDATE usuarios SET complejo_id = NULL WHERE complejo_id IS NOT NULL');
    console.log('✅ Usuarios actualizados');
    
    // Eliminar reservas
    await db.run('DELETE FROM reservas');
    console.log('✅ Reservas eliminadas');
    
    // Eliminar canchas
    await db.run('DELETE FROM canchas');
    console.log('✅ Canchas eliminadas');
    
    // Eliminar complejos
    await db.run('DELETE FROM complejos');
    console.log('✅ Complejos eliminados');
    
    // Eliminar ciudades
    await db.run('DELETE FROM ciudades');
    console.log('✅ Ciudades eliminadas');
    
    // PASO 2: Insertar datos correctos
    console.log('PASO 2: Insertando datos correctos...');
    
    // Insertar ciudad Los Ángeles
    const ciudadResult = await db.run(
      'INSERT INTO ciudades (nombre) VALUES ($1) RETURNING id',
      ['Los Ángeles']
    );
    const ciudadId = ciudadResult.lastID;
    console.log(`✅ Ciudad "Los Ángeles" insertada con ID: ${ciudadId}`);
    
    // Insertar complejo MagnaSports
    const complejoResult = await db.run(
      'INSERT INTO complejos (nombre, direccion, telefono, ciudad_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['MagnaSports', 'Av. Principal 123', '+56912345678', ciudadId]
    );
    const complejoId = complejoResult.lastID;
    console.log(`✅ Complejo "MagnaSports" insertado con ID: ${complejoId}`);
    
    // Insertar canchas
    const cancha1Result = await db.run(
      'INSERT INTO canchas (nombre, tipo, precio_hora, complejo_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Cancha Techada 1', 'Fútbol', 28000, complejoId]
    );
    const cancha1Id = cancha1Result.lastID;
    console.log(`✅ Cancha "Cancha Techada 1" insertada con ID: ${cancha1Id}`);
    
    const cancha2Result = await db.run(
      'INSERT INTO canchas (nombre, tipo, precio_hora, complejo_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Cancha Techada 2', 'Fútbol', 28000, complejoId]
    );
    const cancha2Id = cancha2Result.lastID;
    console.log(`✅ Cancha "Cancha Techada 2" insertada con ID: ${cancha2Id}`);

    // PASO 3: Insertar usuarios administradores
    console.log('PASO 3: Insertando usuarios administradores...');
    
    const bcrypt = require('bcryptjs');
    
    // Super administrador
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);
    await db.run(
      'INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['superadmin@reservatucancha.com', superAdminPassword, 'Super Administrador', 'super_admin', true, null]
    );
    console.log('✅ Super administrador creado');
    
    // Dueño MagnaSports
    const duenoPassword = await bcrypt.hash('dueno123', 10);
    await db.run(
      'INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['dueno@magnasports.cl', duenoPassword, 'Dueño MagnaSports', 'admin', true, complejoId]
    );
    console.log('✅ Dueño MagnaSports creado');
    
    // Administrador MagnaSports
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id) VALUES ($1, $2, $3, $4, $5, $6)',
      ['admin@magnasports.cl', adminPassword, 'Administrador MagnaSports', 'admin', true, complejoId]
    );
    console.log('✅ Administrador MagnaSports creado');

    // PASO 4: Verificar estado final
    console.log('PASO 4: Verificando estado final...');
    
    const ciudadesCount = await db.get('SELECT COUNT(*) as count FROM ciudades');
    const complejosCount = await db.get('SELECT COUNT(*) as count FROM complejos');
    const canchasCount = await db.get('SELECT COUNT(*) as count FROM canchas');
    const usuariosCount = await db.get('SELECT COUNT(*) as count FROM usuarios');
    
    console.log(`📊 Estado final:`);
    console.log(`   - Ciudades: ${ciudadesCount.count}`);
    console.log(`   - Complejos: ${complejosCount.count}`);
    console.log(`   - Canchas: ${canchasCount.count}`);
    console.log(`   - Usuarios: ${usuariosCount.count}`);
    
    res.json({
      success: true,
      message: 'Base de datos de producción limpiada y configurada correctamente',
      data: {
        ciudadId,
        complejoId,
        cancha1Id,
        cancha2Id,
        counts: {
          ciudades: ciudadesCount.count,
          complejos: complejosCount.count,
          canchas: canchasCount.count,
          usuarios: usuariosCount.count
        }
      },
      credentials: {
        superAdmin: 'superadmin@reservatucancha.com / superadmin123',
        dueno: 'dueno@magnasports.cl / dueno123',
        admin: 'admin@magnasports.cl / admin123'
      }
    });
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// ===== ENDPOINT DE DEBUG PARA PROBAR FORMATEO DE FECHA =====
app.get('/api/debug/test-date-formatting', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Probando formateo de fechas...');
    
    // Función de formateo corregida (igual que en el frontend)
    function formatearFecha(fecha) {
      // Evitar problema de zona horaria creando la fecha con componentes específicos
      const [año, mes, dia] = fecha.split('-').map(Number);
      const fechaObj = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses
      
      const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      let fechaFormateada = fechaObj.toLocaleDateString('es-CL', opciones);
      
      // Capitalizar la primera letra del día de la semana
      fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
      
      return fechaFormateada;
    }
    
    // Función de formateo anterior (problemática)
    function formatearFechaAnterior(fecha) {
      const fechaObj = new Date(fecha);
      const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      let fechaFormateada = fechaObj.toLocaleDateString('es-CL', opciones);
      fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
      
      return fechaFormateada;
    }
    
    // Probar con varias fechas para detectar problemas de zona horaria
    const fechasTest = ['2025-09-11', '2025-01-01', '2025-12-31', '2025-06-15'];
    
    const resultados = [];
    let hayDiferencias = false;
    
    for (const fechaTest of fechasTest) {
      const resultadoCorregido = formatearFecha(fechaTest);
      const resultadoAnterior = formatearFechaAnterior(fechaTest);
      
      console.log('📅 Fecha original:', fechaTest);
      console.log('✅ Formateo corregido:', resultadoCorregido);
      console.log('❌ Formateo anterior:', resultadoAnterior);
      
      const hayDiferencia = resultadoCorregido !== resultadoAnterior;
      if (hayDiferencia) hayDiferencias = true;
      
      resultados.push({
        fechaOriginal: fechaTest,
        formateoCorregido: resultadoCorregido,
        formateoAnterior: resultadoAnterior,
        hayDiferencia: hayDiferencia
      });
    }
    
    res.json({
      success: true,
      resultados: resultados,
      problemaSolucionado: hayDiferencias,
      zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
  } catch (error) {
    console.error('❌ Error probando formateo de fecha:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA AGREGAR CAMPO RUT_CLIENTE =====
app.get('/api/debug/add-rut-column', async (req, res) => {
  try {
    console.log('🔧 Agregando columna rut_cliente a tabla reservas...');
    
    // Verificar si la columna ya existe
    const columnExists = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservas' AND column_name = 'rut_cliente'
    `);
    
    if (columnExists.length > 0) {
      console.log('✅ Columna rut_cliente ya existe');
      return res.json({ success: true, message: 'Columna rut_cliente ya existe' });
    }
    
    // Agregar la columna
    await db.run('ALTER TABLE reservas ADD COLUMN rut_cliente VARCHAR(20)');
    console.log('✅ Columna rut_cliente agregada exitosamente');
    
    res.json({ success: true, message: 'Columna rut_cliente agregada exitosamente' });
  } catch (error) {
    console.error('❌ Error agregando columna rut_cliente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT DE PRUEBA =====
app.get('/api/debug/test-simple', async (req, res) => {
  try {
    console.log('🧪 Prueba simple...');
    res.json({ success: true, message: 'Deploy funcionando correctamente', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Error en prueba simple:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA SINCRONIZAR BASE DE DATOS =====
app.get('/api/debug/sync-database', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización de base de datos...');
    
    const { syncProductionDatabase } = require('./scripts/maintenance/sync-production-db');
    await syncProductionDatabase();
    
    res.json({
      success: true,
      message: 'Base de datos sincronizada exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA SINCRONIZACIÓN FORZADA =====
app.get('/api/debug/force-sync-database', async (req, res) => {
  try {
    console.log('🔄 Iniciando sincronización forzada de base de datos...');
    
    const { forceSyncProduction } = require('./scripts/maintenance/force-sync-production');
    await forceSyncProduction();
    
    res.json({
      success: true,
      message: 'Base de datos sincronizada forzadamente exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA RESTAURAR RESERVAS =====
app.get('/api/debug/restore-reservations', async (req, res) => {
  try {
    console.log('🔄 Iniciando restauración de reservas...');
    
    const { restoreProductionReservations } = require('./scripts/maintenance/restore-production-reservations');
    await restoreProductionReservations();
    
    res.json({
      success: true,
      message: 'Reservas restauradas exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error restaurando reservas:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA RESTAURACIÓN SIMPLE =====
app.get('/api/debug/simple-restore-reservations', async (req, res) => {
  try {
    console.log('🔄 Iniciando restauración simple de reservas...');
    
    const { simpleRestoreReservations } = require('./scripts/maintenance/simple-restore-reservations');
    await simpleRestoreReservations();
    
    res.json({
      success: true,
      message: 'Reservas restauradas exitosamente (método simple)',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en restauración simple:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA OPTIMIZAR BASE DE DATOS =====
app.get('/api/debug/optimize-database', async (req, res) => {
  try {
    console.log('🚀 Optimizando base de datos con índices...');
    
    const dbInfo = db.getDatabaseInfo();
    if (dbInfo.type !== 'PostgreSQL') {
      return res.json({ 
        success: false, 
        message: 'Los índices solo se pueden crear en PostgreSQL',
        currentDb: dbInfo.type
      });
    }
    
    const indices = [
      {
        nombre: 'idx_reservas_cancha_fecha_estado',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reservas_cancha_fecha_estado ON reservas (cancha_id, fecha, estado)'
      },
      {
        nombre: 'idx_reservas_fecha_estado',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reservas_fecha_estado ON reservas (fecha, estado)'
      },
      {
        nombre: 'idx_reservas_cancha_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_reservas_cancha_id ON reservas (cancha_id)'
      },
      {
        nombre: 'idx_canchas_complejo_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_canchas_complejo_id ON canchas (complejo_id)'
      }
    ];
    
    const resultados = [];
    
    for (const indice of indices) {
      try {
        await db.run(indice.sql);
        resultados.push({
          indice: indice.nombre,
          estado: 'creado',
          mensaje: 'Índice creado exitosamente'
        });
        console.log(`✅ Índice creado: ${indice.nombre}`);
      } catch (error) {
        resultados.push({
          indice: indice.nombre,
          estado: 'error',
          mensaje: error.message
        });
        console.error(`❌ Error creando índice ${indice.nombre}:`, error.message);
      }
    }
    
    // Verificar índices existentes
    const indicesExistentes = await db.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('reservas', 'canchas')
      ORDER BY tablename, indexname
    `);
    
    res.json({
      success: true,
      message: 'Optimización de base de datos completada',
      dbType: dbInfo.type,
      indicesCreados: resultados,
      indicesExistentes: indicesExistentes
    });
    
  } catch (error) {
    console.error('❌ Error optimizando base de datos:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== ENDPOINT PARA AGREGAR CAMPOS DE ROL =====
app.get('/api/debug/add-role-fields', async (req, res) => {
  try {
    console.log('🔧 Agregando campos de rol a tabla usuarios...');
    
    // Verificar si las columnas ya existen
    const columnsExist = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name IN ('rol', 'complejo_id')
    `);
    
    const existingColumns = columnsExist.map(col => col.column_name);
    console.log('📋 Columnas existentes:', existingColumns);
    
    let addedColumns = [];
    
    // Agregar columna rol si no existe
    if (!existingColumns.includes('rol')) {
      await db.run('ALTER TABLE usuarios ADD COLUMN rol VARCHAR(20) DEFAULT \'manager\'');
      addedColumns.push('rol');
      console.log('✅ Columna rol agregada');
    } else {
      console.log('ℹ️ Columna rol ya existe');
    }
    
    // Agregar columna complejo_id si no existe
    if (!existingColumns.includes('complejo_id')) {
      await db.run('ALTER TABLE usuarios ADD COLUMN complejo_id INTEGER REFERENCES complejos(id)');
      addedColumns.push('complejo_id');
      console.log('✅ Columna complejo_id agregada');
    } else {
      console.log('ℹ️ Columna complejo_id ya existe');
    }
    
    // Verificar estructura final
    const finalStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Estructura final de tabla usuarios:');
    finalStructure.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    res.json({ 
      success: true, 
      message: 'Campos de rol agregados exitosamente',
      addedColumns,
      existingColumns,
      finalStructure
    });
    
  } catch (error) {
    console.error('❌ Error agregando campos de rol:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA CREAR USUARIOS DE EJEMPLO CON ROLES =====
app.get('/api/debug/create-role-users', async (req, res) => {
  try {
    console.log('👥 Creando usuarios de ejemplo con roles...');
    
    // Obtener ID del complejo MagnaSports
    const magnasports = await db.get('SELECT id FROM complejos WHERE nombre = $1', ['MagnaSports']);
    if (!magnasports) {
      throw new Error('Complejo MagnaSports no encontrado');
    }
    
    const complejoId = magnasports.id;
    console.log(`🏢 ID del complejo MagnaSports: ${complejoId}`);
    
    // Usuarios de ejemplo
    const usuariosEjemplo = [
      {
        email: 'superadmin@reservatucancha.com',
        password: 'superadmin123',
        nombre: 'Super Administrador',
        rol: 'super_admin',
        complejo_id: null // Super admin no tiene complejo específico
      },
      {
        email: 'dueno@magnasports.cl',
        password: 'dueno123',
        nombre: 'Dueño MagnaSports',
        rol: 'owner',
        complejo_id: complejoId
      },
      {
        email: 'admin@magnasports.cl',
        password: 'admin123',
        nombre: 'Administrador MagnaSports',
        rol: 'manager',
        complejo_id: complejoId
      }
    ];
    
    const resultados = [];
    
    for (const usuario of usuariosEjemplo) {
      try {
        // Verificar si el usuario ya existe
        const usuarioExistente = await db.get('SELECT id FROM usuarios WHERE email = $1', [usuario.email]);
        
        if (usuarioExistente) {
          // Actualizar usuario existente
          await db.run(`
            UPDATE usuarios 
            SET rol = $1, complejo_id = $2, nombre = $3
            WHERE email = $4
          `, [usuario.rol, usuario.complejo_id, usuario.nombre, usuario.email]);
          
          resultados.push({
            email: usuario.email,
            accion: 'actualizado',
            rol: usuario.rol,
            complejo_id: usuario.complejo_id
          });
          console.log(`✅ Usuario actualizado: ${usuario.email} (${usuario.rol})`);
        } else {
          // Crear nuevo usuario
          const hashedPassword = await bcrypt.hash(usuario.password, 10);
          await db.run(`
            INSERT INTO usuarios (email, password, nombre, rol, complejo_id, activo)
            VALUES ($1, $2, $3, $4, $5, true)
          `, [usuario.email, hashedPassword, usuario.nombre, usuario.rol, usuario.complejo_id]);
          
          resultados.push({
            email: usuario.email,
            accion: 'creado',
            rol: usuario.rol,
            complejo_id: usuario.complejo_id
          });
          console.log(`✅ Usuario creado: ${usuario.email} (${usuario.rol})`);
        }
      } catch (error) {
        console.error(`❌ Error con usuario ${usuario.email}:`, error);
        resultados.push({
          email: usuario.email,
          accion: 'error',
          error: error.message
        });
      }
    }
    
    // Verificar usuarios finales
    const usuariosFinales = await db.query(`
      SELECT u.email, u.nombre, u.rol, u.complejo_id, c.nombre as complejo_nombre
      FROM usuarios u
      LEFT JOIN complejos c ON u.complejo_id = c.id
      WHERE u.rol IN ('super_admin', 'owner', 'manager')
      ORDER BY u.rol, u.email
    `);
    
    console.log('📊 Usuarios finales:');
    usuariosFinales.forEach(user => {
      console.log(`- ${user.email}: ${user.rol} (${user.complejo_nombre || 'Sin complejo'})`);
    });
    
    res.json({ 
      success: true, 
      message: 'Usuarios de ejemplo creados exitosamente',
      resultados,
      usuariosFinales
    });
    
  } catch (error) {
    console.error('❌ Error creando usuarios de ejemplo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑA =====
app.get('/api/debug/update-password', async (req, res) => {
  try {
    const { email, newPassword } = req.query;
    console.log('🔧 Actualizando contraseña para:', email);
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y nueva contraseña son requeridos' 
      });
    }
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Nueva contraseña hasheada:', hashedPassword);
    
    // Actualizar contraseña en la base de datos
    const result = await db.run(
      'UPDATE usuarios SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );
    
    if (result.changes === 0) {
      return res.json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }
    
    console.log('✅ Contraseña actualizada exitosamente');
    
    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente',
      email,
      newPassword,
      hashedPassword
    });
    
  } catch (error) {
    console.error('❌ Error actualizando contraseña:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA VERIFICAR CONTRASEÑA =====
app.get('/api/debug/check-password', async (req, res) => {
  try {
    const { email, password } = req.query;
    console.log('🔍 Verificando contraseña para:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y contraseña son requeridos' 
      });
    }
    
    // Buscar usuario
    const user = await db.get(`
      SELECT u.*, c.nombre as complejo_nombre, c.id as complejo_id
      FROM usuarios u
      LEFT JOIN complejos c ON u.complejo_id = c.id
      WHERE u.email = $1 AND u.activo = true
    `, [email]);
    
    if (!user) {
      return res.json({ 
        success: false, 
        error: 'Usuario no encontrado',
        user: null
      });
    }
    
    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        complejo_id: user.complejo_id,
        complejo_nombre: user.complejo_nombre
      },
      passwordMatch,
      passwordHash: user.password.substring(0, 20) + '...' // Solo mostrar los primeros 20 caracteres
    });
    
  } catch (error) {
    console.error('❌ Error verificando contraseña:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA VERIFICAR TOKEN =====
app.get('/api/debug/verify-token', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Verificando token...');
    console.log('👤 Usuario del token:', req.user);
    
    res.json({ 
      success: true, 
      message: 'Token verificado exitosamente',
      user: req.user,
      complexFilter: req.complexFilter
    });
    
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA VER USUARIOS =====
app.get('/api/debug/list-users', async (req, res) => {
  try {
    console.log('👥 Listando usuarios...');
    
    const usuarios = await db.query(`
      SELECT u.id, u.email, u.nombre, u.rol, u.activo, u.complejo_id, c.nombre as complejo_nombre
      FROM usuarios u
      LEFT JOIN complejos c ON u.complejo_id = c.id
      ORDER BY u.rol, u.email
    `);
    
    console.log('📊 Usuarios encontrados:', usuarios.length);
    usuarios.forEach(user => {
      console.log(`- ${user.email}: ${user.rol} (${user.complejo_nombre || 'Sin complejo'}) - Activo: ${user.activo}`);
    });
    
    res.json({ 
      success: true, 
      message: 'Usuarios listados exitosamente',
      usuarios
    });
    
  } catch (error) {
    console.error('❌ Error listando usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA LIMPIAR BASE DE DATOS =====
app.get('/api/debug/clean-database', async (req, res) => {
  try {
    console.log('🧹 Limpiando base de datos - solo Los Ángeles y MagnaSports...');
    
    // 1. Eliminar reservas de otros complejos (mantener solo MagnaSports)
    const reservasEliminadas = await db.run(`
      DELETE FROM reservas 
      WHERE cancha_id IN (
        SELECT c.id FROM canchas c 
        JOIN complejos co ON c.complejo_id = co.id 
        WHERE co.nombre != 'MagnaSports'
      )
    `);
    console.log(`✅ Reservas eliminadas: ${reservasEliminadas.changes || 0}`);
    
    // 2. Eliminar canchas de otros complejos
    const canchasEliminadas = await db.run(`
      DELETE FROM canchas 
      WHERE complejo_id IN (
        SELECT id FROM complejos WHERE nombre != 'MagnaSports'
      )
    `);
    console.log(`✅ Canchas eliminadas: ${canchasEliminadas.changes || 0}`);
    
    // 3. Eliminar complejos que no sean MagnaSports
    const complejosEliminados = await db.run(`
      DELETE FROM complejos WHERE nombre != 'MagnaSports'
    `);
    console.log(`✅ Complejos eliminados: ${complejosEliminados.changes || 0}`);
    
    // 4. Eliminar ciudades que no sean Los Ángeles
    const ciudadesEliminadas = await db.run(`
      DELETE FROM ciudades WHERE nombre != 'Los Ángeles'
    `);
    console.log(`✅ Ciudades eliminadas: ${ciudadesEliminadas.changes || 0}`);
    
    // 5. Verificar resultado final
    const ciudadesRestantes = await db.query('SELECT * FROM ciudades');
    const complejosRestantes = await db.query('SELECT * FROM complejos');
    const canchasRestantes = await db.query('SELECT * FROM canchas');
    const reservasRestantes = await db.query('SELECT COUNT(*) as count FROM reservas');
    
    console.log('📊 Estado final:');
    console.log(`- Ciudades: ${ciudadesRestantes.length}`);
    console.log(`- Complejos: ${complejosRestantes.length}`);
    console.log(`- Canchas: ${canchasRestantes.length}`);
    console.log(`- Reservas: ${reservasRestantes[0].count}`);
    
    res.json({ 
      success: true, 
      message: 'Base de datos limpiada exitosamente',
      eliminados: {
        reservas: reservasEliminadas.changes || 0,
        canchas: canchasEliminadas.changes || 0,
        complejos: complejosEliminados.changes || 0,
        ciudades: ciudadesEliminadas.changes || 0
      },
      restantes: {
        ciudades: ciudadesRestantes.length,
        complejos: complejosRestantes.length,
        canchas: canchasRestantes.length,
        reservas: reservasRestantes[0].count
      }
    });
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ENDPOINT PARA ANÁLISIS DE CLIENTES =====
app.get('/api/admin/customers-analysis', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    const { dateFrom, dateTo, complexId } = req.query;
    console.log('👥 Generando análisis de clientes...', { dateFrom, dateTo, complexId });
    
    // Construir filtros SQL
    let whereClause = `WHERE date(r.fecha) BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    if (complexId) {
      whereClause += ` AND co.id = $3`;
      params.push(complexId);
    }
    
    // Consulta simplificada para probar
    const clientesFrecuentes = await db.query(`
      SELECT 
        r.nombre_cliente,
        r.email_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        AVG(r.precio_total) as promedio_por_reserva,
        MIN(r.fecha) as primera_reserva,
        MAX(r.fecha) as ultima_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY r.nombre_cliente, r.email_cliente
      ORDER BY total_reservas DESC, total_gastado DESC
      LIMIT 10
    `, params);
    
    console.log('✅ Análisis de clientes generado exitosamente');
    
    res.json({
      success: true,
      data: {
        clientesFrecuentes: clientesFrecuentes,
        clientesMayorGasto: clientesFrecuentes,
        clientesNuevos: [],
        clientesRecurrentes: [],
        estadisticas: { clientes_unicos: clientesFrecuentes.length },
        distribucionComplejos: [],
        horariosPopulares: []
      }
    });
    
  } catch (error) {
    console.error('❌ Error generando análisis de clientes:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test de persistencia - Sun Sep  7 02:06:46 -03 2025
// Test de persistencia - Sun Sep  7 02:21:56 -03 2025
// Forzar creación de PostgreSQL - Sun Sep  7 02:25:06 -03 2025
// Test de persistencia final - Sun Sep  7 03:54:09 -03 2025

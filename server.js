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

// Endpoint para verificar disponibilidad de canchas
app.get('/api/disponibilidad/:canchaId/:fecha', async (req, res) => {
  try {
  const { canchaId, fecha } = req.params;
    console.log(`🔍 Verificando disponibilidad - Cancha: ${canchaId}, Fecha: ${fecha}`);
    
    // Obtener reservas existentes para la cancha y fecha
    const reservas = await db.query(`
      SELECT hora_inicio, hora_fin, estado
    FROM reservas 
      WHERE cancha_id = $1 AND DATE(fecha) = $2 AND estado IN ('confirmada', 'pendiente')
      ORDER BY hora_inicio
    `, [canchaId, fecha]);
    
    console.log(`✅ ${reservas.length} reservas encontradas para cancha ${canchaId} en ${fecha}`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoints del panel de administrador
app.get('/api/admin/estadisticas', async (req, res) => {
  try {
    console.log('📊 Cargando estadísticas del panel de administrador...');
    
    // Obtener estadísticas
    const totalReservas = await db.get('SELECT COUNT(*) as count FROM reservas');
    const totalCanchas = await db.get('SELECT COUNT(*) as count FROM canchas');
    const totalComplejos = await db.get('SELECT COUNT(*) as count FROM complejos');
    const ingresosTotales = await db.get('SELECT COALESCE(SUM(precio_total), 0) as total FROM reservas WHERE estado = \'confirmada\'');
    
    // Reservas por día (últimos 7 días)
    const reservasPorDia = await db.query(`
      SELECT DATE(fecha) as dia, COUNT(*) as cantidad
      FROM reservas 
      WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(fecha)
      ORDER BY dia
    `);
    
    const stats = {
      totalReservas: totalReservas.count,
      totalCanchas: totalCanchas.count,
      totalComplejos: totalComplejos.count,
      ingresosTotales: parseInt(ingresosTotales.total),
      reservasPorDia: reservasPorDia
    };
    
    console.log('✅ Estadísticas cargadas:', stats);
    res.json(stats);
      } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reservas-recientes', async (req, res) => {
  try {
    console.log('📝 Cargando reservas recientes...');
    
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
    
    console.log(`✅ ${reservas.length} reservas recientes cargadas`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error cargando reservas recientes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reservas-hoy', async (req, res) => {
  try {
    console.log('📅 Cargando reservas de hoy...');
    
    const reservasHoy = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE DATE(r.fecha) = CURRENT_DATE
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
app.get('/api/admin/reservas', async (req, res) => {
  try {
    console.log('📋 Cargando todas las reservas para administración...');
    
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY r.created_at DESC
    `);
    
    console.log(`✅ ${reservas.length} reservas cargadas para administración`);
    res.json(reservas);
  } catch (error) {
    console.error('❌ Error cargando reservas para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener complejos (panel de administración)
app.get('/api/admin/complejos', async (req, res) => {
  try {
    console.log('🏢 Cargando complejos para administración...');
    
    const complejos = await db.query(`
      SELECT c.*, ci.nombre as ciudad_nombre
      FROM complejos c
      JOIN ciudades ci ON c.ciudad_id = ci.id
      ORDER BY c.nombre
    `);
    
    console.log(`✅ ${complejos.length} complejos cargados para administración`);
    res.json(complejos);
  } catch (error) {
    console.error('❌ Error cargando complejos para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener canchas (panel de administración)
app.get('/api/admin/canchas', async (req, res) => {
  try {
    console.log('⚽ Cargando canchas para administración...');
    
    const canchas = await db.query(`
      SELECT c.*, co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM canchas c
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY co.nombre, c.nombre
    `);
    
    console.log(`✅ ${canchas.length} canchas cargadas para administración`);
    res.json(canchas);
  } catch (error) {
    console.error('❌ Error cargando canchas para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para confirmar una reserva (panel de administración)
app.put('/api/admin/reservas/:codigoReserva/confirmar', async (req, res) => {
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
app.put('/api/admin/reservas/:codigoReserva/cancelar', async (req, res) => {
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
app.post('/api/admin/reports', async (req, res) => {
  try {
    const { dateFrom, dateTo, complexId } = req.body;
    console.log('📊 Generando reportes para administración...', { dateFrom, dateTo, complexId });
    
    // Construir filtros SQL
    let whereClause = `WHERE DATE(r.fecha) BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    if (complexId) {
      whereClause += ` AND co.id = $3`;
      params.push(complexId);
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
      SELECT DATE(r.fecha) as fecha, COUNT(*) as cantidad, COALESCE(SUM(r.precio_total), 0) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      GROUP BY DATE(r.fecha)
      ORDER BY DATE(r.fecha)
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
      ORDER BY r.created_at DESC
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
    
    // Generar código de reserva único
    const codigo_reserva = 'RES' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const result = await db.run(
      'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 'pendiente']
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
    
    // Buscar usuario en la base de datos
    let user;
    const dbInfo = db.getDatabaseInfo();
    if (dbInfo.type === 'PostgreSQL') {
      user = await db.get(
        'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
        [email]
      );
    } else {
      user = await db.get(
        'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
        [email]
      );
    }
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Verificar contraseña (en este caso, las contraseñas están en texto plano)
    // En un sistema de producción, deberías usar bcrypt.compare()
    if (user.password !== password) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        rol: user.rol 
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
        rol: user.rol
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

// ===== ENDPOINT PARA ANÁLISIS DE CLIENTES =====
app.get('/api/admin/customers-analysis', async (req, res) => {
  try {
    const { dateFrom, dateTo, complexId } = req.query;
    console.log('👥 Generando análisis de clientes...', { dateFrom, dateTo, complexId });
    
    // Construir filtros SQL
    let whereClause = `WHERE DATE(r.fecha) BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    if (complexId) {
      whereClause += ` AND co.id = $3`;
      params.push(complexId);
    }
    
    // 1. Clientes más frecuentes (por número de reservas) - Agrupar por RUT si existe, sino por email
    const clientesFrecuentes = await db.query(`
      SELECT 
        r.nombre_cliente,
        r.email_cliente,
        r.rut_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        AVG(r.precio_total) as promedio_por_reserva,
        MIN(r.fecha) as primera_reserva,
        MAX(r.fecha) as ultima_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY COALESCE(r.rut_cliente, r.email_cliente), r.nombre_cliente, r.email_cliente, r.rut_cliente
      ORDER BY total_reservas DESC, total_gastado DESC
      LIMIT 10
    `, params);
    
    // 2. Clientes con mayor gasto
    const clientesMayorGasto = await db.query(`
      SELECT 
        r.nombre_cliente,
        r.email_cliente,
        r.rut_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        AVG(r.precio_total) as promedio_por_reserva,
        MIN(r.fecha) as primera_reserva,
        MAX(r.fecha) as ultima_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY COALESCE(r.rut_cliente, r.email_cliente), r.nombre_cliente, r.email_cliente, r.rut_cliente
      ORDER BY total_gastado DESC, total_reservas DESC
      LIMIT 10
    `, params);
    
    // 3. Clientes nuevos vs recurrentes
    const clientesNuevos = await db.query(`
      SELECT 
        r.nombre_cliente,
        r.email_cliente,
        r.rut_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        MIN(r.fecha) as primera_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY COALESCE(r.rut_cliente, r.email_cliente), r.nombre_cliente, r.email_cliente, r.rut_cliente
      HAVING COUNT(*) = 1
      ORDER BY total_gastado DESC
      LIMIT 10
    `, params);
    
    const clientesRecurrentes = await db.query(`
      SELECT 
        r.nombre_cliente,
        r.email_cliente,
        r.rut_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        MIN(r.fecha) as primera_reserva,
        MAX(r.fecha) as ultima_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY COALESCE(r.rut_cliente, r.email_cliente), r.nombre_cliente, r.email_cliente, r.rut_cliente
      HAVING COUNT(*) > 1
      ORDER BY total_reservas DESC, total_gastado DESC
      LIMIT 10
    `, params);
    
    // 4. Estadísticas generales de clientes
    const estadisticasClientes = await db.get(`
      SELECT 
        COUNT(DISTINCT r.nombre_cliente) as clientes_unicos,
        COUNT(DISTINCT r.email_cliente) as emails_unicos,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as ingresos_totales,
        AVG(r.precio_total) as promedio_por_reserva,
        COUNT(DISTINCT CASE WHEN r.fecha >= CURRENT_DATE - INTERVAL '30 days' THEN r.nombre_cliente END) as clientes_activos_30_dias,
        COUNT(DISTINCT CASE WHEN r.fecha >= CURRENT_DATE - INTERVAL '7 days' THEN r.nombre_cliente END) as clientes_activos_7_dias
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
    `, params);
    
    // 5. Distribución de clientes por complejo
    const distribucionComplejos = await db.query(`
      SELECT 
        co.nombre as complejo,
        COUNT(DISTINCT r.nombre_cliente) as clientes_unicos,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY co.id, co.nombre
      ORDER BY clientes_unicos DESC
    `, params);
    
    // 6. Horarios más populares
    const horariosPopulares = await db.query(`
      SELECT 
        r.hora_inicio as hora,
        COUNT(*) as cantidad,
        SUM(r.precio_total) as ingresos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      GROUP BY r.hora_inicio
      ORDER BY cantidad DESC, ingresos DESC
      LIMIT 10
    `, params);
    
    console.log('✅ Análisis de clientes generado exitosamente');
    
    res.json({
      success: true,
      data: {
        clientesFrecuentes: clientesFrecuentes,
        clientesMayorGasto: clientesMayorGasto,
        clientesNuevos: clientesNuevos,
        clientesRecurrentes: clientesRecurrentes,
        estadisticas: estadisticasClientes,
        distribucionComplejos: distribucionComplejos,
        horariosPopulares: horariosPopulares
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

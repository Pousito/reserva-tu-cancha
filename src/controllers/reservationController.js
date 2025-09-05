const db = require('../config/database');

/**
 * Obtener todas las ciudades
 */
function getCiudades(req, res) {
  db.all("SELECT * FROM ciudades ORDER BY nombre", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}

/**
 * Obtener complejos por ciudad
 */
function getComplejosByCiudad(req, res) {
  const { ciudadId } = req.params;
  db.all("SELECT * FROM complejos WHERE ciudad_id = ?", [ciudadId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}

/**
 * Obtener canchas por complejo y tipo
 */
function getCanchasByComplejoAndTipo(req, res) {
  const { complejoId, tipo } = req.params;
  db.all("SELECT * FROM canchas WHERE complejo_id = ? AND tipo = ?", [complejoId, tipo], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
}

/**
 * Obtener disponibilidad de canchas
 */
function getDisponibilidad(req, res) {
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
}

/**
 * Crear nueva reserva
 */
function createReserva(req, res) {
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

    // Generar código de reserva único (5 caracteres)
    const codigo_reserva = Math.random().toString(36).substr(2, 5).toUpperCase();
    
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
}

/**
 * Obtener todas las reservas (para el dashboard)
 */
function getAllReservas(req, res) {
  db.all(`
    SELECT r.*, c.nombre as nombre_cancha, c.tipo, comp.nombre as nombre_complejo
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    ORDER BY r.fecha_creacion DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows || []);
  });
}

/**
 * Obtener reserva por código o nombre
 */
function getReservaByCodigo(req, res) {
  const { busqueda } = req.params;
  
  // Buscar por código de reserva o nombre del cliente
  db.get(`
    SELECT r.*, c.nombre as nombre_cancha, c.tipo, comp.nombre as nombre_complejo
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    WHERE r.codigo_reserva = ? OR LOWER(r.nombre_cliente) = LOWER(?)
  `, [busqueda, busqueda], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Reserva no encontrada. Verifica el código o nombre ingresado.' });
      return;
    }
    res.json(row);
  });
}

/**
 * Endpoint de prueba para verificar la base de datos
 */
function testDatabase(req, res) {
  console.log('🧪 PRUEBA DE BASE DE DATOS');
  
  // Verificar si la tabla usuarios existe
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", (err, row) => {
    if (err) {
      console.error('❌ Error verificando tabla usuarios:', err);
      res.json({ 
        success: false, 
        error: err.message,
        message: 'Error verificando tabla usuarios'
      });
      return;
    }
    
    if (!row) {
      console.log('❌ Tabla usuarios NO existe');
      res.json({ 
        success: false, 
        error: 'Tabla usuarios no existe',
        message: 'La tabla usuarios no existe en la base de datos'
      });
      return;
    }
    
    console.log('✅ Tabla usuarios existe');
    
    // Contar usuarios
    db.get("SELECT COUNT(*) as count FROM usuarios", (err, countRow) => {
      if (err) {
        res.json({ 
          success: false, 
          error: err.message,
          message: 'Error contando usuarios'
        });
        return;
      }
      
      res.json({ 
        success: true, 
        message: 'Tabla usuarios existe y funciona',
        usersCount: countRow.count
      });
    });
  });
}

module.exports = {
  getCiudades,
  getComplejosByCiudad,
  getCanchasByComplejoAndTipo,
  getDisponibilidad,
  createReserva,
  getAllReservas,
  getReservaByCodigo,
  testDatabase
};

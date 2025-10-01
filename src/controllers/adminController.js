const db = require('../config/database');

/**
 * Estadísticas del dashboard
 */
function getEstadisticas(req, res) {
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
    // Obtener reservas por día (últimos 7 días) - Corregido para PostgreSQL
    let reservasPorDiaQuery = `
      SELECT TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha, COUNT(*) as cantidad 
      FROM reservas r
      WHERE r.fecha >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    if (req.admin.rol === 'complex_owner') {
      reservasPorDiaQuery += ` AND r.cancha_id IN (
        SELECT id FROM canchas WHERE complejo_id = ?
      )`;
    }
    
    reservasPorDiaQuery += ' GROUP BY r.fecha::date ORDER BY r.fecha::date';
    
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
}

/**
 * Reservas recientes
 */
function getReservasRecientes(req, res) {
  let query = `
    SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
           r.telefono_cliente, r.rut_cliente,
           TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
           r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
           r.estado, r.estado_pago, r.created_at,
           c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
           r.email_cliente as cliente_email
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
  
  query += ' ORDER BY r.created_at DESC LIMIT 5';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error al obtener reservas recientes:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    } else {
      res.json(rows);
    }
  });
}

/**
 * Reservas de hoy
 */
function getReservasHoy(req, res) {
  let query = `
    SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente, 
           r.telefono_cliente, r.rut_cliente,
           TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
           r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
           r.estado, r.estado_pago,
           c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
           r.email_cliente as cliente_email
    FROM reservas r
    JOIN canchas can ON r.cancha_id = can.id
    JOIN complejos c ON can.complejo_id = c.id
    WHERE r.fecha::date = CURRENT_DATE
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
}

/**
 * Todas las reservas (para página de reservas)
 */
function getAllReservasAdmin(req, res) {
  const { fecha, complejo_id, estado } = req.query;
  
  let query = `
    SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
           r.telefono_cliente, r.rut_cliente,
           TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
           r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
           r.estado, r.estado_pago, r.created_at,
           c.nombre as complejo_nombre, can.nombre as cancha_nombre,
           r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
           r.email_cliente as cliente_email
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
    query += ' AND r.fecha::date = ?';
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
}

/**
 * Obtener todos los complejos
 */
function getComplejos(req, res) {
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
}

/**
 * Crear nuevo complejo
 */
function createComplejo(req, res) {
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
}

/**
 * Actualizar complejo
 */
function updateComplejo(req, res) {
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
}

/**
 * Eliminar complejo
 */
function deleteComplejo(req, res) {
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
}

module.exports = {
  getEstadisticas,
  getReservasRecientes,
  getReservasHoy,
  getAllReservasAdmin,
  getComplejos,
  createComplejo,
  updateComplejo,
  deleteComplejo
};

// Importar la instancia de base de datos
let db;

function setDatabase(databaseInstance) {
  db = databaseInstance;
}

/**
 * Estadísticas del dashboard
 */
async function getEstadisticas(req, res) {
  try {
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    
    console.log('📊 Cargando estadísticas - Rol:', userRole, 'Complejo:', complexFilter);
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    // Obtener estadísticas
    const totalReservas = await db.get(`
      SELECT COUNT(*) as total 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      ${whereClause}
      AND r.estado != 'cancelada'
    `, params);
    
    const ingresosTotales = await db.get(`
      SELECT COALESCE(SUM(r.precio_total), 0) as ingresos 
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      ${whereClause}
      AND r.estado = 'confirmada'
    `, params);
    
    const totalCanchas = await db.get(`
      SELECT COUNT(*) as canchas 
      FROM canchas ${userRole === 'super_admin' ? '' : 'WHERE complejo_id = $1'}
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    const totalComplejos = await db.get(`
      SELECT COUNT(*) as complejos 
      FROM complejos ${userRole === 'super_admin' ? '' : 'WHERE id = $1'}
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    // Obtener reservas por día (últimos 7 días) - IMPORTANTE: Devolver fecha como string
    const reservasPorDiaQuery = userRole === 'super_admin' ?
      `SELECT TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha, COUNT(*) as cantidad 
       FROM reservas r
       WHERE r.fecha >= CURRENT_DATE - INTERVAL '7 days'
       AND r.estado != 'cancelada'
       GROUP BY r.fecha::date
       ORDER BY r.fecha::date` :
      `SELECT TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha, COUNT(*) as cantidad 
       FROM reservas r
       JOIN canchas c ON r.cancha_id = c.id
       WHERE r.fecha >= CURRENT_DATE - INTERVAL '7 days'
       AND r.estado != 'cancelada'
       AND c.complejo_id = $1
       GROUP BY r.fecha::date
       ORDER BY r.fecha::date`;
    
    const reservasPorDia = await db.query(
      reservasPorDiaQuery,
      userRole === 'super_admin' ? [] : [complexFilter]
    );
    
    res.json({
      totalReservas: totalReservas.total || 0,
      ingresosTotales: parseInt(ingresosTotales.ingresos) || 0,
      totalCanchas: totalCanchas.canchas || 0,
      totalComplejos: totalComplejos.complejos || 0,
      reservasPorDia: reservasPorDia.map(r => ({
        dia: r.fecha,  // Ya viene como string YYYY-MM-DD
        cantidad: parseInt(r.cantidad)
      })),
      rol: userRole
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Reservas recientes
 */
async function getReservasRecientes(req, res) {
  try {
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    
    let query = `
      SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
             r.telefono_cliente, r.rut_cliente,
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
             r.estado, r.estado_pago, r.created_at,
             co.nombre as complejo_nombre, can.nombre as cancha_nombre,
             r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
             r.email_cliente as cliente_email
      FROM reservas r
      JOIN canchas can ON r.cancha_id = can.id
      JOIN complejos co ON can.complejo_id = co.id
    `;
    
    const params = [];
    
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      query += ' WHERE co.id = $1';
      params.push(complexFilter);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT 5';
    
    const rows = await db.query(query, params);
    res.json(rows);
    
  } catch (error) {
    console.error('Error al obtener reservas recientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Reservas de hoy
 */
async function getReservasHoy(req, res) {
  try {
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    
    console.log('📅 Obteniendo reservas de hoy - Rol:', userRole, 'Complejo:', complexFilter);
    
    let query = `
      SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente, 
             r.telefono_cliente, r.rut_cliente,
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
             r.estado, r.estado_pago,
             co.nombre as complejo_nombre, can.nombre as cancha_nombre,
             r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
             r.email_cliente as cliente_email
      FROM reservas r
      JOIN canchas can ON r.cancha_id = can.id
      JOIN complejos co ON can.complejo_id = co.id
      WHERE r.fecha::date = CURRENT_DATE
    `;
    
    const params = [];
    
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      query += ' AND co.id = $1';
      params.push(complexFilter);
    }
    
    query += ' ORDER BY r.hora_inicio';
    
    const rows = await db.query(query, params);
    
    console.log('✅ Reservas de hoy encontradas:', rows.length);
    if (rows.length > 0) {
      console.log('🔍 Primera reserva:', {
        codigo: rows[0].codigo_reserva,
        cancha: rows[0].cancha_nombre,
        complejo: rows[0].complejo_nombre
      });
    }
    
    res.json(rows);
    
  } catch (error) {
    console.error('Error al obtener reservas de hoy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Todas las reservas (para página de reservas)
 */
async function getAllReservasAdmin(req, res) {
  try {
    const { fecha, complejo_id, estado } = req.query;
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    
    let query = `
      SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
             r.telefono_cliente, r.rut_cliente,
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
             r.estado, r.estado_pago, r.created_at,
             co.nombre as complejo_nombre, can.nombre as cancha_nombre,
             r.nombre_cliente as cliente_nombre, r.rut_cliente as cliente_rut, 
             r.email_cliente as cliente_email
      FROM reservas r
      JOIN canchas can ON r.cancha_id = can.id
      JOIN complejos co ON can.complejo_id = co.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Si es dueño de complejo, solo mostrar sus reservas
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      query += ` AND co.id = $${paramIndex}`;
      params.push(complexFilter);
      paramIndex++;
    }
    
    if (fecha) {
      query += ` AND r.fecha::date = $${paramIndex}`;
      params.push(fecha);
      paramIndex++;
    }
    
    if (complejo_id && userRole === 'super_admin') {
      query += ` AND co.id = $${paramIndex}`;
      params.push(complejo_id);
      paramIndex++;
    }
    
    if (estado) {
      query += ` AND r.estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }
    
    query += ' ORDER BY r.fecha DESC, r.hora_inicio DESC';
    
    const rows = await db.query(query, params);
    res.json(rows);
    
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Obtener todos los complejos
 */
async function getComplejos(req, res) {
  try {
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    
    let query = `
      SELECT c.*, ci.nombre as ciudad_nombre
      FROM complejos c
      JOIN ciudades ci ON c.ciudad_id = ci.id
    `;
    let params = [];
    
    // Si es dueño de complejo, solo mostrar su complejo
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      query += ' WHERE c.id = $1';
      params.push(complexFilter);
    }
    
    query += ' ORDER BY c.nombre';
    
    const rows = await db.query(query, params);
    res.json(rows);
    
  } catch (error) {
    console.error('Error obteniendo complejos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Crear nuevo complejo
 */
async function createComplejo(req, res) {
  try {
    const { nombre, ciudad_id, email, telefono, direccion, descripcion } = req.body;
    
    if (!nombre || !ciudad_id) {
      return res.status(400).json({ error: 'Nombre y ciudad son requeridos' });
    }
    
    const result = await db.run(
      `INSERT INTO complejos (nombre, ciudad_id, email, telefono, direccion, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [nombre, ciudad_id, email, telefono, direccion, descripcion]
    );
    
    res.json({ id: result.lastID, message: 'Complejo creado exitosamente' });
    
  } catch (error) {
    console.error('Error creando complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Actualizar complejo
 */
async function updateComplejo(req, res) {
  try {
    const { id } = req.params;
    const { nombre, ciudad_id, email, telefono, direccion, descripcion } = req.body;
    
    const result = await db.run(
      `UPDATE complejos 
       SET nombre = $1, ciudad_id = $2, email = $3, telefono = $4, direccion = $5, descripcion = $6
       WHERE id = $7`,
      [nombre, ciudad_id, email, telefono, direccion, descripcion, id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }
    
    res.json({ message: 'Complejo actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error actualizando complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Eliminar complejo
 */
async function deleteComplejo(req, res) {
  try {
    const { id } = req.params;
    
    // Verificar si el complejo tiene canchas
    const check = await db.get(
      'SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1',
      [id]
    );
    
    if (check.count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un complejo que tiene canchas asociadas' 
      });
    }
    
    const result = await db.run('DELETE FROM complejos WHERE id = $1', [id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Complejo no encontrado' });
    }
    
    res.json({ message: 'Complejo eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error eliminando complejo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Obtener canchas (con filtro opcional por complejo)
 */
async function getCanchas(req, res) {
  try {
    const userRole = req.admin?.rol || req.user?.rol;
    const complexFilter = req.admin?.complejo_id || req.user?.complejo_id;
    const { complejo_id } = req.query;
    
    let query = `
      SELECT ca.*, co.nombre as complejo_nombre
      FROM canchas ca
      JOIN complejos co ON ca.complejo_id = co.id
    `;
    let params = [];
    
    // Si es dueño de complejo, solo mostrar sus canchas
    if (userRole === 'complex_owner' || userRole === 'owner' || userRole === 'manager') {
      query += ' WHERE ca.complejo_id = $1';
      params.push(complexFilter);
    } else if (complejo_id) {
      // Si se especifica complejo_id en query params
      query += ' WHERE ca.complejo_id = $1';
      params.push(complejo_id);
    }
    
    query += ' ORDER BY co.nombre, ca.nombre';
    
    const rows = await db.query(query, params);
    res.json(rows);
    
  } catch (error) {
    console.error('Error obteniendo canchas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  setDatabase,
  getEstadisticas,
  getReservasRecientes,
  getReservasHoy,
  getAllReservasAdmin,
  getComplejos,
  createComplejo,
  updateComplejo,
  deleteComplejo,
  getCanchas
};

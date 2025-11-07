const db = require('../config/database');
const { invalidateCacheOnReservation } = require('./availabilityController');

/**
 * Obtener todas las ciudades
 */
async function getCiudades(req, res) {
  try {
    const rows = await db.query("SELECT * FROM ciudades ORDER BY nombre");
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo ciudades:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener complejos por ciudad
 */
async function getComplejosByCiudad(req, res) {
  try {
    const { ciudadId } = req.params;
    const rows = await db.query(
      "SELECT * FROM complejos WHERE ciudad_id = $1",
      [ciudadId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo complejos:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener canchas por complejo y tipo
 * Soporta búsqueda flexible: "futbol" encontrará "futbol", "baby futbol", etc.
 * Incluye información de promociones activas
 */
async function getCanchasByComplejoAndTipo(req, res) {
  console.log('🚨 FUNCIÓN getCanchasByComplejoAndTipo LLAMADA');
  console.log('🚨 req.params:', req.params);
  try {
    const { complejoId, tipo } = req.params;
    const { fecha, hora } = req.query; // Parámetros opcionales para calcular precio promocional
    
    console.log('🏟️ Buscando canchas para complejo:', complejoId, 'tipo:', tipo);
    if (fecha) console.log('📅 Fecha para verificar promociones:', fecha);
    if (hora) console.log('🕐 Hora para verificar promociones:', hora);
    
    // Si el tipo es "futbol", buscar cualquier tipo que contenga "futbol"
    // Esto incluye "futbol", "baby futbol", "futbol 7", etc.
    let query, params;
    console.log('🔍 Tipo recibido:', tipo, '| toLowerCase:', tipo.toLowerCase());
    console.log('🔍 Comparación:', tipo.toLowerCase() === 'futbol');
    
    if (tipo.toLowerCase() === 'futbol') {
      query = "SELECT * FROM canchas WHERE complejo_id = $1 AND LOWER(tipo) LIKE $2";
      params = [complejoId, '%futbol%'];
      console.log('✅ Búsqueda flexible de fútbol:', params);
    } else {
      query = "SELECT * FROM canchas WHERE complejo_id = $1 AND tipo = $2";
      params = [complejoId, tipo];
      console.log('⚠️ Búsqueda exacta de tipo:', params);
    }
    console.log('📝 Query final:', query);
    
    const rows = await db.query(query, params);
    console.log('✅ Canchas encontradas:', rows.length);
    
    // Si se proporciona fecha, agregar información de promociones
    if (fecha) {
      console.log(`🔍 Calculando precios promocionales para ${rows.length} canchas, fecha: ${fecha}, hora: ${hora || 'no proporcionada'}`);
      const promocionesHelper = require('../utils/promociones-helper');
      
      const canchasConPromociones = await Promise.all(
        rows.map(async (cancha) => {
          console.log(`  🔍 Verificando promociones para cancha ${cancha.id} (${cancha.nombre})`);
          const precioInfo = await promocionesHelper.obtenerPrecioConPromocion(
            cancha.id,
            fecha,
            hora
          );
          
          console.log(`  💰 Cancha ${cancha.id}: Precio normal: ${cancha.precio_hora}, Precio actual: ${precioInfo.precio}, Tiene promoción: ${precioInfo.tienePromocion}`);
          
          // Asegurar que precio_original siempre sea el precio normal de la cancha
          const precioOriginal = parseFloat(cancha.precio_hora) || 0;
          const precioActual = parseFloat(precioInfo.precio) || precioOriginal;
          
          return {
            ...cancha,
            precio_actual: precioActual,
            precio_original: precioOriginal, // Siempre usar precio_hora como precio original
            tiene_promocion: precioInfo.tienePromocion === true,
            promocion_info: precioInfo.tienePromocion ? {
              nombre: precioInfo.promocionNombre,
              descuento: precioInfo.descuento,
              porcentaje_descuento: precioInfo.porcentajeDescuento
            } : null
          };
        })
      );
      
      const canchasConPromocion = canchasConPromociones.filter(c => c.tiene_promocion);
      console.log(`✅ Precios promocionales calculados: ${canchasConPromocion.length} de ${canchasConPromociones.length} canchas tienen promoción`);
      res.json(canchasConPromociones);
    } else {
      // Sin fecha, retornar canchas normales
      res.json(rows);
    }
  } catch (err) {
    console.error('Error obteniendo canchas:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener disponibilidad de canchas
 */
async function getDisponibilidad(req, res) {
  try {
    const { canchaId, fecha } = req.params;
    const rows = await db.query(`
      SELECT hora_inicio, hora_fin 
      FROM reservas 
      WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
    `, [canchaId, fecha]);
    
    res.json({ reservas: rows });
  } catch (err) {
    console.error('Error obteniendo disponibilidad:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Crear nueva reserva
 */
async function createReserva(req, res) {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, precio_total } = req.body;
    
    // Verificar si ya existe una reserva para la misma cancha, fecha y hora
    const existingReservation = await db.query(`
      SELECT id FROM reservas 
      WHERE cancha_id = $1 AND fecha = $2 AND hora_inicio = $3 AND estado != 'cancelada'
    `, [cancha_id, fecha, hora_inicio]);
    
    if (existingReservation.length > 0) {
      return res.status(400).json({ 
        error: 'Ya existe una reserva para esta cancha en la fecha y hora seleccionada',
        code: 'RESERVATION_CONFLICT'
      });
    }

    // Generar código de reserva único (5 caracteres)
    const codigo_reserva = Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const result = await db.query(`
      INSERT INTO reservas (cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, codigo_reserva, precio_total)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, email_cliente, codigo_reserva, precio_total]);
    
    // Invalidar caché de disponibilidad
    invalidateCacheOnReservation(cancha_id, fecha);
    
    res.json({
      id: result[0].id,
      codigo_reserva,
      message: 'Reserva creada exitosamente'
    });
  } catch (err) {
    console.error('Error creando reserva:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener todas las reservas (para el dashboard)
 */
async function getAllReservas(req, res) {
  try {
    const rows = await db.query(`
      SELECT r.*, c.nombre as nombre_cancha, c.tipo, comp.nombre as nombre_complejo
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos comp ON c.complejo_id = comp.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows || []);
  } catch (err) {
    console.error('Error obteniendo reservas:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Obtener reserva por código o nombre
 */
async function getReservaByCodigo(req, res) {
  try {
    const { busqueda } = req.params;
    
    // Buscar por código de reserva o nombre del cliente
    const rows = await db.query(`
      SELECT r.*, c.nombre as nombre_cancha, c.tipo, comp.nombre as nombre_complejo
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos comp ON c.complejo_id = comp.id
      WHERE r.codigo_reserva = $1 OR LOWER(r.nombre_cliente) = LOWER($2)
    `, [busqueda, busqueda]);
    
    if (rows.length > 0) {
      return res.json(rows[0]);
    }
    
    // Si no se encuentra la reserva, buscar si hay un pago asociado
    const pago = await db.get(`
      SELECT 
        p.*,
        p.created_at::text as fecha_pago,
        p.status as estado_pago
      FROM pagos p
      WHERE p.reservation_code = $1
      ORDER BY p.created_at DESC
      LIMIT 1
    `, [busqueda]);
    
    if (pago) {
      // Si hay un pago pero no hay reserva, informar al usuario
      if (pago.status === 'approved') {
        return res.status(404).json({ 
          error: 'Reserva no encontrada',
          pago_encontrado: true,
          mensaje: 'Se encontró un pago aprobado para este código, pero la reserva no se creó correctamente. Por favor, contacta a soporte@reservatuscanchas.cl con tu código de reserva.',
          codigo_reserva: pago.reservation_code,
          codigo_autorizacion: pago.authorization_code,
          monto: pago.amount,
          fecha_pago: pago.fecha_pago
        });
      } else if (pago.status === 'pending') {
        return res.status(404).json({ 
          error: 'Reserva no encontrada',
          pago_encontrado: true,
          mensaje: 'Se encontró un pago pendiente para este código. Por favor, espera a que se procese o contacta a soporte.',
          codigo_reserva: pago.reservation_code,
          estado: pago.status
        });
      } else {
        return res.status(404).json({ 
          error: 'Reserva no encontrada',
          pago_encontrado: true,
          mensaje: 'Se encontró un pago para este código, pero el estado es: ' + pago.status + '. Por favor, contacta a soporte.',
          codigo_reserva: pago.reservation_code,
          estado: pago.status
        });
      }
    }
    
    // Si no se encuentra ni reserva ni pago
    return res.status(404).json({ error: 'Reserva no encontrada. Verifica el código o nombre ingresado.' });
  } catch (err) {
    console.error('Error buscando reserva:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Endpoint de prueba para verificar la base de datos
 */
async function testDatabase(req, res) {
  console.log('🧪 PRUEBA DE BASE DE DATOS');
  
  try {
    // Verificar si la tabla usuarios existe (PostgreSQL)
    const result = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usuarios'");
    
    if (result.rows.length === 0) {
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
    const countResult = await db.query("SELECT COUNT(*) as count FROM usuarios");
    const usersCount = countResult.rows[0].count;
    
    res.json({ 
      success: true, 
      message: 'Base de datos PostgreSQL funcionando correctamente',
      usersCount: usersCount
    });
    
  } catch (err) {
    console.error('❌ Error verificando base de datos:', err);
    res.json({ 
      success: false, 
      error: err.message,
      message: 'Error verificando base de datos'
    });
  }
}

/**
 * Bloquear cancha temporalmente y proceder al pago
 * POST /api/reservas/bloquear-y-pagar
 */
async function bloquearYPagar(req, res) {
  try {
    console.log('🔒 Iniciando proceso de bloqueo y pago...');
    console.log('📋 Datos recibidos:', req.body);
    
    const {
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      nombre_cliente,
      rut_cliente,
      email_cliente,
      telefono_cliente,
      precio_total,
      codigo_descuento,
      porcentaje_pagado,
      monto_pagado,
      session_id
    } = req.body;
    
    // Validar datos requeridos
    if (!cancha_id || !fecha || !hora_inicio || !hora_fin || !nombre_cliente || !email_cliente || !session_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos'
      });
    }
    
    // Verificar que la cancha existe
    const cancha = await db.query(
      'SELECT c.*, co.nombre as complejo_nombre FROM canchas c JOIN complejos co ON c.complejo_id = co.id WHERE c.id = $1',
      [cancha_id]
    );
    
    if (!cancha || cancha.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cancha no encontrada'
      });
    }
    
    // Verificar disponibilidad
    const disponibilidad = await db.query(
      `SELECT * FROM reservas 
       WHERE cancha_id = $1 
       AND fecha = $2 
       AND (
         (hora_inicio <= $3 AND hora_fin > $3) OR
         (hora_inicio < $4 AND hora_fin >= $4) OR
         (hora_inicio >= $3 AND hora_fin <= $4)
       )
       AND estado != 'cancelada'`,
      [cancha_id, fecha, hora_inicio, hora_fin]
    );
    
    if (disponibilidad && disponibilidad.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'La cancha ya está reservada en ese horario'
      });
    }
    
    // Generar código de reserva único
    const codigoReserva = generarCodigoReserva();
    
    // Crear bloqueo temporal (15 minutos)
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    
    const datosCliente = {
      nombre_cliente,
      rut_cliente,
      email_cliente,
      telefono_cliente,
      precio_total,
      codigo_descuento,
      porcentaje_pagado,
      monto_pagado
    };
    
    const bloqueoResult = await db.query(
      `INSERT INTO bloqueos_temporales 
       (cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, codigo_reserva)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        cancha_id,
        fecha,
        hora_inicio,
        hora_fin,
        session_id,
        expiraEn,
        JSON.stringify(datosCliente),
        codigoReserva
      ]
    );
    
    console.log('✅ Bloqueo temporal creado:', bloqueoResult[0].id);
    
    // Invalidar caché de disponibilidad
    await invalidateCacheOnReservation(cancha_id, fecha);
    
    res.json({
      success: true,
      bloqueo_id: bloqueoResult[0].id,
      codigo_reserva: codigoReserva,
      expira_en: expiraEn,
      cancha: cancha[0],
      datos_cliente: datosCliente,
      message: 'Bloqueo temporal creado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error en bloquearYPagar:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
}

/**
 * Generar código de reserva único
 */
function generarCodigoReserva() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

module.exports = {
  getCiudades,
  getComplejosByCiudad,
  getCanchasByComplejoAndTipo,
  getDisponibilidad,
  createReserva,
  bloquearYPagar,
  getAllReservas,
  getReservaByCodigo,
  testDatabase
};

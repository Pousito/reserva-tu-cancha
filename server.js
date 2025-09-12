const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
  requireRolePermission, 
  requireFinancialAccess, 
  requireComplexManagement, 
  requireCourtManagement, 
  requireReportsAccess 
} = require('./middleware/role-permissions');
// PostgreSQL + SQLite Hybrid Database System - Persistence Test
const DatabaseManager = require('./src/config/database');
const { insertEmergencyReservations } = require('./scripts/emergency/insert-reservations');
const EmailService = require('./src/services/emailService');
// Configuración de entorno - desarrollo vs producción
if (process.env.NODE_ENV === 'production') {
  // En producción, usar variables de entorno de Render
  require('dotenv').config();
} else {
  // En desarrollo, usar archivo específico
  require('dotenv').config({ path: './env.postgresql' });
}

// Función para generar código de reserva único y corto
function generarCodigoReserva() {
  // Generar código de 6 caracteres alfanuméricos
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ===== MIDDLEWARE DE AUTENTICACIÓN =====
// Fix: Asegurar que las consultas usen created_at en lugar de fecha_creacion - VERSIÓN 3
// IMPORTANTE: Este fix resuelve el error 500 en producción para la sección de reservas
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
    req.complexFilter = null; // Sin filtro, ve todo
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

// Sistema de emails
const emailService = new EmailService();

// Función helper para obtener la función de fecha actual según el tipo de BD
const getCurrentTimestampFunction = () => {
  const dbInfo = db.getDatabaseInfo();
  return dbInfo.type === 'PostgreSQL' ? 'NOW()' : "datetime('now')";
};

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
            const result = await db.run('INSERT INTO ciudades (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING', [ciudad]);
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
              'INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nombre) DO NOTHING',
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
              'INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) VALUES ($1, $2, $3, $4) ON CONFLICT (complejo_id, nombre) DO NOTHING',
              [complejoId.id, cancha.nombre, cancha.tipo, cancha.precio]
            );
          }
        }
      }
      
      // Insertar usuarios administradores
      const usuariosData = [
        { email: 'admin@reservatuscanchas.cl', password: 'admin123', nombre: 'Super Administrador', rol: 'super_admin' },
        { email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Administrador MagnaSports', rol: 'admin' },
        { email: 'naxiin_320@hotmail.com', password: 'complejo2024', nombre: 'Dueño MagnaSports', rol: 'admin' }
      ];
      
      for (const usuario of usuariosData) {
        if (db.getDatabaseInfo().type === 'PostgreSQL') {
          await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
            [usuario.email, usuario.password, usuario.nombre, usuario.rol]
          );
        } else {
          await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, 1) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
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

// ===== RUTAS DE PAGOS =====
const { router: paymentRoutes, setDatabase: setPaymentDatabase } = require('./src/routes/payments');
setPaymentDatabase(db); // Pasar la instancia de la base de datos
app.use('/api/payments', paymentRoutes);

// Ruta de prueba para simular retorno de Transbank en desarrollo
app.get('/test-payment-return', (req, res) => {
    const { token_ws, TBK_TOKEN } = req.query;
    
    if (token_ws) {
        // Simular pago exitoso
        res.redirect(`/payment.html?code=${req.query.reservationCode}&status=success&token=${token_ws}`);
    } else if (TBK_TOKEN) {
        // Simular pago cancelado
        res.redirect(`/payment.html?code=${req.query.reservationCode}&status=cancelled&token=${TBK_TOKEN}`);
    } else {
        res.redirect(`/payment.html?code=${req.query.reservationCode}&status=error`);
    }
});

// Endpoint para simular pago exitoso completo (bypasea Transbank)
app.post('/api/simulate-payment-success', async (req, res) => {
    try {
        const { reservationCode } = req.body;
        
        if (!reservationCode) {
            return res.status(400).json({
                success: false,
                error: 'Código de reserva requerido'
            });
        }

        console.log('🧪 Simulando pago exitoso para:', reservationCode);

        // Buscar el bloqueo temporal
        const bloqueoData = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE session_id = $1',
            [reservationCode]
        );

        if (!bloqueoData) {
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado'
            });
        }

        console.log('📊 Bloqueo temporal encontrado:', bloqueoData.id);

        const datosCliente = JSON.parse(bloqueoData.datos_cliente);

        // Crear la reserva real
        // Generar código de reserva único solo cuando se confirma el pago
        const codigoReserva = await generarCodigoReservaUnico();
        
        // Calcular comisión para reserva web (3.5%)
        const comisionWeb = Math.round(datosCliente.precio_total * 0.035);
        
        console.log('💾 Insertando reserva en BD (bloqueo temporal):', {
            codigo: codigoReserva,
            nombre: datosCliente.nombre_cliente,
            email: datosCliente.email_cliente,
            telefono: datosCliente.telefono_cliente,
            rut: datosCliente.rut_cliente,
            precio: datosCliente.precio_total
        });
        
        const reservaId = await db.run(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente,
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                codigo_reserva, estado, estado_pago, fecha_creacion,
                tipo_reserva, comision_aplicada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
            bloqueoData.cancha_id,
            datosCliente.nombre_cliente,
            datosCliente.email_cliente,
            datosCliente.telefono_cliente || null,
            datosCliente.rut_cliente || 'No proporcionado',
            bloqueoData.fecha,
            bloqueoData.hora_inicio,
            bloqueoData.hora_fin,
            datosCliente.precio_total,
            codigoReserva,
            'confirmada',
            'pagado',
            new Date().toISOString(),
            'directa',
            comisionWeb
        ]);

        console.log('✅ Reserva creada con ID:', reservaId);

        // Eliminar el bloqueo temporal
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueoData.id]);
        console.log('🗑️ Bloqueo temporal eliminado');

        // Obtener información del complejo y cancha
        const canchaInfo = await db.get(`
            SELECT c.nombre as cancha_nombre, co.nombre as complejo_nombre 
            FROM canchas c 
            JOIN complejos co ON c.complejo_id = co.id 
            WHERE c.id = $1
        `, [bloqueoData.cancha_id]);

        // Enviar emails de confirmación (cliente + administradores)
        try {
            const EmailService = require('./src/services/emailService');
            const emailService = new EmailService();
            const emailData = {
                codigo_reserva: codigoReserva,
                nombre_cliente: datosCliente.nombre_cliente,
                email_cliente: datosCliente.email_cliente,
                fecha: bloqueoData.fecha,
                hora_inicio: bloqueoData.hora_inicio,
                hora_fin: bloqueoData.hora_fin,
                precio_total: datosCliente.precio_total,
                complejo: canchaInfo?.complejo_nombre || 'Complejo Deportivo',
                cancha: canchaInfo?.cancha_nombre || 'Cancha'
            };
            
            const emailResults = await emailService.sendConfirmationEmails(emailData);
            console.log('📧 Emails de confirmación enviados:', emailResults);
        } catch (emailError) {
            console.error('❌ Error enviando emails:', emailError);
        }

        res.json({
            success: true,
            message: 'Pago simulado exitosamente',
            reserva_id: reservaId,
            codigo_reserva: codigoReserva
        });

    } catch (error) {
        console.error('❌ Error simulando pago:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para simular pago cancelado
app.post('/api/simulate-payment-cancelled', async (req, res) => {
    try {
        const { reservationCode } = req.body;
        
        if (!reservationCode) {
            return res.status(400).json({
                success: false,
                error: 'Código de reserva requerido'
            });
        }

        console.log('🧪 Simulando pago cancelado para:', reservationCode);

        // Eliminar el bloqueo temporal
        const result = await db.run(
            'DELETE FROM bloqueos_temporales WHERE session_id = $1',
            [reservationCode]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado'
            });
        }

        console.log('🗑️ Bloqueo temporal eliminado por cancelación');

        res.json({
            success: true,
            message: 'Pago cancelado exitosamente',
            codigo_reserva: codigoReserva
        });

    } catch (error) {
        console.error('❌ Error simulando cancelación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para obtener datos de un bloqueo temporal
app.get('/api/bloqueos-temporales/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Buscar bloqueo temporal por session_id o por ID del bloqueo
    const bloqueo = await db.get(`
      SELECT bt.*, c.nombre as cancha_nombre, 
             CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
             co.nombre as complejo_nombre
      FROM bloqueos_temporales bt
      JOIN canchas c ON bt.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE bt.session_id = $1 OR bt.id = $2
      ORDER BY bt.created_at DESC
      LIMIT 1
    `, [codigo, codigo]);
    
    if (!bloqueo) {
      return res.status(404).json({ error: 'Bloqueo temporal no encontrado' });
    }
    
    // Verificar que no haya expirado
    const ahora = new Date();
    const expiraEn = new Date(bloqueo.expira_en);
    
    if (ahora > expiraEn) {
      return res.status(410).json({ error: 'Bloqueo temporal expirado' });
    }
    
    res.json(bloqueo);
    
  } catch (error) {
    console.error('❌ Error obteniendo bloqueo temporal:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Nuevo endpoint para crear bloqueo temporal y proceder al pago
app.post('/api/reservas/bloquear-y-pagar', async (req, res) => {
  try {
    console.log('🔒 Iniciando creación de bloqueo temporal...');
    const { cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, session_id } = req.body;
    
    console.log('📋 Datos recibidos:', { cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, session_id });
    
    // Verificar que todos los campos requeridos estén presentes
    if (!cancha_id || !nombre_cliente || !email_cliente || !fecha || !hora_inicio || !hora_fin || !precio_total || !session_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos para crear el bloqueo temporal' 
      });
    }
    
    // Limpiar bloqueos temporales expirados antes de verificar disponibilidad
    await limpiarBloqueosExpirados();
    
    // Verificar disponibilidad antes de bloquear
    console.log('🔍 Verificando disponibilidad...');
    const disponibilidad = await verificarDisponibilidadCancha(cancha_id, fecha, hora_inicio, hora_fin);
    console.log('📊 Resultado disponibilidad:', disponibilidad);
    
    if (!disponibilidad.disponible) {
      console.log('❌ No disponible:', disponibilidad.mensaje);
      return res.status(409).json({ 
        success: false, 
        error: 'La cancha ya no está disponible en ese horario',
        conflicto: disponibilidad.conflicto
      });
    }
    
    // Crear bloqueo temporal
    console.log('💾 Creando registro en base de datos...');
    const bloqueoId = 'BLOCK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const expiraEn = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    // NO generar código de reserva aquí - se generará solo cuando se confirme el pago
    // Esto evita que los códigos se "pierdan" si no se completa el pago
    
    console.log('📝 Datos a insertar:', {
      bloqueoId,
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      session_id,
      expiraEn: expiraEn.toISOString(),
      datos_cliente: JSON.stringify({
        nombre_cliente,
        email_cliente,
        telefono_cliente: telefono_cliente || 'No proporcionado',
        rut_cliente,
        precio_total
      })
    });
    
    await db.run(`
      INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [bloqueoId, cancha_id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), JSON.stringify({
      nombre_cliente,
      email_cliente,
      telefono_cliente: telefono_cliente || 'No proporcionado',
      rut_cliente,
      precio_total
    })]);
    
    console.log(`🔒 Bloqueo temporal creado: ${bloqueoId}`);
    
    // Invalidar cache de disponibilidad (opcional)
    console.log('⚠️ Cache de disponibilidad no invalidado (funcionalidad opcional)');
    
    res.json({
      success: true,
      bloqueo_id: bloqueoId,
      expira_en: expiraEn.toISOString(),
      message: 'Bloqueo temporal creado exitosamente. Procede al pago.'
    });
    
  } catch (error) {
    console.error('❌ Error creando bloqueo temporal:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al crear bloqueo temporal: ' + error.message
    });
  }
});

// Endpoint legacy eliminado - usar /api/disponibilidad/:cancha_id/:fecha en su lugar

// Función auxiliar para convertir tiempo a minutos
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  return parseInt(hours) * 60 + parseInt(minutes);
}

// Función para generar código de reserva único y reutilizable
async function generarCodigoReservaUnico() {
  let intentos = 0;
  const maxIntentos = 10;
  
  while (intentos < maxIntentos) {
    // Generar código de 6 caracteres alfanuméricos
    const codigo = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Verificar si el código ya existe en reservas activas
    const reservaExistente = await db.get(
      'SELECT id FROM reservas WHERE codigo_reserva = $1 AND estado != "cancelada"',
      [codigo]
    );
    
    if (!reservaExistente) {
      console.log(`✅ Código de reserva generado: ${codigo} (intento ${intentos + 1})`);
      return codigo;
    }
    
    intentos++;
    console.log(`⚠️ Código ${codigo} ya existe, generando nuevo... (intento ${intentos})`);
  }
  
  // Si llegamos aquí, algo está muy mal con la generación de códigos
  throw new Error('No se pudo generar un código de reserva único después de múltiples intentos');
}

// Función para limpiar bloqueos temporales expirados
async function limpiarBloqueosExpirados() {
  try {
    const ahora = new Date().toISOString();
    const resultado = await db.run(
      'DELETE FROM bloqueos_temporales WHERE expira_en < $1',
      [ahora]
    );
    
    if (resultado.changes > 0) {
      console.log(`🧹 Limpieza automática: ${resultado.changes} bloqueos temporales expirados eliminados`);
    }
    
    return resultado.changes;
  } catch (error) {
    console.error('❌ Error limpiando bloqueos expirados:', error);
    return 0;
  }
}

// Endpoint de debug para verificar lógica de superposición
app.get('/api/debug/verificar-superposicion/:canchaId/:fecha/:hora', async (req, res) => {
  try {
    const { canchaId, fecha, hora } = req.params;
    console.log(`🔍 DEBUG - Verificando superposición - Cancha: ${canchaId}, Fecha: ${fecha}, Hora: ${hora}`);
    
    // Obtener reservas existentes
    const reservas = await db.query(`
      SELECT hora_inicio, hora_fin, estado
      FROM reservas 
      WHERE cancha_id = $1 AND fecha::date = $2 AND estado IN ('confirmada', 'pendiente')
      ORDER BY hora_inicio
    `, [canchaId, fecha]);
    
    // Calcular hora fin (hora + 1 hora)
    const [horaNum, minutos] = hora.split(':');
    const horaFinNum = parseInt(horaNum) + 1;
    const horaFin = `${horaFinNum.toString().padStart(2, '0')}:${minutos}`;
    
    // Verificar superposición para cada reserva
    const resultados = reservas.map(reserva => {
      // Convertir a minutos para comparación precisa
      const reservaInicioMin = timeToMinutes(reserva.hora_inicio);
      const reservaFinMin = timeToMinutes(reserva.hora_fin);
      const horaInicioMin = timeToMinutes(hora);
      const horaFinMin = timeToMinutes(horaFin);
      
      const haySuperposicion = reservaInicioMin < horaFinMin && reservaFinMin > horaInicioMin;
      return {
        reserva: `${reserva.hora_inicio}-${reserva.hora_fin}`,
        solicitada: `${hora}-${horaFin}`,
        haySuperposicion,
        logica: `${reservaInicioMin} < ${horaFinMin} && ${reservaFinMin} > ${horaInicioMin}`,
        disponible: !haySuperposicion,
        minutos: {
          reservaInicio: reservaInicioMin,
          reservaFin: reservaFinMin,
          horaInicio: horaInicioMin,
          horaFin: horaFinMin
        }
      };
    });
    
    const estaDisponible = resultados.every(r => r.disponible);
    
    res.json({
      canchaId,
      fecha,
      hora,
      horaFin,
      reservas: resultados,
      estaDisponible,
      totalReservas: reservas.length
    });
  } catch (error) {
    console.error('❌ Error en debug de superposición:', error);
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
      fechaCondition = 'r.fecha::date = $2';
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
          AND r.fecha::date = $2
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
        WHERE c.complejo_id = $1
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
          reservas: [],
          bloqueos: []
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
    
    // Obtener bloqueos temporales para todas las canchas del complejo
    const canchaIds = Object.keys(resultado).map(id => parseInt(id));
    if (canchaIds.length > 0) {
      const bloqueos = await db.query(`
        SELECT cancha_id, hora_inicio, hora_fin, session_id, expira_en
        FROM bloqueos_temporales 
        WHERE cancha_id IN (${canchaIds.map((_, i) => `$${i + 1}`).join(',')}) 
        AND fecha = $${canchaIds.length + 1} 
        AND expira_en > $${canchaIds.length + 2}
      `, [...canchaIds, fecha, new Date().toISOString()]);
      
      // Agregar bloqueos a cada cancha
      bloqueos.forEach(bloqueo => {
        if (resultado[bloqueo.cancha_id]) {
          resultado[bloqueo.cancha_id].bloqueos.push({
            hora_inicio: bloqueo.hora_inicio,
            hora_fin: bloqueo.hora_fin,
            session_id: bloqueo.session_id,
            expira_en: bloqueo.expira_en
          });
        }
      });
      
      // Limpiar bloqueos expirados
      await db.run(
        'DELETE FROM bloqueos_temporales WHERE expira_en <= $1',
        [new Date().toISOString()]
      );
    }
    
    console.log(`✅ Disponibilidad completa obtenida para ${Object.keys(resultado).length} canchas en ${fecha}`);
    
    // Agregar headers para evitar cache del navegador
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(resultado);
  } catch (error) {
    console.error('❌ Error verificando disponibilidad completa:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoints del panel de administrador
app.get('/api/admin/estadisticas', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
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
      AND r.estado != 'cancelada'
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
    if (req.userPermissions && req.userPermissions.canViewFinancials) {
      ingresosTotales = await db.get(`
        SELECT COALESCE(SUM(r.precio_total), 0) as total 
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        WHERE r.estado = 'confirmada'
        ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = $1'}
      `, userRole === 'super_admin' ? [] : [complexFilter]);
    }
    
    // Reservas por día (últimos 7 días) - Compatible con PostgreSQL y SQLite
    const dbInfo = db.getDatabaseInfo();
    let fechaCondition;
    let reservasPorDia;
    
    if (dbInfo.type === 'PostgreSQL') {
      fechaCondition = 'r.fecha >= CURRENT_DATE - INTERVAL \'7 days\'';
      reservasPorDia = await db.query(`
        SELECT r.fecha::date as dia, COUNT(*) as cantidad
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        WHERE ${fechaCondition}
        AND r.estado != 'cancelada'
        ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = $1'}
        GROUP BY r.fecha::date
        ORDER BY dia
      `, userRole === 'super_admin' ? [] : [complexFilter]);
    } else {
      fechaCondition = 'r.fecha >= date(\'now\', \'-7 days\')';
      reservasPorDia = await db.query(`
        SELECT date(r.fecha) as dia, COUNT(*) as cantidad
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        WHERE ${fechaCondition}
        AND r.estado != 'cancelada'
        ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = ?'}
        GROUP BY date(r.fecha)
        ORDER BY dia
      `, userRole === 'super_admin' ? [] : [complexFilter]);
    }
    
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
      whereClause = 'WHERE r.estado != \'cancelada\'';
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo ven su complejo
      whereClause = 'WHERE c.complejo_id = $1 AND r.estado != \'cancelada\'';
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
    
    // Ocultar precios a los managers
    if (req.userPermissions && !req.userPermissions.canViewFinancials) {
      const reservasSinPrecios = reservas.map(reserva => ({
        ...reserva,
        precio_total: null,
        precio_hora: null
      }));
      res.json(reservasSinPrecios);
    } else {
      res.json(reservas);
    }
  } catch (error) {
    console.error('❌ Error cargando reservas recientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para verificar disponibilidad baja
app.get('/api/admin/disponibilidad-baja', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('⚠️ Verificando disponibilidad baja...');
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      whereClause = 'WHERE co.id = $1';
      params = [complexFilter];
    }
    
    // Buscar horarios con poca disponibilidad (menos de 2 canchas disponibles)
    const disponibilidadBaja = await db.query(`
      SELECT 
        co.nombre as complejo,
        r.fecha,
        r.hora_inicio as hora,
        COUNT(*) as total_canchas,
        COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as ocupadas,
        COUNT(CASE WHEN r.estado != 'confirmada' THEN 1 END) as disponibles
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      AND r.fecha >= CURRENT_DATE
      AND r.fecha <= CURRENT_DATE + INTERVAL '7 days'
      GROUP BY co.nombre, r.fecha, r.hora_inicio
      HAVING COUNT(CASE WHEN r.estado != 'confirmada' THEN 1 END) <= 2
      ORDER BY r.fecha, r.hora_inicio
      LIMIT 10
    `, params);
    
    console.log(`✅ ${disponibilidadBaja.length} alertas de disponibilidad baja encontradas`);
    res.json(disponibilidadBaja);
  } catch (error) {
    console.error('❌ Error verificando disponibilidad baja:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para KPIs avanzados
app.get('/api/admin/kpis', authenticateToken, requireComplexAccess, async (req, res) => {
  try {
    console.log('📊 Cargando KPIs avanzados...');
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      whereClause = '';
    } else if (userRole === 'owner' || userRole === 'manager') {
      whereClause = 'WHERE c.complejo_id = $1';
      params = [complexFilter];
    }
    
    // Obtener datos para KPIs
    const kpiData = await db.query(`
      SELECT 
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_ingresos,
        AVG(r.precio_total) as promedio_ingresos,
        COUNT(DISTINCT c.id) as total_canchas,
        COUNT(DISTINCT co.id) as total_complejos,
        COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
        COUNT(CASE WHEN r.estado = 'cancelada' THEN 1 END) as reservas_canceladas
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause}
      AND r.fecha >= CURRENT_DATE - INTERVAL '30 days'
      AND r.fecha <= CURRENT_DATE
    `, params);
    
    // Obtener horarios más populares
    const horariosPopulares = await db.query(`
      SELECT 
        r.hora_inicio,
        COUNT(*) as cantidad
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      ${whereClause}
      AND r.fecha >= CURRENT_DATE - INTERVAL '30 days'
      AND r.estado = 'confirmada'
      GROUP BY r.hora_inicio
      ORDER BY cantidad DESC
      LIMIT 5
    `, params);
    
    // Calcular KPIs
    const data = kpiData[0] || {};
    const totalReservas = parseInt(data.total_reservas) || 0;
    const totalIngresos = parseFloat(data.total_ingresos) || 0;
    const promedioIngresos = parseFloat(data.promedio_ingresos) || 0;
    const totalCanchas = parseInt(data.total_canchas) || 1;
    const reservasConfirmadas = parseInt(data.reservas_confirmadas) || 0;
    const reservasCanceladas = parseInt(data.reservas_canceladas) || 0;
    
    // Calcular métricas
    const occupancyRate = totalCanchas > 0 ? Math.min(95, (reservasConfirmadas / (totalCanchas * 30)) * 100) : 0;
    const cancellationRate = totalReservas > 0 ? (reservasCanceladas / totalReservas) * 100 : 0;
    const customerSatisfaction = Math.max(70, 100 - (cancellationRate * 2)); // Simulado basado en cancelaciones
    
    const kpis = {
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      averageRevenue: Math.round(promedioIngresos),
      customerSatisfaction: Math.round(customerSatisfaction * 10) / 10,
      peakHours: horariosPopulares.map(h => h.hora_inicio),
      popularCourts: totalCanchas,
      revenueGrowth: Math.round((Math.random() - 0.3) * 30 * 10) / 10, // Simulado
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      averageBookingValue: Math.round(promedioIngresos)
    };
    
    console.log('✅ KPIs calculados:', kpis);
    res.json(kpis);
  } catch (error) {
    console.error('❌ Error calculando KPIs:', error);
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
      WHERE DATE(r.fecha) = DATE('now')
      AND r.estado != 'cancelada'
      ORDER BY r.hora_inicio
    `);
    
    console.log(`✅ ${reservasHoy.length} reservas de hoy cargadas`);
    
    // Ocultar precios a los managers
    if (req.userPermissions && !req.userPermissions.canViewFinancials) {
      const reservasSinPrecios = reservasHoy.map(reserva => ({
        ...reserva,
        precio_total: null,
        precio_hora: null
      }));
      res.json(reservasSinPrecios);
    } else {
      res.json(reservasHoy);
    }
  } catch (error) {
    console.error('❌ Error cargando reservas de hoy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener todas las reservas (panel de administración)
app.get('/api/admin/reservas', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
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
      SELECT r.*, c.nombre as cancha_nombre, 
             CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
             co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      ${whereClause}
      ORDER BY r.fecha_creacion DESC
    `, params);
    
    console.log(`✅ ${reservas.length} reservas cargadas para administración`);
    
    // Debug: Verificar reservas específicas (comentado para producción)
    // const reservaK07GYE = reservas.find(r => r.codigo_reserva === 'K07GYE');
    // const reserva6BNY23 = reservas.find(r => r.codigo_reserva === '6BNY23');
    
    // if (reservaK07GYE) {
    //     console.log('🔍 Debug - Reserva K07GYE encontrada:', {
    //         codigo: reservaK07GYE.codigo_reserva,
    //         nombre: reservaK07GYE.nombre_cliente,
    //         email: reservaK07GYE.email_cliente,
    //         telefono: reservaK07GYE.telefono_cliente,
    //         tieneTelefono: !!reservaK07GYE.telefono_cliente,
    //         telefonoTipo: typeof reservaK07GYE.telefono_cliente
    //     });
    // } else {
    //     console.log('❌ Reserva K07GYE no encontrada en los resultados');
    // }
    
    // if (reserva6BNY23) {
    //     console.log('🔍 Debug - Reserva 6BNY23 encontrada:', {
    //         codigo: reserva6BNY23.codigo_reserva,
    //         nombre: reserva6BNY23.nombre_cliente,
    //         email: reserva6BNY23.email_cliente,
    //         telefono: reserva6BNY23.telefono_cliente,
    //         tieneTelefono: !!reserva6BNY23.telefono_cliente,
    //         telefonoTipo: typeof reserva6BNY23.telefono_cliente
    //     });
    // } else {
    //     console.log('❌ Reserva 6BNY23 no encontrada en los resultados');
    // }
    
    // Ocultar precios a los managers
    if (req.userPermissions && !req.userPermissions.canViewFinancials) {
      const reservasSinPrecios = reservas.map(reserva => ({
        ...reserva,
        precio_total: null,
        precio_hora: null
      }));
      res.json(reservasSinPrecios);
    } else {
      res.json(reservas);
    }
  } catch (error) {
    console.error('❌ Error cargando reservas para administración:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener complejos (panel de administración)
app.get('/api/admin/complejos', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
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
app.get('/api/admin/canchas', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
  try {
    console.log('⚽ Cargando canchas para administración...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const complexFilter = req.complexFilter;
    const { complejoId } = req.query; // Obtener complejoId de query parameters
    
    // Construir filtros según el rol
    let whereClause = '';
    let params = [];
    
    if (userRole === 'super_admin') {
      // Super admin puede filtrar por complejo específico si se proporciona
      if (complejoId) {
        whereClause = 'WHERE c.complejo_id = $1';
        params = [complejoId];
      }
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
      
      // Enviar emails de confirmación después de confirmar manualmente
      try {
        // Obtener información completa de la reserva para el email
        const reservaInfo = await db.get(`
          SELECT r.*, c.nombre as cancha_nombre, 
                 CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
                 co.nombre as complejo_nombre
          FROM reservas r
          JOIN canchas c ON r.cancha_id = c.id
          JOIN complejos co ON c.complejo_id = co.id
          WHERE r.codigo_reserva = $1
        `, [codigoReserva]);

        if (reservaInfo) {
          const emailData = {
            codigo_reserva: reservaInfo.codigo_reserva,
            email_cliente: reservaInfo.email_cliente,
            nombre_cliente: reservaInfo.nombre_cliente,
            complejo: reservaInfo.complejo_nombre || 'Complejo Deportivo',
            cancha: reservaInfo.cancha_nombre || 'Cancha',
            fecha: reservaInfo.fecha,
            hora_inicio: reservaInfo.hora_inicio,
            hora_fin: reservaInfo.hora_fin,
            precio_total: reservaInfo.precio_total
          };

          console.log('📧 Enviando emails de confirmación para reserva confirmada manualmente:', codigoReserva);
          const emailResults = await emailService.sendConfirmationEmails(emailData);
          console.log('✅ Emails de confirmación procesados:', emailResults);
        }
      } catch (emailError) {
        console.error('❌ Error enviando emails de confirmación:', emailError);
        // No fallar la confirmación si hay error en el email
      }
      
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

// ===== RUTAS DEL CALENDARIO ADMINISTRATIVO =====
const { router: adminCalendarRoutes, setDatabase: setCalendarDatabase } = require('./src/routes/admin-calendar');
setCalendarDatabase(db); // Pasar la instancia de base de datos
app.use('/api/admin/calendar', adminCalendarRoutes);

// Endpoint para generar reportes (panel de administración)
app.post('/api/admin/reports', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
  try {
    const { dateFrom, dateTo, complexId } = req.body;
    console.log('📊 Generando reportes para administración...', { dateFrom, dateTo, complexId });
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const userRole = req.user.rol;
    const userComplexFilter = req.complexFilter;
    
    // Construir filtros SQL según el rol
    let whereClause = `WHERE r.fecha::date BETWEEN $1 AND $2`;
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
    
    // Reservas por día (solo confirmadas) - obteniendo datos individuales para agrupar correctamente
    const reservasPorDiaRaw = await db.query(`
      SELECT r.fecha, r.precio_total
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado = 'confirmada'
      ORDER BY r.fecha
    `, params);
    
    // Agrupar reservas por fecha de la reserva (no por fecha de creación)
    const reservasPorDia = {};
    reservasPorDiaRaw.forEach(row => {
      const fechaStr = typeof row.fecha === 'string' ? row.fecha : row.fecha.toISOString().split('T')[0];
      
      if (!reservasPorDia[fechaStr]) {
        reservasPorDia[fechaStr] = {
          fecha: fechaStr,
          cantidad: 0,
          ingresos: 0
        };
      }
      reservasPorDia[fechaStr].cantidad += 1;
      reservasPorDia[fechaStr].ingresos += row.precio_total;
    });
    
    const reservasPorDiaArray = Object.values(reservasPorDia).sort((a, b) => {
      const fechaA = typeof a.fecha === 'string' ? a.fecha : a.fecha.toISOString().split('T')[0];
      const fechaB = typeof b.fecha === 'string' ? b.fecha : b.fecha.toISOString().split('T')[0];
      return fechaA.localeCompare(fechaB);
    });
    
    
    // Reservas por complejo con ocupación real (solo confirmadas y pendientes)
    const reservasPorComplejo = await db.query(`
      SELECT
        co.nombre as complejo,
        COUNT(*) as cantidad,
        COALESCE(SUM(CASE WHEN r.estado = 'confirmada' THEN r.precio_total ELSE 0 END), 0) as ingresos,
        COUNT(DISTINCT c.id) as canchas_count
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado IN ('confirmada', 'pendiente')
      GROUP BY co.id, co.nombre
      ORDER BY ingresos DESC
    `, params);
    
    // Calcular ocupación real para cada complejo
    const reservasPorComplejoConOcupacion = await Promise.all(reservasPorComplejo.map(async (complejo) => {
      // Calcular días en el rango de fechas
      const fechaInicio = new Date(dateFrom);
      const fechaFin = new Date(dateTo);
      const diasDiferencia = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)) + 1;
      
      let horasDisponibles = 0;
      
      // Calcular horas disponibles día por día según el complejo
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
        
        horasDisponibles += complejo.canchas_count * horasPorDia;
      }
      
      // Calcular horas realmente ocupadas por reservas
      const horasOcupadas = await db.get(`
        SELECT SUM(
          CASE 
            WHEN r.hora_fin > r.hora_inicio THEN 
              (CAST(SUBSTR(r.hora_fin::text, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(r.hora_fin::text, 4, 2) AS INTEGER)) - 
              (CAST(SUBSTR(r.hora_inicio::text, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(r.hora_inicio::text, 4, 2) AS INTEGER))
            ELSE 0
          END
        ) / 60.0 as horas_totales
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        JOIN complejos co ON c.complejo_id = co.id
        WHERE r.fecha::date BETWEEN $1 AND $2
        AND co.id = (SELECT id FROM complejos WHERE nombre = $3)
        AND r.estado IN ('confirmada', 'pendiente')
      `, [dateFrom, dateTo, complejo.complejo]);
      
      const horasRealesOcupadas = parseFloat(horasOcupadas?.horas_totales || 0);
      
      // Calcular ocupación real - horas ocupadas / horas disponibles
      const ocupacionReal = horasDisponibles > 0 ? (horasRealesOcupadas / horasDisponibles * 100) : 0;
      
      return {
        ...complejo,
        ocupacion_real: ocupacionReal.toFixed(1),
        horas_disponibles: horasDisponibles,
        horas_ocupadas: horasRealesOcupadas.toFixed(1)
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
    
    // Calcular ocupación promedio real
    const ocupacionPromedio = reservasPorComplejoConOcupacion.length > 0 
      ? (reservasPorComplejoConOcupacion.reduce((sum, complejo) => sum + parseFloat(complejo.ocupacion_real), 0) / reservasPorComplejoConOcupacion.length).toFixed(1)
      : 0;

    const reportData = {
      metrics: {
        totalReservas: parseInt(totalReservas.count),
        ingresosTotales: parseInt(ingresosTotales.total),
        reservasConfirmadas: parseInt(reservasConfirmadas.count),
        tasaConfirmacion: totalReservas.count > 0 ? (reservasConfirmadas.count / totalReservas.count * 100).toFixed(1) : 0,
        ocupacionPromedio: parseFloat(ocupacionPromedio)
      },
      charts: {
        reservasPorDia: reservasPorDiaArray,
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

// Endpoint para verificar estructura de tabla bloqueos_temporales
app.get('/api/debug/check-blocking-table', async (req, res) => {
  try {
    console.log('🔍 Verificando estructura de tabla bloqueos_temporales...');
    
    // Verificar si la tabla existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bloqueos_temporales'
      );
    `);
    
    if (!tableExists[0].exists) {
      return res.json({
        success: false,
        error: 'Tabla bloqueos_temporales no existe',
        tableExists: false
      });
    }
    
    // Obtener estructura de la tabla
    const structure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bloqueos_temporales'
      ORDER BY ordinal_position;
    `);
    
    // Contar registros
    const count = await db.query('SELECT COUNT(*) as count FROM bloqueos_temporales');
    
    res.json({
      success: true,
      tableExists: true,
      structure: structure,
      recordCount: count[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para verificar canchas existentes
app.get('/api/debug/check-canchas', async (req, res) => {
  try {
    console.log('🔍 Verificando canchas existentes...');
    
    // Obtener todas las canchas
    const canchas = await db.query(`
      SELECT c.*, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM canchas c
      LEFT JOIN complejos co ON c.complejo_id = co.id
      LEFT JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY c.id
    `);
    
    // Obtener todos los complejos
    const complejos = await db.query(`
      SELECT co.*, ci.nombre as ciudad_nombre
      FROM complejos co
      LEFT JOIN ciudades ci ON co.ciudad_id = ci.id
      ORDER BY co.id
    `);
    
    // Obtener todas las ciudades
    const ciudades = await db.query(`
      SELECT * FROM ciudades ORDER BY id
    `);
    
    res.json({
      success: true,
      canchas: canchas,
      complejos: complejos,
      ciudades: ciudades,
      counts: {
        canchas: canchas.length,
        complejos: complejos.length,
        ciudades: ciudades.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando canchas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
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
        // Calcular comisión para reserva web (3.5%)
        const comisionWeb = Math.round(reserva.precio_total * 0.035);
        
        const result = await db.run(
          'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, estado, fecha_creacion, tipo_reserva, comision_aplicada) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
          [reserva.codigo_reserva, reserva.cancha_id, reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.precio_total, 'confirmada', new Date().toISOString(), 'directa', comisionWeb]
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
      SELECT r.*, c.nombre as cancha_nombre, 
             CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
             co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.codigo_reserva = $1 OR r.nombre_cliente LIKE $2
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
    const { cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, bloqueo_id } = req.body;
    
    console.log('📝 Creando reserva con datos:', { 
      cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, bloqueo_id 
    });
    
    // Usar teléfono por defecto si no se proporciona
    const telefono = telefono_cliente || 'No proporcionado';
    
    // VERIFICAR DISPONIBILIDAD ANTES DE CREAR LA RESERVA
    if (!bloqueo_id) {
      // Si no hay bloqueo temporal, verificar disponibilidad
      const disponibilidad = await verificarDisponibilidadCancha(cancha_id, fecha, hora_inicio, hora_fin);
      if (!disponibilidad.disponible) {
        return res.status(409).json({ 
          success: false, 
          error: 'La cancha ya no está disponible en ese horario',
          conflicto: disponibilidad.conflicto
        });
      }
    }
    
    // Generar código de reserva único (6 caracteres alfanuméricos)
    const codigo_reserva = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Calcular comisión para reserva web (3.5%)
    const comisionWeb = Math.round(precio_total * 0.035);
    
    console.log('💾 Insertando reserva en BD:', {
      codigo_reserva,
      cancha_id,
      nombre_cliente,
      email_cliente,
      telefono_cliente: telefono,
      rut_cliente,
      fecha,
      hora_inicio,
      hora_fin,
      precio_total
    });
    
    const result = await db.run(
      'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, estado, fecha_creacion, tipo_reserva, comision_aplicada) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
      [codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 'pendiente', new Date().toISOString(), 'directa', comisionWeb]
    );
    
    // Liberar bloqueo temporal si existe
    if (bloqueo_id) {
      try {
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo_id]);
        console.log('🔓 Bloqueo temporal liberado:', bloqueo_id);
      } catch (error) {
        console.error('⚠️ Error liberando bloqueo temporal:', error.message);
      }
    }
    
    // Invalidar caché de disponibilidad
    const { invalidateCacheOnReservation } = require('./src/controllers/availabilityController');
    invalidateCacheOnReservation(cancha_id, fecha);
    
    // Los emails se enviarán después de confirmar el pago
    
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

// ===== ENDPOINT PARA ENVÍO DE EMAILS =====
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { 
      codigo_reserva, 
      email_cliente, 
      nombre_cliente, 
      complejo, 
      cancha, 
      fecha, 
      hora_inicio, 
      hora_fin, 
      precio_total 
    } = req.body;

    console.log('📧 Enviando email de confirmación para reserva:', codigo_reserva);

    // Validar datos requeridos
    if (!codigo_reserva || !email_cliente || !nombre_cliente) {
      return res.status(400).json({ 
        success: false, 
        error: 'Datos requeridos faltantes para envío de email' 
      });
    }

    // Preparar datos para el email
    const emailData = {
      codigo_reserva,
      email_cliente,
      nombre_cliente,
      complejo: complejo || 'Complejo Deportivo',
      cancha: cancha || 'Cancha',
      fecha: fecha || new Date().toISOString().split('T')[0],
      hora_inicio: hora_inicio || '18:00',
      hora_fin: hora_fin || '19:00',
      precio_total: precio_total || 0
    };

    // Enviar emails de confirmación (cliente + administradores)
    const emailResults = await emailService.sendConfirmationEmails(emailData);

    console.log('✅ Emails de confirmación procesados:', emailResults);

    res.json({
      success: true,
      message: 'Emails de confirmación enviados exitosamente',
      details: emailResults
    });

  } catch (error) {
    console.error('❌ Error enviando email de confirmación:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno enviando email de confirmación' 
    });
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
        const codigo_reserva = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        // Calcular comisión para reserva web (3.5%)
        const comisionWeb = Math.round(reserva.precio_total * 0.035);
        
        await db.run(
          'INSERT INTO reservas (codigo_reserva, cancha_id, nombre_cliente, email_cliente, telefono_cliente, fecha, hora_inicio, hora_fin, precio_total, estado, fecha_creacion, tipo_reserva, comision_aplicada) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
          [codigo_reserva, reserva.cancha_id, reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.precio_total, 'pendiente', new Date().toISOString(), 'directa', comisionWeb]
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
        WHERE u.email = $1 AND u.activo = 1
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

// ===== ENDPOINTS DE RESTABLECIMIENTO DE CONTRASEÑA =====

// Endpoint para solicitar restablecimiento de contraseña
app.post('/api/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email es requerido' });
    }

    console.log('🔐 Solicitud de restablecimiento de contraseña para:', email);

    // Buscar usuario por email
    const user = await db.query('SELECT id, email, nombre, rol FROM usuarios WHERE email = $1 AND activo = true', [email]);
    
    if (user.length === 0) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({ 
        success: true, 
        message: 'Si el email existe en nuestro sistema, recibirás un enlace de restablecimiento' 
      });
    }

    const userData = user[0];
    
    // Verificar que sea un administrador
    if (!['super_admin', 'admin', 'complejo_admin'].includes(userData.rol)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Solo los administradores pueden restablecer contraseñas' 
      });
    }

    // Generar token único
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expira en 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    // Limpiar tokens anteriores del usuario
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userData.id]);
    
    // Crear nuevo token
    await db.query(`
      INSERT INTO password_reset_tokens (user_id, token, email, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [userData.id, token, email, expiresAt]);

    // Enviar email con enlace de restablecimiento
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-reset-password?token=${token}`;
    
    const emailData = {
      to: email,
      subject: 'Restablecimiento de Contraseña - Reserva Tu Cancha',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Restablecimiento de Contraseña</h2>
          <p>Hola ${userData.nombre},</p>
          <p>Has solicitado restablecer tu contraseña para el panel de administración de Reserva Tu Cancha.</p>
          <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p><strong>Este enlace expira en 1 hora.</strong></p>
          <p>Si no solicitaste este restablecimiento, puedes ignorar este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Reserva Tu Cancha - Sistema de Administración<br>
            Este es un email automático, por favor no responder.
          </p>
        </div>
      `
    };

    try {
      const emailService = new EmailService();
      await emailService.sendPasswordResetEmail(email, token);
      console.log('✅ Email de restablecimiento enviado a:', email);
    } catch (emailError) {
      console.error('❌ Error enviando email de restablecimiento:', emailError.message);
      // No fallar la operación si el email no se puede enviar
    }

    res.json({ 
      success: true, 
      message: 'Si el email existe en nuestro sistema, recibirás un enlace de restablecimiento' 
    });

  } catch (error) {
    console.error('❌ Error en solicitud de restablecimiento:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para verificar token de restablecimiento
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔍 Verificando token de restablecimiento:', token);

    // Buscar token válido
    const currentTimestampFunc = getCurrentTimestampFunction();
    const tokenData = await db.query(`
      SELECT prt.*, u.nombre, u.rol 
      FROM password_reset_tokens prt
      JOIN usuarios u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > ${currentTimestampFunc}
    `, [token]);

    if (tokenData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido o expirado' 
      });
    }

    const tokenInfo = tokenData[0];
    
    res.json({ 
      success: true, 
      message: 'Token válido',
      user: {
        email: tokenInfo.email,
        nombre: tokenInfo.nombre,
        rol: tokenInfo.rol
      }
    });

  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// Endpoint para restablecer contraseña
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token y nueva contraseña son requeridos' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    console.log('🔐 Restableciendo contraseña con token:', token);

    // Buscar token válido
    const currentTimestampFunc2 = getCurrentTimestampFunction();
    const tokenData = await db.query(`
      SELECT prt.*, u.id, u.email, u.nombre, u.rol 
      FROM password_reset_tokens prt
      JOIN usuarios u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > ${currentTimestampFunc2}
    `, [token]);

    if (tokenData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token inválido o expirado' 
      });
    }

    const tokenInfo = tokenData[0];
    
    // Hash de la nueva contraseña
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña del usuario
    await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, tokenInfo.id]);
    
    // Marcar token como usado
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenInfo.id]);
    
    // Limpiar tokens expirados del usuario
    const currentTimestampFunc3 = getCurrentTimestampFunction();
    await db.query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND expires_at <= ${currentTimestampFunc3}`, [tokenInfo.id]);

    console.log('✅ Contraseña restablecida exitosamente para:', tokenInfo.email);

    // Enviar email de confirmación
    const emailData = {
      to: tokenInfo.email,
      subject: 'Contraseña Restablecida - Reserva Tu Cancha',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Contraseña Restablecida Exitosamente</h2>
          <p>Hola ${tokenInfo.nombre},</p>
          <p>Tu contraseña ha sido restablecida exitosamente.</p>
          <p>Ahora puedes acceder al panel de administración con tu nueva contraseña.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-login.html" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Acceder al Panel de Administración
            </a>
          </div>
          <p><strong>Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Reserva Tu Cancha - Sistema de Administración<br>
            Este es un email automático, por favor no responder.
          </p>
        </div>
      `
    };

    try {
      const emailService = new EmailService();
      await emailService.sendPasswordChangeConfirmation(tokenInfo.email);
      console.log('✅ Email de confirmación enviado a:', tokenInfo.email);
    } catch (emailError) {
      console.error('❌ Error enviando email de confirmación:', emailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Contraseña restablecida exitosamente' 
    });

  } catch (error) {
    console.error('❌ Error restableciendo contraseña:', error.message);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
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
      { email: 'admin@reservatuscanchas.cl', password: 'admin123', nombre: 'Super Administrador', rol: 'super_admin' },
      { email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Administrador MagnaSports', rol: 'admin' },
      { email: 'naxiin_320@hotmail.com', password: 'complejo2024', nombre: 'Dueño MagnaSports', rol: 'admin' }
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
    
    // Eliminar reservas
    await db.run('DELETE FROM reservas');
    console.log('✅ Reservas eliminadas');
    
    // Eliminar canchas
    await db.run('DELETE FROM canchas');
    console.log('✅ Canchas eliminadas');
    
    // Eliminar usuarios
    await db.run('DELETE FROM usuarios');
    console.log('✅ Usuarios eliminados');
    
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
      ['admin@reservatuscanchas.cl', superAdminPassword, 'Super Administrador', 'super_admin', true, null]
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
      ['naxiin320@gmail.com', adminPassword, 'Administrador MagnaSports', 'admin', true, complejoId]
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
        superAdmin: 'admin@reservatuscanchas.cl / admin123',
        dueno: 'naxiin_320@hotmail.com / complejo2024',
        admin: 'naxiin320@gmail.com / magnasports2024'
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

// ===== ENDPOINT PARA PROBAR CONFIGURACIÓN DE EMAIL =====
app.get('/api/debug/test-email-config', async (req, res) => {
  try {
    console.log('📧 Probando configuración de email...');
    
    const emailService = new EmailService();
    
    // Verificar configuración
    const config = require('./src/config/config');
    const emailConfig = {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      user: config.email.user ? 'Configurado' : 'No configurado',
      pass: config.email.pass ? 'Configurado' : 'No configurado'
    };
    
    // Verificar si el servicio está configurado
    const isConfigured = emailService.isConfigured;
    
    res.json({
      success: true,
      message: 'Configuración de email verificada',
      config: emailConfig,
      isConfigured: isConfigured,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error probando configuración de email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA PROBAR ENVÍO DE EMAIL =====
app.post('/api/debug/test-email-send', async (req, res) => {
  try {
    console.log('📧 Probando envío de email...');
    
    const emailService = new EmailService();
    
    // Datos de prueba
    const testData = {
      codigo_reserva: Math.random().toString(36).substr(2, 6).toUpperCase(),
      nombre_cliente: 'Cliente de Prueba',
      email_cliente: 'ignacio.araya.lillo@gmail.com',
      complejo: 'MagnaSports',
      cancha: 'Cancha Techada 1',
      fecha: '2025-09-12',
      hora_inicio: '18:00',
      hora_fin: '19:00',
      precio_total: 28000
    };
    
    // Intentar enviar email
    const result = await emailService.sendConfirmationEmails(testData);
    
    res.json({
      success: true,
      message: 'Prueba de envío de email completada',
      testData: testData,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error probando envío de email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA VERIFICAR VARIABLES DE ENTORNO =====
app.get('/api/debug/env-vars', async (req, res) => {
  try {
    console.log('🔍 Verificando variables de entorno...');
    
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      SMTP_HOST: process.env.SMTP_HOST ? 'Definido' : 'No definido',
      SMTP_PORT: process.env.SMTP_PORT ? 'Definido' : 'No definido',
      SMTP_USER: process.env.SMTP_USER ? 'Definido' : 'No definido',
      SMTP_PASS: process.env.SMTP_PASS ? 'Definido' : 'No definido',
      DATABASE_URL: process.env.DATABASE_URL ? 'Definido' : 'No definido',
      JWT_SECRET: process.env.JWT_SECRET ? 'Definido' : 'No definido'
    };
    
    res.json({
      success: true,
      message: 'Variables de entorno verificadas',
      envVars: envVars,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando variables de entorno:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA VERIFICAR EMAIL SERVICE =====
app.get('/api/debug/email-service-status', async (req, res) => {
  try {
    console.log('📧 Verificando estado del servicio de email...');
    
    const emailService = new EmailService();
    
    res.json({
      success: true,
      message: 'Estado del servicio de email verificado',
      emailService: {
        isConfigured: emailService.isConfigured,
        hasTransporter: !!emailService.transporter
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando servicio de email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA VERIFICAR USUARIOS ADMINISTRADORES =====
app.get('/api/debug/admin-users', async (req, res) => {
  try {
    console.log('👑 Verificando usuarios administradores...');
    
    const usuarios = await db.query('SELECT id, email, nombre, rol, activo FROM usuarios ORDER BY rol, email');
    
    res.json({
      success: true,
      message: 'Usuarios administradores verificados',
      usuarios: usuarios,
      total: usuarios.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando usuarios administradores:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== FUNCIÓN PARA VERIFICAR DISPONIBILIDAD DE CANCHA =====
async function verificarDisponibilidadCancha(canchaId, fecha, horaInicio, horaFin) {
  try {
    console.log(`🔍 Verificando disponibilidad para cancha ${canchaId} en ${fecha} de ${horaInicio} a ${horaFin}`);
    
    // Obtener reservas existentes
    const reservas = await db.query(`
      SELECT hora_inicio, hora_fin 
      FROM reservas 
      WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
    `, [canchaId, fecha]);
    
    console.log(`📊 Reservas encontradas: ${reservas.length}`);
    
    // Obtener bloqueos temporales activos
    console.log(`🔍 Consultando bloqueos temporales para cancha ${canchaId} en ${fecha}`);
    const bloqueos = await db.query(`
      SELECT hora_inicio, hora_fin, session_id
      FROM bloqueos_temporales 
      WHERE cancha_id = $1 AND fecha = $2 AND expira_en > $3
    `, [canchaId, fecha, new Date().toISOString()]);
    
    console.log(`📊 Bloqueos temporales encontrados: ${bloqueos.length}`);
    
    // Verificar conflictos con reservas existentes
    console.log('🔍 Verificando conflictos con reservas existentes...');
    for (const reserva of reservas) {
      console.log(`🔍 Comparando ${horaInicio}-${horaFin} con reserva ${reserva.hora_inicio}-${reserva.hora_fin}`);
      if (haySuperposicionHorarios(horaInicio, horaFin, reserva.hora_inicio, reserva.hora_fin)) {
        console.log('❌ Conflicto encontrado con reserva existente');
        return {
          disponible: false,
          conflicto: {
            tipo: 'reserva_existente',
            hora_inicio: reserva.hora_inicio,
            hora_fin: reserva.hora_fin
          },
          bloqueos: bloqueos.map(bloqueo => ({
            hora_inicio: bloqueo.hora_inicio,
            hora_fin: bloqueo.hora_fin,
            session_id: bloqueo.session_id
          }))
        };
      }
    }
    
    // Verificar conflictos con bloqueos temporales
    for (const bloqueo of bloqueos) {
      if (haySuperposicionHorarios(horaInicio, horaFin, bloqueo.hora_inicio, bloqueo.hora_fin)) {
        return {
          disponible: false,
          conflicto: {
            tipo: 'bloqueo_temporal',
            hora_inicio: bloqueo.hora_inicio,
            hora_fin: bloqueo.hora_fin,
            session_id: bloqueo.session_id
          },
          bloqueos: bloqueos.map(bloqueo => ({
            hora_inicio: bloqueo.hora_inicio,
            hora_fin: bloqueo.hora_fin,
            session_id: bloqueo.session_id
          }))
        };
      }
    }
    
    return { 
      disponible: true,
      bloqueos: bloqueos.map(bloqueo => ({
        hora_inicio: bloqueo.hora_inicio,
        hora_fin: bloqueo.hora_fin,
        session_id: bloqueo.session_id
      }))
    };
    
  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    return { disponible: false, error: error.message };
  }
}

// ===== FUNCIÓN PARA VERIFICAR SUPERPOSICIÓN DE HORARIOS =====
function haySuperposicionHorarios(inicio1, fin1, inicio2, fin2) {
  const inicio1Min = timeToMinutes(inicio1);
  const fin1Min = timeToMinutes(fin1);
  const inicio2Min = timeToMinutes(inicio2);
  const fin2Min = timeToMinutes(fin2);
  
  return inicio1Min < fin2Min && fin1Min > inicio2Min;
}

// ===== FUNCIÓN PARA CONVERTIR HORA A MINUTOS =====
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ===== ENDPOINT PARA BLOQUEAR TEMPORALMENTE UNA RESERVA =====
app.post('/api/reservas/bloquear', async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin, session_id } = req.body;
    
    // Verificar que todos los campos requeridos estén presentes
    if (!cancha_id || !fecha || !hora_inicio || !hora_fin || !session_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos para bloquear la reserva' 
      });
    }
    
    // Verificar disponibilidad antes de bloquear
    const disponibilidad = await verificarDisponibilidadCancha(cancha_id, fecha, hora_inicio, hora_fin);
    if (!disponibilidad.disponible) {
      return res.status(409).json({ 
        success: false, 
        error: 'La cancha ya no está disponible en ese horario',
        conflicto: disponibilidad.conflicto
      });
    }
    
    // Crear bloqueo temporal (3 minutos)
    const bloqueoId = 'BLOCK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const expiraEn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos
    
    // Insertar bloqueo en la base de datos
    await db.run(
      'INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, creado_en) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [bloqueoId, cancha_id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), new Date().toISOString()]
    );
    
    console.log('🔒 Bloqueo temporal creado:', {
      bloqueoId,
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      session_id,
      expiraEn: expiraEn.toISOString()
    });
    
    res.json({
      success: true,
      bloqueoId,
      expiraEn: expiraEn.toISOString(),
      mensaje: 'Reserva bloqueada temporalmente por 5 minutos'
    });
    
  } catch (error) {
    console.error('❌ Error bloqueando reserva:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// ===== ENDPOINT PARA VERIFICAR DISPONIBILIDAD CON BLOQUEOS =====
app.get('/api/disponibilidad/:cancha_id/:fecha', async (req, res) => {
  try {
    const { cancha_id, fecha } = req.params;
    
    // Obtener reservas existentes
    const reservas = await db.query(`
      SELECT hora_inicio, hora_fin, estado 
      FROM reservas 
      WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
    `, [cancha_id, fecha]);
    
    // Obtener bloqueos temporales activos
    const bloqueos = await db.query(`
      SELECT hora_inicio, hora_fin, session_id, expira_en
      FROM bloqueos_temporales 
      WHERE cancha_id = $1 AND fecha = $2 AND expira_en > $3
    `, [cancha_id, fecha, new Date().toISOString()]);
    
    // Limpiar bloqueos expirados
    await db.run(
      'DELETE FROM bloqueos_temporales WHERE expira_en <= $1',
      [new Date().toISOString()]
    );
    
    // Agregar headers para evitar cache del navegador
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      reservas: reservas,
      bloqueos: bloqueos,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error verificando disponibilidad' 
    });
  }
});

// ===== ENDPOINT PARA LIBERAR BLOQUEO TEMPORAL =====
app.delete('/api/reservas/bloquear/:bloqueo_id', async (req, res) => {
  try {
    const { bloqueo_id } = req.params;
    
    const result = await db.run(
      'DELETE FROM bloqueos_temporales WHERE id = $1',
      [bloqueo_id]
    );
    
    if (result.changes > 0) {
      console.log('🔓 Bloqueo liberado:', bloqueo_id);
      res.json({ 
        success: true, 
        mensaje: 'Bloqueo liberado exitosamente' 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Bloqueo no encontrado' 
      });
    }
    
  } catch (error) {
    console.error('❌ Error liberando bloqueo:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error liberando bloqueo' 
    });
  }
});

// ===== ENDPOINT DE DEBUG PARA PROBAR BLOQUEOS =====
app.post('/api/debug/test-bloqueo', async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin } = req.body;
    
    console.log('🧪 DEBUG: Probando bloqueo con datos:', { cancha_id, fecha, hora_inicio, hora_fin });
    
    // Verificar disponibilidad
    const disponibilidad = await verificarDisponibilidadCancha(cancha_id, fecha, hora_inicio, hora_fin);
    console.log('🧪 DEBUG: Resultado de verificación:', disponibilidad);
    
    res.json({
      success: true,
      datos_entrada: { cancha_id, fecha, hora_inicio, hora_fin },
      verificacion: disponibilidad,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en debug de bloqueo:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA CREAR/ACTUALIZAR USUARIOS ADMINISTRADORES =====
app.post('/api/debug/create-admin-users', async (req, res) => {
  try {
    console.log('👑 Creando/actualizando usuarios administradores...');
    
    const bcrypt = require('bcryptjs');
    
    // Usuarios administradores
    const adminUsers = [
      {
        email: 'admin@reservatuscanchas.cl',
        password: 'admin123',
        nombre: 'Super Administrador',
        rol: 'super_admin'
      },
      {
        email: 'naxiin320@gmail.com',
        password: 'magnasports2024',
        nombre: 'Administrador MagnaSports',
        rol: 'admin'
      },
      {
        email: 'naxiin_320@hotmail.com',
        password: 'complejo2024',
        nombre: 'Dueño MagnaSports',
        rol: 'admin'
      }
    ];
    
    const results = [];
    
    for (const usuario of adminUsers) {
      try {
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(usuario.password, 10);
        
        // Insertar o actualizar usuario
        if (db.getDatabaseInfo().type === 'PostgreSQL') {
          await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
            [usuario.email, hashedPassword, usuario.nombre, usuario.rol]
          );
        } else {
          await db.run(
            'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, 1) ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, nombre = EXCLUDED.nombre, rol = EXCLUDED.rol',
            [usuario.email, hashedPassword, usuario.nombre, usuario.rol]
          );
        }
        
        results.push({
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol,
          status: 'success'
        });
        
        console.log(`✅ Usuario creado/actualizado: ${usuario.email} (${usuario.rol})`);
        
      } catch (error) {
        console.error(`❌ Error con usuario ${usuario.email}:`, error.message);
        results.push({
          email: usuario.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Usuarios administradores creados/actualizados',
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error creando usuarios administradores:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
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
        email: 'admin@reservatuscanchas.cl',
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
        email: 'naxiin320@gmail.com',
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
    let whereClause = `WHERE r.fecha::date BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    if (complexId) {
      whereClause += ` AND co.id = $3`;
      params.push(complexId);
    }
    
    // Análisis de clientes agrupando por RUT para evitar duplicados y conservar nombre más completo
    const clientesFrecuentes = await db.query(`
      SELECT 
        CASE 
          WHEN LENGTH(MAX(r.nombre_cliente)) > LENGTH(MIN(r.nombre_cliente)) 
          THEN MAX(r.nombre_cliente)
          ELSE MIN(r.nombre_cliente)
        END as nombre_cliente,
        r.email_cliente,
        r.rut_cliente,
        MAX(r.telefono_cliente) as telefono_cliente,
        COUNT(*) as total_reservas,
        SUM(r.precio_total) as total_gastado,
        ROUND(SUM(r.precio_total) / COUNT(*), 0) as promedio_por_reserva,
        MIN(r.fecha) as primera_reserva,
        MAX(r.fecha) as ultima_reserva
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado IN ('confirmada', 'pendiente')
      GROUP BY r.rut_cliente, r.email_cliente
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint de diagnóstico para verificar estructura de BD
app.get('/debug/database-structure', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    let schema = [];
    if (dbInfo.type === 'SQLite') {
      schema = await db.query("PRAGMA table_info(reservas)");
    } else {
      schema = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'reservas'
        ORDER BY ordinal_position
      `);
    }
    
    // Probar consulta específica del calendario
    let testResult = null;
    try {
      const testQuery = `
        SELECT 
          r.id,
          r.codigo_reserva as codigo,
          r.fecha,
          r.hora_inicio,
          r.hora_fin,
          r.precio_total,
          r.estado,
          r.tipo_reserva,
          r.creada_por_admin,
          r.metodo_contacto,
          r.comision_aplicada,
          r.nombre_cliente,
          r.email_cliente,
          r.telefono_cliente
        FROM reservas r
        LIMIT 1
      `;
      
      testResult = await db.query(testQuery);
    } catch (error) {
      testResult = { error: error.message, code: error.code };
    }
    
    res.json({
      database: dbInfo,
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'Definido' : 'No definido',
      reservasSchema: schema,
      testQuery: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para verificar tabla bloqueos_temporales
app.get('/debug/check-blocking-table', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    let tableExists = false;
    let tableSchema = [];
    let testQuery = null;
    
    if (dbInfo.type === 'SQLite') {
      // Verificar si la tabla existe en SQLite
      const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='bloqueos_temporales'");
      tableExists = tables.length > 0;
      
      if (tableExists) {
        tableSchema = await db.query("PRAGMA table_info(bloqueos_temporales)");
      }
    } else {
      // Verificar si la tabla existe en PostgreSQL
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'bloqueos_temporales'
      `);
      tableExists = tables.length > 0;
      
      if (tableExists) {
        tableSchema = await db.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'bloqueos_temporales'
          ORDER BY ordinal_position
        `);
      }
    }
    
    // Probar consulta de inserción (sin ejecutar)
    if (tableExists) {
      try {
        const testSelect = await db.query("SELECT COUNT(*) as count FROM bloqueos_temporales LIMIT 1");
        testQuery = { success: true, count: testSelect[0]?.count || 0 };
      } catch (error) {
        testQuery = { error: error.message, code: error.code };
      }
    }
    
    res.json({
      database: dbInfo,
      tableExists: tableExists,
      tableSchema: tableSchema,
      testQuery: testQuery,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para crear tabla bloqueos_temporales si no existe
app.post('/debug/create-blocking-table', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    if (dbInfo.type !== 'PostgreSQL') {
      return res.json({
        success: false,
        message: 'Este endpoint solo funciona con PostgreSQL',
        databaseType: dbInfo.type
      });
    }
    
    console.log('🔧 Creando tabla bloqueos_temporales en PostgreSQL...');
    
    // Verificar si la tabla ya existe
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bloqueos_temporales'
      );
    `);
    
    if (tableExists[0].exists) {
      return res.json({
        success: true,
        message: 'Tabla bloqueos_temporales ya existe',
        tableExists: true
      });
    }
    
    // Crear la tabla
    await db.query(`
      CREATE TABLE bloqueos_temporales (
        id VARCHAR(50) PRIMARY KEY,
        cancha_id INTEGER REFERENCES canchas(id),
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        expira_en TIMESTAMP NOT NULL,
        datos_cliente TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabla bloqueos_temporales creada exitosamente');
    
    // Verificar que se creó correctamente
    const structure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bloqueos_temporales'
      ORDER BY ordinal_position;
    `);
    
    res.json({
      success: true,
      message: 'Tabla bloqueos_temporales creada exitosamente',
      tableExists: true,
      structure: structure
    });
    
  } catch (error) {
    console.error('❌ Error creando tabla bloqueos_temporales:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para probar inserción de reserva
app.post('/debug/test-reservation-insert', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    console.log('🧪 Probando inserción de reserva...');
    
    // Obtener una cancha existente
    const canchas = await db.query('SELECT id FROM canchas LIMIT 1');
    if (canchas.length === 0) {
      return res.json({
        success: false,
        message: 'No hay canchas disponibles para la prueba'
      });
    }
    
    // Datos de prueba
    const testData = {
      codigo_reserva: 'TEST123',
      cancha_id: canchas[0].id,
      fecha: '2025-09-13',
      hora_inicio: '10:00:00',
      hora_fin: '11:00:00',
      nombre_cliente: 'Cliente Test',
      email_cliente: 'test@test.com',
      telefono_cliente: '123456789',
      rut_cliente: '12345678-9',
      precio_total: 28000,
      estado: 'confirmada',
      tipo_reserva: 'administrativa',
      creada_por_admin: true,
      admin_id: 1,
      comision_aplicada: 0
    };
    
    // Probar la consulta de inserción
    const insertQuery = `
      INSERT INTO reservas (
        codigo_reserva, cancha_id, fecha, hora_inicio, hora_fin,
        nombre_cliente, email_cliente, telefono_cliente, rut_cliente,
        precio_total, estado, tipo_reserva, creada_por_admin, admin_id,
        comision_aplicada
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const insertParams = [
      testData.codigo_reserva, testData.cancha_id, testData.fecha, testData.hora_inicio, testData.hora_fin,
      testData.nombre_cliente, testData.email_cliente, testData.telefono_cliente, testData.rut_cliente,
      testData.precio_total, testData.estado, testData.tipo_reserva, testData.creada_por_admin, testData.admin_id,
      testData.comision_aplicada
    ];
    
    console.log('🔍 Ejecutando consulta de prueba...');
    const result = await db.query(insertQuery, insertParams);
    console.log('🔍 Resultado:', result);
    
    // Limpiar el registro de prueba
    await db.run('DELETE FROM reservas WHERE codigo_reserva = $1', [testData.codigo_reserva]);
    
    res.json({
      success: true,
      message: 'Inserción de reserva exitosa',
      result: result,
      database: dbInfo
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de inserción:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para agregar columna admin_id específicamente
app.post('/debug/add-admin-id-column', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    if (dbInfo.type !== 'PostgreSQL') {
      return res.json({
        success: false,
        message: 'Este endpoint solo funciona con PostgreSQL',
        databaseType: dbInfo.type
      });
    }
    
    console.log('🔧 Agregando columna admin_id a tabla reservas...');
    
    // Verificar si la columna ya existe
    const existingColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservas' AND column_name = 'admin_id'
    `);
    
    if (existingColumns.length > 0) {
      return res.json({
        success: true,
        message: 'Columna admin_id ya existe',
        columnExists: true
      });
    }
    
    // Agregar la columna
    await db.query(`ALTER TABLE reservas ADD COLUMN admin_id INTEGER`);
    console.log('✅ Columna admin_id agregada exitosamente');
    
    // Verificar que se agregó correctamente
    const finalColumns = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reservas' AND column_name = 'admin_id'
    `);
    
    res.json({
      success: true,
      message: 'Columna admin_id agregada exitosamente',
      columnExists: true,
      columnInfo: finalColumns[0]
    });
    
  } catch (error) {
    console.error('❌ Error agregando columna admin_id:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para actualizar credenciales del super admin
app.post('/debug/update-super-admin', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const dbInfo = db.getDatabaseInfo();
    
    console.log('🔧 Actualizando credenciales del super admin...');
    
    const email = 'admin@reservatuscanchas.cl';
    const password = 'admin1234';
    
    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Verificar si el usuario existe
    const existingUser = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    
    if (existingUser.length > 0) {
      // Actualizar usuario existente
      await db.query(
        'UPDATE usuarios SET password = $1, rol = $2 WHERE email = $3',
        [hashedPassword, 'super_admin', email]
      );
      console.log('✅ Usuario super admin actualizado');
    } else {
      // Crear nuevo usuario
      await db.query(
        'INSERT INTO usuarios (email, password, nombre, rol, activo) VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, 'Super Admin', 'super_admin', true]
      );
      console.log('✅ Usuario super admin creado');
    }
    
    // Verificar que se actualizó correctamente
    const updatedUser = await db.query('SELECT id, email, rol FROM usuarios WHERE email = $1', [email]);
    
    res.json({
      success: true,
      message: 'Credenciales del super admin actualizadas exitosamente',
      user: {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        rol: updatedUser[0].rol
      },
      database: dbInfo
    });
    
  } catch (error) {
    console.error('❌ Error actualizando super admin:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para probar create-blocking específicamente
app.post('/debug/test-create-blocking', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    console.log('🧪 Probando endpoint create-blocking...');
    
    // Obtener una cancha existente
    const canchas = await db.query('SELECT id, nombre FROM canchas LIMIT 1');
    if (canchas.length === 0) {
      return res.json({
        success: false,
        message: 'No hay canchas disponibles para la prueba'
      });
    }
    
    const cancha = canchas[0];
    
    // Datos de prueba para create-blocking
    const testData = {
      fecha: '2025-09-13',
      hora_inicio: '10:00:00',
      hora_fin: '11:00:00',
      session_id: 'test_session_123',
      tipo: 'admin'
    };
    
    // Simular el proceso de create-blocking
    const expiraEn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos
    const bloqueoId = `ADMIN_${Date.now()}_${cancha.id}`;
    
    const datosCliente = JSON.stringify({
      nombre_cliente: `Admin Test`,
      tipo_bloqueo: 'administrativo',
      admin_id: 10,
      admin_email: 'admin@reservatuscanchas.cl'
    });
    
    // Probar la consulta de inserción
    const insertQuery = `
      INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    
    const insertParams = [
      bloqueoId, cancha.id, testData.fecha, testData.hora_inicio, testData.hora_fin, 
      testData.session_id, expiraEn.toISOString(), datosCliente
    ];
    
    console.log('🔍 Ejecutando consulta de create-blocking...');
    const result = await db.query(insertQuery, insertParams);
    console.log('🔍 Resultado:', result);
    
    // Limpiar el registro de prueba
    await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueoId]);
    
    res.json({
      success: true,
      message: 'Test de create-blocking exitoso',
      result: result,
      database: dbInfo,
      testData: testData
    });
    
  } catch (error) {
    console.error('❌ Error en test de create-blocking:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint para simular create-blocking sin autenticación
app.post('/debug/simulate-create-blocking', async (req, res) => {
  try {
    const { fecha, hora_inicio, hora_fin, session_id, tipo } = req.body;
    
    console.log('🧪 Simulando create-blocking:', { fecha, hora_inicio, hora_fin, session_id, tipo });
    
    // Simular usuario super admin
    const user = {
      id: 10,
      email: 'admin@reservatuscanchas.cl',
      rol: 'super_admin',
      complejo_id: null
    };
    
    // Obtener todas las canchas del complejo del usuario
    let canchasQuery = `
        SELECT c.id, c.nombre, c.tipo
        FROM canchas c
        JOIN complejos comp ON c.complejo_id = comp.id
        ORDER BY comp.id
        LIMIT 1
    `;
    
    const canchas = await db.query(canchasQuery);
    
    if (canchas.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron canchas para crear el bloqueo temporal'
      });
    }
    
    // Verificar disponibilidad de cada cancha antes de crear bloqueos
    const bloqueosCreados = [];
    const expiraEn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos
    
    for (const cancha of canchas) {
      // Verificar si la cancha está realmente disponible
      const disponibilidadQuery = `
          SELECT COUNT(*) as count
          FROM reservas
          WHERE cancha_id = $1 
          AND fecha = $2 
          AND (
              (hora_inicio < $4 AND hora_fin > $3)
          )
          AND estado != 'cancelada'
      `;
      
      const disponibilidadResult = await db.query(disponibilidadQuery, [
          cancha.id, fecha, hora_inicio, hora_fin
      ]);
      
      const estaOcupada = parseInt((disponibilidadResult || [])[0]?.count || 0) > 0;
      
      if (!estaOcupada) {
        // Solo crear bloqueo si la cancha está disponible
        const bloqueoId = `ADMIN_${Date.now()}_${cancha.id}`;
        
        const datosCliente = JSON.stringify({
            nombre_cliente: `Admin ${user.email}`,
            tipo_bloqueo: 'administrativo',
            admin_id: user.id,
            admin_email: user.email
        });
        
        const dbInfo = db.getDatabaseInfo();
        const timestampFunction = dbInfo.type === 'PostgreSQL' ? 'NOW()' : "datetime('now')";
        await db.run(
            `INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${timestampFunction})`,
            [bloqueoId, cancha.id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), datosCliente]
        );
        
        bloqueosCreados.push({
            id: bloqueoId,
            cancha_id: cancha.id,
            cancha_nombre: cancha.nombre,
            cancha_tipo: cancha.tipo
        });
        
        console.log(`✅ Bloqueo temporal creado para cancha disponible: ${cancha.nombre}`);
      } else {
        console.log(`⚠️ Cancha ${cancha.nombre} ya está ocupada, no se creará bloqueo temporal`);
      }
    }
    
    console.log(`✅ Bloqueos temporales administrativos creados: ${bloqueosCreados.length}`);
    
    res.json({
        success: true,
        bloqueoId: bloqueosCreados[0]?.id,
        bloqueos: bloqueosCreados,
        expiraEn: expiraEn.toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en simulación de create-blocking:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor al crear bloqueo temporal',
        details: error.message,
        stack: error.stack
    });
  }
});

// Endpoint para agregar columnas faltantes en PostgreSQL
app.post('/debug/fix-database-columns', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    if (dbInfo.type !== 'PostgreSQL') {
      return res.json({
        success: false,
        message: 'Este endpoint solo funciona con PostgreSQL',
        databaseType: dbInfo.type
      });
    }
    
    console.log('🔧 Agregando columnas faltantes en PostgreSQL...');
    
    // Columnas que necesitamos agregar
    const columnsToAdd = [
      {
        name: 'tipo_reserva',
        definition: 'VARCHAR(50) DEFAULT \'directa\''
      },
      {
        name: 'creada_por_admin',
        definition: 'BOOLEAN DEFAULT false'
      },
      {
        name: 'metodo_contacto',
        definition: 'VARCHAR(50) DEFAULT \'web\''
      },
      {
        name: 'comision_aplicada',
        definition: 'INTEGER DEFAULT 0'
      },
      {
        name: 'admin_id',
        definition: 'INTEGER'
      }
    ];
    
    const results = [];
    
    // Verificar columnas existentes
    const existingColumns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservas'
    `);
    
    const existingColumnNames = existingColumns.map(row => row.column_name);
    
    // Agregar columnas faltantes
    for (const column of columnsToAdd) {
      if (existingColumnNames.includes(column.name)) {
        results.push({
          column: column.name,
          status: 'already_exists',
          message: 'Columna ya existe'
        });
      } else {
        try {
          await db.query(`ALTER TABLE reservas ADD COLUMN ${column.name} ${column.definition}`);
          results.push({
            column: column.name,
            status: 'added',
            message: 'Columna agregada exitosamente'
          });
        } catch (error) {
          results.push({
            column: column.name,
            status: 'error',
            message: error.message
          });
        }
      }
    }
    
    // Probar consulta del calendario
    let testResult = null;
    try {
      const testQuery = `
        SELECT 
          r.id,
          r.codigo_reserva as codigo,
          r.fecha,
          r.hora_inicio,
          r.hora_fin,
          r.precio_total,
          r.estado,
          r.tipo_reserva,
          r.creada_por_admin,
          r.metodo_contacto,
          r.comision_aplicada,
          r.nombre_cliente,
          r.email_cliente,
          r.telefono_cliente
        FROM reservas r
        LIMIT 1
      `;
      
      testResult = await db.query(testQuery);
    } catch (error) {
      testResult = { error: error.message, code: error.code };
    }
    
    res.json({
      success: true,
      message: 'Columnas procesadas',
      results: results,
      testQuery: testResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Test de persistencia - Sun Sep  7 02:06:46 -03 2025
// Test de persistencia - Sun Sep  7 02:21:56 -03 2025
// Forzar creación de PostgreSQL - Sun Sep  7 02:25:06 -03 2025
// Test de persistencia final - Sun Sep  7 03:54:09 -03 2025

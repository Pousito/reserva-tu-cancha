const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Importar sistema de monitoreo
const metricsCollector = require('./src/utils/metrics-collector');
const alertSystem = require('./src/utils/alert-system');
const monitoringRoutes = require('./src/routes/monitoring');
const {
  apiMetricsMiddleware,
  databaseMetricsMiddleware,
  authMetricsMiddleware,
  pageMetricsMiddleware,
  errorMetricsMiddleware,
  userMetricsMiddleware,
  metricsCleanupMiddleware
} = require('./src/middleware/metrics-middleware');

// Importar middleware de seguridad
const { securityMiddleware } = require('./src/middleware/advanced-security');
const securityHeaders = require('./src/middleware/security-headers');
const { validateReservationInput, validatePaymentInput } = require('./src/utils/validation');
// const compression = require('compression'); // Temporalmente deshabilitado para deploy
const { 
  requireRolePermission, 
  requireFinancialAccess, 
  requireComplexManagement, 
  requireCourtManagement, 
  requireReportsAccess 
} = require('./middleware/role-permissions');
// PostgreSQL Database System - Unified for Development and Production
const DatabaseManager = require('./src/config/database');
const AtomicReservationManager = require('./src/utils/atomic-reservation');
const { insertEmergencyReservations } = require('./scripts/emergency/insert-reservations');
const EmailService = require('./src/services/emailService');
const { 
  getCurrentDateInChile, 
  createDateTimeInChile, 
  isFutureDateTime,
  getTimezoneInfo 
} = require('./src/utils/dateUtils');

// Sistema de Logging Avanzado (temporalmente deshabilitado para deploy)
// const logger = require('./src/utils/advanced-logger');
// const requestTracking = require('./src/middleware/request-tracking');
// const DatabaseLogger = require('./src/utils/database-logger');
// const alertSystem = require('./src/utils/alert-system');
// Configuración de entorno - desarrollo vs producción
if (process.env.NODE_ENV === 'production') {
  // En producción, usar variables de entorno de Render
  require('dotenv').config();
} else {
  // En desarrollo, usar archivo .env
  require('dotenv').config();
}

// Función para generar código de reserva único y corto
function generarCodigoReserva() {
  // Generar código de 6 caracteres alfanuméricos
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configurado para desarrollo y producción
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🌐 CORS check - Origin:', origin, 'NODE_ENV:', process.env.NODE_ENV);
    
    // En desarrollo, permitir cualquier origen
    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    
    // En producción, verificar orígenes permitidos
    const allowedOrigins = [
      'https://www.reservatuscanchas.cl',
      'https://reservatuscanchas.cl',
      'https://reserva-tu-cancha.onrender.com',
      'https://reservatuscanchas.onrender.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      console.log('✅ CORS permitido para:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS rechazado para:', origin, 'Permitidos:', allowedOrigins);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));

// ===== RUTAS DE MONITOREO (deben ir al principio) =====
app.use('/api/monitoring', monitoringRoutes);

// Dashboard de monitoreo
app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/monitoring-dashboard.html'));
});

// Configurar sistema de alertas
alertSystem.setupAlerts();

// Conectar eventos de métricas con alertas
metricsCollector.on('slowApiCall', (data) => {
  alertSystem.processEvent('slowApi', data);
});

metricsCollector.on('slowDatabaseQuery', (data) => {
  alertSystem.processEvent('slowDatabaseQuery', data);
});

metricsCollector.on('error', (data) => {
  alertSystem.processEvent('error', data);
});

metricsCollector.on('highMemoryUsage', (data) => {
  alertSystem.processEvent('highMemoryUsage', data);
});

metricsCollector.on('reservationMetric', (data) => {
  alertSystem.processEvent('reservation', data);
});

metricsCollector.on('paymentMetric', (data) => {
  alertSystem.processEvent('payment', data);
});

// Middleware de métricas
app.use(apiMetricsMiddleware);
app.use(authMetricsMiddleware);
app.use(pageMetricsMiddleware);
app.use(userMetricsMiddleware);
app.use(metricsCleanupMiddleware);

// Middleware de métricas de base de datos (se aplicará después de la conexión DB)

// Middleware de Seguridad Avanzado
const securityLimits = securityMiddleware(app);
app.use(securityHeaders);

// Middleware de Compresión (temporalmente deshabilitado)
// app.use(compression({
//   level: 6,
//   threshold: 1024,
//   filter: (req, res) => {
//     if (req.headers['x-no-compression']) {
//       return false;
//     }
//     return compression.filter(req, res);
//   }
// }));

// Middleware de Logging Avanzado (temporalmente deshabilitado)
// app.use(requestTracking);

// Headers de seguridad para Safari y Transbank
app.use((req, res, next) => {
  // Headers específicos para Safari y Transbank
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Headers adicionales para compatibilidad móvil
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy más permisivo para la página principal
  res.setHeader('Content-Security-Policy', 
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; " +
    "style-src 'self' 'unsafe-inline' https: http:; " +
    "img-src 'self' data: https: http:; " +
    "font-src 'self' data: https: http:; " +
    "connect-src 'self' https: http:; " +
    "frame-src 'self' https: http:; " +
    "form-action 'self' https: http:;"
  );
  
  // P3P Policy para cookies (requerido por algunos navegadores)
  res.setHeader('P3P', 'CP="IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT"');
  
  next();
});

app.use(express.json());
// NOTA: express.static se mueve después de las rutas de API para evitar conflictos

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

// Sistema de base de datos PostgreSQL unificado - INICIALIZAR DESPUÉS DE CARGAR ENV
let db;

// Sistema de emails
const emailService = new EmailService();

// Sistema de reportes
const ReportService = require('./src/services/reportService');
let reportService;

// Función helper para obtener la función de fecha actual según el tipo de BD
const getCurrentTimestampFunction = () => {
  if (!db) return 'NOW()'; // Default a PostgreSQL
  const dbInfo = db.getDatabaseInfo();
  return dbInfo.type === 'PostgreSQL' ? 'NOW()' : "datetime('now')";
};

// Inicializar base de datos
async function initializeDatabase() {
  try {
    // Inicializar DatabaseManager después de cargar las variables de entorno
    db = new DatabaseManager();
    await db.connect();
    
    
    // Inicializar sistema de reservas atómicas
    const atomicManager = new AtomicReservationManager(db);
    global.atomicReservationManager = atomicManager;
    console.log('🔒 Sistema de reservas atómicas inicializado');
    
    // Inicializar sistema de reportes
    reportService = new ReportService(db);
    console.log('📊 Sistema de reportes inicializado');
    
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
        { nombre: 'Complejo En Desarrollo', ciudad: 'Los Ángeles', direccion: 'Monte Perdido 1685', telefono: '+56987654321', email: 'reservas@complejodesarrollo.cl' },
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
        { nombre: 'Cancha Techada 1', tipo: 'futbol', precio: 50, complejo: 'Complejo En Desarrollo' },
        { nombre: 'Cancha Techada 2', tipo: 'futbol', precio: 50, complejo: 'Complejo En Desarrollo' },
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
        { email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Dueño Complejo En Desarrollo', rol: 'owner' },
        { email: 'naxiin_320@hotmail.com', password: 'gunnen2024', nombre: 'Manager Fundación Gunnen', rol: 'manager' },
        { email: 'ignacio.araya.lillito@hotmail.com', password: 'gunnen2024', nombre: 'Dueño Fundación Gunnen', rol: 'owner' }
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
initializeDatabase().then(() => {
  // Aplicar middleware de métricas de base de datos después de la conexión
  app.use(databaseMetricsMiddleware(db));
});

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

// Endpoint para diagnosticar conexión SMTP desde Render
app.get('/api/debug/smtp-connection', async (req, res) => {
  const nodemailer = require('nodemailer');
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: []
  };
  
  // Test 1: Con puerto 587 y contraseña NUEVA
  try {
    const transporter587 = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      auth: {
        user: 'reservas@reservatuscanchas.cl',
        pass: 'L660mKFmcDBk'  // Contraseña que funcionaba antes
      }
    });
    
    const startTime = Date.now();
    await Promise.race([
      transporter587.verify(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 30s')), 30000))
    ]);
    const elapsed = Date.now() - startTime;
    
    diagnostics.tests.push({
      port: 587,
      status: 'SUCCESS',
      time: elapsed + 'ms'
    });
  } catch (error) {
    diagnostics.tests.push({
      port: 587,
      status: 'FAILED',
      error: error.message,
      code: error.code
    });
  }
  
  // Test 2: Con puerto 465 y contraseña NUEVA
  try {
    const transporter465 = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: 'reservas@reservatuscanchas.cl',
        pass: 'L660mKFmcDBk'  // Contraseña que funcionaba antes
      }
    });
    
    const startTime = Date.now();
    await Promise.race([
      transporter465.verify(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 30s')), 30000))
    ]);
    const elapsed = Date.now() - startTime;
    
    diagnostics.tests.push({
      port: 465,
      status: 'SUCCESS',
      time: elapsed + 'ms'
    });
  } catch (error) {
    diagnostics.tests.push({
      port: 465,
      status: 'FAILED',
      error: error.message,
      code: error.code
    });
  }
  
  res.json(diagnostics);
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

// ===== RUTAS DE DESCUENTOS =====
const { router: discountRoutes, setDatabase: setDiscountDatabase } = require('./src/routes/discounts');
setDiscountDatabase(db); // Pasar la instancia de la base de datos
app.use('/api/discounts', discountRoutes);

// ===== RUTAS DE GASTOS E INGRESOS =====
const { router: gastosRoutes, setDatabase: setGastosDatabase } = require('./src/routes/gastos');
setGastosDatabase(db); // Pasar la instancia de la base de datos
app.use('/api/gastos', gastosRoutes);

// ===== RUTAS DE PROMOCIONES Y PRECIOS DINÁMICOS =====
const { router: promocionesRoutes, setDatabase: setPromocionesDatabase } = require('./src/routes/promociones');
setPromocionesDatabase(db); // Pasar la instancia de la base de datos
// Debug middleware para promociones
app.use('/api/promociones', (req, res, next) => {
    console.log(`🎯 Petición a /api/promociones - Método: ${req.method}, Path: ${req.path}`);
    next();
});
app.use('/api/promociones', promocionesRoutes);

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

        // Buscar el bloqueo temporal (intentar por id primero, luego por session_id)
        let bloqueoData = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE id = $1',
            [reservationCode]
        );
        
        // Si no se encuentra por id, buscar por session_id
        if (!bloqueoData) {
            console.log('🔍 Bloqueo no encontrado por id, buscando por session_id...');
            bloqueoData = await db.get(
                'SELECT * FROM bloqueos_temporales WHERE session_id = $1',
                [reservationCode]
            );
        }

        if (!bloqueoData) {
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado'
            });
        }

        console.log('📊 Bloqueo temporal encontrado:', bloqueoData.id);

        const datosCliente = JSON.parse(bloqueoData.datos_cliente);

        // Limpiar datos antes de insertar
        const datosLimpios = {
            nombre_cliente: datosCliente.nombre_cliente || 'Sin nombre',
            email_cliente: datosCliente.email_cliente || 'sin@email.com',
            telefono_cliente: datosCliente.telefono_cliente || null,
            rut_cliente: datosCliente.rut_cliente ? datosCliente.rut_cliente.replace(/[^0-9kK-]/g, '') : 'No proporcionado',
            precio_total: parseInt(datosCliente.precio_total) || 0,
            porcentaje_pagado: datosCliente.porcentaje_pagado || 100
        };

        // Crear la reserva real
        // Generar código de reserva único solo cuando se confirma el pago
        const codigoReserva = generarCodigoReserva();
        
        console.log('💾 Insertando reserva en BD (bloqueo temporal):', {
            codigo: codigoReserva,
            nombre: datosLimpios.nombre_cliente,
            email: datosLimpios.email_cliente,
            telefono: datosLimpios.telefono_cliente,
            rut: datosLimpios.rut_cliente,
            precio: datosLimpios.precio_total
        });
        
        // Calcular comisión para reserva web (3.5%) - Solo para registro, no se suma al precio
        const comisionWeb = Math.round(datosLimpios.precio_total * 0.035);
        
        const reservaId = await db.run(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente,
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                codigo_reserva, estado, estado_pago, fecha_creacion, porcentaje_pagado,
                tipo_reserva, comision_aplicada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
            bloqueoData.cancha_id,
            datosLimpios.nombre_cliente,
            datosLimpios.email_cliente,
            datosLimpios.telefono_cliente,
            datosLimpios.rut_cliente,
            bloqueoData.fecha,
            bloqueoData.hora_inicio,
            bloqueoData.hora_fin,
            datosLimpios.precio_total,
            codigoReserva,
            'confirmada',
            'pagado',
            new Date().toISOString(),
            datosLimpios.porcentaje_pagado,
            'directa',
            comisionWeb
        ]);

        console.log('✅ Reserva creada con ID:', reservaId);

        // Eliminar el bloqueo temporal
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueoData.id]);
        console.log('🗑️ Bloqueo temporal eliminado');

        // Obtener información del complejo y cancha para los emails
        const canchaInfo = await db.get(`
            SELECT c.nombre as cancha_nombre, co.nombre as complejo_nombre 
            FROM canchas c 
            JOIN complejos co ON c.complejo_id = co.id 
            WHERE c.id = $1
        `, [bloqueoData.cancha_id]);

        // Preparar datos para el email
        const emailData = {
            codigo_reserva: codigoReserva,
            nombre_cliente: datosLimpios.nombre_cliente,
            email_cliente: datosLimpios.email_cliente,
            fecha: bloqueoData.fecha,
            hora_inicio: bloqueoData.hora_inicio,
            hora_fin: bloqueoData.hora_fin,
            precio_total: datosLimpios.precio_total,
            porcentaje_pagado: datosLimpios.porcentaje_pagado,
            complejo: canchaInfo?.complejo_nombre || 'Complejo Deportivo',
            cancha: canchaInfo?.cancha_nombre || 'Cancha'
        };

        // Enviar emails con timeout de 20 segundos (aumentado desde 10s por latencia de red en producción)
        let emailSent = false;
        try {
            console.log('📧 Enviando emails...');
            console.log('📧 Destinatario:', emailData.email_cliente);
            const emailService = new EmailService();
            
            // Timeout de 20 segundos (local tarda ~9s, producción puede tardar más por latencia)
            const emailPromise = emailService.sendConfirmationEmails(emailData);
            const timeoutPromise = new Promise((resolve) => 
                setTimeout(() => resolve({ timeout: true }), 20000)
            );
            
            const emailResults = await Promise.race([emailPromise, timeoutPromise]);
            
            if (emailResults.timeout) {
                console.log('⚠️ Timeout de emails después de 20s');
                emailSent = 'timeout';
            } else {
                emailSent = emailResults.cliente || emailResults.simulated || false;
                console.log('📧 Resultado emails:', emailSent ? '✅ Enviados' : '❌ Error');
                if (!emailSent && emailResults.error) {
                    console.error('📧 Error detallado:', emailResults.error);
                }
            }
        } catch (emailError) {
            console.error('❌ Error enviando emails:', emailError.message);
            console.error('📧 Stack:', emailError.stack);
            emailSent = false;
        }

        // Responder al cliente
        res.json({
            success: true,
            message: 'Pago simulado exitosamente',
            reserva_id: reservaId,
            codigo_reserva: codigoReserva,
            email_sent: emailSent
        });

    } catch (error) {
        console.error('❌ Error simulando pago:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para obtener datos de una reserva específica
app.get('/api/reservas/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        
        if (!codigo) {
            return res.status(400).json({
                success: false,
                error: 'Código de reserva requerido'
            });
        }

        console.log('🔍 Buscando reserva con código:', codigo);

        // Buscar la reserva con información del complejo y cancha
        const reserva = await db.get(`
            SELECT r.id, r.cancha_id, r.usuario_id, r.nombre_cliente, r.email_cliente, 
                   r.telefono_cliente, r.rut_cliente, 
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.estado, r.estado_pago, 
                   r.precio_total, r.porcentaje_pagado, r.created_at, r.fecha_creacion, r.codigo_reserva,
                   c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = $1
        `, [codigo]);

        if (!reserva) {
            return res.status(404).json({
                success: false,
                error: 'Reserva no encontrada'
            });
        }

        console.log('✅ Reserva encontrada:', {
            codigo: reserva.codigo_reserva,
            cliente: reserva.nombre_cliente,
            estado: reserva.estado,
            fecha: reserva.fecha
        });

        res.json({
            success: true,
            reserva: reserva
        });

    } catch (error) {
        console.error('❌ Error obteniendo reserva:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Endpoint para reenviar email de confirmación manualmente
app.post('/api/reservas/:codigo/reenviar-email', async (req, res) => {
    try {
        const { codigo } = req.params;
        
        console.log('📧 Reenviando email para reserva:', codigo);

        // Obtener información completa de la reserva
        const reserva = await db.get(`
            SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = $1
        `, [codigo]);

        if (!reserva) {
            return res.status(404).json({
                success: false,
                error: 'Reserva no encontrada'
            });
        }

        // Preparar datos para el email
        const emailData = {
            codigo_reserva: reserva.codigo_reserva,
            nombre_cliente: reserva.nombre_cliente,
            email_cliente: reserva.email_cliente,
            fecha: reserva.fecha,
            hora_inicio: reserva.hora_inicio,
            hora_fin: reserva.hora_fin,
            precio_total: reserva.precio_total,
            complejo: reserva.complejo_nombre || 'Complejo Deportivo',
            cancha: reserva.cancha_nombre || 'Cancha'
        };

        console.log('📧 Enviando email a:', emailData.email_cliente);
        console.log('📋 Datos del email:', emailData);

        // Importar y usar el servicio de email
        const EmailService = require('./src/services/emailService');
        const emailService = new EmailService();
        
        // Enviar emails (esto devolverá el error si hay uno)
        const emailResults = await emailService.sendConfirmationEmails(emailData);
        
        console.log('📧 Resultado del envío:', emailResults);

        if (emailResults.cliente || emailResults.simulated) {
            res.json({
                success: true,
                message: 'Email reenviado exitosamente',
                codigo_reserva: codigo,
                email_sent: emailResults.cliente ? 'real' : 'simulated',
                results: emailResults
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Error enviando email',
                details: emailResults.error || 'Error desconocido',
                codigo_reserva: codigo
            });
        }

    } catch (error) {
        console.error('❌ Error reenviando email:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Endpoint para generar y descargar comprobante PDF
app.get('/api/reservas/:codigo/pdf', async (req, res) => {
    try {
        const { codigo } = req.params;
        if (!codigo) {
            return res.status(400).json({ success: false, error: 'Código de reserva requerido' });
        }

        console.log('📄 Generando PDF para reserva:', codigo);
        
        // Obtener datos de la reserva
        const reserva = await db.get(`
            SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = $1
        `, [codigo]);

        if (!reserva) {
            return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
        }

        // Generar PDF
        const PDFService = require('./src/services/pdfService');
        const pdfBuffer = PDFService.generateReservationReceipt(reserva);

        // Configurar headers para descarga
        const filename = `comprobante-reserva-${codigo}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Enviar PDF
        res.send(pdfBuffer);

        console.log('✅ PDF generado y enviado exitosamente para reserva:', codigo);

    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error generando comprobante PDF' 
        });
    }
});

// Endpoint de diagnóstico para Transbank
app.get('/api/transbank-diagnostic', (req, res) => {
    try {
        const diagnostic = {
            environment: process.env.NODE_ENV,
            transbank: {
                environment: process.env.TRANSBANK_ENVIRONMENT,
                commerceCode: process.env.TRANSBANK_COMMERCE_CODE ? 'Configurado' : 'No configurado',
                apiKey: process.env.TRANSBANK_API_KEY ? 'Configurado' : 'No configurado',
                returnUrl: process.env.TRANSBANK_RETURN_URL,
                finalUrl: process.env.TRANSBANK_FINAL_URL
            },
            cors: {
                origin: process.env.CORS_ORIGIN
            },
            database: {
                url: process.env.DATABASE_URL ? 'Configurado' : 'No configurado',
                type: db.getDatabaseInfo ? db.getDatabaseInfo().type : 'Desconocido'
            },
            issues: []
        };

        // Verificar problemas
        if (process.env.TRANSBANK_RETURN_URL && process.env.TRANSBANK_RETURN_URL.startsWith('@')) {
            diagnostic.issues.push('TRANSBANK_RETURN_URL tiene @ al inicio');
        }
        
        if (process.env.TRANSBANK_RETURN_URL && !process.env.TRANSBANK_RETURN_URL.startsWith('https://')) {
            diagnostic.issues.push('TRANSBANK_RETURN_URL no usa HTTPS');
        }
        
        if (process.env.TRANSBANK_FINAL_URL && !process.env.TRANSBANK_FINAL_URL.startsWith('https://')) {
            diagnostic.issues.push('TRANSBANK_FINAL_URL no usa HTTPS');
        }
        
        if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes('onrender.com')) {
            diagnostic.issues.push('CORS_ORIGIN apunta a onrender.com en lugar del dominio real');
        }

        res.json({
            success: true,
            diagnostic,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint separado para enviar emails de confirmación
app.post('/api/send-confirmation-email', async (req, res) => {
    try {
        console.log('📧 ENDPOINT DE EMAIL RECIBIDO');
        console.log('📋 Datos recibidos:', req.body);
        
        const emailData = req.body;
        
        if (!emailData.codigo_reserva) {
            return res.status(400).json({
                success: false,
                error: 'Código de reserva requerido'
            });
        }
        
        const EmailService = require('./src/services/emailService');
        const emailService = new EmailService();
        
        console.log('📧 Enviando emails para reserva:', emailData.codigo_reserva);
        const emailResults = await emailService.sendConfirmationEmails(emailData);
        
        console.log('✅ Emails enviados exitosamente:', emailResults);
        
        res.json({
            success: true,
            message: 'Emails enviados exitosamente',
            results: emailResults
        });
        
    } catch (error) {
        console.error('❌ Error en endpoint de email:', error);
        res.status(500).json({
            success: false,
            error: 'Error enviando emails: ' + error.message
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
            'DELETE FROM bloqueos_temporales WHERE id = $1',
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

// Endpoint para crear bloqueo temporal y proceder al pago
app.post('/api/reservas/bloquear-y-pagar', async (req, res) => {
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
    if (!cancha_id || !fecha || !hora_inicio || !hora_fin || !nombre_cliente || !email_cliente || !session_id || precio_total === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos',
        campos_faltantes: ['cancha_id', 'fecha', 'hora_inicio', 'hora_fin', 'nombre_cliente', 'email_cliente', 'session_id', 'precio_total'].filter(field => !req.body[field] && req.body[field] !== 0),
        datos_recibidos: req.body
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
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigoReserva = '';
    for (let i = 0; i < 6; i++) {
      codigoReserva += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    
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
    
    const bloqueoId = `BLOCK_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    await db.query(
      `INSERT INTO bloqueos_temporales 
       (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, codigo_reserva)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        bloqueoId,
        cancha_id,
        fecha,
        hora_inicio,
        hora_fin,
        session_id,
        expiraEn.toISOString(),
        JSON.stringify(datosCliente),
        codigoReserva
      ]
    );
    
    console.log('✅ Bloqueo temporal creado:', bloqueoId);
    
    res.json({
      success: true,
      bloqueo_id: bloqueoId,
      codigo_reserva: codigoReserva,
      expira_en: expiraEn.toISOString(),
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
      'SELECT id FROM reservas WHERE codigo_reserva = $1 AND estado != $2',
      [codigo, 'cancelada']
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

// Configurar limpieza automática cada 2 minutos
setInterval(async () => {
  try {
    await limpiarBloqueosExpirados();
  } catch (error) {
    console.error('❌ Error en limpieza automática programada:', error);
  }
}, 2 * 60 * 1000); // 2 minutos

console.log('⏰ Limpieza automática de bloqueos temporales configurada cada 2 minutos');


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
    
    // Consulta PostgreSQL unificada
    const disponibilidad = await db.query(`
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
        AND fecha::date = $${canchaIds.length + 1}::date 
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
    
    // Reservas por día (últimos 7 días) - PostgreSQL unificado
    const reservasPorDia = await db.query(`
      SELECT TO_CHAR(r.fecha, 'YYYY-MM-DD') as dia, COUNT(*) as cantidad
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      WHERE r.fecha >= CURRENT_DATE - INTERVAL '7 days'
      AND r.estado != 'cancelada'
      ${userRole === 'super_admin' ? '' : 'AND c.complejo_id = $1'}
      GROUP BY r.fecha::date
      ORDER BY r.fecha::date
    `, userRole === 'super_admin' ? [] : [complexFilter]);
    
    const stats = {
      totalReservas: totalReservas.count,
      totalCanchas: totalCanchas.count,
      totalComplejos: totalComplejos.count,
      ingresosTotales: parseInt(ingresosTotales.total || 0),
      reservasPorDia: reservasPorDia.map(r => ({
        dia: r.dia,  // Ya viene como string YYYY-MM-DD sin zona horaria
        cantidad: parseInt(r.cantidad)
      })),
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
      SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
             r.telefono_cliente, r.rut_cliente,
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
             r.estado, r.estado_pago, r.created_at, r.fecha_creacion,
             c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
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
      SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
             r.telefono_cliente, r.rut_cliente,
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
             r.estado, r.estado_pago, r.created_at, r.fecha_creacion,
             c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.fecha::date = CURRENT_DATE
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

// Endpoint específico para probar email con fecha 2025-09-30
app.post('/api/debug/test-email-30sep', async (req, res) => {
  try {
    console.log('📧 Probando email con fecha 2025-09-30...');
    
    const emailService = new EmailService();
    
    const testData = {
      codigo_reserva: 'TEST30',
      nombre_cliente: 'Ignacio Araya',
      email_cliente: 'ignacio.araya.lillo@gmail.com',
      complejo: 'Complejo En Desarrollo',
      cancha: 'Cancha Techada 1',
      fecha: '2025-09-30',
      hora_inicio: '21:00',
      hora_fin: '22:00',
      precio_total: 28000
    };
    
    const result = await emailService.sendConfirmationEmails(testData);
    
    res.json({
      success: true,
      message: 'Email de prueba con fecha 2025-09-30 enviado',
      testData: testData,
      result: result
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint temporal para debuggear zona horaria
app.get('/api/debug/timezone', async (req, res) => {
  try {
    const { formatDateForChile } = require('./src/utils/dateUtils');
    
    const fecha = '2025-09-30';
    const fechaFormateada = formatDateForChile(fecha, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    res.json({
      fecha_original: fecha,
      fecha_formateada: fechaFormateada,
      zona_horaria_sistema: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fecha_actual: new Date().toISOString(),
      fecha_actual_chile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
      test_date_parsing: new Date('2025-09-30').toLocaleDateString('es-CL', { 
        timeZone: 'America/Santiago',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint temporal para enviar email de prueba con fecha correcta
app.post('/api/debug/send-test-email', async (req, res) => {
  try {
    const { codigo_reserva } = req.body;
    
    if (!codigo_reserva) {
      return res.status(400).json({ error: 'Código de reserva requerido' });
    }
    
    // Obtener datos de la reserva
    const reserva = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.codigo_reserva = $1
    `, [codigo_reserva]);
    
    if (reserva.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    const reservaData = reserva[0];
    
    // Formatear fecha correctamente usando mapeo directo
    let fecha = reservaData.fecha;
    console.log('🔍 Debug fecha:', { fecha, tipo: typeof fecha });
    
    // Convertir fecha a string si es necesario
    if (typeof fecha === 'object' && fecha instanceof Date) {
      fecha = fecha.toISOString().split('T')[0]; // Convertir a YYYY-MM-DD
    } else if (typeof fecha === 'string' && fecha.includes('T')) {
      fecha = fecha.split('T')[0]; // Extraer solo la parte de fecha
    }
    
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Fecha no tiene formato válido', fecha: fecha, tipo: typeof fecha });
    }
    
    const [year, month, day] = fecha.split('-').map(Number);
    const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fechaObj = new Date(year, month - 1, day);
    const diaSemana = diasSemana[fechaObj.getDay()];
    const nombreMes = meses[month - 1];
    const fechaFormateada = `${diaSemana}, ${day} de ${nombreMes} de ${year}`;
    
    // Enviar email con fecha correcta
    const EmailService = require('./src/services/emailService');
    const emailService = new EmailService();
    
    const emailData = {
      codigo_reserva: reservaData.codigo_reserva,
      nombre_cliente: reservaData.nombre_cliente,
      email_cliente: reservaData.email_cliente,
      complejo: reservaData.complejo_nombre,
      cancha: reservaData.cancha_nombre,
      fecha: fechaFormateada, // Usar fecha ya formateada correctamente
      hora_inicio: reservaData.hora_inicio,
      hora_fin: reservaData.hora_fin,
      precio_total: reservaData.precio_total
    };
    
    const result = await emailService.sendReservationConfirmation(emailData);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado con fecha correcta',
      fechaFormateada: fechaFormateada,
      emailResult: result
    });
    
  } catch (error) {
    console.error('Error enviando email de prueba:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de debug temporal para verificar correcciones de fechas
app.get('/api/debug/date-fix', async (req, res) => {
  try {
    const testDate = '2025-09-26';
    
    // Simular el formateo que se hace en el email (CORREGIDO v3)
    let fechaFormateada;
    if (typeof testDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(testDate)) {
      const [year, month, day] = testDate.split('-').map(Number);
      
      // Mapeo directo para evitar problemas de zona horaria
      const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      
      const fechaObj = new Date(year, month - 1, day);
      const diaSemana = diasSemana[fechaObj.getDay()];
      const nombreMes = meses[month - 1];
      
      fechaFormateada = `${diaSemana}, ${day} de ${nombreMes} de ${year}`;
    } else {
      fechaFormateada = testDate;
    }
    
    res.json({
      version: 'CORRECCION_FECHAS_v3_DEFINITIVA',
      testDate: testDate,
      fechaFormateada: fechaFormateada,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      commit: 'f4a569b'
    });
  } catch (error) {
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
    
    // DEBUG: Verificar precios de las primeras 3 reservas
    if (reservas && reservas.length > 0) {
        console.log('🔍 DEBUG SERVER - Primeras 3 reservas:');
        reservas.slice(0, 3).forEach((r, i) => {
            console.log(`  ${i+1}. ${r.codigo_reserva}: precio_total=${r.precio_total} (tipo: ${typeof r.precio_total})`);
        });
    }
    
    // CORRECCIÓN: Procesar fechas para asegurar zona horaria correcta
    const reservasProcesadas = reservas.map(reserva => {
      // Asegurar que la fecha se maneje correctamente en zona horaria de Chile
      if (reserva.fecha) {
        // Si la fecha viene como string, convertirla a formato YYYY-MM-DD
        if (typeof reserva.fecha === 'string') {
          // Si ya está en formato YYYY-MM-DD, mantenerla
          if (/^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha)) {
            // Fecha ya está en formato correcto
          } else {
            // Convertir fecha a formato YYYY-MM-DD usando métodos UTC para evitar problemas de zona horaria
            const fechaObj = new Date(reserva.fecha);
            if (!isNaN(fechaObj.getTime())) {
              const year = fechaObj.getUTCFullYear();
              const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
              const day = String(fechaObj.getUTCDate()).padStart(2, '0');
              reserva.fecha = `${year}-${month}-${day}`;
            }
          }
        }
      }
      return reserva;
    });
    
    // Debug: Verificar reservas específicas (comentado para producción)
    // const reservaK07GYE = reservasProcesadas.find(r => r.codigo_reserva === 'K07GYE');
    // const reserva6BNY23 = reservasProcesadas.find(r => r.codigo_reserva === '6BNY23');
    
    // if (reservaK07GYE) {
    //     console.log('🔍 Debug - Reserva K07GYE encontrada:', {
    //         codigo: reservaK07GYE.codigo_reserva,
    //         nombre: reservaK07GYE.nombre_cliente,
    //         email: reservaK07GYE.email_cliente,
    //         telefono: reservaK07GYE.telefono_cliente,
    //         tieneTelefono: !!reservaK07GYE.telefono_cliente,
    //         telefonoTipo: typeof reservaK07GYE.telefono_cliente,
    //         fecha: reservaK07GYE.fecha,
    //         fechaTipo: typeof reservaK07GYE.fecha
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
    //         telefonoTipo: typeof reserva6BNY23.telefono_cliente,
    //         fecha: reserva6BNY23.fecha,
    //         fechaTipo: typeof reserva6BNY23.fecha
    //     });
    // } else {
    //     console.log('❌ Reserva 6BNY23 no encontrada en los resultados');
    // }
    
    // MODIFICACIÓN: Los managers necesitan ver precios para cobros parciales
    // Solo ocultar precios a usuarios sin permisos de administración
    console.log('🔍 DEBUG - Permisos del usuario:', {
      rol: req.user.rol,
      canViewFinancials: req.userPermissions?.canViewFinancials,
      ocultarPrecios: req.userPermissions && !req.userPermissions.canViewFinancials && req.user.rol !== 'manager'
    });
    
    if (req.userPermissions && !req.userPermissions.canViewFinancials && req.user.rol !== 'manager') {
      console.log('🚫 Ocultando precios para usuario sin permisos');
      const reservasSinPrecios = reservasProcesadas.map(reserva => ({
        ...reserva,
        precio_total: null,
        precio_hora: null
      }));
      res.json(reservasSinPrecios);
    } else {
      console.log('✅ Mostrando precios completos para manager/admin');
      res.json(reservasProcesadas);
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

// Endpoint para crear una nueva cancha (panel de administración)
app.post('/api/admin/canchas', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
  try {
    console.log('⚽ Creando nueva cancha...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    const { nombre, tipo, precio_hora, complejo_id } = req.body;
    
    // Validar datos requeridos
    if (!nombre || !tipo || !precio_hora || !complejo_id) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Verificar que el usuario tenga acceso al complejo
    const userRole = req.user.rol;
    if (userRole !== 'super_admin' && req.user.complejo_id != complejo_id) {
      return res.status(403).json({ error: 'No tienes permisos para crear canchas en este complejo' });
    }
    
    // Crear la cancha
    const result = await db.query(`
      INSERT INTO canchas (nombre, tipo, precio_hora, complejo_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nombre, tipo, precio_hora, complejo_id]);
    
    console.log(`✅ Cancha creada: ${result[0].nombre} (ID: ${result[0].id})`);
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('❌ Error creando cancha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para actualizar una cancha (panel de administración)
app.put('/api/admin/canchas/:id', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, precio_hora } = req.body;
    
    console.log(`⚽ Actualizando cancha ID: ${id}...`);
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    // Validar datos requeridos
    if (!nombre || !tipo || !precio_hora) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Verificar que la cancha existe y el usuario tiene acceso
    const canchaExistente = await db.query('SELECT * FROM canchas WHERE id = $1', [id]);
    if (canchaExistente.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    
    const userRole = req.user.rol;
    // Usar parseInt para asegurar comparación numérica correcta
    const userComplejoId = parseInt(req.user.complejo_id);
    const canchaComplejoId = parseInt(canchaExistente[0].complejo_id);
    
    console.log('🔍 Verificando permisos:');
    console.log('   Usuario complejo_id:', userComplejoId, 'Tipo:', typeof userComplejoId);
    console.log('   Cancha complejo_id:', canchaComplejoId, 'Tipo:', typeof canchaComplejoId);
    console.log('   Comparación:', userComplejoId === canchaComplejoId);
    
    if (userRole !== 'super_admin' && userComplejoId !== canchaComplejoId) {
      return res.status(403).json({ error: 'No tienes permisos para modificar esta cancha' });
    }
    
    // Actualizar la cancha
    const result = await db.query(`
      UPDATE canchas 
      SET nombre = $1, tipo = $2, precio_hora = $3
      WHERE id = $4
      RETURNING *
    `, [nombre, tipo, precio_hora, id]);
    
    console.log(`✅ Cancha actualizada: ${result[0].nombre} (ID: ${result[0].id})`);
    res.json(result[0]);
  } catch (error) {
    console.error('❌ Error actualizando cancha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para eliminar una cancha (panel de administración)
app.delete('/api/admin/canchas/:id', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`⚽ Eliminando cancha ID: ${id}...`);
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    // Verificar que la cancha existe y el usuario tiene acceso
    const canchaExistente = await db.query('SELECT * FROM canchas WHERE id = $1', [id]);
    if (canchaExistente.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    
    const userRole = req.user.rol;
    if (userRole !== 'super_admin' && req.user.complejo_id != canchaExistente[0].complejo_id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta cancha' });
    }
    
    // Verificar si hay reservas asociadas
    const reservas = await db.query('SELECT COUNT(*) as total FROM reservas WHERE cancha_id = $1', [id]);
    const totalReservas = parseInt(reservas[0].total);
    
    if (totalReservas > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar la cancha porque tiene ${totalReservas} reserva(s) asociada(s)` 
      });
    }
    
    // Eliminar la cancha
    await db.query('DELETE FROM canchas WHERE id = $1', [id]);
    
    console.log(`✅ Cancha eliminada: ${canchaExistente[0].nombre} (ID: ${id})`);
    res.json({ message: 'Cancha eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando cancha:', error);
    res.status(500).json({ error: error.message });
  }
});

// Función para registrar movimientos financieros automáticamente
async function registrarMovimientosFinancieros(reservaInfo) {
  try {
    console.log('💰 Registrando movimientos financieros para reserva:', reservaInfo.codigo_reserva);
    
    // Obtener el complejo_id de la reserva
    const canchaInfo = await db.get('SELECT complejo_id FROM canchas WHERE id = $1', [reservaInfo.cancha_id]);
    if (!canchaInfo) {
      throw new Error('No se pudo obtener información de la cancha');
    }
    
    const complejoId = canchaInfo.complejo_id;
    const fechaReserva = new Date(reservaInfo.fecha);
    const montoReserva = parseFloat(reservaInfo.precio_total);
    const comision = parseFloat(reservaInfo.comision_aplicada) || 0;
    
    // Obtener las categorías del complejo
    const categoriaIngreso = await db.get(
      'SELECT id FROM categorias_gastos WHERE complejo_id = $1 AND tipo = $2 AND nombre = $3',
      [complejoId, 'ingreso', 'Reservas Web']
    );
    
    const categoriaEgreso = await db.get(
      'SELECT id FROM categorias_gastos WHERE complejo_id = $1 AND tipo = $2 AND nombre = $3',
      [complejoId, 'gasto', 'Comisión Plataforma']
    );
    
    if (!categoriaIngreso || !categoriaEgreso) {
      console.log('⚠️ Categorías financieras no encontradas para el complejo:', complejoId);
      return;
    }
    
    // Registrar ingreso por la reserva
    await db.run(`
      INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      complejoId,
      categoriaIngreso.id,
      'ingreso',
      montoReserva,
      fechaReserva,
      `Reserva ${reservaInfo.codigo_reserva} - ${reservaInfo.nombre_cliente}`,
      'Web'
    ]);
    
    console.log('✅ Ingreso registrado:', montoReserva);
    
    // Registrar egreso por comisión (solo si hay comisión)
    if (comision > 0) {
      await db.run(`
        INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        complejoId,
        categoriaEgreso.id,
        'gasto',
        comision,
        fechaReserva,
        `Comisión plataforma - Reserva ${reservaInfo.codigo_reserva}`,
        'Automático'
      ]);
      
      console.log('✅ Egreso por comisión registrado:', comision);
    }
    
    console.log('💰 Movimientos financieros registrados exitosamente');
    
  } catch (error) {
    console.error('❌ Error registrando movimientos financieros:', error);
    throw error;
  }
}

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
          // Registrar movimientos financieros automáticamente
          try {
            await registrarMovimientosFinancieros(reservaInfo);
            console.log('💰 Movimientos financieros registrados automáticamente');
          } catch (finError) {
            console.error('❌ Error registrando movimientos financieros:', finError);
            // No fallar la confirmación si hay error en el registro financiero
          }

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
    
    console.log('🔍 Filtros de usuario:', {
      userRole,
      userComplexFilter,
      complexIdFromBody: complexId,
      userEmail: req.user.email
    });
    
    // Construir filtros SQL según el rol
    let whereClause = `WHERE r.fecha::date BETWEEN $1 AND $2`;
    let params = [dateFrom, dateTo];
    
    // Aplicar filtro de complejo según el rol
    if (userRole === 'super_admin') {
      // Super admin puede filtrar por cualquier complejo
      if (complexId) {
        whereClause += ` AND co.id = $3`;
        params.push(complexId);
        console.log('🔍 Super admin filtrando por complejo:', complexId);
      }
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Dueños y administradores solo pueden ver su complejo
      whereClause += ` AND co.id = $3`;
      params.push(userComplexFilter);
      console.log('🔍 Owner/Manager filtrando por complejo:', userComplexFilter);
    }
    
    console.log('🔍 SQL final:', whereClause);
    console.log('🔍 Parámetros:', params);
    
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
    
    // Contar clientes únicos para las métricas generales
    const clientesUnicos = await db.get(`
      SELECT COUNT(DISTINCT r.rut_cliente) as count
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado IN ('confirmada', 'pendiente')
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
        
        if (complejo.complejo === 'Complejo En Desarrollo') {
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
        clientes_unicos: parseInt(clientesUnicos.count),
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

// Endpoint para generar reportes de ingresos en PDF/Excel
app.get('/api/admin/reports/income/:format', authenticateToken, requireComplexAccess, requireRolePermission(['super_admin', 'owner']), async (req, res) => {
  try {
    const { format } = req.params;
    const { dateFrom, dateTo, complexId } = req.query;
    
    console.log('📊 Generando reporte de ingresos...', { format, dateFrom, dateTo, complexId });
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol);
    
    // Validar formato
    if (!['pdf', 'excel'].includes(format)) {
      return res.status(400).json({ error: 'Formato no válido. Use "pdf" o "excel"' });
    }
    
    // Validar fechas
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Fechas de inicio y fin son requeridas' });
    }
    
    // Determinar complejo según el rol
    let targetComplexId = complexId;
    if (req.user.rol === 'owner' || req.user.rol === 'manager') {
      // Owners y managers solo pueden generar reportes de su complejo
      targetComplexId = req.complexFilter;
    }
    
    if (!targetComplexId) {
      return res.status(400).json({ error: 'ID de complejo requerido' });
    }
    
    console.log('🔍 Generando reporte para complejo:', targetComplexId);
    
    // Generar reporte
    console.log('🔄 Iniciando generación de reporte...');
    const reportBuffer = await reportService.generateIncomeReport(targetComplexId, dateFrom, dateTo, format);
    console.log('📊 Reporte generado, tamaño del buffer:', reportBuffer ? reportBuffer.length : 'undefined');
    
    if (!reportBuffer || reportBuffer.length === 0) {
      throw new Error('El reporte generado está vacío');
    }
    
    // Configurar headers según el formato
    const filename = `reporte_ingresos_${dateFrom}_${dateTo}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', reportBuffer.length);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', reportBuffer.length);
    }
    
    console.log('📤 Enviando archivo al cliente...');
    console.log('📤 Tamaño del archivo:', reportBuffer.length, 'bytes');
    console.log('📤 Tipo de archivo:', format);
    
    // Enviar el buffer directamente sin conversión adicional
    res.send(reportBuffer);
    console.log(`✅ Reporte ${format.toUpperCase()} generado exitosamente: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error generando reporte de ingresos:', error);
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
        // Calcular comisión para reserva web (3.5%) - Solo para registro, no se suma al precio
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
      { nombre: 'Cancha Techada 1', tipo: 'futbol', precio: 50, complejo: 'Complejo En Desarrollo' },
      { nombre: 'Cancha Techada 2', tipo: 'futbol', precio: 50, complejo: 'Complejo En Desarrollo' },
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
      { nombre: 'Complejo En Desarrollo', ciudad: 'Los Ángeles', direccion: 'Monte Perdido 1685', telefono: '+56987654321', email: 'reservas@complejodesarrollo.cl' },
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

// Obtener todas las canchas
app.get('/api/canchas', async (req, res) => {
  try {
    console.log('⚽ Obteniendo todas las canchas...');
    const canchas = await db.query(
      'SELECT * FROM canchas ORDER BY complejo_id, nombre'
    );
    console.log(`✅ ${canchas.rows ? canchas.rows.length : 0} canchas encontradas`);
    res.json(canchas.rows || []);
  } catch (error) {
    console.error('❌ Error obteniendo canchas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Función helper para verificar si hay una promoción activa

// Función helper para verificar si hay una promoción activa
async function verificarPromocionActiva(canchaId, fecha, hora) {
  try {
    console.log(`🎯 Verificando promoción para cancha ${canchaId}, fecha ${fecha}, hora ${hora}`);
    
    const promociones = await db.all(`
      SELECT * FROM promociones_canchas
      WHERE cancha_id = $1 
        AND activo = true
      ORDER BY precio_promocional ASC
    `, [canchaId]);
    
    console.log(`📋 Promociones encontradas para cancha ${canchaId}:`, promociones.length);
    
    if (!promociones || promociones.length === 0) {
      console.log('❌ No hay promociones activas');
      return null;
    }
    
    const fechaReserva = new Date(fecha + 'T00:00:00');
    const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][fechaReserva.getDay()];
    const horaReserva = hora.split(':')[0] + ':' + hora.split(':')[1]; // Normalizar formato HH:MM
    
    console.log(`📅 Fecha reserva: ${fecha}, Día semana: ${diaSemana}, Hora: ${horaReserva}`);
    
    for (const promo of promociones) {
      console.log(`\n🔍 Evaluando promoción: ${promo.nombre}`);
      console.log(`   📌 Tipo fecha: ${promo.tipo_fecha}, Tipo horario: ${promo.tipo_horario}`);
      
      // Validar tipo de fecha
      let fechaValida = false;
      
      if (promo.tipo_fecha === 'especifico' && promo.fecha_especifica) {
        console.log(`   📅 Comparando fechas específicas:`);
        console.log(`      - Fecha reserva (string): ${fecha}`);
        console.log(`      - Fecha promo (raw): ${promo.fecha_especifica}`);
        console.log(`      - Fecha promo (tipo): ${typeof promo.fecha_especifica}`);
        
        // Normalizar fecha de promoción (puede venir como Date o string de PostgreSQL)
        let fechaPromoStr = promo.fecha_especifica;
        if (promo.fecha_especifica instanceof Date) {
          fechaPromoStr = promo.fecha_especifica.toISOString().split('T')[0];
        } else if (typeof promo.fecha_especifica === 'string') {
          fechaPromoStr = promo.fecha_especifica.split('T')[0];
        }
        
        console.log(`      - Fecha promo (normalizada): ${fechaPromoStr}`);
        console.log(`      - ¿Son iguales?: ${fecha === fechaPromoStr}`);
        
        fechaValida = fecha === fechaPromoStr;
      } else if (promo.tipo_fecha === 'rango' && promo.fecha_inicio && promo.fecha_fin) {
        const inicio = new Date(promo.fecha_inicio + 'T00:00:00');
        const fin = new Date(promo.fecha_fin + 'T00:00:00');
        fechaValida = fechaReserva >= inicio && fechaReserva <= fin;
        console.log(`   📅 Validación de rango: ${fechaValida}`);
      } else if (promo.tipo_fecha === 'recurrente_semanal' && promo.dias_semana) {
        const diasPromo = Array.isArray(promo.dias_semana) ? promo.dias_semana : JSON.parse(promo.dias_semana || '[]');
        fechaValida = diasPromo.includes(diaSemana);
        console.log(`   📅 Validación semanal - Días: ${diasPromo}, Día actual: ${diaSemana}, Válido: ${fechaValida}`);
      }
      
      console.log(`   ✔️ Fecha válida: ${fechaValida}`);
      if (!fechaValida) continue;
      
      // Validar tipo de horario
      let horarioValido = false;
      
      if (promo.tipo_horario === 'especifico' && promo.hora_especifica) {
        console.log(`   🕐 Comparando horas específicas:`);
        console.log(`      - Hora reserva: ${horaReserva}`);
        console.log(`      - Hora promo (raw): ${promo.hora_especifica}`);
        console.log(`      - Hora promo (tipo): ${typeof promo.hora_especifica}`);
        
        // Normalizar hora de promoción
        let horaPromoStr = promo.hora_especifica;
        if (typeof promo.hora_especifica === 'string') {
          horaPromoStr = promo.hora_especifica.substring(0, 5);
        }
        
        console.log(`      - Hora promo (normalizada): ${horaPromoStr}`);
        console.log(`      - ¿Son iguales?: ${horaReserva === horaPromoStr}`);
        
        horarioValido = horaReserva === horaPromoStr;
      } else if (promo.tipo_horario === 'rango' && promo.hora_inicio && promo.hora_fin) {
        const horaInicioPromo = promo.hora_inicio.substring(0, 5);
        const horaFinPromo = promo.hora_fin.substring(0, 5);
        horarioValido = horaReserva >= horaInicioPromo && horaReserva < horaFinPromo;
        console.log(`   🕐 Validación de rango: ${horaInicioPromo} <= ${horaReserva} < ${horaFinPromo} = ${horarioValido}`);
      }
      
      console.log(`   ✔️ Horario válido: ${horarioValido}`);
      
      if (horarioValido) {
        console.log(`✅ Promoción APLICADA: ${promo.nombre} - Precio: $${promo.precio_promocional}`);
        return promo; // Retornar la primera promoción que aplica (menor precio)
      } else {
        console.log(`❌ Horario no válido para promoción: ${promo.nombre}`);
      }
    }
    
    console.log('❌ Ninguna promoción aplica para estos parámetros');
    return null;
  } catch (error) {
    console.error('❌ Error verificando promoción:', error);
    return null;
  }
}

// Función optimizada para verificar promociones en lote (evita N+1 queries)
async function verificarPromocionesEnLote(canchaIds, fecha, hora) {
  try {
    if (!canchaIds || canchaIds.length === 0) {
      return {};
    }
    
    console.log(`🎯 Verificando promociones en lote para ${canchaIds.length} canchas, fecha ${fecha}, hora ${hora}`);
    
    // Una sola consulta para todas las canchas
    const promociones = await db.all(`
      SELECT * FROM promociones_canchas
      WHERE cancha_id = ANY($1) 
        AND activo = true
      ORDER BY cancha_id, precio_promocional ASC
    `, [canchaIds]);
    
    console.log(`📋 Promociones encontradas: ${promociones.length}`);
    
    const resultado = {};
    const fechaReserva = new Date(fecha + 'T00:00:00');
    const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][fechaReserva.getDay()];
    const horaReserva = hora.split(':')[0] + ':' + hora.split(':')[1];
    
    console.log(`📅 Fecha reserva: ${fecha}, Día semana: ${diaSemana}, Hora: ${horaReserva}`);
    
    // Procesar promociones por cancha
    for (const canchaId of canchaIds) {
      resultado[canchaId] = null;
      
      const promocionesCancha = promociones.filter(p => p.cancha_id === canchaId);
      
      for (const promo of promocionesCancha) {
        // Validar tipo de fecha
        let fechaValida = false;
        
        if (promo.tipo_fecha === 'especifico' && promo.fecha_especifica) {
          let fechaPromoStr = promo.fecha_especifica;
          if (promo.fecha_especifica instanceof Date) {
            fechaPromoStr = promo.fecha_especifica.toISOString().split('T')[0];
          } else if (typeof promo.fecha_especifica === 'string') {
            fechaPromoStr = promo.fecha_especifica.split('T')[0];
          }
          fechaValida = fecha === fechaPromoStr;
        } else if (promo.tipo_fecha === 'rango' && promo.fecha_inicio && promo.fecha_fin) {
          const fechaInicio = new Date(promo.fecha_inicio + 'T00:00:00');
          const fechaFin = new Date(promo.fecha_fin + 'T00:00:00');
          fechaValida = fechaReserva >= fechaInicio && fechaReserva <= fechaFin;
        } else if (promo.tipo_fecha === 'dia_semana' && promo.dias_semana) {
          const diasPromo = promo.dias_semana.split(',').map(d => d.trim());
          fechaValida = diasPromo.includes(diaSemana);
        } else if (promo.tipo_fecha === 'todos') {
          fechaValida = true;
        }
        
        if (!fechaValida) continue;
        
        // Validar tipo de horario
        let horarioValido = false;
        
        if (promo.tipo_horario === 'especifico' && promo.hora_especifica) {
          const horaPromo = promo.hora_especifica.split(':')[0] + ':' + promo.hora_especifica.split(':')[1];
          horarioValido = horaReserva === horaPromo;
        } else if (promo.tipo_horario === 'rango' && promo.hora_inicio && promo.hora_fin) {
          const horaInicio = promo.hora_inicio.split(':')[0] + ':' + promo.hora_inicio.split(':')[1];
          const horaFin = promo.hora_fin.split(':')[0] + ':' + promo.hora_fin.split(':')[1];
          horarioValido = horaReserva >= horaInicio && horaReserva <= horaFin;
        } else if (promo.tipo_horario === 'todos') {
          horarioValido = true;
        }
        
        if (horarioValido) {
          resultado[canchaId] = promo;
          console.log(`✅ Promoción aplicada a cancha ${canchaId}: ${promo.nombre}`);
          break; // Usar la primera promoción válida (ordenada por precio)
        }
      }
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error verificando promociones en lote:', error);
    return {};
  }
}

// Obtener canchas por complejo (con promociones activas)
app.get('/api/canchas/:complejoId', async (req, res) => {
  try {
    const { complejoId } = req.params;
    const { fecha, hora } = req.query; // Opcional: para calcular precio específico
    
    const canchas = await db.all(
      'SELECT * FROM canchas WHERE complejo_id = $1 ORDER BY nombre',
      [complejoId]
    );
    
    // Si se proporciona fecha y hora, verificar promociones activas
    if (fecha && hora) {
      for (const cancha of canchas) {
        const promocionActiva = await verificarPromocionActiva(cancha.id, fecha, hora);
        if (promocionActiva) {
          cancha.tiene_promocion = true;
          cancha.precio_original = cancha.precio_hora;
          cancha.precio_actual = promocionActiva.precio_promocional;
          cancha.promocion_info = {
            nombre: promocionActiva.nombre,
            porcentaje_descuento: Math.round(((cancha.precio_hora - promocionActiva.precio_promocional) / cancha.precio_hora) * 100)
          };
        } else {
          cancha.tiene_promocion = false;
          cancha.precio_actual = cancha.precio_hora;
        }
      }
    }
    
    res.json(canchas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener canchas por complejo y tipo (con promociones activas)
app.get('/api/canchas/:complejoId/:tipo', async (req, res) => {
  try {
    const { complejoId, tipo } = req.params;
    const { fecha, hora } = req.query; // Opcional: para calcular precio específico
    
    const canchas = await db.all(
      'SELECT * FROM canchas WHERE complejo_id = $1 AND tipo = $2 ORDER BY nombre',
      [complejoId, tipo]
    );
    
    // Si se proporciona fecha y hora, verificar promociones activas
    if (fecha && hora) {
      for (const cancha of canchas) {
        const promocionActiva = await verificarPromocionActiva(cancha.id, fecha, hora);
        if (promocionActiva) {
          cancha.tiene_promocion = true;
          cancha.precio_original = cancha.precio_hora;
          cancha.precio_actual = promocionActiva.precio_promocional;
          cancha.promocion_info = {
            nombre: promocionActiva.nombre,
            porcentaje_descuento: Math.round(((cancha.precio_hora - promocionActiva.precio_promocional) / cancha.precio_hora) * 100)
          };
        } else {
          cancha.tiene_promocion = false;
          cancha.precio_actual = cancha.precio_hora;
        }
      }
    }
    
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
      SELECT r.*, 
             TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
             c.nombre as cancha_nombre, 
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
// Crear reserva (ATÓMICA - Previene condiciones de carrera)
app.post('/api/reservas', async (req, res) => {
  try {
    const { cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, bloqueo_id, codigo_descuento } = req.body;
    
    console.log('📝 Creando reserva atómica con datos:', { 
      cancha_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, precio_total, bloqueo_id 
    });
    
    // Validar campos requeridos
    if (!cancha_id || !nombre_cliente || !email_cliente || !fecha || !hora_inicio || !hora_fin || !precio_total) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos para crear la reserva'
      });
    }
    
    // Validar que no se esté intentando reservar en horarios pasados
    const ahora = new Date();
    let fechaHoraReserva;
    
    try {
      // Manejar diferentes formatos de hora
      const horaFormateada = hora_inicio.includes(':') ? hora_inicio : `${hora_inicio}:00:00`;
      fechaHoraReserva = new Date(`${fecha}T${horaFormateada}`);
      
      // Verificar que la fecha sea válida
      if (isNaN(fechaHoraReserva.getTime())) {
        throw new Error('Fecha o hora inválida');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha o hora inválido',
        detalles: {
          fecha: fecha,
          hora_inicio: hora_inicio,
          mensaje: 'Verifique que la fecha esté en formato YYYY-MM-DD y la hora en formato HH:MM o HH:MM:SS'
        }
      });
    }
    
    console.log('🕐 Validando horario:', {
      ahora: ahora.toISOString(),
      fechaHoraReserva: fechaHoraReserva.toISOString(),
      diferencia: fechaHoraReserva.getTime() - ahora.getTime()
    });
    
    if (fechaHoraReserva <= ahora) {
      return res.status(400).json({
        success: false,
        error: 'No se pueden hacer reservas en horarios pasados',
        detalles: {
          hora_actual: ahora.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
          hora_solicitada: fechaHoraReserva.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
          mensaje: 'Solo se pueden hacer reservas para fechas y horarios futuros'
        }
      });
    }
    
    // Usar teléfono por defecto si no se proporciona
    const telefono = telefono_cliente || 'No proporcionado';
    
    // Usar AtomicReservationManager para crear reserva de forma atómica
    const AtomicReservationManager = require('./src/utils/atomic-reservation');
    const atomicManager = new AtomicReservationManager(db);
    
    const reservationData = {
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      nombre_cliente,
      email_cliente,
      telefono_cliente: telefono,
      rut_cliente,
      precio_total,
      tipo_reserva: 'directa',
      bloqueo_id
    };
    
    const options = {
      skipAvailabilityCheck: false, // Siempre verificar disponibilidad
      commissionRate: 0.035 // 3.5% para reservas web
    };
    
    const result = await atomicManager.createAtomicReservation(reservationData, options);
    
    if (!result.success) {
      const statusCode = result.code === 'NOT_AVAILABLE' || result.code === 'TEMPORARILY_BLOCKED' ? 409 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }
    
    console.log('✅ Reserva atómica creada exitosamente:', {
      id: result.reserva.id,
      codigo: result.codigo_reserva,
      precio: result.precio
    });
    
    // ===== ENVÍO AUTOMÁTICO DE EMAILS =====
    try {
      // Obtener información completa de la reserva para el email
      const reservaInfo = await db.get(`
        SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        JOIN complejos co ON c.complejo_id = co.id
        JOIN ciudades ci ON co.ciudad_id = ci.id
        WHERE r.codigo_reserva = $1
      `, [result.codigo_reserva]);
      
      if (reservaInfo) {
        console.log('📧 Preparando envío de emails para reserva:', result.codigo_reserva);
        
        // Preparar datos para el email
        const emailData = {
          codigo_reserva: result.codigo_reserva,
          email_cliente: reservaInfo.email_cliente,
          nombre_cliente: reservaInfo.nombre_cliente,
          complejo: reservaInfo.complejo_nombre,
          cancha: reservaInfo.cancha_nombre,
          fecha: reservaInfo.fecha,
          hora_inicio: reservaInfo.hora_inicio,
          hora_fin: reservaInfo.hora_fin,
          precio_total: parseInt(reservaInfo.precio_total)
        };
        
        // Enviar emails de confirmación (cliente + administradores)
        const emailResults = await emailService.sendConfirmationEmails(emailData);
        console.log('📧 Emails de confirmación procesados:', emailResults);
        
        // Registrar movimientos financieros automáticamente
        try {
          await registrarMovimientosFinancieros(reservaInfo);
          console.log('💰 Movimientos financieros registrados automáticamente');
        } catch (finError) {
          console.error('❌ Error registrando movimientos financieros:', finError);
          // No fallar la reserva por error en el registro financiero
        }
      }
    } catch (emailError) {
      console.error('⚠️ Error enviando emails de confirmación:', emailError.message);
      // No fallar la reserva por error de email, solo loggear
    }
    
    res.json({
      success: true,
      id: result.reserva.id,
      codigo_reserva: result.codigo_reserva,
      precio: result.precio,
      message: 'Reserva creada exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error creando reserva atómica:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al crear la reserva' 
    });
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
        
        // Calcular comisión para reserva web (3.5%) - Solo para registro, no se suma al precio
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

// Endpoint para limpiar datos de prueba
app.post('/api/reservas/cleanup-test', async (req, res) => {
  try {
    // Limpiar reservas de prueba
    const reservasResult = await db.query(`
      DELETE FROM reservas 
      WHERE email_cliente LIKE '%@test.com' 
      OR nombre_cliente LIKE 'Cliente %'
      OR nombre_cliente LIKE 'Cliente Web%'
      OR nombre_cliente LIKE 'Cliente Admin%'
    `);
    
    // Limpiar bloqueos temporales de prueba
    const bloqueosResult = await db.query(`
      DELETE FROM bloqueos_temporales 
      WHERE session_id LIKE 'test-session-%'
      OR session_id LIKE 'web-session-%'
      OR session_id LIKE 'admin-session-%'
    `);
    
    // Limpiar pagos de prueba (si la tabla existe)
    let pagosResult = { rowCount: 0 };
    try {
      pagosResult = await db.query(`
        DELETE FROM pagos 
        WHERE reserva_id IN (
          SELECT id FROM reservas 
          WHERE email_cliente LIKE '%@test.com'
        )
      `);
    } catch (error) {
      console.log('⚠️ Tabla pagos no existe o no tiene la columna esperada');
    }
    
    res.json({ 
      success: true, 
      message: 'Datos de prueba limpiados',
      data: {
        reservas: reservasResult.rowCount,
        bloqueos: bloqueosResult.rowCount,
        pagos: pagosResult.rowCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor

// Middleware de errores de métricas (debe ir al final)
app.use(errorMetricsMiddleware);

app.listen(PORT, () => {
  // logger.info('🚀 Servidor ejecutándose', {
  //   port: PORT,
  //   environment: process.env.NODE_ENV || 'development',
  //   database: db.getDatabaseInfo().type,
  //   timestamp: new Date().toISOString()
  // });
  
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
    const backupFileName = `postgresql_backup_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Crear respaldo de PostgreSQL usando el sistema de backup
    try {
      const { PostgreSQLBackupSystem } = require('./scripts/database/backup-system');
      const backupSystem = new PostgreSQLBackupSystem();
      await backupSystem.connectDb();
      const result = await backupSystem.createBackup();
      
      if (result.success) {
        console.log(`✅ Respaldo PostgreSQL creado: ${result.path}`);
      } else {
        console.log('⚠️ Error creando respaldo PostgreSQL');
      }
      
      await backupSystem.close();
    } catch (error) {
      console.error('❌ Error en sistema de backup:', error.message);
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
    console.log('🔍 DEBUG - complejo_id que se enviará:', user.complejo_id, 'tipo:', typeof user.complejo_id);
    console.log('🔍 DEBUG - Objeto user completo:', {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      complejo_id: user.complejo_id,
      complejo_nombre: user.complejo_nombre
    });
    
    const userResponse = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol || 'manager',
      complejo_id: user.complejo_id,
      complejo_nombre: user.complejo_nombre
    };
    
    console.log('📤 Respuesta que se enviará al frontend:', userResponse);
    
    res.json({
      success: true,
      token: token,
      user: userResponse
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
      { email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Dueño Complejo En Desarrollo', rol: 'owner' },
      { email: 'naxiin_320@hotmail.com', password: 'gunnen2024', nombre: 'Administrador Fundación Gunnen', rol: 'admin' },
      { email: 'ignacio.araya.lillito@hotmail.com', password: 'gunnen2024', nombre: 'Dueño Fundación Gunnen', rol: 'owner' }
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
      ['Cancha Techada 1', 'Fútbol', 50, complejoId]
    );
    const cancha1Id = cancha1Result.lastID;
    console.log(`✅ Cancha "Cancha Techada 1" insertada con ID: ${cancha1Id}`);
    
    const cancha2Result = await db.run(
      'INSERT INTO canchas (nombre, tipo, precio_hora, complejo_id) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Cancha Techada 2', 'Fútbol', 50, complejoId]
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
        magnasportsOwner: 'naxiin320@gmail.com / magnasports2024',
        gunnenAdmin: 'naxiin_320@hotmail.com / gunnen2024',
        gunnenOwner: 'ignacio.araya.lillito@hotmail.com / gunnen2024'
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
    
    // Datos de prueba (usar datos del request si se proporcionan)
    const testData = {
      codigo_reserva: req.body.codigo_reserva || Math.random().toString(36).substr(2, 6).toUpperCase(),
      nombre_cliente: req.body.nombre_cliente || 'Cliente de Prueba',
      email_cliente: req.body.email_cliente || 'ignacio.araya.lillo@gmail.com',
      complejo: req.body.complejo || 'Complejo En Desarrollo',
      cancha: req.body.cancha || 'Cancha Techada 1',
      fecha: req.body.fecha || '2025-09-12',
      hora_inicio: req.body.hora_inicio || '18:00',
      hora_fin: req.body.hora_fin || '19:00',
      precio_total: req.body.precio_total || 50
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
      SMTP_RESERVAS_USER: process.env.SMTP_RESERVAS_USER ? 'Definido' : 'No definido',
      SMTP_RESERVAS_PASS: process.env.SMTP_RESERVAS_PASS ? 'Definido' : 'No definido',
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

// ===== ENDPOINT PARA VERIFICAR BLOQUEOS TEMPORALES =====
app.get('/api/debug/check-all-blockings', async (req, res) => {
  try {
    console.log('🔍 Verificando todos los bloqueos temporales...');
    
    const bloqueos = await db.query('SELECT * FROM bloqueos_temporales ORDER BY creado_en DESC LIMIT 10');
    
    res.json({
      success: true,
      message: 'Bloqueos temporales encontrados',
      bloqueos: bloqueos,
      count: bloqueos.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando bloqueos temporales:', error);
    res.status(500).json({
      success: false,
      error: error.message
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
      WHERE cancha_id = $1 AND fecha::date = $2::date AND estado != 'cancelada'
    `, [canchaId, fecha]);
    
    console.log(`📊 Reservas encontradas: ${reservas.length}`);
    
    // Obtener bloqueos temporales activos
    console.log(`🔍 Consultando bloqueos temporales para cancha ${canchaId} en ${fecha}`);
    const bloqueos = await db.query(`
      SELECT hora_inicio, hora_fin, session_id
      FROM bloqueos_temporales 
      WHERE cancha_id = $1 AND fecha::date = $2::date AND expira_en > $3
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

// ===== FUNCIÓN PARA CONVERTIR HORA A MINUTOS (DUPLICADA - ELIMINADA) =====
// Esta función ya existe en la línea 1192

// ===== ENDPOINT PARA BLOQUEAR TEMPORALMENTE UNA RESERVA (MEJORADO) =====
app.post('/api/reservas/bloquear', async (req, res) => {
  try {
    const { cancha_id, fecha, hora_inicio, hora_fin, session_id, datos_cliente } = req.body;
    
    // Verificar que todos los campos requeridos estén presentes
    if (!cancha_id || !fecha || !hora_inicio || !hora_fin || !session_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos para bloquear la reserva' 
      });
    }
    
    // Validar que no se esté intentando reservar en horarios pasados
    const ahora = new Date();
    let fechaHoraReserva;
    
    try {
      // Manejar diferentes formatos de hora
      const horaFormateada = hora_inicio.includes(':') ? hora_inicio : `${hora_inicio}:00:00`;
      fechaHoraReserva = new Date(`${fecha}T${horaFormateada}`);
      
      // Verificar que la fecha sea válida
      if (isNaN(fechaHoraReserva.getTime())) {
        throw new Error('Fecha o hora inválida');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Formato de fecha o hora inválido',
        detalles: {
          fecha: fecha,
          hora_inicio: hora_inicio,
          mensaje: 'Verifique que la fecha esté en formato YYYY-MM-DD y la hora en formato HH:MM o HH:MM:SS'
        }
      });
    }
    
    console.log('🕐 Validando horario para bloqueo temporal:', {
      ahora: ahora.toISOString(),
      fechaHoraReserva: fechaHoraReserva.toISOString(),
      diferencia: fechaHoraReserva.getTime() - ahora.getTime()
    });
    
    if (fechaHoraReserva <= ahora) {
      return res.status(400).json({
        success: false,
        error: 'No se pueden hacer reservas en horarios pasados',
        detalles: {
          hora_actual: ahora.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
          hora_solicitada: fechaHoraReserva.toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
          mensaje: 'Solo se pueden hacer reservas para fechas y horarios futuros'
        }
      });
    }
    
    // Usar sistema atómico para verificar disponibilidad
    const atomicManager = global.atomicReservationManager;
    if (!atomicManager) {
      throw new Error('Sistema de reservas atómicas no inicializado');
    }
    
    const disponibilidad = await atomicManager.checkAtomicAvailability(
      cancha_id, fecha, hora_inicio, hora_fin
    );
    
    if (!disponibilidad.disponible) {
      return res.status(409).json({ 
        success: false, 
        error: 'La cancha ya no está disponible en ese horario',
        detalles: {
          reservas_existentes: disponibilidad.reservas_existentes,
          bloqueos_temporales: disponibilidad.bloqueos_temporales
        }
      });
    }
    
    // Crear bloqueo temporal (5 minutos)
    const bloqueoId = 'BLOCK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
    
    // Insertar bloqueo usando transacción
    const client = await db.pgPool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        'INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, creado_en, datos_cliente) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [bloqueoId, cancha_id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), new Date().toISOString(), datos_cliente ? JSON.stringify(datos_cliente) : null]
      );
      
      await client.query('COMMIT');
      
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
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error bloqueando reserva:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      detalles: error.message
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
        nombre: 'Dueño Complejo En Desarrollo',
        rol: 'owner'
      },
      {
        email: 'naxiin_320@hotmail.com',
        password: 'gunnen2024',
        nombre: 'Administrador Fundación Gunnen',
        rol: 'admin'
      },
      {
        email: 'ignacio.araya.lillito@hotmail.com',
        password: 'gunnen2024',
        nombre: 'Dueño Fundación Gunnen',
        rol: 'owner'
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
    
    // Obtener ID del complejo En Desarrollo
    const magnasports = await db.get('SELECT id FROM complejos WHERE nombre = $1', ['Complejo En Desarrollo']);
    if (!magnasports) {
      throw new Error('Complejo En Desarrollo no encontrado');
    }
    
    const complejoId = magnasports.id;
    console.log(`🏢 ID del complejo En Desarrollo: ${complejoId}`);
    
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
        nombre: 'Dueño Complejo En Desarrollo',
        rol: 'owner',
        complejo_id: complejoId
      },
      {
        email: 'naxiin320@gmail.com',
        password: 'admin123',
        nombre: 'Administrador Complejo En Desarrollo',
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

// ===== ENDPOINT PARA VER CANCHAS =====
app.get('/api/debug/canchas', async (req, res) => {
  try {
    console.log('🔍 Verificando canchas en la base de datos...');
    
    const canchas = await db.query(`
      SELECT c.*, comp.nombre as complejo_nombre 
      FROM canchas c 
      LEFT JOIN complejos comp ON c.complejo_id = comp.id 
      ORDER BY c.id
    `);
    
    console.log(`📊 Encontradas ${canchas.length} canchas en la base de datos`);
    
    res.json({
      success: true,
      totalCanchas: canchas.length,
      canchas: canchas
    });
  } catch (error) {
    console.error('❌ Error verificando canchas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ENDPOINT PARA CREAR CANCHAS DE PRUEBA =====
app.post('/api/debug/create-courts', async (req, res) => {
  try {
    console.log('🏟️ Creando canchas para Fundación Gunnen...');
    
    const canchasData = [
      {
        complejo_id: 3, // Fundación Gunnen
        nombre: 'Cancha 1',
        tipo: 'futbol',
        precio_hora: 8000,
        numero: 1
      },
      {
        complejo_id: 3, // Fundación Gunnen
        nombre: 'Cancha 2',
        tipo: 'futbol',
        precio_hora: 8000,
        numero: 2
      }
    ];
    
    const results = [];
    for (const cancha of canchasData) {
      try {
        const result = await db.run(`
          INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora, numero)
          VALUES ($1, $2, $3, $4, $5)
        `, [cancha.complejo_id, cancha.nombre, cancha.tipo, cancha.precio_hora, cancha.numero]);
        
        results.push({
          cancha: cancha.nombre,
          status: 'created',
          id: result.lastID
        });
        console.log(`✅ Cancha creada: ${cancha.nombre} (ID: ${result.lastID})`);
      } catch (error) {
        results.push({
          cancha: cancha.nombre,
          status: 'error',
          error: error.message
        });
        console.error(`❌ Error creando cancha ${cancha.nombre}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Proceso de creación de canchas completado',
      results: results
    });
  } catch (error) {
    console.error('❌ Error creando canchas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ENDPOINT PARA MIGRAR FUNDACIÓN GUNNEN =====
app.post('/api/debug/migrate-fundacion-gunnen', async (req, res) => {
  try {
    console.log('🚀 Iniciando migración de Fundación Gunnen...');
    
    // Verificar si el complejo ya existe
    const existingComplex = await db.query(
      'SELECT id FROM complejos WHERE nombre = $1',
      ['Fundación Gunnen']
    );
    
    if (existingComplex.rows && existingComplex.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Fundación Gunnen ya existe en la base de datos',
        complexId: existingComplex.rows[0].id
      });
    }
    
    // 1. Insertar el complejo Fundación Gunnen
    console.log('📝 Insertando complejo Fundación Gunnen...');
    const complexResult = await db.query(`
      INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id
    `, [
      'Fundación Gunnen',
      1, // Ciudad ID: Los Ángeles
      'Calle Don Victor 1310',
      '+56972815810',
      'naxiin_320@hotmail.com'
    ]);
    
    const complexId = complexResult.rows && complexResult.rows[0] ? complexResult.rows[0].id : null;
    console.log(`✅ Complejo Fundación Gunnen creado con ID: ${complexId}`);
    
    // 2. Insertar las canchas
    console.log('⚽ Insertando canchas de Fundación Gunnen...');
    
    const canchas = [
      { nombre: 'Cancha 1', tipo: 'futbol', precio: 8000 },
      { nombre: 'Cancha 2', tipo: 'futbol', precio: 8000 }
    ];
    
    const canchasCreadas = [];
    for (const cancha of canchas) {
      const canchaResult = await db.query(`
        INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `, [complexId, cancha.nombre, cancha.tipo, cancha.precio]);
      
      const canchaId = canchaResult.rows && canchaResult.rows[0] ? canchaResult.rows[0].id : null;
      canchasCreadas.push({
        id: canchaId,
        nombre: cancha.nombre,
        precio: cancha.precio
      });
      
      console.log(`✅ Cancha "${cancha.nombre}" creada con ID: ${canchaId}`);
    }
    
    res.json({
      success: true,
      message: 'Migración de Fundación Gunnen completada exitosamente',
      complexId: complexId,
      canchasCreadas: canchasCreadas,
      totalCanchas: canchasCreadas.length
    });
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA LIMPIAR DUPLICADOS DE FUNDACIÓN GUNNEN =====
app.post('/api/debug/clean-duplicate-complexes', async (req, res) => {
  try {
    console.log('🧹 Limpiando complejos duplicados de Fundación Gunnen...');
    
    // 1. Obtener todos los registros de Fundación Gunnen usando db.query
    const duplicates = await db.query(
      'SELECT id, nombre FROM complejos WHERE nombre = $1 ORDER BY id',
      ['Fundación Gunnen']
    );
    
    console.log(`🔍 Encontrados ${duplicates.rows ? duplicates.rows.length : 0} registros de Fundación Gunnen`);
    
    if (!duplicates.rows || duplicates.rows.length <= 1) {
      return res.json({
        success: true,
        message: 'No hay duplicados de Fundación Gunnen',
        totalFound: duplicates.rows ? duplicates.rows.length : 0
      });
    }
    
    // 2. Mantener el primer registro (ID más bajo) y eliminar el resto
    const keepId = duplicates.rows[0].id;
    const deleteIds = duplicates.rows.slice(1).map(row => row.id);
    
    console.log(`✅ Manteniendo complejo ID: ${keepId}`);
    console.log(`🗑️ Eliminando IDs: ${deleteIds.join(', ')}`);
    
    // 3. Mover canchas de complejos duplicados al complejo principal
    for (const deleteId of deleteIds) {
      await db.query(
        'UPDATE canchas SET complejo_id = $1 WHERE complejo_id = $2',
        [keepId, deleteId]
      );
      console.log(`🔄 Canchas movidas de complejo ${deleteId} a ${keepId}`);
    }
    
    // 4. Eliminar complejos duplicados
    for (const deleteId of deleteIds) {
      await db.query('DELETE FROM complejos WHERE id = $1', [deleteId]);
      console.log(`🗑️ Complejo duplicado ${deleteId} eliminado`);
    }
    
    // 5. Verificar resultado
    const finalComplexes = await db.query(
      'SELECT * FROM complejos WHERE nombre = $1',
      ['Fundación Gunnen']
    );
    
    const finalCanchas = await db.query(
      'SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1',
      [keepId]
    );
    
    res.json({
      success: true,
      message: 'Duplicados de Fundación Gunnen eliminados exitosamente',
      keptComplexId: keepId,
      deletedIds: deleteIds,
      finalCount: finalComplexes.rows ? finalComplexes.rows.length : 0,
      canchasCount: finalCanchas.rows && finalCanchas.rows[0] ? finalCanchas.rows[0].count : 0
    });
    
  } catch (error) {
    console.error('❌ Error limpiando duplicados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT SIMPLE PARA ELIMINAR DUPLICADOS =====
app.post('/api/debug/delete-duplicates', async (req, res) => {
  try {
    console.log('🗑️ Eliminando duplicados de Fundación Gunnen...');
    
    // Eliminar directamente los IDs 3 y 4, mantener el 2
    await db.query('DELETE FROM complejos WHERE id IN ($1, $2)', [3, 4]);
    console.log('✅ Duplicados eliminados');
    
    // Mover canchas al complejo 2
    await db.query('UPDATE canchas SET complejo_id = $1 WHERE complejo_id IN ($2, $3)', [2, 3, 4]);
    console.log('✅ Canchas movidas al complejo 2');
    
    res.json({
      success: true,
      message: 'Duplicados eliminados exitosamente',
      keptId: 2,
      deletedIds: [3, 4]
    });
    
  } catch (error) {
    console.error('❌ Error eliminando duplicados:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA LIMPIAR LOCALHOST =====
app.post('/api/debug/clean-localhost', async (req, res) => {
  try {
    console.log('🧹 Limpiando duplicados en localhost...');
    
    // Eliminar IDs 4 y 5, mantener ID 3
    await db.query('DELETE FROM complejos WHERE id IN ($1, $2)', [4, 5]);
    console.log('✅ Complejos 4 y 5 eliminados');
    
    // Mover canchas al complejo 3
    await db.query('UPDATE canchas SET complejo_id = $1 WHERE complejo_id IN ($2, $3)', [3, 4, 5]);
    console.log('✅ Canchas movidas al complejo 3');
    
    // Eliminar canchas duplicadas (IDs 8 y 9)
    await db.query('DELETE FROM canchas WHERE id IN ($1, $2)', [8, 9]);
    console.log('✅ Canchas duplicadas 8 y 9 eliminadas');
    
    res.json({
      success: true,
      message: 'Localhost limpiado exitosamente',
      keptId: 3,
      deletedComplexes: [4, 5],
      deletedCanchas: [8, 9]
    });
    
  } catch (error) {
    console.error('❌ Error limpiando localhost:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA CORREGIR CANCHAS EN PRODUCCIÓN =====
app.post('/api/debug/fix-canchas-production', async (req, res) => {
  try {
    console.log('🔧 Corrigiendo asociaciones de canchas en producción...');
    
    // Asociar canchas 3 y 4 al complejo Fundación Gunnen (ID: 2)
    await db.query('UPDATE canchas SET complejo_id = $1 WHERE id IN ($2, $3)', [2, 3, 4]);
    console.log('✅ Canchas 3 y 4 asociadas al complejo 2 (Fundación Gunnen)');
    
    // Verificar resultado
    const canchas = await db.query(`
      SELECT c.id, c.nombre, c.complejo_id, co.nombre as complejo_nombre 
      FROM canchas c 
      LEFT JOIN complejos co ON c.complejo_id = co.id 
      WHERE c.id IN (3, 4)
    `);
    
    res.json({
      success: true,
      message: 'Asociaciones de canchas corregidas en producción',
      canchas: canchas.rows
    });
    
  } catch (error) {
    console.error('❌ Error corrigiendo canchas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA VERIFICAR BASE DE DATOS =====
app.get('/api/debug/verify-db', async (req, res) => {
  try {
    console.log('🔍 Verificando base de datos de producción...');
    
    // Obtener todos los complejos
    const complejos = await db.query(`
      SELECT id, nombre, ciudad_id
      FROM complejos
      ORDER BY id
    `);
    
    // Obtener usuario admin@borderio.cl
    const borderioUser = await db.query(`
      SELECT id, email, nombre, rol, complejo_id, activo
      FROM usuarios
      WHERE email = 'admin@borderio.cl'
    `);
    
    // Obtener todos los usuarios
    const allUsers = await db.query(`
      SELECT u.id, u.email, u.nombre, u.rol, u.complejo_id, c.nombre as complejo_nombre
      FROM usuarios u
      LEFT JOIN complejos c ON u.complejo_id = c.id
      ORDER BY u.complejo_id, u.email
    `);
    
    res.json({
      success: true,
      complejos: complejos,
      borderioUser: borderioUser.length > 0 ? borderioUser[0] : null,
      allUsers: allUsers
    });
    
  } catch (error) {
    console.error('❌ Error verificando BD:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA CORREGIR COMPLEJO_ID =====
app.post('/api/debug/fix-complejo-ids', async (req, res) => {
  try {
    console.log('🔧 Corrigiendo complejo_id de usuarios...');
    
    // Actualizar usuarios de Fundación Gunnen (complejo_id = 3)
    const usuariosGunnen = [
      { email: 'ignacio.araya.lillito@hotmail.com', complejo_id: 3 },
      { email: 'naxiin_320@hotmail.com', complejo_id: 3 },
      { email: 'admin@fundaciongunnen.cl', complejo_id: 3 }
    ];
    
    // Actualizar usuarios de MagnaSports (complejo_id = 1)
    const usuariosMagna = [
      { email: 'naxiin320@gmail.com', complejo_id: 1 }
    ];
    
    // Actualizar usuarios de Borde Río (complejo_id = 7 en producción, 6 en desarrollo)
    // Detectar automáticamente cuál ID usar según el entorno
    const bordeRioComplejoId = process.env.NODE_ENV === 'production' ? 7 : 6;
    const usuariosBorderio = [
      { email: 'admin@borderio.cl', complejo_id: bordeRioComplejoId },
      { email: 'manager@borderio.cl', complejo_id: bordeRioComplejoId }
    ];
    
    const allUsers = [...usuariosGunnen, ...usuariosMagna, ...usuariosBorderio];
    const results = [];
    
    for (const usuario of allUsers) {
      try {
        const result = await db.run(
          'UPDATE usuarios SET complejo_id = $1 WHERE email = $2',
          [usuario.complejo_id, usuario.email]
        );
        
        if (result.changes > 0) {
          results.push({ 
            email: usuario.email, 
            status: 'updated', 
            message: `Complejo_id actualizado a ${usuario.complejo_id}` 
          });
        } else {
          results.push({ 
            email: usuario.email, 
            status: 'not_found', 
            message: 'Usuario no encontrado' 
          });
        }
      } catch (error) {
        results.push({ 
          email: usuario.email, 
          status: 'error', 
          message: error.message 
        });
      }
    }
    
    // Verificar resultados
    const usuarios = await db.query(`
      SELECT u.email, u.nombre, u.rol, u.complejo_id, c.nombre as complejo_nombre
      FROM usuarios u 
      LEFT JOIN complejos c ON u.complejo_id = c.id
      ORDER BY u.complejo_id, u.rol
    `);
    
    res.json({
      success: true,
      message: 'Corrección de complejo_id completada',
      results: results,
      usuarios: usuarios.rows
    });
    
  } catch (error) {
    console.error('❌ Error corrigiendo complejo_id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA ACTUALIZAR ROLES =====
app.post('/api/debug/fix-roles', async (req, res) => {
  try {
    console.log('🔧 Arreglando roles...');
    const roleUpdates = [
      { email: 'naxiin_320@hotmail.com', rol: 'manager' }
    ];
    
    const results = [];
    for (const update of roleUpdates) {
      try {
        const result = await db.run(
          'UPDATE usuarios SET rol = $1 WHERE email = $2',
          [update.rol, update.email]
        );
        
        if (result.changes > 0) {
          results.push({ 
            email: update.email, 
            status: 'updated', 
            message: `Rol actualizado a ${update.rol}` 
          });
          console.log(`✅ Rol actualizado para: ${update.email} -> ${update.rol}`);
        } else {
          results.push({ 
            email: update.email, 
            status: 'not_found', 
            message: 'Usuario no encontrado' 
          });
          console.log(`❌ Usuario no encontrado: ${update.email}`);
        }
      } catch (error) {
        results.push({ 
          email: update.email, 
          status: 'error', 
          message: error.message 
        });
        console.error(`❌ Error actualizando ${update.email}:`, error.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Proceso de arreglo de roles completado', 
      results: results 
    });
  } catch (error) {
    console.error('❌ Error arreglando roles:', error);
    res.status(500).json({ error: error.message });
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
    console.log('🧹 Limpiando base de datos - solo Los Ángeles y Complejo En Desarrollo...');
    
    // 1. Eliminar reservas de otros complejos (mantener solo Complejo En Desarrollo)
    const reservasEliminadas = await db.run(`
      DELETE FROM reservas 
      WHERE cancha_id IN (
        SELECT c.id FROM canchas c 
        JOIN complejos co ON c.complejo_id = co.id 
        WHERE co.nombre != 'Complejo En Desarrollo'
      )
    `);
    console.log(`✅ Reservas eliminadas: ${reservasEliminadas.changes || 0}`);
    
    // 2. Eliminar canchas de otros complejos
    const canchasEliminadas = await db.run(`
      DELETE FROM canchas 
      WHERE complejo_id IN (
        SELECT id FROM complejos WHERE nombre != 'Complejo En Desarrollo'
      )
    `);
    console.log(`✅ Canchas eliminadas: ${canchasEliminadas.changes || 0}`);
    
    // 3. Eliminar complejos que no sean Complejo En Desarrollo
    const complejosEliminados = await db.run(`
      DELETE FROM complejos WHERE nombre != 'Complejo En Desarrollo'
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
    
    // Contar todos los clientes únicos por EMAIL (identificador real único)
    const totalClientesUnicos = await db.query(`
      SELECT COUNT(DISTINCT r.email_cliente) as clientes_unicos
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      ${whereClause} AND r.estado IN ('confirmada', 'pendiente')
    `, params);

    // Análisis de clientes agrupando por EMAIL para evitar duplicados
    // Se normaliza el RUT y se toma el más completo (con puntos), el nombre más largo y completo
    const clientesFrecuentes = await db.query(`
      SELECT 
        CASE 
          WHEN LENGTH(MAX(r.nombre_cliente)) > LENGTH(MIN(r.nombre_cliente)) 
          THEN MAX(r.nombre_cliente)
          ELSE MIN(r.nombre_cliente)
        END as nombre_cliente,
        r.email_cliente,
        -- Tomar el RUT con puntos si existe, sino el primero
        COALESCE(
          MAX(CASE WHEN r.rut_cliente LIKE '%.%' THEN r.rut_cliente END),
          MAX(r.rut_cliente)
        ) as rut_cliente,
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
      GROUP BY r.email_cliente
      ORDER BY total_reservas DESC, total_gastado DESC
      LIMIT 10
    `, params);
    
    console.log('✅ Análisis de clientes generado exitosamente');
    console.log('📊 Clientes únicos encontrados:', totalClientesUnicos[0]?.clientes_unicos || 0);
    
    res.json({
      success: true,
      data: {
        clientesFrecuentes: clientesFrecuentes,
        clientesMayorGasto: clientesFrecuentes,
        clientesNuevos: [],
        clientesRecurrentes: [],
        estadisticas: { clientes_unicos: totalClientesUnicos[0]?.clientes_unicos || 0 },
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


// Endpoint de diagnóstico para verificar estructura de BD
app.get('/debug/database-structure', async (req, res) => {
  try {
    const dbInfo = db.getDatabaseInfo();
    
    // Schema PostgreSQL unificado
    const schema = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservas'
      ORDER BY ordinal_position
    `);
    
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
    
    // Verificar si la tabla existe en PostgreSQL
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'bloqueos_temporales'
    `);
    const bloqueosTableExists = tables.length > 0;
    
    if (bloqueosTableExists) {
      tableSchema = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'bloqueos_temporales'
        ORDER BY ordinal_position
      `);
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

// Endpoint para arreglar todas las contraseñas
app.post('/api/debug/fix-passwords', async (req, res) => {
  try {
    console.log('🔧 Arreglando contraseñas...');
    
    // Mapeo de usuarios y sus contraseñas correctas
    const userPasswords = {
      'admin@reservatuscanchas.cl': 'admin123',
      'naxiin320@gmail.com': 'magnasports2024',
      'naxiin_320@hotmail.com': 'gunnen2024',
      'ignacio.araya.lillito@hotmail.com': 'gunnen2024',
      'admin@fundaciongunnen.cl': 'gunnen2024'
    };
    
    const results = [];
    
    for (const [email, password] of Object.entries(userPasswords)) {
      try {
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Actualizar en la base de datos
        const result = await db.run(
          'UPDATE usuarios SET password = $1 WHERE email = $2',
          [hashedPassword, email]
        );
        
        if (result.changes > 0) {
          results.push({
            email: email,
            status: 'updated',
            message: 'Contraseña actualizada correctamente'
          });
          console.log(`✅ Contraseña actualizada para: ${email}`);
        } else {
          results.push({
            email: email,
            status: 'not_found',
            message: 'Usuario no encontrado'
          });
          console.log(`❌ Usuario no encontrado: ${email}`);
        }
      } catch (error) {
        results.push({
          email: email,
          status: 'error',
          message: error.message
        });
        console.error(`❌ Error actualizando ${email}:`, error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Proceso de arreglo de contraseñas completado',
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error arreglando contraseñas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para debuggear tokens JWT
app.get('/api/debug/verify-token', authenticateToken, (req, res) => {
  try {
    console.log('🔍 Verificando token JWT...');
    console.log('👤 Usuario autenticado:', req.user);
    
    res.json({
      success: true,
      message: 'Token válido',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error verificando token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para debuggear contraseñas
app.get('/api/debug/passwords', async (req, res) => {
  try {
    console.log('🔍 Debuggeando contraseñas...');
    
    // Obtener todos los usuarios
    const usuarios = await db.query('SELECT email, password, nombre, rol FROM usuarios ORDER BY email');
    
    const debugInfo = {
      totalUsuarios: usuarios.length,
      usuarios: []
    };
    
    for (const usuario of usuarios) {
      const userInfo = {
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        passwordHash: usuario.password.substring(0, 20) + '...',
        passwordsTested: []
      };
      
      // Probar contraseñas conocidas
      const passwordsToTest = [
        'admin123',
        'gunnen2024',
        'magnasports2024',
        'admin1234'
      ];
      
      for (const testPassword of passwordsToTest) {
        const match = await bcrypt.compare(testPassword, usuario.password);
        userInfo.passwordsTested.push({
          password: testPassword,
          match: match
        });
        if (match) {
          userInfo.correctPassword = testPassword;
          break;
        }
      }
      
      debugInfo.usuarios.push(userInfo);
    }
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Error debuggeando contraseñas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para actualizar credenciales del super admin
app.post('/debug/update-super-admin', async (req, res) => {
  try {
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

// Endpoint de diagnóstico para verificar datos de reservas en producción
app.get('/api/admin/debug-reservations', authenticateToken, requireRolePermission(['super_admin']), async (req, res) => {
  try {
    console.log('🔍 Diagnóstico de reservas en producción...');
    
    // Contar total de reservas
    const totalResult = await db.get('SELECT COUNT(*) as total FROM reservas');
    const totalReservas = totalResult.total;
    
    // Obtener algunas reservas de ejemplo
    const ejemploReservas = await db.all(`
      SELECT codigo_reserva, fecha, estado, nombre_cliente, created_at
      FROM reservas 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    // Verificar reservas por estado
    const porEstado = await db.all(`
      SELECT estado, COUNT(*) as cantidad
      FROM reservas 
      GROUP BY estado
    `);
    
    // Verificar fechas
    const fechasResult = await db.all(`
      SELECT fecha, COUNT(*) as cantidad
      FROM reservas 
      GROUP BY fecha
      ORDER BY fecha DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      diagnostico: {
        totalReservas,
        porEstado,
        fechasEjemplo: fechasResult,
        reservasEjemplo: ejemploReservas,
        timestamp: new Date().toISOString(),
        entorno: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error en diagnóstico',
      details: error.message 
    });
  }
});

// Endpoint para limpiar todas las reservas (solo para super admin en producción)
app.delete('/api/admin/clear-all-reservations', authenticateToken, requireRolePermission(['super_admin']), async (req, res) => {
  try {
    const user = req.user;
    
    // Verificar que solo se ejecute en producción o por super admin
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({ 
        success: false, 
        error: 'Esta operación solo está disponible en producción' 
      });
    }
    
    console.log('🗑️ Limpiando todas las reservas de producción...');
    console.log('👤 Usuario:', user.email, 'Rol:', user.rol);
    
    // Contar reservas antes de eliminar
    const countBefore = await db.get('SELECT COUNT(*) as total FROM reservas');
    const totalBefore = countBefore.total;
    
    console.log(`📊 Total de reservas antes de limpiar: ${totalBefore}`);
    
    if (totalBefore === 0) {
      return res.json({
        success: true,
        message: 'No hay reservas para eliminar',
        reservasEliminadas: 0,
        reservasRestantes: 0
      });
    }
    
    // Eliminar todas las reservas
    const deleteResult = await db.run('DELETE FROM reservas');
    
    // Verificar que se eliminaron todas
    const countAfter = await db.get('SELECT COUNT(*) as total FROM reservas');
    const totalAfter = countAfter.total;
    
    console.log(`✅ Eliminadas ${deleteResult.changes} reservas de producción`);
    console.log(`📊 Reservas restantes: ${totalAfter}`);
    
    res.json({
      success: true,
      message: 'Base de datos de reservas limpiada exitosamente',
      reservasEliminadas: deleteResult.changes,
      reservasRestantes: totalAfter,
      usuario: user.email,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error limpiando reservas de producción:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al limpiar reservas',
      details: error.message 
    });
  }
});

// Endpoint para verificar si el router admin-calendar está funcionando
app.get('/debug/test-admin-calendar-router', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Router admin-calendar está funcionando',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para verificar configuración de JWT
app.get('/debug/check-jwt-config', async (req, res) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const hasJwtSecret = !!jwtSecret;
    
    res.json({
      success: true,
      hasJwtSecret: hasJwtSecret,
      jwtSecretLength: jwtSecret ? jwtSecret.length : 0,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint temporal para reemplazar create-blocking
app.post('/api/admin/calendar/create-blocking-temp', async (req, res) => {
  try {
    const { fecha, hora_inicio, hora_fin, session_id, tipo } = req.body;
    
    console.log('🔧 Creando bloqueo temporal (endpoint temporal):', { fecha, hora_inicio, hora_fin, session_id, tipo });
    
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
    console.error('❌ Error creando bloqueo temporal (endpoint temporal):', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor al crear bloqueo temporal',
        details: error.message
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



// 🔍 ENDPOINT PARA DEBUGGING FRONTEND - DATOS RAW DE RESERVA
app.get('/api/diagnostic/frontend-debug/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🔍 DEBUG FRONTEND PARA RESERVA: ${codigo}`);
    
    // Obtener datos exactos que recibe el frontend
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, 
             CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
             co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.codigo_reserva = $1
      ORDER BY r.fecha_creacion DESC
    `, [codigo]);
    
    if (reservas.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Reserva ${codigo} no encontrada`
      });
    }
    
    const reserva = reservas[0];
    
    // Simular exactamente el procesamiento del backend
    const reservaProcesada = { ...reserva };
    if (reservaProcesada.fecha) {
      if (typeof reservaProcesada.fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(reservaProcesada.fecha)) {
          // Fecha ya está en formato correcto
        } else {
          // Convertir fecha a formato YYYY-MM-DD usando métodos UTC para evitar problemas de zona horaria
          const fechaObj = new Date(reservaProcesada.fecha);
          if (!isNaN(fechaObj.getTime())) {
            const year = fechaObj.getUTCFullYear();
            const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(fechaObj.getUTCDate()).padStart(2, '0');
            reservaProcesada.fecha = `${year}-${month}-${day}`;
          }
        }
      }
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      reserva_original: {
        codigo: reserva.codigo_reserva,
        fecha_original: reserva.fecha,
        fecha_tipo: typeof reserva.fecha,
        fecha_string: reserva.fecha ? reserva.fecha.toString() : null,
        fecha_iso: reserva.fecha instanceof Date ? reserva.fecha.toISOString() : null
      },
      reserva_procesada_backend: {
        codigo: reservaProcesada.codigo_reserva,
        fecha_procesada: reservaProcesada.fecha,
        fecha_tipo: typeof reservaProcesada.fecha
      },
      simulacion_frontend: {
        formatearFechaParaAPI_result: simularFormatearFechaParaAPI(reserva.fecha),
        formatearFecha_result: simularFormatearFecha(reserva.fecha)
      },
      comparacion: {
        antes: reserva.fecha,
        despues_backend: reservaProcesada.fecha,
        despues_frontend: simularFormatearFechaParaAPI(reserva.fecha),
        cambio_backend: reserva.fecha !== reservaProcesada.fecha ? 'SÍ' : 'NO',
        cambio_frontend: reserva.fecha !== simularFormatearFechaParaAPI(reserva.fecha) ? 'SÍ' : 'NO'
      }
    };
    
    console.log('✅ DEBUG FRONTEND COMPLETADO:', result.comparacion);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error en debug frontend:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Función para simular formatearFechaParaAPI del frontend
function simularFormatearFechaParaAPI(fecha) {
  if (!fecha) return '';
  
  // Si ya es un string en formato YYYY-MM-DD, devolverlo tal como está
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }
  
  // Si es un objeto Date, convertirlo usando zona horaria local de Chile
  if (fecha instanceof Date) {
    // Usar toLocaleDateString con zona horaria de Chile para evitar problemas de UTC
    const fechaChile = new Date(fecha.toLocaleString("en-US", {timeZone: "America/Santiago"}));
    const year = fechaChile.getFullYear();
    const month = String(fechaChile.getMonth() + 1).padStart(2, '0');
    const day = String(fechaChile.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Si es un string que puede ser parseado como fecha
  if (typeof fecha === 'string') {
    // CORRECCIÓN: Para fechas simples YYYY-MM-DD, usar parsing local para evitar problemas de zona horaria
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Fecha simple YYYY-MM-DD - crear fecha local
      const [year, month, day] = fecha.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      if (!isNaN(dateObj.getTime())) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    } else {
      // CORRECCIÓN: Para fechas ISO UTC, usar métodos UTC para evitar problemas de zona horaria
      const dateObj = new Date(fecha);
      if (!isNaN(dateObj.getTime())) {
        // Si es una fecha ISO UTC (termina en Z), usar métodos UTC
        if (fecha.endsWith('Z') || fecha.includes('T')) {
          const year = dateObj.getUTCFullYear();
          const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } else {
          // Para otros formatos, usar conversión con zona horaria de Chile
          const fechaChile = new Date(dateObj.toLocaleString("en-US", {timeZone: "America/Santiago"}));
          const year = fechaChile.getFullYear();
          const month = String(fechaChile.getMonth() + 1).padStart(2, '0');
          const day = String(fechaChile.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }
  }
  
  return '';
}

// Función para simular formatearFecha del frontend
function simularFormatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  
  try {
    let fechaObj;
    
    // Si ya es un objeto Date, usarlo directamente
    if (fecha instanceof Date) {
      fechaObj = fecha;
    } else if (typeof fecha === 'string') {
      // Manejar fechas ISO (2025-09-08T00:00:00.000Z) y fechas simples (YYYY-MM-DD)
      if (fecha.includes('T')) {
        // CORRECCIÓN: Fecha ISO UTC del servidor - usar métodos UTC para evitar problemas de zona horaria
        const dateObj = new Date(fecha);
        if (!isNaN(dateObj.getTime())) {
          const año = dateObj.getUTCFullYear();
          const mes = dateObj.getUTCMonth();
          const dia = dateObj.getUTCDate();
          fechaObj = new Date(año, mes, dia); // Crear fecha local con componentes UTC
        } else {
          throw new Error('Fecha inválida');
        }
      } else {
        // Fecha simple (YYYY-MM-DD) - crear fecha local
        const [año, mes, dia] = fecha.split('-').map(Number);
        fechaObj = new Date(año, mes - 1, dia);
      }
    } else {
      // Intentar convertir a Date si es otro tipo
      fechaObj = new Date(fecha);
    }
    
    // Verificar que la fecha es válida
    if (isNaN(fechaObj.getTime())) {
      throw new Error('Fecha inválida');
    }
    
    return fechaObj.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formateando fecha:', error, 'Fecha original:', fecha);
    return 'Fecha inválida';
  }
}

// 🔍 ENDPOINT PARA VERIFICAR DATOS DEL PANEL DE ADMIN
app.get('/api/diagnostic/admin-reservas/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🔍 DIAGNÓSTICO PANEL ADMIN PARA RESERVA: ${codigo}`);
    
    // Simular exactamente la misma consulta que usa el panel de admin
    const reservas = await db.query(`
      SELECT r.*, c.nombre as cancha_nombre, 
             CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
             co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.codigo_reserva = $1
      ORDER BY r.fecha_creacion DESC
    `, [codigo]);
    
    if (reservas.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Reserva ${codigo} no encontrada`
      });
    }
    
    const reservaOriginal = reservas[0];
    
    // Aplicar exactamente el mismo procesamiento que usa el panel de admin
    const reservaProcesada = reservaOriginal;
    if (reservaProcesada.fecha) {
      if (typeof reservaProcesada.fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(reservaProcesada.fecha)) {
          // Fecha ya está en formato correcto
        } else {
          // Convertir fecha a formato YYYY-MM-DD usando métodos UTC para evitar problemas de zona horaria
          const fechaObj = new Date(reservaProcesada.fecha);
          if (!isNaN(fechaObj.getTime())) {
            const year = fechaObj.getUTCFullYear();
            const month = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(fechaObj.getUTCDate()).padStart(2, '0');
            reservaProcesada.fecha = `${year}-${month}-${day}`;
          }
        }
      }
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      reserva_original: {
        codigo: reservaOriginal.codigo_reserva,
        fecha_original: reservaOriginal.fecha,
        fecha_tipo: typeof reservaOriginal.fecha,
        fecha_string: reservaOriginal.fecha ? reservaOriginal.fecha.toString() : null
      },
      reserva_procesada: {
        codigo: reservaProcesada.codigo_reserva,
        fecha_procesada: reservaProcesada.fecha,
        fecha_tipo: typeof reservaProcesada.fecha
      },
      comparacion: {
        antes: reservaOriginal.fecha,
        despues: reservaProcesada.fecha,
        cambio: reservaOriginal.fecha !== reservaProcesada.fecha ? 'SÍ' : 'NO'
      }
    };
    
    console.log('✅ DIAGNÓSTICO PANEL ADMIN COMPLETADO:', result.comparacion);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error en diagnóstico panel admin:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔍 ENDPOINT ESPECÍFICO PARA PROBAR RESERVA TYUY16
app.get('/api/diagnostic/test-reserva/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🔍 DIAGNÓSTICO ESPECÍFICO PARA RESERVA: ${codigo}`);
    
    // Importar función de formateo de fechas
    const { formatDateForChile } = require('./src/utils/dateUtils');
    
    // 1. Obtener datos de la reserva
    const reservaResult = await db.query(`
      SELECT 
        r.*, 
        c.nombre as cancha_nombre, 
        co.nombre as complejo_nombre, 
        ci.nombre as ciudad_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      JOIN ciudades ci ON co.ciudad_id = ci.id
      WHERE r.codigo_reserva = $1
    `, [codigo]);
    
    if (reservaResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Reserva ${codigo} no encontrada`
      });
    }
    
    const reservaData = reservaResult[0];
    
    // 2. Probar diferentes formatos de fecha
    const fechaOriginal = reservaData.fecha;
    const fechaFormateada = formatDateForChile(fechaOriginal, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 3. Simular envío de email
    const emailData = {
      codigo_reserva: reservaData.codigo_reserva,
      email_cliente: reservaData.email_cliente,
      nombre_cliente: reservaData.nombre_cliente,
      complejo: reservaData.complejo_nombre,
      cancha: reservaData.cancha_nombre,
      fecha: reservaData.fecha,
      hora_inicio: reservaData.hora_inicio,
      hora_fin: reservaData.hora_fin,
      precio_total: reservaData.precio_total
    };
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      reserva: {
        codigo: reservaData.codigo_reserva,
        fecha_original: fechaOriginal,
        fecha_tipo: typeof fechaOriginal,
        fecha_formateada: fechaFormateada,
        email_data: emailData
      },
      analysis: {
        fecha_desde_bd: reservaData.fecha,
        fecha_para_email: emailData.fecha,
        fecha_formateada_final: fechaFormateada
      }
    };
    
    console.log('✅ DIAGNÓSTICO ESPECÍFICO COMPLETADO:', result.analysis);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error en diagnóstico específico:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔍 ENDPOINT DE DIAGNÓSTICO AUTOMATIZADO PARA FECHAS
app.get('/api/diagnostic/date-analysis', async (req, res) => {
  try {
    console.log('🔍 INICIANDO DIAGNÓSTICO AUTOMATIZADO DE FECHAS');
    
    // Importar función de formateo de fechas
    const { formatDateForChile } = require('./src/utils/dateUtils');
    
    // 1. Información del entorno
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      timezone: process.env.TZ || 'No configurado',
      databaseUrl: process.env.DATABASE_URL ? 'Configurado' : 'No configurado',
      timestamp: new Date().toISOString()
    };
    
    // 2. Información de zona horaria del sistema
    const timezoneInfo = getTimezoneInfo();
    
    // 3. Verificar zona horaria de PostgreSQL
    let postgresTimezone = null;
    let postgresCurrentTime = null;
    try {
      const timezoneResult = await db.query("SHOW timezone");
      postgresTimezone = timezoneResult[0]?.timezone;
      
      const currentTimeResult = await db.query("SELECT NOW() as current_time, CURRENT_DATE as current_date, CURRENT_TIMESTAMP as current_timestamp");
      postgresCurrentTime = currentTimeResult[0];
    } catch (error) {
      console.error('Error obteniendo info de PostgreSQL:', error.message);
    }
    
    // 4. Buscar la reserva específica WZH24I
    let reservaWZH24I = null;
    try {
      const reservaResult = await db.query(`
        SELECT 
          codigo_reserva,
          fecha,
          fecha::text as fecha_text,
          fecha::timestamp as fecha_timestamp,
          fecha::timestamp with time zone as fecha_timestamp_tz,
          EXTRACT(timezone_hour FROM fecha::timestamp with time zone) as timezone_offset_hours,
          created_at,
          created_at::text as created_at_text
        FROM reservas 
        WHERE codigo_reserva = 'WZH24I'
      `);
      
      if (reservaResult.length > 0) {
        reservaWZH24I = reservaResult[0];
      }
    } catch (error) {
      console.error('Error obteniendo reserva WZH24I:', error.message);
    }
    
    // 5. Probar formateo de fecha específica
    let dateFormattingTest = null;
    if (reservaWZH24I) {
      try {
        const fechaOriginal = reservaWZH24I.fecha;
        const fechaFormateada = formatDateForChile(fechaOriginal, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        dateFormattingTest = {
          fecha_original: fechaOriginal,
          fecha_tipo: typeof fechaOriginal,
          fecha_formateada: fechaFormateada,
          fecha_text: reservaWZH24I.fecha_text,
          fecha_timestamp: reservaWZH24I.fecha_timestamp,
          fecha_timestamp_tz: reservaWZH24I.fecha_timestamp_tz
        };
      } catch (error) {
        console.error('Error en formateo de fecha:', error.message);
      }
    }
    
    // 6. Probar con fechas de control
    const controlDates = ['2025-09-30', '2025-01-30', '2025-12-31'];
    const controlTests = controlDates.map(date => {
      try {
        const formatted = formatDateForChile(date, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return {
          input: date,
          output: formatted,
          success: true
        };
      } catch (error) {
        return {
          input: date,
          output: null,
          success: false,
          error: error.message
        };
      }
    });
    
    // 7. Información de la base de datos
    const dbInfo = db.getDatabaseInfo();
    
    const diagnosticResult = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: environmentInfo,
      systemTimezone: timezoneInfo,
      postgresql: {
        timezone: postgresTimezone,
        currentTime: postgresCurrentTime
      },
      databaseInfo: dbInfo,
      reservaWZH24I: reservaWZH24I,
      dateFormattingTest: dateFormattingTest,
      controlTests: controlTests,
      summary: {
        hasReservaWZH24I: !!reservaWZH24I,
        postgresTimezoneConfigured: postgresTimezone === 'America/Santiago',
        systemInChile: timezoneInfo.isSystemInChile,
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    console.log('✅ DIAGNÓSTICO COMPLETADO:', diagnosticResult.summary);
    
    res.json(diagnosticResult);
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===== ENDPOINT PARA ACTUALIZAR MAGNASPORTS EN PRODUCCIÓN =====
app.get('/api/debug/update-magnasports', async (req, res) => {
  try {
    console.log('🔄 Ejecutando actualización de MagnaSports a Complejo En Desarrollo...');
    
    const updateMagnasports = require('./scripts/update-magnasports-endpoint');
    const result = await updateMagnasports();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'MagnaSports actualizado exitosamente a Complejo En Desarrollo',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error actualizando MagnaSports',
        error: result.error || result.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error en endpoint update-magnasports:', error);
    res.status(500).json({
      success: false,
      message: 'Error ejecutando actualización',
      error: error.message
    });
  }
});

// ===== ENDPOINT TEMPORAL PARA CREAR USUARIOS COMPLEJO DEMO 3 =====
app.get('/api/admin/create-demo3-users', async (req, res) => {
  try {
    console.log('🏟️ Creando usuarios para Complejo Demo 3...');
    
    // Verificar que el complejo Demo 3 existe
    const complejoResult = await db.query('SELECT id, nombre FROM complejos WHERE nombre = $1', ['Complejo Demo 3']);
    
    if (complejoResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complejo Demo 3 no encontrado en la base de datos'
      });
    }

    const complejoId = complejoResult[0].id;
    console.log(`✅ Complejo Demo 3 encontrado: ID ${complejoId}`);

    // Verificar usuarios existentes (todos los usuarios del complejo)
    const allUsers = await db.query(
      'SELECT email, rol, nombre, activo FROM usuarios WHERE complejo_id = $1 ORDER BY rol, email',
      [complejoId]
    );

    console.log(`🔍 Usuarios existentes en Complejo Demo 3: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.rol})`);
    });

    // Verificar si los usuarios específicos ya existen
    const targetUsers = await db.query(
      'SELECT email, rol FROM usuarios WHERE email IN ($1, $2)',
      ['owner@complejodemo3.cl', 'manager@complejodemo3.cl']
    );

    console.log(`🔍 Usuarios objetivo encontrados: ${targetUsers.length}`);
    const results = [];

    // Crear usuario Owner
    const ownerEmail = 'owner@complejodemo3.cl';
    const ownerPassword = 'Owner1234!';
    const ownerExists = targetUsers.find(u => u.email === ownerEmail);

    if (ownerExists) {
      console.log(`⚠️ Usuario Owner ya existe: ${ownerEmail}`);
      results.push({ email: ownerEmail, status: 'already_exists', rol: 'owner' });
    } else {
      console.log('👤 Creando usuario Owner...');
      await db.run(`
        INSERT INTO usuarios (email, password, rol, complejo_id, nombre, activo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        ownerEmail,
        ownerPassword,
        'owner',
        complejoId,
        'Owner Complejo Demo 3',
        true
      ]);
      console.log(`✅ Usuario Owner creado: ${ownerEmail}`);
      results.push({ email: ownerEmail, status: 'created', rol: 'owner' });
    }

    // Crear usuario Manager
    const managerEmail = 'manager@complejodemo3.cl';
    const managerPassword = 'Manager1234!';
    const managerExists = targetUsers.find(u => u.email === managerEmail);

    if (managerExists) {
      console.log(`⚠️ Usuario Manager ya existe: ${managerEmail}`);
      results.push({ email: managerEmail, status: 'already_exists', rol: 'manager' });
    } else {
      console.log('👤 Creando usuario Manager...');
      await db.run(`
        INSERT INTO usuarios (email, password, rol, complejo_id, nombre, activo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        managerEmail,
        managerPassword,
        'manager',
        complejoId,
        'Manager Complejo Demo 3',
        true
      ]);
      console.log(`✅ Usuario Manager creado: ${managerEmail}`);
      results.push({ email: managerEmail, status: 'created', rol: 'manager' });
    }

    // Verificar usuarios finales
    const finalUsers = await db.query(
      'SELECT email, rol, nombre, activo FROM usuarios WHERE complejo_id = $1 ORDER BY rol, email',
      [complejoId]
    );

    console.log(`📊 Total usuarios en Complejo Demo 3: ${finalUsers.length}`);

    res.json({
      success: true,
      message: 'Usuarios del Complejo Demo 3 procesados exitosamente',
      complejo: {
        id: complejoId,
        nombre: 'Complejo Demo 3'
      },
      existingUsers: allUsers,
      results: results,
      totalUsers: finalUsers.length,
      users: finalUsers,
      credentials: {
        owner: 'owner@complejodemo3.cl / Owner1234!',
        manager: 'manager@complejodemo3.cl / Manager1234!'
      }
    });

  } catch (error) {
    console.error('❌ Error creando usuarios Demo 3:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando usuarios del Complejo Demo 3',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑAS DE USUARIOS DEMO 3 =====
app.get('/api/admin/update-demo3-passwords', async (req, res) => {
  try {
    console.log('🔐 Actualizando contraseñas de usuarios Demo 3...');
    
    // Hashear las contraseñas
    const ownerPassword = await bcrypt.hash('Owner1234!', 12);
    const managerPassword = await bcrypt.hash('Manager1234!', 12);
    
    // Actualizar contraseña del owner
    await db.run(
      'UPDATE usuarios SET password = $1 WHERE email = $2',
      [ownerPassword, 'owner@complejodemo3.cl']
    );
    console.log('✅ Contraseña del owner actualizada');
    
    // Actualizar contraseña del manager
    await db.run(
      'UPDATE usuarios SET password = $1 WHERE email = $2',
      [managerPassword, 'manager@complejodemo3.cl']
    );
    console.log('✅ Contraseña del manager actualizada');
    
    // Verificar usuarios actualizados
    const users = await db.query(
      'SELECT email, rol, nombre, activo FROM usuarios WHERE email IN ($1, $2) ORDER BY rol, email',
      ['owner@complejodemo3.cl', 'manager@complejodemo3.cl']
    );
    
    res.json({
      success: true,
      message: 'Contraseñas de usuarios Demo 3 actualizadas exitosamente',
      users: users,
      credentials: {
        owner: 'owner@complejodemo3.cl / Owner1234!',
        manager: 'manager@complejodemo3.cl / Manager1234!'
      }
    });
    
  } catch (error) {
    console.error('❌ Error actualizando contraseñas:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando contraseñas de usuarios Demo 3',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA LIMPIAR BLOQUEOS TEMPORALES PROBLEMÁTICOS =====
app.get('/api/admin/limpiar-bloqueos-demo3', async (req, res) => {
  try {
    console.log('🧹 Limpiando bloqueos temporales problemáticos...');
    
    // 1. Verificar canchas del Complejo Demo 3
    const canchasDemo3 = await db.query(`
      SELECT c.id, c.nombre, c.tipo 
      FROM canchas c 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE co.nombre = $1 
      ORDER BY c.id
    `, ['Complejo Demo 3']);

    console.log(`🏟️ Canchas del Complejo Demo 3: ${canchasDemo3.length}`);
    const canchaIds = canchasDemo3.map(c => c.id);
    console.log(`🔍 IDs de canchas: ${canchaIds.join(', ')}`);

    // 2. Verificar bloqueos temporales para estas canchas
    const bloqueos = await db.query(`
      SELECT id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en 
      FROM bloqueos_temporales 
      WHERE cancha_id = ANY($1) 
      ORDER BY fecha, cancha_id
    `, [canchaIds]);

    console.log(`📊 Bloqueos encontrados: ${bloqueos.length}`);

    // 3. Identificar bloqueos problemáticos (que cubren todo el día)
    const bloqueosProblematicos = bloqueos.filter(b => 
      b.hora_inicio === '00:00:00' && b.hora_fin === '23:59:59'
    );

    console.log(`🚨 Bloqueos problemáticos: ${bloqueosProblematicos.length}`);

    // 4. Eliminar bloqueos problemáticos
    let eliminados = 0;
    for (const bloqueo of bloqueosProblematicos) {
      await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo.id]);
      eliminados++;
      console.log(`   ✅ Eliminado: ${bloqueo.id}`);
    }

    // 5. Verificar bloqueos restantes
    const bloqueosRestantes = await db.query(`
      SELECT COUNT(*) as total 
      FROM bloqueos_temporales 
      WHERE cancha_id = ANY($1)
    `, [canchaIds]);

    // 6. Verificar IDs duplicados en canchas
    const idsDuplicados = await db.query(`
      SELECT id, COUNT(*) as count 
      FROM canchas 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);

    res.json({
      success: true,
      message: 'Limpieza de bloqueos completada',
      complejo: 'Complejo Demo 3',
      canchas: canchasDemo3,
      bloqueosEncontrados: bloqueos.length,
      bloqueosProblematicos: bloqueosProblematicos.length,
      bloqueosEliminados: eliminados,
      bloqueosRestantes: parseInt(bloqueosRestantes[0].total),
      idsDuplicados: idsDuplicados.length,
      detallesIdsDuplicados: idsDuplicados
    });

  } catch (error) {
    console.error('❌ Error limpiando bloqueos:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando bloqueos temporales',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA CORREGIR IDs DUPLICADOS DE CANCHAS =====
app.get('/api/admin/corregir-ids-duplicados', async (req, res) => {
  try {
    console.log('🔧 Corrigiendo IDs duplicados de canchas...');
    
    // 1. Verificar IDs duplicados
    const idsDuplicados = await db.query(`
      SELECT id, COUNT(*) as count 
      FROM canchas 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);

    console.log(`🔍 IDs duplicados encontrados: ${idsDuplicados.length}`);
    
    if (idsDuplicados.length === 0) {
      return res.json({
        success: true,
        message: 'No hay IDs duplicados en canchas',
        idsDuplicados: 0
      });
    }

    // 2. Mostrar detalles de los IDs duplicados
    const detallesDuplicados = [];
    for (const dup of idsDuplicados) {
      const canchas = await db.query(`
        SELECT c.id, c.nombre, c.tipo, c.complejo_id, co.nombre as complejo_nombre 
        FROM canchas c 
        JOIN complejos co ON c.complejo_id = co.id 
        WHERE c.id = $1 
        ORDER BY c.complejo_id
      `, [dup.id]);
      
      detallesDuplicados.push({
        id: dup.id,
        count: dup.count,
        canchas: canchas
      });
    }

    // 3. Corregir IDs duplicados del Complejo Demo 3
    let canchasCorregidas = 0;
    const correcciones = [];
    
    for (const dup of detallesDuplicados) {
      if (dup.id === 6) { // ID duplicado específico
        // Buscar la cancha del Complejo Demo 3 (ID 8)
        const canchaDemo3 = dup.canchas.find(c => c.complejo_id === 8);
        if (canchaDemo3) {
          // Asignar nuevo ID único (11)
          await db.run('UPDATE canchas SET id = $1 WHERE id = $2 AND complejo_id = $3', [11, 6, 8]);
          canchasCorregidas++;
          correcciones.push({
            cancha: canchaDemo3.nombre,
            complejo: canchaDemo3.complejo_nombre,
            id_anterior: 6,
            id_nuevo: 11
          });
          console.log(`✅ Cancha "${canchaDemo3.nombre}" del ${canchaDemo3.complejo_nombre} actualizada: ID ${6} → ${11}`);
        }
      }
    }

    // 4. Verificar IDs duplicados restantes
    const idsDuplicadosRestantes = await db.query(`
      SELECT id, COUNT(*) as count 
      FROM canchas 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);

    res.json({
      success: true,
      message: 'Corrección de IDs duplicados completada',
      idsDuplicadosIniciales: idsDuplicados.length,
      canchasCorregidas: canchasCorregidas,
      correcciones: correcciones,
      idsDuplicadosRestantes: idsDuplicadosRestantes.length,
      detallesDuplicadosRestantes: idsDuplicadosRestantes
    });

  } catch (error) {
    console.error('❌ Error corrigiendo IDs duplicados:', error);
    res.status(500).json({
      success: false,
      message: 'Error corrigiendo IDs duplicados',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA LIMPIAR BLOQUEOS PROBLEMÁTICOS EN PRODUCCIÓN =====
app.get('/api/admin/limpiar-bloqueos-produccion', async (req, res) => {
  try {
    console.log('🧹 Limpiando bloqueos problemáticos en producción...');
    
    // 1. Verificar bloqueos que cubren todo el día (00:00:00 a 23:59:59)
    const bloqueosProblematicos = await db.query(`
      SELECT id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en 
      FROM bloqueos_temporales 
      WHERE hora_inicio = '00:00:00' AND hora_fin = '23:59:59'
      ORDER BY cancha_id, fecha
    `);

    console.log(`🚨 Bloqueos problemáticos encontrados: ${bloqueosProblematicos.length}`);
    
    // 2. Mostrar detalles de los bloqueos problemáticos
    bloqueosProblematicos.forEach(bloqueo => {
      console.log(`   ${bloqueo.id}: Cancha ${bloqueo.cancha_id} - ${bloqueo.fecha} (${bloqueo.hora_inicio} - ${bloqueo.hora_fin})`);
    });

    // 3. Eliminar todos los bloqueos problemáticos
    let eliminados = 0;
    for (const bloqueo of bloqueosProblematicos) {
      await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo.id]);
      eliminados++;
      console.log(`   ✅ Eliminado: ${bloqueo.id}`);
    }

    // 4. Verificar IDs duplicados en canchas
    const idsDuplicados = await db.query(`
      SELECT id, COUNT(*) as count 
      FROM canchas 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);

    console.log(`🔍 IDs duplicados en canchas: ${idsDuplicados.length}`);
    idsDuplicados.forEach(dup => {
      console.log(`   ID ${dup.id}: ${dup.count} canchas`);
    });

    res.json({
      success: true,
      message: 'Limpieza de bloqueos problemáticos completada',
      bloqueosProblematicosEncontrados: bloqueosProblematicos.length,
      bloqueosEliminados: eliminados,
      idsDuplicados: idsDuplicados.length,
      detallesIdsDuplicados: idsDuplicados,
      detallesBloqueosEliminados: bloqueosProblematicos
    });

  } catch (error) {
    console.error('❌ Error limpiando bloqueos problemáticos:', error);
    res.status(500).json({
      success: false,
      message: 'Error limpiando bloqueos problemáticos',
      error: error.message
    });
  }
});

// ===== ENDPOINT DE PRUEBA PARA VERIFICAR AUTENTICACIÓN =====
app.get('/api/admin/test-auth', authenticateToken, (req, res) => {
  try {
    console.log('🔐 Prueba de autenticación...');
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol, 'Complejo:', req.user.complejo_id);
    
    res.json({
      success: true,
      message: 'Autenticación exitosa',
      user: {
        email: req.user.email,
        rol: req.user.rol,
        complejo_id: req.user.complejo_id
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en prueba de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en prueba de autenticación',
      error: error.message
    });
  }
});

// ===== ENDPOINT DE DEBUG PARA VERIFICAR PERMISOS DE CANCHAS =====
app.get('/api/admin/debug-court-permissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Debug de permisos para cancha ID:', id);
    console.log('👤 Usuario:', req.user.email, 'Rol:', req.user.rol, 'Complejo ID:', req.user.complejo_id);
    
    // Verificar que la cancha existe
    const canchaExistente = await db.query('SELECT * FROM canchas WHERE id = $1', [id]);
    if (canchaExistente.length === 0) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    
    const cancha = canchaExistente[0];
    console.log('🏟️ Cancha encontrada:', cancha.nombre, 'Complejo ID:', cancha.complejo_id);
    
    // Verificar tipos de datos
    const userComplejoId = req.user.complejo_id;
    const canchaComplejoId = cancha.complejo_id;
    const userComplejoIdType = typeof userComplejoId;
    const canchaComplejoIdType = typeof canchaComplejoId;
    
    console.log('🔍 Tipos de datos:');
    console.log('   Usuario complejo_id:', userComplejoId, '(' + userComplejoIdType + ')');
    console.log('   Cancha complejo_id:', canchaComplejoId, '(' + canchaComplejoIdType + ')');
    
    // Verificar comparaciones
    const strictEqual = userComplejoId === canchaComplejoId;
    const looseEqual = userComplejoId == canchaComplejoId;
    const parseIntEqual = parseInt(userComplejoId) === parseInt(canchaComplejoId);
    
    console.log('🔍 Comparaciones:');
    console.log('   === (strict):', strictEqual);
    console.log('   == (loose):', looseEqual);
    console.log('   parseInt ===:', parseIntEqual);
    
    res.json({
      success: true,
      message: 'Debug de permisos completado',
      user: {
        email: req.user.email,
        rol: req.user.rol,
        complejo_id: userComplejoId,
        complejo_id_type: userComplejoIdType
      },
      cancha: {
        id: cancha.id,
        nombre: cancha.nombre,
        complejo_id: canchaComplejoId,
        complejo_id_type: canchaComplejoIdType
      },
      comparisons: {
        strict_equal: strictEqual,
        loose_equal: looseEqual,
        parseInt_equal: parseIntEqual
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en debug de permisos:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug de permisos',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA CREAR CATEGORÍAS FINANCIERAS DEL COMPLEJO DEMO 3 =====
app.get('/api/admin/crear-categorias-demo3', authenticateToken, async (req, res) => {
  try {
    console.log('🏗️ Creando categorías financieras para Complejo Demo 3...');
    
    // Verificar que el usuario pertenece al Complejo Demo 3
    if (req.user.complejo_id !== 8) {
      return res.status(403).json({ error: 'Solo usuarios del Complejo Demo 3 pueden ejecutar esta acción' });
    }
    
    const complejoId = req.user.complejo_id;
    console.log(`🔍 Creando categorías para complejo ID: ${complejoId}`);
    
    // Verificar categorías existentes
    const categoriasExistentes = await db.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [complejoId]);
    
    console.log(`📊 Categorías existentes: ${categoriasExistentes.length}`);
    
    // Categorías necesarias para el sistema de reservas
    const categoriasNecesarias = [
      { nombre: 'Reservas Web', tipo: 'ingreso' },
      { nombre: 'Comisión Plataforma', tipo: 'gasto' }
    ];
    
    const categoriasCreadas = [];
    const categoriasExistentesNombres = categoriasExistentes.map(c => c.nombre);
    
    for (const categoria of categoriasNecesarias) {
      if (!categoriasExistentesNombres.includes(categoria.nombre)) {
        console.log(`➕ Creando categoría: ${categoria.nombre} (${categoria.tipo})`);
        
        await db.run(`
          INSERT INTO categorias_gastos (complejo_id, nombre, tipo, descripcion)
          VALUES ($1, $2, $3, $4)
        `, [
          complejoId,
          categoria.nombre,
          categoria.tipo,
          `Categoría automática para ${categoria.nombre}`
        ]);
        
        categoriasCreadas.push(categoria);
        console.log(`✅ Categoría creada: ${categoria.nombre}`);
      } else {
        console.log(`⚠️ Categoría ya existe: ${categoria.nombre}`);
      }
    }
    
    // Verificar categorías finales
    const categoriasFinales = await db.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [complejoId]);
    
    res.json({
      success: true,
      message: 'Categorías financieras procesadas exitosamente',
      complejo_id: complejoId,
      categorias_creadas: categoriasCreadas,
      categorias_existentes_iniciales: categoriasExistentes.length,
      categorias_finales: categoriasFinales.length,
      categorias: categoriasFinales
    });
    
  } catch (error) {
    console.error('❌ Error creando categorías financieras:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando categorías financieras',
      error: error.message
    });
  }
});

// ===== ENDPOINT PARA REGISTRAR MOVIMIENTOS FINANCIEROS MANUALMENTE =====
app.get('/api/admin/registrar-movimientos-manual/:codigoReserva', authenticateToken, async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    console.log('💰 Registrando movimientos financieros manualmente para reserva:', codigoReserva);
    
    // 1. Buscar la reserva
    const reserva = await db.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE r.codigo_reserva = $1
    `, [codigoReserva]);
    
    if (reserva.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    const reservaInfo = reserva[0];
    console.log('📋 Reserva encontrada:', {
      codigo: reservaInfo.codigo_reserva,
      estado: reservaInfo.estado,
      precio_total: reservaInfo.precio_total,
      comision_aplicada: reservaInfo.comision_aplicada,
      complejo_id: reservaInfo.complejo_id
    });
    
    // 2. Buscar categorías financieras del complejo
    const categorias = await db.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [reservaInfo.complejo_id]);
    
    console.log('📊 Categorías encontradas:', categorias.length);
    
    if (categorias.length === 0) {
      return res.status(400).json({ 
        error: 'No hay categorías financieras configuradas para este complejo',
        complejo_id: reservaInfo.complejo_id
      });
    }
    
    // 3. Buscar categorías específicas
    const categoriaIngreso = categorias.find(c => c.nombre === 'Reservas Web' && c.tipo === 'ingreso');
    const categoriaEgreso = categorias.find(c => c.nombre === 'Comisión Plataforma' && c.tipo === 'gasto');
    
    if (!categoriaIngreso || !categoriaEgreso) {
      return res.status(400).json({ 
        error: 'Categorías financieras incompletas',
        categorias_encontradas: categorias.map(c => ({ nombre: c.nombre, tipo: c.tipo })),
        categoria_ingreso_encontrada: !!categoriaIngreso,
        categoria_egreso_encontrada: !!categoriaEgreso
      });
    }
    
    // 4. Registrar movimientos financieros
    const fechaReserva = new Date(reservaInfo.fecha);
    const montoReserva = parseFloat(reservaInfo.precio_total);
    const comision = parseFloat(reservaInfo.comision_aplicada) || 0;
    
    const movimientosCreados = [];
    
    // Ingreso por reserva
    const ingresoResult = await db.run(`
      INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, monto, descripcion
    `, [
      reservaInfo.complejo_id, 
      categoriaIngreso.id, 
      'ingreso', 
      montoReserva, 
      fechaReserva,
      `Reserva ${reservaInfo.codigo_reserva} - ${reservaInfo.nombre_cliente}`, 
      'Web'
    ]);
    
    movimientosCreados.push({
      tipo: 'ingreso',
      monto: montoReserva,
      descripcion: ingresoResult.descripcion,
      id: ingresoResult.id
    });
    
    console.log('✅ Ingreso registrado:', montoReserva);
    
    // Egreso por comisión (si existe)
    if (comision > 0) {
      const egresoResult = await db.run(`
        INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, monto, descripcion
      `, [
        reservaInfo.complejo_id, 
        categoriaEgreso.id, 
        'gasto', 
        comision, 
        fechaReserva,
        `Comisión plataforma - Reserva ${reservaInfo.codigo_reserva}`, 
        'Automático'
      ]);
      
      movimientosCreados.push({
        tipo: 'gasto',
        monto: comision,
        descripcion: egresoResult.descripcion,
        id: egresoResult.id
      });
      
      console.log('✅ Egreso por comisión registrado:', comision);
    }
    
    res.json({
      success: true,
      message: 'Movimientos financieros registrados exitosamente',
      reserva: {
        codigo: reservaInfo.codigo_reserva,
        estado: reservaInfo.estado,
        precio_total: reservaInfo.precio_total,
        comision_aplicada: reservaInfo.comision_aplicada,
        complejo_id: reservaInfo.complejo_id
      },
      movimientos_creados: movimientosCreados,
      total_movimientos: movimientosCreados.length
    });
    
  } catch (error) {
    console.error('❌ Error registrando movimientos financieros:', error);
    res.status(500).json({
      success: false,
      message: 'Error registrando movimientos financieros',
      error: error.message
    });
  }
});

// ===== ENDPOINT TEMPORAL PARA DEBUG DE MOVIMIENTOS FINANCIEROS =====
app.get('/api/admin/debug-movimientos-financieros/:codigoReserva', authenticateToken, async (req, res) => {
  try {
    const { codigoReserva } = req.params;
    console.log('🔍 Debug de movimientos financieros para reserva:', codigoReserva);
    
    // 1. Buscar la reserva
    const reserva = await db.query(`
      SELECT r.*, c.complejo_id, co.nombre as complejo_nombre 
      FROM reservas r 
      JOIN canchas c ON r.cancha_id = c.id 
      JOIN complejos co ON c.complejo_id = co.id 
      WHERE r.codigo_reserva = $1
    `, [codigoReserva]);
    
    if (reserva.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    
    const reservaInfo = reserva[0];
    console.log('📋 Reserva encontrada:', {
      codigo: reservaInfo.codigo_reserva,
      estado: reservaInfo.estado,
      precio_total: reservaInfo.precio_total,
      comision_aplicada: reservaInfo.comision_aplicada,
      complejo_id: reservaInfo.complejo_id
    });
    
    // 2. Buscar movimientos financieros asociados
    const movimientos = await db.query(`
      SELECT gi.*, cg.nombre as categoria_nombre, cg.tipo as categoria_tipo
      FROM gastos_ingresos gi
      JOIN categorias_gastos cg ON gi.categoria_id = cg.id
      WHERE gi.complejo_id = $1 
      AND gi.descripcion LIKE $2
      ORDER BY gi.fecha DESC
    `, [reservaInfo.complejo_id, `%${codigoReserva}%`]);
    
    console.log('💰 Movimientos encontrados:', movimientos.length);
    
    // 3. Buscar categorías financieras del complejo
    const categorias = await db.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [reservaInfo.complejo_id]);
    
    console.log('📊 Categorías del complejo:', categorias.length);
    
    res.json({
      success: true,
      reserva: {
        codigo: reservaInfo.codigo_reserva,
        estado: reservaInfo.estado,
        precio_total: reservaInfo.precio_total,
        comision_aplicada: reservaInfo.comision_aplicada,
        complejo_id: reservaInfo.complejo_id,
        complejo_nombre: reservaInfo.complejo_nombre
      },
      movimientos: movimientos,
      categorias: categorias,
      total_movimientos: movimientos.length
    });
    
  } catch (error) {
    console.error('❌ Error en debug de movimientos financieros:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando movimientos financieros',
      error: error.message
    });
  }
});

// ===== MIDDLEWARE DE ARCHIVOS ESTÁTICOS =====
// IMPORTANTE: Este middleware debe ir DESPUÉS de todas las rutas de API
// para evitar que intercepte las peticiones a /api/*
// Servir archivos estáticos con caché optimizado
app.use(express.static('public', {
  maxAge: '1d', // Cache por 1 día
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Cache más largo para assets estáticos
    if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
    }
    // Cache más corto para HTML
    if (path.match(/\.html$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
    }
  }
}));

// ===== RUTA CATCH-ALL PARA SERVIR EL FRONTEND =====
// Esta ruta es crítica para servir index.html cuando se accede a la raíz del sitio
app.get('*', (req, res) => {
  // Si la ruta es para archivos estáticos (CSS, JS, imágenes), devolver 404
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  
  // Para todas las demás rutas, servir index.html (SPA routing)
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== INICIO DEL SERVIDOR =====
// El servidor ya se inicia en la línea 2516, no duplicar aquí

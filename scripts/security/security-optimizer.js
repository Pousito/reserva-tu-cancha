/**
 * Optimizador de Seguridad - Sistema Avanzado
 * Implementa mejoras de seguridad para el sistema de reservas
 */

const fs = require('fs');
const path = require('path');

class SecurityOptimizer {
  constructor() {
    this.serverPath = path.join(__dirname, '../../server.js');
    this.backupPath = path.join(__dirname, '../../server.js.backup-security');
  }

  async optimize() {
    console.log('🔒 Optimizando seguridad del sistema...');
    
    try {
      // Crear backup
      await this.createBackup();
      
      // Aplicar optimizaciones de seguridad
      await this.installSecurityDependencies();
      await this.createSecurityMiddleware();
      await this.implementInputValidation();
      await this.addSecurityHeaders();
      await this.createSecurityConfig();
      
      console.log('✅ Optimización de seguridad completada');
      
    } catch (error) {
      console.error('❌ Error en optimización de seguridad:', error.message);
      await this.restoreBackup();
      throw error;
    }
  }

  async createBackup() {
    console.log('📋 Creando backup del servidor...');
    const serverContent = fs.readFileSync(this.serverPath, 'utf8');
    fs.writeFileSync(this.backupPath, serverContent);
    console.log('✅ Backup creado en:', this.backupPath);
  }

  async restoreBackup() {
    console.log('🔄 Restaurando backup...');
    const backupContent = fs.readFileSync(this.backupPath, 'utf8');
    fs.writeFileSync(this.serverPath, backupContent);
    console.log('✅ Backup restaurado');
  }

  async installSecurityDependencies() {
    console.log('📦 Instalando dependencias de seguridad...');
    
    const dependencies = [
      'helmet',
      'express-rate-limit',
      'express-validator',
      'bcryptjs',
      'jsonwebtoken',
      'cors',
      'express-slow-down',
      'express-brute',
      'express-brute-redis',
      'express-mongo-sanitize',
      'xss-clean',
      'hpp'
    ];

    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Agregar dependencias
    dependencies.forEach(dep => {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = '^latest';
      }
    });

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Dependencias de seguridad agregadas al package.json');
  }

  async createSecurityMiddleware() {
    console.log('🛡️ Creando middleware de seguridad avanzado...');
    
    const securityMiddleware = `
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

// Rate limiting avanzado
const createAdvancedRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn('🚨 Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiters específicos
const authLimiter = createAdvancedRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // 5 intentos
  'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
);

const apiLimiter = createAdvancedRateLimit(
  15 * 60 * 1000, // 15 minutos
  100, // 100 requests por ventana
  'Demasiadas solicitudes a la API. Intenta de nuevo más tarde.'
);

const reservationLimiter = createAdvancedRateLimit(
  60 * 1000, // 1 minuto
  5, // 5 reservas por minuto
  'Demasiadas reservas. Intenta de nuevo en 1 minuto.'
);

const paymentLimiter = createAdvancedRateLimit(
  5 * 60 * 1000, // 5 minutos
  3, // 3 intentos de pago por 5 minutos
  'Demasiados intentos de pago. Intenta de nuevo en 5 minutos.'
);

// Slow down para prevenir ataques automatizados
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Permitir 50 requests por IP por ventana
  delayMs: 500 // Agregar 500ms de delay después del límite
});

// Middleware de seguridad principal
const securityMiddleware = (app) => {
  // 1. Helmet para headers de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.transbank.cl"],
        frameSrc: ["'self'", "https://api.transbank.cl"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // 2. Sanitización de datos
  app.use(mongoSanitize()); // Prevenir NoSQL injection
  app.use(xss()); // Prevenir XSS
  app.use(hpp()); // Prevenir HTTP Parameter Pollution

  // 3. Rate limiting
  app.use('/api/auth', authLimiter);
  app.use('/api/reservas', reservationLimiter);
  app.use('/api/pagos', paymentLimiter);
  app.use('/api', apiLimiter);
  app.use(speedLimiter);

  // 4. Validación de tamaño de requests
  app.use((req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB
      return res.status(413).json({
        error: 'Payload too large',
        message: 'El contenido de la solicitud excede el límite permitido'
      });
    }
    next();
  });

  // 5. Detección de patrones sospechosos
  app.use((req, res, next) => {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script[^>]*>.*?<\/script>/gi, // XSS
      /javascript:/gi, // JavaScript en URLs
      /union\s+select/gi, // SQL injection
      /drop\s+table/gi, // SQL injection
      /insert\s+into/gi, // SQL injection
      /delete\s+from/gi, // SQL injection
      /update\s+set/gi, // SQL injection
      /exec\s*\(/gi, // Command injection
      /eval\s*\(/gi, // Code injection
      /<iframe/gi, // Iframe injection
      /onload\s*=/gi, // Event handler injection
      /onerror\s*=/gi, // Event handler injection
    ];

    const checkSuspicious = (input) => {
      if (typeof input === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(input));
      }
      if (typeof input === 'object' && input !== null) {
        return Object.values(input).some(value => checkSuspicious(value));
      }
      return false;
    };

    const isSuspicious = checkSuspicious(req.url) || 
                        checkSuspicious(req.body) || 
                        checkSuspicious(req.query) ||
                        checkSuspicious(req.params);

    if (isSuspicious) {
      console.warn('🚨 Suspicious request detected:', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
      });
      
      return res.status(400).json({
        error: 'Suspicious request detected',
        message: 'La solicitud contiene patrones sospechosos'
      });
    }

    next();
  });

  // 6. Logging de seguridad
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log requests importantes
      if (res.statusCode >= 400 || duration > 5000) {
        console.warn('⚠️ Slow or error request:', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: \`\${duration}ms\`,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  });

  return {
    authLimiter,
    apiLimiter,
    reservationLimiter,
    paymentLimiter
  };
};

// Validadores de entrada
const validateReservation = [
  body('nombre').trim().isLength({ min: 2, max: 50 }).escape(),
  body('telefono').trim().isMobilePhone('es-CL'),
  body('rut').trim().matches(/^[0-9]+-[0-9kK]$/),
  body('email').trim().isEmail().normalizeEmail(),
  body('cancha_id').isInt({ min: 1 }),
  body('fecha').isISO8601().toDate(),
  body('hora_inicio').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('hora_fin').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validatePayment = [
  body('monto').isFloat({ min: 0 }),
  body('metodo_pago').isIn(['webpay', 'transferencia']),
  body('reserva_id').isInt({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  securityMiddleware,
  validateReservation,
  validatePayment,
  authLimiter,
  apiLimiter,
  reservationLimiter,
  paymentLimiter
};
`;

    const middlewarePath = path.join(__dirname, '../../src/middleware/advanced-security.js');
    fs.writeFileSync(middlewarePath, securityMiddleware);
    console.log('✅ Middleware de seguridad avanzado creado');
  }

  async implementInputValidation() {
    console.log('🔍 Implementando validación de entrada avanzada...');
    
    const validationUtils = `
const validator = require('express-validator');
const { body, param, query, validationResult } = validator;

// Utilidades de validación
const validateRUT = (rut) => {
  if (!/^[0-9]+-[0-9kK]$/.test(rut)) return false;
  
  const [numero, dv] = rut.split('-');
  const dvCalculado = calcularDigitoVerificador(numero);
  
  return dv.toUpperCase() === dvCalculado;
};

const calcularDigitoVerificador = (numero) => {
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
};

// Validadores específicos
const validateReservationInput = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .escape(),
  
  body('telefono')
    .trim()
    .isMobilePhone('es-CL')
    .withMessage('El teléfono debe ser válido para Chile'),
  
  body('rut')
    .trim()
    .custom((value) => {
      if (!validateRUT(value)) {
        throw new Error('RUT inválido');
      }
      return true;
    }),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('cancha_id')
    .isInt({ min: 1 })
    .withMessage('ID de cancha inválido'),
  
  body('fecha')
    .isISO8601()
    .withMessage('Fecha inválida')
    .toDate(),
  
  body('hora_inicio')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio inválida'),
  
  body('hora_fin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de fin inválida'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validatePaymentInput = [
  body('monto')
    .isFloat({ min: 0 })
    .withMessage('El monto debe ser un número positivo'),
  
  body('metodo_pago')
    .isIn(['webpay', 'transferencia'])
    .withMessage('Método de pago inválido'),
  
  body('reserva_id')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateAdminInput = [
  body('usuario')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Usuario debe tener entre 3 y 30 caracteres')
    .escape(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateReservationInput,
  validatePaymentInput,
  validateAdminInput,
  validateRUT,
  calcularDigitoVerificador
};
`;

    const validationPath = path.join(__dirname, '../../src/utils/validation.js');
    fs.writeFileSync(validationPath, validationUtils);
    console.log('✅ Validación de entrada avanzada implementada');
  }

  async addSecurityHeaders() {
    console.log('🛡️ Agregando headers de seguridad...');
    
    const securityHeaders = `
// Headers de seguridad adicionales
const securityHeaders = (req, res, next) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control para endpoints sensibles
  if (req.path.includes('/api/auth') || req.path.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

module.exports = securityHeaders;
`;

    const headersPath = path.join(__dirname, '../../src/middleware/security-headers.js');
    fs.writeFileSync(headersPath, securityHeaders);
    console.log('✅ Headers de seguridad agregados');
  }

  async createSecurityConfig() {
    console.log('⚙️ Creando configuración de seguridad...');
    
    const securityConfig = `
// Configuración de seguridad
const securityConfig = {
  // Configuración de JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '24h',
    algorithm: 'HS256'
  },
  
  // Configuración de bcrypt
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },
  
  // Configuración de rate limiting
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 5 // 5 intentos
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100 // 100 requests
    },
    reservation: {
      windowMs: 60 * 1000, // 1 minuto
      max: 5 // 5 reservas
    },
    payment: {
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 3 // 3 intentos de pago
    }
  },
  
  // Configuración de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // Configuración de sesiones
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  },
  
  // Configuración de logs de seguridad
  securityLogging: {
    enabled: true,
    logLevel: 'warn',
    logFile: './logs/security.log',
    maxSize: '10m',
    maxFiles: 5
  }
};

module.exports = securityConfig;
`;

    const configPath = path.join(__dirname, '../../src/config/security.js');
    fs.writeFileSync(configPath, securityConfig);
    console.log('✅ Configuración de seguridad creada');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      securityImprovements: [
        {
          name: 'Rate Limiting Avanzado',
          description: 'Implementa rate limiting específico para diferentes endpoints',
          features: [
            'Rate limiting para autenticación (5 intentos/15 min)',
            'Rate limiting para API (100 requests/15 min)',
            'Rate limiting para reservas (5 reservas/1 min)',
            'Rate limiting para pagos (3 intentos/5 min)'
          ]
        },
        {
          name: 'Sanitización de Datos',
          description: 'Previene ataques de inyección y XSS',
          features: [
            'Sanitización NoSQL injection',
            'Prevención XSS',
            'HTTP Parameter Pollution protection',
            'Input validation avanzada'
          ]
        },
        {
          name: 'Headers de Seguridad',
          description: 'Implementa headers de seguridad modernos',
          features: [
            'Content Security Policy (CSP)',
            'HSTS (HTTP Strict Transport Security)',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Referrer-Policy'
          ]
        },
        {
          name: 'Detección de Amenazas',
          description: 'Sistema de detección de patrones sospechosos',
          features: [
            'Detección de SQL injection',
            'Detección de XSS',
            'Detección de path traversal',
            'Detección de command injection',
            'Logging de intentos sospechosos'
          ]
        }
      ],
      expectedBenefits: [
        'Protección contra ataques de fuerza bruta',
        'Prevención de inyección de código',
        'Mejor seguridad en headers HTTP',
        'Detección temprana de amenazas',
        'Validación robusta de datos de entrada'
      ]
    };

    const reportPath = path.join(__dirname, '../../security-optimization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 Reporte de seguridad generado en:', reportPath);
    return report;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const optimizer = new SecurityOptimizer();
  optimizer.optimize()
    .then(() => {
      const report = optimizer.generateReport();
      console.log('\n🔒 OPTIMIZACIÓN DE SEGURIDAD COMPLETADA');
      console.log('🛡️ Mejoras implementadas:');
      report.expectedBenefits.forEach(benefit => {
        console.log(`  ✅ ${benefit}`);
      });
    })
    .catch(console.error);
}

module.exports = SecurityOptimizer;

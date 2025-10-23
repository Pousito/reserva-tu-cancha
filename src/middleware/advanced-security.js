
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
      /<script[^>]*>.*?</script>/gi, // XSS
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
          duration: `${duration}ms`,
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

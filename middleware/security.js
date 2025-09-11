const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../config');
const logger = require('../utils/logger');

// Rate limiting para prevenir ataques de fuerza bruta
const createRateLimiter = (windowMs, maxRequests, message) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: 'Demasiadas solicitudes',
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Demasiadas solicitudes',
        message: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiters específicos
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutos
  5, // 5 intentos
  'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
);

const apiLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.maxRequests,
  'Demasiadas solicitudes a la API. Intenta de nuevo más tarde.'
);

const reservationLimiter = createRateLimiter(
  60 * 1000, // 1 minuto
  10, // 10 reservas por minuto
  'Demasiadas reservas. Intenta de nuevo en 1 minuto.'
);

// Middleware de seguridad principal
const securityMiddleware = (app) => {
  // Helmet para headers de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Prevenir ataques de timing
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug('Request processed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });
    next();
  });

  // Validar contenido de requests
  app.use((req, res, next) => {
    if (req.headers['content-type'] === 'application/json' && req.body) {
      // Validar tamaño del body
      const contentLength = JSON.stringify(req.body).length;
      if (contentLength > 1000000) { // 1MB máximo
        return res.status(413).json({
          error: 'Payload demasiado grande',
          message: 'El contenido de la solicitud excede el límite permitido'
        });
      }
    }
    next();
  });

  // Log de intentos de acceso sospechoso
  app.use((req, res, next) => {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS básico
      /javascript:/i, // JavaScript en URLs
      /union\s+select/i, // SQL injection básico
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(req.url) || pattern.test(JSON.stringify(req.body))
    );

    if (isSuspicious) {
      logger.warn('Suspicious request detected', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
    }

    next();
  });

  return {
    authLimiter,
    apiLimiter,
    reservationLimiter
  };
};

module.exports = securityMiddleware;


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

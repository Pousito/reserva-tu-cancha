require('dotenv').config();

const config = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Configuración de la base de datos
  database: {
    path: process.env.DB_PATH || './database.sqlite',
    timeout: 30000,
    verbose: process.env.NODE_ENV === 'development'
  },

  // Configuración de seguridad
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 horas
  },

  // Configuración de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Configuración de logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: '10m',
    maxFiles: 5
  },

  // Configuración de rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // Configuración de email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },

  // Configuración de la aplicación
  app: {
    name: 'Reserva Tu Cancha',
    version: '1.0.0',
    description: 'Sistema de reservas de canchas deportivas'
  }
};

module.exports = config;

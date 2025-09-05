const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Crear directorio de logs si no existe
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Función para formatear timestamp
function formatTimestamp() {
  const now = new Date();
  return now.toISOString();
}

// Función para escribir en archivo
function writeToFile(level, message, meta = {}) {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  fs.appendFileSync(config.logging.file, logLine, 'utf8');
}

// Función para limpiar logs antiguos
function cleanupOldLogs() {
  try {
    const stats = fs.statSync(config.logging.file);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 10) { // Si el archivo es mayor a 10MB
      const logContent = fs.readFileSync(config.logging.file, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // Mantener solo las últimas 1000 líneas
      const recentLines = lines.slice(-1000);
      fs.writeFileSync(config.logging.file, recentLines.join('\n') + '\n');
      
      console.log('Logs antiguos limpiados automáticamente');
    }
  } catch (error) {
    console.error('Error limpiando logs:', error);
  }
}

// Logger principal
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, meta);
    writeToFile('info', message, meta);
  },

  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
    writeToFile('warn', message, meta);
  },

  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
    writeToFile('error', message, meta);
  },

  debug: (message, meta = {}) => {
    if (config.server.env === 'development') {
      console.log(`[DEBUG] ${message}`, meta);
      writeToFile('debug', message, meta);
    }
  },

  // Log específico para operaciones de base de datos
  db: (operation, table, meta = {}) => {
    logger.info(`DB ${operation} on ${table}`, meta);
  },

  // Log específico para autenticación
  auth: (action, user, meta = {}) => {
    logger.info(`AUTH ${action}`, { user, ...meta });
  },

  // Log específico para reservas
  reservation: (action, reservationId, meta = {}) => {
    logger.info(`RESERVATION ${action}`, { reservationId, ...meta });
  },

  // Limpiar logs
  cleanup: cleanupOldLogs
};

// Limpiar logs cada hora
setInterval(cleanupOldLogs, 60 * 60 * 1000);

module.exports = logger;

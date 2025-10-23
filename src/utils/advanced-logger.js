/**
 * Sistema de Logging Avanzado
 * Logging estructurado con contexto, métricas y alertas
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AdvancedLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
    this.requestCache = new Map();
    this.performanceThresholds = {
      slowQuery: 1000,      // 1 segundo
      slowRequest: 2000,    // 2 segundos
      criticalError: 5000   // 5 segundos
    };
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  createLogEntry(level, message, context = {}) {
    return {
      timestamp: this.formatTimestamp(),
      level: level.toUpperCase(),
      message,
      context,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  writeToFile(filename, entry) {
    const filePath = path.join(this.logDir, filename);
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(filePath, logLine, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  // Logging básico
  info(message, context = {}) {
    const entry = this.createLogEntry('info', message, context);
    console.log(`[INFO] ${message}`, context);
    this.writeToFile('app.log', entry);
  }

  warn(message, context = {}) {
    const entry = this.createLogEntry('warn', message, context);
    console.warn(`[WARN] ${message}`, context);
    this.writeToFile('app.log', entry);
    this.writeToFile('warnings.log', entry);
  }

  error(message, context = {}) {
    const entry = this.createLogEntry('error', message, context);
    console.error(`[ERROR] ${message}`, context);
    this.writeToFile('app.log', entry);
    this.writeToFile('errors.log', entry);
    
    // Alertar si es crítico
    if (context.isCritical) {
      this.sendCriticalAlert(message, context);
    }
  }

  debug(message, context = {}) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry('debug', message, context);
      console.log(`[DEBUG] ${message}`, context);
      this.writeToFile('debug.log', entry);
    }
  }

  // Logging específico para requests
  requestStart(req, requestId) {
    const context = {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      startTime: Date.now()
    };

    this.info('Request started', context);
    this.requestCache.set(requestId, context);
  }

  requestEnd(req, res, requestId) {
    const startContext = this.requestCache.get(requestId);
    if (!startContext) return;

    const duration = Date.now() - startContext.startTime;
    const context = {
      ...startContext,
      statusCode: res.statusCode,
      duration,
      isSlow: duration > this.performanceThresholds.slowRequest
    };

    if (context.isSlow) {
      this.warn('Slow request detected', context);
    } else {
      this.info('Request completed', context);
    }

    this.requestCache.delete(requestId);
    this.writeToFile('requests.log', this.createLogEntry('info', 'Request completed', context));
  }

  // Logging específico para base de datos
  dbQuery(query, params, duration, context = {}) {
    const logContext = {
      ...context,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      params: params ? params.slice(0, 3) : [], // Solo primeros 3 parámetros
      duration,
      isSlow: duration > this.performanceThresholds.slowQuery
    };

    if (logContext.isSlow) {
      this.warn('Slow database query detected', logContext);
    } else {
      this.debug('Database query executed', logContext);
    }

    this.writeToFile('database.log', this.createLogEntry('info', 'Database query', logContext));
  }

  // Logging específico para reservas
  reservation(action, reservationId, context = {}) {
    const logContext = {
      ...context,
      action,
      reservationId,
      timestamp: this.formatTimestamp()
    };

    this.info(`Reservation ${action}`, logContext);
    this.writeToFile('reservations.log', this.createLogEntry('info', `Reservation ${action}`, logContext));
  }

  // Logging específico para pagos
  payment(action, paymentId, amount, context = {}) {
    const logContext = {
      ...context,
      action,
      paymentId,
      amount,
      timestamp: this.formatTimestamp()
    };

    this.info(`Payment ${action}`, logContext);
    this.writeToFile('payments.log', this.createLogEntry('info', `Payment ${action}`, logContext));
    
    if (action === 'failed' || action === 'error') {
      this.error(`Payment ${action}`, logContext);
    }
  }

  // Logging específico para autenticación
  auth(action, userId, success, context = {}) {
    const logContext = {
      ...context,
      action,
      userId,
      success,
      timestamp: this.formatTimestamp()
    };

    if (success) {
      this.info(`Auth ${action} successful`, logContext);
    } else {
      this.warn(`Auth ${action} failed`, logContext);
    }

    this.writeToFile('auth.log', this.createLogEntry('info', `Auth ${action}`, logContext));
  }

  // Métricas de rendimiento
  performance(metric, value, context = {}) {
    const logContext = {
      ...context,
      metric,
      value,
      timestamp: this.formatTimestamp()
    };

    this.info(`Performance metric: ${metric}`, logContext);
    this.writeToFile('performance.log', this.createLogEntry('info', `Performance: ${metric}`, logContext));
  }

  // Alertas críticas
  async sendCriticalAlert(message, context) {
    const alert = {
      timestamp: this.formatTimestamp(),
      message,
      context,
      severity: 'CRITICAL'
    };

    this.writeToFile('alerts.log', this.createLogEntry('error', 'CRITICAL ALERT', alert));

    // Aquí puedes integrar con servicios de alertas como Slack, email, etc.
    console.error('🚨 CRITICAL ALERT:', message, context);
  }

  // Limpieza de logs antiguos
  cleanupOldLogs() {
    const files = fs.readdirSync(this.logDir);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      
      if (Date.now() - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        this.info('Old log file deleted', { file });
      }
    });
  }

  // Rotación de logs
  rotateLog(filename) {
    const filePath = path.join(this.logDir, filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 10) { // Rotar si es mayor a 10MB
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${filename}.${timestamp}`;
        
        fs.renameSync(filePath, path.join(this.logDir, rotatedFile));
        this.info('Log file rotated', { original: filename, rotated: rotatedFile });
      }
    }
  }

  // Obtener estadísticas de logs
  getLogStats() {
    const files = fs.readdirSync(this.logDir);
    const stats = {};

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats_data = fs.statSync(filePath);
      stats[file] = {
        size: stats_data.size,
        lastModified: stats_data.mtime
      };
    });

    return stats;
  }
}

// Instancia global del logger
const logger = new AdvancedLogger();

// Limpieza automática cada hora
setInterval(() => {
  logger.cleanupOldLogs();
}, 60 * 60 * 1000);

// Rotación de logs cada 6 horas
setInterval(() => {
  logger.rotateLog('app.log');
  logger.rotateLog('errors.log');
  logger.rotateLog('requests.log');
}, 6 * 60 * 60 * 1000);

module.exports = logger;

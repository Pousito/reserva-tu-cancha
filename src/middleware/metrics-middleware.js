/**
 * Middleware de Métricas
 * Intercepta requests y recopila métricas automáticamente
 */

const metricsCollector = require('../utils/metrics-collector');
const alertSystem = require('../utils/alert-system');

/**
 * Middleware para recopilar métricas de API
 */
const apiMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Incrementar contador de requests activos
  metricsCollector.metrics.system.activeRequests++;
  
  // Interceptar respuesta
  res.send = function(data) {
    recordMetrics();
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    recordMetrics();
    return originalJson.call(this, data);
  };
  
  function recordMetrics() {
    const duration = Date.now() - startTime;
    const userId = req.user ? req.user.id : null;
    
    // Registrar métricas de API
    metricsCollector.recordApiCall(
      req.path,
      req.method,
      duration,
      res.statusCode,
      userId
    );
    
    // Registrar métricas de negocio específicas
    if (req.path.includes('/reservas') && req.method === 'POST') {
      recordReservationMetrics(req, res, duration);
    }
    
    if (req.path.includes('/pagos') && req.method === 'POST') {
      recordPaymentMetrics(req, res, duration);
    }
    
    // Decrementar contador de requests activos
    metricsCollector.metrics.system.activeRequests--;
    
    // Procesar eventos para alertas
    alertSystem.processEvent('apiCall', {
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      userId
    });
  }
  
  next();
};

/**
 * Middleware para recopilar métricas de base de datos
 */
const databaseMetricsMiddleware = (db) => {
  return (req, res, next) => {
    const originalQuery = db.query;
    
    db.query = function(query, params, callback) {
      const startTime = Date.now();
      
      const wrappedCallback = function(error, result) {
        const duration = Date.now() - startTime;
        const rowsAffected = result ? (result.rowCount || result.affectedRows || 0) : 0;
        
        // Registrar métricas de DB
        metricsCollector.recordDatabaseQuery(
          query,
          duration,
          rowsAffected,
          error
        );
        
        // Procesar eventos para alertas
        if (error) {
          alertSystem.processEvent('databaseError', {
            query,
            error: error.message,
            duration
          });
        }
        
        if (callback) {
          callback(error, result);
        }
      };
      
      return originalQuery.call(this, query, params, wrappedCallback);
    };
    
    next();
  };
};

/**
 * Middleware para métricas de autenticación
 */
const authMetricsMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.path.includes('/login') || req.path.includes('/auth')) {
      const success = res.statusCode === 200;
      const userId = data.user ? data.user.id : null;
      
      metricsCollector.recordAuthAttempt(
        req.path,
        success,
        userId,
        req.ip
      );
      
      // Procesar eventos para alertas
      if (!success) {
        alertSystem.processEvent('authFailure', {
          endpoint: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware para métricas de rendimiento de páginas
 */
const pageMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Solo para requests de páginas HTML
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordPageLoad(
        req.path,
        duration,
        res.statusCode,
        req.get('User-Agent')
      );
      
      // Procesar eventos para alertas
      alertSystem.processEvent('pageLoad', {
        path: req.path,
        duration,
        statusCode: res.statusCode
      });
    });
  }
  
  next();
};

/**
 * Registrar métricas específicas de reservas
 */
function recordReservationMetrics(req, res, duration) {
  try {
    const { complejo_id, precio } = req.body;
    const success = res.statusCode === 200 || res.statusCode === 201;
    
    if (success && complejo_id && precio) {
      metricsCollector.recordReservation(
        complejo_id,
        req.body.complejo_nombre || 'Unknown',
        parseFloat(precio),
        req.user ? req.user.id : null,
        true
      );
    }
  } catch (error) {
    console.error('Error recording reservation metrics:', error);
  }
}

/**
 * Registrar métricas específicas de pagos
 */
function recordPaymentMetrics(req, res, duration) {
  try {
    const { amount, payment_method } = req.body;
    const success = res.statusCode === 200 || res.statusCode === 201;
    
    if (amount) {
      metricsCollector.recordPayment(
        parseFloat(amount),
        success,
        payment_method || 'unknown',
        req.user ? req.user.id : null
      );
    }
  } catch (error) {
    console.error('Error recording payment metrics:', error);
  }
}

/**
 * Middleware de monitoreo de errores
 */
const errorMetricsMiddleware = (err, req, res, next) => {
  // Registrar error en métricas
  metricsCollector.recordError('http', err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.status || 500,
    userId: req.user ? req.user.id : null,
    ip: req.ip
  });
  
  // Procesar evento para alertas
  alertSystem.processEvent('httpError', {
    error: err.message,
    path: req.path,
    method: req.method,
    statusCode: err.status || 500,
    stack: err.stack
  });
  
  next(err);
};

/**
 * Middleware para métricas de usuarios
 */
const userMetricsMiddleware = (req, res, next) => {
  if (req.user) {
    // Registrar usuario activo
    metricsCollector.recordUserActivity(
      req.user.id,
      req.path,
      req.method,
      req.ip
    );
  }
  
  next();
};

/**
 * Middleware de limpieza de métricas
 */
const metricsCleanupMiddleware = (req, res, next) => {
  // Limpiar métricas antiguas cada 100 requests
  if (Math.random() < 0.01) { // 1% de probabilidad
    metricsCollector.cleanupOldMetrics();
    alertSystem.cleanupOldAlerts();
  }
  
  next();
};

module.exports = {
  apiMetricsMiddleware,
  databaseMetricsMiddleware,
  authMetricsMiddleware,
  pageMetricsMiddleware,
  errorMetricsMiddleware,
  userMetricsMiddleware,
  metricsCleanupMiddleware
};

/**
 * Middleware de Métricas
 * Intercepta requests y recopila métricas automáticamente
 */

// const metricsCollector = require('../utils/metrics-collector');
// const alertSystem = require('../utils/alert-system');

/**
 * Middleware para recopilar métricas de API
 */
const apiMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Incrementar contador de requests activos (temporalmente deshabilitado)
  // metricsCollector.metrics.system.activeRequests++;
  
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
    
    // Registrar métricas de API (temporalmente deshabilitado)
    // metricsCollector.recordApiCall(
    //   req.path,
    //   req.method,
    //   duration,
    //   res.statusCode,
    //   userId
    // );
    
    // Registrar métricas de negocio específicas
    if (req.path.includes('/reservas') && req.method === 'POST') {
      recordReservationMetrics(req, res, duration);
    }
    
    if (req.path.includes('/pagos') && req.method === 'POST') {
      recordPaymentMetrics(req, res, duration);
    }
    
    // Decrementar contador de requests activos (temporalmente deshabilitado)
    // metricsCollector.metrics.system.activeRequests--;
    
    // Procesar eventos para alertas (temporalmente deshabilitado)
    // alertSystem.processEvent('apiCall', {
    //   endpoint: req.path,
    //   method: req.method,
    //   duration,
    //   statusCode: res.statusCode,
    //   userId
    // });
  }
  
  next();
};

/**
 * Middleware para recopilar métricas de base de datos
 */
const databaseMetricsMiddleware = (db) => {
  return (req, res, next) => {
    const originalQuery = db.query;
    const originalRun = db.run;
    
    // Interceptar db.query
    db.query = function(query, params, callback) {
      const startTime = Date.now();
      
      const wrappedCallback = function(error, result) {
        const duration = Date.now() - startTime;
        const rowsAffected = result ? (result.rowCount || result.affectedRows || 0) : 0;
        
        // Registrar métricas de DB (temporalmente deshabilitado)
        // metricsCollector.recordDatabaseQuery(
        //   query,
        //   duration,
        //   rowsAffected,
        //   error
        // );
        
        // Procesar eventos para alertas (temporalmente deshabilitado)
        // if (error) {
        //   alertSystem.processEvent('databaseError', {
        //     query,
        //     duration,
        //     error: error.message
        //   });
        // }
        
        if (callback) callback(error, result);
      };
      
      return originalQuery.call(this, query, params, wrappedCallback);
    };
    
    next();
  };
};

/**
 * Middleware para recopilar métricas de autenticación
 */
const authMetricsMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.path.includes('/login') || req.path.includes('/auth')) {
      const success = res.statusCode === 200;
      const userId = data.user ? data.user.id : null;
      
      // metricsCollector.recordAuthAttempt(
      //   req.path,
      //   success,
      //   userId,
      //   req.ip
      // );
      
      // Procesar eventos para alertas (temporalmente deshabilitado)
      // if (!success) {
      //   alertSystem.processEvent('authFailure', {
      //     endpoint: req.path,
      //     ip: req.ip,
      //     userAgent: req.get('User-Agent')
      //   });
      // }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware para recopilar métricas de páginas
 */
const pageMetricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Solo para requests de páginas HTML
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // metricsCollector.recordApiCall(
      //   req.path,
      //   req.method,
      //   duration,
      //   res.statusCode
      // );
      
      // Procesar eventos para alertas (temporalmente deshabilitado)
      // alertSystem.processEvent('pageLoad', {
      //   path: req.path,
      //   duration,
      //   statusCode: res.statusCode
      // });
    });
  }
  
  next();
};

/**
 * Función para registrar métricas de reservas
 */
function recordReservationMetrics(req, res, duration) {
  const success = res.statusCode === 200;
  const complejo_id = req.body.complejo_id;
  const precio = req.body.precio_total;
  
  if (success && complejo_id && precio) {
    // metricsCollector.recordReservation(
    //   complejo_id,
    //   req.body.complejo_nombre || 'Unknown',
    //   parseFloat(precio),
    //   success
    // );
  }
}

/**
 * Función para registrar métricas de pagos
 */
function recordPaymentMetrics(req, res, duration) {
  const success = res.statusCode === 200;
  const amount = req.body.amount || req.body.monto;
  const payment_method = req.body.payment_method || req.body.metodo_pago;
  
  if (amount) {
    // metricsCollector.recordPayment(
    //   parseFloat(amount),
    //   success,
    //   payment_method || 'unknown',
    //   req.ip
    // );
  }
}

/**
 * Middleware para manejar errores y registrar métricas
 */
const errorMetricsMiddleware = (err, req, res, next) => {
  // Registrar error en métricas (temporalmente deshabilitado)
  // metricsCollector.recordError('http', err.message, {
  //   stack: err.stack,
  //   path: req.path,
  //   method: req.method,
  //   ip: req.ip,
  //   userAgent: req.get('User-Agent')
  // });
  
  next(err);
};

/**
 * Middleware para registrar actividad de usuarios
 */
const userActivityMiddleware = (req, res, next) => {
  if (req.user) {
    // Registrar usuario activo (temporalmente deshabilitado)
    // metricsCollector.recordUserActivity(
    //   req.user.id,
    //   req.path,
    //   req.method,
    //   req.ip
    // );
  }
  
  // Limpiar métricas antiguas cada 100 requests (temporalmente deshabilitado)
  // if (Math.random() < 0.01) { // 1% de probabilidad
  //   metricsCollector.cleanupOldMetrics();
  //   alertSystem.cleanupOldAlerts();
  // }
  
  next();
};

module.exports = {
  apiMetricsMiddleware,
  databaseMetricsMiddleware,
  authMetricsMiddleware,
  pageMetricsMiddleware,
  errorMetricsMiddleware,
  userActivityMiddleware,
  userMetricsMiddleware: userActivityMiddleware,
  metricsCleanupMiddleware: (req, res, next) => next()
};

/**
 * Middleware de Tracking de Requests
 * Rastrea cada request con ID único y métricas de rendimiento
 */

const logger = require('../utils/advanced-logger');

function requestTracking(req, res, next) {
  // Generar ID único para el request
  const requestId = logger.generateRequestId();
  req.requestId = requestId;

  // Agregar requestId a los headers de respuesta
  res.setHeader('X-Request-ID', requestId);

  // Log del inicio del request
  logger.requestStart(req, requestId);

  // Interceptar el método end() de la respuesta
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Log del fin del request
    logger.requestEnd(req, res, requestId);
    
    // Llamar al método original
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = requestTracking;

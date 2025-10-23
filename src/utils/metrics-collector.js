/**
 * Sistema de Recopilación de Métricas
 * Recopila métricas de rendimiento, negocio y sistema en tiempo real
 */

const EventEmitter = require('events');

class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      performance: {
        apiResponseTimes: new Map(),
        databaseQueries: new Map(),
        pageLoadTimes: new Map(),
        errorRates: new Map()
      },
      business: {
        reservations: {
          total: 0,
          byComplex: new Map(),
          byHour: new Map(),
          byDay: new Map(),
          conversionRate: 0
        },
        payments: {
          total: 0,
          successful: 0,
          failed: 0,
          totalAmount: 0,
          averageAmount: 0
        },
        users: {
          active: 0,
          new: 0,
          returning: 0
        }
      },
      system: {
        uptime: Date.now(),
        memoryUsage: {},
        cpuUsage: {},
        databaseConnections: 0,
        activeRequests: 0
      }
    };
    
    this.startTime = Date.now();
    this.initializeCollectors();
  }

  /**
   * Inicializar recolectores automáticos
   */
  initializeCollectors() {
    // Recolector de métricas de sistema cada 30 segundos
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Recolector de métricas de memoria cada 10 segundos
    this.memoryMetricsInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, 10000);

    // Limpiar métricas antiguas cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);
  }

  /**
   * Recopilar métricas de API
   */
  recordApiCall(endpoint, method, duration, statusCode, userId = null) {
    const key = `${method}:${endpoint}`;
    const timestamp = Date.now();
    
    if (!this.metrics.performance.apiResponseTimes.has(key)) {
      this.metrics.performance.apiResponseTimes.set(key, {
        calls: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        lastCall: timestamp,
        statusCodes: new Map()
      });
    }

    const metric = this.metrics.performance.apiResponseTimes.get(key);
    metric.calls++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.calls;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.lastCall = timestamp;

    // Registrar código de estado
    if (!metric.statusCodes.has(statusCode)) {
      metric.statusCodes.set(statusCode, 0);
    }
    metric.statusCodes.set(statusCode, metric.statusCodes.get(statusCode) + 1);

    // Registrar errores
    if (statusCode >= 400) {
      metric.errorCount++;
      this.recordError('api', `${method} ${endpoint}`, statusCode, { userId });
    }

    // Emitir evento para alertas
    if (duration > 5000) { // Más de 5 segundos
      this.emit('slowApiCall', { endpoint, method, duration, statusCode });
    }

    this.emit('apiMetric', { endpoint, method, duration, statusCode });
  }

  /**
   * Recopilar métricas de base de datos
   */
  recordDatabaseQuery(query, duration, rowsAffected = 0, error = null) {
    const queryType = this.getQueryType(query);
    const key = queryType;
    const timestamp = Date.now();
    
    if (!this.metrics.performance.databaseQueries.has(key)) {
      this.metrics.performance.databaseQueries.set(key, {
        queries: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        totalRowsAffected: 0,
        lastQuery: timestamp
      });
    }

    const metric = this.metrics.performance.databaseQueries.get(key);
    metric.queries++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.queries;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.totalRowsAffected += rowsAffected;
    metric.lastQuery = timestamp;

    if (error) {
      metric.errorCount++;
      this.recordError('database', query, error.message);
    }

    // Emitir evento para alertas
    if (duration > 2000) { // Más de 2 segundos
      this.emit('slowDatabaseQuery', { query, duration, queryType });
    }

    this.emit('databaseMetric', { query, duration, queryType, rowsAffected });
  }

  /**
   * Recopilar métricas de negocio - Reservas
   */
  recordReservation(complexId, complexName, amount, userId, success = true) {
    const timestamp = Date.now();
    const hour = new Date().getHours();
    const day = new Date().toDateString();
    
    this.metrics.business.reservations.total++;
    
    // Por complejo
    if (!this.metrics.business.reservations.byComplex.has(complexId)) {
      this.metrics.business.reservations.byComplex.set(complexId, {
        name: complexName,
        count: 0,
        totalAmount: 0,
        lastReservation: timestamp
      });
    }
    
    const complexMetric = this.metrics.business.reservations.byComplex.get(complexId);
    complexMetric.count++;
    complexMetric.totalAmount += amount;
    complexMetric.lastReservation = timestamp;
    
    // Por hora
    if (!this.metrics.business.reservations.byHour.has(hour)) {
      this.metrics.business.reservations.byHour.set(hour, 0);
    }
    this.metrics.business.reservations.byHour.set(hour, 
      this.metrics.business.reservations.byHour.get(hour) + 1);
    
    // Por día
    if (!this.metrics.business.reservations.byDay.has(day)) {
      this.metrics.business.reservations.byDay.set(day, 0);
    }
    this.metrics.business.reservations.byDay.set(day, 
      this.metrics.business.reservations.byDay.get(day) + 1);

    this.emit('reservationMetric', { complexId, complexName, amount, success });
  }

  /**
   * Recopilar métricas de pagos
   */
  recordPayment(amount, success, paymentMethod, userId = null) {
    const timestamp = Date.now();
    
    this.metrics.business.payments.total++;
    this.metrics.business.payments.totalAmount += amount;
    this.metrics.business.payments.averageAmount = 
      this.metrics.business.payments.totalAmount / this.metrics.business.payments.total;
    
    if (success) {
      this.metrics.business.payments.successful++;
    } else {
      this.metrics.business.payments.failed++;
      this.recordError('payment', 'Payment failed', { amount, paymentMethod, userId });
    }

    this.emit('paymentMetric', { amount, success, paymentMethod });
  }

  /**
   * Recopilar métricas de sistema
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      timestamp: Date.now()
    };

    this.metrics.system.uptime = Date.now() - this.startTime;
    
    // Emitir alertas por uso alto de memoria
    if (memUsage.heapUsed / memUsage.heapTotal > 0.8) {
      this.emit('highMemoryUsage', this.metrics.system.memoryUsage);
    }

    this.emit('systemMetric', this.metrics.system);
  }

  /**
   * Recopilar métricas de memoria
   */
  collectMemoryMetrics() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();
    
    // Mantener historial de uso de memoria (últimas 100 entradas)
    if (!this.metrics.system.memoryHistory) {
      this.metrics.system.memoryHistory = [];
    }
    
    this.metrics.system.memoryHistory.push({
      timestamp,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
    });
    
    // Mantener solo las últimas 100 entradas
    if (this.metrics.system.memoryHistory.length > 100) {
      this.metrics.system.memoryHistory = this.metrics.system.memoryHistory.slice(-100);
    }
  }

  /**
   * Registrar errores
   */
  recordError(type, message, details = {}) {
    const timestamp = Date.now();
    const errorKey = `${type}:${message}`;
    
    if (!this.metrics.performance.errorRates.has(errorKey)) {
      this.metrics.performance.errorRates.set(errorKey, {
        count: 0,
        lastError: timestamp,
        details: []
      });
    }
    
    const errorMetric = this.metrics.performance.errorRates.get(errorKey);
    errorMetric.count++;
    errorMetric.lastError = timestamp;
    errorMetric.details.push({
      timestamp,
      message,
      details,
      stack: details.stack || null
    });
    
    // Mantener solo los últimos 50 errores por tipo
    if (errorMetric.details.length > 50) {
      errorMetric.details = errorMetric.details.slice(-50);
    }

    this.emit('error', { type, message, details, timestamp });
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Obtener métricas específicas
   */
  getPerformanceMetrics() {
    return this.metrics.performance;
  }

  getBusinessMetrics() {
    return this.metrics.business;
  }

  getSystemMetrics() {
    return this.metrics.system;
  }

  /**
   * Limpiar métricas antiguas
   */
  cleanupOldMetrics() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    
    // Limpiar métricas de API antiguas
    for (const [key, metric] of this.metrics.performance.apiResponseTimes.entries()) {
      if (now - metric.lastCall > maxAge) {
        this.metrics.performance.apiResponseTimes.delete(key);
      }
    }
    
    // Limpiar métricas de DB antiguas
    for (const [key, metric] of this.metrics.performance.databaseQueries.entries()) {
      if (now - metric.lastQuery > maxAge) {
        this.metrics.performance.databaseQueries.delete(key);
      }
    }
  }

  /**
   * Determinar tipo de query SQL
   */
  getQueryType(query) {
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  /**
   * Destruir recolector
   */
  destroy() {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    if (this.memoryMetricsInterval) {
      clearInterval(this.memoryMetricsInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }
}

// Instancia singleton
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;

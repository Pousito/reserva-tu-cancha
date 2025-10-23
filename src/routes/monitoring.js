/**
 * Rutas de Monitoreo y Analytics
 * Dashboard en tiempo real y APIs para métricas
 */

const express = require('express');
const router = express.Router();
const metricsCollector = require('../utils/metrics-collector');
const alertSystem = require('../utils/alert-system');

/**
 * Dashboard principal de monitoreo
 */
router.get('/dashboard', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  const alertStats = alertSystem.getAlertStats();
  const recentAlerts = alertSystem.getAlertHistory(20);

  res.json({
    success: true,
    data: {
      metrics,
      alerts: {
        stats: alertStats,
        recent: recentAlerts
      },
      timestamp: Date.now()
    }
  });
});

/**
 * Métricas de rendimiento
 */
router.get('/performance', (req, res) => {
  const performanceMetrics = metricsCollector.getPerformanceMetrics();
  
  res.json({
    success: true,
    data: performanceMetrics,
    timestamp: Date.now()
  });
});

/**
 * Métricas de negocio
 */
router.get('/business', (req, res) => {
  const businessMetrics = metricsCollector.getBusinessMetrics();
  
  res.json({
    success: true,
    data: businessMetrics,
    timestamp: Date.now()
  });
});

/**
 * Métricas de sistema
 */
router.get('/system', (req, res) => {
  const systemMetrics = metricsCollector.getSystemMetrics();
  
  res.json({
    success: true,
    data: systemMetrics,
    timestamp: Date.now()
  });
});

/**
 * Estadísticas de APIs
 */
router.get('/apis', (req, res) => {
  const apiMetrics = metricsCollector.getPerformanceMetrics().apiResponseTimes;
  const apis = [];
  
  for (const [endpoint, metric] of apiMetrics.entries()) {
    apis.push({
      endpoint,
      calls: metric.calls,
      averageDuration: Math.round(metric.averageDuration),
      minDuration: metric.minDuration,
      maxDuration: metric.maxDuration,
      errorRate: metric.errorCount / metric.calls,
      lastCall: metric.lastCall,
      statusCodes: Object.fromEntries(metric.statusCodes)
    });
  }
  
  // Ordenar por número de llamadas
  apis.sort((a, b) => b.calls - a.calls);
  
  res.json({
    success: true,
    data: apis,
    timestamp: Date.now()
  });
});

/**
 * Estadísticas de base de datos
 */
router.get('/database', (req, res) => {
  const dbMetrics = metricsCollector.getPerformanceMetrics().databaseQueries;
  const queries = [];
  
  for (const [queryType, metric] of dbMetrics.entries()) {
    queries.push({
      type: queryType,
      queries: metric.queries,
      averageDuration: Math.round(metric.averageDuration),
      minDuration: metric.minDuration,
      maxDuration: metric.maxDuration,
      errorRate: metric.errorCount / metric.queries,
      totalRowsAffected: metric.totalRowsAffected,
      lastQuery: metric.lastQuery
    });
  }
  
  res.json({
    success: true,
    data: queries,
    timestamp: Date.now()
  });
});

/**
 * Estadísticas de reservas
 */
router.get('/reservations', (req, res) => {
  const reservationMetrics = metricsCollector.getBusinessMetrics().reservations;
  
  const complexes = [];
  for (const [complexId, metric] of reservationMetrics.byComplex.entries()) {
    complexes.push({
      id: complexId,
      name: metric.name,
      count: metric.count,
      totalAmount: metric.totalAmount,
      averageAmount: metric.totalAmount / metric.count,
      lastReservation: metric.lastReservation
    });
  }
  
  // Ordenar por número de reservas
  complexes.sort((a, b) => b.count - a.count);
  
  const hourlyStats = Object.fromEntries(reservationMetrics.byHour);
  const dailyStats = Object.fromEntries(reservationMetrics.byDay);
  
  res.json({
    success: true,
    data: {
      total: reservationMetrics.total,
      byComplex: complexes,
      byHour: hourlyStats,
      byDay: dailyStats,
      conversionRate: reservationMetrics.conversionRate
    },
    timestamp: Date.now()
  });
});

/**
 * Estadísticas de pagos
 */
router.get('/payments', (req, res) => {
  const paymentMetrics = metricsCollector.getBusinessMetrics().payments;
  
  res.json({
    success: true,
    data: {
      total: paymentMetrics.total,
      successful: paymentMetrics.successful,
      failed: paymentMetrics.failed,
      successRate: paymentMetrics.successful / paymentMetrics.total,
      totalAmount: paymentMetrics.totalAmount,
      averageAmount: paymentMetrics.averageAmount
    },
    timestamp: Date.now()
  });
});

/**
 * Historial de alertas
 */
router.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const alerts = alertSystem.getAlertHistory(limit);
  
  res.json({
    success: true,
    data: alerts,
    timestamp: Date.now()
  });
});

/**
 * Estadísticas de alertas
 */
router.get('/alerts/stats', (req, res) => {
  const stats = alertSystem.getAlertStats();
  
  res.json({
    success: true,
    data: stats,
    timestamp: Date.now()
  });
});

/**
 * Métricas en tiempo real (WebSocket endpoint)
 */
router.get('/realtime', (req, res) => {
  res.json({
    success: true,
    message: 'Use WebSocket connection for real-time metrics',
    websocketUrl: `/ws/monitoring`
  });
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const metrics = metricsCollector.getSystemMetrics();
  const isHealthy = 
    metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal < 0.9 &&
    Date.now() - metrics.uptime > 60000; // Al menos 1 minuto activo
  
  res.json({
    success: true,
    healthy: isHealthy,
    data: {
      uptime: metrics.uptime,
      memory: metrics.memoryUsage,
      timestamp: Date.now()
    }
  });
});

/**
 * Métricas resumidas para dashboard
 */
router.get('/summary', (req, res) => {
  const metrics = metricsCollector.getMetrics();
  const alertStats = alertSystem.getAlertStats();
  
  // Calcular métricas clave
  const totalApiCalls = Array.from(metrics.performance.apiResponseTimes.values())
    .reduce((sum, metric) => sum + metric.calls, 0);
  
  const totalDbQueries = Array.from(metrics.performance.databaseQueries.values())
    .reduce((sum, metric) => sum + metric.queries, 0);
  
  const averageApiResponseTime = Array.from(metrics.performance.apiResponseTimes.values())
    .reduce((sum, metric) => sum + metric.averageDuration, 0) / 
    metrics.performance.apiResponseTimes.size || 0;
  
  const totalErrors = Array.from(metrics.performance.errorRates.values())
    .reduce((sum, metric) => sum + metric.count, 0);
  
  res.json({
    success: true,
    data: {
      overview: {
        uptime: metrics.uptime,
        totalApiCalls,
        totalDbQueries,
        averageApiResponseTime: Math.round(averageApiResponseTime),
        totalErrors,
        activeAlerts: alertStats.lastHour
      },
      business: {
        totalReservations: metrics.business.reservations.total,
        totalPayments: metrics.business.payments.total,
        totalRevenue: metrics.business.payments.totalAmount,
        paymentSuccessRate: metrics.business.payments.successful / 
          Math.max(metrics.business.payments.total, 1)
      },
      system: {
        memoryUsage: metrics.system.memoryUsage.heapUsed,
        memoryTotal: metrics.system.memoryUsage.heapTotal,
        memoryPercentage: Math.round(
          (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100
        )
      },
      alerts: {
        total: alertStats.totalAlerts,
        last24Hours: alertStats.last24Hours,
        lastHour: alertStats.lastHour,
        critical: alertStats.alertsBySeverity.critical,
        warning: alertStats.alertsBySeverity.warning
      }
    },
    timestamp: Date.now()
  });
});

module.exports = router;

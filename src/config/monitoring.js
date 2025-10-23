/**
 * Configuración del Sistema de Monitoreo
 */

module.exports = {
  // Configuración de métricas
  metrics: {
    // Intervalo de recolección de métricas de sistema (ms)
    systemMetricsInterval: 30000, // 30 segundos
    
    // Intervalo de recolección de métricas de memoria (ms)
    memoryMetricsInterval: 10000, // 10 segundos
    
    // Intervalo de limpieza de métricas antiguas (ms)
    cleanupInterval: 300000, // 5 minutos
    
    // Edad máxima de métricas (ms)
    maxMetricsAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    
    // Historial máximo de memoria
    maxMemoryHistory: 100
  },

  // Configuración de alertas
  alerts: {
    // Cooldown por defecto para alertas (ms)
    defaultCooldown: 300000, // 5 minutos
    
    // Edad máxima de alertas (ms)
    maxAlertAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    
    // Máximo de alertas en historial
    maxAlertHistory: 1000
  },

  // Configuración de email
  email: {
    enabled: process.env.EMAIL_USER && process.env.EMAIL_PASS,
    service: 'gmail',
    alertRecipients: process.env.ALERT_EMAIL ? [process.env.ALERT_EMAIL] : []
  },

  // Configuración de webhook
  webhook: {
    enabled: !!process.env.WEBHOOK_URL,
    url: process.env.WEBHOOK_URL
  },

  // Umbrales de alertas
  thresholds: {
    // API lenta (ms)
    slowApiThreshold: 5000,
    
    // Query de DB lenta (ms)
    slowDatabaseThreshold: 2000,
    
    // Tasa de error alta (%)
    highErrorRateThreshold: 0.05, // 5%
    
    // Uso alto de memoria (%)
    highMemoryUsageThreshold: 0.8, // 80%
    
    // Muchas conexiones de DB
    highDatabaseConnectionsThreshold: 80
  }
};

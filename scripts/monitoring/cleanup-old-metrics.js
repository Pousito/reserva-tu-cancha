/**
 * Script de Limpieza de Métricas Antiguas
 * Limpia métricas y alertas antiguas para mantener el rendimiento
 */

const metricsCollector = require('../../src/utils/metrics-collector');
const alertSystem = require('../../src/utils/alert-system');

console.log('🧹 Iniciando limpieza de métricas antiguas...');

try {
  // Limpiar métricas antiguas (más de 7 días)
  metricsCollector.cleanupOldMetrics();
  console.log('✅ Métricas antiguas limpiadas');

  // Limpiar alertas antiguas (más de 30 días)
  alertSystem.cleanupOldAlerts(30 * 24 * 60 * 60 * 1000);
  console.log('✅ Alertas antiguas limpiadas');

  console.log('🎉 Limpieza completada exitosamente');
} catch (error) {
  console.error('❌ Error durante la limpieza:', error);
  process.exit(1);
}

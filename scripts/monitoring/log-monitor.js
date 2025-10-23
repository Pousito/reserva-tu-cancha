/**
 * Monitor de Logs en Tiempo Real
 * Analiza logs y genera reportes de rendimiento
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../src/utils/advanced-logger');

class LogMonitor {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.metrics = {
      requests: 0,
      errors: 0,
      slowQueries: 0,
      averageResponseTime: 0,
      peakMemoryUsage: 0
    };
    this.startTime = Date.now();
  }

  async analyzeLogs() {
    try {
      const logFiles = fs.readdirSync(this.logDir);
      const analysis = {
        timestamp: new Date().toISOString(),
        period: 'last_hour',
        summary: {},
        alerts: []
      };

      for (const file of logFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const stats = await this.analyzeLogFile(filePath);
          analysis.summary[file] = stats;
        }
      }

      // Generar alertas basadas en el análisis
      analysis.alerts = this.generateAlerts(analysis.summary);

      return analysis;
    } catch (error) {
      logger.error('Error analyzing logs', { error: error.message });
      return null;
    }
  }

  async analyzeLogFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const stats = {
        totalLines: lines.length,
        errors: 0,
        warnings: 0,
        slowRequests: 0,
        averageResponseTime: 0,
        lastModified: fs.statSync(filePath).mtime
      };

      let totalResponseTime = 0;
      let responseTimeCount = 0;

      for (const line of lines) {
        try {
          const logEntry = JSON.parse(line);
          
          if (logEntry.level === 'ERROR') stats.errors++;
          if (logEntry.level === 'WARN') stats.warnings++;
          
          if (logEntry.context && logEntry.context.duration) {
            totalResponseTime += logEntry.context.duration;
            responseTimeCount++;
            
            if (logEntry.context.duration > 2000) {
              stats.slowRequests++;
            }
          }
        } catch (parseError) {
          // Ignorar líneas que no son JSON válido
        }
      }

      if (responseTimeCount > 0) {
        stats.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
      }

      return stats;
    } catch (error) {
      logger.error('Error analyzing log file', { file: filePath, error: error.message });
      return null;
    }
  }

  generateAlerts(summary) {
    const alerts = [];

    // Verificar errores
    for (const [file, stats] of Object.entries(summary)) {
      if (stats && stats.errors > 10) {
        alerts.push({
          type: 'error_rate',
          severity: 'high',
          message: `High error rate in ${file}: ${stats.errors} errors`,
          file,
          count: stats.errors
        });
      }
    }

    // Verificar requests lentos
    for (const [file, stats] of Object.entries(summary)) {
      if (stats && stats.slowRequests > 5) {
        alerts.push({
          type: 'slow_requests',
          severity: 'medium',
          message: `High number of slow requests in ${file}: ${stats.slowRequests} slow requests`,
          file,
          count: stats.slowRequests
        });
      }
    }

    // Verificar tiempo de respuesta promedio
    for (const [file, stats] of Object.entries(summary)) {
      if (stats && stats.averageResponseTime > 1000) {
        alerts.push({
          type: 'average_response_time',
          severity: 'medium',
          message: `High average response time in ${file}: ${stats.averageResponseTime}ms`,
          file,
          value: stats.averageResponseTime
        });
      }
    }

    return alerts;
  }

  async generateReport() {
    const analysis = await this.analyzeLogs();
    
    if (!analysis) {
      console.log('❌ No se pudo generar el reporte de logs');
      return;
    }

    console.log('\n📊 REPORTE DE LOGS - ÚLTIMA HORA');
    console.log('=' * 50);
    console.log(`📅 Fecha: ${analysis.timestamp}`);
    console.log(`⏱️  Período: ${analysis.period}`);
    
    console.log('\n📋 RESUMEN POR ARCHIVO:');
    for (const [file, stats] of Object.entries(analysis.summary)) {
      if (stats) {
        console.log(`\n📄 ${file}:`);
        console.log(`   📊 Total de líneas: ${stats.totalLines}`);
        console.log(`   ❌ Errores: ${stats.errors}`);
        console.log(`   ⚠️  Advertencias: ${stats.warnings}`);
        console.log(`   🐌 Requests lentos: ${stats.slowRequests}`);
        console.log(`   ⏱️  Tiempo promedio: ${stats.averageResponseTime}ms`);
      }
    }

    if (analysis.alerts.length > 0) {
      console.log('\n🚨 ALERTAS:');
      for (const alert of analysis.alerts) {
        const icon = alert.severity === 'high' ? '🔴' : '🟡';
        console.log(`${icon} ${alert.message}`);
      }
    } else {
      console.log('\n✅ No hay alertas - Sistema funcionando correctamente');
    }

    console.log('\n' + '=' * 50);
  }

  async monitorRealtime() {
    console.log('🔍 Iniciando monitoreo en tiempo real...');
    
    setInterval(async () => {
      const analysis = await this.analyzeLogs();
      
      if (analysis && analysis.alerts.length > 0) {
        console.log('\n🚨 ALERTAS DETECTADAS:');
        for (const alert of analysis.alerts) {
          const icon = alert.severity === 'high' ? '🔴' : '🟡';
          console.log(`${icon} ${alert.message}`);
        }
      }
    }, 60000); // Cada minuto
  }

  async cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  Log eliminado: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} logs antiguos eliminados`);
      }
    } catch (error) {
      logger.error('Error cleaning up old logs', { error: error.message });
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const monitor = new LogMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'report':
      monitor.generateReport();
      break;
    case 'monitor':
      monitor.monitorRealtime();
      break;
    case 'cleanup':
      monitor.cleanupOldLogs();
      break;
    default:
      console.log('Uso: node log-monitor.js [report|monitor|cleanup]');
      console.log('  report  - Generar reporte de logs');
      console.log('  monitor - Monitoreo en tiempo real');
      console.log('  cleanup - Limpiar logs antiguos');
  }
}

module.exports = LogMonitor;

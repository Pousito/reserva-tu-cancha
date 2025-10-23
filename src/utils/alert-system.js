/**
 * Sistema de Alertas Avanzado
 * Monitorea métricas y envía alertas por email, webhook o logs
 */

const nodemailer = require('nodemailer');
const EventEmitter = require('events');

class AlertSystem extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.alertHistory = [];
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Inicializar transportador de email
   */
  initializeEmailTransporter() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
  }

  /**
   * Configurar alertas
   */
  setupAlerts() {
    // Alertas de rendimiento
    this.setupPerformanceAlerts();
    
    // Alertas de errores
    this.setupErrorAlerts();
    
    // Alertas de negocio
    this.setupBusinessAlerts();
    
    // Alertas de sistema
    this.setupSystemAlerts();
  }

  /**
   * Configurar alertas de rendimiento
   */
  setupPerformanceAlerts() {
    // API lenta
    this.addAlert('slowApi', {
      condition: (data) => data.duration > 5000,
      message: 'API lenta detectada',
      severity: 'warning',
      channels: ['email', 'log'],
      cooldown: 300000 // 5 minutos
    });

    // Query de DB lenta
    this.addAlert('slowDatabaseQuery', {
      condition: (data) => data.duration > 2000,
      message: 'Query de base de datos lenta',
      severity: 'warning',
      channels: ['email', 'log'],
      cooldown: 600000 // 10 minutos
    });

    // Tasa de error alta
    this.addAlert('highErrorRate', {
      condition: (data) => data.errorRate > 0.05, // 5%
      message: 'Tasa de error alta detectada',
      severity: 'critical',
      channels: ['email', 'webhook', 'log'],
      cooldown: 900000 // 15 minutos
    });
  }

  /**
   * Configurar alertas de errores
   */
  setupErrorAlerts() {
    // Error crítico
    this.addAlert('criticalError', {
      condition: (data) => data.statusCode >= 500,
      message: 'Error crítico del servidor',
      severity: 'critical',
      channels: ['email', 'webhook', 'log'],
      cooldown: 60000 // 1 minuto
    });

    // Error de pago
    this.addAlert('paymentError', {
      condition: (data) => data.type === 'payment' && !data.success,
      message: 'Error en procesamiento de pago',
      severity: 'critical',
      channels: ['email', 'log'],
      cooldown: 300000 // 5 minutos
    });

    // Error de base de datos
    this.addAlert('databaseError', {
      condition: (data) => data.type === 'database',
      message: 'Error de base de datos',
      severity: 'critical',
      channels: ['email', 'webhook', 'log'],
      cooldown: 300000 // 5 minutos
    });
  }

  /**
   * Configurar alertas de negocio
   */
  setupBusinessAlerts() {
    // Caída en reservas
    this.addAlert('reservationDrop', {
      condition: (data) => data.currentHour < data.previousHour * 0.5,
      message: 'Caída significativa en reservas',
      severity: 'warning',
      channels: ['email', 'log'],
      cooldown: 1800000 // 30 minutos
    });

    // Pago fallido
    this.addAlert('paymentFailure', {
      condition: (data) => data.failureRate > 0.1, // 10%
      message: 'Tasa alta de fallos en pagos',
      severity: 'critical',
      channels: ['email', 'log'],
      cooldown: 600000 // 10 minutos
    });
  }

  /**
   * Configurar alertas de sistema
   */
  setupSystemAlerts() {
    // Uso alto de memoria
    this.addAlert('highMemoryUsage', {
      condition: (data) => data.heapUsed / data.heapTotal > 0.8,
      message: 'Uso alto de memoria detectado',
      severity: 'warning',
      channels: ['email', 'log'],
      cooldown: 900000 // 15 minutos
    });

    // Muchas conexiones de DB
    this.addAlert('highDatabaseConnections', {
      condition: (data) => data.connections > 80,
      message: 'Muchas conexiones de base de datos',
      severity: 'warning',
      channels: ['email', 'log'],
      cooldown: 600000 // 10 minutos
    });

    // Servidor inactivo
    this.addAlert('serverInactive', {
      condition: (data) => data.uptime > 24 * 60 * 60 * 1000 && data.activeRequests === 0,
      message: 'Servidor inactivo por mucho tiempo',
      severity: 'info',
      channels: ['log'],
      cooldown: 3600000 // 1 hora
    });
  }

  /**
   * Agregar alerta personalizada
   */
  addAlert(name, config) {
    this.alerts.set(name, {
      ...config,
      lastTriggered: 0,
      triggerCount: 0
    });
  }

  /**
   * Procesar evento y verificar alertas
   */
  processEvent(eventType, data) {
    for (const [alertName, alert] of this.alerts.entries()) {
      if (this.shouldTriggerAlert(alertName, alert, data)) {
        this.triggerAlert(alertName, alert, data);
      }
    }
  }

  /**
   * Verificar si debe disparar alerta
   */
  shouldTriggerAlert(alertName, alert, data) {
    // Verificar condición
    if (!alert.condition(data)) {
      return false;
    }

    // Verificar cooldown
    const now = Date.now();
    if (now - alert.lastTriggered < alert.cooldown) {
      return false;
    }

    return true;
  }

  /**
   * Disparar alerta
   */
  async triggerAlert(alertName, alert, data) {
    const now = Date.now();
    alert.lastTriggered = now;
    alert.triggerCount++;

    const alertData = {
      name: alertName,
      message: alert.message,
      severity: alert.severity,
      timestamp: now,
      data: data,
      triggerCount: alert.triggerCount
    };

    // Registrar en historial
    this.alertHistory.push(alertData);
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    // Enviar por canales configurados
    for (const channel of alert.channels) {
      try {
        await this.sendAlert(channel, alertData);
      } catch (error) {
        console.error(`Error enviando alerta por ${channel}:`, error);
      }
    }

    // Emitir evento
    this.emit('alertTriggered', alertData);
  }

  /**
   * Enviar alerta por canal específico
   */
  async sendAlert(channel, alertData) {
    switch (channel) {
      case 'email':
        await this.sendEmailAlert(alertData);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alertData);
        break;
      case 'log':
        this.sendLogAlert(alertData);
        break;
    }
  }

  /**
   * Enviar alerta por email
   */
  async sendEmailAlert(alertData) {
    if (!this.emailTransporter) {
      console.warn('Email transporter no configurado');
      return;
    }

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    const emailContent = {
      from: process.env.EMAIL_USER,
      to: process.env.ALERT_EMAIL || process.env.EMAIL_USER,
      subject: `${severityEmoji[alertData.severity]} ${alertData.message}`,
      html: `
        <h2>${alertData.message}</h2>
        <p><strong>Severidad:</strong> ${alertData.severity}</p>
        <p><strong>Timestamp:</strong> ${new Date(alertData.timestamp).toLocaleString()}</p>
        <p><strong>Trigger Count:</strong> ${alertData.triggerCount}</p>
        <h3>Datos:</h3>
        <pre>${JSON.stringify(alertData.data, null, 2)}</pre>
        <hr>
        <p><small>Sistema de Alertas - Reserva Tu Cancha</small></p>
      `
    };

    await this.emailTransporter.sendMail(emailContent);
  }

  /**
   * Enviar alerta por webhook
   */
  async sendWebhookAlert(alertData) {
    if (!process.env.WEBHOOK_URL) {
      console.warn('Webhook URL no configurado');
      return;
    }

    const webhookData = {
      text: `🚨 ${alertData.message}`,
      attachments: [{
        color: alertData.severity === 'critical' ? 'danger' : 
               alertData.severity === 'warning' ? 'warning' : 'good',
        fields: [
          { title: 'Severidad', value: alertData.severity, short: true },
          { title: 'Timestamp', value: new Date(alertData.timestamp).toLocaleString(), short: true },
          { title: 'Trigger Count', value: alertData.triggerCount.toString(), short: true },
          { title: 'Datos', value: JSON.stringify(alertData.data, null, 2), short: false }
        ]
      }]
    };

    const response = await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  /**
   * Enviar alerta por log
   */
  sendLogAlert(alertData) {
    const logLevel = alertData.severity === 'critical' ? 'error' : 
                    alertData.severity === 'warning' ? 'warn' : 'info';
    
    console[logLevel](`🚨 ALERTA [${alertData.name}]: ${alertData.message}`, {
      severity: alertData.severity,
      timestamp: alertData.timestamp,
      data: alertData.data,
      triggerCount: alertData.triggerCount
    });
  }

  /**
   * Obtener historial de alertas
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Obtener estadísticas de alertas
   */
  getAlertStats() {
    const stats = {
      totalAlerts: this.alertHistory.length,
      alertsBySeverity: { info: 0, warning: 0, critical: 0 },
      alertsByType: {},
      last24Hours: 0,
      lastHour: 0
    };

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    for (const alert of this.alertHistory) {
      // Por severidad
      stats.alertsBySeverity[alert.severity]++;
      
      // Por tipo
      if (!stats.alertsByType[alert.name]) {
        stats.alertsByType[alert.name] = 0;
      }
      stats.alertsByType[alert.name]++;
      
      // Por tiempo
      if (alert.timestamp > oneDayAgo) {
        stats.last24Hours++;
      }
      if (alert.timestamp > oneHourAgo) {
        stats.lastHour++;
      }
    }

    return stats;
  }

  /**
   * Limpiar alertas antiguas
   */
  cleanupOldAlerts(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 días
    const now = Date.now();
    this.alertHistory = this.alertHistory.filter(alert => 
      now - alert.timestamp < maxAge
    );
  }
}

// Instancia singleton
const alertSystem = new AlertSystem();

module.exports = alertSystem;
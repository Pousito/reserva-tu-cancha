/**
 * Sistema de Alertas por Email
 * Envía alertas críticas por email usando SendGrid
 */

const nodemailer = require('nodemailer');
const logger = require('./advanced-logger');

class AlertSystem {
  constructor() {
    this.transporter = null;
    this.alertThresholds = {
      errorRate: 10,        // 10 errores por minuto
      slowQueries: 5,       // 5 consultas lentas por minuto
      criticalErrors: 1     // 1 error crítico
    };
    this.alertCooldown = 5 * 60 * 1000; // 5 minutos
    this.lastAlerts = new Map();
    
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      logger.info('Alert system initialized', { 
        smtp_host: process.env.SMTP_HOST,
        smtp_user: process.env.SMTP_USER 
      });
    } catch (error) {
      logger.error('Failed to initialize alert system', { error: error.message });
    }
  }

  shouldSendAlert(alertType) {
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertType);
    
    if (!lastAlert) {
      this.lastAlerts.set(alertType, now);
      return true;
    }
    
    if (now - lastAlert > this.alertCooldown) {
      this.lastAlerts.set(alertType, now);
      return true;
    }
    
    return false;
  }

  async sendCriticalAlert(subject, message, context = {}) {
    if (!this.shouldSendAlert('critical')) {
      return;
    }

    const emailContent = this.formatCriticalAlert(subject, message, context);
    
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL || 'admin@reservatuscanchas.cl',
        subject: `🚨 CRITICAL ALERT: ${subject}`,
        html: emailContent
      });
      
      logger.info('Critical alert sent', { subject, recipient: process.env.ADMIN_EMAIL });
    } catch (error) {
      logger.error('Failed to send critical alert', { error: error.message });
    }
  }

  async sendPerformanceAlert(subject, message, context = {}) {
    if (!this.shouldSendAlert('performance')) {
      return;
    }

    const emailContent = this.formatPerformanceAlert(subject, message, context);
    
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL || 'admin@reservatuscanchas.cl',
        subject: `⚠️ PERFORMANCE ALERT: ${subject}`,
        html: emailContent
      });
      
      logger.info('Performance alert sent', { subject, recipient: process.env.ADMIN_EMAIL });
    } catch (error) {
      logger.error('Failed to send performance alert', { error: error.message });
    }
  }

  async sendSecurityAlert(subject, message, context = {}) {
    if (!this.shouldSendAlert('security')) {
      return;
    }

    const emailContent = this.formatSecurityAlert(subject, message, context);
    
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL || 'admin@reservatuscanchas.cl',
        subject: `🔒 SECURITY ALERT: ${subject}`,
        html: emailContent
      });
      
      logger.info('Security alert sent', { subject, recipient: process.env.ADMIN_EMAIL });
    } catch (error) {
      logger.error('Failed to send security alert', { error: error.message });
    }
  }

  formatCriticalAlert(subject, message, context) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>🚨 CRITICAL ALERT</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h2>${subject}</h2>
          <p style="font-size: 16px; color: #333;">${message}</p>
          
          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3>Context:</h3>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(context, null, 2)}
            </pre>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
            <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
            <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}<br>
            <strong>Server:</strong> ${process.env.HOSTNAME || 'unknown'}
          </div>
        </div>
      </div>
    `;
  }

  formatPerformanceAlert(subject, message, context) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ffc107; color: #000; padding: 20px; text-align: center;">
          <h1>⚠️ PERFORMANCE ALERT</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h2>${subject}</h2>
          <p style="font-size: 16px; color: #333;">${message}</p>
          
          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3>Performance Metrics:</h3>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(context, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    `;
  }

  formatSecurityAlert(subject, message, context) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6f42c1; color: white; padding: 20px; text-align: center;">
          <h1>🔒 SECURITY ALERT</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <h2>${subject}</h2>
          <p style="font-size: 16px; color: #333;">${message}</p>
          
          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #6f42c1; margin: 20px 0;">
            <h3>Security Details:</h3>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(context, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    `;
  }

  // Métricas de alertas
  async checkSystemHealth() {
    try {
      // Verificar métricas del sistema
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Alertar si el uso de memoria es muy alto
      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
        await this.sendPerformanceAlert(
          'High Memory Usage',
          'Memory usage is above 90%',
          { memoryUsage }
        );
      }
      
      // Alertar si hay muchos errores recientes
      const errorCount = await this.getRecentErrorCount();
      if (errorCount > this.alertThresholds.errorRate) {
        await this.sendCriticalAlert(
          'High Error Rate',
          `Error rate is above threshold: ${errorCount} errors in the last minute`,
          { errorCount, threshold: this.alertThresholds.errorRate }
        );
      }
      
    } catch (error) {
      logger.error('Failed to check system health', { error: error.message });
    }
  }

  async getRecentErrorCount() {
    // Implementar lógica para contar errores recientes
    // Por ahora, retornar 0
    return 0;
  }
}

module.exports = new AlertSystem();

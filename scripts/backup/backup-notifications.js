#!/usr/bin/env node

/**
 * Sistema de Notificaciones para Respaldos
 * Envía notificaciones por email, Slack, Discord, etc.
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class BackupNotifications {
  constructor() {
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };
    
    this.notificationChannels = {
      email: process.env.BACKUP_EMAIL_NOTIFICATIONS === 'true',
      slack: process.env.BACKUP_SLACK_NOTIFICATIONS === 'true',
      discord: process.env.BACKUP_DISCORD_NOTIFICATIONS === 'true'
    };
    
    this.recipients = {
      email: process.env.BACKUP_EMAIL_RECIPIENTS ? process.env.BACKUP_EMAIL_RECIPIENTS.split(',') : [],
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL
    };
  }

  /**
   * Enviar notificación de respaldo exitoso
   */
  async notifyBackupSuccess(backupInfo) {
    const message = {
      title: '✅ Respaldo Completado Exitosamente',
      content: this.generateSuccessMessage(backupInfo),
      type: 'success',
      timestamp: new Date().toISOString()
    };

    await this.sendNotifications(message);
  }

  /**
   * Enviar notificación de error en respaldo
   */
  async notifyBackupError(errorInfo) {
    const message = {
      title: '❌ Error en Respaldo',
      content: this.generateErrorMessage(errorInfo),
      type: 'error',
      timestamp: new Date().toISOString()
    };

    await this.sendNotifications(message);
  }

  /**
   * Enviar notificación de limpieza de respaldos
   */
  async notifyCleanup(cleanupInfo) {
    const message = {
      title: '🧹 Limpieza de Respaldos Completada',
      content: this.generateCleanupMessage(cleanupInfo),
      type: 'info',
      timestamp: new Date().toISOString()
    };

    await this.sendNotifications(message);
  }

  /**
   * Enviar notificación de espacio en disco bajo
   */
  async notifyLowDiskSpace(diskInfo) {
    const message = {
      title: '⚠️ Espacio en Disco Bajo',
      content: this.generateLowDiskSpaceMessage(diskInfo),
      type: 'warning',
      timestamp: new Date().toISOString()
    };

    await this.sendNotifications(message);
  }

  /**
   * Enviar notificaciones por todos los canales configurados
   */
  async sendNotifications(message) {
    const promises = [];

    if (this.notificationChannels.email && this.recipients.email.length > 0) {
      promises.push(this.sendEmailNotification(message));
    }

    if (this.notificationChannels.slack && this.recipients.slack) {
      promises.push(this.sendSlackNotification(message));
    }

    if (this.notificationChannels.discord && this.recipients.discord) {
      promises.push(this.sendDiscordNotification(message));
    }

    try {
      await Promise.all(promises);
      console.log('📧 Notificaciones enviadas exitosamente');
    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error);
    }
  }

  /**
   * Enviar notificación por email
   */
  async sendEmailNotification(message) {
    try {
      const transporter = nodemailer.createTransporter(this.emailConfig);

      const mailOptions = {
        from: this.emailConfig.auth.user,
        to: this.recipients.email.join(', '),
        subject: `[Reserva Tu Cancha] ${message.title}`,
        html: this.generateEmailHTML(message),
        text: message.content
      };

      await transporter.sendMail(mailOptions);
      console.log('📧 Email enviado exitosamente');
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación por Slack
   */
  async sendSlackNotification(message) {
    try {
      const fetch = require('node-fetch');
      
      const payload = {
        text: message.title,
        attachments: [
          {
            color: this.getColorForType(message.type),
            fields: [
              {
                title: 'Mensaje',
                value: message.content,
                short: false
              },
              {
                title: 'Timestamp',
                value: new Date(message.timestamp).toLocaleString('es-CL'),
                short: true
              }
            ]
          }
        ]
      };

      const response = await fetch(this.recipients.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('💬 Notificación de Slack enviada');
      } else {
        throw new Error(`Slack API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de Slack:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación por Discord
   */
  async sendDiscordNotification(message) {
    try {
      const fetch = require('node-fetch');
      
      const embed = {
        title: message.title,
        description: message.content,
        color: this.getDiscordColorForType(message.type),
        timestamp: message.timestamp,
        footer: {
          text: 'Sistema de Respaldos - Reserva Tu Cancha'
        }
      };

      const payload = {
        embeds: [embed]
      };

      const response = await fetch(this.recipients.discord, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('🎮 Notificación de Discord enviada');
      } else {
        throw new Error(`Discord API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de Discord:', error);
      throw error;
    }
  }

  /**
   * Generar mensaje de éxito
   */
  generateSuccessMessage(backupInfo) {
    return `
🎉 Respaldo completado exitosamente

📊 Detalles:
• Tipo: ${backupInfo.type || 'Completo'}
• Tamaño: ${backupInfo.size ? this.formatBytes(backupInfo.size) : 'N/A'}
• Duración: ${backupInfo.duration ? `${backupInfo.duration}ms` : 'N/A'}
• Compresión: ${backupInfo.compressed ? 'Sí' : 'No'}
• Encriptación: ${backupInfo.encrypted ? 'Sí' : 'No'}
• Checksum: ${backupInfo.checksum ? backupInfo.checksum.substring(0, 16) + '...' : 'N/A'}

🕐 Completado: ${new Date().toLocaleString('es-CL')}
    `.trim();
  }

  /**
   * Generar mensaje de error
   */
  generateErrorMessage(errorInfo) {
    return `
❌ Error en el proceso de respaldo

🚨 Detalles del error:
• Error: ${errorInfo.error || 'Error desconocido'}
• Tipo: ${errorInfo.type || 'N/A'}
• Duración: ${errorInfo.duration ? `${errorInfo.duration}ms` : 'N/A'}

🕐 Ocurrido: ${new Date().toLocaleString('es-CL')}

🔧 Acción requerida: Revisar logs y corregir el problema
    `.trim();
  }

  /**
   * Generar mensaje de limpieza
   */
  generateCleanupMessage(cleanupInfo) {
    return `
🧹 Limpieza de respaldos completada

📊 Detalles:
• Respaldos eliminados: ${cleanupInfo.deleted || 0}
• Espacio liberado: ${cleanupInfo.spaceFreed ? this.formatBytes(cleanupInfo.spaceFreed) : 'N/A'}
• Respaldos restantes: ${cleanupInfo.remaining || 0}

🕐 Completado: ${new Date().toLocaleString('es-CL')}
    `.trim();
  }

  /**
   * Generar mensaje de espacio bajo
   */
  generateLowDiskSpaceMessage(diskInfo) {
    return `
⚠️ Advertencia: Espacio en disco bajo

📊 Estado del disco:
• Espacio usado: ${diskInfo.used ? this.formatBytes(diskInfo.used) : 'N/A'}
• Espacio disponible: ${diskInfo.available ? this.formatBytes(diskInfo.available) : 'N/A'}
• Porcentaje usado: ${diskInfo.percentage ? `${diskInfo.percentage}%` : 'N/A'}

🕐 Detectado: ${new Date().toLocaleString('es-CL')}

🔧 Acción recomendada: Limpiar respaldos antiguos o aumentar espacio
    `.trim();
  }

  /**
   * Generar HTML para email
   */
  generateEmailHTML(message) {
    const color = this.getColorForType(message.type);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${message.title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${message.title}</h1>
            </div>
            <div class="content">
                <pre>${message.content}</pre>
            </div>
            <div class="footer">
                <p>Sistema de Respaldos - Reserva Tu Cancha</p>
                <p>Enviado automáticamente el ${new Date().toLocaleString('es-CL')}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Obtener color según tipo de mensaje
   */
  getColorForType(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[type] || '#6c757d';
  }

  /**
   * Obtener color de Discord según tipo
   */
  getDiscordColorForType(type) {
    const colors = {
      success: 0x28a745,
      error: 0xdc3545,
      warning: 0xffc107,
      info: 0x17a2b8
    };
    return colors[type] || 0x6c757d;
  }

  /**
   * Formatear bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Verificar configuración de notificaciones
   */
  checkConfiguration() {
    console.log('📧 Configuración de Notificaciones');
    console.log('==================================');
    console.log(`Email: ${this.notificationChannels.email ? '✅ Habilitado' : '❌ Deshabilitado'}`);
    console.log(`Slack: ${this.notificationChannels.slack ? '✅ Habilitado' : '❌ Deshabilitado'}`);
    console.log(`Discord: ${this.notificationChannels.discord ? '✅ Habilitado' : '❌ Deshabilitado'}`);
    
    if (this.notificationChannels.email) {
      console.log(`Destinatarios email: ${this.recipients.email.join(', ')}`);
    }
    
    if (this.notificationChannels.slack) {
      console.log(`Slack webhook: ${this.recipients.slack ? '✅ Configurado' : '❌ No configurado'}`);
    }
    
    if (this.notificationChannels.discord) {
      console.log(`Discord webhook: ${this.recipients.discord ? '✅ Configurado' : '❌ No configurado'}`);
    }
  }

  /**
   * Enviar notificación de prueba
   */
  async sendTestNotification() {
    const testMessage = {
      title: '🧪 Notificación de Prueba',
      content: 'Esta es una notificación de prueba del sistema de respaldos.',
      type: 'info',
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Enviando notificación de prueba...');
    await this.sendNotifications(testMessage);
    console.log('✅ Notificación de prueba enviada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const notifications = new BackupNotifications();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'config':
      notifications.checkConfiguration();
      break;
      
    case 'test':
      notifications.sendTestNotification().then(() => {
        console.log('✅ Prueba completada');
        process.exit(0);
      }).catch(error => {
        console.error('❌ Error en prueba:', error);
        process.exit(1);
      });
      break;
      
    case 'success':
      const backupInfo = {
        type: 'Completo',
        size: 1024 * 1024 * 50, // 50MB
        duration: 5000,
        compressed: true,
        encrypted: true,
        checksum: 'abc123def456'
      };
      notifications.notifyBackupSuccess(backupInfo);
      break;
      
    case 'error':
      const errorInfo = {
        error: 'Error de conexión a la base de datos',
        type: 'Completo',
        duration: 2000
      };
      notifications.notifyBackupError(errorInfo);
      break;
      
    default:
      console.log('Uso: node backup-notifications.js [config|test|success|error]');
      process.exit(1);
  }
}

module.exports = BackupNotifications;

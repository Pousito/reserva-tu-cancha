const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Asegurar que dotenv esté cargado
      require('dotenv').config();
      
      // Usar variables de entorno directamente
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.zoho.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        secure: false
      };
      
      // Debug: Mostrar configuración de email
      console.log('📧 Configuración de email:', {
        host: emailConfig.host,
        port: emailConfig.port,
        user: emailConfig.user ? 'Configurado' : 'No configurado',
        pass: emailConfig.pass ? 'Configurado' : 'No configurado',
        env: {
          SMTP_HOST: process.env.SMTP_HOST ? 'Definido' : 'No definido',
          SMTP_USER: process.env.SMTP_USER ? 'Definido' : 'No definido',
          SMTP_PASS: process.env.SMTP_PASS ? 'Definido' : 'No definido'
        }
      });
      
      // Verificar si las credenciales de email están configuradas
      if (!emailConfig.user || !emailConfig.pass) {
        console.log('⚠️ Email no configurado - intentando configuración de producción');
        
        // Configuración de fallback para producción
        if (process.env.NODE_ENV === 'production') {
          emailConfig.host = 'smtp.zoho.com';
          emailConfig.port = 587;
          emailConfig.user = 'soporte@reservatuscanchas.cl';
          emailConfig.pass = 'KWAX CS8q 61cN';
          emailConfig.secure = false;
          
          console.log('📧 Usando configuración de fallback para producción');
        } else {
          console.log('⚠️ Email no configurado - usando modo simulación');
          this.isConfigured = false;
          return;
        }
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.pass
        }
      });

      // Configurar como disponible inmediatamente
      this.isConfigured = true;
      console.log('✅ Servicio de email configurado correctamente');

      // Verificar conexión en segundo plano
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Error verificando conexión email:', error.message);
          // No cambiar isConfigured aquí, solo mostrar el error
        } else {
          console.log('✅ Conexión email verificada exitosamente');
        }
      });

    } catch (error) {
      console.error('❌ Error inicializando email service:', error.message);
      this.isConfigured = false;
    }
  }

  // Generar plantilla HTML para confirmación de reserva
  generateReservationEmailHTML(reservaData) {
    const { 
      codigo_reserva, 
      nombre_cliente, 
      email_cliente, 
      complejo, 
      cancha, 
      fecha, 
      hora_inicio, 
      hora_fin, 
      precio_total 
    } = reservaData;

    // Formatear fecha (usando zona horaria local)
    let fechaObj;
    if (typeof fecha === 'string') {
      const [año, mes, dia] = fecha.split('-').map(Number);
      fechaObj = new Date(año, mes - 1, dia);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      // Fallback: intentar convertir a string primero
      const fechaStr = fecha.toString();
      const [año, mes, dia] = fechaStr.split('-').map(Number);
      fechaObj = new Date(año, mes - 1, dia);
    }
    
    const fechaFormateada = fechaObj.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Función para formatear hora (quitar segundos si existen)
    const formatearHora = (hora) => {
      if (typeof hora === 'string') {
        // Si tiene formato HH:MM:SS, quitar los segundos
        return hora.includes(':') && hora.split(':').length === 3 ? 
               hora.substring(0, 5) : hora;
      }
      return hora;
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Reserva - Reserva Tu Cancha</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #007bff;
                margin: 0;
                font-size: 28px;
            }
            .reservation-details {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .detail-label {
                font-weight: bold;
                color: #495057;
            }
            .detail-value {
                color: #212529;
            }
            .code-highlight {
                background-color: #007bff;
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
                letter-spacing: 2px;
            }
            .instructions {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
            }
            .instructions h3 {
                color: #155724;
                margin-top: 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e9ecef;
                color: #6c757d;
                font-size: 14px;
            }
            .success-icon {
                color: #28a745;
                font-size: 24px;
                margin-right: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏟️ Reserva Tu Cancha</h1>
                <p>Confirmación de Reserva</p>
            </div>

            <div style="text-align: center; margin: 20px 0;">
                <span class="success-icon">✅</span>
                <strong>¡Reserva Confirmada Exitosamente!</strong>
            </div>

            <div class="code-highlight">
                Código de Reserva: ${codigo_reserva}
            </div>

            <div class="reservation-details">
                <h3>📋 Detalles de la Reserva</h3>
                <div class="detail-row">
                    <span class="detail-label">Cliente:</span>
                    <span class="detail-value">${nombre_cliente}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${email_cliente}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Complejo:</span>
                    <span class="detail-value">${complejo}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cancha:</span>
                    <span class="detail-value">${cancha}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha:</span>
                    <span class="detail-value">${fechaFormateada}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Horario:</span>
                    <span class="detail-value">${formatearHora(hora_inicio)} - ${formatearHora(hora_fin)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Pagado:</span>
                    <span class="detail-value">$${precio_total.toLocaleString()}</span>
                </div>
            </div>

            <div class="instructions">
                <h3>📝 Instrucciones Importantes</h3>
                <ul>
                    <li><strong>Guarda este email</strong> como comprobante de tu reserva</li>
                    <li><strong>Presenta el código de reserva</strong> al llegar al complejo</li>
                    <li><strong>Llega 10 minutos antes</strong> de tu horario reservado</li>
                    <li><strong>Las cancelaciones o cambios se deben realizar con 24 horas de anticipación.</strong> Para esto contactar a <a href="mailto:soporte@reservatuscanchas.cl">soporte@reservatuscanchas.cl</a></li>
                </ul>
            </div>

            <div class="footer">
                <p>Gracias por elegir Reserva Tu Cancha</p>
                <p>Para consultas: usa el código de reserva en nuestro sitio web</p>
                <p><small>Este es un email automático, por favor no responder</small></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Método para crear transporter específico para reservas
  createReservasTransporter() {
    const reservasConfig = {
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_RESERVAS_USER || 'reservas@reservatuscanchas.cl',
      pass: process.env.SMTP_RESERVAS_PASS || 'L660mKFmcDBk',
      secure: false
    };

    console.log('📧 Configuración de email para reservas:', {
      host: reservasConfig.host,
      port: reservasConfig.port,
      user: reservasConfig.user ? 'Configurado' : 'No configurado',
      pass: reservasConfig.pass ? 'Configurado' : 'No configurado'
    });

    return nodemailer.createTransport({
      host: reservasConfig.host,
      port: reservasConfig.port,
      secure: reservasConfig.secure,
      auth: {
        user: reservasConfig.user,
        pass: reservasConfig.pass
      }
    });
  }

  // Enviar email de confirmación de reserva al cliente
  async sendReservationConfirmation(reservaData) {
    if (!this.isConfigured) {
      console.log('📧 Email no configurado - simulando envío de confirmación al cliente');
      console.log('📧 Datos que se habrían enviado:', {
        from: 'reservas@reservatuscanchas.cl',
        to: reservaData.email_cliente,
        subject: `Confirmación de Reserva - ${reservaData.codigo_reserva}`,
        complejo: reservaData.complejo,
        cancha: reservaData.cancha,
        fecha: reservaData.fecha
      });
      return { success: true, simulated: true };
    }

    try {
      // Crear transporter específico para reservas
      const reservasTransporter = this.createReservasTransporter();
      
      const mailOptions = {
        from: `"Reserva Tu Cancha" <reservas@reservatuscanchas.cl>`,
        to: reservaData.email_cliente,
        subject: `✅ Confirmación de Reserva - ${reservaData.codigo_reserva}`,
        html: this.generateReservationEmailHTML(reservaData),
        text: `
Confirmación de Reserva - Reserva Tu Cancha

¡Hola ${reservaData.nombre_cliente}!

Tu reserva ha sido confirmada exitosamente.

Código de Reserva: ${reservaData.codigo_reserva}

Detalles:
- Complejo: ${reservaData.complejo}
- Cancha: ${reservaData.cancha}
- Fecha: ${reservaData.fecha}
- Horario: ${formatearHora(reservaData.hora_inicio)} - ${formatearHora(reservaData.hora_fin)}
- Total: $${reservaData.precio_total.toLocaleString()}

Instrucciones:
1. Guarda este email como comprobante
2. Presenta el código de reserva al llegar al complejo
3. Llega 10 minutos antes de tu horario
4. Las cancelaciones o cambios se deben realizar con 24 horas de anticipación. Para esto contactar a soporte@reservatuscanchas.cl

Gracias por elegir Reserva Tu Cancha!
        `
      };

      const result = await reservasTransporter.sendMail(mailOptions);
      console.log('✅ Email de confirmación enviado al cliente:', result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Error enviando email de confirmación al cliente:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener email del administrador del complejo
  getComplexAdminEmail(complejoNombre) {
    const adminEmails = {
      'MagnaSports': 'naxiin320@gmail.com',
      'Complejo Deportivo Central': 'naxiin_320@hotmail.com',
      'Padel Club Premium': 'naxiin_320@hotmail.com',
      'Centro Deportivo Costero': 'naxiin_320@hotmail.com',
      'Club Deportivo Norte': 'naxiin_320@hotmail.com'
    };
    
    return adminEmails[complejoNombre] || 'admin@reservatuscanchas.cl';
  }

  // Enviar notificaciones a administradores
  async sendAdminNotifications(reservaData) {
    if (!this.isConfigured) {
      console.log('📧 Email no configurado - simulando notificaciones a administradores');
      return { success: true, simulated: true };
    }

    const results = [];

    try {
      // 1. Notificación al administrador del complejo específico
      const complexAdminEmail = this.getComplexAdminEmail(reservaData.complejo);
      
      const complexAdminResult = await this.sendComplexAdminNotification(reservaData, complexAdminEmail);
      results.push({ type: 'complex_admin', email: complexAdminEmail, result: complexAdminResult });

      // 2. Notificación al super admin (dueño de la plataforma)
      const superAdminResult = await this.sendSuperAdminNotification(reservaData);
      results.push({ type: 'super_admin', email: 'admin@reservatuscanchas.cl', result: superAdminResult });

      console.log('✅ Notificaciones a administradores enviadas:', results);
      return { success: true, results: results };

    } catch (error) {
      console.error('❌ Error enviando notificaciones a administradores:', error.message);
      return { success: false, error: error.message, results: results };
    }
  }

  // Notificación al administrador del complejo
  async sendComplexAdminNotification(reservaData, adminEmail) {
    try {
      // Crear transporter específico para reservas
      const reservasTransporter = this.createReservasTransporter();
      
      const mailOptions = {
        from: `"Reserva Tu Cancha" <reservas@reservatuscanchas.cl>`,
        to: adminEmail,
        subject: `🔔 Nueva Reserva en ${reservaData.complejo} - ${reservaData.codigo_reserva}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">🔔 Nueva Reserva en tu Complejo</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles de la Reserva</h3>
              <p><strong>Código:</strong> <span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 4px;">${reservaData.codigo_reserva}</span></p>
              <p><strong>Cliente:</strong> ${reservaData.nombre_cliente}</p>
              <p><strong>Email:</strong> ${reservaData.email_cliente}</p>
              <p><strong>Complejo:</strong> ${reservaData.complejo}</p>
              <p><strong>Cancha:</strong> ${reservaData.cancha}</p>
              <p><strong>Fecha:</strong> ${reservaData.fecha}</p>
              <p><strong>Horario:</strong> ${formatearHora(reservaData.hora_inicio)} - ${formatearHora(reservaData.hora_fin)}</p>
              <p><strong>Total:</strong> $${reservaData.precio_total.toLocaleString()}</p>
            </div>
            <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 30px;">
              Este email fue generado automáticamente por el sistema Reserva Tu Cancha
            </p>
          </div>
        `,
        text: `
Nueva Reserva en tu Complejo - Reserva Tu Cancha

Código: ${reservaData.codigo_reserva}
Cliente: ${reservaData.nombre_cliente}
Email: ${reservaData.email_cliente}
Complejo: ${reservaData.complejo}
Cancha: ${reservaData.cancha}
Fecha: ${reservaData.fecha}
Horario: ${formatearHora(reservaData.hora_inicio)} - ${formatearHora(reservaData.hora_fin)}
Total: $${reservaData.precio_total.toLocaleString()}

Este email fue generado automáticamente por el sistema Reserva Tu Cancha
        `
      };

      const result = await reservasTransporter.sendMail(mailOptions);
      console.log(`✅ Notificación enviada al admin del complejo (${adminEmail}):`, result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`❌ Error enviando notificación al admin del complejo (${adminEmail}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Notificación al super admin
  async sendSuperAdminNotification(reservaData) {
    try {
      // Crear transporter específico para reservas
      const reservasTransporter = this.createReservasTransporter();
      
      const mailOptions = {
        from: `"Reserva Tu Cancha" <reservas@reservatuscanchas.cl>`,
        to: 'admin@reservatuscanchas.cl',
        subject: `📊 Nueva Reserva - ${reservaData.codigo_reserva}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">📊 Nueva Reserva - Control General</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Detalles de la Reserva</h3>
              <p><strong>Código:</strong> <span style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px;">${reservaData.codigo_reserva}</span></p>
              <p><strong>Cliente:</strong> ${reservaData.nombre_cliente}</p>
              <p><strong>Email:</strong> ${reservaData.email_cliente}</p>
              <p><strong>Complejo:</strong> ${reservaData.complejo}</p>
              <p><strong>Cancha:</strong> ${reservaData.cancha}</p>
              <p><strong>Fecha:</strong> ${reservaData.fecha}</p>
              <p><strong>Horario:</strong> ${formatearHora(reservaData.hora_inicio)} - ${formatearHora(reservaData.hora_fin)}</p>
              <p><strong>Total:</strong> $${reservaData.precio_total.toLocaleString()}</p>
            </div>
            <p style="color: #6c757d; font-size: 12px; text-align: center; margin-top: 30px;">
              Este email fue generado automáticamente por el sistema Reserva Tu Cancha
            </p>
          </div>
        `,
        text: `
Nueva Reserva - Control General - Reserva Tu Cancha

Código: ${reservaData.codigo_reserva}
Cliente: ${reservaData.nombre_cliente}
Email: ${reservaData.email_cliente}
Complejo: ${reservaData.complejo}
Cancha: ${reservaData.cancha}
Fecha: ${reservaData.fecha}
Horario: ${formatearHora(reservaData.hora_inicio)} - ${formatearHora(reservaData.hora_fin)}
Total: $${reservaData.precio_total.toLocaleString()}

Este email fue generado automáticamente por el sistema Reserva Tu Cancha
        `
      };

      const result = await reservasTransporter.sendMail(mailOptions);
      console.log('✅ Notificación enviada al super admin:', result.messageId);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Error enviando notificación al super admin:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de restablecimiento de contraseña
  async sendPasswordResetEmail(email, resetToken) {
    if (!this.isConfigured) {
      console.log('📧 Email no configurado - simulando envío de restablecimiento de contraseña');
      return { success: true, simulated: true };
    }

    try {
      // Determinar URL del frontend automáticamente
      const frontendUrl = process.env.FRONTEND_URL || 
                         (process.env.NODE_ENV === 'production' ? 'https://www.reservatuscanchas.cl' : 'http://localhost:3000');
      const resetUrl = `${frontendUrl}/admin-reset-password.html?token=${resetToken}`;
      
      const mailOptions = {
        from: `"Reserva Tu Cancha - Soporte" <soporte@reservatuscanchas.cl>`,
        to: email,
        subject: '🔐 Restablecimiento de Contraseña - Reserva Tu Cancha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="color: #007bff; margin: 0;">🔐 Restablecimiento de Contraseña</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Reserva Tu Cancha - Panel de Administración</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #495057; margin-top: 0;">Solicitud de Restablecimiento</h3>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de administrador.</p>
              <p>Si solicitaste este cambio, haz clic en el botón de abajo para crear una nueva contraseña:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Restablecer Contraseña
                </a>
              </div>
              
              <p style="color: #dc3545; font-weight: bold;">⚠️ Este enlace expirará en 15 minutos por seguridad.</p>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #856404; margin-top: 0;">¿No solicitaste este cambio?</h4>
              <p style="color: #856404; margin-bottom: 0;">Si no solicitaste el restablecimiento de contraseña, puedes ignorar este email. Tu cuenta permanecerá segura.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px;">
              <p>Reserva Tu Cancha - Sistema de Administración</p>
              <p>Este es un email automático, por favor no responder</p>
            </div>
          </div>
        `,
        text: `
Restablecimiento de Contraseña - Reserva Tu Cancha

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de administrador.

Si solicitaste este cambio, visita el siguiente enlace:
${resetUrl}

Este enlace expirará en 15 minutos por seguridad.

¿No solicitaste este cambio?
Si no solicitaste el restablecimiento de contraseña, puedes ignorar este email. Tu cuenta permanecerá segura.

Reserva Tu Cancha - Sistema de Administración
Este es un email automático, por favor no responder
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de restablecimiento enviado a:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Error enviando email de restablecimiento:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Enviar email de confirmación de cambio de contraseña
  async sendPasswordChangeConfirmation(email) {
    if (!this.isConfigured) {
      console.log('📧 Email no configurado - simulando envío de confirmación de cambio de contraseña');
      return { success: true, simulated: true };
    }

    try {
      const mailOptions = {
        from: `"Reserva Tu Cancha - Soporte" <soporte@reservatuscanchas.cl>`,
        to: email,
        subject: '✅ Contraseña Restablecida Exitosamente - Reserva Tu Cancha',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; border-bottom: 3px solid #28a745; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="color: #28a745; margin: 0;">✅ Contraseña Restablecida</h1>
              <p style="color: #666; margin: 10px 0 0 0;">Reserva Tu Cancha - Panel de Administración</p>
            </div>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">¡Cambio Exitoso!</h3>
              <p>Tu contraseña ha sido restablecida exitosamente.</p>
              <p>Ahora puedes acceder al panel de administración con tu nueva contraseña.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/admin-login.html" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Acceder al Panel de Administración
              </a>
            </div>
            
            <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <h4 style="color: #721c24; margin-top: 0;">⚠️ Importante</h4>
              <p style="color: #721c24; margin-bottom: 0;">Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px;">
              <p>Reserva Tu Cancha - Sistema de Administración</p>
              <p>Este es un email automático, por favor no responder</p>
            </div>
          </div>
        `,
        text: `
Contraseña Restablecida Exitosamente - Reserva Tu Cancha

¡Cambio Exitoso!

Tu contraseña ha sido restablecida exitosamente.
Ahora puedes acceder al panel de administración con tu nueva contraseña.

Acceder al Panel: ${frontendUrl}/admin-login.html

IMPORTANTE: Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.

Reserva Tu Cancha - Sistema de Administración
Este es un email automático, por favor no responder
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de confirmación de cambio enviado a:', email);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('❌ Error enviando email de confirmación de cambio:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Método principal para enviar emails de confirmación
  async sendConfirmationEmails(reservaData) {
    console.log('📧 Enviando emails de confirmación para reserva:', reservaData.codigo_reserva);
    
    const results = {
      cliente: false,
      admin_complejo: false,
      super_admin: false,
      codigo: reservaData.codigo_reserva
    };

    try {
      // 1. Enviar email de confirmación al cliente
      const clienteResult = await this.sendReservationConfirmation(reservaData);
      results.cliente = clienteResult.success;

      // 2. Enviar notificaciones a administradores
      const adminResults = await this.sendAdminNotifications(reservaData);
      if (adminResults.success) {
        if (adminResults.simulated) {
          // En modo simulación, marcar como exitoso
          results.admin_complejo = true;
          results.super_admin = true;
        } else if (adminResults.results) {
          adminResults.results.forEach(result => {
            if (result.type === 'complex_admin') {
              results.admin_complejo = result.result.success;
            } else if (result.type === 'super_admin') {
              results.super_admin = result.result.success;
            }
          });
        }
      }

      console.log('✅ Emails de confirmación procesados:', results);
      return results;

    } catch (error) {
      console.error('❌ Error procesando emails de confirmación:', error.message);
      return { ...results, error: error.message };
    }
  }

  // Método estático para enviar emails (para compatibilidad con el código existente)
  static async sendEmail(emailData) {
    const emailService = new EmailService();
    return await emailService.sendPasswordResetEmail(emailData.to, emailData.token);
  }
}

module.exports = EmailService;

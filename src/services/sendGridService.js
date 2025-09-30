const sgMail = require('@sendgrid/mail');

class SendGridService {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        
        // Configurar SendGrid
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.isConfigured = true;
        } else {
            console.log('⚠️ SENDGRID_API_KEY no configurado');
            this.isConfigured = false;
        }
    }

    async sendConfirmationEmails(emailData) {
        if (!this.isConfigured) {
            throw new Error('SendGrid no está configurado');
        }

        try {
            console.log('📧 Enviando email via SendGrid...');
            
            const msg = {
                to: emailData.email_cliente,
                from: {
                    email: process.env.FROM_EMAIL || 'noreply@reservatuscanchas.cl',
                    name: 'Reserva Tu Cancha'
                },
                subject: `Confirmación de Reserva - ${emailData.codigo_reserva}`,
                html: this.generateEmailHTML(emailData),
                text: this.generateEmailText(emailData)
            };

            const result = await sgMail.send(msg);
            console.log('✅ Email enviado exitosamente via SendGrid:', result[0].statusCode);
            
            return {
                success: true,
                provider: 'SendGrid',
                messageId: result[0].headers['x-message-id'],
                statusCode: result[0].statusCode
            };

        } catch (error) {
            console.error('❌ Error enviando email via SendGrid:', error);
            throw error;
        }
    }

    generateEmailHTML(emailData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Confirmación de Reserva</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f8f9fa; padding: 30px; }
                .code { background-color: #e74c3c; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
                .info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db; }
                .footer { text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏆 Reserva Confirmada</h1>
                </div>
                
                <div class="content">
                    <h2>¡Hola ${emailData.nombre_cliente}!</h2>
                    
                    <p>Tu reserva ha sido confirmada exitosamente. Aquí tienes los detalles:</p>
                    
                    <div class="code">
                        Código: ${emailData.codigo_reserva}
                    </div>
                    
                    <div class="info">
                        <h3>📋 Detalles de la Reserva:</h3>
                        <p><strong>Complejo:</strong> ${emailData.complejo}</p>
                        <p><strong>Cancha:</strong> ${emailData.cancha}</p>
                        <p><strong>Fecha:</strong> ${emailData.fecha}</p>
                        <p><strong>Hora:</strong> ${emailData.hora_inicio} - ${emailData.hora_fin}</p>
                        <p><strong>Precio Total:</strong> $${emailData.precio_total.toLocaleString()}</p>
                    </div>
                    
                    <div class="info">
                        <h3>📝 Instrucciones:</h3>
                        <p>• Presenta este código al llegar al complejo</p>
                        <p>• Llega 10 minutos antes de tu hora reservada</p>
                        <p>• En caso de cancelación, contacta con nosotros</p>
                    </div>
                    
                    <p>¡Esperamos verte pronto!</p>
                </div>
                
                <div class="footer">
                    <p>Reserva Tu Cancha - Sistema de Reservas Deportivas</p>
                    <p>Este email fue enviado automáticamente</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateEmailText(emailData) {
        return `
        CONFIRMACIÓN DE RESERVA - ${emailData.codigo_reserva}
        
        Hola ${emailData.nombre_cliente},
        
        Tu reserva ha sido confirmada exitosamente.
        
        CÓDIGO DE RESERVA: ${emailData.codigo_reserva}
        
        DETALLES:
        - Complejo: ${emailData.complejo}
        - Cancha: ${emailData.cancha}
        - Fecha: ${emailData.fecha}
        - Hora: ${emailData.hora_inicio} - ${emailData.hora_fin}
        - Precio Total: $${emailData.precio_total.toLocaleString()}
        
        INSTRUCCIONES:
        - Presenta este código al llegar al complejo
        - Llega 10 minutos antes de tu hora reservada
        - En caso de cancelación, contacta con nosotros
        
        ¡Esperamos verte pronto!
        
        Reserva Tu Cancha - Sistema de Reservas Deportivas
        `;
    }
}

module.exports = SendGridService;

#!/usr/bin/env node

/**
 * Script para enviar email de confirmación de reserva VIZJ4P
 * con nombre de complejo corregido a "Complejo Deportivo Borde Rio"
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function enviarEmailComplejoCorregido() {
    try {
        console.log('📧 Configurando transporter de email...');
        
        // Configuración explícita para reservas
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.zoho.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false, // STARTTLS
            auth: {
                user: process.env.SMTP_RESERVAS_USER || 'reservas@reservatuscanchas.cl',
                pass: process.env.SMTP_RESERVAS_PASS || 'Ec7sn9QgQUan'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        console.log('📧 Verificando conexión...');
        await transporter.verify();
        console.log('✅ Conexión verificada');
        
        // Preparar email con valores corregidos
        const precioTotal = 20700;
        const porcentajePagado = 50;
        const montoPagado = Math.round(precioTotal / 2);
        const pendiente = Math.round(precioTotal / 2);
        
        // Fecha y horario corregidos
        const fecha = '2025-11-07'; // Hoy
        const horaInicio = '21:00'; // 9 PM
        const horaFin = '22:00'; // 10 PM
        const complejo = 'Complejo Deportivo Borde Rio'; // Nombre corregido
        
        const mailOptions = {
            from: '"ReservaTusCanchas" <reservas@reservatuscanchas.cl>',
            to: 'ignacio.araya.lillo@gmail.com',
            subject: `✅ Confirmación de Reserva - VIZJ4P`,
            html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Reserva - Reserva Tu Cancha</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0; font-size: 28px;">🏟️ Reserva Tu Cancha</h1>
            <p>Confirmación de Reserva</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
            <span style="color: #28a745; font-size: 24px;">✅</span>
            <strong>¡Reserva Confirmada Exitosamente!</strong>
        </div>

        <div style="background-color: #007bff; color: white; padding: 10px 15px; border-radius: 5px; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 2px;">
            Código de Reserva: VIZJ4P
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📋 Detalles de la Reserva</h3>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Cliente:</span>
                <span style="color: #212529;">Bastián Cabrera</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Email:</span>
                <span style="color: #212529;">ignacio.araya.lillo@gmail.com</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Complejo:</span>
                <span style="color: #212529;">${complejo}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Cancha:</span>
                <span style="color: #212529;">Cancha</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Fecha:</span>
                <span style="color: #212529;">${fecha}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Horario:</span>
                <span style="color: #212529;">${horaInicio} - ${horaFin}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Precio Total Reserva:</span>
                <span style="color: #212529;">$${precioTotal.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Pagado Online:</span>
                <span style="color: #28a745; font-weight: bold;">$${montoPagado.toLocaleString()} (50%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                <span style="font-weight: bold; color: #495057;">Pendiente en Complejo:</span>
                <span style="color: #dc3545; font-weight: bold;">$${pendiente.toLocaleString()} (50%)</span>
            </div>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Pago Parcial (50%)</h3>
            <p><strong>Has pagado $${montoPagado.toLocaleString()} (50% de $${precioTotal.toLocaleString()}).</strong></p>
            <p>El 50% restante ($${pendiente.toLocaleString()}) debe ser cancelado <strong>directamente en el complejo deportivo</strong> antes o al momento de usar la cancha.</p>
        </div>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">📝 Instrucciones Importantes</h3>
            <ul>
                <li><strong>Guarda este email</strong> como comprobante de tu reserva</li>
                <li><strong>Presenta el código de reserva</strong> al llegar al complejo</li>
                <li><strong>Llega 10 minutos antes</strong> de tu horario reservado</li>
                <li><strong>Recuerda llevar el 50% restante</strong> para pagar en el complejo</li>
                <li><strong>Las cancelaciones o cambios se deben realizar con 24 horas de anticipación.</strong> Para esto contactar a <a href="mailto:soporte@reservatuscanchas.cl">soporte@reservatuscanchas.cl</a></li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
            <p>Gracias por elegir Reserva Tu Cancha</p>
            <p>Para consultas: usa el código de reserva en nuestro sitio web</p>
            <p><small>Este es un email automático, por favor no responder</small></p>
        </div>
    </div>
</body>
</html>
            `,
            text: `
Confirmación de Reserva - Reserva Tu Cancha

¡Hola Bastián Cabrera!

Tu reserva ha sido confirmada exitosamente.

Código de Reserva: VIZJ4P

Detalles:
- Complejo: ${complejo}
- Cancha: Cancha
- Fecha: ${fecha}
- Horario: ${horaInicio} - ${horaFin}
- Precio Total Reserva: $20.700
- Pagado Online: $10.350 (50%)
- Pendiente en Complejo: $10.350 (50%)

⚠️ Pago Parcial (50%)
Has pagado $10.350 (50% de $20.700).
El 50% restante ($10.350) debe ser cancelado directamente en el complejo deportivo antes o al momento de usar la cancha.

Instrucciones:
1. Guarda este email como comprobante
2. Presenta el código de reserva al llegar al complejo
3. Llega 10 minutos antes de tu horario
4. Recuerda llevar el 50% restante para pagar en el complejo
5. Las cancelaciones o cambios se deben realizar con 24 horas de anticipación. Para esto contactar a soporte@reservatuscanchas.cl

Gracias por elegir Reserva Tu Cancha!
            `
        };
        
        console.log('\n📧 Enviando email con nombre de complejo corregido...');
        console.log('Destinatario: ignacio.araya.lillo@gmail.com');
        console.log('Complejo:', complejo);
        console.log('Fecha:', fecha);
        console.log('Horario:', horaInicio, '-', horaFin);
        console.log('From:', mailOptions.from);
        console.log('Subject:', mailOptions.subject);
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('\n✅ Email enviado exitosamente');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('\n📬 Email enviado a: ignacio.araya.lillo@gmail.com');
        console.log('📋 Con código de reserva: VIZJ4P');
        console.log('🏢 Complejo:', complejo);
        console.log('📅 Fecha:', fecha);
        console.log('🕐 Horario:', horaInicio, '-', horaFin);
        console.log('💰 Valores:');
        console.log('   - Total Reserva: $20.700');
        console.log('   - Pagado Online: $10.350 (50%)');
        console.log('   - Pendiente en Complejo: $10.350 (50%)');
        
        return info;
        
    } catch (error) {
        console.error('\n❌ Error enviando email:', error);
        console.error('Error code:', error.code);
        console.error('Error command:', error.command);
        console.error('Stack:', error.stack);
        throw error;
    }
}

enviarEmailComplejoCorregido()
    .then(() => {
        console.log('\n✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Proceso falló:', error);
        process.exit(1);
    });


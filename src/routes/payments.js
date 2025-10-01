const express = require('express');
const router = express.Router();
const PaymentService = require('../services/paymentService');

const paymentService = new PaymentService();

// Usar la instancia global de la base de datos
let db;

// Función para establecer la instancia de la base de datos
function setDatabase(databaseInstance) {
    db = databaseInstance;
}

/**
 * Iniciar proceso de pago
 * POST /api/payments/init
 */
router.post('/init', async (req, res) => {
    try {
        console.log('🔍 Iniciando proceso de pago...');
        const { reservationCode, amount, sessionId } = req.body;
        console.log('📋 Datos recibidos:', { reservationCode, amount, sessionId });

        // Validar datos requeridos
        if (!reservationCode || !amount || !sessionId) {
            console.log('❌ Faltan datos requeridos');
            return res.status(400).json({
                success: false,
                error: 'Faltan datos requeridos: reservationCode, amount, sessionId'
            });
        }

        // Verificar que el bloqueo temporal existe
        console.log('🔍 Buscando bloqueo temporal...');
        const bloqueo = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE session_id = $1 AND expira_en > NOW()',
            [sessionId]
        );

        if (!bloqueo) {
            console.log('❌ Bloqueo temporal no encontrado o expirado');
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado o expirado. Por favor, intenta nuevamente.'
            });
        }

        console.log('✅ Bloqueo temporal encontrado:', bloqueo.id);

        // Generar ID único para la orden
        const orderId = paymentService.generateOrderId(reservationCode);
        console.log('🔑 Order ID generado:', orderId);

        // Crear transacción en Transbank
        console.log('🏦 Creando transacción en Transbank...');
        const transactionResult = await paymentService.createTransaction({
            orderId,
            amount,
            sessionId
        });

        if (!transactionResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Error creando transacción: ' + transactionResult.error
            });
        }

        // Guardar información del pago en la base de datos
        await db.run(
            `INSERT INTO pagos (bloqueo_id, transbank_token, order_id, amount, status, reservation_code) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [bloqueo.id, transactionResult.token, orderId, amount, 'pending', reservationCode]
        );

        console.log('✅ Pago iniciado:', {
            reservationCode,
            orderId,
            token: transactionResult.token,
            amount
        });

        res.json({
            success: true,
            token: transactionResult.token,
            url: transactionResult.url,
            orderId,
            amount
        });

    } catch (error) {
        console.error('❌ Error iniciando pago:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error interno del servidor'
        });
    }
});

/**
 * Confirmar pago (callback de Transbank)
 * POST /api/payments/confirm
 */
router.post('/confirm', async (req, res) => {
    try {
        const { token_ws } = req.body;

        if (!token_ws) {
            return res.status(400).json({
                success: false,
                error: 'Token requerido'
            });
        }

        // Buscar información del pago
        console.log('🔍 Buscando pago con token:', token_ws);
        console.log('🔍 Instancia de db:', db);
        console.log('🔍 Método get disponible:', typeof db.get);
        
        const payment = await db.get(
            'SELECT * FROM pagos WHERE transbank_token = $1',
            [token_ws]
        );
        console.log('📊 Pago encontrado:', payment);

        if (!payment) {
            console.log('❌ Pago no encontrado');
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }

        // Confirmar transacción con Transbank
        let confirmResult;
        
        // En modo desarrollo, simular confirmación exitosa
        if (process.env.NODE_ENV === 'development') {
            console.log('🧪 Modo desarrollo: simulando confirmación exitosa');
            confirmResult = {
                success: true,
                authorizationCode: 'AUTH123',
                paymentTypeCode: 'VD',
                responseCode: 0,
                installmentsNumber: 1,
                transactionDate: new Date().toISOString()
            };
        } else {
            try {
                console.log('🏦 Confirmando transacción real con Transbank...');
                confirmResult = await paymentService.confirmTransaction(token_ws);
                console.log('✅ Confirmación exitosa:', confirmResult);
            } catch (error) {
                console.error('❌ Error en confirmación real:', error);
                console.log('🔧 Detalles del error:', {
                    message: error.message,
                    stack: error.stack,
                    token: token_ws
                });
                
                // En lugar de simular éxito, vamos a manejar el error correctamente
                return res.status(500).json({
                    success: false,
                    error: 'Error confirmando pago con Transbank: ' + error.message,
                    details: 'El pago fue procesado pero no se pudo confirmar. Contacta soporte.'
                });
            }
        }

        if (!confirmResult || !confirmResult.success) {
            // Actualizar estado del pago como fallido
            await db.run(
                'UPDATE pagos SET status = $1 WHERE transbank_token = $2',
                ['failed', token_ws]
            );

            // No necesitamos actualizar reserva ya que aún no existe
            // Solo eliminamos el bloqueo temporal
            if (payment.bloqueo_id) {
                await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [payment.bloqueo_id]);
            }

            return res.status(500).json({
                success: false,
                error: 'Error confirmando pago: ' + confirmResult.error
            });
        }

        // Actualizar información del pago
        await db.run(
            `UPDATE pagos SET 
             status = $1, 
             authorization_code = $2, 
             payment_type_code = $3, 
             response_code = $4, 
             installments_number = $5, 
             transaction_date = $6,
             updated_at = NOW()
             WHERE transbank_token = $7`,
            [
                'approved',
                confirmResult.authorizationCode,
                confirmResult.paymentTypeCode,
                confirmResult.responseCode,
                confirmResult.installmentsNumber,
                confirmResult.transactionDate,
                token_ws
            ]
        );

        // Crear la reserva real después del pago exitoso
        // Primero, obtener los datos del bloqueo temporal
        const bloqueoData = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE id = $1',
            [payment.bloqueo_id]
        );

        if (!bloqueoData) {
            throw new Error('Bloqueo temporal no encontrado');
        }

        const datosCliente = JSON.parse(bloqueoData.datos_cliente);

        // Crear la reserva real
        const reservaId = await db.run(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente, 
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                codigo_reserva, estado, estado_pago, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            bloqueoData.cancha_id,
            datosCliente.nombre_cliente,
            datosCliente.email_cliente,
            datosCliente.telefono_cliente,
            datosCliente.rut_cliente,
            bloqueoData.fecha,
            bloqueoData.hora_inicio,
            bloqueoData.hora_fin,
            datosCliente.precio_total,
            payment.reservation_code,
            'confirmada',
            'pagado',
            new Date().toISOString()
        ]);

        // Eliminar el bloqueo temporal
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [payment.bloqueo_id]);

        console.log(`✅ Reserva creada exitosamente: ${payment.reservation_code}`);

        // Los emails se enviarán en segundo plano después de responder

        console.log('✅ Pago confirmado:', {
            reservationCode: payment.codigo_reserva,
            token: token_ws,
            amount: confirmResult.amount,
            authorizationCode: confirmResult.authorizationCode
        });

        // Enviar emails usando el servicio de email real
        let emailSent = false;
        
        try {
            console.log('📧 ENVIANDO EMAILS REALES...');
            console.log('📋 Código de reserva:', payment.reservation_code);
            
            // Importar el servicio de email
            const EmailService = require('../services/emailService');
            const emailService = new EmailService();
            
            // Obtener información completa de la reserva para el email
            const reservaInfo = await db.get(`
                SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente, 
                       r.telefono_cliente, r.rut_cliente,
                       TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                       r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                       c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                WHERE r.codigo_reserva = $1
            `, [payment.reservation_code]);

            if (reservaInfo) {
                const emailData = {
                    codigo_reserva: reservaInfo.codigo_reserva,
                    email_cliente: reservaInfo.email_cliente,
                    nombre_cliente: reservaInfo.nombre_cliente,
                    complejo: reservaInfo.complejo_nombre || 'Complejo Deportivo',
                    cancha: reservaInfo.cancha_nombre || 'Cancha',
                    fecha: reservaInfo.fecha,
                    hora_inicio: reservaInfo.hora_inicio,
                    hora_fin: reservaInfo.hora_fin,
                    precio_total: reservaInfo.precio_total
                };
                
                // Enviar emails reales usando el servicio
                const emailResults = await emailService.sendConfirmationEmails(emailData);
                
                console.log('📧 Resultados del envío de emails:', emailResults);
                
                // Marcar como enviado si al menos el email al cliente fue exitoso
                emailSent = emailResults.cliente || emailResults.simulated;
                
                if (emailSent) {
                    console.log('✅ EMAILS ENVIADOS EXITOSAMENTE');
                } else {
                    console.log('⚠️ Algunos emails no se pudieron enviar');
                }
                
            } else {
                console.log('❌ No se encontró información de la reserva');
            }
        } catch (error) {
            console.error('❌ Error enviando emails:', error.message);
        }

        // Responder con información del estado del email
        res.json({
            success: true,
            message: 'Pago confirmado exitosamente',
            reservationCode: payment.reservation_code,
            amount: confirmResult.amount,
            authorizationCode: confirmResult.authorizationCode,
            email_sent: emailSent
        });

    } catch (error) {
        console.error('❌ Error confirmando pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * Consultar estado de pago
 * GET /api/payments/status/:token
 */
router.get('/status/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Buscar información del pago
        const payment = await db.get(
            `SELECT p.*, r.codigo_reserva, r.estado, r.estado_pago 
             FROM pagos p 
             JOIN reservas r ON p.reserva_id = r.id 
             WHERE p.transbank_token = $1`,
            [token]
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado'
            });
        }

        res.json({
            success: true,
            payment: {
                token: payment.transbank_token,
                orderId: payment.order_id,
                amount: payment.amount,
                status: payment.status,
                reservationCode: payment.codigo_reserva,
                reservationStatus: payment.estado,
                paymentStatus: payment.estado_pago,
                authorizationCode: payment.authorization_code,
                transactionDate: payment.transaction_date,
                createdAt: payment.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error consultando estado de pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * Reembolsar pago
 * POST /api/payments/refund
 */
router.post('/refund', async (req, res) => {
    try {
        const { token, amount } = req.body;

        if (!token || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Token y monto requeridos'
            });
        }

        // Buscar información del pago
        const payment = await db.get(
            'SELECT * FROM pagos WHERE transbank_token = $1 AND status = $2',
            [token, 'approved']
        );

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Pago no encontrado o no aprobado'
            });
        }

        // Procesar reembolso con Transbank
        const refundResult = await paymentService.refundTransaction(token, amount);

        if (!refundResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Error procesando reembolso: ' + refundResult.error
            });
        }

        // Actualizar estado del pago
        await db.run(
            'UPDATE pagos SET status = $1 WHERE transbank_token = $2',
            ['refunded', token]
        );

        // Actualizar estado de la reserva
        await db.run(
            'UPDATE reservas SET estado = $1, estado_pago = $2 WHERE id = $3',
            ['cancelada', 'reembolsado', payment.reserva_id]
        );

        console.log('✅ Pago reembolsado:', {
            token,
            amount,
            authorizationCode: refundResult.authorizationCode
        });

        res.json({
            success: true,
            message: 'Reembolso procesado exitosamente',
            amount: refundResult.amount,
            authorizationCode: refundResult.authorizationCode
        });

    } catch (error) {
        console.error('❌ Error procesando reembolso:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * Obtener historial de pagos de una reserva
 * GET /api/payments/history/:reservationCode
 */
router.get('/history/:reservationCode', async (req, res) => {
    try {
        const { reservationCode } = req.params;

        const payments = await db.query(
            `SELECT p.*, r.codigo_reserva, r.estado, r.estado_pago 
             FROM pagos p 
             JOIN reservas r ON p.reserva_id = r.id 
             WHERE r.codigo_reserva = $1 
             ORDER BY p.created_at DESC`,
            [reservationCode]
        );

        res.json({
            success: true,
            payments: payments.map(payment => ({
                id: payment.id,
                token: payment.transbank_token,
                orderId: payment.order_id,
                amount: payment.amount,
                status: payment.status,
                authorizationCode: payment.authorization_code,
                paymentTypeCode: payment.payment_type_code,
                responseCode: payment.response_code,
                installmentsNumber: payment.installments_number,
                transactionDate: payment.transaction_date,
                createdAt: payment.created_at,
                updatedAt: payment.updated_at
            }))
        });

    } catch (error) {
        console.error('❌ Error obteniendo historial de pagos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = { router, setDatabase };

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

        // IMPORTANTE: Guardar respaldo de los datos del cliente ANTES de iniciar el pago
        // Esto permite recuperar los datos incluso si hay problemas durante el proceso de pago
        try {
            console.log('💾 Guardando respaldo de datos del cliente antes de iniciar pago...');
            
            // Verificar si ya existe un respaldo para este bloqueo
            const existingBackup = await db.get(
                'SELECT id FROM pagos_fallidos_backup WHERE bloqueo_id = $1',
                [bloqueo.id]
            );
            
            if (!existingBackup) {
                // Guardar en tabla de respaldo como "pending" (pendiente de pago)
                await db.run(`
                    INSERT INTO pagos_fallidos_backup (
                        transbank_token, reservation_code, bloqueo_id, amount, 
                        status, error_message, datos_cliente, cancha_id, 
                        fecha, hora_inicio, hora_fin
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    'PENDING_' + reservationCode, // Token temporal hasta que Transbank devuelva el real
                    reservationCode,
                    bloqueo.id,
                    amount,
                    'pending', // Estado pendiente - el pago aún no se ha procesado
                    'Pago iniciado - esperando confirmación de Transbank',
                    bloqueo.datos_cliente || JSON.stringify({}),
                    bloqueo.cancha_id,
                    bloqueo.fecha,
                    bloqueo.hora_inicio,
                    bloqueo.hora_fin
                ]);
                
                console.log('✅ Respaldo guardado exitosamente antes de iniciar pago');
            } else {
                console.log('⚠️ Ya existe un respaldo para este bloqueo');
            }
        } catch (backupError) {
            console.error('❌ Error guardando respaldo antes de iniciar pago:', backupError);
            // No fallar el proceso completo si falla el respaldo
            // Continuar con el proceso de pago normalmente
        }

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
    let payment = null;
    let bloqueoData = null;
    
    try {
        const { token_ws } = req.body;

        if (!token_ws) {
            return res.status(400).json({
                success: false,
                error: 'Token requerido'
            });
        }

        // Verificar que la base de datos esté inicializada
        if (!db) {
            console.error('❌ Base de datos no inicializada');
            return res.status(500).json({
                success: false,
                error: 'Base de datos no inicializada. Por favor, intenta nuevamente en unos momentos.'
            });
        }

        // Buscar información del pago
        console.log('🔍 Buscando pago con token:', token_ws);
        console.log('🔍 Instancia de db:', db ? 'Disponible' : 'No disponible');
        console.log('🔍 Método get disponible:', typeof db?.get);
        
        payment = await db.get(
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
                console.log('✅ Resultado de confirmación:', confirmResult);
                
                // Verificar si la confirmación fue exitosa
                if (!confirmResult || !confirmResult.success) {
                    const errorMsg = confirmResult?.error || 'Error desconocido al confirmar transacción';
                    console.error('❌ Confirmación fallida:', errorMsg);
                    
                    // Actualizar estado del pago como fallido
                    await db.run(
                        'UPDATE pagos SET status = $1 WHERE transbank_token = $2',
                        ['failed', token_ws]
                    );
                    
                    // IMPORTANTE: NO eliminar el bloqueo temporal aquí
                    // El pago fue procesado pero falló la confirmación
                    // Necesitamos mantener los datos del bloqueo temporal para poder recrear la reserva manualmente
                    console.log('⚠️ Bloqueo temporal mantenido para recuperación manual. Bloqueo ID:', payment.bloqueo_id);
                    
                    return res.status(500).json({
                        success: false,
                        error: 'Error confirmando pago con Transbank: ' + errorMsg,
                        details: 'El pago fue procesado pero no se pudo confirmar. Contacta soporte.',
                        bloqueo_id: payment.bloqueo_id, // Incluir el bloqueo_id para recuperación
                        reservation_code: payment.reservation_code
                    });
                }
            } catch (error) {
                console.error('❌ Error en confirmación real:', error);
                console.log('🔧 Detalles del error:', {
                    message: error.message,
                    stack: error.stack,
                    token: token_ws
                });
                
                // Actualizar estado del pago como fallido
                await db.run(
                    'UPDATE pagos SET status = $1 WHERE transbank_token = $2',
                    ['failed', token_ws]
                );
                
                // IMPORTANTE: NO eliminar el bloqueo temporal aquí
                // El pago fue procesado pero falló la confirmación
                // Necesitamos mantener los datos del bloqueo temporal para poder recrear la reserva manualmente
                console.log('⚠️ Bloqueo temporal mantenido para recuperación manual. Bloqueo ID:', payment.bloqueo_id);
                
                // En lugar de simular éxito, vamos a manejar el error correctamente
                return res.status(500).json({
                    success: false,
                    error: 'Error confirmando pago con Transbank: ' + error.message,
                    details: 'El pago fue procesado pero no se pudo confirmar. Contacta soporte.',
                    bloqueo_id: payment.bloqueo_id, // Incluir el bloqueo_id para recuperación
                    reservation_code: payment.reservation_code
                });
            }
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

        // Actualizar el respaldo con el token real de Transbank y marcarlo como exitoso
        try {
            await db.run(`
                UPDATE pagos_fallidos_backup 
                SET transbank_token = $1, 
                    status = 'success',
                    procesado = TRUE,
                    error_message = 'Pago confirmado exitosamente'
                WHERE bloqueo_id = $2 OR reservation_code = $3
            `, [token_ws, payment.bloqueo_id, payment.reservation_code]);
            console.log('✅ Respaldo actualizado con token real de Transbank');
        } catch (updateError) {
            console.error('⚠️ Error actualizando respaldo (no crítico):', updateError);
            // No fallar el proceso si falla la actualización del respaldo
        }

        // Crear la reserva real después del pago exitoso
        // Primero, obtener los datos del bloqueo temporal
        bloqueoData = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE id = $1',
            [payment.bloqueo_id]
        );

        if (!bloqueoData) {
            throw new Error('Bloqueo temporal no encontrado - los datos pueden haberse perdido');
        }

        const datosCliente = JSON.parse(bloqueoData.datos_cliente);
        
        console.log('🔍 DEBUG - Datos del bloqueo leídos:', bloqueoData);
        console.log('🔍 DEBUG - datosCliente parseado:', datosCliente);
        console.log('🔍 DEBUG - porcentaje_pagado del cliente:', datosCliente.porcentaje_pagado);

        // Calcular comisión para reserva web (3.5% + IVA) - Solo para registro, no se suma al precio
        // Verificar si el complejo está exento de comisiones
        console.log('💰 Calculando comisión para reserva...');
        let comisionWeb = 0;
        try {
            const canchaInfo = await db.query(`
                SELECT c.complejo_id 
                FROM canchas c 
                WHERE c.id = $1
            `, [bloqueoData.cancha_id]);
            
            console.log('🔍 Información de cancha obtenida:', canchaInfo);
            
            if (canchaInfo && canchaInfo.length > 0) {
                const complejoId = canchaInfo[0].complejo_id;
                console.log('🏢 Complejo ID:', complejoId);
                
                const comisionesHelper = require('../utils/comisiones-helper');
                comisionesHelper.setDatabase(db);
                
                // Normalizar fecha
                let fechaReservaLimpia = bloqueoData.fecha;
                if (fechaReservaLimpia.includes('T')) {
                    fechaReservaLimpia = fechaReservaLimpia.split('T')[0];
                }
                
                const comisionData = await comisionesHelper.calcularComisionConIVAExencion(
                    complejoId,
                    fechaReservaLimpia,
                    datosCliente.precio_total,
                    'directa'
                );
                comisionWeb = comisionData.comisionTotal;
                console.log('✅ Comisión calculada:', comisionWeb);
            } else {
                console.log('⚠️ No se encontró información de cancha, usando cálculo de comisión por defecto');
                // Fallback: calcular comisión normal si no se puede obtener el complejo
                const { calculateCommissionWithIVA } = require('../config/commissions');
                const comisionData = calculateCommissionWithIVA(datosCliente.precio_total, 'directa');
                comisionWeb = comisionData.comisionTotal;
            }
        } catch (comisionError) {
            console.error('❌ Error calculando comisión:', comisionError);
            // Continuar con comisión 0 si hay error
            comisionWeb = 0;
        }
        
        // Crear la reserva real
        console.log('📝 Creando reserva en base de datos...');
        console.log('📋 Datos de reserva:', {
            cancha_id: bloqueoData.cancha_id,
            nombre_cliente: datosCliente.nombre_cliente,
            email_cliente: datosCliente.email_cliente,
            codigo_reserva: payment.reservation_code,
            precio_total: datosCliente.precio_total
        });
        
        try {
            const reservaResult = await db.run(`
                INSERT INTO reservas (
                    cancha_id, nombre_cliente, email_cliente, telefono_cliente, 
                    rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                    codigo_reserva, estado, estado_pago, fecha_creacion, porcentaje_pagado,
                    tipo_reserva, comision_aplicada
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
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
                new Date().toISOString(),
                datosCliente.porcentaje_pagado || 100,
                'directa',
                comisionWeb
            ]);
            
            console.log('✅ Reserva creada exitosamente. ID:', reservaResult.lastID);
        } catch (reservaError) {
            console.error('❌ Error creando reserva:', reservaError);
            console.error('❌ Stack trace:', reservaError.stack);
            throw new Error(`Error creando reserva: ${reservaError.message}`);
        }

        console.log(`✅ Reserva creada exitosamente: ${payment.reservation_code}`);

        // Los emails se enviarán antes de eliminar el bloqueo temporal
        console.log('✅ Pago confirmado:', {
            reservationCode: payment.reservation_code,
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
                       r.porcentaje_pagado,
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
                    precio_total: reservaInfo.precio_total,
                    porcentaje_pagado: reservaInfo.porcentaje_pagado || 100
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
            console.error('❌ Stack trace del error de email:', error.stack);
            // No fallar el proceso completo si el email falla
            // El pago ya está confirmado y la reserva creada
            emailSent = false;
        }

        // IMPORTANTE: Solo eliminar el bloqueo temporal DESPUÉS de confirmar que:
        // 1. La reserva se creó exitosamente
        // 2. Los emails se intentaron enviar (aunque fallen)
        // Esto evita perder los datos si hay un error en cualquier parte del proceso
        try {
            await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [payment.bloqueo_id]);
            console.log('✅ Bloqueo temporal eliminado exitosamente');
        } catch (deleteError) {
            console.error('❌ Error eliminando bloqueo temporal:', deleteError);
            // No fallar el proceso completo si falla la eliminación del bloqueo
            // La reserva ya está creada y el pago confirmado
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
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error details:', {
            message: error.message,
            name: error.name,
            code: error.code,
            token_ws: req.body?.token_ws,
            payment_found: !!payment,
            bloqueo_found: !!bloqueoData
        });
        
        // IMPORTANTE: Guardar respaldo de los datos del cliente antes de que se pierdan
        // Esto permite recuperar los datos incluso si el bloqueo temporal se elimina o expira
        if (payment && payment.bloqueo_id && bloqueoData) {
            try {
                console.log('💾 Guardando respaldo de datos del cliente en tabla de respaldo...');
                
                // Guardar en tabla de respaldo
                // Verificar si ya existe un registro con este token para evitar duplicados
                const existingBackup = await db.get(
                    'SELECT id FROM pagos_fallidos_backup WHERE transbank_token = $1',
                    [payment.transbank_token || req.body?.token_ws]
                );
                
                if (!existingBackup) {
                    await db.run(`
                        INSERT INTO pagos_fallidos_backup (
                            transbank_token, reservation_code, bloqueo_id, amount, 
                            status, error_message, datos_cliente, cancha_id, 
                            fecha, hora_inicio, hora_fin
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `, [
                    payment.transbank_token || req.body?.token_ws,
                    payment.reservation_code,
                    payment.bloqueo_id,
                    payment.amount || 0,
                    'failed',
                    error.message,
                    bloqueoData.datos_cliente || JSON.stringify({}),
                    bloqueoData.cancha_id,
                    bloqueoData.fecha,
                    bloqueoData.hora_inicio,
                    bloqueoData.hora_fin
                    ]);
                    
                    console.log('✅ Respaldo guardado exitosamente en pagos_fallidos_backup');
                } else {
                    console.log('⚠️ Ya existe un respaldo para este token, no se duplicará');
                }
            } catch (backupError) {
                console.error('❌ Error guardando respaldo:', backupError);
                // No fallar el proceso completo si falla el respaldo
            }
        }
        
        // Si el pago fue encontrado pero falló la confirmación, mantener el bloqueo temporal
        if (payment && payment.bloqueo_id) {
            try {
                console.log('⚠️ Manteniendo bloqueo temporal para recuperación manual. Bloqueo ID:', payment.bloqueo_id);
                console.log('💾 Datos también guardados en tabla de respaldo para análisis futuro');
                // No eliminar el bloqueo temporal para permitir recuperación manual
            } catch (cleanupError) {
                console.error('❌ Error en cleanup:', cleanupError);
            }
        }
        
        // En producción, no exponer detalles del error al cliente
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? 'Error interno del servidor. Por favor, contacta soporte con el código de reserva.'
            : `Error interno del servidor: ${error.message}`;
        
        // Asegurar que la respuesta se envíe correctamente
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: errorMessage,
                // Incluir información útil para recuperación
                ...(payment && {
                    reservation_code: payment.reservation_code,
                    bloqueo_id: payment.bloqueo_id
                }),
                // En desarrollo, incluir más detalles
                ...(process.env.NODE_ENV !== 'production' && {
                    details: error.message,
                    stack: error.stack
                })
            });
        } else {
            console.error('⚠️ Headers ya enviados, no se puede enviar respuesta de error');
        }
    }
});

/**
 * Buscar reserva por código de autorización de Transbank
 * GET /api/payments/find-by-authorization/:authorizationCode
 */
router.get('/find-by-authorization/:authorizationCode', async (req, res) => {
    try {
        const { authorizationCode } = req.params;

        if (!authorizationCode) {
            return res.status(400).json({
                success: false,
                error: 'Código de autorización requerido'
            });
        }

        // Verificar que la base de datos esté inicializada
        if (!db) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos no inicializada'
            });
        }

        // Buscar el pago con el código de autorización
        const pago = await db.get(`
            SELECT 
                p.*,
                r.id as reserva_id,
                r.codigo_reserva,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                r.rut_cliente,
                TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha_reserva,
                r.hora_inicio,
                r.hora_fin,
                r.precio_total,
                r.estado as estado_reserva,
                r.estado_pago,
                r.porcentaje_pagado,
                c.nombre as cancha_nombre,
                c.tipo as cancha_tipo,
                co.nombre as complejo_nombre,
                co.direccion as complejo_direccion,
                co.telefono as complejo_telefono
            FROM pagos p
            LEFT JOIN reservas r ON p.reservation_code = r.codigo_reserva
            LEFT JOIN canchas c ON r.cancha_id = c.id
            LEFT JOIN complejos co ON c.complejo_id = co.id
            WHERE p.authorization_code = $1
            ORDER BY p.created_at DESC
            LIMIT 1
        `, [authorizationCode]);

        if (!pago) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró ningún pago con ese código de autorización'
            });
        }

        res.json({
            success: true,
            pago: {
                id: pago.id,
                token: pago.transbank_token,
                orderId: pago.order_id,
                authorizationCode: pago.authorization_code,
                amount: pago.amount,
                status: pago.status,
                paymentTypeCode: pago.payment_type_code,
                responseCode: pago.response_code,
                installmentsNumber: pago.installments_number,
                transactionDate: pago.transaction_date,
                createdAt: pago.created_at
            },
            reserva: pago.reserva_id ? {
                id: pago.reserva_id,
                codigoReserva: pago.codigo_reserva,
                nombreCliente: pago.nombre_cliente,
                emailCliente: pago.email_cliente,
                telefonoCliente: pago.telefono_cliente,
                rutCliente: pago.rut_cliente,
                fecha: pago.fecha_reserva,
                horaInicio: pago.hora_inicio,
                horaFin: pago.hora_fin,
                precioTotal: pago.precio_total,
                estado: pago.estado_reserva,
                estadoPago: pago.estado_pago,
                porcentajePagado: pago.porcentaje_pagado,
                cancha: {
                    nombre: pago.cancha_nombre,
                    tipo: pago.cancha_tipo
                },
                complejo: {
                    nombre: pago.complejo_nombre,
                    direccion: pago.complejo_direccion,
                    telefono: pago.complejo_telefono
                }
            } : null
        });

    } catch (error) {
        console.error('❌ Error buscando reserva por autorización:', error);
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

/**
 * Simular pago exitoso (HABILITADO EN PRODUCCIÓN)
 * POST /api/payments/simulate-success
 * Este endpoint permite simular pagos para testing y recuperación de reservas
 */
router.post('/simulate-success', async (req, res) => {
    // Permitir en producción para facilitar testing y recuperación de reservas
    // Se puede restringir con autenticación si es necesario en el futuro
    
    try {
        console.log('🧪 Simulando pago exitoso...');
        const { reservationCode, amount } = req.body;

        if (!reservationCode || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Código de reserva y monto requeridos'
            });
        }

        // Buscar el bloqueo temporal por session_id (que es igual al reservationCode)
        const bloqueo = await db.get(
            'SELECT * FROM bloqueos_temporales WHERE session_id = $1',
            [reservationCode]
        );

        if (!bloqueo) {
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado'
            });
        }

        const datosCliente = JSON.parse(bloqueo.datos_cliente);

        // Generar código de reserva único (6 caracteres)
        const codigoReserva = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Calcular comisión para reserva web (3.5% + IVA)
        const { calculateCommissionWithIVA } = require('../config/commissions');
        const comisionData = calculateCommissionWithIVA(datosCliente.precio_total, 'directa');
        const comisionWeb = comisionData.comisionTotal;

        // Crear la reserva directamente (simulando pago exitoso)
        await db.run(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente,
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total,
                codigo_reserva, estado, estado_pago, fecha_creacion, porcentaje_pagado,
                tipo_reserva, comision_aplicada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
            bloqueo.cancha_id,
            datosCliente.nombre_cliente,
            datosCliente.email_cliente,
            datosCliente.telefono_cliente,
            datosCliente.rut_cliente,
            bloqueo.fecha,
            bloqueo.hora_inicio,
            bloqueo.hora_fin,
            datosCliente.precio_total,
            codigoReserva,
            'confirmada',
            'pagado',
            new Date().toISOString(),
            datosCliente.porcentaje_pagado || 100,
            'directa',
            comisionWeb
        ]);

        // Eliminar el bloqueo temporal
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo.id]);

        console.log(`✅ Reserva simulada creada exitosamente: ${codigoReserva}`);

        // Enviar emails
        let emailSent = false;

        try {
            const EmailService = require('../services/emailService');
            const emailService = new EmailService();

            // Obtener información completa de la reserva para el email
            const reservaInfo = await db.get(`
                SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
                       r.telefono_cliente, r.rut_cliente,
                       TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                       r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                       r.porcentaje_pagado,
                       c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                WHERE r.codigo_reserva = $1
            `, [codigoReserva]);

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
                    precio_total: reservaInfo.precio_total,
                    porcentaje_pagado: reservaInfo.porcentaje_pagado || 100
                };

                const emailResults = await emailService.sendConfirmationEmails(emailData);
                emailSent = emailResults.cliente || emailResults.simulated;

                console.log('📧 Resultados de emails (simulación):', emailResults);
            }
        } catch (error) {
            console.error('❌ Error enviando emails en simulación:', error.message);
        }

        res.json({
            success: true,
            message: '🧪 Pago simulado exitosamente',
            reservationCode: codigoReserva,
            amount: amount,
            authorizationCode: 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            email_sent: emailSent
        });

    } catch (error) {
        console.error('❌ Error en simulación de pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + error.message
        });
    }
});

module.exports = { router, setDatabase };

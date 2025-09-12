const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { requireRolePermission } = require('../../middleware/role-permissions');
const { calculateAdminReservationPrice } = require('../config/commissions');

/**
 * Formatear hora para mostrar solo HH:MM
 * @param {string} hora - Hora en formato HH:MM:SS o HH:MM
 * @returns {string} Hora formateada como HH:MM
 */
function formatearHora(hora) {
    if (!hora) return '';
    // Si tiene segundos, los eliminamos
    if (hora.includes(':')) {
        const partes = hora.split(':');
        return `${partes[0]}:${partes[1]}`;
    }
    return hora;
}

// La base de datos se pasará desde el servidor principal
let db = null;

// Función para configurar la base de datos
const setDatabase = (databaseInstance) => {
    db = databaseInstance;
};

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Token de acceso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

/**
 * Obtener datos del calendario semanal
 * GET /api/admin/calendar/week
 */
router.get('/week', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { fechaInicio, fechaFin, complejoId } = req.query;
        const user = req.user;
        
        console.log('📅 Obteniendo datos del calendario semanal:', { fechaInicio, fechaFin, complejoId, user: user.email });
        
        // Usar fechas proporcionadas o calcular semana actual
        let startOfWeek, endOfWeek;
        
        if (fechaInicio && fechaFin) {
            startOfWeek = new Date(fechaInicio);
            endOfWeek = new Date(fechaFin);
        } else {
            // Calcular semana actual
            const today = new Date();
            const dayOfWeek = today.getDay();
            startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Lunes
            endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
        }
        
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);
        
        console.log('📅 Rango de semana:', { startOfWeek, endOfWeek });
        console.log('📅 Fechas formateadas:', { 
            fechaInicio: startOfWeek.toISOString().split('T')[0], 
            fechaFin: endOfWeek.toISOString().split('T')[0] 
        });
        
        // Construir consulta base
        let query = `
            SELECT 
                r.id,
                r.codigo_reserva as codigo,
                r.fecha,
                r.hora_inicio,
                r.hora_fin,
                r.precio_total,
                r.estado,
                r.tipo_reserva,
                r.creada_por_admin,
                r.metodo_contacto,
                r.comision_aplicada,
                r.nombre_cliente,
                r.email_cliente,
                r.rut_cliente,
                c.id as cancha_id,
                c.nombre as cancha_numero,
                c.tipo as cancha_tipo,
                c.precio_hora,
                comp.id as complejo_id,
                comp.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE r.fecha >= $1 AND r.fecha <= $2 AND r.estado != 'cancelada'
        `;
        
        const queryParams = [startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]];
        
        // Filtrar por complejo según el rol del usuario
        if (user.rol === 'owner' || user.rol === 'manager') {
            query += ` AND comp.id = $${queryParams.length + 1}`;
            queryParams.push(user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            query += ` AND comp.id = $${queryParams.length + 1}`;
            queryParams.push(complejoId);
        }
        
        query += ` ORDER BY r.fecha, r.hora_inicio, c.nombre`;
        
        console.log('🔍 Query SQL:', query);
        console.log('🔍 Parámetros:', queryParams);
        
        const reservations = await db.query(query, queryParams);
        
        // Debug: Mostrar reservas obtenidas
        console.log('🔍 Reservas obtenidas de la BD:', reservations);
        if (reservations && reservations.length > 0) {
            console.log('📋 Primera reserva:', reservations[0]);
            // Buscar reservas para 12/09/2025
            const reservas12Sep = reservations.filter(r => r.fecha === '2025-09-12');
            console.log('📅 Reservas para 12/09/2025:', reservas12Sep);
            
            // Mostrar todas las fechas únicas para debug
            const fechasUnicas = [...new Set(reservations.map(r => r.fecha))];
            console.log('📅 Fechas únicas en reservas:', fechasUnicas);
        }
        
        // Obtener canchas disponibles
        let canchasQuery = `
            SELECT 
                c.id,
                c.nombre as numero,
                c.tipo,
                c.precio_hora,
                comp.id as complejo_id,
                comp.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos comp ON c.complejo_id = comp.id
        `;
        
        const canchasParams = [];
        
        if (user.rol === 'owner' || user.rol === 'manager') {
            canchasQuery += ` AND comp.id = $1`;
            canchasParams.push(user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            canchasQuery += ` AND comp.id = $1`;
            canchasParams.push(complejoId);
        }
        
        canchasQuery += ` ORDER BY c.nombre`;
        
        const canchas = await db.query(canchasQuery, canchasParams);
        
        // Obtener bloqueos temporales
        let bloqueosQuery = `
            SELECT 
                bt.id,
                bt.cancha_id,
                bt.fecha,
                bt.hora_inicio,
                bt.hora_fin,
                bt.datos_cliente,
                c.nombre as cancha_numero,
                c.tipo as cancha_tipo
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE bt.fecha >= $1 AND bt.fecha <= $2
        `;
        
        const bloqueosParams = [startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]];
        
        if (user.rol === 'owner' || user.rol === 'manager') {
            bloqueosQuery += ` AND comp.id = $${bloqueosParams.length + 1}`;
            bloqueosParams.push(user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            bloqueosQuery += ` AND comp.id = $${bloqueosParams.length + 1}`;
            bloqueosParams.push(complejoId);
        }
        
        const bloqueos = await db.query(bloqueosQuery, bloqueosParams);
        
        // Procesar bloqueos temporales
        const bloqueosProcesados = (bloqueos || []).map(bloqueo => {
            let datosCliente = {};
            try {
                datosCliente = JSON.parse(bloqueo.datos_cliente);
            } catch (e) {
                console.log('⚠️ Error parseando datos del cliente:', e.message);
            }
            
            return {
                id: bloqueo.id,
                cancha_id: bloqueo.cancha_id,
                cancha_numero: bloqueo.cancha_numero,
                cancha_tipo: bloqueo.cancha_tipo,
                fecha: bloqueo.fecha,
                hora_inicio: bloqueo.hora_inicio,
                hora_fin: bloqueo.hora_fin,
                tipo: 'bloqueo_temporal',
                nombre_cliente: datosCliente.nombre_cliente || 'Cliente temporal',
                precio_total: datosCliente.precio_total || 0
            };
        });
        
        // Generar horarios disponibles según el día de la semana
        const horarios = [];
        
        // Función para generar horarios según el día
        const generarHorariosPorDia = (diaSemana) => {
            const horariosDia = [];
            
            if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a Viernes: 16:00 a 23:00
                for (let hora = 16; hora <= 23; hora++) {
                    horariosDia.push({
                        hora: hora,
                        label: `${hora.toString().padStart(2, '0')}:00`
                    });
                }
            } else { // Sábado y Domingo: 12:00 a 23:00
                for (let hora = 12; hora <= 23; hora++) {
                    horariosDia.push({
                        hora: hora,
                        label: `${hora.toString().padStart(2, '0')}:00`
                    });
                }
            }
            
            return horariosDia;
        };
        
        // Generar horarios para todos los días de la semana
        for (let i = 0; i < 7; i++) {
            const dia = new Date(startOfWeek);
            dia.setDate(startOfWeek.getDate() + i);
            const diaSemana = dia.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            
            horarios.push({
                dia: i,
                fecha: dia.toISOString().split('T')[0],
                diaSemana: diaSemana,
                horarios: generarHorariosPorDia(diaSemana)
            });
        }
        
        // Generar días de la semana
        const diasSemana = [];
        for (let i = 0; i < 7; i++) {
            const dia = new Date(startOfWeek);
            dia.setDate(startOfWeek.getDate() + i);
            diasSemana.push({
                fecha: dia.toISOString().split('T')[0],
                dia: dia.getDate(),
                nombre: dia.toLocaleDateString('es-CL', { weekday: 'short' }),
                nombreCompleto: dia.toLocaleDateString('es-CL', { weekday: 'long' })
            });
        }
        
        // Formatear datos para el calendario
        const calendarioData = {};
        
        // Procesar reservas y bloqueos por fecha y hora
        [...(reservations || []), ...bloqueosProcesados].forEach(item => {
            // Convertir fecha a string en formato YYYY-MM-DD
            const fecha = typeof item.fecha === 'string' ? item.fecha : item.fecha.toISOString().split('T')[0];
            // Formatear hora para que sea HH:MM
            const horaInicio = formatearHora(item.hora_inicio);
            
            // Debug para 12/09/2025
            if (fecha === '2025-09-12') {
                console.log('🔍 Procesando reserva para 12/09/2025:', {
                    fecha_original: item.fecha,
                    fecha_formateada: fecha,
                    hora_original: item.hora_inicio,
                    hora_formateada: horaInicio,
                    cliente: item.nombre_cliente,
                    cancha: item.cancha_numero
                });
            }
            
            if (!calendarioData[fecha]) {
                calendarioData[fecha] = {};
            }
            
            if (!calendarioData[fecha][horaInicio]) {
                calendarioData[fecha][horaInicio] = [];
            }
            
            calendarioData[fecha][horaInicio].push({
                reservada: true,
                cliente: item.nombre_cliente,
                cancha: `Cancha ${item.cancha_numero}`,
                tipo: item.tipo || 'reserva',
                precio: item.precio_total,
                estado: item.estado || 'confirmada'
            });
        });
        
        const response = {
            semana: {
                inicio: startOfWeek.toISOString().split('T')[0],
                fin: endOfWeek.toISOString().split('T')[0],
                dias: diasSemana
            },
            canchas: canchas || [],
            horarios: horarios,
            reservas: reservations || [],
            bloqueos: bloqueosProcesados,
            calendario: calendarioData,
            configuracion: {
                comisiones: {
                    directa: 0.035,
                    administrativa: 0.0175
                }
            }
        };
        
        console.log(`✅ Datos del calendario obtenidos: ${(reservations || []).length} reservas, ${(bloqueos || []).length} bloqueos, ${(canchas || []).length} canchas`);
        
        // Debug: Mostrar datos específicos para 12/09/2025
        console.log('🔍 Claves de calendarioData:', Object.keys(calendarioData));
        console.log('🕐 Horarios generados para la semana:', horarios);
        if (calendarioData['2025-09-12']) {
            console.log('🔍 Debug backend - Datos para 12/09/2025:', calendarioData['2025-09-12']);
        } else {
            console.log('❌ No hay datos para 12/09/2025 en calendarioData del backend');
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error obteniendo datos del calendario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * Crear reserva administrativa
 * POST /api/admin/calendar/reservation
 */
router.post('/reservation', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const {
            cancha_id,
            fecha,
            hora_inicio,
            hora_fin,
            nombre_cliente,
            email_cliente,
            telefono_cliente,
            rut_cliente,
            notas
        } = req.body;
        
        const user = req.user;
        
        console.log('📝 Creando reserva administrativa:', {
            cancha_id,
            fecha,
            hora_inicio,
            hora_fin,
            nombre_cliente,
            admin: user.email
        });
        
        // Validaciones
        if (!cancha_id || !fecha || !hora_inicio || !hora_fin || !nombre_cliente) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        // Verificar que la cancha existe y el usuario tiene acceso
        let canchaQuery = `
            SELECT c.*, comp.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE c.id = $1
        `;
        
        const canchaParams = [cancha_id];
        
        if (user.rol === 'owner' || user.rol === 'manager') {
            canchaQuery += ` AND comp.id = $2`;
            canchaParams.push(user.complejo_id);
        }
        
        const canchaResult = await db.query(canchaQuery, canchaParams);
        
        if ((canchaResult || []).length === 0) {
            return res.status(404).json({ error: 'Cancha no encontrada o sin acceso' });
        }
        
        const cancha = (canchaResult || [])[0];
        
        // Verificar disponibilidad
        const disponibilidadQuery = `
            SELECT COUNT(*) as count
            FROM reservas
            WHERE cancha_id = $1 
            AND fecha = $2 
            AND (
                (hora_inicio <= $3 AND hora_fin > $3) OR
                (hora_inicio < $4 AND hora_fin >= $4) OR
                (hora_inicio >= $3 AND hora_fin <= $4)
            )
            AND estado != 'cancelada'
        `;
        
        const disponibilidadResult = await db.query(disponibilidadQuery, [
            cancha_id, fecha, hora_inicio, hora_fin
        ]);
        
        if (parseInt((disponibilidadResult || [])[0]?.count || 0) > 0) {
            return res.status(409).json({ error: 'La cancha no está disponible en ese horario' });
        }
        
        // Calcular precio con comisión administrativa
        const precioBase = cancha.precio_hora;
        const precioCalculado = calculateAdminReservationPrice(precioBase);
        
        // Generar código de reserva de 6 dígitos
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codigo = '';
        for (let i = 0; i < 6; i++) {
            codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        // Crear la reserva
        const insertQuery = `
            INSERT INTO reservas (
                codigo_reserva, cancha_id, fecha, hora_inicio, hora_fin,
                nombre_cliente, email_cliente, telefono_cliente, rut_cliente,
                precio_total, estado, tipo_reserva, creada_por_admin, admin_id,
                comision_aplicada
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;
        
        const insertParams = [
            codigo, cancha_id, fecha, hora_inicio, hora_fin,
            nombre_cliente, email_cliente || null, telefono_cliente || null, rut_cliente || null,
            precioCalculado.finalPrice, 'confirmada', 'administrativa', true, user.id,
            precioCalculado.commission
        ];
        
        console.log('🔍 Ejecutando consulta de inserción...');
        const result = await db.query(insertQuery, insertParams);
        console.log('🔍 Resultado de la consulta:', result);
        
        const nuevaReserva = (result || [])[0];
        console.log('🔍 Nueva reserva obtenida:', nuevaReserva);
        
        console.log('✅ Reserva administrativa creada:', {
            codigo: nuevaReserva.codigo_reserva,
            precio: precioCalculado.finalPrice,
            comision: precioCalculado.commission
        });
        
        // ENVIAR EMAILS INMEDIATAMENTE DESPUÉS DE CREAR LA RESERVA
        console.log('📧 Iniciando proceso de envío de emails...');
        console.log('📧 Datos para email:', {
            codigo: codigo,
            nombre_cliente: nombre_cliente,
            email_cliente: email_cliente,
            complejo: cancha.complejo_nombre,
            cancha: cancha.nombre,
            fecha: fecha,
            hora_inicio: hora_inicio,
            hora_fin: hora_fin,
            precio_total: precioCalculado.finalPrice
        });
        
        // Enviar emails de confirmación ANTES de responder
        try {
          const EmailService = require('../services/emailService');
          const emailService = new EmailService();
          
          const emailData = {
            codigo_reserva: codigo,
            nombre_cliente: nombre_cliente,
            email_cliente: email_cliente,
            complejo: cancha.complejo_nombre,
            cancha: cancha.nombre,
            fecha: fecha,
            hora_inicio: hora_inicio,
            hora_fin: hora_fin,
            precio_total: precioCalculado.finalPrice
          };
          
          console.log('📧 Enviando emails de confirmación para reserva administrativa:', codigo);
          const emailResults = await emailService.sendConfirmationEmails(emailData);
          console.log('✅ Emails de confirmación procesados:', emailResults);
        } catch (emailError) {
          console.error('❌ Error enviando emails de confirmación:', emailError);
          // No fallar la creación de reserva si hay error en el email
        }
        
        console.log('📧 Proceso de emails completado, enviando respuesta...');
        
        res.status(201).json({
            success: true,
            reserva: nuevaReserva,
            precio: precioCalculado,
            mensaje: 'Reserva administrativa creada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error creando reserva administrativa:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

/**
 * Verificar bloqueos temporales activos en un horario específico
 * POST /api/admin/calendar/check-blocking
 */
router.post('/check-blocking', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { fecha, hora_inicio, hora_fin } = req.body;
        const user = req.user;
        
        console.log('🔍 Verificando bloqueos temporales para admin:', { fecha, hora_inicio, hora_fin, user: user.email });
        
        // Construir consulta para verificar bloqueos temporales
        let query = `
            SELECT 
                bt.id,
                bt.cancha_id,
                bt.fecha,
                bt.hora_inicio,
                bt.hora_fin,
                bt.session_id,
                bt.expira_en,
                bt.datos_cliente,
                c.nombre as cancha_numero,
                c.tipo as cancha_tipo,
                comp.nombre as complejo_nombre
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE bt.fecha = $1 
            AND bt.expira_en > NOW()
            AND (
                (bt.hora_inicio < $3 AND bt.hora_fin > $2)
            )
        `;
        
        const params = [fecha, hora_inicio, hora_fin];
        
        // Filtrar por complejo según el rol del usuario
        if (user.rol === 'owner' || user.rol === 'manager') {
            query += ` AND comp.id = $${params.length + 1}`;
            params.push(user.complejo_id);
        }
        
        const bloqueos = await db.query(query, params);
        
        console.log(`📊 Bloqueos temporales encontrados: ${bloqueos.length}`);
        
        res.json({
            success: true,
            bloqueos: bloqueos || []
        });
        
    } catch (error) {
        console.error('❌ Error verificando bloqueos temporales:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al verificar bloqueos temporales'
        });
    }
});

/**
 * Crear bloqueo temporal administrativo
 * POST /api/admin/calendar/create-blocking
 */
router.post('/create-blocking', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { fecha, hora_inicio, hora_fin, session_id, tipo } = req.body;
        const user = req.user;
        
        console.log('🔒 Creando bloqueo temporal administrativo:', { fecha, hora_inicio, hora_fin, session_id, tipo, user: user.email });
        
        // Obtener todas las canchas del complejo del usuario
        let canchasQuery = `
            SELECT c.id, c.nombre, c.tipo
            FROM canchas c
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE comp.id = $1
        `;
        
        const canchasParams = [user.complejo_id];
        
        if (user.rol === 'super_admin') {
            // Super admin puede crear bloqueos en cualquier complejo
            // Si no se especifica complejo, usar el primero disponible
            canchasQuery = `
                SELECT c.id, c.nombre, c.tipo
                FROM canchas c
                JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY comp.id
                LIMIT 1
            `;
            canchasParams.pop();
        }
        
        const canchas = await db.query(canchasQuery, canchasParams);
        
        if (canchas.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se encontraron canchas para crear el bloqueo temporal'
            });
        }
        
        // Verificar disponibilidad de cada cancha antes de crear bloqueos
        const bloqueosCreados = [];
        const expiraEn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos
        
        for (const cancha of canchas) {
            // Verificar si la cancha está realmente disponible
            const disponibilidadQuery = `
                SELECT COUNT(*) as count
                FROM reservas
                WHERE cancha_id = $1 
                AND fecha = $2 
                AND (
                    (hora_inicio < $4 AND hora_fin > $3)
                )
                AND estado != 'cancelada'
            `;
            
            const disponibilidadResult = await db.query(disponibilidadQuery, [
                cancha.id, fecha, hora_inicio, hora_fin
            ]);
            
            const estaOcupada = parseInt((disponibilidadResult || [])[0]?.count || 0) > 0;
            
            if (!estaOcupada) {
                // Solo crear bloqueo si la cancha está disponible
                const bloqueoId = `ADMIN_${Date.now()}_${cancha.id}`;
                
                const datosCliente = JSON.stringify({
                    nombre_cliente: `Admin ${user.email}`,
                    tipo_bloqueo: 'administrativo',
                    admin_id: user.id,
                    admin_email: user.email
                });
                
                await db.run(
                    `INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, created_at) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [bloqueoId, cancha.id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), datosCliente]
                );
                
                bloqueosCreados.push({
                    id: bloqueoId,
                    cancha_id: cancha.id,
                    cancha_nombre: cancha.nombre,
                    cancha_tipo: cancha.tipo
                });
                
                console.log(`✅ Bloqueo temporal creado para cancha disponible: ${cancha.nombre}`);
            } else {
                console.log(`⚠️ Cancha ${cancha.nombre} ya está ocupada, no se creará bloqueo temporal`);
            }
        }
        
        console.log(`✅ Bloqueos temporales administrativos creados: ${bloqueosCreados.length}`);
        
        res.json({
            success: true,
            bloqueoId: bloqueosCreados[0].id, // Retornar el primer ID para compatibilidad
            bloqueos: bloqueosCreados,
            expiraEn: expiraEn.toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error creando bloqueo temporal administrativo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al crear bloqueo temporal'
        });
    }
});

/**
 * Liberar bloqueo temporal administrativo
 * DELETE /api/admin/calendar/liberate-blocking/:bloqueoId
 */
router.delete('/liberate-blocking/:bloqueoId', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { bloqueoId } = req.params;
        const user = req.user;
        
        console.log('🔓 Liberando bloqueo temporal administrativo:', { bloqueoId, user: user.email });
        
        // Verificar que el bloqueo existe y pertenece al usuario
        let query = `
            SELECT bt.*, c.nombre as cancha_nombre, comp.nombre as complejo_nombre
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE bt.id = $1
        `;
        
        const params = [bloqueoId];
        
        if (user.rol === 'owner' || user.rol === 'manager') {
            query += ` AND comp.id = $${params.length + 1}`;
            params.push(user.complejo_id);
        }
        
        const bloqueo = await db.get(query, params);
        
        if (!bloqueo) {
            return res.status(404).json({
                success: false,
                error: 'Bloqueo temporal no encontrado o no tienes permisos para liberarlo'
            });
        }
        
        // Eliminar el bloqueo temporal
        await db.run('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueoId]);
        
        console.log('✅ Bloqueo temporal administrativo liberado:', bloqueoId);
        
        res.json({
            success: true,
            message: 'Bloqueo temporal liberado exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error liberando bloqueo temporal administrativo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al liberar bloqueo temporal'
        });
    }
});

module.exports = { router, setDatabase };

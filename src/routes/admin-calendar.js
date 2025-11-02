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

// Función helper para obtener la función de fecha actual según el tipo de BD
const getCurrentTimestampFunction = () => {
    const dbInfo = db.getDatabaseInfo();
    return dbInfo.type === 'PostgreSQL' ? 'NOW()' : "datetime('now')";
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
        console.log('🔍 DEBUG - user.complejo_id:', user.complejo_id, 'tipo:', typeof user.complejo_id);
        
        // Validar que el usuario tenga los datos necesarios
        if (!user || !user.rol) {
            throw new Error('Usuario no autenticado o sin rol asignado');
        }
        
        if ((user.rol === 'owner' || user.rol === 'manager') && !user.complejo_id) {
            throw new Error(`Usuario ${user.rol} sin complejo_id asignado`);
        }
        
        // Usar fechas proporcionadas o calcular semana actual
        let startOfWeek, endOfWeek;
        
        if (fechaInicio && fechaFin) {
            // Parsear fechas en zona horaria local para evitar problemas de UTC
            const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-').map(Number);
            const [yearFin, monthFin, dayFin] = fechaFin.split('-').map(Number);
            startOfWeek = new Date(yearInicio, monthInicio - 1, dayInicio);
            endOfWeek = new Date(yearFin, monthFin - 1, dayFin);
        } else {
            // Calcular semana actual (lunes a domingo)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            
            startOfWeek = new Date(today);
            // Si es domingo (0), ir al lunes anterior (-6)
            // Si es lunes (1), no mover la fecha (0)
            // Si es martes (2), ir al lunes anterior (-1)
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            startOfWeek.setDate(today.getDate() + diffToMonday);
            
            endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
        }
        
        startOfWeek.setHours(0, 0, 0, 0);
        endOfWeek.setHours(23, 59, 59, 999);
        
        console.log('📅 Rango de semana:', { startOfWeek, endOfWeek });
        console.log('📅 Fechas formateadas:', { 
            fechaInicio: `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`,
            fechaFin: `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`
        });
        console.log('📅 Parámetros recibidos:', { fechaInicio, fechaFin, complejoId });
        
        // Construir consulta base
        let query = `
            SELECT 
                r.id,
                r.codigo_reserva,
                r.codigo_reserva as codigo,
                r.fecha,
                r.hora_inicio,
                r.hora_fin,
                r.precio_total,
                r.estado,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                r.tipo_reserva,
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
        
        const queryParams = [
            `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`,
            `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`
        ];
        
        // Filtrar por complejo según el rol del usuario
        if (user.rol === 'owner' || user.rol === 'manager') {
            query += ` AND comp.id = $${queryParams.length + 1}`;
            queryParams.push(user.complejo_id);
            console.log('🔍 DEBUG - Filtrando por complejo del usuario:', user.complejo_id, 'tipo:', typeof user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            query += ` AND comp.id = $${queryParams.length + 1}`;
            queryParams.push(complejoId);
            console.log('🔍 DEBUG - Filtrando por complejo seleccionado:', complejoId);
        }
        
        query += ` ORDER BY r.fecha, r.hora_inicio, c.nombre`;
        
        console.log('🔍 Query SQL:', query);
        console.log('🔍 Parámetros:', queryParams);
        
        // Validar que la base de datos esté disponible
        if (!db) {
            throw new Error('Base de datos no disponible');
        }
        
        const reservations = await db.query(query, queryParams);
        
        // Validar que la consulta se ejecutó correctamente
        if (!reservations) {
            console.warn('⚠️ Consulta de reservas devolvió null/undefined');
            reservations = [];
        }
        
        // Debug: Mostrar reservas obtenidas
        console.log('🔍 Reservas obtenidas de la BD:', reservations);
        console.log('🔍 Número de reservas encontradas:', reservations ? reservations.length : 0);
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
            canchasQuery += ` WHERE comp.id = $1`;
            canchasParams.push(user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            canchasQuery += ` WHERE comp.id = $1`;
            canchasParams.push(complejoId);
        }
        
        canchasQuery += ` ORDER BY c.nombre`;
        
        const canchas = await db.query(canchasQuery, canchasParams);
        
        // Validar que la consulta de canchas se ejecutó correctamente
        if (!canchas) {
            console.warn('⚠️ Consulta de canchas devolvió null/undefined');
            canchas = [];
        }
        
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
        
        const bloqueosParams = [
            `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`,
            `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`
        ];
        
        if (user.rol === 'owner' || user.rol === 'manager') {
            bloqueosQuery += ` AND comp.id = $${bloqueosParams.length + 1}`;
            bloqueosParams.push(user.complejo_id);
        } else if (complejoId && user.rol === 'super_admin') {
            bloqueosQuery += ` AND comp.id = $${bloqueosParams.length + 1}`;
            bloqueosParams.push(complejoId);
        }
        
        const bloqueos = await db.query(bloqueosQuery, bloqueosParams);
        
        // Validar que la consulta de bloqueos se ejecutó correctamente
        if (!bloqueos) {
            console.warn('⚠️ Consulta de bloqueos devolvió null/undefined');
            bloqueos = [];
        }
        
        // Procesar bloqueos temporales
        const bloqueosProcesados = (bloqueos || []).map(bloqueo => {
            let datosCliente = {};
            try {
                if (bloqueo.datos_cliente) {
                    datosCliente = JSON.parse(bloqueo.datos_cliente);
                }
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
        
        // Función para generar horarios según el día y complejo
        const generarHorariosPorDia = (diaSemana) => {
            const horariosDia = [];
            let horaInicio, horaFin;
            
            // Debug: verificar complejo_id
            console.log(`🔍 Generando horarios - user.complejo_id: ${user.complejo_id} (tipo: ${typeof user.complejo_id}), diaSemana: ${diaSemana}`);
            
            // Determinar horarios según el complejo (usar comparación estricta con conversión explícita)
            // Borde Río es ID 6 (desarrollo) o ID 7 (producción), Complejo Demo 3 es ID 8
            if (parseInt(user.complejo_id) === 6 || parseInt(user.complejo_id) === 7) { // Espacio Deportivo Borde Río
                // Borde Río: 10:00 a 00:00 (medianoche) todos los días
                horaInicio = 10;
                horaFin = 24;
                console.log(`✅ Borde Río detectado (ID: ${user.complejo_id}) - Horarios: ${horaInicio}:00 - 00:00`);
            } else if (parseInt(user.complejo_id) === 8) { // Complejo Demo 3
                // Complejo Demo 3: 16:00 a 23:00 todos los días
                horaInicio = 16;
                horaFin = 23;
                console.log(`✅ Complejo Demo 3 detectado (ID: ${user.complejo_id}) - Horarios: ${horaInicio}:00 - ${horaFin}:00`);
            } else if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a Viernes: 16:00 a 23:00
                horaInicio = 16;
                horaFin = 23;
                console.log(`📅 L-V - Horarios: ${horaInicio}:00 - ${horaFin}:00`);
            } else { // Sábado y Domingo: 12:00 a 23:00
                horaInicio = 12;
                horaFin = 23;
                console.log(`📅 S-D - Horarios: ${horaInicio}:00 - ${horaFin}:00`);
            }
            
            for (let hora = horaInicio; hora <= horaFin; hora++) {
                // Si la hora es 24, mostrar como 00:00 (medianoche)
                const horaDisplay = hora === 24 ? 0 : hora;
                horariosDia.push({
                    hora: hora,
                    label: `${horaDisplay.toString().padStart(2, '0')}:00`
                });
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
                fecha: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`,
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
                fecha: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`,
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
                codigo: item.codigo || item.codigo_reserva || 'N/A',
                codigo_reserva: item.codigo_reserva || item.codigo || 'N/A',
                cliente: item.nombre_cliente,
                cancha: `Cancha ${item.cancha_numero}`,
                cancha_nombre: `Cancha ${item.cancha_numero}`,
                tipo: item.tipo || 'reserva',
                tipo_reserva: item.tipo_reserva || 'directa',
                precio: item.precio_total,
                precio_total: item.precio_total,
                estado: item.estado || 'confirmada',
                telefono_cliente: item.telefono_cliente,
                telefono: item.telefono_cliente
            });
        });
        
        const response = {
            semana: {
                inicio: `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`,
                fin: `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`,
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
        console.error('❌ Stack trace:', error.stack);
        
        // Log adicional para debugging en producción
        console.error('❌ Debug info:', {
            fechaInicio: req.query.fechaInicio || 'no definida',
            fechaFin: req.query.fechaFin || 'no definida',
            complejoId: req.query.complejoId || 'no definido',
            userEmail: req.user?.email || 'no definido',
            userRole: req.user?.rol || 'no definido',
            userComplejoId: req.user?.complejo_id || 'no definido'
        });
        
        // Respuesta más detallada para debugging
        res.status(500).json({ 
            error: 'Error interno del servidor al cargar calendario',
            details: error.message,
            debug: {
                fechaInicio: req.query.fechaInicio || 'no definida',
                fechaFin: req.query.fechaFin || 'no definida',
                complejoId: req.query.complejoId || 'no definido',
                userRole: req.user?.rol || 'no definido'
            },
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
            notas,
            metodo_pago,
            estado_pago,
            monto_abonado,
            porcentaje_pagado
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
        
        // Calcular precio con comisión administrativa
        const precioBase = cancha.precio_hora;
        const precioCalculado = calculateAdminReservationPrice(precioBase);
        
        // IMPORTANTE: Si el frontend envía precio_total, usarlo (puede incluir promociones)
        // Si no, usar el precio calculado con comisión
        // Asegurar que precioFinal sea un número
        const precioFinal = parseFloat(req.body.precio_total) || parseFloat(precioCalculado.finalPrice) || 0;
        // Asegurar que montoAbonadoFinal sea un número válido
        const montoAbonadoFinal = parseFloat(monto_abonado) || 0;
        
        console.log('💰 Backend - Valores recibidos (ANTES de cálculo):', {
            precio_total_enviado: req.body.precio_total,
            precio_total_tipo: typeof req.body.precio_total,
            precio_calculado_finalPrice: precioCalculado.finalPrice,
            precio_calculado_tipo: typeof precioCalculado.finalPrice,
            monto_abonado_enviado: monto_abonado,
            monto_abonado_tipo: typeof monto_abonado,
            precio_final_usado: precioFinal,
            precio_final_tipo: typeof precioFinal,
            monto_abonado_final: montoAbonadoFinal,
            monto_abonado_final_tipo: typeof montoAbonadoFinal
        });
        
        // Recalcular porcentaje_pagado SIEMPRE basado en precio_total y monto_abonado
        // NO confiar en el valor recibido del frontend
        // Validar que ambos sean números válidos y mayores que 0
        let porcentajePagadoRecalculado = 0;
        if (precioFinal > 0 && montoAbonadoFinal > 0 && !isNaN(precioFinal) && !isNaN(montoAbonadoFinal)) {
            porcentajePagadoRecalculado = Math.round((montoAbonadoFinal / precioFinal) * 100);
        } else if (montoAbonadoFinal === 0 || isNaN(montoAbonadoFinal)) {
            porcentajePagadoRecalculado = 0;
        }
        
        // Asegurar que no exceda 100%
        if (porcentajePagadoRecalculado > 100) {
            porcentajePagadoRecalculado = 100;
        }
        
        const porcentajeFinal = porcentajePagadoRecalculado;
        
        console.log('💰 Backend - Cálculo de pago:', {
            precio_base: precioBase,
            precio_calculado: precioCalculado.finalPrice,
            precio_total_enviado: req.body.precio_total,
            precio_final_usado: precioFinal,
            monto_abonado: montoAbonadoFinal,
            porcentaje_pagado_recibido: porcentaje_pagado,
            porcentaje_pagado_recalculado: porcentajePagadoRecalculado,
            porcentaje_final: porcentajeFinal,
            calculo: `${montoAbonadoFinal} / ${precioFinal} * 100 = ${porcentajeFinal}%`,
            validacion: {
                precio_es_numero: !isNaN(precioFinal) && typeof precioFinal === 'number',
                monto_es_numero: !isNaN(montoAbonadoFinal) && typeof montoAbonadoFinal === 'number',
                ambos_mayores_cero: precioFinal > 0 && montoAbonadoFinal > 0
            }
        });
        
        // Usar AtomicReservationManager para crear reserva de forma atómica
        const AtomicReservationManager = require('../utils/atomic-reservation');
        const atomicManager = new AtomicReservationManager(db);
        
        const reservationData = {
            cancha_id,
            fecha,
            hora_inicio,
            hora_fin,
            nombre_cliente,
            email_cliente,
            telefono_cliente,
            rut_cliente,
            precio_total: precioFinal,
            tipo_reserva: 'administrativa',
            admin_id: user.id,
            bloqueo_id: req.body.bloqueo_id || null, // ID del bloqueo temporal del admin actual
            metodo_pago: metodo_pago || null, // Método de pago seleccionado
            estado_pago: estado_pago || 'pendiente', // Estado de pago (pagado, por_pagar, pendiente)
            monto_abonado: montoAbonadoFinal, // Monto abonado por el cliente
            porcentaje_pagado: porcentajeFinal // Porcentaje pagado recalculado (no confiar en frontend)
        };
        
        const options = {
            skipAvailabilityCheck: false, // Siempre verificar disponibilidad
            commissionRate: 0.0175 // 1.75% para reservas administrativas
        };
        
        console.log('🔍 Ejecutando reserva atómica administrativa...');
        const result = await atomicManager.createAtomicReservation(reservationData, options);
        
        if (!result.success) {
            const statusCode = result.code === 'NOT_AVAILABLE' || result.code === 'TEMPORARILY_BLOCKED' ? 409 : 500;
            return res.status(statusCode).json({
                success: false,
                error: result.error,
                code: result.code
            });
        }
        
        const nuevaReserva = result.reserva;
        console.log('🔍 Nueva reserva atómica obtenida:', nuevaReserva);
        
        console.log('✅ Reserva administrativa atómica creada:', {
            codigo: nuevaReserva.codigo_reserva,
            precio: result.precio
        });
        
        // ENVIAR EMAILS INMEDIATAMENTE DESPUÉS DE CREAR LA RESERVA
        console.log('📧 Iniciando proceso de envío de emails...');
        console.log('📧 Datos para email:', {
            codigo: nuevaReserva.codigo_reserva,
            nombre_cliente: nombre_cliente,
            email_cliente: email_cliente,
            complejo: cancha.complejo_nombre,
            cancha: cancha.nombre,
            fecha: fecha,
            hora_inicio: hora_inicio,
            hora_fin: hora_fin,
            precio_total: result.precio.final
        });
        
        // Enviar emails de confirmación ANTES de responder
        try {
          const EmailService = require('../services/emailService');
          const emailService = new EmailService();
          
          const emailData = {
            codigo_reserva: nuevaReserva.codigo_reserva,
            nombre_cliente: nombre_cliente,
            email_cliente: email_cliente,
            complejo: cancha.complejo_nombre,
            cancha: cancha.nombre,
            fecha: fecha,
            hora_inicio: hora_inicio,
            hora_fin: hora_fin,
            precio_total: result.precio.final
          };
          
          console.log('📧 Enviando emails de confirmación para reserva administrativa:', nuevaReserva.codigo_reserva);
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
            precio: result.precio,
            mensaje: 'Reserva administrativa creada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error creando reserva administrativa:', error);
        console.error('❌ Stack trace:', error.stack);
        console.error('❌ Error completo:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        res.status(500).json({
            error: 'Error interno del servidor al crear la reserva',
            detalles: error.message,
            code: 'INTERNAL_ERROR'
        });
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
        const currentTimestampFunc = getCurrentTimestampFunction();
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
            AND bt.expira_en > ${currentTimestampFunc}
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

        // Validar formato de fecha y hora
        let fechaHoraReserva;

        try {
            // Manejar diferentes formatos de hora
            const horaFormateada = hora_inicio.includes(':') ? hora_inicio : `${hora_inicio}:00:00`;
            fechaHoraReserva = new Date(`${fecha}T${horaFormateada}`);

            // Verificar que la fecha sea válida
            if (isNaN(fechaHoraReserva.getTime())) {
                throw new Error('Fecha o hora inválida');
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Formato de fecha o hora inválido',
                detalles: {
                    fecha: fecha,
                    hora_inicio: hora_inicio,
                    mensaje: 'Verifique que la fecha esté en formato YYYY-MM-DD y la hora en formato HH:MM o HH:MM:SS'
                }
            });
        }

        // NOTA: No validamos horarios pasados para admins
        // Los owners/managers pueden necesitar crear reservas para "ahora mismo"
        // si un cliente llama y quiere jugar inmediatamente
        console.log('🕐 Horario de reserva:', {
            fechaHoraReserva: fechaHoraReserva.toLocaleString('es-CL', { timeZone: 'America/Santiago' })
        });
        
        // Obtener todas las canchas del complejo del usuario
        let canchasQuery;
        let canchasParams = [];
        
        if (user.rol === 'super_admin') {
            // Super admin puede crear bloqueos en cualquier complejo
            // Obtener todas las canchas del primer complejo disponible
            canchasQuery = `
                SELECT c.id, c.nombre, c.tipo
                FROM canchas c
                JOIN complejos comp ON c.complejo_id = comp.id
                WHERE comp.id = (
                    SELECT MIN(id) FROM complejos
                )
                ORDER BY c.id
            `;
        } else {
            // Owner y manager solo pueden crear bloqueos en su complejo
            canchasQuery = `
                SELECT c.id, c.nombre, c.tipo
                FROM canchas c
                JOIN complejos comp ON c.complejo_id = comp.id
                WHERE comp.id = $1
            `;
            canchasParams = [user.complejo_id];
        }
        
        const canchas = await db.query(canchasQuery, canchasParams);
        
        if (canchas.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se encontraron canchas para crear el bloqueo temporal'
            });
        }
        
        // Crear bloqueos temporales para TODAS las canchas del complejo
        // Esto evita confusión en la interfaz cuando se selecciona un slot
        const bloqueosCreados = [];
        const expiraEn = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos
        
        for (const cancha of canchas) {
            // Crear bloqueo temporal para todas las canchas, independientemente de su disponibilidad
            // Esto proporciona una experiencia más consistente en el panel de administración
            const bloqueoId = `ADMIN_${Date.now()}_${cancha.id}`;
            
            const datosCliente = JSON.stringify({
                nombre_cliente: `Admin ${user.email}`,
                tipo_bloqueo: 'administrativo',
                admin_id: user.id,
                admin_email: user.email,
                bloquea_todas_canchas: true // Indicador de que es un bloqueo administrativo global
            });
            
            const dbInfo = db.getDatabaseInfo();
            const timestampFunction = dbInfo.type === 'PostgreSQL' ? 'NOW()' : "datetime('now')";
            await db.run(
                `INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${timestampFunction})`,
                [bloqueoId, cancha.id, fecha, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), datosCliente]
            );
            
            bloqueosCreados.push({
                id: bloqueoId,
                cancha_id: cancha.id,
                cancha_nombre: cancha.nombre,
                cancha_tipo: cancha.tipo
            });
            
            console.log(`✅ Bloqueo temporal administrativo creado para: ${cancha.nombre}`);
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
        
        // Para bloqueos administrativos, liberar todos los bloqueos de la misma sesión
        // Esto asegura que se liberen todas las canchas bloqueadas temporalmente
        let deleteQuery = 'DELETE FROM bloqueos_temporales WHERE session_id = $1';
        const deleteParams = [bloqueo.session_id];
        
        // Si es owner o manager, asegurar que solo se liberen bloqueos de su complejo
        if (user.rol === 'owner' || user.rol === 'manager') {
            deleteQuery = `
                DELETE FROM bloqueos_temporales 
                WHERE session_id = $1 
                AND cancha_id IN (
                    SELECT c.id FROM canchas c 
                    JOIN complejos comp ON c.complejo_id = comp.id 
                    WHERE comp.id = $2
                )
            `;
            deleteParams.push(user.complejo_id);
        }
        
        const result = await db.run(deleteQuery, deleteParams);
        
        console.log(`✅ Bloqueos temporales administrativos liberados: ${result.changes} bloqueos de sesión ${bloqueo.session_id}`);
        
        res.json({
            success: true,
            message: `Bloqueos temporales liberados exitosamente (${result.changes} bloqueos)`,
            bloqueosLiberados: result.changes
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

/**
 * Helper para calcular si una promoción aplica en una fecha y hora específica
 * y retornar el precio correspondiente
 */

const db = require('./database');

/**
 * Verifica si una fecha específica coincide con una promoción
 */
function fechaCoincideConPromocion(fecha, promocion) {
    const fechaDate = new Date(fecha + 'T00:00:00');
    
    switch (promocion.tipo_fecha) {
        case 'especifico':
            const fechaEspecifica = new Date(promocion.fecha_especifica + 'T00:00:00');
            return fechaDate.getTime() === fechaEspecifica.getTime();
            
        case 'rango':
            const fechaInicio = new Date(promocion.fecha_inicio + 'T00:00:00');
            const fechaFin = new Date(promocion.fecha_fin + 'T00:00:00');
            return fechaDate >= fechaInicio && fechaDate <= fechaFin;
            
        case 'recurrente_semanal':
            const diasSemanaEs = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
            const diaSemana = diasSemanaEs[fechaDate.getDay()];
            return promocion.dias_semana && promocion.dias_semana.includes(diaSemana);
            
        default:
            return false;
    }
}

/**
 * Verifica si una hora específica coincide con una promoción
 */
function horaCoincideConPromocion(hora, promocion) {
    // Formato de hora: "HH:MM:SS" o "HH:MM"
    const horaLimpia = hora.substring(0, 5); // "HH:MM"
    
    switch (promocion.tipo_horario) {
        case 'especifico':
            const horaEspecifica = promocion.hora_especifica.substring(0, 5);
            return horaLimpia === horaEspecifica;
            
        case 'rango':
            const horaInicio = promocion.hora_inicio.substring(0, 5);
            const horaFin = promocion.hora_fin.substring(0, 5);
            return horaLimpia >= horaInicio && horaLimpia < horaFin;
            
        default:
            return false;
    }
}

/**
 * Obtiene el precio promocional para una cancha en una fecha/hora específica
 * Retorna el precio normal si no hay promoción aplicable
 */
async function obtenerPrecioConPromocion(canchaId, fecha, hora = null) {
    try {
        // Obtener precio normal de la cancha
        const cancha = await db.get('SELECT precio_hora FROM canchas WHERE id = $1', [canchaId]);
        
        if (!cancha) {
            throw new Error('Cancha no encontrada');
        }
        
        const precioNormal = parseFloat(cancha.precio_hora);
        
        // Si no se proporciona fecha, retornar precio normal
        if (!fecha) {
            return {
                precio: precioNormal,
                tienePromocion: false
            };
        }
        
        // Buscar promociones activas para esta cancha
        const promociones = await db.query(
            'SELECT * FROM promociones_canchas WHERE cancha_id = $1 AND activo = true',
            [canchaId]
        );
        
        // Verificar cada promoción
        for (const promocion of promociones) {
            // Verificar si la fecha coincide
            if (!fechaCoincideConPromocion(fecha, promocion)) {
                continue;
            }
            
            // Si se proporciona hora, verificar que también coincida
            if (hora && !horaCoincideConPromocion(hora, promocion)) {
                continue;
            }
            
            // Si llegamos aquí, la promoción aplica
            return {
                precio: parseFloat(promocion.precio_promocional),
                tienePromocion: true,
                promocionId: promocion.id,
                promocionNombre: promocion.nombre,
                precioNormal: precioNormal,
                descuento: precioNormal - parseFloat(promocion.precio_promocional),
                porcentajeDescuento: Math.round(((precioNormal - parseFloat(promocion.precio_promocional)) / precioNormal) * 100)
            };
        }
        
        // No hay promoción aplicable
        return {
            precio: precioNormal,
            tienePromocion: false
        };
        
    } catch (error) {
        console.error('Error calculando precio con promoción:', error);
        // En caso de error, retornar precio normal para no bloquear la reserva
        const cancha = await db.get('SELECT precio_hora FROM canchas WHERE id = $1', [canchaId]);
        return {
            precio: cancha ? parseFloat(cancha.precio_hora) : 0,
            tienePromocion: false,
            error: true
        };
    }
}

/**
 * Obtiene todas las promociones activas para múltiples canchas con sus fechas/horas
 * Útil para mostrar en calendario o lista de disponibilidad
 */
async function obtenerPromocionesActivas(complejoId = null) {
    try {
        let query = `
            SELECT p.*, c.nombre as cancha_nombre, c.precio_hora as precio_normal
            FROM promociones_canchas p
            JOIN canchas c ON p.cancha_id = c.id
            WHERE p.activo = true
        `;
        
        const params = [];
        
        if (complejoId) {
            query += ' AND c.complejo_id = $1';
            params.push(complejoId);
        }
        
        query += ' ORDER BY c.nombre, p.creado_en DESC';
        
        const promociones = await db.query(query, params);
        
        return promociones.map(p => ({
            ...p,
            descuento: parseFloat(p.precio_normal) - parseFloat(p.precio_promocional),
            porcentajeDescuento: Math.round(((parseFloat(p.precio_normal) - parseFloat(p.precio_promocional)) / parseFloat(p.precio_normal)) * 100)
        }));
        
    } catch (error) {
        console.error('Error obteniendo promociones activas:', error);
        return [];
    }
}

module.exports = {
    obtenerPrecioConPromocion,
    obtenerPromocionesActivas,
    fechaCoincideConPromocion,
    horaCoincideConPromocion
};


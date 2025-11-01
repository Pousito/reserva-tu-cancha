/**
 * Helper para calcular si una promoción aplica en una fecha y hora específica
 * y retornar el precio correspondiente
 */

const db = require('../config/database');

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
            
            // Parsear dias_semana correctamente (puede venir como array de PostgreSQL o como string)
            let diasSemana = [];
            try {
                if (Array.isArray(promocion.dias_semana)) {
                    diasSemana = promocion.dias_semana;
                } else if (typeof promocion.dias_semana === 'string') {
                    // PostgreSQL devuelve arrays TEXT[] como: {"lunes","martes"} que NO es JSON válido
                    if (promocion.dias_semana.startsWith('{') && promocion.dias_semana.endsWith('}')) {
                        const contenido = promocion.dias_semana.slice(1, -1);
                        if (contenido.trim()) {
                            diasSemana = contenido
                                .split(',')
                                .map(dia => dia.trim().replace(/^["']|["']$/g, ''))
                                .filter(dia => dia.length > 0);
                        }
                    } else {
                        // Intentar parsear como JSON válido
                        diasSemana = JSON.parse(promocion.dias_semana || '[]');
                    }
                }
            } catch (e) {
                console.error('Error parseando dias_semana en fechaCoincideConPromocion:', promocion.dias_semana, e);
                diasSemana = [];
            }
            
            return diasSemana.length > 0 && diasSemana.includes(diaSemana);
            
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
        
        console.log(`🔍 Verificando ${promociones.length} promociones para cancha ${canchaId}, fecha: ${fecha}, hora: ${hora}`);
        
        // Verificar cada promoción
        for (const promocion of promociones) {
            console.log(`  - Promoción: ${promocion.nombre} (ID: ${promocion.id})`);
            console.log(`    Tipo fecha: ${promocion.tipo_fecha}, Tipo horario: ${promocion.tipo_horario}`);
            
            // Log adicional para dias_semana
            if (promocion.tipo_fecha === 'recurrente_semanal') {
                console.log(`    dias_semana (tipo: ${typeof promocion.dias_semana}):`, promocion.dias_semana);
            }
            
            // Verificar si la fecha coincide
            const fechaCoincide = fechaCoincideConPromocion(fecha, promocion);
            console.log(`    Fecha coincide: ${fechaCoincide}`);
            
            if (!fechaCoincide) {
                continue;
            }
            
            // Verificar si el horario coincide (si la promoción tiene restricción de horario)
            // IMPORTANTE: Si la promoción tiene horario específico o de rango, requiere hora
            if (promocion.tipo_horario === 'especifico' || promocion.tipo_horario === 'rango') {
                if (!hora) {
                    console.log(`    ⚠️ Promoción requiere hora pero no se proporcionó - omitiendo`);
                    continue;
                }
                
                const horaCoincide = horaCoincideConPromocion(hora, promocion);
                console.log(`    Hora coincide: ${horaCoincide}`);
                
                if (!horaCoincide) {
                    continue;
                }
            } else {
                console.log(`    ℹ️ Promoción sin restricción de horario - aplicando`);
            }
            
            // Si llegamos aquí, la promoción aplica
            console.log(`✅ Promoción aplicada: ${promocion.nombre} - Precio: ${promocion.precio_promocional}`);
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
        console.log(`❌ No se encontró promoción aplicable. Precio normal: ${precioNormal}`);
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


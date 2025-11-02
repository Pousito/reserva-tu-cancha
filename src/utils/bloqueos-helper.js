/**
 * Helper para verificar bloqueos permanentes de canchas
 * Similar a promociones-helper pero para bloqueos
 */

let db;

function setDatabase(databaseInstance) {
    db = databaseInstance;
}

/**
 * Verificar si hay un bloqueo activo para una cancha en una fecha y hora específica
 * @param {number} canchaId - ID de la cancha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} hora - Hora en formato HH:MM
 * @returns {Object|null} - Bloqueo encontrado o null si no hay bloqueo
 */
async function verificarBloqueoActivo(canchaId, fecha, hora) {
    try {
        console.log(`🚫 Verificando bloqueos para cancha ${canchaId}, fecha ${fecha}, hora ${hora}`);
        
        const bloqueos = await db.query(`
            SELECT * FROM bloqueos_canchas
            WHERE cancha_id = $1 
                AND activo = true
            ORDER BY creado_en DESC
        `, [canchaId]);
        
        console.log(`📋 Bloqueos encontrados para cancha ${canchaId}:`, bloqueos.length);
        
        if (!bloqueos || bloqueos.length === 0) {
            console.log('✅ No hay bloqueos activos');
            return null;
        }
        
        const fechaReserva = new Date(fecha + 'T00:00:00');
        const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][fechaReserva.getDay()];
        const horaReserva = hora.substring(0, 5); // Normalizar formato HH:MM
        
        console.log(`📅 Fecha reserva: ${fecha}, Día semana: ${diaSemana}, Hora: ${horaReserva}`);
        
        for (const bloqueo of bloqueos) {
            console.log(`\n🔍 Evaluando bloqueo: ${bloqueo.motivo}`);
            console.log(`   📌 Tipo fecha: ${bloqueo.tipo_fecha}, Tipo horario: ${bloqueo.tipo_horario}`);
            
            // Validar tipo de fecha
            let fechaValida = false;
            
            if (bloqueo.tipo_fecha === 'especifico' && bloqueo.fecha_especifica) {
                const fechaBloqueo = new Date(bloqueo.fecha_especifica + 'T00:00:00');
                fechaValida = fechaReserva.getTime() === fechaBloqueo.getTime();
                console.log(`   📅 Validación específica: ${fechaReserva.toISOString().split('T')[0]} === ${bloqueo.fecha_especifica} = ${fechaValida}`);
            } else if (bloqueo.tipo_fecha === 'rango' && bloqueo.fecha_inicio && bloqueo.fecha_fin) {
                const fechaInicio = new Date(bloqueo.fecha_inicio + 'T00:00:00');
                const fechaFin = new Date(bloqueo.fecha_fin + 'T00:00:00');
                fechaValida = fechaReserva >= fechaInicio && fechaReserva <= fechaFin;
                console.log(`   📅 Validación rango: ${bloqueo.fecha_inicio} <= ${fecha} <= ${bloqueo.fecha_fin} = ${fechaValida}`);
            } else if (bloqueo.tipo_fecha === 'recurrente_semanal' && bloqueo.dias_semana) {
                let diasBloqueo = [];
                try {
                    if (Array.isArray(bloqueo.dias_semana)) {
                        diasBloqueo = bloqueo.dias_semana;
                    } else if (typeof bloqueo.dias_semana === 'string') {
                        // Intentar parsear como array de PostgreSQL
                        const contenido = bloqueo.dias_semana.trim();
                        if (contenido.startsWith('{') && contenido.endsWith('}')) {
                            // Formato PostgreSQL array: {lunes,martes}
                            const contenidoLimpio = contenido.slice(1, -1);
                            if (contenidoLimpio.trim()) {
                                diasBloqueo = contenidoLimpio
                                    .split(',')
                                    .map(dia => dia.trim().replace(/^["']|["']$/g, ''))
                                    .filter(dia => dia.length > 0);
                            }
                        } else {
                            diasBloqueo = JSON.parse(bloqueo.dias_semana || '[]');
                        }
                    }
                } catch (e) {
                    console.error('   ❌ Error parseando dias_semana:', bloqueo.dias_semana, e);
                    diasBloqueo = [];
                }
                
                fechaValida = diasBloqueo.length > 0 && diasBloqueo.includes(diaSemana);
                console.log(`   📅 Validación semanal - Días: ${diasBloqueo}, Día actual: ${diaSemana}, Válido: ${fechaValida}`);
            }
            
            console.log(`   ✔️ Fecha válida: ${fechaValida}`);
            if (!fechaValida) continue;
            
            // Validar tipo de horario
            let horarioValido = false;
            
            if (bloqueo.tipo_horario === 'todo_el_dia') {
                // Todo el día está bloqueado
                horarioValido = true;
                console.log(`   🕐 Bloqueo de todo el día: válido`);
            } else if (bloqueo.tipo_horario === 'especifico' && bloqueo.hora_especifica) {
                let horaBloqueoStr = bloqueo.hora_especifica;
                if (typeof bloqueo.hora_especifica === 'string') {
                    horaBloqueoStr = bloqueo.hora_especifica.substring(0, 5);
                }
                horarioValido = horaReserva === horaBloqueoStr;
                console.log(`   🕐 Validación específica: ${horaReserva} === ${horaBloqueoStr} = ${horarioValido}`);
            } else if (bloqueo.tipo_horario === 'rango' && bloqueo.hora_inicio && bloqueo.hora_fin) {
                const horaInicioBloqueo = bloqueo.hora_inicio.substring(0, 5);
                const horaFinBloqueo = bloqueo.hora_fin.substring(0, 5);
                horarioValido = horaReserva >= horaInicioBloqueo && horaReserva <= horaFinBloqueo;
                console.log(`   🕐 Validación de rango: ${horaInicioBloqueo} <= ${horaReserva} <= ${horaFinBloqueo} = ${horarioValido}`);
            }
            
            console.log(`   ✔️ Horario válido: ${horarioValido}`);
            
            if (horarioValido) {
                console.log(`🚫 BLOQUEO ACTIVO ENCONTRADO: ${bloqueo.motivo}`);
                return bloqueo;
            }
        }
        
        console.log('✅ No hay bloqueos que apliquen para estos parámetros');
        return null;
    } catch (error) {
        console.error('❌ Error verificando bloqueos:', error);
        return null; // En caso de error, no bloquear (fallo seguro)
    }
}

module.exports = {
    setDatabase,
    verificarBloqueoActivo
};


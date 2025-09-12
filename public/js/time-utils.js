/**
 * Utilidades para formateo de tiempo
 */

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

/**
 * Formatear rango de horas
 * @param {string} horaInicio - Hora de inicio
 * @param {string} horaFin - Hora de fin
 * @returns {string} Rango formateado como "HH:MM - HH:MM"
 */
function formatearRangoHoras(horaInicio, horaFin) {
    return `${formatearHora(horaInicio)} - ${formatearHora(horaFin)}`;
}

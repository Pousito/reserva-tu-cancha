/**
 * Utilidades para manejo consistente de fechas en zona horaria de Chile
 * Soluciona el problema de inconsistencias de fechas entre frontend, backend y emails
 */

const CHILE_TIMEZONE = 'America/Santiago';

/**
 * Obtiene la fecha actual en Chile en formato YYYY-MM-DD
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getCurrentDateInChile() {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: CHILE_TIMEZONE
    });
}

/**
 * Convierte una fecha string (YYYY-MM-DD) a objeto Date en zona horaria de Chile
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {Date} Objeto Date en zona horaria de Chile
 */
function parseDateInChile(dateString) {
    if (!dateString) {
        throw new Error('Fecha requerida');
    }
    
    // CORRECCIÓN CRÍTICA: Usar UTC para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Formatea una fecha para mostrar en Chile
 * @param {string|Date} date - Fecha a formatear
 * @param {object} options - Opciones de formato
 * @returns {string} Fecha formateada
 */
function formatDateForChile(date, options = {}) {
    const defaultOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: CHILE_TIMEZONE
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    
    let dateObj;
    if (typeof date === 'string') {
        // CORRECCIÓN CRÍTICA: Para fechas en formato YYYY-MM-DD, crear directamente en Chile
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = date.split('-').map(Number);
            // Crear fecha en zona horaria de Chile usando toLocaleString
            const fechaChile = new Date(year, month - 1, day).toLocaleDateString('en-CA', {
                timeZone: CHILE_TIMEZONE
            });
            dateObj = new Date(fechaChile + 'T12:00:00');
        } else {
            dateObj = parseDateInChile(date);
        }
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        throw new Error('Tipo de fecha no válido');
    }
    
    return dateObj.toLocaleDateString('es-CL', formatOptions);
}

/**
 * Valida que una fecha no sea en el pasado
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {boolean} true si la fecha es válida (futura o hoy)
 */
function isValidFutureDate(dateString) {
    try {
        const inputDate = parseDateInChile(dateString);
        const today = new Date();
        
        // Comparar solo la fecha, no la hora
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        
        return inputDateOnly >= todayDate;
    } catch (error) {
        return false;
    }
}

/**
 * Obtiene la fecha mínima permitida para reservas (hoy en Chile)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function getMinimumReservationDate() {
    return getCurrentDateInChile();
}

/**
 * Crea un objeto Date con fecha y hora específicas en zona horaria de Chile
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @param {string} timeString - Hora en formato HH:MM
 * @returns {Date} Objeto Date en zona horaria de Chile
 */
function createDateTimeInChile(dateString, timeString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Crear fecha en zona horaria local para mantener la fecha y hora correctas
    return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Verifica si una fecha y hora está en el futuro
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @param {string} timeString - Hora en formato HH:MM
 * @returns {boolean} true si la fecha/hora es futura
 */
function isFutureDateTime(dateString, timeString) {
    try {
        const reservationDateTime = createDateTimeInChile(dateString, timeString);
        const now = new Date();
        
        return reservationDateTime > now;
    } catch (error) {
        return false;
    }
}

/**
 * Obtiene información de zona horaria del sistema
 * @returns {object} Información de zona horaria
 */
function getTimezoneInfo() {
    return {
        systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        chileTimezone: CHILE_TIMEZONE,
        currentTimeInChile: new Date().toLocaleString('es-CL', { timeZone: CHILE_TIMEZONE }),
        currentDateInChile: getCurrentDateInChile(),
        isSystemInChile: Intl.DateTimeFormat().resolvedOptions().timeZone === CHILE_TIMEZONE
    };
}

module.exports = {
    getCurrentDateInChile,
    parseDateInChile,
    formatDateForChile,
    isValidFutureDate,
    getMinimumReservationDate,
    createDateTimeInChile,
    isFutureDateTime,
    getTimezoneInfo,
    CHILE_TIMEZONE
};

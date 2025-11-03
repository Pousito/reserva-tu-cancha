/**
 * Helper para verificar si un complejo está exento de comisiones
 * basado en la fecha de inicio de comisiones configurada
 */

let db = null;

function setDatabase(databaseInstance) {
    db = databaseInstance;
}

function getDatabase() {
    if (!db) {
        throw new Error('Base de datos no configurada en comisiones-helper');
    }
    return db;
}

/**
 * Verifica si un complejo está exento de comisiones para una fecha específica
 * @param {number} complejoId - ID del complejo
 * @param {string} fechaReserva - Fecha de la reserva en formato YYYY-MM-DD
 * @returns {Promise<boolean>} true si está exento (no debe cobrarse comisión), false si debe cobrarse
 */
async function estaExentoDeComision(complejoId, fechaReserva) {
    try {
        const database = getDatabase();
        
        // Obtener información del complejo
        const complejoResult = await database.query(`
            SELECT comision_inicio_fecha 
            FROM complejos 
            WHERE id = $1
        `, [complejoId]);
        
        if (!complejoResult || complejoResult.length === 0) {
            // Si no existe el complejo, aplicar comisión por defecto
            console.log(`⚠️ Complejo ${complejoId} no encontrado, aplicando comisión por defecto`);
            return false;
        }
        
        const complejo = Array.isArray(complejoResult) ? complejoResult[0] : (complejoResult.rows?.[0] || complejoResult[0]);
        const comisionInicioFecha = complejo.comision_inicio_fecha;
        
        // Si no hay fecha de inicio configurada, aplicar comisión por defecto
        if (!comisionInicioFecha) {
            console.log(`ℹ️ Complejo ${complejoId} sin fecha de inicio de comisiones, aplicando comisión por defecto`);
            return false;
        }
        
        // Normalizar fecha de reserva a string YYYY-MM-DD
        let fechaReservaLimpia = fechaReserva;
        if (fechaReserva instanceof Date) {
            const year = fechaReserva.getFullYear();
            const month = String(fechaReserva.getMonth() + 1).padStart(2, '0');
            const day = String(fechaReserva.getDate()).padStart(2, '0');
            fechaReservaLimpia = `${year}-${month}-${day}`;
        } else if (typeof fechaReserva === 'string' && fechaReserva.includes('T')) {
            fechaReservaLimpia = fechaReserva.split('T')[0];
        }
        
        // Normalizar fecha de inicio de comisiones
        let fechaInicioLimpia = comisionInicioFecha;
        if (comisionInicioFecha instanceof Date) {
            const year = comisionInicioFecha.getFullYear();
            const month = String(comisionInicioFecha.getMonth() + 1).padStart(2, '0');
            const day = String(comisionInicioFecha.getDate()).padStart(2, '0');
            fechaInicioLimpia = `${year}-${month}-${day}`;
        } else if (typeof comisionInicioFecha === 'string' && comisionInicioFecha.includes('T')) {
            fechaInicioLimpia = comisionInicioFecha.split('T')[0];
        }
        
        // Si la fecha de reserva es anterior a la fecha de inicio, está exento
        const estaExento = fechaReservaLimpia < fechaInicioLimpia;
        
        console.log(`🔍 Verificación de comisión - Complejo ${complejoId}:`, {
            fechaReserva: fechaReservaLimpia,
            fechaInicioComision: fechaInicioLimpia,
            estaExento: estaExento
        });
        
        return estaExento;
        
    } catch (error) {
        console.error(`❌ Error verificando exención de comisión para complejo ${complejoId}:`, error);
        // En caso de error, aplicar comisión por defecto (no exento)
        return false;
    }
}

/**
 * Calcula la comisión considerando la fecha de inicio de comisiones del complejo
 * @param {number} complejoId - ID del complejo
 * @param {string} fechaReserva - Fecha de la reserva en formato YYYY-MM-DD
 * @param {number} precioBase - Precio base de la reserva
 * @param {string} tipoReserva - Tipo de reserva ('directa' o 'administrativa')
 * @returns {Promise<number>} Comisión calculada (0 si está exento)
 */
async function calcularComisionConExencion(complejoId, fechaReserva, precioBase, tipoReserva = 'directa') {
    const { calculateCommission } = require('../config/commissions');
    
    // Verificar si está exento
    const exento = await estaExentoDeComision(complejoId, fechaReserva);
    
    if (exento) {
        console.log(`✅ Complejo ${complejoId} exento de comisiones para fecha ${fechaReserva}`);
        return 0;
    }
    
    // Calcular comisión normal
    return calculateCommission(precioBase, tipoReserva);
}

/**
 * Calcula la comisión con IVA considerando la fecha de inicio de comisiones del complejo
 * @param {number} complejoId - ID del complejo
 * @param {string} fechaReserva - Fecha de la reserva en formato YYYY-MM-DD
 * @param {number} precioBase - Precio base de la reserva
 * @param {string} tipoReserva - Tipo de reserva ('directa' o 'administrativa')
 * @returns {Promise<object>} Objeto con comisión sin IVA, IVA y total
 */
async function calcularComisionConIVAExencion(complejoId, fechaReserva, precioBase, tipoReserva = 'directa') {
    const { IVA_RATE, calculateCommission } = require('../config/commissions');
    
    // Verificar si está exento
    const exento = await estaExentoDeComision(complejoId, fechaReserva);
    
    if (exento) {
        console.log(`✅ Complejo ${complejoId} exento de comisiones para fecha ${fechaReserva}`);
        return {
            comisionSinIVA: 0,
            ivaComision: 0,
            comisionTotal: 0,
            porcentajeBase: 0
        };
    }
    
    // Calcular comisión normal con IVA
    const comisionSinIVA = calculateCommission(precioBase, tipoReserva);
    const ivaComision = Math.round(comisionSinIVA * IVA_RATE);
    const comisionTotal = comisionSinIVA + ivaComision;
    
    return {
        comisionSinIVA: comisionSinIVA,
        ivaComision: ivaComision,
        comisionTotal: comisionTotal,
        porcentajeBase: tipoReserva === 'administrativa' ? 0.0175 : 0.035
    };
}

module.exports = {
    setDatabase,
    estaExentoDeComision,
    calcularComisionConExencion,
    calcularComisionConIVAExencion
};


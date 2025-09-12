/**
 * Configuración de comisiones para diferentes tipos de reservas
 */

const COMMISSIONS = {
    // Comisiones por tipo de reserva
    directa: {
        percentage: 0.035,       // 3.5% para reservas web directas
        description: 'Reserva directa desde la plataforma web'
    },
    administrativa: {
        percentage: 0.0175,      // 1.75% para reservas creadas por administradores
        description: 'Reserva creada por administrador'
    }
};

// Descuentos aplicables para reservas administrativas
const ADMIN_DISCOUNTS = {
    presencial: {
        percentage: 0.10,        // 10% de descuento para reservas presenciales
        description: 'Descuento por reserva presencial'
    },
    whatsapp: {
        percentage: 0.05,        // 5% de descuento para reservas por WhatsApp
        description: 'Descuento por reserva por WhatsApp'
    }
};

/**
 * Calcula la comisión para una reserva
 * @param {number} precioBase - Precio base de la cancha
 * @param {string} tipoReserva - Tipo de reserva ('directa' o 'administrativa')
 * @returns {number} Comisión calculada
 */
function calculateCommission(precioBase, tipoReserva = 'directa') {
    const commissionConfig = COMMISSIONS[tipoReserva] || COMMISSIONS.directa;
    return Math.round(precioBase * commissionConfig.percentage);
}

/**
 * Calcula el precio con descuento administrativo
 * @param {number} precioBase - Precio base de la cancha
 * @param {string} metodoContacto - Método de contacto ('presencial' o 'whatsapp')
 * @returns {number} Precio con descuento aplicado
 */
function calculateDiscountedPrice(precioBase, metodoContacto = 'presencial') {
    const discountConfig = ADMIN_DISCOUNTS[metodoContacto] || ADMIN_DISCOUNTS.presencial;
    const discount = precioBase * discountConfig.percentage;
    return Math.round(precioBase - discount);
}

/**
 * Calcula el precio final y comisión para una reserva administrativa
 * @param {number} precioBase - Precio base de la cancha
 * @returns {object} Objeto con precio final y comisión
 */
function calculateAdminReservationPrice(precioBase) {
    const comision = calculateCommission(precioBase, 'administrativa');
    
    return {
        precioBase: precioBase,
        comision: comision,
        finalPrice: precioBase,
        commission: comision
    };
}

/**
 * Obtiene la configuración de comisiones
 * @returns {object} Configuración completa de comisiones
 */
function getCommissionConfig() {
    return {
        commissions: COMMISSIONS,
        discounts: ADMIN_DISCOUNTS,
        calculateCommission,
        calculateDiscountedPrice,
        calculateAdminReservationPrice
    };
}

module.exports = {
    COMMISSIONS,
    ADMIN_DISCOUNTS,
    calculateCommission,
    calculateDiscountedPrice,
    calculateAdminReservationPrice,
    getCommissionConfig
};

/**
 * Configuración de comisiones para diferentes tipos de reservas
 * IMPORTANTE: Las comisiones incluyen IVA (19%)
 */

const COMMISSIONS = {
    // Comisiones por tipo de reserva (SIN IVA)
    directa: {
        percentage: 0.035,       // 3.5% para reservas web directas
        description: 'Reserva directa desde la plataforma web (3.5% + IVA)'
    },
    administrativa: {
        percentage: 0.0175,      // 1.75% para reservas creadas por administradores
        description: 'Reserva creada por administrador (1.75% + IVA)'
    }
};

// IVA aplicado sobre las comisiones
const IVA_RATE = 0.19; // 19% de IVA

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
 * Calcula la comisión para una reserva (SIN IVA)
 * @param {number} precioBase - Precio base de la cancha
 * @param {string} tipoReserva - Tipo de reserva ('directa' o 'administrativa')
 * @returns {number} Comisión calculada sin IVA
 */
function calculateCommission(precioBase, tipoReserva = 'directa') {
    const commissionConfig = COMMISSIONS[tipoReserva] || COMMISSIONS.directa;
    return Math.round(precioBase * commissionConfig.percentage);
}

/**
 * Calcula la comisión con IVA incluido
 * @param {number} precioBase - Precio base de la cancha
 * @param {string} tipoReserva - Tipo de reserva ('directa' o 'administrativa')
 * @returns {object} Objeto con comisión sin IVA, IVA y total
 */
function calculateCommissionWithIVA(precioBase, tipoReserva = 'directa') {
    const comisionSinIVA = calculateCommission(precioBase, tipoReserva);
    const ivaComision = Math.round(comisionSinIVA * IVA_RATE);
    const comisionTotal = comisionSinIVA + ivaComision;
    
    return {
        comisionSinIVA: comisionSinIVA,
        ivaComision: ivaComision,
        comisionTotal: comisionTotal,
        porcentajeBase: COMMISSIONS[tipoReserva]?.percentage || COMMISSIONS.directa.percentage
    };
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
    const comisionData = calculateCommissionWithIVA(precioBase, 'administrativa');
    
    return {
        precioBase: precioBase,
        comisionSinIVA: comisionData.comisionSinIVA,
        ivaComision: comisionData.ivaComision,
        comisionTotal: comisionData.comisionTotal,
        finalPrice: precioBase,
        commission: comisionData.comisionTotal // Para compatibilidad con código existente
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
        ivaRate: IVA_RATE,
        calculateCommission,
        calculateCommissionWithIVA,
        calculateDiscountedPrice,
        calculateAdminReservationPrice
    };
}

module.exports = {
    COMMISSIONS,
    ADMIN_DISCOUNTS,
    IVA_RATE,
    calculateCommission,
    calculateCommissionWithIVA,
    calculateDiscountedPrice,
    calculateAdminReservationPrice,
    getCommissionConfig
};

/**
 * Configuración de logos para los complejos deportivos
 * Los logos deben estar en formato PNG o JPG en la carpeta /public/images/logos/
 */

const LOGOS_CONFIG = {
    // Mapeo de ID de complejo a nombre de archivo de logo
    1: {
        nombre: 'MagnaSports',
        archivo: 'magnasports.png',
        path: '/images/logos/magnasports.png'
    },
    2: {
        nombre: 'Fundación Gunnen',
        archivo: 'fundacion-gunnen.png',
        path: '/images/logos/fundacion-gunnen.png'
    },
    6: {
        nombre: 'Espacio Deportivo Borde Río',
        archivo: 'borde-rio.png',
        path: '/images/logos/borde-rio.png'
    }
};

/**
 * Obtener la ruta del logo de un complejo
 * @param {number} complejoId - ID del complejo
 * @returns {string|null} Ruta del logo o null si no existe
 */
function getLogoPath(complejoId) {
    const logoConfig = LOGOS_CONFIG[complejoId];
    return logoConfig ? logoConfig.path : null;
}

/**
 * Obtener configuración completa del logo
 * @param {number} complejoId - ID del complejo
 * @returns {object|null} Configuración del logo o null
 */
function getLogoConfig(complejoId) {
    return LOGOS_CONFIG[complejoId] || null;
}

/**
 * Convertir imagen a base64 para usar en PDFs
 * @param {string} imagePath - Ruta de la imagen
 * @returns {Promise<string>} Imagen en formato base64
 */
async function imageToBase64(imagePath) {
    try {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error convirtiendo imagen a base64:', error);
        return null;
    }
}

/**
 * Verificar si existe el logo de un complejo
 * @param {number} complejoId - ID del complejo
 * @returns {Promise<boolean>} true si existe, false si no
 */
async function logoExists(complejoId) {
    const logoPath = getLogoPath(complejoId);
    if (!logoPath) return false;
    
    try {
        const response = await fetch(logoPath, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Exportar para uso en otros scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LOGOS_CONFIG,
        getLogoPath,
        getLogoConfig,
        imageToBase64,
        logoExists
    };
}



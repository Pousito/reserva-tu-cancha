/**
 * Configuración centralizada de URLs
 * Facilita el mantenimiento y actualización de URLs en el futuro
 */

const config = {
  // URLs de desarrollo
  development: {
    base: 'http://localhost:3000',
    api: 'http://localhost:3000/api',
    payment: 'http://localhost:3000/payment.html',
    success: 'http://localhost:3000/?payment=success'
  },
  
  // URLs de producción
  production: {
    base: 'https://www.reservatuscanchas.cl',
    api: 'https://www.reservatuscanchas.cl/api',
    payment: 'https://www.reservatuscanchas.cl/payment.html',
    success: 'https://www.reservatuscanchas.cl/?payment=success'
  }
};

/**
 * Obtiene la configuración de URLs según el entorno
 * @param {string} environment - 'development' o 'production'
 * @returns {object} Configuración de URLs
 */
function getUrls(environment = process.env.NODE_ENV || 'development') {
  return config[environment] || config.development;
}

/**
 * Obtiene la URL base según el entorno
 * @param {string} environment - 'development' o 'production'
 * @returns {string} URL base
 */
function getBaseUrl(environment = process.env.NODE_ENV || 'development') {
  return getUrls(environment).base;
}

/**
 * Obtiene la URL de la API según el entorno
 * @param {string} environment - 'development' o 'production'
 * @returns {string} URL de la API
 */
function getApiUrl(environment = process.env.NODE_ENV || 'development') {
  return getUrls(environment).api;
}

/**
 * Obtiene la URL de pago según el entorno
 * @param {string} environment - 'development' o 'production'
 * @returns {string} URL de pago
 */
function getPaymentUrl(environment = process.env.NODE_ENV || 'development') {
  return getUrls(environment).payment;
}

/**
 * Obtiene la URL de éxito según el entorno
 * @param {string} environment - 'development' o 'production'
 * @returns {string} URL de éxito
 */
function getSuccessUrl(environment = process.env.NODE_ENV || 'development') {
  return getUrls(environment).success;
}

module.exports = {
  config,
  getUrls,
  getBaseUrl,
  getApiUrl,
  getPaymentUrl,
  getSuccessUrl
};

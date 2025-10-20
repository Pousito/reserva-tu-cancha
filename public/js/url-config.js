/**
 * Configuración centralizada de URLs para el frontend
 * Facilita el mantenimiento y actualización de URLs en el futuro
 */

// Detectar el entorno automáticamente
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '' ||
                     window.location.hostname.startsWith('192.168.') ||
                     window.location.hostname.startsWith('10.') ||
                     window.location.hostname.startsWith('172.') ||
                     window.location.hostname.includes('localhost');

// Detectar producción (incluyendo dominios de Render y otros servicios)
const isProduction = window.location.hostname.includes('reservatuscanchas.cl') ||
                    window.location.hostname.includes('render.com') ||
                    window.location.hostname.includes('onrender.com') ||
                    (!isDevelopment && window.location.protocol === 'https:');

// Obtener el hostname actual para desarrollo
const currentHost = window.location.hostname;
const currentPort = window.location.port || '3000';
const currentBase = `${window.location.protocol}//${currentHost}:${currentPort}`;

// Configuración de URLs
const URL_CONFIG = {
  development: {
    base: currentBase,
    api: `${currentBase}/api`,
    payment: `${currentBase}/payment.html`,
    success: `${currentBase}/?payment=success`,
    admin: `${currentBase}/admin-login.html`,
    reports: `${currentBase}/admin-reports.html`
  },
  
  production: {
    base: 'https://www.reservatuscanchas.cl',
    api: 'https://www.reservatuscanchas.cl/api',
    payment: 'https://www.reservatuscanchas.cl/payment.html',
    success: 'https://www.reservatuscanchas.cl/?payment=success',
    admin: 'https://www.reservatuscanchas.cl/admin-login.html',
    reports: 'https://www.reservatuscanchas.cl/admin-reports.html'
  }
};

// Obtener la configuración actual
const currentConfig = isProduction ? URL_CONFIG.production : URL_CONFIG.development;

// Exportar funciones para uso global
window.URL_CONFIG = {
  // URLs principales
  get BASE_URL() { return currentConfig.base; },
  get API_URL() { return currentConfig.api; },
  get PAYMENT_URL() { return currentConfig.payment; },
  get SUCCESS_URL() { return currentConfig.success; },
  get ADMIN_URL() { return currentConfig.admin; },
  get REPORTS_URL() { return currentConfig.reports; },
  
  // Función para obtener cualquier URL
  getUrl(type) {
    return currentConfig[type] || currentConfig.base;
  },
  
  // Función para verificar si estamos en desarrollo
  isDevelopment() {
    return isDevelopment;
  },
  
  // Función para verificar si estamos en producción
  isProduction() {
    return isProduction;
  },
  
  // Función para obtener la configuración completa
  getConfig() {
    return currentConfig;
  }
};

// Definir API_BASE globalmente para compatibilidad
window.API_BASE = window.URL_CONFIG.API_URL;

// Log para debugging
console.log('🔧 URL Config cargado:', {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  environment: isProduction ? 'production' : 'development',
  isDevelopment: isDevelopment,
  isProduction: isProduction,
  baseUrl: window.URL_CONFIG.BASE_URL,
  apiUrl: window.URL_CONFIG.API_URL,
  apiBase: window.API_BASE
});

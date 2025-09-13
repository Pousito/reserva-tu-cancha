/**
 * Configuración centralizada de URLs para el frontend
 * Facilita el mantenimiento y actualización de URLs en el futuro
 */

// Detectar el entorno automáticamente
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname === '';

// Configuración de URLs
const URL_CONFIG = {
  development: {
    base: 'http://localhost:3000',
    api: 'http://localhost:3000/api',
    payment: 'http://localhost:3000/payment.html',
    success: 'http://localhost:3000/?payment=success',
    admin: 'http://localhost:3000/admin-login.html',
    reports: 'http://localhost:3000/admin-reports.html'
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
const currentConfig = isDevelopment ? URL_CONFIG.development : URL_CONFIG.production;

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
    return !isDevelopment;
  },
  
  // Función para obtener la configuración completa
  getConfig() {
    return currentConfig;
  }
};

// Definir API_BASE globalmente para compatibilidad
window.API_BASE = window.URL_CONFIG.API_URL;

// Log para debugging (solo en desarrollo)
if (isDevelopment) {
  console.log('🔧 URL Config cargado:', {
    environment: 'development',
    baseUrl: window.URL_CONFIG.BASE_URL,
    apiUrl: window.URL_CONFIG.API_URL,
    apiBase: window.API_BASE
  });
} else {
  console.log('🌐 URL Config cargado:', {
    environment: 'production',
    baseUrl: window.URL_CONFIG.BASE_URL,
    apiUrl: window.URL_CONFIG.API_URL,
    apiBase: window.API_BASE
  });
}

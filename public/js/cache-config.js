// Configuración de cache - Generado automáticamente
const CACHE_VERSION = 1757742262091;
const CACHE_BUST = '?v=' + CACHE_VERSION;

// Función para agregar versioning a URLs
function addCacheBust(url) {
    return url + (url.includes('?') ? '&' : '?') + 'v=' + CACHE_VERSION;
}

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CACHE_VERSION, CACHE_BUST, addCacheBust };
}

// Para uso en navegador
if (typeof window !== 'undefined') {
    window.CACHE_VERSION = CACHE_VERSION;
    window.CACHE_BUST = CACHE_BUST;
    window.addCacheBust = addCacheBust;
}
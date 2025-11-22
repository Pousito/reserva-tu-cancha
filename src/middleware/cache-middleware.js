// Middleware de caché simple para mejorar rendimiento
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Middleware de caché para consultas frecuentes
 */
function cacheMiddleware(ttl = CACHE_TTL) {
  return (req, res, next) => {
    // Solo aplicar caché en desarrollo para consultas GET
    if (process.env.NODE_ENV !== 'development' || req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log('🚀 Cache hit para:', cacheKey);
      return res.json(cached.data);
    }

    // Interceptar la respuesta para guardarla en caché
    const originalJson = res.json;
    res.json = function(data) {
      // Solo cachear respuestas exitosas
      if (res.statusCode === 200) {
        cache.set(cacheKey, {
          data: data,
          timestamp: Date.now()
        });
        console.log('💾 Cache guardado para:', cacheKey);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Limpiar caché expirado
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Limpiar caché cada 2 minutos
setInterval(cleanupCache, 2 * 60 * 1000);

/**
 * Limpiar todo el caché
 */
function clearCache() {
  cache.clear();
  console.log('🧹 Cache limpiado completamente');
}

module.exports = {
  cacheMiddleware,
  clearCache,
  cleanupCache
};








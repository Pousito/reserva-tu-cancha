/**
 * Service Worker para PWA Básico
 * Cache de assets estáticos y funcionalidad offline
 */

const CACHE_NAME = 'reserva-tu-cancha-v10';
const STATIC_CACHE = 'static-v10';
const DYNAMIC_CACHE = 'dynamic-v10';

// Assets estáticos para cachear (SIN script.js - se carga siempre desde red)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/assets/css/styles.css',
  '/js/chart.min.js',
  '/js/notification-system.js',
  '/js/time-utils.js',
  '/js/url-config.js',
  '/images/logos/borde-rio.png',
  '/images/logos/demo3-new-life-galilea.png',
  '/images/logos/reservatuscanchas.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Cacheando assets estáticos...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker instalado correctamente');
        // NO usar skipWaiting() automáticamente para evitar recargas constantes
        // self.skipWaiting() se llamará solo cuando sea necesario
      })
      .catch((error) => {
        console.error('❌ Error instalando Service Worker:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activado correctamente');
        // NO usar clients.claim() automáticamente para evitar conflictos
        // Esto permitirá que la página controle cuándo actualizar
      })
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo interceptar requests del mismo origen
  if (url.origin !== location.origin) {
    return;
  }
  
  // Estrategia de cache para diferentes tipos de recursos
  if (request.method === 'GET') {
    event.respondWith(handleRequest(request));
  }
});

async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // NO cachear archivos JavaScript críticos (siempre ir a la red para tener última versión)
    if (url.pathname === '/script.js' ||
        url.pathname === '/js/url-config.js' ||
        url.pathname === '/js/time-utils.js' ||
        url.pathname === '/payment.js' ||
        url.pathname === '/chatbot.js' ||
        url.pathname === '/assets/js/payment.js' ||
        (url.pathname.includes('admin-') && url.pathname.endsWith('.js'))) {
      console.log('🔄 Cargando archivo JS crítico desde la red:', url.pathname);
      // Agregar timestamp para forzar recarga sin caché
      const urlWithTimestamp = new URL(request.url);
      urlWithTimestamp.searchParams.set('_t', Date.now());
      return await fetch(urlWithTimestamp);
    }

    // NO cachear peticiones críticas del calendario, admin y canchas con precios dinámicos
    if (url.pathname.includes('/calendar/') ||
        url.pathname.includes('/admin/estadisticas') ||
        url.pathname.includes('/admin/reservas') ||
        url.pathname.includes('/api/canchas')) {
      return await fetch(request);
    }

    // Estrategia Cache First para assets estáticos
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE);
    }

    // Estrategia Network First para páginas HTML
    if (isHTMLRequest(request)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }

    // Estrategia Stale While Revalidate para otras APIs
    if (isAPIRequest(url.pathname)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Fallback a network
    return await fetch(request);
    
  } catch (error) {
    console.error('❌ Error en Service Worker:', error);
    
    // Fallback offline para páginas HTML
    if (isHTMLRequest(request)) {
      return await getOfflinePage();
    }
    
    // Fallback para otros recursos
    return new Response('Recurso no disponible offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Estrategia Cache First
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Estrategia Network First
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Estrategia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then((cache) => cache.put(request, networkResponse.clone()));
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Obtener página offline
async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE);
  const offlinePage = await cache.match('/index.html');
  
  if (offlinePage) {
    return offlinePage;
  }
  
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reserva Tu Cancha - Sin Conexión</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .offline { color: #666; }
        .icon { font-size: 48px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="offline">
        <div class="icon">📱</div>
        <h1>Sin Conexión</h1>
        <p>No hay conexión a internet. Algunas funciones pueden no estar disponibles.</p>
        <p>Intenta recargar la página cuando tengas conexión.</p>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Funciones de utilidad
function isStaticAsset(pathname) {
  return pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
}

function isHTMLRequest(request) {
  return request.headers.get('accept').includes('text/html');
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/');
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Limpiar cache periódicamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    cleanOldCaches();
  }
});

async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => caches.delete(cacheName));
  
  await Promise.all(deletePromises);
  console.log('🧹 Cache limpiado');
}

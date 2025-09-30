#!/usr/bin/env node

/**
 * Script de Keep-Alive para Render
 * Mantiene la aplicación activa para evitar suspensiones en plan gratuito
 * Ejecutar cada 10-12 minutos para mantener la app despierta
 */

const https = require('https');
const http = require('http');

// Configuración
const APP_URL = 'https://www.reservatuscanchas.cl';
const HEALTH_CHECK_URL = `${APP_URL}/health`;
const INTERVAL_MINUTES = 10; // Cada 10 minutos
const MAX_RETRIES = 3;

console.log('🔄 KEEP-ALIVE PARA RENDER');
console.log('========================');
console.log(`🌐 URL: ${APP_URL}`);
console.log(`⏰ Intervalo: ${INTERVAL_MINUTES} minutos`);
console.log('🚀 Iniciando keep-alive...\n');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function pingApp() {
  const timestamp = new Date().toLocaleString('es-CL');
  
  try {
    console.log(`[${timestamp}] 🔍 Haciendo ping a la aplicación...`);
    
    // Intentar health check primero
    try {
      const healthResponse = await makeRequest(HEALTH_CHECK_URL);
      if (healthResponse.success) {
        console.log(`[${timestamp}] ✅ Health check exitoso (${healthResponse.status})`);
        return true;
      }
    } catch (healthError) {
      console.log(`[${timestamp}] ⚠️  Health check falló, intentando página principal...`);
    }

    // Si health check falla, intentar página principal
    const mainResponse = await makeRequest(APP_URL);
    if (mainResponse.success) {
      console.log(`[${timestamp}] ✅ Ping exitoso (${mainResponse.status})`);
      return true;
    } else {
      console.log(`[${timestamp}] ❌ Ping falló (${mainResponse.status})`);
      return false;
    }

  } catch (error) {
    console.log(`[${timestamp}] ❌ Error en ping: ${error.message}`);
    return false;
  }
}

async function keepAlive() {
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    const success = await pingApp();
    
    if (success) {
      retryCount = 0; // Reset contador en caso de éxito
      break;
    } else {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Reintentando en 30 segundos... (${retryCount}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }
  
  if (retryCount >= MAX_RETRIES) {
    console.log('❌ Máximo de reintentos alcanzado. La aplicación podría estar suspendida.');
  }
}

// Función principal
async function startKeepAlive() {
  console.log('🎯 Iniciando keep-alive continuo...\n');
  
  // Ping inicial
  await keepAlive();
  
  // Configurar intervalo
  setInterval(async () => {
    await keepAlive();
  }, INTERVAL_MINUTES * 60 * 1000);
  
  console.log(`⏰ Keep-alive configurado para ejecutarse cada ${INTERVAL_MINUTES} minutos`);
  console.log('💡 Presiona Ctrl+C para detener\n');
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo keep-alive...');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  startKeepAlive();
}

module.exports = { keepAlive, pingApp };

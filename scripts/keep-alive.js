#!/usr/bin/env node

/**
 * Script Keep-Alive para mantener la aplicación activa en Render
 * Previene la suspensión del servicio gratuito
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';
const HEALTH_ENDPOINT = '/health';

// Configuración
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutos (Render suspende a los 15 min)
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 segundos

console.log('🔄 KEEP-ALIVE SERVICE INICIADO');
console.log('==============================');
console.log(`🌐 URL: ${PRODUCTION_URL}`);
console.log(`⏰ Intervalo: ${PING_INTERVAL / 60000} minutos`);
console.log(`🔍 Endpoint: ${HEALTH_ENDPOINT}`);

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function pingServer(retryCount = 0) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`\n🔄 [${timestamp}] Ping al servidor...`);
    
    const response = await makeRequest(`${PRODUCTION_URL}${HEALTH_ENDPOINT}`);
    
    if (response.statusCode === 200) {
      const healthData = JSON.parse(response.body);
      console.log(`✅ Servidor activo - Estado: ${healthData.status}`);
      console.log(`   📊 Base de datos: ${healthData.database?.type || 'N/A'}`);
      console.log(`   🏢 Ciudades: ${healthData.citiesCount || 'N/A'}`);
      console.log(`   📅 Reservas: ${healthData.reservasCount || 'N/A'}`);
      
      // Reset retry count on success
      return 0;
    } else {
      throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
    }
    
  } catch (error) {
    console.error(`❌ Error en ping (intento ${retryCount + 1}):`, error.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`⏳ Reintentando en ${RETRY_DELAY / 1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return await pingServer(retryCount + 1);
    } else {
      console.error(`💥 Fallo después de ${MAX_RETRIES} intentos`);
      return retryCount + 1;
    }
  }
}

function startKeepAlive() {
  // Ping inicial
  pingServer().then((retryCount) => {
    if (retryCount === 0) {
      console.log('🎉 Keep-alive configurado exitosamente');
    }
  });
  
  // Ping periódico
  setInterval(async () => {
    await pingServer();
  }, PING_INTERVAL);
  
  console.log(`⏰ Próximo ping en ${PING_INTERVAL / 60000} minutos`);
}

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando Keep-Alive Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando Keep-Alive Service...');
  process.exit(0);
});

// Iniciar servicio
startKeepAlive();

console.log('✅ Keep-Alive Service ejecutándose');
console.log('💡 Presiona Ctrl+C para detener');

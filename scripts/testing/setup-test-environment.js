#!/usr/bin/env node

/**
 * Script de configuración del entorno de pruebas
 * Verifica que el servidor esté ejecutándose y la base de datos esté disponible
 */

const { Pool } = require('pg');
const http = require('http');

const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  timeout: 10000
};

async function checkServer() {
  return new Promise((resolve) => {
    const req = http.get(CONFIG.baseUrl, (res) => {
      console.log('✅ Servidor web está ejecutándose');
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ Servidor web no está ejecutándose:', err.message);
      resolve(false);
    });
    
    req.setTimeout(CONFIG.timeout, () => {
      console.log('❌ Timeout conectando al servidor web');
      req.destroy();
      resolve(false);
    });
  });
}

async function checkDatabase() {
  try {
    const pool = new Pool({
      connectionString: CONFIG.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    
    console.log('✅ Base de datos PostgreSQL está disponible');
    return true;
  } catch (error) {
    console.log('❌ Error conectando a la base de datos:', error.message);
    return false;
  }
}

async function checkTestData() {
  try {
    const pool = new Pool({
      connectionString: CONFIG.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Verificar que hay datos básicos
    const ciudades = await pool.query('SELECT COUNT(*) as count FROM ciudades');
    const complejos = await pool.query('SELECT COUNT(*) as count FROM complejos');
    const canchas = await pool.query('SELECT COUNT(*) as count FROM canchas');
    
    console.log(`📊 Datos disponibles:`);
    console.log(`   - Ciudades: ${ciudades.rows[0].count}`);
    console.log(`   - Complejos: ${complejos.rows[0].count}`);
    console.log(`   - Canchas: ${canchas.rows[0].count}`);
    
    if (parseInt(ciudades.rows[0].count) === 0 || 
        parseInt(complejos.rows[0].count) === 0 || 
        parseInt(canchas.rows[0].count) === 0) {
      console.log('⚠️  Faltan datos básicos. Ejecuta: npm run populate-reservas');
      await pool.end();
      return false;
    }
    
    await pool.end();
    console.log('✅ Datos de prueba disponibles');
    return true;
  } catch (error) {
    console.log('❌ Error verificando datos de prueba:', error.message);
    return false;
  }
}

async function setupTestEnvironment() {
  console.log('🔧 CONFIGURANDO ENTORNO DE PRUEBAS');
  console.log('===================================');
  
  const checks = [
    { name: 'Servidor Web', fn: checkServer },
    { name: 'Base de Datos', fn: checkDatabase },
    { name: 'Datos de Prueba', fn: checkTestData }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    console.log(`\n🔍 Verificando ${check.name}...`);
    const result = await check.fn();
    if (!result) {
      allPassed = false;
    }
  }
  
  console.log('\n📊 RESULTADO DE LA CONFIGURACIÓN');
  console.log('=================================');
  
  if (allPassed) {
    console.log('✅ Entorno de pruebas configurado correctamente');
    console.log('🚀 Puedes ejecutar: npm run test-reservations');
    process.exit(0);
  } else {
    console.log('❌ Hay problemas con el entorno de pruebas');
    console.log('🔧 Soluciones:');
    console.log('   1. Ejecuta el servidor: npm start');
    console.log('   2. Configura la base de datos: npm run setup-postgresql');
    console.log('   3. Pobla datos de prueba: npm run populate-reservas');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupTestEnvironment().catch(console.error);
}

module.exports = { setupTestEnvironment, checkServer, checkDatabase, checkTestData };

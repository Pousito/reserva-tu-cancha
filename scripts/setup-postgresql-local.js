#!/usr/bin/env node

/**
 * Script para configurar PostgreSQL local para desarrollo
 * Este script ayuda a configurar la base de datos local para que coincida con producción
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🐘 CONFIGURACIÓN DE POSTGRESQL LOCAL');
console.log('=====================================');

// Configuración de PostgreSQL local
const localConfig = {
  host: 'localhost',
  port: 5432,
  database: 'reserva_tu_cancha_local',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres', // Cambiar por tu contraseña
  ssl: false
};

async function setupLocalPostgreSQL() {
  let pool;
  
  try {
    console.log('🔌 Conectando a PostgreSQL local...');
    
    // Intentar conectar
    pool = new Pool(localConfig);
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL local');
    
    // Crear base de datos si no existe
    console.log('📁 Verificando base de datos...');
    const dbExists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", 
      [localConfig.database]
    );
    
    if (dbExists.rows.length === 0) {
      console.log('📁 Creando base de datos local...');
      await client.query(`CREATE DATABASE ${localConfig.database}`);
      console.log('✅ Base de datos creada exitosamente');
    } else {
      console.log('✅ Base de datos ya existe');
    }
    
    client.release();
    
    // Crear archivo .env.local con configuración de PostgreSQL
    const envContent = `# Configuración para desarrollo local con PostgreSQL
NODE_ENV=development
PORT=3000

# PostgreSQL Local
DATABASE_URL=postgresql://${localConfig.user}:${localConfig.password}@${localConfig.host}:${localConfig.port}/${localConfig.database}

# Seguridad
JWT_SECRET=desarrollo_local_secret_key
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:3000

# Logs
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# Email (opcional para desarrollo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion
`;

    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Archivo .env.local creado con configuración de PostgreSQL');
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA');
    console.log('============================');
    console.log('📋 Próximos pasos:');
    console.log('1. Copia .env.local a .env');
    console.log('2. Ejecuta: npm start');
    console.log('3. La aplicación usará PostgreSQL local');
    
  } catch (error) {
    console.error('❌ Error configurando PostgreSQL:', error.message);
    console.log('\n🔧 SOLUCIÓN:');
    console.log('1. Asegúrate de que PostgreSQL esté instalado');
    console.log('2. Verifica que el servicio esté ejecutándose');
    console.log('3. Revisa la contraseña del usuario postgres');
    console.log('4. Ejecuta: export POSTGRES_PASSWORD=tu_contraseña');
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Función para verificar si PostgreSQL está instalado
async function checkPostgreSQLInstallation() {
  console.log('🔍 Verificando instalación de PostgreSQL...');
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Intentar ejecutar psql
    await execAsync('psql --version');
    console.log('✅ PostgreSQL está instalado');
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL no está instalado o no está en el PATH');
    console.log('\n📥 INSTALACIÓN:');
    console.log('1. Ve a: https://postgresapp.com/');
    console.log('2. Descarga Postgres.app');
    console.log('3. Instala y ejecuta la aplicación');
    console.log('4. Vuelve a ejecutar este script');
    return false;
  }
}

// Ejecutar script
async function main() {
  const isInstalled = await checkPostgreSQLInstallation();
  
  if (isInstalled) {
    await setupLocalPostgreSQL();
  } else {
    console.log('\n⏳ Instala PostgreSQL primero y luego ejecuta este script nuevamente');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupLocalPostgreSQL, checkPostgreSQLInstallation };

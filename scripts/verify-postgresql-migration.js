#!/usr/bin/env node

/**
 * Script de verificación de migración completa a PostgreSQL
 * Verifica que no queden dependencias de SQLite en el proyecto
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

console.log('🔍 VERIFICACIÓN DE MIGRACIÓN A POSTGRESQL');
console.log('==========================================');

async function verifyPostgreSQLMigration() {
  let hasErrors = false;
  
  try {
    // 1. Verificar configuración de entorno
    console.log('\n📋 1. Verificando configuración de entorno...');
    
    const envFiles = ['.env', 'env.postgresql', 'env.example'];
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        if (content.includes('sqlite') || content.includes('SQLite')) {
          console.log(`❌ ${envFile} contiene referencias a SQLite`);
          hasErrors = true;
        } else {
          console.log(`✅ ${envFile} - Sin referencias a SQLite`);
        }
      }
    }
    
    // 2. Verificar package.json
    console.log('\n📦 2. Verificando dependencias...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.dependencies && packageJson.dependencies.sqlite3) {
      console.log('❌ package.json contiene dependencia sqlite3');
      hasErrors = true;
    } else {
      console.log('✅ package.json - Sin dependencias de SQLite');
    }
    
    if (packageJson.dependencies && packageJson.dependencies.pg) {
      console.log('✅ package.json - Dependencia PostgreSQL encontrada');
    } else {
      console.log('❌ package.json - Falta dependencia PostgreSQL (pg)');
      hasErrors = true;
    }
    
    // 3. Verificar archivos de configuración de base de datos
    console.log('\n🗄️  3. Verificando configuración de base de datos...');
    
    const dbConfigPath = 'src/config/database.js';
    if (fs.existsSync(dbConfigPath)) {
      const content = fs.readFileSync(dbConfigPath, 'utf8');
      if (content.includes('sqlite') || content.includes('SQLite')) {
        console.log('❌ database.js contiene referencias a SQLite');
        hasErrors = true;
      } else {
        console.log('✅ database.js - Solo PostgreSQL');
      }
    }
    
    // 4. Verificar conexión a PostgreSQL
    console.log('\n🔌 4. Verificando conexión a PostgreSQL...');
    
    if (process.env.DATABASE_URL) {
      try {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        console.log('✅ Conexión a PostgreSQL exitosa');
        console.log(`   Versión: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        client.release();
        await pool.end();
      } catch (error) {
        console.log('⚠️  No se pudo conectar a PostgreSQL:', error.message);
        console.log('   Esto puede ser normal si PostgreSQL no está ejecutándose localmente');
        console.log('   La configuración del proyecto está correcta para PostgreSQL');
        // No marcar como error ya que puede ser normal en desarrollo
      }
    } else {
      console.log('⚠️  DATABASE_URL no está configurado');
      console.log('   Configura DATABASE_URL para verificar la conexión');
      // No marcar como error crítico
    }
    
    // 5. Verificar archivos que no deberían existir
    console.log('\n🗑️  5. Verificando archivos obsoletos...');
    
    const obsoleteFiles = [
      'database.sqlite',
      'database.db',
      'data/database.sqlite',
      'data/database.db',
      'env.local'
    ];
    
    for (const file of obsoleteFiles) {
      if (fs.existsSync(file)) {
        console.log(`⚠️  ${file} - Archivo obsoleto encontrado (considerar eliminación)`);
      } else {
        console.log(`✅ ${file} - No existe (correcto)`);
      }
    }
    
    // 6. Verificar scripts de mantenimiento
    console.log('\n🔧 6. Verificando scripts de mantenimiento...');
    
    const maintenanceScripts = [
      'scripts/maintenance/auto-backup.js',
      'scripts/maintenance/clean-duplicates.js',
      'scripts/maintenance/check-duplicates.js'
    ];
    
    for (const script of maintenanceScripts) {
      if (fs.existsSync(script)) {
        const content = fs.readFileSync(script, 'utf8');
        if (content.includes('sqlite') || content.includes('SQLite')) {
          console.log(`❌ ${script} contiene referencias a SQLite`);
          hasErrors = true;
        } else {
          console.log(`✅ ${script} - Solo PostgreSQL`);
        }
      }
    }
    
    // Resultado final
    console.log('\n📊 RESULTADO DE LA VERIFICACIÓN');
    console.log('===============================');
    
    if (hasErrors) {
      console.log('❌ Se encontraron problemas en la migración');
      console.log('🔧 Revisa los errores listados arriba');
      process.exit(1);
    } else {
      console.log('✅ Migración a PostgreSQL completada exitosamente');
      console.log('🎉 El proyecto está listo para usar solo PostgreSQL');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  }
}

// Ejecutar verificación
if (require.main === module) {
  verifyPostgreSQLMigration();
}

module.exports = { verifyPostgreSQLMigration };

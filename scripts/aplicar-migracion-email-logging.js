#!/usr/bin/env node
/**
 * Script para aplicar la migración de logging de emails
 * Ejecutar: node scripts/aplicar-migracion-email-logging.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function aplicarMigracion() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📦 Aplicando migración de logging de emails...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migration', 'add-email-logging.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await pool.query(sql);
    
    console.log('✅ Migración aplicada exitosamente');
    console.log('📋 Cambios realizados:');
    console.log('   - Tabla email_logs creada');
    console.log('   - Campos de email agregados a tabla reservas');
    console.log('   - Índices creados');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    if (error.code === '42P07') {
      console.log('⚠️  Algunas tablas/columnas ya existen, continuando...');
    } else {
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  aplicarMigracion()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { aplicarMigracion };


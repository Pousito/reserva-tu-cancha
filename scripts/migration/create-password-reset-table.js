#!/usr/bin/env node

/**
 * Script de migración para crear la tabla password_reset_tokens en producción
 * Este script debe ejecutarse una vez después del deploy
 */

const { Pool } = require('pg');
require('dotenv').config();

async function createPasswordResetTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Creando tabla password_reset_tokens...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
      )
    `;

    await pool.query(createTableQuery);
    console.log('✅ Tabla password_reset_tokens creada exitosamente');

    // Verificar que la tabla existe
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_tokens'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Verificación: Tabla password_reset_tokens existe en la base de datos');
    } else {
      console.log('❌ Error: Tabla password_reset_tokens no se creó correctamente');
    }

  } catch (error) {
    console.error('❌ Error creando tabla password_reset_tokens:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  createPasswordResetTable()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { createPasswordResetTable };

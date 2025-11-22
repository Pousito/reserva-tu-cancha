#!/usr/bin/env node

/**
 * Script para crear la tabla codigos_unico_uso manualmente en producción
 * Este script se ejecuta directamente contra la base de datos de Render
 */

process.env.NODE_ENV = 'production';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const DatabaseManager = require('../src/config/database-unified');

async function crearTabla() {
  let db = null;
  
  try {
    console.log('🔌 Conectando a base de datos...');
    db = new DatabaseManager();
    await db.connect();
    console.log('✅ Conectado\n');

    console.log('🔧 Creando tabla codigos_unico_uso...');
    
    // Obtener un cliente directo del pool
    const client = await db.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear tabla
      await client.query(`
        CREATE TABLE IF NOT EXISTS codigos_unico_uso (
          id SERIAL PRIMARY KEY,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          email_cliente VARCHAR(255) NOT NULL,
          monto_descuento INTEGER NOT NULL DEFAULT 0,
          usado BOOLEAN DEFAULT FALSE,
          usado_en TIMESTAMP,
          bloqueo_id VARCHAR(50),
          reserva_id INTEGER REFERENCES reservas(id),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expira_en TIMESTAMP,
          descripcion TEXT
        )
      `);
      console.log('✅ Tabla codigos_unico_uso creada/verificada');

      // Crear índices
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_codigo ON codigos_unico_uso(codigo)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_email ON codigos_unico_uso(email_cliente)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_usado ON codigos_unico_uso(usado)
      `);
      console.log('✅ Índices creados/verificados');
      
      await client.query('COMMIT');
      console.log('\n✅ Tabla creada exitosamente');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

crearTabla()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });


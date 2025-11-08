#!/usr/bin/env node

/**
 * Script para crear la tabla depositos_complejos directamente en la base de datos
 * Ejecutar: node scripts/create-depositos-table-direct.js
 */

const { Pool } = require('pg');

// Configuración de la base de datos de producción
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://reserva_user:password@localhost:5432/reserva_tu_cancha',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function createDepositosTable() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('🔧 Conectando a la base de datos...');
    
    // Verificar si la tabla ya existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'depositos_complejos'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ La tabla depositos_complejos ya existe');
      
      // Contar registros existentes
      const count = await pool.query('SELECT COUNT(*) as total FROM depositos_complejos');
      console.log(`📊 Registros existentes: ${count.rows[0].total}`);
      
      return;
    }
    
    console.log('🔧 Creando tabla depositos_complejos...');
    
    // Crear la tabla
    await pool.query(`
      CREATE TABLE depositos_complejos (
        id SERIAL PRIMARY KEY,
        complejo_id INTEGER NOT NULL,
        fecha_deposito DATE NOT NULL,
        monto_total_reservas INTEGER NOT NULL,
        comision_porcentaje NUMERIC(5,2) NOT NULL,
        comision_sin_iva INTEGER NOT NULL,
        iva_comision INTEGER NOT NULL,
        comision_total INTEGER NOT NULL,
        monto_a_depositar INTEGER NOT NULL,
        estado VARCHAR(50),
        metodo_pago VARCHAR(50),
        numero_transaccion VARCHAR(100),
        banco_destino VARCHAR(100),
        observaciones TEXT,
        procesado_por INTEGER,
        fecha_procesado TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (complejo_id) REFERENCES complejos(id) ON DELETE CASCADE,
        FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    
    console.log('✅ Tabla creada exitosamente');
    
    // Crear índices
    console.log('🔧 Creando índices...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_depositos_complejos_complejo_id ON depositos_complejos(complejo_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_depositos_complejos_fecha ON depositos_complejos(fecha_deposito)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_depositos_complejos_estado ON depositos_complejos(estado)');
    
    console.log('✅ Índices creados exitosamente');
    
    // Insertar datos de ejemplo
    console.log('🔧 Insertando datos de ejemplo...');
    await pool.query(`
      INSERT INTO depositos_complejos (
        complejo_id, fecha_deposito, monto_total_reservas, 
        comision_porcentaje, comision_sin_iva, iva_comision, 
        comision_total, monto_a_depositar, estado
      ) VALUES 
      (8, '2025-10-18', 15000, 3.50, 525, 100, 625, 14375, 'pendiente'),
      (8, '2025-10-26', 16000, 1.75, 280, 53, 333, 15667, 'pendiente'),
      (8, '2025-10-31', 15000, 3.50, 525, 100, 625, 14375, 'pendiente')
    `);
    
    console.log('✅ Datos de ejemplo insertados');
    
    // Verificar creación
    const count = await pool.query('SELECT COUNT(*) as total FROM depositos_complejos');
    console.log(`🎉 Tabla creada exitosamente con ${count.rows[0].total} registros`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createDepositosTable();
}

module.exports = { createDepositosTable };




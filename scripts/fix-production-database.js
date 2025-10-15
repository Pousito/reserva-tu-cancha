#!/usr/bin/env node

/**
 * Script para corregir la base de datos de producción
 * Agrega las columnas faltantes que están causando errores
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/reserva_tu_cancha'
});

async function fixProductionDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CORRIGIENDO BASE DE DATOS DE PRODUCCIÓN');
    console.log('==========================================');
    
    // Lista de columnas que necesitamos agregar
    const columnsToAdd = [
      {
        table: 'reservas',
        column: 'tipo_reserva',
        definition: "VARCHAR(50) DEFAULT 'web'"
      },
      {
        table: 'reservas',
        column: 'creada_por_admin',
        definition: 'BOOLEAN DEFAULT false'
      },
      {
        table: 'reservas',
        column: 'admin_id',
        definition: 'INTEGER REFERENCES usuarios(id)'
      },
      {
        table: 'reservas',
        column: 'metodo_contacto',
        definition: "VARCHAR(50) DEFAULT 'web'"
      },
      {
        table: 'reservas',
        column: 'comision_aplicada',
        definition: 'INTEGER DEFAULT 0'
      },
      {
        table: 'reservas',
        column: 'porcentaje_pagado',
        definition: 'DECIMAL(5,2) DEFAULT 0.00'
      },
      {
        table: 'canchas',
        column: 'numero',
        definition: 'INTEGER'
      }
    ];
    
    console.log('📋 Verificando columnas existentes...');
    
    for (const { table, column, definition } of columnsToAdd) {
      try {
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [table, column]);
        
        if (checkColumn.rows.length === 0) {
          console.log(`➕ Agregando columna ${table}.${column}...`);
          
          await client.query(`
            ALTER TABLE ${table} ADD COLUMN ${column} ${definition}
          `);
          
          console.log(`✅ Columna ${table}.${column} agregada exitosamente`);
        } else {
          console.log(`ℹ️  Columna ${table}.${column} ya existe`);
        }
      } catch (error) {
        console.log(`❌ Error agregando columna ${table}.${column}: ${error.message}`);
      }
    }
    
    // Verificar y crear tabla de gastos si no existe
    console.log('\n📊 Verificando tabla de gastos...');
    
    const checkGastos = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'gastos_ingresos'
    `);
    
    if (checkGastos.rows.length === 0) {
      console.log('➕ Creando tabla gastos_ingresos...');
      
      await client.query(`
        CREATE TABLE gastos_ingresos (
          id SERIAL PRIMARY KEY,
          complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
          categoria_id INTEGER,
          tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
          monto DECIMAL(10,2) NOT NULL,
          fecha DATE NOT NULL,
          descripcion TEXT,
          metodo_pago VARCHAR(50),
          numero_documento VARCHAR(100),
          archivo_adjunto VARCHAR(255),
          usuario_id INTEGER REFERENCES usuarios(id),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Tabla gastos_ingresos creada');
    } else {
      console.log('ℹ️  Tabla gastos_ingresos ya existe');
    }
    
    // Verificar y crear tabla de categorías de gastos
    console.log('\n📊 Verificando tabla de categorías de gastos...');
    
    const checkCategorias = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'categorias_gastos'
    `);
    
    if (checkCategorias.rows.length === 0) {
      console.log('➕ Creando tabla categorias_gastos...');
      
      await client.query(`
        CREATE TABLE categorias_gastos (
          id SERIAL PRIMARY KEY,
          complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
          nombre VARCHAR(100) NOT NULL,
          descripcion TEXT,
          icono VARCHAR(50),
          color VARCHAR(20),
          tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
          es_predefinida BOOLEAN DEFAULT true,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(nombre, complejo_id)
        )
      `);
      
      console.log('✅ Tabla categorias_gastos creada');
    } else {
      console.log('ℹ️  Tabla categorias_gastos ya existe');
    }
    
    // Crear índices para mejorar performance
    console.log('\n🔍 Creando índices...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_complejo ON gastos_ingresos(complejo_id)',
      'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_fecha ON gastos_ingresos(fecha)',
      'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_tipo ON gastos_ingresos(tipo)',
      'CREATE INDEX IF NOT EXISTS idx_reservas_tipo_reserva ON reservas(tipo_reserva)',
      'CREATE INDEX IF NOT EXISTS idx_reservas_comision ON reservas(comision_aplicada)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log(`✅ Índice creado: ${indexQuery.split(' ')[5]}`);
      } catch (error) {
        console.log(`ℹ️  Índice ya existe o error: ${error.message}`);
      }
    }
    
    // Verificar estructura final
    console.log('\n📋 Verificación final de estructura...');
    
    const reservasColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reservas' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas de la tabla reservas:');
    reservasColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n✅ Base de datos de producción corregida exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixProductionDatabase()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixProductionDatabase };




#!/usr/bin/env node

/**
 * Script para crear la tabla de depósitos y funciones relacionadas
 * Ejecutar: node scripts/crear-tabla-depositos.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

// Configuración de la base de datos usando las variables de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function crearTablaDepositos() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando creación de tabla de depósitos...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'sql', 'crear-tabla-depositos-complejos.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await client.query(sqlContent);
    
    console.log('✅ Tabla depositos_complejos creada exitosamente');
    console.log('✅ Funciones de cálculo de comisiones creadas');
    console.log('✅ Función de generación de depósitos diarios creada');
    
    // Verificar que la tabla se creó correctamente
    const verificacion = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'depositos_complejos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla depositos_complejos:');
    verificacion.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Verificar funciones creadas
    const funciones = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('calcular_comision_con_iva', 'generar_depositos_diarios')
    `);
    
    console.log('\n🔧 Funciones creadas:');
    funciones.rows.forEach(func => {
      console.log(`  - ${func.routine_name} (${func.routine_type})`);
    });
    
    console.log('\n🎉 ¡Sistema de depósitos instalado correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('  1. Acceder al panel de super admin');
    console.log('  2. Ir a "Gestión de Depósitos"');
    console.log('  3. Generar depósitos para fechas anteriores si es necesario');
    console.log('  4. Configurar cron job para generación automática diaria');
    
  } catch (error) {
    console.error('❌ Error creando tabla de depósitos:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await crearTablaDepositos();
    process.exit(0);
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { crearTablaDepositos };

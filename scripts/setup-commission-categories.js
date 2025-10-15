#!/usr/bin/env node

/**
 * Script para configurar categorías de comisión en el sistema de gastos
 * Este script crea las categorías necesarias para que las comisiones se registren automáticamente
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/reserva_tu_cancha'
});

async function setupCommissionCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Configurando categorías de comisión...');
    
    // Obtener todos los complejos
    const complejos = await client.query('SELECT id, nombre FROM complejos ORDER BY nombre');
    console.log(`📊 Encontrados ${complejos.rows.length} complejos`);
    
    for (const complejo of complejos.rows) {
      console.log(`\n🏢 Procesando complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      
      // Verificar si ya existen las categorías
      const existingCategories = await client.query(`
        SELECT nombre, tipo FROM categorias_gastos 
        WHERE complejo_id = $1 
        AND nombre IN ('Reservas Web', 'Comisión Plataforma')
      `, [complejo.id]);
      
      const existingNames = existingCategories.rows.map(cat => cat.nombre);
      console.log(`📋 Categorías existentes: ${existingNames.join(', ') || 'Ninguna'}`);
      
      // Crear categoría de ingresos "Reservas Web" si no existe
      if (!existingNames.includes('Reservas Web')) {
        await client.query(`
          INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
          VALUES ($1, 'Reservas Web', 'Ingresos por reservas realizadas a través de la plataforma web', 'fas fa-globe', '#28a745', 'ingreso', true)
        `, [complejo.id]);
        console.log('✅ Categoría "Reservas Web" creada');
      } else {
        console.log('ℹ️  Categoría "Reservas Web" ya existe');
      }
      
      // Crear categoría de gastos "Comisión Plataforma" si no existe
      if (!existingNames.includes('Comisión Plataforma')) {
        await client.query(`
          INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
          VALUES ($1, 'Comisión Plataforma', 'Comisión cobrada por la plataforma por cada reserva', 'fas fa-percentage', '#dc3545', 'gasto', true)
        `, [complejo.id]);
        console.log('✅ Categoría "Comisión Plataforma" creada');
      } else {
        console.log('ℹ️  Categoría "Comisión Plataforma" ya existe');
      }
    }
    
    // Verificar triggers
    console.log('\n🔍 Verificando triggers...');
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%reserva%' OR trigger_name LIKE '%gasto%'
    `);
    
    console.log(`📋 Triggers encontrados: ${triggers.rows.length}`);
    triggers.rows.forEach(trigger => {
      console.log(`  - ${trigger.trigger_name} en ${trigger.event_object_table}`);
    });
    
    // Verificar si hay reservas con comisiones que no tienen gastos registrados
    console.log('\n🔍 Verificando reservas sin gastos de comisión...');
    const reservasSinGastos = await client.query(`
      SELECT 
        r.codigo_reserva,
        r.comision_aplicada,
        r.fecha,
        c.nombre as cancha_nombre,
        co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      LEFT JOIN gastos_ingresos gi ON gi.descripcion LIKE '%Comisión%' || r.codigo_reserva || '%'
      WHERE r.estado = 'confirmada'
      AND r.comision_aplicada > 0
      AND gi.id IS NULL
      ORDER BY r.fecha DESC
      LIMIT 10
    `);
    
    console.log(`📊 Reservas con comisión sin gasto registrado: ${reservasSinGastos.rows.length}`);
    if (reservasSinGastos.rows.length > 0) {
      console.log('📋 Ejemplos:');
      reservasSinGastos.rows.forEach(reserva => {
        console.log(`  - ${reserva.codigo_reserva}: $${reserva.comision_aplicada} (${reserva.complejo_nombre})`);
      });
    }
    
    console.log('\n✅ Configuración completada');
    
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
  setupCommissionCategories()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { setupCommissionCategories };




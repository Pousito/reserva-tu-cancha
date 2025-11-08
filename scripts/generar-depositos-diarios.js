#!/usr/bin/env node

/**
 * Script para generar depósitos diarios automáticamente
 * Este script debe ejecutarse diariamente a las 23:59
 * 
 * Configurar cron job:
 * 59 23 * * * cd /ruta/al/proyecto && node scripts/generar-depositos-diarios.js
 */

const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/reservatuscanchas'
});

async function generarDepositosDiarios() {
  const client = await pool.connect();
  
  try {
    const fechaHoy = new Date().toISOString().split('T')[0];
    console.log(`💰 Generando depósitos para ${fechaHoy}...`);
    
    // Verificar si ya existen depósitos para hoy
    const depositosExistentes = await client.query(`
      SELECT COUNT(*) as count
      FROM depositos_complejos 
      WHERE fecha_deposito = $1
    `, [fechaHoy]);
    
    if (parseInt(depositosExistentes.rows[0].count) > 0) {
      console.log(`⚠️  Ya existen depósitos para ${fechaHoy}. Saltando generación.`);
      return;
    }
    
    // Generar depósitos usando la función SQL
    const resultado = await client.query(`
      SELECT * FROM generar_depositos_diarios($1)
    `, [fechaHoy]);
    
    const depositosGenerados = resultado.length;
    
    if (depositosGenerados > 0) {
      console.log(`✅ Se generaron ${depositosGenerados} depósitos para ${fechaHoy}`);
      
      // Mostrar resumen de depósitos generados
      resultado.forEach(deposito => {
        console.log(`  - Complejo ${deposito.complejo_id}: $${deposito.monto_deposito.toLocaleString()} (Comisión: $${deposito.comision_total.toLocaleString()})`);
      });
      
      // Calcular totales
      const totalDepositos = resultado.reduce((sum, d) => sum + d.monto_deposito, 0);
      const totalComisiones = resultado.reduce((sum, d) => sum + d.comision_total, 0);
      
      console.log(`\n📊 Resumen del día:`);
      console.log(`  - Total a depositar: $${totalDepositos.toLocaleString()}`);
      console.log(`  - Total de comisiones: $${totalComisiones.toLocaleString()}`);
      console.log(`  - Depósitos generados: ${depositosGenerados}`);
      
    } else {
      console.log(`ℹ️  No se generaron depósitos para ${fechaHoy} (no hay reservas confirmadas)`);
    }
    
  } catch (error) {
    console.error('❌ Error generando depósitos diarios:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await generarDepositosDiarios();
    console.log('🎉 Proceso completado exitosamente');
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

module.exports = { generarDepositosDiarios };




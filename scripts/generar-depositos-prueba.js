#!/usr/bin/env node

/**
 * Script para generar depósitos de prueba para todos los complejos
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function generarDepositosPrueba() {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Generando depósitos de prueba para todos los complejos...');
    
    // Obtener todos los complejos
    const complejos = await client.query(`
      SELECT id, nombre 
      FROM complejos 
      ORDER BY id
    `);
    
    console.log(`📊 Encontrados ${complejos.rows.length} complejos`);
    
    // Generar depósitos para cada complejo (excepto Demo 3 que ya tiene)
    for (const complejo of complejos.rows) {
      if (complejo.id === 8) { // Demo 3 ya tiene datos
        console.log(`⏭️  Saltando ${complejo.nombre} (ya tiene depósitos)`);
        continue;
      }
      
      console.log(`💰 Generando depósito para ${complejo.nombre}...`);
      
      // Generar datos de prueba
      const montoTotal = Math.floor(Math.random() * 50000) + 10000; // Entre $10,000 y $60,000
      const comisionPorcentaje = 0.035; // 3.5%
      const comisionSinIVA = Math.round(montoTotal * comisionPorcentaje);
      const ivaComision = Math.round(comisionSinIVA * 0.19);
      const comisionTotal = comisionSinIVA + ivaComision;
      const montoADepositar = montoTotal - comisionTotal;
      
      // Insertar depósito
      await client.query(`
        INSERT INTO depositos_complejos (
          complejo_id, 
          fecha_deposito, 
          monto_total_reservas, 
          comision_porcentaje, 
          comision_sin_iva, 
          iva_comision, 
          comision_total, 
          monto_a_depositar, 
          estado,
          observaciones
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        complejo.id,
        new Date().toISOString().split('T')[0], // Fecha de hoy
        montoTotal,
        comisionPorcentaje,
        comisionSinIVA,
        ivaComision,
        comisionTotal,
        montoADepositar,
        'pendiente',
        `Depósito de prueba generado automáticamente`
      ]);
      
      console.log(`✅ Depósito creado: $${montoTotal.toLocaleString()} - Comisión: $${comisionTotal.toLocaleString()} - A depositar: $${montoADepositar.toLocaleString()}`);
    }
    
    // Verificar total de depósitos
    const totalDepositos = await client.query(`
      SELECT COUNT(*) as total 
      FROM depositos_complejos
    `);
    
    console.log(`\n🎯 Total de depósitos en el sistema: ${totalDepositos.rows[0].total}`);
    
    // Mostrar resumen por complejo
    const resumen = await client.query(`
      SELECT 
        c.nombre,
        COUNT(d.id) as cantidad_depositos,
        SUM(d.monto_a_depositar) as total_a_depositar
      FROM complejos c
      LEFT JOIN depositos_complejos d ON c.id = d.complejo_id
      GROUP BY c.id, c.nombre
      ORDER BY c.nombre
    `);
    
    console.log('\n📊 Resumen por complejo:');
    resumen.rows.forEach(row => {
      const total = row.total_a_depositar ? `$${parseInt(row.total_a_depositar).toLocaleString()}` : '$0';
      console.log(`  - ${row.nombre}: ${row.cantidad_depositos} depósitos (${total})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

generarDepositosPrueba();








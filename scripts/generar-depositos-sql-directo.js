#!/usr/bin/env node

/**
 * Script para generar depósitos directamente usando SQL
 * Evita problemas con endpoints complejos
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function generarDepositosSQL() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 GENERANDO DEPÓSITOS DIRECTAMENTE CON SQL');
    console.log('='.repeat(60));
    
    // 1. Obtener todas las reservas confirmadas agrupadas por complejo y fecha
    console.log('\n📊 Obteniendo reservas confirmadas...');
    const reservas = await client.query(`
      SELECT 
        r.fecha,
        c.complejo_id,
        co.nombre as complejo_nombre,
        r.tipo_reserva,
        r.precio_total,
        r.comision_aplicada
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.estado = 'confirmada'
      ORDER BY r.fecha, c.complejo_id
    `);
    
    console.log(`Total reservas confirmadas: ${reservas.rows.length}`);
    
    // 2. Agrupar por complejo y fecha
    const agrupadas = {};
    reservas.rows.forEach(r => {
      const key = `${r.complejo_id}|${r.fecha}`;
      if (!agrupadas[key]) {
        agrupadas[key] = {
          complejo_id: r.complejo_id,
          complejo_nombre: r.complejo_nombre,
          fecha: r.fecha,
          reservas: [],
          monto_total: 0,
          comision_total: 0
        };
      }
      agrupadas[key].reservas.push(r);
      agrupadas[key].monto_total += r.precio_total;
      
      // Usar comisión ya calculada o calcular nueva
      if (r.comision_aplicada) {
        agrupadas[key].comision_total += r.comision_aplicada;
      } else {
        const tipo = r.tipo_reserva || 'directa';
        const porcentajeComision = tipo === 'administrativa' ? 0.0175 : 0.0350;
        const comisionSinIva = Math.round(r.precio_total * porcentajeComision);
        const ivaComision = Math.round(comisionSinIva * 0.19);
        const comisionTotal = comisionSinIva + ivaComision;
        agrupadas[key].comision_total += comisionTotal;
      }
    });
    
    console.log(`\n📋 Grupos encontrados: ${Object.keys(agrupadas).length}`);
    
    // 3. Generar depósitos para cada grupo
    let depositosGenerados = 0;
    for (const [key, grupo] of Object.entries(agrupadas)) {
      try {
        console.log(`\n💰 Procesando: ${grupo.complejo_nombre} - ${grupo.fecha}`);
        console.log(`   Reservas: ${grupo.reservas.length} | Monto: $${grupo.monto_total}`);
        
        // Calcular montos
        const montoADepositar = grupo.monto_total - grupo.comision_total;
        const porcentajeComision = grupo.comision_total / grupo.monto_total;
        const comisionSinIva = Math.round(grupo.monto_total * porcentajeComision * 0.84); // Aproximación
        const ivaComision = grupo.comision_total - comisionSinIva;
        
        // Verificar si ya existe un depósito para este complejo y fecha
        const existeDeposito = await client.query(`
          SELECT id FROM depositos_complejos 
          WHERE complejo_id = $1 AND fecha_deposito = $2
        `, [grupo.complejo_id, grupo.fecha]);
        
        if (existeDeposito.rows.length > 0) {
          console.log(`   ⚠️ Depósito ya existe, actualizando...`);
          
          // Actualizar depósito existente
          await client.query(`
            UPDATE depositos_complejos 
            SET 
              monto_total_reservas = $3,
              comision_porcentaje = $4,
              comision_sin_iva = $5,
              iva_comision = $6,
              comision_total = $7,
              monto_a_depositar = $8,
              updated_at = CURRENT_TIMESTAMP
            WHERE complejo_id = $1 AND fecha_deposito = $2
          `, [
            grupo.complejo_id, 
            grupo.fecha,
            grupo.monto_total,
            porcentajeComision,
            comisionSinIva,
            ivaComision,
            grupo.comision_total,
            montoADepositar
          ]);
          
          console.log(`   ✅ Depósito actualizado: $${montoADepositar}`);
        } else {
          console.log(`   ➕ Creando nuevo depósito...`);
          
          // Crear nuevo depósito
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
              observaciones,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            grupo.complejo_id,
            grupo.fecha,
            grupo.monto_total,
            porcentajeComision,
            comisionSinIva,
            ivaComision,
            grupo.comision_total,
            montoADepositar,
            'pendiente',
            'Generado automáticamente por script SQL'
          ]);
          
          console.log(`   ✅ Depósito creado: $${montoADepositar}`);
        }
        
        depositosGenerados++;
        
      } catch (error) {
        console.log(`   ❌ Error procesando grupo: ${error.message}`);
      }
    }
    
    // 4. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
    const depositosFinal = await client.query(`
      SELECT 
        dc.*,
        c.nombre as complejo_nombre
      FROM depositos_complejos dc
      JOIN complejos c ON dc.complejo_id = c.id
      ORDER BY dc.fecha_deposito DESC, dc.created_at DESC
    `);
    
    console.log(`✅ Total depósitos: ${depositosFinal.rows.length}`);
    
    if (depositosFinal.rows.length > 0) {
      console.log('\n📋 Depósitos generados:');
      depositosFinal.rows.forEach((dep, i) => {
        console.log(`${i+1}. ${dep.complejo_nombre} - ${dep.fecha_deposito}`);
        console.log(`   Monto reservas: $${dep.monto_total_reservas}`);
        console.log(`   Monto a depositar: $${dep.monto_a_depositar}`);
        console.log(`   Estado: ${dep.estado}`);
      });
      
      // Calcular totales
      const totalReservas = depositosFinal.rows.reduce((sum, dep) => sum + dep.monto_total_reservas, 0);
      const totalADepositar = depositosFinal.rows.reduce((sum, dep) => sum + dep.monto_a_depositar, 0);
      const totalComisiones = depositosFinal.rows.reduce((sum, dep) => sum + dep.comision_total, 0);
      
      console.log('\n💰 RESUMEN FINAL:');
      console.log(`   Total reservas: $${totalReservas}`);
      console.log(`   Total comisiones: $${totalComisiones}`);
      console.log(`   Total a depositar: $${totalADepositar}`);
    }
    
    console.log(`\n🎉 Proceso completado: ${depositosGenerados} depósitos procesados`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generarDepositosSQL();
}

module.exports = { generarDepositosSQL };




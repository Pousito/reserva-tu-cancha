#!/usr/bin/env node

/**
 * Script para configurar el control financiero en PRODUCCIÓN
 * - Crear datos de prueba
 * - Crear ingresos por reservas
 * - Crear gastos por comisiones
 */

require('dotenv').config();
const { Pool } = require('pg');

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function configurarControlFinancieroProduccion() {
  try {
    console.log('🚀 CONFIGURANDO CONTROL FINANCIERO EN PRODUCCIÓN');
    console.log('================================================');
    
    // 1. Verificar estado actual
    console.log('🔍 Verificando estado actual...');
    
    const estadoActual = await pool.query(`
      SELECT 
        COUNT(*) as total_movimientos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
        SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos
      FROM gastos_ingresos 
      WHERE complejo_id = 8
    `);
    
    console.log('📊 Estado actual Complejo Demo 3:');
    console.log('  - Total movimientos:', estadoActual.rows[0].total_movimientos);
    console.log('  - Total ingresos: $' + (parseFloat(estadoActual.rows[0].total_ingresos || 0)).toLocaleString());
    console.log('  - Total gastos: $' + (parseFloat(estadoActual.rows[0].total_gastos || 0)).toLocaleString());
    
    // 2. Verificar reservas
    const reservas = await pool.query(`
      SELECT r.id, r.codigo_reserva, r.precio_total, r.comision_aplicada, r.estado, r.fecha,
             c.nombre as cancha_nombre, comp.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos comp ON c.complejo_id = comp.id
      WHERE comp.id = 8 AND r.estado = 'confirmada'
      ORDER BY r.fecha DESC
      LIMIT 10
    `);
    
    console.log('\n📅 Reservas confirmadas:', reservas.rows.length);
    if (reservas.rows.length > 0) {
      let totalReservas = 0;
      let totalComisiones = 0;
      reservas.rows.forEach(reserva => {
        console.log('  - ' + reserva.codigo_reserva + ': $' + reserva.precio_total + ' | Comisión: $' + (reserva.comision_aplicada || 0));
        totalReservas += parseFloat(reserva.precio_total || 0);
        totalComisiones += parseFloat(reserva.comision_aplicada || 0);
      });
      console.log('\n💰 Total reservas: $' + totalReservas.toLocaleString());
      console.log('💸 Total comisiones: $' + totalComisiones.toLocaleString());
    }
    
    // 3. Crear categoría de comisión si no existe
    console.log('\n🔧 Creando categoría de comisión...');
    
    const categoriaExistente = await pool.query(`
      SELECT id FROM categorias_gastos 
      WHERE complejo_id = 8 AND nombre = 'Comisión Plataforma' AND tipo = 'gasto'
    `);
    
    let categoriaId;
    if (categoriaExistente.rows.length === 0) {
      const nuevaCategoria = await pool.query(`
        INSERT INTO categorias_gastos (
          complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
        ) VALUES (
          8, 'Comisión Plataforma', 'Comisiones cobradas por la plataforma ReservaTusCanchas', 
          'fas fa-percentage', '#dc3545', 'gasto', true
        ) RETURNING id
      `);
      categoriaId = nuevaCategoria.rows[0].id;
      console.log('✅ Categoría de comisión creada:', categoriaId);
    } else {
      categoriaId = categoriaExistente.rows[0].id;
      console.log('✅ Categoría de comisión existente:', categoriaId);
    }
    
    // 4. Crear ingresos por reservas confirmadas
    console.log('\n💰 Creando ingresos por reservas...');
    
    // Buscar categoría de ingreso para reservas
    const categoriaIngreso = await pool.query(`
      SELECT id FROM categorias_gastos 
      WHERE complejo_id = 8 AND tipo = 'ingreso' AND nombre LIKE '%Reserva%' 
      LIMIT 1
    `);
    
    if (categoriaIngreso.rows.length === 0) {
      console.log('❌ No se encontró categoría de ingreso para reservas');
      return;
    }
    
    const categoriaIngresoId = categoriaIngreso.rows[0].id;
    let ingresosCreados = 0;
    
    for (const reserva of reservas.rows) {
      // Verificar si ya existe un ingreso para esta reserva
      const ingresoExistente = await pool.query(`
        SELECT id FROM gastos_ingresos 
        WHERE descripcion LIKE $1 AND complejo_id = 8
      `, ['%Reserva ID: ' + reserva.id + '%']);
      
      if (ingresoExistente.rows.length === 0) {
        // Crear ingreso por la reserva
        await pool.query(`
          INSERT INTO gastos_ingresos (
            complejo_id, categoria_id, tipo, monto, fecha, descripcion, 
            metodo_pago, usuario_id
          ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico', 37)
        `, [
          8, // complejo_id
          categoriaIngresoId,
          reserva.precio_total,
          reserva.fecha,
          'Reserva ID: ' + reserva.id + ' - ' + reserva.cancha_nombre + ' (' + reserva.hora_inicio + '-' + reserva.hora_fin + ')'
        ]);
        
        console.log('✅ Ingreso creado: $' + reserva.precio_total + ' - Reserva ID: ' + reserva.id);
        ingresosCreados++;
      } else {
        console.log('⚠️ Ingreso ya existe para Reserva ID: ' + reserva.id);
      }
    }
    
    // 5. Crear gastos por comisiones
    console.log('\n💸 Creando gastos por comisiones...');
    
    let gastosCreados = 0;
    let totalComisionesRegistradas = 0;
    
    for (const reserva of reservas.rows) {
      if (reserva.comision_aplicada > 0) {
        // Verificar si ya existe un gasto para esta comisión
        const gastoExistente = await pool.query(`
          SELECT id FROM gastos_ingresos 
          WHERE descripcion LIKE $1 AND complejo_id = 8
        `, ['%Comisión Reserva #' + reserva.codigo_reserva + '%']);
        
        if (gastoExistente.rows.length === 0) {
          // Determinar el tipo de comisión para la descripción
          const tipoComision = reserva.tipo_reserva === 'administrativa' 
            ? 'Admin (1.75% + IVA)' 
            : 'Web (3.5% + IVA)';
          
          // Crear el gasto de comisión
          await pool.query(`
            INSERT INTO gastos_ingresos (
              complejo_id, categoria_id, tipo, monto, fecha, 
              descripcion, metodo_pago, usuario_id
            ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico', 37)
          `, [
            8, // complejo_id
            categoriaId,
            reserva.comision_aplicada,
            reserva.fecha,
            'Comisión Reserva #' + reserva.codigo_reserva + ' - ' + tipoComision
          ]);
          
          console.log('✅ Gasto creado: $' + reserva.comision_aplicada + ' - Reserva #' + reserva.codigo_reserva);
          gastosCreados++;
          totalComisionesRegistradas += parseFloat(reserva.comision_aplicada);
        } else {
          console.log('⚠️ Gasto ya existe para Reserva #' + reserva.codigo_reserva);
        }
      }
    }
    
    // 6. Verificar resultado final
    console.log('\n📊 VERIFICANDO RESULTADO FINAL...');
    
    const resultadoFinal = await pool.query(`
      SELECT 
        COUNT(*) as total_movimientos,
        SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
        SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos
      FROM gastos_ingresos 
      WHERE complejo_id = 8
    `);
    
    const totalIngresos = parseFloat(resultadoFinal.rows[0].total_ingresos || 0);
    const totalGastos = parseFloat(resultadoFinal.rows[0].total_gastos || 0);
    const balance = totalIngresos - totalGastos;
    
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA:');
    console.log('================================');
    console.log('📊 RESUMEN FINAL:');
    console.log('  - Total movimientos:', resultadoFinal.rows[0].total_movimientos);
    console.log('  - Ingresos creados:', ingresosCreados);
    console.log('  - Gastos creados:', gastosCreados);
    console.log('  - Total comisiones registradas: $' + totalComisionesRegistradas.toLocaleString());
    console.log('\n💰 BALANCE FINAL:');
    console.log('  - Total Ingresos: $' + totalIngresos.toLocaleString());
    console.log('  - Total Gastos: $' + totalGastos.toLocaleString());
    console.log('  - Balance: $' + balance.toLocaleString());
    
    console.log('\n✅ Control financiero configurado exitosamente en PRODUCCIÓN');
    console.log('🌐 Accede a: https://www.reservatuscanchas.cl/admin-gastos.html');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  configurarControlFinancieroProduccion();
}

module.exports = { configurarControlFinancieroProduccion };

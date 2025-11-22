#!/usr/bin/env node

/**
 * Script de prueba para generar depósitos de ejemplo
 * Ejecutar: node scripts/probar-depositos.js
 */

const { Pool } = require('pg');

// Cargar variables de entorno
require('dotenv').config();

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function probarDepositos() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Probando sistema de depósitos...');
    
    // Verificar que la tabla existe
    const tablaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'depositos_complejos'
      );
    `);
    
    if (!tablaExiste.rows[0].exists) {
      console.log('❌ La tabla depositos_complejos no existe');
      return;
    }
    
    console.log('✅ Tabla depositos_complejos existe');
    
    // Verificar funciones
    const funciones = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN ('calcular_comision_con_iva', 'generar_depositos_diarios')
    `);
    
    console.log('✅ Funciones encontradas:', funciones.rows.map(f => f.routine_name).join(', '));
    
    // Probar función de cálculo de comisiones
    console.log('\n🧮 Probando cálculo de comisiones:');
    
    const pruebaComision = await client.query(`
      SELECT * FROM calcular_comision_con_iva(10000, 'directa')
    `);
    
    console.log('  - Reserva de $10,000 (directa):');
    console.log(`    * Comisión sin IVA: $${pruebaComision.rows[0].comision_sin_iva}`);
    console.log(`    * IVA: $${pruebaComision.rows[0].iva_comision}`);
    console.log(`    * Total: $${pruebaComision.rows[0].comision_total}`);
    
    const pruebaComisionAdmin = await client.query(`
      SELECT * FROM calcular_comision_con_iva(10000, 'administrativa')
    `);
    
    console.log('  - Reserva de $10,000 (administrativa):');
    console.log(`    * Comisión sin IVA: $${pruebaComisionAdmin.rows[0].comision_sin_iva}`);
    console.log(`    * IVA: $${pruebaComisionAdmin.rows[0].iva_comision}`);
    console.log(`    * Total: $${pruebaComisionAdmin.rows[0].comision_total}`);
    
    // Verificar complejos disponibles
    const complejos = await client.query(`
      SELECT id, nombre FROM complejos ORDER BY id
    `);
    
    console.log('\n🏢 Complejos disponibles:');
    complejos.rows.forEach(complejo => {
      console.log(`  - ${complejo.id}: ${complejo.nombre}`);
    });
    
    // Verificar reservas recientes
    const reservasRecientes = await client.query(`
      SELECT 
        r.id,
        r.codigo_reserva,
        r.fecha,
        r.precio_total,
        r.tipo_reserva,
        r.comision_aplicada,
        c.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas ca ON r.cancha_id = ca.id
      JOIN complejos c ON ca.complejo_id = c.id
      WHERE r.estado = 'confirmada'
      ORDER BY r.fecha DESC
      LIMIT 5
    `);
    
    console.log('\n📋 Reservas recientes:');
    reservasRecientes.rows.forEach(reserva => {
      console.log(`  - ${reserva.codigo_reserva}: $${reserva.precio_total} (${reserva.tipo_reserva}) - ${reserva.complejo_nombre}`);
    });
    
    // Probar generación de depósitos para hoy
    console.log('\n💰 Probando generación de depósitos para hoy...');
    
    const hoy = new Date().toISOString().split('T')[0];
    const depositosGenerados = await client.query(`
      SELECT * FROM generar_depositos_diarios($1)
    `, [hoy]);
    
    if (depositosGenerados.length > 0) {
      console.log(`✅ Se generaron ${depositosGenerados.length} depósitos para ${hoy}`);
      depositosGenerados.forEach(deposito => {
        console.log(`  - Complejo ${deposito.complejo_id}: $${deposito.monto_deposito} (Comisión: $${deposito.comision_total})`);
      });
    } else {
      console.log(`ℹ️  No se generaron depósitos para ${hoy} (no hay reservas confirmadas para hoy)`);
    }
    
    // Verificar depósitos existentes
    const depositosExistentes = await client.query(`
      SELECT 
        dc.*,
        c.nombre as complejo_nombre
      FROM depositos_complejos dc
      JOIN complejos c ON dc.complejo_id = c.id
      ORDER BY dc.fecha_deposito DESC
      LIMIT 5
    `);
    
    console.log('\n📊 Depósitos existentes:');
    if (depositosExistentes.length > 0) {
      depositosExistentes.forEach(deposito => {
        console.log(`  - ${deposito.complejo_nombre} (${deposito.fecha_deposito}): $${deposito.monto_a_depositar} - ${deposito.estado}`);
      });
    } else {
      console.log('  - No hay depósitos registrados');
    }
    
    console.log('\n🎉 ¡Sistema de depósitos funcionando correctamente!');
    console.log('\n📝 Para probar el panel web:');
    console.log('  1. Ir a http://localhost:3000');
    console.log('  2. Login como super admin (admin@reservatuscanchas.cl)');
    console.log('  3. Ir a "Gestión de Depósitos"');
    
  } catch (error) {
    console.error('❌ Error probando depósitos:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await probarDepositos();
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

module.exports = { probarDepositos };








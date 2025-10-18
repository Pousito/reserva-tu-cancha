#!/usr/bin/env node

/**
 * Script para eliminar la cancha 2 de pádel del Complejo Demo 3
 * Fecha: $(date)
 * Descripción: Elimina la cancha 2 de pádel, dejando solo una cancha de pádel
 */

const { Pool } = require('pg');

console.log('🏟️ ================================================');
console.log('🏟️ ELIMINANDO CANCHA 2 DE PÁDEL - COMPLEJO DEMO 3');
console.log('🏟️ ================================================');

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable',
  ssl: false
});

async function eliminarCancha2Padel() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando complejo Demo 3...');
    
    // Buscar el complejo Demo 3
    const complejoResult = await client.query(
      'SELECT id, nombre FROM complejos WHERE nombre = $1',
      ['Complejo Demo 3']
    );
    
    if (complejoResult.rows.length === 0) {
      console.log('❌ Complejo Demo 3 no encontrado');
      return;
    }
    
    const complejo = complejoResult.rows[0];
    console.log(`✅ Complejo encontrado: ${complejo.nombre} (ID: ${complejo.id})`);
    
    // Buscar todas las canchas de pádel del complejo Demo 3
    console.log('\n🔍 Buscando canchas de pádel en el complejo...');
    const canchasPadel = await client.query(`
      SELECT id, nombre, tipo, precio_hora 
      FROM canchas 
      WHERE complejo_id = $1 AND tipo = 'padel'
      ORDER BY nombre
    `, [complejo.id]);
    
    if (canchasPadel.rows.length === 0) {
      console.log('❌ No se encontraron canchas de pádel en el complejo Demo 3');
      return;
    }
    
    console.log(`📊 Canchas de pádel encontradas: ${canchasPadel.rows.length}`);
    canchasPadel.rows.forEach((cancha, index) => {
      console.log(`   ${index + 1}. ID: ${cancha.id} - ${cancha.nombre} (${cancha.tipo}) - $${cancha.precio_hora}`);
    });
    
    // Buscar específicamente la "cancha 2 de pádel"
    const cancha2Padel = canchasPadel.rows.find(cancha => 
      cancha.nombre.toLowerCase().includes('cancha 2') || 
      cancha.nombre.toLowerCase().includes('cancha2') ||
      cancha.nombre.toLowerCase().includes('2')
    );
    
    if (!cancha2Padel) {
      console.log('❌ No se encontró "cancha 2 de pádel" específicamente');
      console.log('💡 Canchas de pádel disponibles:');
      canchasPadel.rows.forEach((cancha, index) => {
        console.log(`   ${index + 1}. ${cancha.nombre} (ID: ${cancha.id})`);
      });
      return;
    }
    
    console.log(`\n🎯 Cancha 2 de pádel encontrada:`);
    console.log(`   ID: ${cancha2Padel.id}`);
    console.log(`   Nombre: ${cancha2Padel.nombre}`);
    console.log(`   Tipo: ${cancha2Padel.tipo}`);
    console.log(`   Precio: $${cancha2Padel.precio_hora}`);
    
    // Verificar si hay reservas asociadas
    console.log('\n🔍 Verificando reservas asociadas...');
    const reservasResult = await client.query(
      'SELECT COUNT(*) as total FROM reservas WHERE cancha_id = $1',
      [cancha2Padel.id]
    );
    
    const totalReservas = parseInt(reservasResult.rows[0].total);
    console.log(`📊 Reservas encontradas: ${totalReservas}`);
    
    if (totalReservas > 0) {
      console.log('⚠️  ADVERTENCIA: Esta cancha tiene reservas asociadas');
      console.log('💡 Se eliminarán también las reservas asociadas');
    }
    
    // Confirmar eliminación
    console.log('\n🗑️  ELIMINANDO CANCHA 2 DE PÁDEL...');
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    try {
      // Eliminar reservas asociadas primero
      if (totalReservas > 0) {
        console.log('🗑️  Eliminando reservas asociadas...');
        await client.query('DELETE FROM reservas WHERE cancha_id = $1', [cancha2Padel.id]);
        console.log(`   ✅ ${totalReservas} reservas eliminadas`);
      }
      
      // Eliminar la cancha
      console.log('🗑️  Eliminando cancha...');
      await client.query('DELETE FROM canchas WHERE id = $1', [cancha2Padel.id]);
      console.log(`   ✅ Cancha "${cancha2Padel.nombre}" eliminada`);
      
      // Confirmar transacción
      await client.query('COMMIT');
      
      console.log('\n🎉 ================================================');
      console.log('🎉 CANCHA 2 DE PÁDEL ELIMINADA EXITOSAMENTE');
      console.log('🎉 ================================================');
      console.log(`🏟️  Complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      console.log(`🗑️  Cancha eliminada: ${cancha2Padel.nombre} (ID: ${cancha2Padel.id})`);
      console.log(`📊 Reservas eliminadas: ${totalReservas}`);
      
      // Verificar canchas restantes
      console.log('\n🔍 Verificando canchas restantes...');
      const canchasRestantes = await client.query(`
        SELECT id, nombre, tipo, precio_hora 
        FROM canchas 
        WHERE complejo_id = $1
        ORDER BY tipo, nombre
      `, [complejo.id]);
      
      console.log(`📊 Total de canchas restantes: ${canchasRestantes.rows.length}`);
      canchasRestantes.rows.forEach((cancha, index) => {
        console.log(`   ${index + 1}. ${cancha.nombre} (${cancha.tipo}) - $${cancha.precio_hora}`);
      });
      
      console.log('\n✅ El complejo Demo 3 ahora tiene solo una cancha de pádel');
      
    } catch (error) {
      // Revertir transacción en caso de error
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ ERROR eliminando cancha:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar eliminación
eliminarCancha2Padel()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

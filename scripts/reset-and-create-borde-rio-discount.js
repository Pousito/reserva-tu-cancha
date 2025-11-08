/**
 * Script para eliminar todos los códigos de descuento existentes
 * y crear el nuevo código RESERVABORDERIO10
 * Ejecutar: node scripts/reset-and-create-borde-rio-discount.js
 */

// Configurar variables de entorno
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: './env.postgresql' });
}

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetAndCreateDiscountCode() {
  console.log('🎫 ELIMINANDO CÓDIGOS DE DESCUENTO Y CREANDO NUEVO CÓDIGO');
  console.log('===========================================================');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Listar códigos existentes antes de eliminar
    console.log('\n📋 Códigos de descuento existentes:');
    const codigosExistentes = await client.query(`
      SELECT id, codigo, porcentaje_descuento, fecha_fin, usos_actuales, usos_maximos
      FROM codigos_descuento
      ORDER BY codigo
    `);
    
    if (codigosExistentes.rows.length > 0) {
      codigosExistentes.rows.forEach(codigo => {
        console.log(`   - ${codigo.codigo}: ${codigo.porcentaje_descuento}% (${codigo.usos_actuales || 0}/${codigo.usos_maximos || '∞'} usos) - Válido hasta ${codigo.fecha_fin}`);
      });
    } else {
      console.log('   (No hay códigos existentes)');
    }
    
    // 2. Eliminar todos los códigos de descuento existentes
    console.log('\n🗑️  Eliminando todos los códigos de descuento existentes...');
    
    // Primero eliminar los registros de uso asociados
    const deleteUsos = await client.query(`
      DELETE FROM uso_codigos_descuento
    `);
    console.log(`   ✅ Eliminados ${deleteUsos.rowCount} registros de uso de códigos`);
    
    // Luego eliminar los códigos
    const deleteCodigos = await client.query(`
      DELETE FROM codigos_descuento
    `);
    console.log(`   ✅ Eliminados ${deleteCodigos.rowCount} códigos de descuento`);
    
    // 3. Crear el nuevo código RESERVABORDERIO10
    console.log('\n🎫 Creando nuevo código RESERVABORDERIO10...');
    
    const fechaInicio = new Date().toISOString().split('T')[0]; // Hoy
    const fechaFin = '2025-11-14'; // 14 de noviembre de 2025
    
    const nuevoCodigo = {
      codigo: 'RESERVABORDERIO10',
      descripcion: 'Descuento del 10% para reservas en Espacio Deportivo Borde Río',
      porcentaje_descuento: 10.00,
      monto_maximo_descuento: null, // Sin límite máximo de descuento
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      usos_maximos: null, // Usos ilimitados
      activo: true
    };
    
    const insertResult = await client.query(`
      INSERT INTO codigos_descuento 
      (codigo, descripcion, porcentaje_descuento, monto_maximo_descuento, 
       fecha_inicio, fecha_fin, usos_maximos, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, codigo, porcentaje_descuento, fecha_fin
    `, [
      nuevoCodigo.codigo,
      nuevoCodigo.descripcion,
      nuevoCodigo.porcentaje_descuento,
      nuevoCodigo.monto_maximo_descuento,
      nuevoCodigo.fecha_inicio,
      nuevoCodigo.fecha_fin,
      nuevoCodigo.usos_maximos,
      nuevoCodigo.activo
    ]);
    
    const codigoCreado = insertResult.rows[0];
    
    console.log(`   ✅ Código creado exitosamente:`);
    console.log(`      ID: ${codigoCreado.id}`);
    console.log(`      Código: ${codigoCreado.codigo}`);
    console.log(`      Descuento: ${codigoCreado.porcentaje_descuento}%`);
    console.log(`      Máximo descuento: Sin límite`);
    console.log(`      Fecha inicio: ${nuevoCodigo.fecha_inicio}`);
    console.log(`      Fecha fin: ${codigoCreado.fecha_fin}`);
    console.log(`      Usos máximos: Ilimitados`);
    console.log(`      Estado: Activo`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Proceso completado exitosamente');
    console.log('💡 El código RESERVABORDERIO10 está listo para ser utilizado');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error durante el proceso:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
  }
}

resetAndCreateDiscountCode()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });



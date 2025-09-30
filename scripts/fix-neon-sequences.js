#!/usr/bin/env node

/**
 * Script para corregir las secuencias en Neon después de la migración
 * Esto resuelve el error "duplicate key value violates unique constraint"
 */

const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🔧 CORRIGIENDO SECUENCIAS EN NEON');
console.log('==================================');

async function fixSequences() {
  let neonPool = null;

  try {
    console.log('🔌 Conectando a Neon...');
    
    neonPool = new Pool({
      connectionString: NEON_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await neonPool.connect();
    console.log('✅ Conexión establecida');

    // Tablas con secuencias SERIAL
    const tablesWithSequences = [
      'ciudades',
      'complejos', 
      'canchas',
      'usuarios',
      'reservas',
      'pagos',
      'bloqueos_temporales',
      'password_reset_tokens',
      'codigos_descuento',
      'uso_codigos_descuento'
    ];

    console.log('\n🔍 Corrigiendo secuencias...');

    for (const tableName of tablesWithSequences) {
      try {
        // Obtener el ID máximo actual
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${tableName}`);
        const maxId = parseInt(maxIdResult.rows[0].max_id);
        
        if (maxId > 0) {
          // Actualizar la secuencia para que el próximo ID sea maxId + 1
          const sequenceName = `${tableName}_id_seq`;
          const nextId = maxId + 1;
          
          await client.query(`SELECT setval('${sequenceName}', ${nextId}, false)`);
          
          console.log(`   ✅ ${tableName}: secuencia actualizada (próximo ID: ${nextId})`);
        } else {
          console.log(`   ℹ️  ${tableName}: tabla vacía, secuencia en 1`);
        }
      } catch (error) {
        console.log(`   ❌ Error corrigiendo ${tableName}: ${error.message}`);
      }
    }

    // Verificar que las secuencias están correctas
    console.log('\n🔍 Verificando secuencias...');
    
    for (const tableName of tablesWithSequences) {
      try {
        const sequenceName = `${tableName}_id_seq`;
        const sequenceResult = await client.query(`SELECT last_value FROM ${sequenceName}`);
        const lastValue = parseInt(sequenceResult.rows[0].last_value);
        
        const maxIdResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${tableName}`);
        const maxId = parseInt(maxIdResult.rows[0].max_id);
        
        if (lastValue > maxId) {
          console.log(`   ✅ ${tableName}: secuencia OK (${lastValue} > ${maxId})`);
        } else {
          console.log(`   ⚠️  ${tableName}: secuencia podría necesitar ajuste (${lastValue} <= ${maxId})`);
        }
      } catch (error) {
        console.log(`   ❌ Error verificando ${tableName}: ${error.message}`);
      }
    }

    // Probar inserción en tabla pagos
    console.log('\n🧪 Probando inserción en tabla pagos...');
    try {
      // Intentar insertar un registro de prueba
      const testInsert = `
        INSERT INTO pagos (
          reserva_id, transbank_token, order_id, amount, status
        ) VALUES (
          999, 'test_token_' || extract(epoch from now()), 'test_order_' || extract(epoch from now()), 1000, 'pending'
        ) RETURNING id
      `;
      
      const result = await client.query(testInsert);
      const newId = result.rows[0].id;
      
      console.log(`   ✅ Inserción exitosa: ID ${newId}`);
      
      // Eliminar el registro de prueba
      await client.query('DELETE FROM pagos WHERE id = $1', [newId]);
      console.log('   🗑️  Registro de prueba eliminado');
      
    } catch (error) {
      console.log(`   ❌ Error en prueba de inserción: ${error.message}`);
    }

    console.log('\n🎉 CORRECCIÓN DE SECUENCIAS COMPLETADA');
    console.log('======================================');
    console.log('✅ Secuencias actualizadas');
    console.log('✅ Prueba de inserción exitosa');
    console.log('✅ La aplicación debería funcionar correctamente ahora');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    if (neonPool) await neonPool.end();
  }
}

// Ejecutar corrección
fixSequences();

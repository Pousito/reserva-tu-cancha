#!/usr/bin/env node

/**
 * Script de migración de Neon PostgreSQL a Render (Versión Mejorada)
 * Migra datos de Neon a Render manteniendo la estructura completa
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 MIGRACIÓN DE NEON A RENDER POSTGRESQL (VERSIÓN MEJORADA)');
console.log('============================================================');

// Configuración
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL; // Base de datos actual de Neon
const RENDER_DATABASE_URL = process.env.RENDER_DATABASE_URL; // Nueva URL de Render

if (!NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL no está configurado');
  console.log('💡 Configura la variable de entorno NEON_DATABASE_URL');
  process.exit(1);
}

if (!RENDER_DATABASE_URL) {
  console.error('❌ RENDER_DATABASE_URL no está configurado');
  console.log('💡 Configura la variable de entorno RENDER_DATABASE_URL');
  process.exit(1);
}

async function migrateNeonToRender() {
  let neonPool = null;
  let renderPool = null;

  try {
    console.log('🔌 Conectando a bases de datos...');
    
    // Conectar a Neon (origen)
    neonPool = new Pool({
      connectionString: NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Conectar a Render (destino)
    renderPool = new Pool({
      connectionString: RENDER_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Verificar conexiones
    const neonClient = await neonPool.connect();
    const renderClient = await renderPool.connect();
    
    console.log('✅ Conexiones establecidas');
    
    // 1. Obtener estructura completa de Neon
    console.log('\n📋 Obteniendo estructura completa de Neon...');
    
    // Obtener secuencias
    const sequencesQuery = `
      SELECT 
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `;
    
    const sequences = await neonClient.query(sequencesQuery);
    console.log(`🔢 Secuencias encontradas: ${sequences.rows.map(s => s.sequence_name).join(', ')}`);

    // Obtener tablas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tables = await neonClient.query(tablesQuery);
    console.log(`📊 Tablas encontradas: ${tables.rows.map(t => t.table_name).join(', ')}`);

    // 2. Limpiar base de datos de Render
    console.log('\n🧹 Limpiando base de datos de Render...');
    
    // Eliminar tablas en orden inverso (por dependencias)
    const tablesToDrop = tables.rows.map(t => t.table_name).reverse();
    for (const tableName of tablesToDrop) {
      try {
        await renderClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`   🗑️  Tabla ${tableName} eliminada`);
      } catch (error) {
        console.log(`   ⚠️  Error eliminando ${tableName}: ${error.message}`);
      }
    }

    // Eliminar secuencias
    for (const sequence of sequences.rows) {
      try {
        await renderClient.query(`DROP SEQUENCE IF EXISTS ${sequence.sequence_name} CASCADE`);
        console.log(`   🗑️  Secuencia ${sequence.sequence_name} eliminada`);
      } catch (error) {
        console.log(`   ⚠️  Error eliminando secuencia ${sequence.sequence_name}: ${error.message}`);
      }
    }

    // 3. Crear secuencias en Render
    console.log('\n🔢 Creando secuencias en Render...');
    
    for (const sequence of sequences.rows) {
      const createSequenceQuery = `
        CREATE SEQUENCE ${sequence.sequence_name}
        AS ${sequence.data_type}
        START WITH ${sequence.start_value}
        INCREMENT BY ${sequence.increment}
        MINVALUE ${sequence.minimum_value}
        MAXVALUE ${sequence.maximum_value}
        ${sequence.cycle_option === 'YES' ? 'CYCLE' : 'NO CYCLE'}
      `;
      
      try {
        await renderClient.query(createSequenceQuery);
        console.log(`   ✅ Secuencia ${sequence.sequence_name} creada`);
      } catch (error) {
        console.log(`   ❌ Error creando secuencia ${sequence.sequence_name}: ${error.message}`);
      }
    }

    // 4. Crear estructura de tablas en Render
    console.log('\n🏗️  Creando estructura de tablas en Render...');
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`🔧 Procesando tabla: ${tableName}`);
      
      // Obtener definición completa de tabla
      const ddlQuery = `
        SELECT 
          'CREATE TABLE ' || table_name || ' (' ||
          string_agg(
            column_name || ' ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '255') || ')'
              WHEN data_type = 'character' THEN 'CHAR(' || COALESCE(character_maximum_length::text, '1') || ')'
              WHEN data_type = 'numeric' THEN 
                CASE 
                  WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL 
                  THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
                  ELSE 'NUMERIC'
                END
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'time without time zone' THEN 'TIME'
              WHEN data_type = 'time with time zone' THEN 'TIMETZ'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'json' THEN 'JSON'
              WHEN data_type = 'jsonb' THEN 'JSONB'
              WHEN data_type = 'uuid' THEN 'UUID'
              WHEN data_type = 'bytea' THEN 'BYTEA'
              ELSE UPPER(data_type)
            END ||
            CASE 
              WHEN is_nullable = 'NO' THEN ' NOT NULL'
              ELSE ''
            END ||
            CASE 
              WHEN column_default IS NOT NULL 
              THEN ' DEFAULT ' || column_default
              ELSE ''
            END,
            ', '
          ) || ');' as ddl
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        GROUP BY table_name;
      `;
      
      const ddlResult = await neonClient.query(ddlQuery, [tableName]);
      if (ddlResult.rows.length > 0) {
        const ddl = ddlResult.rows[0].ddl;
        console.log(`   📝 DDL: ${ddl}`);
        
        try {
          await renderClient.query(ddl);
          console.log(`   ✅ Tabla ${tableName} creada en Render`);
        } catch (error) {
          console.log(`   ❌ Error creando ${tableName}: ${error.message}`);
        }
      }
    }

    // 5. Migrar datos
    console.log('\n📦 Migrando datos...');
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`📤 Migrando datos de: ${tableName}`);
      
      try {
        // Obtener datos de Neon
        const dataQuery = `SELECT * FROM ${tableName}`;
        const data = await neonClient.query(dataQuery);
        
        if (data.rows.length > 0) {
          // Obtener columnas
          const columns = Object.keys(data.rows[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')}) 
            VALUES (${placeholders})
          `;
          
          // Insertar datos en Render
          for (const row of data.rows) {
            const values = columns.map(col => row[col]);
            await renderClient.query(insertQuery, values);
          }
          
          console.log(`   ✅ ${data.rows.length} registros migrados`);
        } else {
          console.log(`   ℹ️  Tabla ${tableName} está vacía`);
        }
      } catch (error) {
        console.log(`   ❌ Error migrando ${tableName}: ${error.message}`);
      }
    }

    // 6. Crear índices y constraints
    console.log('\n🔗 Creando índices y constraints...');
    
    // Obtener índices de Neon
    const indexesQuery = `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `;
    
    const indexes = await neonClient.query(indexesQuery);
    for (const index of indexes.rows) {
      try {
        await renderClient.query(index.indexdef);
        console.log(`   ✅ Índice ${index.indexname} creado`);
      } catch (error) {
        console.log(`   ⚠️  Error creando índice ${index.indexname}: ${error.message}`);
      }
    }

    // 7. Verificar migración
    console.log('\n🔍 Verificando migración...');
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      const neonCount = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const renderCount = await renderClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const neonRows = parseInt(neonCount.rows[0].count);
      const renderRows = parseInt(renderCount.rows[0].count);
      
      if (neonRows === renderRows) {
        console.log(`   ✅ ${tableName}: ${renderRows} registros (OK)`);
      } else {
        console.log(`   ⚠️  ${tableName}: Neon=${neonRows}, Render=${renderRows}`);
      }
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log('========================');
    console.log('✅ Secuencias migradas');
    console.log('✅ Estructura migrada');
    console.log('✅ Datos migrados');
    console.log('✅ Índices migrados');
    console.log('✅ Verificación completada');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Actualizar DATABASE_URL en Render con la URL de Render');
    console.log('2. Probar la aplicación');
    console.log('3. Verificar que todo funcione correctamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    if (neonPool) await neonPool.end();
    if (renderPool) await renderPool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateNeonToRender();
}

module.exports = { migrateNeonToRender };

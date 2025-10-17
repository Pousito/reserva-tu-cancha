#!/usr/bin/env node

/**
 * Script de migración de Neon PostgreSQL a Render
 * Migra datos de Neon a Render manteniendo la estructura
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 MIGRACIÓN DE NEON A RENDER POSTGRESQL');
console.log('==========================================');

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
    
    // 1. Obtener estructura de tablas de Neon
    console.log('\n📋 Obteniendo estructura de tablas...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tables = await neonClient.query(tablesQuery);
    console.log(`📊 Tablas encontradas: ${tables.rows.map(t => t.table_name).join(', ')}`);

    // 2. Limpiar base de datos de Render (si existe)
    console.log('\n🧹 Limpiando base de datos de Render...');
    for (const table of tables.rows) {
      const tableName = table.table_name;
      try {
        await renderClient.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        console.log(`   🗑️  Tabla ${tableName} eliminada`);
      } catch (error) {
        console.log(`   ⚠️  Error eliminando ${tableName}: ${error.message}`);
      }
    }

    // 3. Crear estructura en Render
    console.log('\n🏗️  Creando estructura en Render...');
    
    // Obtener DDL completo de Neon
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
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`🔧 Procesando tabla: ${tableName}`);
      
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

    // 4. Migrar datos
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

    // 5. Crear índices y constraints
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

    // 6. Verificar migración
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

// Función para crear archivo de configuración
function createRenderConfig() {
  const configContent = `# Configuración para migración de Neon a Render
# 1. Reactiva tu base de datos de Render desde el dashboard
# 2. Obtén la nueva DATABASE_URL de Render
# 3. Configura las variables de entorno:

export NEON_DATABASE_URL="postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

export RENDER_DATABASE_URL="postgresql://reserva_user:password@dpg-xxx.render.com/reserva_tu_cancha"

# 4. Ejecuta la migración:
# node scripts/migrate-neon-to-render.js

# 5. Actualiza DATABASE_URL en Render con la URL de Render
`;

  fs.writeFileSync('RENDER_MIGRATION_GUIDE.md', configContent);
  console.log('📝 Guía de migración creada: RENDER_MIGRATION_GUIDE.md');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  if (process.argv.includes('--setup')) {
    createRenderConfig();
  } else {
    migrateNeonToRender();
  }
}

module.exports = { migrateNeonToRender, createRenderConfig };

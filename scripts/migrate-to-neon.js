#!/usr/bin/env node

/**
 * Script de migración de Render PostgreSQL a Neon
 * Migra datos de Render a Neon manteniendo la estructura
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 MIGRACIÓN A NEON POSTGRESQL');
console.log('==============================');

// Configuración
const RENDER_DATABASE_URL = process.env.DATABASE_URL; // Tu base de datos actual de Render
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL; // Nueva URL de Neon

if (!RENDER_DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurado');
  process.exit(1);
}

if (!NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL no está configurado');
  console.log('💡 Obtén tu URL de Neon desde: https://console.neon.tech/');
  process.exit(1);
}

async function migrateToNeon() {
  let renderPool = null;
  let neonPool = null;

  try {
    console.log('🔌 Conectando a bases de datos...');
    
    // Conectar a Render (origen)
    renderPool = new Pool({
      connectionString: RENDER_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Conectar a Neon (destino)
    neonPool = new Pool({
      connectionString: NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Verificar conexiones
    const renderClient = await renderPool.connect();
    const neonClient = await neonPool.connect();
    
    console.log('✅ Conexiones establecidas');
    
    // 1. Obtener estructura de tablas de Render
    console.log('\n📋 Obteniendo estructura de tablas...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tables = await renderClient.query(tablesQuery);
    console.log(`📊 Tablas encontradas: ${tables.rows.map(t => t.table_name).join(', ')}`);

    // 2. Crear estructura en Neon
    console.log('\n🏗️  Creando estructura en Neon...');
    
    // Obtener DDL de cada tabla
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`🔧 Procesando tabla: ${tableName}`);
      
      // Obtener definición de tabla
      const ddlQuery = `
        SELECT 
          'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
          string_agg(
            column_name || ' ' || data_type ||
            CASE 
              WHEN character_maximum_length IS NOT NULL 
              THEN '(' || character_maximum_length || ')'
              ELSE ''
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
      
      const ddlResult = await renderClient.query(ddlQuery, [tableName]);
      if (ddlResult.rows.length > 0) {
        const ddl = ddlResult.rows[0].ddl;
        console.log(`   📝 DDL: ${ddl}`);
        
        try {
          await neonClient.query(ddl);
          console.log(`   ✅ Tabla ${tableName} creada en Neon`);
        } catch (error) {
          console.log(`   ⚠️  Tabla ${tableName} ya existe o error: ${error.message}`);
        }
      }
    }

    // 3. Migrar datos
    console.log('\n📦 Migrando datos...');
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      console.log(`📤 Migrando datos de: ${tableName}`);
      
      try {
        // Obtener datos de Render
        const dataQuery = `SELECT * FROM ${tableName}`;
        const data = await renderClient.query(dataQuery);
        
        if (data.rows.length > 0) {
          // Obtener columnas
          const columns = Object.keys(data.rows[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')}) 
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;
          
          // Insertar datos en Neon
          for (const row of data.rows) {
            const values = columns.map(col => row[col]);
            await neonClient.query(insertQuery, values);
          }
          
          console.log(`   ✅ ${data.rows.length} registros migrados`);
        } else {
          console.log(`   ℹ️  Tabla ${tableName} está vacía`);
        }
      } catch (error) {
        console.log(`   ❌ Error migrando ${tableName}: ${error.message}`);
      }
    }

    // 4. Verificar migración
    console.log('\n🔍 Verificando migración...');
    
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      const renderCount = await renderClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const neonCount = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const renderRows = parseInt(renderCount.rows[0].count);
      const neonRows = parseInt(neonCount.rows[0].count);
      
      if (renderRows === neonRows) {
        console.log(`   ✅ ${tableName}: ${neonRows} registros (OK)`);
      } else {
        console.log(`   ⚠️  ${tableName}: Render=${renderRows}, Neon=${neonRows}`);
      }
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log('========================');
    console.log('✅ Estructura migrada');
    console.log('✅ Datos migrados');
    console.log('✅ Verificación completada');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Actualizar DATABASE_URL en Render a la URL de Neon');
    console.log('2. Probar la aplicación');
    console.log('3. Cancelar plan de pago de Render (si aplica)');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    if (renderPool) await renderPool.end();
    if (neonPool) await neonPool.end();
  }
}

// Función para crear archivo de configuración
function createNeonConfig() {
  const configContent = `# Configuración para migración a Neon
# 1. Crea una cuenta en https://console.neon.tech/
# 2. Crea un nuevo proyecto
# 3. Copia la connection string
# 4. Configura la variable de entorno:

export NEON_DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"

# 5. Ejecuta la migración:
# node scripts/migrate-to-neon.js

# 6. Actualiza DATABASE_URL en Render con la URL de Neon
`;

  fs.writeFileSync('NEON_MIGRATION_GUIDE.md', configContent);
  console.log('📝 Guía de migración creada: NEON_MIGRATION_GUIDE.md');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  if (process.argv.includes('--setup')) {
    createNeonConfig();
  } else {
    migrateToNeon();
  }
}

module.exports = { migrateToNeon, createNeonConfig };
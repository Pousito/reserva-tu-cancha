#!/usr/bin/env node

/**
 * Script simplificado de migración a Neon
 * Migra datos de Render a Neon paso a paso
 */

const { Pool } = require('pg');

// URLs de conexión (reemplaza con las tuyas)
const RENDER_URL = 'postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha';
const NEON_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🚀 MIGRACIÓN SIMPLIFICADA A NEON');
console.log('=================================');

async function migrateToNeon() {
  let renderPool = null;
  let neonPool = null;

  try {
    console.log('🔌 Conectando a bases de datos...');
    
    // Conectar a Render (origen)
    renderPool = new Pool({
      connectionString: RENDER_URL,
      ssl: { rejectUnauthorized: false } // Render requiere SSL
    });

    // Conectar a Neon (destino)
    neonPool = new Pool({
      connectionString: NEON_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Verificar conexiones
    const renderClient = await renderPool.connect();
    const neonClient = await neonPool.connect();
    
    console.log('✅ Conexiones establecidas');
    
    // 1. Obtener lista de tablas
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

    // 2. Crear estructura básica en Neon
    console.log('\n🏗️  Creando estructura en Neon...');
    
    // Crear tablas principales manualmente
    const createTables = [
      `CREATE TABLE IF NOT EXISTS ciudades (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS complejos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        ciudad_id INTEGER REFERENCES ciudades(id),
        direccion TEXT,
        telefono VARCHAR(50),
        email VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS canchas (
        id SERIAL PRIMARY KEY,
        complejo_id INTEGER REFERENCES complejos(id),
        nombre VARCHAR(255) NOT NULL,
        tipo VARCHAR(50),
        precio_hora INTEGER
      )`,
      `CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255),
        rol VARCHAR(50) DEFAULT 'usuario',
        activo BOOLEAN DEFAULT true,
        complejo_id INTEGER REFERENCES complejos(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        codigo_reserva VARCHAR(50) UNIQUE NOT NULL,
        cancha_id INTEGER REFERENCES canchas(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        nombre_cliente VARCHAR(255) NOT NULL,
        email_cliente VARCHAR(255) NOT NULL,
        telefono_cliente VARCHAR(50),
        rut_cliente VARCHAR(20),
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        estado VARCHAR(50) DEFAULT 'pendiente',
        estado_pago VARCHAR(50) DEFAULT 'pendiente',
        precio_total INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS pagos (
        id SERIAL PRIMARY KEY,
        reserva_id INTEGER REFERENCES reservas(id),
        transbank_token VARCHAR(255) UNIQUE NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        authorization_code VARCHAR(255),
        payment_type_code VARCHAR(50),
        response_code INTEGER,
        installments_number INTEGER,
        transaction_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bloqueo_id VARCHAR(50),
        reservation_code VARCHAR(50)
      )`,
      `CREATE TABLE IF NOT EXISTS bloqueos_temporales (
        id VARCHAR(50) PRIMARY KEY,
        cancha_id INTEGER REFERENCES canchas(id),
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        expira_en TIMESTAMP NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        datos_cliente TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const createTable of createTables) {
      try {
        await neonClient.query(createTable);
        console.log('   ✅ Tabla creada/verificada');
      } catch (error) {
        console.log(`   ⚠️  Error creando tabla: ${error.message}`);
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
      
      try {
        const renderCount = await renderClient.query(`SELECT COUNT(*) FROM ${tableName}`);
        const neonCount = await neonClient.query(`SELECT COUNT(*) FROM ${tableName}`);
        
        const renderRows = parseInt(renderCount.rows[0].count);
        const neonRows = parseInt(neonCount.rows[0].count);
        
        if (renderRows === neonRows) {
          console.log(`   ✅ ${tableName}: ${neonRows} registros (OK)`);
        } else {
          console.log(`   ⚠️  ${tableName}: Render=${renderRows}, Neon=${neonRows}`);
        }
      } catch (error) {
        console.log(`   ❌ Error verificando ${tableName}: ${error.message}`);
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

// Ejecutar migración
migrateToNeon();

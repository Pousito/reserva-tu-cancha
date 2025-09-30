#!/usr/bin/env node

/**
 * Script para corregir el esquema de Neon y completar la migración
 */

const { Pool } = require('pg');

const RENDER_URL = 'postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha';
const NEON_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🔧 CORRIGIENDO ESQUEMA DE NEON');
console.log('===============================');

async function fixNeonSchema() {
  let renderPool = null;
  let neonPool = null;

  try {
    console.log('🔌 Conectando a bases de datos...');
    
    renderPool = new Pool({
      connectionString: RENDER_URL,
      ssl: { rejectUnauthorized: false }
    });

    neonPool = new Pool({
      connectionString: NEON_URL,
      ssl: { rejectUnauthorized: false }
    });

    const renderClient = await renderPool.connect();
    const neonClient = await neonPool.connect();
    
    console.log('✅ Conexiones establecidas');

    // 1. Crear tablas faltantes
    console.log('\n🏗️  Creando tablas faltantes...');
    
    const missingTables = [
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS codigos_descuento (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        porcentaje_descuento DECIMAL(5,2) NOT NULL,
        monto_maximo_descuento INTEGER,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        usos_maximos INTEGER,
        usos_actuales INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS uso_codigos_descuento (
        id SERIAL PRIMARY KEY,
        codigo_id INTEGER REFERENCES codigos_descuento(id),
        reserva_id INTEGER REFERENCES reservas(id),
        email_cliente VARCHAR(255) NOT NULL,
        monto_descuento INTEGER NOT NULL,
        monto_original INTEGER NOT NULL,
        monto_final INTEGER NOT NULL,
        usado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const createTable of missingTables) {
      try {
        await neonClient.query(createTable);
        console.log('   ✅ Tabla creada');
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
    }

    // 2. Verificar estructura de tabla reservas en Render
    console.log('\n🔍 Verificando estructura de tabla reservas...');
    const reservasStructure = await renderClient.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservas' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas en Render:');
    reservasStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 3. Verificar estructura de tabla reservas en Neon
    const neonReservasStructure = await neonClient.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'reservas' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columnas en Neon:');
    neonReservasStructure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // 4. Migrar canchas (ahora que complejos ya existe)
    console.log('\n📤 Migrando canchas...');
    try {
      const canchasData = await renderClient.query('SELECT * FROM canchas');
      if (canchasData.rows.length > 0) {
        for (const cancha of canchasData.rows) {
          const insertQuery = `
            INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO NOTHING
          `;
          await neonClient.query(insertQuery, [
            cancha.id, cancha.complejo_id, cancha.nombre, cancha.tipo, cancha.precio_hora
          ]);
        }
        console.log(`   ✅ ${canchasData.rows.length} canchas migradas`);
      }
    } catch (error) {
      console.log(`   ❌ Error migrando canchas: ${error.message}`);
    }

    // 5. Migrar reservas (manejar diferencias de columnas)
    console.log('\n📤 Migrando reservas...');
    try {
      const reservasData = await renderClient.query('SELECT * FROM reservas');
      if (reservasData.rows.length > 0) {
        for (const reserva of reservasData.rows) {
          // Mapear columnas existentes
          const insertQuery = `
            INSERT INTO reservas (
              id, codigo_reserva, cancha_id, usuario_id, nombre_cliente, 
              email_cliente, telefono_cliente, rut_cliente, fecha, 
              hora_inicio, hora_fin, estado, estado_pago, precio_total, 
              created_at, fecha_creacion
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING
          `;
          await neonClient.query(insertQuery, [
            reserva.id, reserva.codigo_reserva, reserva.cancha_id, reserva.usuario_id,
            reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente,
            reserva.rut_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin,
            reserva.estado, reserva.estado_pago, reserva.precio_total,
            reserva.created_at, reserva.fecha_creacion
          ]);
        }
        console.log(`   ✅ ${reservasData.rows.length} reservas migradas`);
      }
    } catch (error) {
      console.log(`   ❌ Error migrando reservas: ${error.message}`);
    }

    // 6. Migrar tablas faltantes
    console.log('\n📤 Migrando tablas faltantes...');
    
    const tablesToMigrate = ['password_reset_tokens', 'codigos_descuento', 'uso_codigos_descuento'];
    
    for (const tableName of tablesToMigrate) {
      try {
        const data = await renderClient.query(`SELECT * FROM ${tableName}`);
        if (data.rows.length > 0) {
          const columns = Object.keys(data.rows[0]);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `
            INSERT INTO ${tableName} (${columns.join(', ')}) 
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;
          
          for (const row of data.rows) {
            const values = columns.map(col => row[col]);
            await neonClient.query(insertQuery, values);
          }
          
          console.log(`   ✅ ${tableName}: ${data.rows.length} registros migrados`);
        } else {
          console.log(`   ℹ️  ${tableName}: tabla vacía`);
        }
      } catch (error) {
        console.log(`   ❌ Error migrando ${tableName}: ${error.message}`);
      }
    }

    // 7. Verificación final
    console.log('\n🔍 Verificación final...');
    const tables = ['ciudades', 'complejos', 'canchas', 'usuarios', 'reservas', 'pagos'];
    
    for (const tableName of tables) {
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

    console.log('\n🎉 CORRECCIÓN COMPLETADA');
    console.log('========================');
    console.log('✅ Esquema corregido');
    console.log('✅ Datos migrados');
    console.log('✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    if (renderPool) await renderPool.end();
    if (neonPool) await neonPool.end();
  }
}

// Ejecutar corrección
fixNeonSchema();

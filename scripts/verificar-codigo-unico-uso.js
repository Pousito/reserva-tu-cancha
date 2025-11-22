#!/usr/bin/env node

/**
 * Script para verificar el estado del código único uso BASTIANCABRERA5MIL
 * y diagnosticar problemas con la tabla codigos_unico_uso
 */

process.env.NODE_ENV = 'production';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const DatabaseManager = require('../src/config/database-unified');

async function verificarCodigo() {
  let db = null;
  
  try {
    console.log('🔌 Conectando a base de datos...');
    db = new DatabaseManager();
    await db.connect();
    console.log('✅ Conectado\n');

    // Verificar que la tabla existe
    console.log('🔍 Verificando existencia de tabla codigos_unico_uso...');
    try {
      const tablaExiste = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'codigos_unico_uso'
        )
      `);
      
      if (tablaExiste[0].exists) {
        console.log('✅ Tabla codigos_unico_uso existe\n');
      } else {
        console.log('❌ Tabla codigos_unico_uso NO existe\n');
        console.log('⚠️ La tabla debería crearse automáticamente al inicializar la base de datos.');
        return;
      }
    } catch (error) {
      console.error('❌ Error verificando tabla:', error.message);
      return;
    }

    // Buscar el código
    const codigo = 'BASTIANCABRERA5MIL';
    console.log(`🔍 Buscando código: ${codigo}...`);
    
    try {
      const codigoData = await db.get(`
        SELECT * FROM codigos_unico_uso 
        WHERE codigo = $1
      `, [codigo]);
      
      if (codigoData) {
        console.log('✅ Código encontrado:');
        console.log(`   - ID: ${codigoData.id}`);
        console.log(`   - Código: ${codigoData.codigo}`);
        console.log(`   - Email: ${codigoData.email_cliente}`);
        console.log(`   - Descuento: $${codigoData.monto_descuento.toLocaleString()}`);
        console.log(`   - Usado: ${codigoData.usado ? 'Sí' : 'No'}`);
        console.log(`   - Usado en: ${codigoData.usado_en || 'N/A'}`);
        console.log(`   - Creado en: ${codigoData.creado_en || 'N/A'}`);
        console.log(`   - Expira en: ${codigoData.expira_en || 'N/A'}`);
      } else {
        console.log('❌ Código NO encontrado');
        console.log('\n📋 Verificando todos los códigos en la tabla...');
        const todosLosCodigos = await db.query(`
          SELECT codigo, email_cliente, usado, creado_en 
          FROM codigos_unico_uso 
          ORDER BY creado_en DESC 
          LIMIT 10
        `);
        
        if (todosLosCodigos.length === 0) {
          console.log('⚠️ No hay códigos en la tabla');
        } else {
          console.log(`✅ Encontrados ${todosLosCodigos.length} códigos:`);
          todosLosCodigos.forEach(c => {
            console.log(`   - ${c.codigo} (${c.email_cliente}) - Usado: ${c.usado ? 'Sí' : 'No'}`);
          });
        }
      }
    } catch (error) {
      console.error('❌ Error buscando código:', error.message);
      console.error('Stack:', error.stack);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

verificarCodigo()
  .then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });


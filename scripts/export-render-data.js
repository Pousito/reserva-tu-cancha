#!/usr/bin/env node

/**
 * Script para exportar todos los datos de Render PostgreSQL
 * Crea un backup completo antes de migrar a Neon
 */

// Configurar variables de entorno de producción
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: './env.postgresql' });
}

const DatabaseManager = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function exportRenderData() {
  const db = new DatabaseManager();
  
  try {
    console.log('📤 EXPORTANDO DATOS DE RENDER POSTGRESQL');
    console.log('========================================');
    
    await db.connect();
    
    // Crear directorio de backup si no existe
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `render_export_${timestamp}.json`);
    
    console.log(`📁 Archivo de backup: ${backupFile}`);
    
    // Exportar todas las tablas
    const exportData = {
      timestamp: new Date().toISOString(),
      source: 'Render PostgreSQL',
      tables: {}
    };
    
    // 1. Exportar ciudades
    console.log('\n🏢 Exportando ciudades...');
    const ciudades = await db.query('SELECT * FROM ciudades ORDER BY id');
    exportData.tables.ciudades = ciudades;
    console.log(`   ✅ ${ciudades.length} ciudades exportadas`);
    
    // 2. Exportar complejos
    console.log('\n🏟️ Exportando complejos...');
    const complejos = await db.query('SELECT * FROM complejos ORDER BY id');
    exportData.tables.complejos = complejos;
    console.log(`   ✅ ${complejos.length} complejos exportados`);
    
    // 3. Exportar canchas
    console.log('\n⚽ Exportando canchas...');
    const canchas = await db.query('SELECT * FROM canchas ORDER BY id');
    exportData.tables.canchas = canchas;
    console.log(`   ✅ ${canchas.length} canchas exportadas`);
    
    // 4. Exportar usuarios
    console.log('\n👥 Exportando usuarios...');
    const usuarios = await db.query('SELECT * FROM usuarios ORDER BY id');
    exportData.tables.usuarios = usuarios;
    console.log(`   ✅ ${usuarios.length} usuarios exportados`);
    
    // 5. Exportar reservas
    console.log('\n📅 Exportando reservas...');
    const reservas = await db.query('SELECT * FROM reservas ORDER BY id');
    exportData.tables.reservas = reservas;
    console.log(`   ✅ ${reservas.length} reservas exportadas`);
    
    // 6. Exportar pagos
    console.log('\n💳 Exportando pagos...');
    const pagos = await db.query('SELECT * FROM pagos ORDER BY id');
    exportData.tables.pagos = pagos;
    console.log(`   ✅ ${pagos.length} pagos exportados`);
    
    // 7. Exportar bloqueos temporales
    console.log('\n🔒 Exportando bloqueos temporales...');
    const bloqueos = await db.query('SELECT * FROM bloqueos_temporales ORDER BY id');
    exportData.tables.bloqueos_temporales = bloqueos;
    console.log(`   ✅ ${bloqueos.length} bloqueos exportados`);
    
    // 8. Exportar códigos de descuento
    console.log('\n🎫 Exportando códigos de descuento...');
    const codigosDescuento = await db.query('SELECT * FROM codigos_descuento ORDER BY id');
    exportData.tables.codigos_descuento = codigosDescuento;
    console.log(`   ✅ ${codigosDescuento.length} códigos exportados`);
    
    // 9. Exportar uso de códigos de descuento
    console.log('\n📊 Exportando uso de códigos...');
    const usoCodigos = await db.query('SELECT * FROM uso_codigos_descuento ORDER BY id');
    exportData.tables.uso_codigos_descuento = usoCodigos;
    console.log(`   ✅ ${usoCodigos.length} usos exportados`);
    
    // 10. Exportar tokens de restablecimiento
    console.log('\n🔑 Exportando tokens de restablecimiento...');
    const tokensReset = await db.query('SELECT * FROM password_reset_tokens ORDER BY id');
    exportData.tables.password_reset_tokens = tokensReset;
    console.log(`   ✅ ${tokensReset.length} tokens exportados`);
    
    // Escribir archivo de backup
    console.log('\n💾 Guardando backup...');
    fs.writeFileSync(backupFile, JSON.stringify(exportData, null, 2));
    
    // Crear resumen
    const summary = {
      timestamp: new Date().toISOString(),
      totalRecords: Object.values(exportData.tables).reduce((sum, table) => sum + table.length, 0),
      tables: Object.entries(exportData.tables).map(([name, data]) => ({
        table: name,
        records: data.length
      })),
      backupFile: backupFile
    };
    
    console.log('\n📊 RESUMEN DE EXPORTACIÓN:');
    console.log('==========================');
    console.log(`📁 Archivo: ${path.basename(backupFile)}`);
    console.log(`📊 Total de registros: ${summary.totalRecords}`);
    console.log('\n📋 Por tabla:');
    summary.tables.forEach(table => {
      console.log(`   ${table.table}: ${table.records} registros`);
    });
    
    // Guardar resumen
    const summaryFile = path.join(backupDir, `export_summary_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log(`\n✅ Exportación completada exitosamente`);
    console.log(`📁 Backup: ${backupFile}`);
    console.log(`📋 Resumen: ${summaryFile}`);
    
    console.log('\n🎯 PRÓXIMOS PASOS:');
    console.log('1. Crear cuenta en Neon: https://neon.tech');
    console.log('2. Crear proyecto en Neon');
    console.log('3. Ejecutar: node scripts/import-to-neon.js');
    console.log('4. Actualizar render.yaml con nueva DATABASE_URL');
    
  } catch (error) {
    console.error('❌ Error durante la exportación:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  exportRenderData().catch(console.error);
}

module.exports = { exportRenderData };

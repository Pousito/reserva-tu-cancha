/**
 * Script para limpiar dependencias de SQLite y migrar completamente a PostgreSQL
 * Ejecutar después de verificar que PostgreSQL esté funcionando correctamente
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 LIMPIEZA DE DEPENDENCIAS SQLITE');
console.log('==================================');

// Archivos que deben ser eliminados (contienen solo SQLite)
const filesToDelete = [
  'database.sqlite',
  'database.db',
  'data/database.sqlite',
  'data/database.db',
  'env.local', // Archivo de configuración SQLite
  'scripts/database/backup-system-sqlite-old.js'
];

// Archivos que deben ser actualizados (contienen referencias mixtas)
const filesToUpdate = [
  'scripts/database/backup-system.js',
  'scripts/cleanup/clean-all-reservations.js',
  'scripts/migration/sync-dev-to-prod.js',
  'scripts/maintenance/auto-backup.js',
  'scripts/maintenance/clean-duplicates.js',
  'scripts/maintenance/check-duplicates.js',
  'scripts/clean-database.js',
  'scripts/persistence/export-reservations.js',
  'scripts/persistence/import-reservations.js',
  'scripts/migration/migrate-to-persistent-disk.js',
  'scripts/persistence/auto-restore.js',
  'scripts/maintenance/fix_database.js',
  'scripts/maintenance/emergency_fix.js',
  'scripts/maintenance/debug_complejos.js',
  'scripts/database/populate_reservas.js',
  'scripts/database/check_render_status.js',
  'scripts/database/check_render_db.js'
];

async function cleanupSqliteDependencies() {
  try {
    console.log('📋 Archivos a eliminar:');
    filesToDelete.forEach(file => {
      const fullPath = path.join(__dirname, '../../..', file);
      if (fs.existsSync(fullPath)) {
        console.log(`  ❌ ${file}`);
      } else {
        console.log(`  ✅ ${file} (ya no existe)`);
      }
    });

    console.log('\n📋 Archivos a actualizar:');
    filesToUpdate.forEach(file => {
      const fullPath = path.join(__dirname, '../../..', file);
      if (fs.existsSync(fullPath)) {
        console.log(`  🔧 ${file}`);
      } else {
        console.log(`  ✅ ${file} (ya no existe)`);
      }
    });

    console.log('\n⚠️  IMPORTANTE:');
    console.log('1. Asegúrate de que PostgreSQL esté funcionando correctamente');
    console.log('2. Haz backup de datos importantes antes de ejecutar');
    console.log('3. Este script solo muestra los archivos, no los modifica automáticamente');
    console.log('4. Revisa manualmente cada archivo antes de eliminar/actualizar');

    console.log('\n✅ Análisis completado. Revisa los archivos listados arriba.');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanupSqliteDependencies();
}

module.exports = { cleanupSqliteDependencies };

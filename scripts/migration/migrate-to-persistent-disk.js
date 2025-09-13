const fs = require('fs');
const path = require('path');

/**
 * Script de migración para mover datos al disco persistente
 * Este script se ejecuta antes de inicializar la aplicación
 */
function migrateToPersistentDisk() {
  console.log('🔄 INICIANDO MIGRACIÓN AL DISCO PERSISTENTE');
  console.log('==========================================');
  
  const sourceDir = '/opt/render/project/src';
  const targetDir = '/opt/render/project/data';
  
  console.log(`📁 Directorio fuente: ${sourceDir}`);
  console.log(`📁 Directorio destino: ${targetDir}`);
  
  try {
    // 1. Crear directorio de destino si no existe
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`✅ Directorio creado: ${targetDir}`);
    } else {
      console.log(`✅ Directorio ya existe: ${targetDir}`);
    }
    
    // 2. PostgreSQL no requiere migración de archivos (usa conexión remota)
    console.log(`📊 PostgreSQL configurado - no se requiere migración de archivos`);
    
    // 3. Migrar respaldos si existen
    const sourceBackups = path.join(sourceDir, 'backups');
    const targetBackups = path.join(targetDir, 'backups');
    
    if (fs.existsSync(sourceBackups)) {
      console.log(`💾 Migrando respaldos...`);
      if (!fs.existsSync(targetBackups)) {
        fs.mkdirSync(targetBackups, { recursive: true });
      }
      
      const backupFiles = fs.readdirSync(sourceBackups);
      let migratedCount = 0;
      
      console.log(`🔍 Archivos encontrados en directorio fuente: ${backupFiles.length}`);
      backupFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
      
      backupFiles.forEach(file => {
        // Migrar TODOS los archivos de respaldo (tanto .sql como .hash)
        if (file.includes('database_backup_')) {
          const sourceFile = path.join(sourceBackups, file);
          const targetFile = path.join(targetBackups, file);
          
          // Verificar que el archivo fuente existe
          if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, targetFile);
            console.log(`✅ Respaldo migrado: ${file}`);
            migratedCount++;
          } else {
            console.log(`⚠️  Archivo no encontrado: ${file}`);
          }
        }
      });
      
      console.log(`📊 Total de respaldos migrados: ${migratedCount}`);
    } else {
      console.log(`ℹ️  No hay respaldos existentes para migrar`);
    }
    
    // 4. Crear directorio de respaldos si no existe
    if (!fs.existsSync(targetBackups)) {
      fs.mkdirSync(targetBackups, { recursive: true });
      console.log(`✅ Directorio de respaldos creado: ${targetBackups}`);
    }
    
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('==================================');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.log('🔄 Continuando con inicialización normal...');
  }
}

module.exports = { migrateToPersistentDisk };

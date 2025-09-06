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
    
    // 2. Migrar base de datos si existe en el directorio fuente
    const sourceDb = path.join(sourceDir, 'database.sqlite');
    const targetDb = path.join(targetDir, 'database.sqlite');
    
    if (fs.existsSync(sourceDb)) {
      console.log(`📊 Migrando base de datos...`);
      fs.copyFileSync(sourceDb, targetDb);
      console.log(`✅ Base de datos migrada: ${sourceDb} → ${targetDb}`);
      
      // Verificar tamaño
      const stats = fs.statSync(targetDb);
      console.log(`📊 Tamaño de BD migrada: ${stats.size} bytes`);
    } else {
      console.log(`ℹ️  No hay base de datos existente para migrar`);
    }
    
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
      
      backupFiles.forEach(file => {
        // Migrar TODOS los archivos de respaldo (tanto .sqlite como .hash)
        if (file.includes('database_backup_')) {
          const sourceFile = path.join(sourceBackups, file);
          const targetFile = path.join(targetBackups, file);
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`✅ Respaldo migrado: ${file}`);
          migratedCount++;
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

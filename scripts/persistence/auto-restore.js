const fs = require('fs');
const path = require('path');
const { BackupSystem } = require('../database/backup-system');

/**
 * Sistema de restauración automática para plan gratuito de Render
 * Este script intenta restaurar datos desde respaldos existentes
 */
async function autoRestoreFromBackups() {
  console.log('🔄 INICIANDO RESTAURACIÓN AUTOMÁTICA');
  console.log('===================================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/data/database.sqlite';
  const backupDir = '/opt/render/project/data/backups';
  
  try {
    // Verificar si hay respaldos disponibles
    if (!fs.existsSync(backupDir)) {
      console.log('❌ No hay directorio de respaldos');
      return false;
    }
    
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sqlite') && !file.endsWith('.hash'))
      .sort()
      .reverse(); // Más recientes primero
    
    if (backupFiles.length === 0) {
      console.log('❌ No hay respaldos disponibles');
      return false;
    }
    
    console.log(`📊 Respaldos encontrados: ${backupFiles.length}`);
    console.log(`📋 Último respaldo: ${backupFiles[0]}`);
    
    // Restaurar desde el último respaldo
    const latestBackup = path.join(backupDir, backupFiles[0]);
    const backupStats = fs.statSync(latestBackup);
    
    console.log(`📊 Tamaño del respaldo: ${backupStats.size} bytes`);
    console.log(`📅 Fecha del respaldo: ${backupStats.mtime}`);
    
    // Copiar el respaldo a la ubicación de la BD
    fs.copyFileSync(latestBackup, dbPath);
    
    console.log(`✅ Respaldo restaurado: ${latestBackup} → ${dbPath}`);
    
    // Verificar que la BD restaurada tiene datos
    const restoredStats = fs.statSync(dbPath);
    console.log(`📊 Tamaño de BD restaurada: ${restoredStats.size} bytes`);
    
    if (restoredStats.size > 0) {
      console.log('✅ RESTAURACIÓN EXITOSA');
      return true;
    } else {
      console.log('❌ BD restaurada está vacía');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    return false;
  }
}

module.exports = { autoRestoreFromBackups };

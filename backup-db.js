const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Función para crear respaldo de la base de datos
function createDatabaseBackup() {
  console.log('💾 CREANDO RESPALDO DE BASE DE DATOS');
  console.log('====================================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/src/database.sqlite';
  const backupPath = process.env.DB_PATH || '/opt/render/project/src/database_backup.sqlite';
  
  console.log(`📁 BD original: ${dbPath}`);
  console.log(`💾 BD respaldo: ${backupPath}`);
  
  try {
    // Verificar si existe la BD original
    if (fs.existsSync(dbPath)) {
      // Crear respaldo
      fs.copyFileSync(dbPath, backupPath);
      const stats = fs.statSync(backupPath);
      console.log(`✅ Respaldo creado: ${stats.size} bytes`);
      return true;
    } else {
      console.log('⚠️  BD original no existe, no se puede crear respaldo');
      return false;
    }
  } catch (error) {
    console.error('❌ Error creando respaldo:', error.message);
    return false;
  }
}

// Función para restaurar desde respaldo
function restoreFromBackup() {
  console.log('🔄 RESTAURANDO DESDE RESPALDO');
  console.log('=============================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/src/database.sqlite';
  const backupPath = process.env.DB_PATH || '/opt/render/project/src/database_backup.sqlite';
  
  try {
    // Verificar si existe el respaldo
    if (fs.existsSync(backupPath)) {
      // Restaurar desde respaldo
      fs.copyFileSync(backupPath, dbPath);
      const stats = fs.statSync(dbPath);
      console.log(`✅ BD restaurada desde respaldo: ${stats.size} bytes`);
      return true;
    } else {
      console.log('⚠️  No existe respaldo para restaurar');
      return false;
    }
  } catch (error) {
    console.error('❌ Error restaurando desde respaldo:', error.message);
    return false;
  }
}

// Función para verificar si hay datos en la BD
function checkDatabaseHasData() {
  return new Promise((resolve) => {
    const dbPath = process.env.DB_PATH || '/opt/render/project/src/database.sqlite';
    
    if (!fs.existsSync(dbPath)) {
      console.log('❌ BD no existe');
      resolve(false);
      return;
    }
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.log('❌ Error conectando a BD:', err.message);
        resolve(false);
        return;
      }
      
      // Verificar si hay reservas
      db.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
        if (err) {
          console.log('❌ Error verificando reservas:', err.message);
          resolve(false);
        } else {
          const hasData = row.count > 0;
          console.log(`📊 Reservas en BD: ${row.count}`);
          resolve(hasData);
        }
        db.close();
      });
    });
  });
}

module.exports = {
  createDatabaseBackup,
  restoreFromBackup,
  checkDatabaseHasData
};

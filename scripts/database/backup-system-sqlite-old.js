const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupSystem {
  constructor(dbPath = process.env.DB_PATH || './database.sqlite', backupDir = './backups', maxBackups = 10) {
    this.dbPath = dbPath;
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
    this.db = null;
    this.ensureBackupDirExists();
  }

  ensureBackupDirExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Directorio de respaldos creado: ${this.backupDir}`);
    }
  }

  async connectDb() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve(this.db);
      });
    });
  }

  async checkDatabaseIntegrity() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not connected for integrity check.'));
      }
      this.db.get("PRAGMA integrity_check", (err, row) => {
        if (err) reject(err);
        else resolve(row.integrity_check === 'ok');
      });
    });
  }

  async checkDatabaseHasData() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not connected for data check.'));
      }
      this.db.get("SELECT COUNT(*) as count FROM reservas", (err, row) => {
        if (err) {
          // If table doesn't exist, it's considered empty
          if (err.message.includes('no such table')) {
            return resolve(false);
          }
          return reject(err);
        }
        resolve(row.count > 0);
      });
    });
  }

  generateHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  async createBackup() {
    console.log('💾 CREANDO RESPALDO');
    console.log('==================');

    this.ensureBackupDirExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `database_backup_${timestamp}.sqlite`;
    const backupFilePath = path.join(this.backupDir, backupFileName);
    const hashFilePath = backupFilePath + '.hash';

    try {
      if (!fs.existsSync(this.dbPath)) {
        console.log('⚠️  BD original no existe, no se puede crear respaldo');
        return { success: false, message: 'BD original no existe' };
      }

      fs.copyFileSync(this.dbPath, backupFilePath);
      const stats = fs.statSync(backupFilePath);
      const hash = this.generateHash(backupFilePath);
      fs.writeFileSync(hashFilePath, hash);

      console.log(`✅ Respaldo creado: ${backupFilePath}`);
      console.log(`📊 Tamaño: ${stats.size} bytes`);
      console.log(`🔐 Hash: ${hash}`);

      this.cleanOldBackups();

      return {
        success: true,
        path: backupFilePath,
        size: stats.size,
        hash: hash,
        timestamp: timestamp
      };
    } catch (error) {
      console.error('❌ Error creando respaldo:', error.message);
      return { success: false, error: error.message };
    }
  }

  listBackups() {
    this.ensureBackupDirExists();
    const files = fs.readdirSync(this.backupDir);
    const backups = files
      .filter(file => file.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const hashFilePath = filePath + '.hash';
        let valid = false;
        let hash = null;
        try {
          const stats = fs.statSync(filePath);
          if (fs.existsSync(hashFilePath)) {
            const storedHash = fs.readFileSync(hashFilePath, 'utf8');
            const currentHash = this.generateHash(filePath);
            valid = (storedHash === currentHash);
            hash = storedHash;
          }
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.mtime,
            valid: valid,
            hash: hash
          };
        } catch (error) {
          return { name: file, path: filePath, error: error.message, valid: false };
        }
      })
      .sort((a, b) => b.created - a.created); // Más recientes primero
    return backups;
  }

  cleanOldBackups() {
    const backups = this.listBackups();
    if (backups.length > this.maxBackups) {
      const backupsToDelete = backups.slice(this.maxBackups);
      backupsToDelete.forEach(backup => {
        try {
          fs.unlinkSync(backup.path);
          fs.unlinkSync(backup.path + '.hash');
          console.log(`🗑️  Respaldo antiguo eliminado: ${backup.name}`);
        } catch (error) {
          console.error(`❌ Error eliminando respaldo ${backup.name}:`, error.message);
        }
      });
      console.log(`📊 Respaldos mantenidos: ${this.maxBackups}`);
    } else {
      console.log(`📊 Respaldos mantenidos: ${backups.length}`);
    }
  }

  async restoreFromLatestBackup() {
    console.log('🔄 RESTAURANDO DESDE EL ÚLTIMO RESPALDO');
    console.log('======================================');

    const backups = this.listBackups();
    if (backups.length === 0) {
      console.log('⚠️  No hay respaldos disponibles para restaurar.');
      return false;
    }

    const latestValidBackup = backups.find(b => b.valid);

    if (!latestValidBackup) {
      console.log('❌ No se encontró ningún respaldo válido para restaurar.');
      return false;
    }

    try {
      // Cerrar la conexión actual a la BD antes de restaurar
      if (this.db) {
        await new Promise((resolve, reject) => this.db.close(err => err ? reject(err) : resolve()));
        this.db = null;
      }

      fs.copyFileSync(latestValidBackup.path, this.dbPath);
      console.log(`✅ BD restaurada desde: ${latestValidBackup.name}`);
      
      // Volver a conectar la BD
      await this.connectDb();
      const hasData = await this.checkDatabaseHasData();
      console.log(`✅ BD restaurada y verificada. Contiene datos: ${hasData}`);
      return true;
    } catch (error) {
      console.error('❌ Error restaurando BD:', error.message);
      return false;
    }
  }
}

// Función para inicializar el sistema de respaldo
async function initializeBackupSystem() {
  const backupSystem = new BackupSystem();
  await backupSystem.connectDb();

  console.log('🔍 VERIFICANDO ESTADO DE LA BD');
  console.log('==============================');
  const hasData = await backupSystem.checkDatabaseHasData();
  const integrityOk = await backupSystem.checkDatabaseIntegrity();

  if (!integrityOk) {
    console.error('❌ Integridad de la base de datos COMPROMETIDA. Intentando restaurar...');
    const restored = await backupSystem.restoreFromLatestBackup();
    if (restored) {
      console.log('✅ BD restaurada exitosamente.');
    } else {
      console.error('❌ Fallo al restaurar la BD. Se recomienda intervención manual.');
    }
  } else if (!hasData) {
    console.log('⚠️  BD vacía o sin reservas. Creando respaldo inicial...');
    await backupSystem.createBackup();
  } else {
    console.log(`✅ BD OK - ${hasData ? 'con reservas' : 'sin reservas'} encontradas`);
    // NO crear respaldo automático al inicio para preservar respaldos existentes
    console.log('💾 Preservando respaldos existentes - no creando respaldo automático');
  }

  // Programar respaldos automáticos cada 6 horas (en producción)
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      console.log('⏰ Respaldo automático programado...');
      await backupSystem.createBackup();
    }, 6 * 60 * 60 * 1000); // Cada 6 horas
    console.log('⏰ Respaldos automáticos programados cada 6 horas.');
  }

  return backupSystem;
}

module.exports = { BackupSystem, initializeBackupSystem };

// Si se ejecuta directamente
if (require.main === module) {
  initializeBackupSystem().catch(console.error);
}
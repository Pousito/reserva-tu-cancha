#!/usr/bin/env node

/**
 * Sistema de Respaldos Automatizados
 * Respalda la base de datos de producción de forma automática y segura
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class BackupAutomation {
  constructor() {
    this.dbConfig = {
      host: process.env.DB_HOST || 'dpg-d2r4j356ubrc73e77i20-a.oregon-postgres.render.com',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'reserva_tu_cancha',
      user: process.env.DB_USER || 'reserva_tu_cancha_user',
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };
    
    this.backupDir = path.join(__dirname, '../../backups');
    this.maxBackups = 30; // Mantener 30 respaldos
    this.compressionEnabled = true;
    this.encryptionEnabled = true;
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Conectar a la base de datos
   */
  async connect() {
    try {
      this.pool = new Pool(this.dbConfig);
      const client = await this.pool.connect();
      console.log('✅ Conectado a la base de datos');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Error conectando a la base de datos:', error.message);
      return false;
    }
  }

  /**
   * Crear respaldo completo de la base de datos
   */
  async createFullBackup() {
    try {
      console.log('🔄 Iniciando respaldo completo...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-full-${timestamp}`;
      const backupPath = path.join(this.backupDir, `${backupName}.sql`);
      
      // Crear directorio si no existe
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // Comando pg_dump
      const dumpCommand = `pg_dump -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} --no-password --verbose --clean --if-exists --create`;
      
      console.log('📦 Ejecutando pg_dump...');
      const { stdout, stderr } = await execAsync(dumpCommand, {
        env: { ...process.env, PGPASSWORD: this.dbConfig.password }
      });

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️ Advertencias en pg_dump:', stderr);
      }

      // Escribir respaldo
      fs.writeFileSync(backupPath, stdout);
      console.log(`✅ Respaldo creado: ${backupPath}`);

      // Comprimir si está habilitado
      let finalPath = backupPath;
      if (this.compressionEnabled) {
        finalPath = await this.compressBackup(backupPath);
      }

      // Encriptar si está habilitado
      if (this.encryptionEnabled) {
        finalPath = await this.encryptBackup(finalPath);
      }

      // Crear metadatos del respaldo
      const metadata = {
        name: backupName,
        type: 'full',
        created: new Date().toISOString(),
        size: fs.statSync(finalPath).size,
        compressed: this.compressionEnabled,
        encrypted: this.encryptionEnabled,
        checksum: await this.calculateChecksum(finalPath),
        database: this.dbConfig.database,
        host: this.dbConfig.host
      };

      const metadataPath = finalPath.replace(/\.(sql|gz|enc)$/, '.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`📊 Respaldo completado: ${finalPath}`);
      console.log(`📏 Tamaño: ${this.formatBytes(metadata.size)}`);
      console.log(`🔐 Checksum: ${metadata.checksum}`);

      return {
        success: true,
        path: finalPath,
        metadata: metadata
      };

    } catch (error) {
      console.error('❌ Error creando respaldo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear respaldo incremental (solo datos modificados)
   */
  async createIncrementalBackup(lastBackupDate) {
    try {
      console.log('🔄 Iniciando respaldo incremental...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-incremental-${timestamp}`;
      const backupPath = path.join(this.backupDir, `${backupName}.sql`);
      
      // Crear directorio si no existe
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // Obtener datos modificados desde la última fecha
      const client = await this.pool.connect();
      
      const tables = [
        'reservas', 'canchas', 'complejos', 'usuarios', 
        'ciudades', 'promociones', 'pagos', 'reportes'
      ];

      let incrementalData = '';
      
      for (const table of tables) {
        try {
          const query = `
            SELECT * FROM ${table} 
            WHERE updated_at > $1 OR created_at > $1
            ORDER BY updated_at DESC, created_at DESC
          `;
          
          const result = await client.query(query, [lastBackupDate]);
          
          if (result.rows.length > 0) {
            incrementalData += `-- Datos incrementales para tabla ${table}\n`;
            incrementalData += `-- Fecha: ${new Date().toISOString()}\n`;
            incrementalData += `-- Registros: ${result.rows.length}\n\n`;
            
            // Generar INSERT statements
            for (const row of result.rows) {
              const columns = Object.keys(row).join(', ');
              const values = Object.values(row).map(v => 
                v === null ? 'NULL' : `'${v.toString().replace(/'/g, "''")}'`
              ).join(', ');
              
              incrementalData += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
            }
            incrementalData += '\n';
          }
        } catch (tableError) {
          console.warn(`⚠️ No se pudo respaldar tabla ${table}:`, tableError.message);
        }
      }
      
      client.release();

      if (incrementalData.trim()) {
        fs.writeFileSync(backupPath, incrementalData);
        console.log(`✅ Respaldo incremental creado: ${backupPath}`);
        
        // Comprimir y encriptar si está habilitado
        let finalPath = backupPath;
        if (this.compressionEnabled) {
          finalPath = await this.compressBackup(backupPath);
        }
        if (this.encryptionEnabled) {
          finalPath = await this.encryptBackup(finalPath);
        }

        return {
          success: true,
          path: finalPath,
          records: incrementalData.split('INSERT INTO').length - 1
        };
      } else {
        console.log('ℹ️ No hay datos nuevos para respaldar');
        return {
          success: true,
          path: null,
          records: 0
        };
      }

    } catch (error) {
      console.error('❌ Error creando respaldo incremental:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Comprimir respaldo
   */
  async compressBackup(filePath) {
    try {
      const compressedPath = filePath + '.gz';
      await execAsync(`gzip -c "${filePath}" > "${compressedPath}"`);
      fs.unlinkSync(filePath); // Eliminar archivo original
      console.log(`🗜️ Respaldo comprimido: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      console.error('❌ Error comprimiendo respaldo:', error);
      return filePath;
    }
  }

  /**
   * Encriptar respaldo
   */
  async encryptBackup(filePath) {
    try {
      const encryptedPath = filePath + '.enc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher('aes-256-cbc', key);
      cipher.setAutoPadding(true);
      
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(encryptedPath);
      
      // Escribir IV al inicio del archivo
      output.write(iv);
      
      input.pipe(cipher).pipe(output);
      
      return new Promise((resolve, reject) => {
        output.on('finish', () => {
          fs.unlinkSync(filePath); // Eliminar archivo sin encriptar
          console.log(`🔐 Respaldo encriptado: ${encryptedPath}`);
          resolve(encryptedPath);
        });
        output.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error encriptando respaldo:', error);
      return filePath;
    }
  }

  /**
   * Calcular checksum del archivo
   */
  async calculateChecksum(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Limpiar respaldos antiguos
   */
  async cleanupOldBackups() {
    try {
      console.log('🧹 Limpiando respaldos antiguos...');
      
      if (!fs.existsSync(this.backupDir)) {
        return;
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.gz') || file.endsWith('.enc'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            created: stats.birthtime,
            size: stats.size
          };
        })
        .sort((a, b) => b.created - a.created);

      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          // Eliminar archivo principal
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`🗑️ Eliminado: ${file.name}`);
          }
          
          // Eliminar metadatos si existen
          const metadataPath = file.path.replace(/\.(sql|gz|enc)$/, '.json');
          if (fs.existsSync(metadataPath)) {
            fs.unlinkSync(metadataPath);
          }
        }
        
        console.log(`✅ ${filesToDelete.length} respaldos antiguos eliminados`);
      }

    } catch (error) {
      console.error('❌ Error limpiando respaldos:', error);
    }
  }

  /**
   * Listar respaldos disponibles
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            name: metadata.name,
            type: metadata.type,
            created: metadata.created,
            size: metadata.size,
            compressed: metadata.compressed,
            encrypted: metadata.encrypted,
            checksum: metadata.checksum
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));

      return files;
    } catch (error) {
      console.error('❌ Error listando respaldos:', error);
      return [];
    }
  }

  /**
   * Restaurar desde respaldo
   */
  async restoreFromBackup(backupName) {
    try {
      console.log(`🔄 Restaurando desde respaldo: ${backupName}`);
      
      const backupPath = path.join(this.backupDir, `${backupName}.sql`);
      const compressedPath = backupPath + '.gz';
      const encryptedPath = backupPath + '.enc';
      
      let finalPath = backupPath;
      
      // Determinar qué archivo usar
      if (fs.existsSync(encryptedPath)) {
        finalPath = await this.decryptBackup(encryptedPath);
      } else if (fs.existsSync(compressedPath)) {
        finalPath = await this.decompressBackup(compressedPath);
      } else if (!fs.existsSync(backupPath)) {
        throw new Error('Respaldo no encontrado');
      }

      // Restaurar base de datos
      const restoreCommand = `psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -f "${finalPath}"`;
      
      console.log('📦 Ejecutando restauración...');
      const { stdout, stderr } = await execAsync(restoreCommand, {
        env: { ...process.env, PGPASSWORD: this.dbConfig.password }
      });

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('⚠️ Advertencias en restauración:', stderr);
      }

      console.log('✅ Base de datos restaurada exitosamente');
      return { success: true };

    } catch (error) {
      console.error('❌ Error restaurando respaldo:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Desencriptar respaldo
   */
  async decryptBackup(filePath) {
    try {
      const decryptedPath = filePath.replace('.enc', '');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      
      const data = fs.readFileSync(filePath);
      const iv = data.slice(0, 16);
      const encrypted = data.slice(16);
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.setAutoPadding(true);
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      fs.writeFileSync(decryptedPath, decrypted);
      
      console.log(`🔓 Respaldo desencriptado: ${decryptedPath}`);
      return decryptedPath;
    } catch (error) {
      console.error('❌ Error desencriptando respaldo:', error);
      return filePath;
    }
  }

  /**
   * Descomprimir respaldo
   */
  async decompressBackup(filePath) {
    try {
      const decompressedPath = filePath.replace('.gz', '');
      await execAsync(`gunzip -c "${filePath}" > "${decompressedPath}"`);
      console.log(`📦 Respaldo descomprimido: ${decompressedPath}`);
      return decompressedPath;
    } catch (error) {
      console.error('❌ Error descomprimiendo respaldo:', error);
      return filePath;
    }
  }

  /**
   * Formatear bytes a formato legible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Ejecutar respaldo automático
   */
  async runAutomaticBackup() {
    try {
      console.log('🤖 Iniciando respaldo automático...');
      
      // Conectar a la base de datos
      if (!await this.connect()) {
        return { success: false, error: 'No se pudo conectar a la base de datos' };
      }

      // Limpiar respaldos antiguos
      await this.cleanupOldBackups();

      // Crear respaldo completo
      const result = await this.createFullBackup();
      
      if (result.success) {
        console.log('✅ Respaldo automático completado exitosamente');
        return result;
      } else {
        console.error('❌ Error en respaldo automático:', result.error);
        return result;
      }

    } catch (error) {
      console.error('❌ Error en respaldo automático:', error);
      return { success: false, error: error.message };
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const backup = new BackupAutomation();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      backup.runAutomaticBackup().then(result => {
        console.log('Resultado:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'list':
      const backups = backup.listBackups();
      console.log('📋 Respaldos disponibles:');
      backups.forEach((b, i) => {
        console.log(`${i + 1}. ${b.name} (${b.type}) - ${new Date(b.created).toLocaleString()} - ${backup.formatBytes(b.size)}`);
      });
      break;
      
    case 'restore':
      const backupName = process.argv[3];
      if (!backupName) {
        console.error('❌ Especifica el nombre del respaldo a restaurar');
        process.exit(1);
      }
      backup.restoreFromBackup(backupName).then(result => {
        console.log('Resultado:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    default:
      console.log('Uso: node backup-automation.js [backup|list|restore <name>]');
      process.exit(1);
  }
}

module.exports = BackupAutomation;

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Sistema de respaldo para PostgreSQL
 * Reemplaza el sistema anterior de SQLite
 */
class PostgreSQLBackupSystem {
  constructor(backupDir = './backups', maxBackups = 10) {
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
    this.pgPool = null;
    this.ensureBackupDirExists();
  }

  ensureBackupDirExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`📁 Directorio de respaldos creado: ${this.backupDir}`);
    }
  }

  async connectDb() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurado');
    }

    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await this.pgPool.connect();
    console.log('✅ Conectado a PostgreSQL para respaldos');
    client.release();
  }

  async checkDatabaseIntegrity() {
    const client = await this.pgPool.connect();
    try {
      // Verificar integridad de las tablas principales
      const result = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM ciudades) as ciudades_count,
          (SELECT COUNT(*) FROM complejos) as complejos_count,
          (SELECT COUNT(*) FROM canchas) as canchas_count,
          (SELECT COUNT(*) FROM usuarios) as usuarios_count,
          (SELECT COUNT(*) FROM reservas) as reservas_count
      `);
      
      console.log('📊 Estado de las tablas:');
      console.log(`   - Ciudades: ${result.rows[0].ciudades_count}`);
      console.log(`   - Complejos: ${result.rows[0].complejos_count}`);
      console.log(`   - Canchas: ${result.rows[0].canchas_count}`);
      console.log(`   - Usuarios: ${result.rows[0].usuarios_count}`);
      console.log(`   - Reservas: ${result.rows[0].reservas_count}`);
      
      return true;
    } finally {
      client.release();
    }
  }

  async checkDatabaseHasData() {
    const client = await this.pgPool.connect();
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM reservas');
      return result.rows[0].count > 0;
    } finally {
      client.release();
    }
  }

  generateHash(data) {
    const hash = crypto.createHash('md5');
    hash.update(data);
    return hash.digest('hex');
  }

  async createBackup() {
    console.log('💾 CREANDO RESPALDO POSTGRESQL');
    console.log('==============================');

    this.ensureBackupDirExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `postgresql_backup_${timestamp}.json`;
    const backupFilePath = path.join(this.backupDir, backupFileName);
    const hashFilePath = backupFilePath + '.hash';

    try {
      const client = await this.pgPool.connect();
      
      try {
        // Exportar datos de todas las tablas
        const backupData = {
          timestamp: timestamp,
          tables: {}
        };

        // Exportar ciudades
        const ciudades = await client.query('SELECT * FROM ciudades ORDER BY id');
        backupData.tables.ciudades = ciudades.rows;

        // Exportar complejos
        const complejos = await client.query('SELECT * FROM complejos ORDER BY id');
        backupData.tables.complejos = complejos.rows;

        // Exportar canchas
        const canchas = await client.query('SELECT * FROM canchas ORDER BY id');
        backupData.tables.canchas = canchas.rows;

        // Exportar usuarios
        const usuarios = await client.query('SELECT * FROM usuarios ORDER BY id');
        backupData.tables.usuarios = usuarios.rows;

        // Exportar reservas
        const reservas = await client.query('SELECT * FROM reservas ORDER BY id');
        backupData.tables.reservas = reservas.rows;

        // Exportar pagos
        const pagos = await client.query('SELECT * FROM pagos ORDER BY id');
        backupData.tables.pagos = pagos.rows;

        // Escribir archivo de respaldo
        const jsonData = JSON.stringify(backupData, null, 2);
        fs.writeFileSync(backupFilePath, jsonData);
        
        const stats = fs.statSync(backupFilePath);
        const hash = this.generateHash(jsonData);
        fs.writeFileSync(hashFilePath, hash);

        console.log(`✅ Respaldo creado: ${backupFilePath}`);
        console.log(`📊 Tamaño: ${stats.size} bytes`);
        console.log(`🔐 Hash: ${hash}`);
        console.log(`📋 Registros respaldados:`);
        console.log(`   - Ciudades: ${ciudades.rows.length}`);
        console.log(`   - Complejos: ${complejos.rows.length}`);
        console.log(`   - Canchas: ${canchas.rows.length}`);
        console.log(`   - Usuarios: ${usuarios.rows.length}`);
        console.log(`   - Reservas: ${reservas.rows.length}`);
        console.log(`   - Pagos: ${pagos.rows.length}`);

        this.cleanOldBackups();

        return {
          success: true,
          path: backupFilePath,
          size: stats.size,
          hash: hash,
          timestamp: timestamp,
          records: {
            ciudades: ciudades.rows.length,
            complejos: complejos.rows.length,
            canchas: canchas.rows.length,
            usuarios: usuarios.rows.length,
            reservas: reservas.rows.length,
            pagos: pagos.rows.length
          }
        };

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error creando respaldo:', error.message);
      return { success: false, error: error.message };
    }
  }

  listBackups() {
    this.ensureBackupDirExists();
    const files = fs.readdirSync(this.backupDir);
    const backups = files
      .filter(file => file.startsWith('postgresql_backup_') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const hashFilePath = filePath + '.hash';
        let valid = false;
        let hash = null;
        try {
          const stats = fs.statSync(filePath);
          if (fs.existsSync(hashFilePath)) {
            const storedHash = fs.readFileSync(hashFilePath, 'utf8');
            const currentHash = this.generateHash(fs.readFileSync(filePath, 'utf8'));
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
    console.log('🔄 RESTAURANDO DESDE EL ÚLTIMO RESPALDO POSTGRESQL');
    console.log('================================================');

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
      const backupData = JSON.parse(fs.readFileSync(latestValidBackup.path, 'utf8'));
      const client = await this.pgPool.connect();
      
      try {
        // Limpiar tablas existentes
        await client.query('DELETE FROM pagos');
        await client.query('DELETE FROM reservas');
        await client.query('DELETE FROM usuarios');
        await client.query('DELETE FROM canchas');
        await client.query('DELETE FROM complejos');
        await client.query('DELETE FROM ciudades');

        // Restaurar ciudades
        for (const ciudad of backupData.tables.ciudades) {
          await client.query('INSERT INTO ciudades (id, nombre) VALUES ($1, $2)', [ciudad.id, ciudad.nombre]);
        }

        // Restaurar complejos
        for (const complejo of backupData.tables.complejos) {
          await client.query(`
            INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [complejo.id, complejo.nombre, complejo.ciudad_id, complejo.direccion, complejo.telefono, complejo.email]);
        }

        // Restaurar canchas
        for (const cancha of backupData.tables.canchas) {
          await client.query(`
            INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
            VALUES ($1, $2, $3, $4, $5)
          `, [cancha.id, cancha.complejo_id, cancha.nombre, cancha.tipo, cancha.precio_hora]);
        }

        // Restaurar usuarios
        for (const usuario of backupData.tables.usuarios) {
          await client.query(`
            INSERT INTO usuarios (id, email, password, nombre, rol, activo, complejo_id, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [usuario.id, usuario.email, usuario.password, usuario.nombre, usuario.rol, usuario.activo, usuario.complejo_id, usuario.created_at]);
        }

        // Restaurar reservas
        for (const reserva of backupData.tables.reservas) {
          await client.query(`
            INSERT INTO reservas (id, codigo_reserva, cancha_id, usuario_id, nombre_cliente, email_cliente, telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, estado, estado_pago, precio_total, created_at, fecha_creacion) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `, [reserva.id, reserva.codigo_reserva, reserva.cancha_id, reserva.usuario_id, reserva.nombre_cliente, reserva.email_cliente, reserva.telefono_cliente, reserva.rut_cliente, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.estado, reserva.estado_pago, reserva.precio_total, reserva.created_at, reserva.fecha_creacion]);
        }

        // Restaurar pagos
        for (const pago of backupData.tables.pagos) {
          await client.query(`
            INSERT INTO pagos (id, reserva_id, transbank_token, order_id, amount, status, authorization_code, payment_type_code, response_code, installments_number, transaction_date, created_at, updated_at, bloqueo_id, reservation_code) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [pago.id, pago.reserva_id, pago.transbank_token, pago.order_id, pago.amount, pago.status, pago.authorization_code, pago.payment_type_code, pago.response_code, pago.installments_number, pago.transaction_date, pago.created_at, pago.updated_at, pago.bloqueo_id, pago.reservation_code]);
        }

        console.log(`✅ BD restaurada desde: ${latestValidBackup.name}`);
        console.log(`📋 Registros restaurados:`);
        console.log(`   - Ciudades: ${backupData.tables.ciudades.length}`);
        console.log(`   - Complejos: ${backupData.tables.complejos.length}`);
        console.log(`   - Canchas: ${backupData.tables.canchas.length}`);
        console.log(`   - Usuarios: ${backupData.tables.usuarios.length}`);
        console.log(`   - Reservas: ${backupData.tables.reservas.length}`);
        console.log(`   - Pagos: ${backupData.tables.pagos.length}`);
        
        return true;

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error restaurando BD:', error.message);
      return false;
    }
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('✅ Conexión PostgreSQL cerrada');
    }
  }
}

// Función para inicializar el sistema de respaldo
async function initializePostgreSQLBackupSystem() {
  const backupSystem = new PostgreSQLBackupSystem();
  await backupSystem.connectDb();

  console.log('🔍 VERIFICANDO ESTADO DE LA BD POSTGRESQL');
  console.log('=========================================');
  const hasData = await backupSystem.checkDatabaseHasData();
  const integrityOk = await backupSystem.checkDatabaseIntegrity();

  if (!integrityOk) {
    console.error('❌ Problemas de integridad detectados en PostgreSQL');
  } else if (!hasData) {
    console.log('⚠️  BD PostgreSQL vacía - no hay reservas');
  } else {
    console.log(`✅ BD PostgreSQL OK - con datos encontrados`);
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

module.exports = { PostgreSQLBackupSystem, initializePostgreSQLBackupSystem };

// Si se ejecuta directamente
if (require.main === module) {
  initializePostgreSQLBackupSystem().catch(console.error);
}

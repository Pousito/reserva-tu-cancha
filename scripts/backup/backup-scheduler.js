#!/usr/bin/env node

/**
 * Programador de Respaldos Automáticos
 * Ejecuta respaldos en horarios programados
 */

const cron = require('node-cron');
const BackupAutomation = require('./backup-automation');
const fs = require('fs');
const path = require('path');

class BackupScheduler {
  constructor() {
    this.backup = new BackupAutomation();
    this.schedules = [];
    this.logFile = path.join(__dirname, '../../logs/backup-scheduler.log');
    this.isRunning = false;
  }

  /**
   * Configurar horarios de respaldo
   */
  setupSchedules() {
    // Respaldo diario a las 2:00 AM
    this.schedules.push({
      name: 'daily-backup',
      schedule: '0 2 * * *', // 2:00 AM todos los días
      type: 'full',
      description: 'Respaldo completo diario'
    });

    // Respaldo incremental cada 6 horas
    this.schedules.push({
      name: 'incremental-backup',
      schedule: '0 */6 * * *', // Cada 6 horas
      type: 'incremental',
      description: 'Respaldo incremental cada 6 horas'
    });

    // Respaldo semanal los domingos a las 3:00 AM
    this.schedules.push({
      name: 'weekly-backup',
      schedule: '0 3 * * 0', // Domingos a las 3:00 AM
      type: 'full',
      description: 'Respaldo semanal completo'
    });

    // Limpieza de respaldos antiguos diariamente a las 4:00 AM
    this.schedules.push({
      name: 'cleanup-backups',
      schedule: '0 4 * * *', // 4:00 AM todos los días
      type: 'cleanup',
      description: 'Limpieza de respaldos antiguos'
    });
  }

  /**
   * Iniciar el programador
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ El programador ya está ejecutándose');
      return;
    }

    this.setupSchedules();
    this.isRunning = true;

    console.log('🤖 Iniciando programador de respaldos...');
    console.log(`📅 ${this.schedules.length} tareas programadas`);

    // Programar cada tarea
    this.schedules.forEach(schedule => {
      const task = cron.schedule(schedule.schedule, async () => {
        await this.executeScheduledTask(schedule);
      }, {
        scheduled: false,
        timezone: 'America/Santiago'
      });

      task.start();
      console.log(`✅ ${schedule.name}: ${schedule.description} (${schedule.schedule})`);
    });

    // Log de inicio
    this.log('INFO', 'Programador de respaldos iniciado', {
      schedules: this.schedules.length,
      timezone: 'America/Santiago'
    });

    console.log('🎯 Programador de respaldos activo');
    console.log('💡 Presiona Ctrl+C para detener');
  }

  /**
   * Detener el programador
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ El programador no está ejecutándose');
      return;
    }

    this.isRunning = false;
    console.log('🛑 Deteniendo programador de respaldos...');
    this.log('INFO', 'Programador de respaldos detenido');
  }

  /**
   * Ejecutar tarea programada
   */
  async executeScheduledTask(schedule) {
    const startTime = new Date();
    console.log(`🔄 Ejecutando: ${schedule.name} - ${schedule.description}`);

    try {
      let result;
      
      switch (schedule.type) {
        case 'full':
          result = await this.backup.createFullBackup();
          break;
          
        case 'incremental':
          // Obtener fecha del último respaldo
          const backups = this.backup.listBackups();
          const lastBackup = backups.find(b => b.type === 'full');
          const lastBackupDate = lastBackup ? new Date(lastBackup.created) : new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          result = await this.backup.createIncrementalBackup(lastBackupDate);
          break;
          
        case 'cleanup':
          await this.backup.cleanupOldBackups();
          result = { success: true, message: 'Limpieza completada' };
          break;
          
        default:
          throw new Error(`Tipo de tarea no soportado: ${schedule.type}`);
      }

      const duration = new Date() - startTime;
      
      if (result.success) {
        console.log(`✅ ${schedule.name} completado en ${duration}ms`);
        this.log('SUCCESS', `${schedule.name} completado exitosamente`, {
          duration: duration,
          result: result
        });
      } else {
        console.error(`❌ ${schedule.name} falló:`, result.error);
        this.log('ERROR', `${schedule.name} falló`, {
          duration: duration,
          error: result.error
        });
      }

    } catch (error) {
      const duration = new Date() - startTime;
      console.error(`❌ Error ejecutando ${schedule.name}:`, error);
      this.log('ERROR', `Error ejecutando ${schedule.name}`, {
        duration: duration,
        error: error.message
      });
    }
  }

  /**
   * Ejecutar respaldo manual
   */
  async runManualBackup(type = 'full') {
    console.log(`🔄 Ejecutando respaldo manual (${type})...`);
    
    try {
      let result;
      
      if (type === 'full') {
        result = await this.backup.createFullBackup();
      } else if (type === 'incremental') {
        const backups = this.backup.listBackups();
        const lastBackup = backups.find(b => b.type === 'full');
        const lastBackupDate = lastBackup ? new Date(lastBackup.created) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        result = await this.backup.createIncrementalBackup(lastBackupDate);
      } else {
        throw new Error(`Tipo de respaldo no soportado: ${type}`);
      }

      if (result.success) {
        console.log('✅ Respaldo manual completado exitosamente');
        this.log('SUCCESS', `Respaldo manual (${type}) completado`, result);
      } else {
        console.error('❌ Error en respaldo manual:', result.error);
        this.log('ERROR', `Respaldo manual (${type}) falló`, { error: result.error });
      }

      return result;
    } catch (error) {
      console.error('❌ Error en respaldo manual:', error);
      this.log('ERROR', `Error en respaldo manual (${type})`, { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Mostrar estado del programador
   */
  showStatus() {
    console.log('📊 Estado del Programador de Respaldos');
    console.log('=====================================');
    console.log(`🔄 Ejecutándose: ${this.isRunning ? 'Sí' : 'No'}`);
    console.log(`📅 Tareas programadas: ${this.schedules.length}`);
    console.log(`📁 Directorio de respaldos: ${this.backup.backupDir}`);
    console.log(`📏 Máximo de respaldos: ${this.backup.maxBackups}`);
    console.log(`🗜️ Compresión: ${this.backup.compressionEnabled ? 'Habilitada' : 'Deshabilitada'}`);
    console.log(`🔐 Encriptación: ${this.backup.encryptionEnabled ? 'Habilitada' : 'Deshabilitada'}`);
    
    // Mostrar respaldos disponibles
    const backups = this.backup.listBackups();
    console.log(`\n📋 Respaldos disponibles: ${backups.length}`);
    backups.slice(0, 5).forEach((backup, i) => {
      console.log(`  ${i + 1}. ${backup.name} (${backup.type}) - ${new Date(backup.created).toLocaleString()}`);
    });
    
    if (backups.length > 5) {
      console.log(`  ... y ${backups.length - 5} más`);
    }
  }

  /**
   * Mostrar próximas ejecuciones
   */
  showNextExecutions() {
    console.log('⏰ Próximas Ejecuciones Programadas');
    console.log('==================================');
    
    this.schedules.forEach(schedule => {
      const cronParser = require('cron-parser');
      try {
        const interval = cronParser.parseExpression(schedule.schedule);
        const next = interval.next();
        console.log(`📅 ${schedule.name}: ${next.toLocaleString('es-CL')} (${schedule.description})`);
      } catch (error) {
        console.log(`❌ ${schedule.name}: Error parseando horario`);
      }
    });
  }

  /**
   * Escribir log
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Crear directorio de logs si no existe
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Escribir log
    const logLine = `${timestamp} [${level}] ${message} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(this.logFile, logLine);

    // Mantener log con tamaño limitado (10MB)
    const stats = fs.statSync(this.logFile);
    if (stats.size > 10 * 1024 * 1024) {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.split('\n');
      const recentLines = lines.slice(-1000); // Mantener últimas 1000 líneas
      fs.writeFileSync(this.logFile, recentLines.join('\n'));
    }
  }

  /**
   * Leer logs recientes
   */
  readRecentLogs(lines = 50) {
    try {
      if (!fs.existsSync(this.logFile)) {
        return [];
      }

      const content = fs.readFileSync(this.logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines);
    } catch (error) {
      console.error('❌ Error leyendo logs:', error);
      return [];
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const scheduler = new BackupScheduler();
  
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'start':
      scheduler.start();
      // Mantener el proceso vivo
      process.on('SIGINT', () => {
        console.log('\n🛑 Deteniendo programador...');
        scheduler.stop();
        process.exit(0);
      });
      break;
      
    case 'stop':
      scheduler.stop();
      break;
      
    case 'status':
      scheduler.showStatus();
      break;
      
    case 'next':
      scheduler.showNextExecutions();
      break;
      
    case 'backup':
      scheduler.runManualBackup(arg || 'full').then(result => {
        console.log('Resultado:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'logs':
      const lines = parseInt(arg) || 50;
      const logs = scheduler.readRecentLogs(lines);
      console.log(`📋 Últimos ${lines} logs:`);
      logs.forEach(log => console.log(log));
      break;
      
    default:
      console.log('Uso: node backup-scheduler.js [start|stop|status|next|backup [type]|logs [lines]]');
      console.log('Tipos de respaldo: full, incremental');
      process.exit(1);
  }
}

module.exports = BackupScheduler;

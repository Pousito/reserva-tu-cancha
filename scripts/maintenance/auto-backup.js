#!/usr/bin/env node

/**
 * Sistema de backup automático
 * 
 * Este script:
 * 1. Crea backups automáticos de la base de datos
 * 2. Limpia backups antiguos
 * 3. Puede ejecutarse como cron job
 */

const DatabaseManager = require('../../src/config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class AutoBackupManager {
    constructor() {
        this.db = new DatabaseManager();
        this.backupDir = path.join(__dirname, '../../backups');
        this.maxBackups = 10; // Mantener solo los últimos 10 backups
        this.backupInterval = 24 * 60 * 60 * 1000; // 24 horas
    }

    async init() {
        try {
            // Crear directorio de backups si no existe
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
                console.log(`📁 Directorio de backups creado: ${this.backupDir}`);
            }

            await this.db.connect();
            console.log('✅ Conectado a la base de datos para backup');
        } catch (error) {
            console.error('❌ Error inicializando backup:', error);
            throw error;
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `database_backup_${timestamp}.sql`;
            const backupPath = path.join(this.backupDir, backupFileName);
            
            console.log(`💾 Creando backup: ${backupFileName}`);
            
            // Obtener información de la base de datos
            const dbInfo = this.db.getDatabaseInfo();
            console.log(`📊 Base de datos: ${dbInfo.type}`);
            
            // Solo PostgreSQL - exportar datos
            await this.exportPostgreSQLData(backupPath);
            
            // Crear archivo de hash para verificación
            const hashFileName = `${backupFileName}.hash`;
            const hashPath = path.join(this.backupDir, hashFileName);
            const fileHash = await this.calculateFileHash(backupPath);
            fs.writeFileSync(hashPath, fileHash);
            
            // Obtener estadísticas del backup
            const stats = fs.statSync(backupPath);
            const backupInfo = {
                fileName: backupFileName,
                size: stats.size,
                created: new Date().toISOString(),
                hash: fileHash,
                databaseType: dbInfo.type
            };
            
            console.log(`📊 Estadísticas del backup:`);
            console.log(`   - Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`   - Hash: ${fileHash}`);
            console.log(`   - Tipo: ${dbInfo.type}`);
            
            return backupInfo;
            
        } catch (error) {
            console.error('❌ Error creando backup:', error);
            throw error;
        }
    }

    async exportPostgreSQLData(backupPath) {
        try {
            console.log('🔄 Exportando datos de PostgreSQL...');
            
            // Obtener todas las tablas y sus datos
            const tables = ['ciudades', 'complejos', 'canchas', 'reservas', 'usuarios'];
            const exportData = {
                timestamp: new Date().toISOString(),
                databaseType: 'PostgreSQL',
                tables: {}
            };
            
            for (const table of tables) {
                try {
                    const data = await this.db.query(`SELECT * FROM ${table}`);
                    exportData.tables[table] = data;
                    console.log(`   ✅ Tabla ${table}: ${data.length} registros`);
                } catch (error) {
                    console.log(`   ⚠️ Tabla ${table}: No existe o error - ${error.message}`);
                    exportData.tables[table] = [];
                }
            }
            
            // Guardar datos como JSON
            fs.writeFileSync(backupPath, JSON.stringify(exportData, null, 2));
            console.log(`✅ Datos PostgreSQL exportados: ${backupPath}`);
            
        } catch (error) {
            console.error('❌ Error exportando datos PostgreSQL:', error);
            throw error;
        }
    }

    async calculateFileHash(filePath) {
        const crypto = require('crypto');
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    async cleanOldBackups() {
        try {
            console.log('🧹 Limpiando backups antiguos...');
            
            const files = fs.readdirSync(this.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith('database_backup_') && file.endsWith('.sql'))
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
                .sort((a, b) => b.created - a.created); // Más recientes primero
            
            console.log(`📋 Encontrados ${backupFiles.length} backups`);
            
            if (backupFiles.length > this.maxBackups) {
                const filesToDelete = backupFiles.slice(this.maxBackups);
                console.log(`🗑️ Eliminando ${filesToDelete.length} backups antiguos...`);
                
                for (const file of filesToDelete) {
                    try {
                        fs.unlinkSync(file.path);
                        // También eliminar el archivo de hash si existe
                        const hashPath = `${file.path}.hash`;
                        if (fs.existsSync(hashPath)) {
                            fs.unlinkSync(hashPath);
                        }
                        console.log(`   ✅ Eliminado: ${file.name}`);
                    } catch (error) {
                        console.log(`   ⚠️ Error eliminando ${file.name}: ${error.message}`);
                    }
                }
            } else {
                console.log('✅ No hay backups antiguos para eliminar');
            }
            
        } catch (error) {
            console.error('❌ Error limpiando backups antiguos:', error);
        }
    }

    async shouldCreateBackup() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const backupFiles = files.filter(file => file.startsWith('database_backup_') && file.endsWith('.sql'));
            
            if (backupFiles.length === 0) {
                return true; // No hay backups, crear uno
            }
            
            // Obtener el backup más reciente
            const latestBackup = backupFiles
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    return fs.statSync(filePath).birthtime;
                })
                .sort((a, b) => b - a)[0];
            
            const timeSinceLastBackup = Date.now() - latestBackup.getTime();
            return timeSinceLastBackup > this.backupInterval;
            
        } catch (error) {
            console.error('❌ Error verificando necesidad de backup:', error);
            return true; // En caso de error, crear backup
        }
    }

    async run() {
        try {
            console.log('🔄 Iniciando sistema de backup automático...');
            
            await this.init();
            
            if (await this.shouldCreateBackup()) {
                await this.createBackup();
            } else {
                console.log('⏭️ No es necesario crear backup (muy reciente)');
            }
            
            await this.cleanOldBackups();
            
            console.log('🎉 Sistema de backup completado exitosamente');
            
        } catch (error) {
            console.error('❌ Error en sistema de backup:', error);
            throw error;
        } finally {
            await this.db.close();
            console.log('🔌 Conexión cerrada');
        }
    }

    async close() {
        try {
            await this.db.close();
        } catch (error) {
            console.error('❌ Error cerrando conexión:', error);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const backupManager = new AutoBackupManager();
    backupManager.run()
        .then(() => {
            console.log('✅ Backup automático completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error en backup automático:', error);
            process.exit(1);
        });
}

module.exports = { AutoBackupManager };

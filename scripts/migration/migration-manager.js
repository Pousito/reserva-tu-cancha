#!/usr/bin/env node

/**
 * Gestor de migraciones de base de datos
 * Ejecuta automáticamente las migraciones necesarias
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class MigrationManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async init() {
    try {
      // Crear tabla de migraciones si no existe
      await this.createMigrationsTable();
      
      // Ejecutar migraciones pendientes
      await this.runPendingMigrations();
      
      console.log('✅ Migraciones completadas exitosamente');
    } catch (error) {
      console.error('❌ Error en migraciones:', error);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }

  async createMigrationsTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    const result = await this.pool.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  }

  async runPendingMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('📁 No hay directorio de migraciones');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = migrationFiles.filter(file => 
      !executedMigrations.includes(file.replace('.js', ''))
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No hay migraciones pendientes');
      return;
    }

    console.log(`🔄 Ejecutando ${pendingMigrations.length} migraciones pendientes...`);

    for (const file of pendingMigrations) {
      await this.runMigration(file);
    }
  }

  async runMigration(file) {
    const migrationName = file.replace('.js', '');
    console.log(`🔄 Ejecutando migración: ${migrationName}`);

    try {
      const migration = require(path.join(__dirname, 'migrations', file));
      await migration.up(this.pool);
      
      // Registrar migración como ejecutada
      await this.pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName]
      );
      
      console.log(`✅ Migración ${migrationName} ejecutada exitosamente`);
    } catch (error) {
      console.error(`❌ Error en migración ${migrationName}:`, error);
      throw error;
    }
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  const manager = new MigrationManager();
  manager.init();
}

module.exports = MigrationManager;

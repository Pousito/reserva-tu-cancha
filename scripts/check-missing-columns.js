#!/usr/bin/env node

/**
 * Script para verificar columnas faltantes en el esquema de PostgreSQL
 * Compara el esquema actual con las columnas requeridas para reservas administrativas
 */

const { Pool } = require('pg');
require('dotenv').config();

class SchemaChecker {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async checkMissingColumns() {
    try {
      console.log('🔍 Verificando columnas faltantes en el esquema...\n');

      // Columnas requeridas para reservas administrativas
      const requiredColumns = {
        reservas: [
          'tipo_reserva',
          'creada_por_admin', 
          'metodo_contacto',
          'comision_aplicada'
        ],
        bloqueos_temporales: [
          'admin_id'
        ]
      };

      for (const [tableName, columns] of Object.entries(requiredColumns)) {
        console.log(`📋 Verificando tabla: ${tableName}`);
        
        for (const column of columns) {
          const exists = await this.columnExists(tableName, column);
          if (exists) {
            console.log(`  ✅ Columna ${column} existe`);
          } else {
            console.log(`  ❌ Columna ${column} FALTA - necesita migración`);
            await this.addMissingColumn(tableName, column);
          }
        }
        console.log('');
      }

      console.log('✅ Verificación de esquema completada');
      
    } catch (error) {
      console.error('❌ Error verificando esquema:', error);
    } finally {
      await this.pool.end();
    }
  }

  async columnExists(tableName, columnName) {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND column_name = $2
          AND table_schema = 'public'
        )
      `, [tableName, columnName]);
      
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error verificando columna ${columnName}:`, error.message);
      return false;
    }
  }

  async addMissingColumn(tableName, columnName) {
    try {
      let alterQuery = '';
      
      switch (`${tableName}.${columnName}`) {
        case 'reservas.tipo_reserva':
          alterQuery = `ALTER TABLE reservas ADD COLUMN tipo_reserva VARCHAR(50) DEFAULT 'directa'`;
          break;
        case 'reservas.creada_por_admin':
          alterQuery = `ALTER TABLE reservas ADD COLUMN creada_por_admin BOOLEAN DEFAULT false`;
          break;
        case 'reservas.metodo_contacto':
          alterQuery = `ALTER TABLE reservas ADD COLUMN metodo_contacto VARCHAR(50) DEFAULT 'web'`;
          break;
        case 'reservas.comision_aplicada':
          alterQuery = `ALTER TABLE reservas ADD COLUMN comision_aplicada DECIMAL(10,2) DEFAULT 0.00`;
          break;
        case 'bloqueos_temporales.admin_id':
          alterQuery = `ALTER TABLE bloqueos_temporales ADD COLUMN admin_id INTEGER`;
          break;
        default:
          console.log(`  ⚠️ No se pudo determinar el tipo para ${columnName}`);
          return;
      }

      if (alterQuery) {
        await this.pool.query(alterQuery);
        console.log(`  ✅ Columna ${columnName} agregada exitosamente`);
      }
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ✅ Columna ${columnName} ya existe`);
      } else {
        console.error(`  ❌ Error agregando columna ${columnName}:`, error.message);
      }
    }
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  const checker = new SchemaChecker();
  checker.checkMissingColumns();
}

module.exports = SchemaChecker;

#!/usr/bin/env node

/**
 * Tests pre-deploy para verificar que todo funciona correctamente
 * antes de hacer deploy a producción
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class PreDeployTests {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.errors = [];
  }

  async runAllTests() {
    console.log('🧪 Ejecutando tests pre-deploy...\n');

    try {
      await this.testDatabaseConnection();
      await this.testRequiredTables();
      await this.testEmailConfiguration();
      await this.testFileStructure();
      await this.testEnvironmentVariables();
      
      if (this.errors.length === 0) {
        console.log('\n✅ Todos los tests pasaron exitosamente');
        console.log('🚀 Listo para deploy a producción');
        return true;
      } else {
        console.log('\n❌ Tests fallaron:');
        this.errors.forEach(error => console.log(`   - ${error}`));
        return false;
      }
    } catch (error) {
      console.error('💥 Error ejecutando tests:', error);
      return false;
    } finally {
      await this.pool.end();
    }
  }

  async testDatabaseConnection() {
    console.log('🔌 Probando conexión a base de datos...');
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Conexión a base de datos exitosa');
    } catch (error) {
      this.errors.push(`Conexión a base de datos falló: ${error.message}`);
    }
  }

  async testRequiredTables() {
    console.log('📊 Verificando tablas requeridas...');
    const requiredTables = [
      'usuarios',
      'complejos',
      'canchas',
      'reservas',
      'password_reset_tokens'
    ];

    for (const table of requiredTables) {
      try {
        const result = await this.pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(`✅ Tabla ${table} existe`);
        } else {
          this.errors.push(`Tabla requerida ${table} no existe`);
        }
      } catch (error) {
        this.errors.push(`Error verificando tabla ${table}: ${error.message}`);
      }
    }
  }

  async testEmailConfiguration() {
    console.log('📧 Verificando configuración de email...');
    const requiredEmailVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    
    for (const varName of requiredEmailVars) {
      if (process.env[varName]) {
        console.log(`✅ ${varName} configurado`);
      } else {
        this.errors.push(`Variable de entorno ${varName} no configurada`);
      }
    }
  }

  async testFileStructure() {
    console.log('📁 Verificando estructura de archivos...');
    const requiredFiles = [
      'server.js',
      'package.json',
      'public/admin-dashboard.html',
      'public/admin-dashboard.js',
      'public/js/admin-utils.js',
      'src/config/database.js',
      'src/services/emailService.js'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ Archivo ${file} existe`);
      } else {
        this.errors.push(`Archivo requerido ${file} no existe`);
      }
    }
  }

  async testEnvironmentVariables() {
    console.log('⚙️ Verificando variables de entorno...');
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        console.log(`✅ ${varName} configurado`);
      } else {
        this.errors.push(`Variable de entorno ${varName} no configurada`);
      }
    }
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  const tests = new PreDeployTests();
  tests.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = PreDeployTests;

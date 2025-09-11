/**
 * Configuración de entorno para desarrollo y producción
 * Maneja automáticamente las diferencias entre entornos
 */

const path = require('path');

class EnvironmentConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.isProduction = this.env === 'production';
    this.isDevelopment = this.env === 'development';
    
    this.loadEnvironment();
    this.validateConfig();
  }

  loadEnvironment() {
    if (this.isProduction) {
      // En producción, usar variables de entorno de Render
      require('dotenv').config();
    } else {
      // En desarrollo, usar archivo específico
      require('dotenv').config({ path: './env.postgresql' });
    }
  }

  validateConfig() {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Variables de entorno faltantes:', missing);
      if (this.isProduction) {
        throw new Error(`Variables de entorno faltantes en producción: ${missing.join(', ')}`);
      } else {
        console.warn('⚠️ Variables de entorno faltantes en desarrollo:', missing);
      }
    }
  }

  getDatabaseConfig() {
    return {
      url: process.env.DATABASE_URL,
      ssl: this.isProduction ? { rejectUnauthorized: false } : false
    };
  }

  getEmailConfig() {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      secure: false
    };
  }

  getJWTConfig() {
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h'
    };
  }

  getFrontendURL() {
    return this.isProduction 
      ? 'https://www.reservatuscanchas.cl'
      : 'http://localhost:3000';
  }

  logConfig() {
    console.log('🌍 Configuración de entorno:');
    console.log(`   Entorno: ${this.env}`);
    console.log(`   Base de datos: ${this.isProduction ? 'PostgreSQL (Producción)' : 'PostgreSQL (Desarrollo)'}`);
    console.log(`   Email: ${process.env.SMTP_USER ? 'Configurado' : 'No configurado'}`);
    console.log(`   Frontend URL: ${this.getFrontendURL()}`);
  }
}

module.exports = new EnvironmentConfig();

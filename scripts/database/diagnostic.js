#!/usr/bin/env node

/**
 * Script de Diagnóstico para Problemas de Persistencia en Render
 * 
 * Este script verifica:
 * 1. Variables de entorno
 * 2. Rutas de archivos
 * 3. Estado de la base de datos
 * 4. Sistema de respaldos
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('🔍 DIAGNÓSTICO DE PERSISTENCIA EN RENDER');
console.log('==========================================');
console.log('');

// 1. Verificar Variables de Entorno
console.log('📋 1. VARIABLES DE ENTORNO');
console.log('---------------------------');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`DB_PATH: ${process.env.DB_PATH || 'undefined'}`);
console.log(`RENDER_DISK_PATH: ${process.env.RENDER_DISK_PATH || 'undefined'}`);
console.log(`PORT: ${process.env.PORT || 'undefined'}`);
console.log(`RENDER_DEPLOY_ID: ${process.env.RENDER_DEPLOY_ID || 'undefined'}`);
console.log('');

// 2. Determinar rutas
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/opt/render/project/src/database.sqlite'
  : './database.sqlite';

const backupDir = process.env.NODE_ENV === 'production'
  ? '/opt/render/project/src/backups'
  : './backups';

console.log('📁 2. RUTAS DE ARCHIVOS');
console.log('------------------------');
console.log(`Ruta de BD: ${dbPath}`);
console.log(`Directorio de respaldos: ${backupDir}`);
console.log('');

// 3. Verificar archivos y directorios
console.log('📂 3. ESTADO DE ARCHIVOS Y DIRECTORIOS');
console.log('---------------------------------------');

// Verificar directorio de BD
const dbDir = path.dirname(dbPath);
console.log(`Directorio de BD: ${dbDir}`);
console.log(`  - Existe: ${fs.existsSync(dbDir) ? '✅' : '❌'}`);
if (fs.existsSync(dbDir)) {
  const stats = fs.statSync(dbDir);
  console.log(`  - Modificado: ${stats.mtime}`);
  console.log(`  - Permisos: ${stats.mode.toString(8)}`);
}

// Verificar archivo de BD
console.log(`Archivo de BD: ${dbPath}`);
console.log(`  - Existe: ${fs.existsSync(dbPath) ? '✅' : '❌'}`);
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`  - Tamaño: ${stats.size} bytes`);
  console.log(`  - Modificado: ${stats.mtime}`);
}

// Verificar directorio de respaldos
console.log(`Directorio de respaldos: ${backupDir}`);
console.log(`  - Existe: ${fs.existsSync(backupDir) ? '✅' : '❌'}`);
if (fs.existsSync(backupDir)) {
  const files = fs.readdirSync(backupDir);
  console.log(`  - Archivos: ${files.length}`);
  files.forEach(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    console.log(`    * ${file} (${stats.size} bytes, ${stats.mtime})`);
  });
}
console.log('');

// 4. Verificar base de datos
console.log('🗄️  4. ESTADO DE LA BASE DE DATOS');
console.log('----------------------------------');

if (!fs.existsSync(dbPath)) {
  console.log('❌ Archivo de BD no existe');
} else {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.log(`❌ Error conectando a BD: ${err.message}`);
      return;
    }
    
    console.log('✅ Conexión a BD exitosa');
    
    // Verificar tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.log(`❌ Error obteniendo tablas: ${err.message}`);
      } else {
        console.log(`📋 Tablas encontradas: ${tables.length}`);
        tables.forEach(table => {
          console.log(`  - ${table.name}`);
        });
      }
      
      // Verificar datos
      if (tables && tables.length > 0) {
        const checkData = (tableName, callback) => {
          db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
            if (err) {
              console.log(`  - ${tableName}: Error - ${err.message}`);
            } else {
              console.log(`  - ${tableName}: ${row.count} registros`);
            }
            callback();
          });
        };
        
        let completed = 0;
        const totalTables = tables.length;
        
        tables.forEach(table => {
          checkData(table.name, () => {
            completed++;
            if (completed === totalTables) {
              db.close();
              console.log('');
              console.log('🎯 5. RECOMENDACIONES');
              console.log('----------------------');
              generateRecommendations();
            }
          });
        });
      } else {
        db.close();
        console.log('');
        console.log('🎯 5. RECOMENDACIONES');
        console.log('----------------------');
        generateRecommendations();
      }
    });
  });
}

function generateRecommendations() {
  console.log('');
  
  // Verificar si DB_PATH está undefined
  if (!process.env.DB_PATH) {
    console.log('⚠️  PROBLEMA: DB_PATH no está configurado');
    console.log('   SOLUCIÓN: Verificar variables de entorno en Render Dashboard');
    console.log('');
  }
  
  // Verificar si los respaldos están en directorio temporal
  if (process.env.NODE_ENV === 'production' && backupDir === './backups') {
    console.log('⚠️  PROBLEMA: Respaldos en directorio temporal');
    console.log('   SOLUCIÓN: Configurar respaldos en disco persistente');
    console.log('');
  }
  
  // Verificar si hay respaldos
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite'));
    if (files.length === 0) {
      console.log('⚠️  PROBLEMA: No hay respaldos disponibles');
      console.log('   SOLUCIÓN: Crear respaldo inicial');
      console.log('');
    }
  }
  
  console.log('✅ DIAGNÓSTICO COMPLETADO');
  console.log('=========================');
}

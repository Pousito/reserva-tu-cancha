const fs = require('fs');
const path = require('path');

/**
 * Script de diagnóstico para verificar rutas y estructura de archivos
 */
function checkPaths() {
  console.log('🔍 DIAGNÓSTICO DE RUTAS Y ESTRUCTURA');
  console.log('====================================');
  
  const paths = {
    sourceDir: '/opt/render/project/src',
    dataDir: '/opt/render/project/data',
    publicDir: '/opt/render/project/src/public',
    databaseSource: '/opt/render/project/src/database.sqlite',
    databaseTarget: '/opt/render/project/data/database.sqlite',
    backupsSource: '/opt/render/project/src/backups',
    backupsTarget: '/opt/render/project/data/backups'
  };
  
  console.log('📁 VERIFICANDO DIRECTORIOS:');
  Object.entries(paths).forEach(([name, path]) => {
    try {
      if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        if (stats.isDirectory()) {
          console.log(`✅ ${name}: ${path} (directorio)`);
        } else {
          console.log(`📄 ${name}: ${path} (archivo, ${stats.size} bytes)`);
        }
      } else {
        console.log(`❌ ${name}: ${path} (no existe)`);
      }
    } catch (error) {
      console.log(`⚠️  ${name}: ${path} (error: ${error.message})`);
    }
  });
  
  console.log('\n🌍 VARIABLES DE ENTORNO:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`DB_PATH: ${process.env.DB_PATH || 'undefined'}`);
  console.log(`RENDER_DISK_PATH: ${process.env.RENDER_DISK_PATH || 'undefined'}`);
  console.log(`PORT: ${process.env.PORT || 'undefined'}`);
  
  console.log('\n📊 VERIFICANDO ARCHIVOS ESTÁTICOS:');
  const staticFiles = [
    'index.html',
    'script.js',
    'styles.css',
    'assets/css/styles.css',
    'assets/js/script.js'
  ];
  
  staticFiles.forEach(file => {
    const fullPath = path.join(paths.publicDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}`);
    }
  });
  
  console.log('\n🔍 DIAGNÓSTICO COMPLETADO');
  console.log('=========================');
}

module.exports = { checkPaths };

#!/usr/bin/env node

/**
 * Script de migración para implementar las optimizaciones de móviles
 * Este script permite migrar gradualmente a las versiones optimizadas
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 INICIANDO MIGRACIÓN A VERSIONES OPTIMIZADAS');
console.log('================================================');

// Función para hacer backup de archivos
function backupFile(filePath) {
    const backupPath = filePath + '.backup.' + Date.now();
    try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Backup creado: ${backupPath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error creando backup de ${filePath}:`, error.message);
        return false;
    }
}

// Función para reemplazar archivo
function replaceFile(sourcePath, targetPath) {
    try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ Archivo reemplazado: ${targetPath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error reemplazando ${targetPath}:`, error.message);
        return false;
    }
}

// Función para actualizar referencias en HTML
function updateHtmlReferences(htmlPath) {
    try {
        let content = fs.readFileSync(htmlPath, 'utf8');
        
        // Reemplazar referencias a archivos optimizados
        content = content.replace('script.js?v=', 'script-optimized.js?v=');
        content = content.replace('styles.css?v=', 'styles-optimized.css?v=');
        
        fs.writeFileSync(htmlPath, content);
        console.log(`✅ Referencias actualizadas en: ${htmlPath}`);
        return true;
    } catch (error) {
        console.error(`❌ Error actualizando ${htmlPath}:`, error.message);
        return false;
    }
}

// Función principal de migración
async function migrateToOptimized() {
    const publicDir = path.join(__dirname, '../../public');
    
    console.log('📁 Directorio público:', publicDir);
    
    // Verificar que los archivos optimizados existen
    const optimizedFiles = [
        'script-optimized.js',
        'styles-optimized.css',
        'index-optimized.html'
    ];
    
    console.log('🔍 Verificando archivos optimizados...');
    for (const file of optimizedFiles) {
        const filePath = path.join(publicDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} existe`);
        } else {
            console.error(`❌ ${file} no existe`);
            return false;
        }
    }
    
    // Hacer backup de archivos originales
    console.log('💾 Creando backups...');
    const originalFiles = [
        'script.js',
        'styles.css',
        'index.html'
    ];
    
    for (const file of originalFiles) {
        const filePath = path.join(publicDir, file);
        if (fs.existsSync(filePath)) {
            backupFile(filePath);
        }
    }
    
    // Reemplazar archivos con versiones optimizadas
    console.log('🔄 Reemplazando archivos...');
    
    // Reemplazar script.js
    replaceFile(
        path.join(publicDir, 'script-optimized.js'),
        path.join(publicDir, 'script.js')
    );
    
    // Reemplazar styles.css
    replaceFile(
        path.join(publicDir, 'styles-optimized.css'),
        path.join(publicDir, 'styles.css')
    );
    
    // Reemplazar index.html
    replaceFile(
        path.join(publicDir, 'index-optimized.html'),
        path.join(publicDir, 'index.html')
    );
    
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log('📋 Resumen de cambios:');
    console.log('- script.js: Optimizado para móviles');
    console.log('- styles.css: Optimizado para rendimiento');
    console.log('- index.html: Optimizado para móviles');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('1. Probar la aplicación localmente');
    console.log('2. Hacer commit y push a GitHub');
    console.log('3. Verificar el despliegue en Render');
    console.log('4. Probar en dispositivos móviles reales');
    
    return true;
}

// Función para rollback
async function rollback() {
    const publicDir = path.join(__dirname, '../../public');
    
    console.log('🔄 INICIANDO ROLLBACK');
    console.log('=====================');
    
    // Buscar archivos de backup
    const files = fs.readdirSync(publicDir);
    const backupFiles = files.filter(file => file.includes('.backup.'));
    
    if (backupFiles.length === 0) {
        console.log('❌ No se encontraron archivos de backup');
        return false;
    }
    
    console.log('📋 Archivos de backup encontrados:', backupFiles.length);
    
    // Restaurar archivos desde backup
    for (const backupFile of backupFiles) {
        const originalFile = backupFile.split('.backup.')[0];
        const backupPath = path.join(publicDir, backupFile);
        const originalPath = path.join(publicDir, originalFile);
        
        try {
            fs.copyFileSync(backupPath, originalPath);
            console.log(`✅ Restaurado: ${originalFile}`);
        } catch (error) {
            console.error(`❌ Error restaurando ${originalFile}:`, error.message);
        }
    }
    
    console.log('✅ ROLLBACK COMPLETADO');
    return true;
}

// Función para mostrar ayuda
function showHelp() {
    console.log('📖 AYUDA - Script de Migración');
    console.log('===============================');
    console.log('');
    console.log('Uso:');
    console.log('  node migrate-to-optimized.js [comando]');
    console.log('');
    console.log('Comandos:');
    console.log('  migrate  - Migrar a versiones optimizadas (por defecto)');
    console.log('  rollback - Restaurar versiones originales');
    console.log('  help     - Mostrar esta ayuda');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node migrate-to-optimized.js');
    console.log('  node migrate-to-optimized.js migrate');
    console.log('  node migrate-to-optimized.js rollback');
}

// Función principal
async function main() {
    const command = process.argv[2] || 'migrate';
    
    switch (command) {
        case 'migrate':
            await migrateToOptimized();
            break;
        case 'rollback':
            await rollback();
            break;
        case 'help':
            showHelp();
            break;
        default:
            console.log(`❌ Comando desconocido: ${command}`);
            showHelp();
            process.exit(1);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    });
}

module.exports = {
    migrateToOptimized,
    rollback,
    showHelp
};

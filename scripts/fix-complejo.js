#!/usr/bin/env node

/**
 * Script para aplicar el fix del problema de selección de complejo
 * Este script reemplaza el script.js actual con la versión corregida
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 APLICANDO FIX PARA SELECCIÓN DE COMPLEJO');
console.log('============================================');

// Función para hacer backup
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

// Función para aplicar el fix
async function aplicarFixComplejo() {
    const publicDir = path.join(__dirname, '../../public');
    
    console.log('📁 Directorio público:', publicDir);
    
    // Verificar que el archivo de fix existe
    const fixFile = path.join(publicDir, 'script-fix-complejo.js');
    if (!fs.existsSync(fixFile)) {
        console.error('❌ Archivo script-fix-complejo.js no existe');
        return false;
    }
    
    // Verificar que el archivo original existe
    const originalFile = path.join(publicDir, 'script.js');
    if (!fs.existsSync(originalFile)) {
        console.error('❌ Archivo script.js original no existe');
        return false;
    }
    
    console.log('✅ Archivos verificados');
    
    // Hacer backup del archivo original
    console.log('💾 Creando backup del script.js original...');
    if (!backupFile(originalFile)) {
        return false;
    }
    
    // Aplicar el fix
    console.log('🔧 Aplicando fix de selección de complejo...');
    try {
        fs.copyFileSync(fixFile, originalFile);
        console.log('✅ Fix aplicado exitosamente');
    } catch (error) {
        console.error('❌ Error aplicando fix:', error.message);
        return false;
    }
    
    // Actualizar la versión en el HTML
    console.log('📝 Actualizando versión en index.html...');
    const htmlFile = path.join(publicDir, 'index.html');
    if (fs.existsSync(htmlFile)) {
        try {
            let content = fs.readFileSync(htmlFile, 'utf8');
            
            // Actualizar versión del script
            content = content.replace(
                /script\.js\?v=\d+\.\d+/g,
                'script.js?v=8.1'
            );
            
            fs.writeFileSync(htmlFile, content);
            console.log('✅ Versión actualizada en index.html');
        } catch (error) {
            console.error('❌ Error actualizando HTML:', error.message);
        }
    }
    
    console.log('✅ FIX APLICADO EXITOSAMENTE');
    console.log('============================');
    console.log('📋 Cambios realizados:');
    console.log('- script.js: Corregido problema de selección de complejo');
    console.log('- index.html: Versión actualizada a 8.1');
    console.log('');
    console.log('🔧 Correcciones implementadas:');
    console.log('- Función cargarComplejos() mejorada con callback');
    console.log('- Función seleccionarComplejo() para selección segura');
    console.log('- Timing corregido: complejo se selecciona DESPUÉS de cargar');
    console.log('- Mejor manejo de errores y logging');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('1. Probar localmente: http://localhost:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports');
    console.log('2. Verificar que el complejo se selecciona correctamente');
    console.log('3. Hacer commit y push a GitHub');
    console.log('4. Verificar en producción');
    
    return true;
}

// Función para rollback
async function rollback() {
    const publicDir = path.join(__dirname, '../../public');
    
    console.log('🔄 INICIANDO ROLLBACK');
    console.log('=====================');
    
    // Buscar archivos de backup
    const files = fs.readdirSync(publicDir);
    const backupFiles = files.filter(file => file.includes('script.js.backup.'));
    
    if (backupFiles.length === 0) {
        console.log('❌ No se encontraron archivos de backup');
        return false;
    }
    
    // Ordenar por fecha (más reciente primero)
    backupFiles.sort().reverse();
    const latestBackup = backupFiles[0];
    
    console.log('📋 Archivo de backup más reciente:', latestBackup);
    
    // Restaurar archivo desde backup
    const backupPath = path.join(publicDir, latestBackup);
    const originalPath = path.join(publicDir, 'script.js');
    
    try {
        fs.copyFileSync(backupPath, originalPath);
        console.log('✅ Script restaurado desde backup');
    } catch (error) {
        console.error('❌ Error restaurando script:', error.message);
        return false;
    }
    
    console.log('✅ ROLLBACK COMPLETADO');
    return true;
}

// Función para mostrar ayuda
function showHelp() {
    console.log('📖 AYUDA - Script de Fix de Complejo');
    console.log('====================================');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/fix-complejo.js [comando]');
    console.log('');
    console.log('Comandos:');
    console.log('  fix      - Aplicar fix de selección de complejo (por defecto)');
    console.log('  rollback - Restaurar versión anterior');
    console.log('  help     - Mostrar esta ayuda');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node scripts/fix-complejo.js');
    console.log('  node scripts/fix-complejo.js fix');
    console.log('  node scripts/fix-complejo.js rollback');
    console.log('');
    console.log('Problema que corrige:');
    console.log('- El complejo no se selecciona correctamente desde parámetros URL');
    console.log('- Timing issue: complejo se intenta seleccionar antes de cargar');
    console.log('- Falta de callback en cargarComplejos()');
}

// Función principal
async function main() {
    const command = process.argv[2] || 'fix';
    
    switch (command) {
        case 'fix':
            await aplicarFixComplejo();
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
        console.error('❌ Error en el fix:', error);
        process.exit(1);
    });
}

module.exports = {
    aplicarFixComplejo,
    rollback,
    showHelp
};

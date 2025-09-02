#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando despliegue automático...');

// Función para ejecutar comandos de Git
function runGitCommand(command, description) {
  try {
    console.log(`📝 ${description}...`);
    const result = execSync(command, { encoding: 'utf8' });
    console.log(`✅ ${description} completado`);
    return result;
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
    process.exit(1);
  }
}

// Función para verificar cambios
function checkForChanges() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    return status.trim().length > 0;
  } catch (error) {
    return false;
  }
}

// Función principal de despliegue
async function autoDeploy() {
  try {
    // Verificar si hay cambios
    if (!checkForChanges()) {
      console.log('📋 No hay cambios para desplegar');
      return;
    }

    console.log('🔄 Cambios detectados, iniciando despliegue...');

    // Agregar todos los cambios
    runGitCommand('git add .', 'Agregando cambios al staging');

    // Crear commit automático
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const commitMessage = `Auto-deploy: ${timestamp} - Cambios automáticos`;
    runGitCommand(`git commit -m "${commitMessage}"`, 'Creando commit automático');

    // Subir a GitHub
    runGitCommand('git push origin main', 'Subiendo cambios a GitHub');

    console.log('🎉 ¡Despliegue automático completado!');
    console.log('⏳ Render detectará los cambios y se actualizará automáticamente');
    console.log('📱 Los usuarios verán los cambios al refrescar la página');

  } catch (error) {
    console.error('❌ Error en el despliegue automático:', error);
    process.exit(1);
  }
}

// Ejecutar despliegue
autoDeploy();

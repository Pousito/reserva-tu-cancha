const { exec } = require('child_process');
const path = require('path');

/**
 * Sistema de commit automático para persistencia
 * Hace commit automático de los datos al repositorio
 */
function autoCommit() {
  console.log('🔄 INICIANDO COMMIT AUTOMÁTICO');
  console.log('==============================');
  
  const dataFile = process.env.NODE_ENV === 'production' 
    ? '/opt/render/project/src/data/reservations.json'
    : './data/reservations.json';
  
  console.log(`📁 Archivo de datos: ${dataFile}`);
  
  // Verificar si el archivo existe
  const fs = require('fs');
  if (!fs.existsSync(dataFile)) {
    console.log('❌ Archivo de datos no existe, no se puede hacer commit');
    return;
  }
  
  // Hacer commit automático
  const commands = [
    'git add data/reservations.json',
    'git commit -m "AUTO: Actualizar datos de reservas - ' + new Date().toISOString() + '"',
    'git push origin main'
  ];
  
  console.log('📤 Ejecutando commit automático...');
  
  exec(commands.join(' && '), (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error en commit automático:', error);
      return;
    }
    
    console.log('✅ Commit automático exitoso');
    console.log('📤 Datos enviados al repositorio');
  });
}

module.exports = { autoCommit };

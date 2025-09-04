const fs = require('fs');
const path = require('path');

// Ruta del archivo de respaldo
const backupFile = path.join(__dirname, 'data_backup.json');

/**
 * Guarda los datos de la base de datos en un archivo JSON
 */
function saveDataBackup(data) {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      ciudades: data.ciudades || [],
      reservas: data.reservas || []
    };
    
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log('✅ Datos guardados en respaldo JSON');
    return true;
  } catch (error) {
    console.error('❌ Error guardando respaldo:', error.message);
    return false;
  }
}

/**
 * Restaura los datos desde el archivo JSON
 */
function loadDataBackup() {
  try {
    if (!fs.existsSync(backupFile)) {
      console.log('📄 No existe archivo de respaldo');
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log(`✅ Datos restaurados desde respaldo (${data.reservas.length} reservas)`);
    return data;
  } catch (error) {
    console.error('❌ Error cargando respaldo:', error.message);
    return null;
  }
}

/**
 * Verifica si existe un respaldo válido
 */
function hasValidBackup() {
  try {
    return fs.existsSync(backupFile) && fs.statSync(backupFile).size > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  saveDataBackup,
  loadDataBackup,
  hasValidBackup
};

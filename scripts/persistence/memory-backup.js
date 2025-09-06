const fs = require('fs');
const path = require('path');

/**
 * Sistema de respaldo en memoria para plan gratuito de Render
 * Almacena los datos en un archivo JSON que se incluye en el código
 */
class MemoryBackupSystem {
  constructor() {
    this.backupFile = '/opt/render/project/src/data-backup.json';
    this.data = null;
  }

  // Cargar datos desde el archivo de respaldo
  loadBackup() {
    try {
      if (fs.existsSync(this.backupFile)) {
        const content = fs.readFileSync(this.backupFile, 'utf8');
        this.data = JSON.parse(content);
        console.log('✅ Datos cargados desde respaldo en memoria');
        return true;
      }
    } catch (error) {
      console.error('❌ Error cargando respaldo en memoria:', error);
    }
    return false;
  }

  // Guardar datos en el archivo de respaldo
  saveBackup(data) {
    try {
      this.data = data;
      fs.writeFileSync(this.backupFile, JSON.stringify(data, null, 2));
      console.log('✅ Datos guardados en respaldo en memoria');
      return true;
    } catch (error) {
      console.error('❌ Error guardando respaldo en memoria:', error);
      return false;
    }
  }

  // Obtener datos del respaldo
  getData() {
    return this.data;
  }

  // Verificar si hay datos disponibles
  hasData() {
    return this.data !== null && this.data.reservas && this.data.reservas.length > 0;
  }
}

module.exports = { MemoryBackupSystem };

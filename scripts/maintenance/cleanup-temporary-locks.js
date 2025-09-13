/**
 * Script para limpiar bloqueos temporales expirados
 * Ejecutar periódicamente para mantener la base de datos limpia
 */

const DatabaseManager = require('../../src/config/database');

class TemporaryLockCleaner {
  constructor() {
    this.db = new DatabaseManager();
  }

  async connect() {
    await this.db.connect();
  }

  async cleanupExpiredLocks() {
    try {
      console.log('🧹 Limpiando bloqueos temporales expirados...');
      
      const result = await this.db.run(
        'DELETE FROM bloqueos_temporales WHERE expira_en <= $1',
        [new Date().toISOString()]
      );
      
      if (result.changes > 0) {
        console.log(`✅ Limpiados ${result.changes} bloqueos temporales expirados`);
      } else {
        console.log('✅ No hay bloqueos temporales expirados');
      }
      
      return {
        success: true,
        cleaned: result.changes
      };
      
    } catch (error) {
      console.error('❌ Error limpiando bloqueos temporales:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getActiveLocks() {
    try {
      const locks = await this.db.query(`
        SELECT id, cancha_id, fecha, hora_inicio, hora_fin, 
               session_id, expira_en, creado_en
        FROM bloqueos_temporales 
        WHERE expira_en > $1
        ORDER BY creado_en DESC
      `, [new Date().toISOString()]);
      
      console.log(`📊 Bloqueos temporales activos: ${locks.length}`);
      
      return {
        success: true,
        locks: locks,
        count: locks.length
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo bloqueos activos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async close() {
    await this.db.close();
  }
}

// Ejecutar si se llama directamente
async function main() {
  const cleaner = new TemporaryLockCleaner();
  
  try {
    await cleaner.connect();
    
    // Limpiar bloqueos expirados
    const cleanupResult = await cleaner.cleanupExpiredLocks();
    console.log('🧹 Resultado de limpieza:', cleanupResult);
    
    // Mostrar bloqueos activos
    const activeLocks = await cleaner.getActiveLocks();
    console.log('📊 Bloqueos activos:', activeLocks);
    
  } catch (error) {
    console.error('❌ Error en script de limpieza:', error);
  } finally {
    await cleaner.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = TemporaryLockCleaner;

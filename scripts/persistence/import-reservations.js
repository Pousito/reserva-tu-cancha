const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Sistema de importación de reservas desde archivo JSON
 * Importa las reservas desde el archivo de respaldo en memoria
 */
function importReservations() {
  console.log('📥 IMPORTANDO RESERVAS DESDE RESPALDO');
  console.log('====================================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/data/database.sqlite';
  const importFile = '/opt/render/project/data/data-backup.json';
  
  // Verificar si existe el archivo de importación
  console.log(`🔍 Verificando archivo de respaldo: ${importFile}`);
  if (!fs.existsSync(importFile)) {
    console.log('ℹ️  No hay archivo de respaldo para importar');
    console.log(`❌ Archivo no encontrado: ${importFile}`);
    return false;
  }
  
  console.log(`✅ Archivo de respaldo encontrado: ${importFile}`);
  
  try {
    const content = fs.readFileSync(importFile, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`📅 Datos del respaldo: ${data.timestamp}`);
    console.log(`📊 Reservas en respaldo: ${data.reservas ? data.reservas.length : 0}`);
    
    if (!data.reservas || data.reservas.length === 0) {
      console.log('ℹ️  No hay reservas en el respaldo');
      return false;
    }
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error conectando a la base de datos:', err);
        return;
      }
      
      console.log(`✅ Conectado a la base de datos: ${dbPath}`);
      
      // Verificar si ya hay reservas
      db.get("SELECT COUNT(*) as count FROM reservas", (err, row) => {
        if (err) {
          console.error('❌ Error verificando reservas existentes:', err);
          return;
        }
        
        if (row.count > 0) {
          console.log(`ℹ️  Ya hay ${row.count} reservas en la base de datos`);
          return;
        }
        
        console.log('🔄 Importando reservas...');
        
        let imported = 0;
        data.reservas.forEach((reserva, index) => {
          db.run(`
            INSERT INTO reservas (
              codigo_reserva, nombre_cliente, rut_cliente, email_cliente,
              fecha, hora_inicio, hora_fin, precio_total, estado, cancha_id, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            reserva.codigo_reserva, reserva.nombre_cliente, reserva.rut_cliente,
            reserva.email_cliente, reserva.fecha, reserva.hora_inicio,
            reserva.hora_fin, reserva.precio_total, reserva.estado, 
            reserva.cancha_id, reserva.fecha_creacion || new Date().toISOString()
          ], function(err) {
            if (err) {
              console.error(`❌ Error importando reserva ${index + 1}:`, err);
            } else {
              console.log(`✅ Reserva importada: ${reserva.codigo_reserva}`);
              imported++;
            }
            
            // Verificar si terminamos
            if (index === data.reservas.length - 1) {
              console.log(`📊 Total de reservas importadas: ${imported}`);
              db.close();
            }
          });
        });
      });
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error importando reservas:', error);
    return false;
  }
}

module.exports = { importReservations };

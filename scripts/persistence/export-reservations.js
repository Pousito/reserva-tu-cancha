const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Sistema de exportación de reservas para persistencia
 * Exporta las reservas a un archivo JSON que se incluye en el código
 */
function exportReservations() {
  console.log('📤 EXPORTANDO RESERVAS PARA PERSISTENCIA');
  console.log('========================================');
  console.log('🔍 Función exportReservations() llamada correctamente');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/data/database.sqlite';
  const exportFile = process.env.NODE_ENV === 'production' 
    ? '/opt/render/project/src/data/reservations.json'  // En producción, guardar en código
    : './data/reservations.json';                       // En desarrollo, guardar localmente
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error conectando a la base de datos:', err);
      return;
    }
    
    console.log(`✅ Conectado a la base de datos: ${dbPath}`);
    
    // Exportar todas las tablas
    const exportData = {
      timestamp: new Date().toISOString(),
      reservas: [],
      complejos: [],
      canchas: [],
      ciudades: [],
      usuarios: []
    };
    
    // Exportar reservas
    db.all("SELECT * FROM reservas", (err, reservas) => {
      if (err) {
        console.error('❌ Error exportando reservas:', err);
        return;
      }
      
      exportData.reservas = reservas;
      console.log(`📊 Reservas exportadas: ${reservas.length}`);
      
      // Exportar complejos
      db.all("SELECT * FROM complejos", (err, complejos) => {
        if (err) {
          console.error('❌ Error exportando complejos:', err);
          return;
        }
        
        exportData.complejos = complejos;
        console.log(`🏢 Complejos exportados: ${complejos.length}`);
        
        // Exportar canchas
        db.all("SELECT * FROM canchas", (err, canchas) => {
          if (err) {
            console.error('❌ Error exportando canchas:', err);
            return;
          }
          
          exportData.canchas = canchas;
          console.log(`⚽ Canchas exportadas: ${canchas.length}`);
          
          // Exportar ciudades
          db.all("SELECT * FROM ciudades", (err, ciudades) => {
            if (err) {
              console.error('❌ Error exportando ciudades:', err);
              return;
            }
            
            exportData.ciudades = ciudades;
            console.log(`🌆 Ciudades exportadas: ${ciudades.length}`);
            
            // Exportar usuarios
            db.all("SELECT * FROM usuarios", (err, usuarios) => {
              if (err) {
                console.error('❌ Error exportando usuarios:', err);
                return;
              }
              
              exportData.usuarios = usuarios;
              console.log(`👥 Usuarios exportados: ${usuarios.length}`);
              
              // Guardar archivo de exportación
              try {
                // Asegurar que el directorio existe
                const exportDir = path.dirname(exportFile);
                if (!fs.existsSync(exportDir)) {
                  fs.mkdirSync(exportDir, { recursive: true });
                  console.log(`📁 Directorio creado: ${exportDir}`);
                }
                
                fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
                console.log(`✅ Datos exportados a: ${exportFile}`);
                console.log(`📊 Total de registros exportados: ${exportData.reservas.length + exportData.complejos.length + exportData.canchas.length + exportData.ciudades.length + exportData.usuarios.length}`);
                
                // Verificar que el archivo se creó correctamente
                if (fs.existsSync(exportFile)) {
                  const stats = fs.statSync(exportFile);
                  console.log(`📊 Tamaño del archivo de respaldo: ${stats.size} bytes`);
                  
                  // En producción, hacer commit automático
                  if (process.env.NODE_ENV === 'production') {
                    console.log('🔄 Iniciando commit automático...');
                    const { autoCommit } = require('./auto-commit');
                    setTimeout(() => {
                      autoCommit();
                    }, 2000);
                  }
                } else {
                  console.error('❌ El archivo de respaldo no se creó correctamente');
                }
              } catch (error) {
                console.error('❌ Error guardando archivo de exportación:', error);
              }
              
              db.close();
            });
          });
        });
      });
    });
  });
}

module.exports = { exportReservations };

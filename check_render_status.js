const sqlite3 = require('sqlite3').verbose();

// Función para verificar el estado de la base de datos en Render
function checkRenderDatabaseStatus() {
  console.log('🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS EN RENDER');
  console.log('==================================================');
  
  const dbPath = '/opt/render/project/src/database.sqlite';
  
  console.log(`📁 Ruta de BD: ${dbPath}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error conectando a la base de datos:', err.message);
      console.error('📍 Ruta intentada:', dbPath);
      return;
    }
    
    console.log(`✅ Conectado a la base de datos SQLite en: ${dbPath}`);
    checkDatabaseContent();
  });

  function checkDatabaseContent() {
    console.log('\n📊 VERIFICANDO CONTENIDO DE LA BASE DE DATOS:');
    console.log('==============================================');
    
    // Verificar ciudades
    db.get('SELECT COUNT(*) as count FROM ciudades', (err, row) => {
      if (err) {
        console.log('❌ Tabla ciudades no existe o hay error:', err.message);
      } else {
        console.log(`🏙️  Ciudades: ${row.count}`);
        if (row.count > 0) {
          db.all('SELECT nombre FROM ciudades LIMIT 5', (err, rows) => {
            if (!err && rows.length > 0) {
              console.log('   Ejemplos:', rows.map(r => r.nombre).join(', '));
            }
          });
        }
      }
    });

    // Verificar complejos
    db.get('SELECT COUNT(*) as count FROM complejos', (err, row) => {
      if (err) {
        console.log('❌ Tabla complejos no existe o hay error:', err.message);
      } else {
        console.log(`🏢 Complejos: ${row.count}`);
        if (row.count > 0) {
          db.all('SELECT nombre FROM complejos LIMIT 5', (err, rows) => {
            if (!err && rows.length > 0) {
              console.log('   Ejemplos:', rows.map(r => r.nombre).join(', '));
            }
          });
        }
      }
    });

    // Verificar canchas
    db.get('SELECT COUNT(*) as count FROM canchas', (err, row) => {
      if (err) {
        console.log('❌ Tabla canchas no existe o hay error:', err.message);
      } else {
        console.log(`⚽ Canchas: ${row.count}`);
        if (row.count > 0) {
          db.all('SELECT nombre, tipo, precio_hora FROM canchas LIMIT 5', (err, rows) => {
            if (!err && rows.length > 0) {
              console.log('   Ejemplos:', rows.map(r => `${r.nombre} (${r.tipo}) - $${r.precio_hora}`).join(', '));
            }
          });
        }
      }
    });

    // Verificar reservas
    db.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
      if (err) {
        console.log('❌ Tabla reservas no existe o hay error:', err.message);
      } else {
        console.log(`📅 Reservas: ${row.count}`);
        if (row.count > 0) {
          db.all('SELECT fecha, hora_inicio, nombre_cliente, estado FROM reservas LIMIT 5', (err, rows) => {
            if (!err && rows.length > 0) {
              console.log('   Ejemplos:', rows.map(r => `${r.fecha} ${r.hora_inicio} - ${r.nombre_cliente} (${r.estado})`).join(', '));
            }
          });
        } else {
          console.log('   ⚠️  No hay reservas en la base de datos');
        }
      }
    });

    // Verificar usuarios
    db.get('SELECT COUNT(*) as count FROM usuarios', (err, row) => {
      if (err) {
        console.log('❌ Tabla usuarios no existe o hay error:', err.message);
      } else {
        console.log(`👥 Usuarios: ${row.count}`);
        if (row.count > 0) {
          db.all('SELECT email, rol FROM usuarios LIMIT 5', (err, rows) => {
            if (!err && rows.length > 0) {
              console.log('   Ejemplos:', rows.map(r => `${r.email} (${r.rol})`).join(', '));
            }
          });
        }
      }
      
      // Cerrar la conexión después de verificar usuarios
      setTimeout(() => {
        console.log('\n✅ Verificación completada');
        db.close();
      }, 1000);
    });
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  checkRenderDatabaseStatus();
}

module.exports = { checkRenderDatabaseStatus };

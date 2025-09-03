const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== CONSULTA DE BASE DE DATOS ===');

// Verificar qué tablas existen
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Tablas en la base de datos:');
  tables.forEach(table => {
    console.log(`- ${table.name}`);
  });
  
  // Si existe la tabla reservas, consultar algunas reservas
  if (tables.some(t => t.name === 'reservas')) {
    db.all("SELECT * FROM reservas LIMIT 5", (err, rows) => {
      if (err) {
        console.error('Error consultando reservas:', err);
      } else {
        console.log('\nPrimeras 5 reservas:');
        rows.forEach((row, index) => {
          console.log(`${index + 1}. ID: ${row.id}, Fecha: ${row.fecha}, Hora: ${row.hora_inicio}, Cliente: ${row.nombre_cliente}`);
        });
      }
      db.close();
    });
  } else {
    console.log('\nLa tabla "reservas" no existe.');
    db.close();
  }
});

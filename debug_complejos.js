const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('=== DEBUG DE COMPLEJOS ===');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Consultar complejos
db.all(`
  SELECT c.*, ci.nombre as ciudad_nombre
  FROM complejos c
  JOIN ciudades ci ON c.ciudad_id = ci.id
  ORDER BY c.id
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Complejos en la base de datos:');
  rows.forEach((row, index) => {
    console.log(`${index + 1}. ID: ${row.id}, Nombre: ${row.nombre}`);
    console.log(`   Ciudad: ${row.ciudad_nombre} (ID: ${row.ciudad_id})`);
    console.log(`   Email: ${row.email}`);
    console.log('---');
  });
  
  // Consultar reservas por complejo
  db.all(`
    SELECT r.*, c.nombre as cancha_nombre, comp.nombre as complejo_nombre, comp.id as complejo_id
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    ORDER BY comp.id, r.fecha
  `, (err, reservas) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    
    console.log('\nReservas por complejo:');
    const reservasPorComplejo = {};
    reservas.forEach(reserva => {
      if (!reservasPorComplejo[reserva.complejo_id]) {
        reservasPorComplejo[reserva.complejo_id] = [];
      }
      reservasPorComplejo[reserva.complejo_id].push(reserva);
    });
    
    Object.keys(reservasPorComplejo).forEach(complejoId => {
      const reservasComplejo = reservasPorComplejo[complejoId];
      console.log(`\nComplejo ID ${complejoId} (${reservasComplejo[0].complejo_nombre}):`);
      console.log(`   Total reservas: ${reservasComplejo.length}`);
      reservasComplejo.forEach(reserva => {
        console.log(`   - ${reserva.cliente_nombre} - ${reserva.cancha_nombre} - ${reserva.fecha} ${reserva.hora_inicio}`);
      });
    });
    
    db.close();
  });
});

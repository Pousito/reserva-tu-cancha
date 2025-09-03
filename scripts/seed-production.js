const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear conexión a la base de datos
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos SQLite');
  seedDatabase();
});

function seedDatabase() {
  console.log('🌱 Poblando base de datos con datos de ejemplo...');
  
  db.serialize(() => {
    // Insertar ciudades
    const ciudades = [
      { nombre: 'Santiago' },
      { nombre: 'Valparaíso' },
      { nombre: 'Concepción' },
      { nombre: 'La Serena' },
      { nombre: 'Antofagasta' }
    ];

    ciudades.forEach(ciudad => {
      db.run('INSERT OR IGNORE INTO ciudades (nombre) VALUES (?)', [ciudad.nombre], function(err) {
        if (err) {
          console.error('Error insertando ciudad:', err);
        } else {
          console.log(`✅ Ciudad agregada: ${ciudad.nombre}`);
        }
      });
    });

    // Insertar complejos deportivos
    const complejos = [
      { nombre: 'Complejo Deportivo Central', ciudad: 'Santiago', direccion: 'Av. Providencia 123', telefono: '+56 2 2345 6789', email: 'info@central.com', descripcion: 'Complejo deportivo de primer nivel en el corazón de Santiago' },
      { nombre: 'Club Deportivo Norte', ciudad: 'Santiago', direccion: 'Las Condes 456', telefono: '+56 2 2345 6790', email: 'info@norte.com', descripcion: 'Club exclusivo con canchas de alta calidad' },
      { nombre: 'Centro Deportivo Costero', ciudad: 'Valparaíso', direccion: 'Playa Ancha 789', telefono: '+56 32 2345 6791', email: 'info@costero.com', descripcion: 'Complejo con vista al mar' },
      { nombre: 'Arena Deportiva Sur', ciudad: 'Concepción', direccion: 'San Pedro 321', telefono: '+56 41 2345 6792', email: 'info@surarena.com', descripcion: 'Arena moderna para todos los deportes' }
    ];

    complejos.forEach(complejo => {
      db.run(`
        INSERT OR IGNORE INTO complejos (nombre, ciudad_id, direccion, telefono, email, descripcion) 
        VALUES (?, (SELECT id FROM ciudades WHERE nombre = ?), ?, ?, ?, ?)
      `, [complejo.nombre, complejo.ciudad, complejo.direccion, complejo.telefono, complejo.email, complejo.descripcion], function(err) {
        if (err) {
          console.error('Error insertando complejo:', err);
        } else {
          console.log(`✅ Complejo agregado: ${complejo.nombre}`);
        }
      });
    });

    // Insertar canchas
    const canchas = [
      { nombre: 'Cancha 1 - Padel', tipo: 'padel', precio: 15000, complejo: 'Complejo Deportivo Central' },
      { nombre: 'Cancha 2 - Padel', tipo: 'padel', precio: 15000, complejo: 'Complejo Deportivo Central' },
      { nombre: 'Cancha 3 - Fútbol', tipo: 'futbol', precio: 25000, complejo: 'Complejo Deportivo Central' },
      { nombre: 'Cancha Premium Padel', tipo: 'padel', precio: 18000, complejo: 'Club Deportivo Norte' },
      { nombre: 'Cancha Fútbol 11', tipo: 'futbol', precio: 30000, complejo: 'Club Deportivo Norte' },
      { nombre: 'Cancha Costera Padel', tipo: 'padel', precio: 12000, complejo: 'Centro Deportivo Costero' },
      { nombre: 'Cancha Arena Sur', tipo: 'futbol', precio: 28000, complejo: 'Arena Deportiva Sur' }
    ];

    canchas.forEach(cancha => {
      db.run(`
        INSERT OR IGNORE INTO canchas (nombre, tipo, precio_hora, complejo_id, descripcion, activa) 
        VALUES (?, ?, ?, (SELECT id FROM complejos WHERE nombre = ?), ?, 1)
      `, [cancha.nombre, cancha.tipo, cancha.precio, cancha.complejo, `Cancha de ${cancha.tipo} de alta calidad`], function(err) {
        if (err) {
          console.error('Error insertando cancha:', err);
        } else {
          console.log(`✅ Cancha agregada: ${cancha.nombre}`);
        }
      });
    });

    // Insertar reservas de ejemplo
    const reservas = [
      { nombre: 'Juan Pérez', rut: '12345678-9', email: 'juan@email.com', cancha: 'Cancha 1 - Padel', fecha: '2025-01-15', hora_inicio: '10:00', hora_fin: '11:00', precio: 15000 },
      { nombre: 'María González', rut: '98765432-1', email: 'maria@email.com', cancha: 'Cancha 3 - Fútbol', fecha: '2025-01-16', hora_inicio: '15:00', hora_fin: '17:00', precio: 50000 },
      { nombre: 'Carlos Silva', rut: '45678912-3', email: 'carlos@email.com', cancha: 'Cancha Premium Padel', fecha: '2025-01-17', hora_inicio: '19:00', hora_fin: '20:00', precio: 18000 }
    ];

    reservas.forEach(reserva => {
      db.run(`
        INSERT OR IGNORE INTO reservas (nombre_cliente, rut_cliente, email_cliente, cancha_id, fecha, hora_inicio, hora_fin, precio_total, codigo_reserva, estado) 
        VALUES (?, ?, ?, (SELECT id FROM canchas WHERE nombre = ?), ?, ?, ?, ?, ?, 'confirmada')
      `, [reserva.nombre, reserva.rut, reserva.email, reserva.cancha, reserva.fecha, reserva.hora_inicio, reserva.hora_fin, reserva.precio, `RES${Date.now()}${Math.floor(Math.random() * 1000)}`], function(err) {
        if (err) {
          console.error('Error insertando reserva:', err);
        } else {
          console.log(`✅ Reserva agregada: ${reserva.nombre} - ${reserva.cancha}`);
        }
      });
    });

    // Verificar datos insertados
    setTimeout(() => {
      console.log('\n📊 Verificando datos insertados...');
      
      db.all('SELECT COUNT(*) as total FROM ciudades', (err, rows) => {
        if (!err) console.log(`🏙️ Ciudades: ${rows[0].total}`);
      });
      
      db.all('SELECT COUNT(*) as total FROM complejos', (err, rows) => {
        if (!err) console.log(`🏟️ Complejos: ${rows[0].total}`);
      });
      
      db.all('SELECT COUNT(*) as total FROM canchas', (err, rows) => {
        if (!err) console.log(`⚽ Canchas: ${rows[0].total}`);
      });
      
      db.all('SELECT COUNT(*) as total FROM reservas', (err, rows) => {
        if (!err) console.log(`📅 Reservas: ${rows[0].total}`);
      });
      
      console.log('\n🎉 Base de datos poblada exitosamente!');
      db.close();
    }, 2000);
  });
}

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Función para generar código de reserva único
function generateReservationCode() {
  return 'RES-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Función para poblar la base de datos con reservas de ejemplo
function populateWithSampleReservations() {
  return new Promise((resolve, reject) => {
    console.log('🌱 POBLANDO BASE DE DATOS CON RESERVAS DE EJEMPLO');
    console.log('==================================================');
    
    const dbPath = process.env.DB_PATH || '/opt/render/project/src/database.sqlite';
    
    console.log(`📁 Ruta de BD: ${dbPath}`);
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
        console.error('📍 Ruta intentada:', dbPath);
        reject(err);
        return;
      }
      
      console.log(`✅ Conectado a la base de datos SQLite en: ${dbPath}`);
      checkAndPopulate();
    });

  function checkAndPopulate() {
    console.log('🔍 Verificando estado actual de reservas...');
    
    // Verificar si ya hay reservas
    db.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
      if (err) {
        console.log('❌ Error verificando reservas:', err.message);
        return;
      }
      
      if (row.count > 0) {
        console.log(`⚠️  Ya existen ${row.count} reservas en la base de datos`);
        console.log('¿Deseas continuar y agregar más reservas de ejemplo? (S/N)');
        // En producción, continuamos automáticamente
        insertSampleReservations();
      } else {
        console.log('✅ No hay reservas, insertando ejemplos...');
        insertSampleReservations();
      }
    });
  }

  function insertSampleReservations() {
    console.log('\n📅 Insertando reservas de ejemplo...');
    
    // Obtener IDs de canchas disponibles
    db.all('SELECT id, nombre, tipo, precio_hora FROM canchas WHERE activa = 1 LIMIT 10', (err, canchas) => {
      if (err || !canchas || canchas.length === 0) {
        console.error('❌ No se pudieron obtener canchas:', err?.message || 'No hay canchas activas');
        db.close();
        return;
      }
      
      console.log(`✅ Encontradas ${canchas.length} canchas para reservas`);
      
      // Generar fechas para las próximas semanas
      const today = new Date();
      const reservations = [];
      
      // Crear reservas para diferentes fechas y horarios
      for (let i = 0; i < 15; i++) {
        const fecha = new Date(today);
        fecha.setDate(today.getDate() + i + 1); // Empezar desde mañana
        
        // Solo reservas para días de semana (lunes a viernes)
        if (fecha.getDay() >= 1 && fecha.getDay() <= 5) {
          const cancha = canchas[i % canchas.length];
          const horaInicio = 18 + (i % 4); // Horarios entre 18:00 y 21:00
          const horaFin = horaInicio + 1;
          
          reservations.push({
            cancha_id: cancha.id,
            fecha: fecha.toISOString().split('T')[0], // Formato YYYY-MM-DD
            hora_inicio: `${horaInicio.toString().padStart(2, '0')}:00`,
            hora_fin: `${horaFin.toString().padStart(2, '0')}:00`,
            nombre_cliente: `Cliente Ejemplo ${i + 1}`,
            rut_cliente: `${Math.floor(Math.random() * 99999999) + 10000000}`,
            email_cliente: `cliente${i + 1}@ejemplo.com`,
            codigo_reserva: generateReservationCode(),
            estado: i < 5 ? 'confirmada' : 'pendiente', // Las primeras 5 confirmadas
            precio_total: cancha.precio_hora
          });
        }
      }
      
      console.log(`📋 Preparando ${reservations.length} reservas de ejemplo...`);
      
      // Insertar reservas una por una
      let insertedCount = 0;
      reservations.forEach((reserva, index) => {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO reservas 
          (cancha_id, fecha, hora_inicio, hora_fin, nombre_cliente, rut_cliente, 
           email_cliente, codigo_reserva, estado, precio_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
          reserva.cancha_id,
          reserva.fecha,
          reserva.hora_inicio,
          reserva.hora_fin,
          reserva.nombre_cliente,
          reserva.rut_cliente,
          reserva.email_cliente,
          reserva.codigo_reserva,
          reserva.estado,
          reserva.precio_total
        ], function(err) {
          if (err) {
            console.error(`❌ Error insertando reserva ${index + 1}:`, err.message);
          } else {
            insertedCount++;
            console.log(`✅ Reserva ${index + 1} insertada: ${reserva.fecha} ${reserva.hora_inicio} - ${reserva.nombre_cliente}`);
          }
          
          stmt.finalize();
          
          // Si es la última reserva, mostrar resumen
          if (insertedCount === reservations.length || index === reservations.length - 1) {
            setTimeout(() => {
              console.log(`\n🎉 Proceso completado!`);
              console.log(`📊 Total de reservas insertadas: ${insertedCount}`);
              console.log(`📅 Fechas cubiertas: ${reservations.length} días`);
              console.log(`⚽ Canchas utilizadas: ${canchas.length}`);
              
              // Verificar el resultado final
              db.get('SELECT COUNT(*) as count FROM reservas', (err, row) => {
                if (!err) {
                  console.log(`📋 Total de reservas en BD: ${row.count}`);
                }
                db.close();
                resolve(`Proceso completado. Total de reservas: ${row?.count || 0}`);
              });
            }, 1000);
          }
        });
      });
    });
  }
  });
}

// Si se ejecuta directamente
if (require.main === module) {
  populateWithSampleReservations();
}

module.exports = { populateWithSampleReservations };

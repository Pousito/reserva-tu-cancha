const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

/**
 * Script de emergencia para insertar reservas directamente
 * Este script se ejecuta cuando el sistema de respaldos falla
 */
function insertEmergencyReservations() {
  console.log('🚨 INICIANDO INSERCIÓN DE EMERGENCIA');
  console.log('===================================');
  
  const dbPath = process.env.DB_PATH || '/opt/render/project/data/database.sqlite';
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error conectando a la base de datos:', err);
      return;
    }
    
    console.log(`✅ Conectado a la base de datos: ${dbPath}`);
    
    // Verificar si ya hay reservas
    db.get("SELECT COUNT(*) as count FROM reservas", (err, row) => {
      if (err) {
        console.error('❌ Error verificando reservas:', err);
        return;
      }
      
      if (row.count > 0) {
        console.log(`ℹ️  Ya hay ${row.count} reservas en la base de datos`);
        return;
      }
      
      console.log('🔄 Insertando reservas de emergencia...');
      
      // Insertar reservas de ejemplo
      const reservasEmergencia = [
        {
          codigo_reserva: 'EMERG001',
          nombre_cliente: 'Usuario de Prueba',
          rut_cliente: '12345678-9',
          email_cliente: 'test@example.com',
          fecha: '2025-09-06',
          hora_inicio: '16:00',
          hora_fin: '18:00',
          precio_total: 25000,
          estado: 'confirmada',
          cancha_id: 1
        },
        {
          codigo_reserva: 'EMERG002',
          nombre_cliente: 'Cliente Demo',
          rut_cliente: '98765432-1',
          email_cliente: 'demo@example.com',
          fecha: '2025-09-07',
          hora_inicio: '18:00',
          hora_fin: '20:00',
          precio_total: 30000,
          estado: 'pendiente',
          cancha_id: 2
        }
      ];
      
      let insertadas = 0;
      reservasEmergencia.forEach((reserva, index) => {
        db.run(`
          INSERT INTO reservas (
            codigo_reserva, nombre_cliente, rut_cliente, email_cliente,
            fecha, hora_inicio, hora_fin, precio_total, estado, cancha_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          reserva.codigo_reserva, reserva.nombre_cliente, reserva.rut_cliente,
          reserva.email_cliente, reserva.fecha, reserva.hora_inicio,
          reserva.hora_fin, reserva.precio_total, reserva.estado, reserva.cancha_id
        ], function(err) {
          if (err) {
            console.error(`❌ Error insertando reserva ${index + 1}:`, err);
          } else {
            console.log(`✅ Reserva insertada: ${reserva.codigo_reserva}`);
            insertadas++;
          }
          
          // Verificar si terminamos
          if (index === reservasEmergencia.length - 1) {
            console.log(`📊 Total de reservas insertadas: ${insertadas}`);
            db.close();
          }
        });
      });
    });
  });
}

module.exports = { insertEmergencyReservations };

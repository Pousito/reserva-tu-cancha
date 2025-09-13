const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para generar código de reserva único (5 caracteres)
function generateReservationCode() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Función para poblar la base de datos con reservas de ejemplo
async function populateWithSampleReservations() {
  try {
    console.log('🌱 POBLANDO BASE DE DATOS CON RESERVAS DE EJEMPLO');
    console.log('==================================================');
    
    console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`📊 Base de datos: PostgreSQL`);
    
    await checkAndPopulate();
    
  } catch (error) {
    console.error('❌ Error en populateWithSampleReservations:', error.message);
  } finally {
    await pool.end();
  }
}

async function checkAndPopulate() {
  try {
    // Verificar si ya hay reservas
    const reservasExistentes = await pool.query('SELECT COUNT(*) as count FROM reservas');
    const count = parseInt(reservasExistentes.rows[0].count);
    
    console.log(`📊 Reservas existentes: ${count}`);
    
    if (count > 0) {
      console.log('⚠️  Ya hay reservas en la base de datos');
      console.log('🔄 Eliminando reservas existentes...');
      await pool.query('DELETE FROM reservas');
      console.log('✅ Reservas existentes eliminadas');
    }
    
    // Verificar que existan canchas
    const canchas = await pool.query('SELECT * FROM canchas LIMIT 1');
    if (canchas.rows.length === 0) {
      console.log('❌ No hay canchas en la base de datos. Ejecuta primero el setup de datos básicos.');
      return;
    }
    
    const canchaId = canchas.rows[0].id;
    console.log(`⚽ Usando cancha ID: ${canchaId}`);
    
    // Generar reservas de ejemplo
    await generateSampleReservations(canchaId);
    
  } catch (error) {
    console.error('❌ Error en checkAndPopulate:', error.message);
  }
}

async function generateSampleReservations(canchaId) {
  console.log('\n🎯 GENERANDO RESERVAS DE EJEMPLO...');
  
  const reservasEjemplo = [
    {
      nombre: 'Juan Pérez',
      email: 'juan.perez@email.com',
      telefono: '+56912345678',
      rut: '12345678-9',
      fecha: '2025-09-15',
      hora_inicio: '16:00',
      hora_fin: '17:00',
      precio: 25000
    },
    {
      nombre: 'María González',
      email: 'maria.gonzalez@email.com',
      telefono: '+56987654321',
      rut: '98765432-1',
      fecha: '2025-09-15',
      hora_inicio: '18:00',
      hora_fin: '19:00',
      precio: 25000
    },
    {
      nombre: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@email.com',
      telefono: '+56911223344',
      rut: '11223344-5',
      fecha: '2025-09-16',
      hora_inicio: '17:00',
      hora_fin: '18:00',
      precio: 25000
    },
    {
      nombre: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      telefono: '+56955667788',
      rut: '55667788-9',
      fecha: '2025-09-16',
      hora_inicio: '19:00',
      hora_fin: '20:00',
      precio: 25000
    },
    {
      nombre: 'Luis Fernández',
      email: 'luis.fernandez@email.com',
      telefono: '+56999887766',
      rut: '99887766-5',
      fecha: '2025-09-17',
      hora_inicio: '16:00',
      hora_fin: '17:00',
      precio: 25000
    }
  ];
  
  let reservasCreadas = 0;
  
  for (const reserva of reservasEjemplo) {
    try {
      const codigoReserva = generateReservationCode();
      
      const result = await pool.query(`
        INSERT INTO reservas (
          codigo_reserva, cancha_id, nombre_cliente, email_cliente, 
          telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin, 
          precio_total, estado, estado_pago, fecha_creacion
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        codigoReserva,
        canchaId,
        reserva.nombre,
        reserva.email,
        reserva.telefono,
        reserva.rut,
        reserva.fecha,
        reserva.hora_inicio,
        reserva.hora_fin,
        reserva.precio,
        'confirmada',
        'pagado',
        new Date().toISOString()
      ]);
      
      console.log(`✅ Reserva creada: ${codigoReserva} - ${reserva.nombre} (${reserva.fecha} ${reserva.hora_inicio})`);
      reservasCreadas++;
      
    } catch (error) {
      console.error(`❌ Error creando reserva para ${reserva.nombre}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Población completada: ${reservasCreadas} reservas creadas`);
  
  // Verificar reservas creadas
  const totalReservas = await pool.query('SELECT COUNT(*) as count FROM reservas');
  console.log(`📊 Total de reservas en la base de datos: ${totalReservas.rows[0].count}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  populateWithSampleReservations();
}

module.exports = { populateWithSampleReservations };
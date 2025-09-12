const { Pool } = require('pg');
require('dotenv').config();

/**
 * Script de emergencia para insertar reservas directamente
 * Este script se ejecuta cuando el sistema de respaldos falla
 * ACTUALIZADO: Ahora usa PostgreSQL en lugar de SQLite
 */
async function insertEmergencyReservations() {
  console.log('🚨 INICIANDO INSERCIÓN DE EMERGENCIA');
  console.log('===================================');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    return;
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Verificar si ya hay reservas
    const countResult = await client.query('SELECT COUNT(*) as count FROM reservas');
    const existingCount = countResult.rows[0].count;
    
    if (existingCount > 0) {
      console.log(`⚠️ Ya existen ${existingCount} reservas en la base de datos`);
      console.log('✅ Sistema funcionando correctamente, no se requiere inserción de emergencia');
      client.release();
      await pool.end();
      return;
    }
    
    console.log('⚠️ No se encontraron reservas, iniciando inserción de emergencia...');
    
    // Verificar que existan ciudades, complejos y canchas
    const ciudadesResult = await client.query('SELECT COUNT(*) as count FROM ciudades');
    const complejosResult = await client.query('SELECT COUNT(*) as count FROM complejos');
    const canchasResult = await client.query('SELECT COUNT(*) as count FROM canchas');
    
    if (ciudadesResult.rows[0].count === 0 || complejosResult.rows[0].count === 0 || canchasResult.rows[0].count === 0) {
      console.log('❌ Error: No hay ciudades, complejos o canchas en la base de datos');
      console.log('💡 Ejecuta primero el script de configuración de la base de datos');
      client.release();
      await pool.end();
      return;
    }
    
    // Obtener la primera cancha disponible
    const canchaResult = await client.query('SELECT id, nombre, precio_hora FROM canchas LIMIT 1');
    if (canchaResult.rows.length === 0) {
      console.log('❌ Error: No se encontraron canchas');
      client.release();
      await pool.end();
      return;
    }
    
    const cancha = canchaResult.rows[0];
    console.log(`📋 Usando cancha: ${cancha.nombre} (ID: ${cancha.id})`);
    
    // Insertar reserva de emergencia
    const codigoReserva = `EMERG${Date.now().toString().slice(-6)}`;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 1); // Reserva para mañana
    
    const insertResult = await client.query(`
      INSERT INTO reservas (
        codigo_reserva, cancha_id, usuario_id, nombre_cliente, 
        email_cliente, telefono_cliente, fecha, hora_inicio, 
        hora_fin, estado, estado_pago, precio_total
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      codigoReserva,
      cancha.id,
      'Cliente Emergencia',
      'emergencia@reservatuscanchas.cl',
      '+56900000000',
      fecha.toISOString().split('T')[0], // YYYY-MM-DD
      '10:00:00',
      '11:00:00',
      'confirmada',
      'pagado',
      cancha.precio_hora
    ]);
    
    const reservaId = insertResult.rows[0].id;
    
    console.log('✅ Reserva de emergencia creada exitosamente:');
    console.log(`   📋 Código: ${codigoReserva}`);
    console.log(`   🏟️ Cancha: ${cancha.nombre}`);
    console.log(`   📅 Fecha: ${fecha.toISOString().split('T')[0]}`);
    console.log(`   🕐 Horario: 10:00 - 11:00`);
    console.log(`   💰 Precio: $${cancha.precio_hora}`);
    console.log(`   🆔 ID: ${reservaId}`);
    
    client.release();
    await pool.end();
    
    console.log('🎉 Inserción de emergencia completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante inserción de emergencia:', error.message);
    if (pool) {
      await pool.end();
    }
    throw error;
  }
}

module.exports = { insertEmergencyReservations };
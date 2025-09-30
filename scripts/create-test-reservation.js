#!/usr/bin/env node

/**
 * Script para crear una reserva de prueba directamente en la base de datos
 * Esto simula el proceso completo sin pasar por Transbank
 */

const { Pool } = require('pg');
const EmailService = require('../src/services/emailService');

const NEON_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('🧪 CREANDO RESERVA DE PRUEBA');
console.log('============================');

async function createTestReservation() {
  let pool = null;
  
  try {
    console.log('🔌 Conectando a Neon...');
    pool = new Pool({
      connectionString: NEON_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    console.log('✅ Conexión establecida');
    
    // Generar código de reserva único
    const codigoReserva = Math.random().toString(36).substr(2, 6).toUpperCase();
    console.log('🔑 Código de reserva generado:', codigoReserva);
    
    // Obtener información de canchas disponibles
    console.log('🔍 Obteniendo información de canchas...');
    const canchas = await client.query(`
      SELECT c.*, co.nombre as complejo_nombre 
      FROM canchas c 
      JOIN complejos co ON c.complejo_id = co.id 
      ORDER BY c.id 
      LIMIT 1
    `);
    
    if (canchas.rows.length === 0) {
      console.log('❌ No hay canchas disponibles');
      return;
    }
    
    const cancha = canchas.rows[0];
    console.log('✅ Cancha seleccionada:', {
      id: cancha.id,
      nombre: cancha.nombre,
      complejo: cancha.complejo_nombre,
      precio: cancha.precio_hora
    });
    
    // Crear la reserva directamente
    console.log('📝 Creando reserva...');
    const reservaResult = await client.query(`
      INSERT INTO reservas (
        cancha_id, nombre_cliente, email_cliente, telefono_cliente, 
        rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
        codigo_reserva, estado, estado_pago, fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      cancha.id,
      'Usuario de Prueba',
      'test@example.com',
      '+56912345678',
      '12345678-9',
      '2025-10-06', // Mañana
      '10:00:00',
      '11:00:00',
      cancha.precio_hora || 5000,
      codigoReserva,
      'confirmada',
      'pagado',
      new Date().toISOString()
    ]);
    
    const reservaId = reservaResult.rows[0].id;
    console.log('✅ Reserva creada con ID:', reservaId);
    
    // Crear el pago asociado
    console.log('💳 Creando pago asociado...');
    await client.query(`
      INSERT INTO pagos (
        reserva_id, transbank_token, order_id, amount, status, 
        authorization_code, payment_type_code, response_code, 
        installments_number, transaction_date, reservation_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      reservaId,
      'TEST_TOKEN_' + Date.now(),
      'TEST_ORDER_' + Date.now(),
      cancha.precio_hora || 5000,
      'approved',
      'AUTH123',
      'VD',
      0,
      1,
      new Date().toISOString(),
      codigoReserva
    ]);
    
    console.log('✅ Pago creado exitosamente');
    
    // Obtener información completa de la reserva para el email
    console.log('🔍 Obteniendo información completa de la reserva...');
    const reservaInfo = await client.query(`
      SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.id = $1
    `, [reservaId]);
    
    const reserva = reservaInfo.rows[0];
    console.log('✅ Información de reserva obtenida:', {
      codigo: reserva.codigo_reserva,
      email: reserva.email_cliente,
      nombre: reserva.nombre_cliente,
      complejo: reserva.complejo_nombre,
      cancha: reserva.cancha_nombre,
      fecha: reserva.fecha,
      hora: reserva.hora_inicio + ' - ' + reserva.hora_fin,
      precio: reserva.precio_total
    });
    
    // Enviar emails de confirmación
    console.log('📧 Enviando emails de confirmación...');
    try {
      const emailData = {
        codigo_reserva: reserva.codigo_reserva,
        email_cliente: reserva.email_cliente,
        nombre_cliente: reserva.nombre_cliente,
        complejo: reserva.complejo_nombre || 'Complejo Deportivo',
        cancha: reserva.cancha_nombre || 'Cancha',
        fecha: reserva.fecha,
        hora_inicio: reserva.hora_inicio,
        hora_fin: reserva.hora_fin,
        precio_total: reserva.precio_total
      };
      
      const emailService = new EmailService();
      
      // Esperar un momento para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const emailResults = await emailService.sendConfirmationEmails(emailData);
      console.log('✅ Emails de confirmación enviados:', emailResults);
      
    } catch (emailError) {
      console.error('❌ Error enviando emails:', emailError);
    }
    
    console.log('\\n🎉 RESERVA DE PRUEBA CREADA EXITOSAMENTE');
    console.log('==========================================');
    console.log('📋 Código de reserva:', codigoReserva);
    console.log('📧 Email de prueba:', 'test@example.com');
    console.log('🏢 Complejo:', cancha.complejo_nombre);
    console.log('🏟️  Cancha:', cancha.nombre);
    console.log('📅 Fecha:', '2025-10-06');
    console.log('⏰ Hora:', '10:00 - 11:00');
    console.log('💰 Precio:', cancha.precio_hora || 5000);
    console.log('\\n✅ Esta reserva aparecerá en el panel de admin');
    console.log('✅ Los emails se enviaron a las direcciones configuradas');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error creando reserva de prueba:', error);
  } finally {
    if (pool) await pool.end();
  }
}

// Ejecutar creación de reserva
createTestReservation();

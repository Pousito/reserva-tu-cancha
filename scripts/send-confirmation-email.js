#!/usr/bin/env node

/**
 * Script para enviar manualmente email de confirmación
 */

const { Pool } = require('pg');
const EmailService = require('../src/services/emailService');

const NEON_URL = 'postgresql://neondb_owner:npg_f82FRVWLvjiE@ep-quiet-dust-adp93fdf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

console.log('📧 ENVIANDO EMAIL DE CONFIRMACIÓN MANUAL');
console.log('========================================');

async function sendConfirmationEmail() {
  let pool = null;
  
  try {
    console.log('🔌 Conectando a Neon...');
    pool = new Pool({
      connectionString: NEON_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    console.log('✅ Conexión establecida');
    
    // Buscar la reserva 8ICAAR
    console.log('🔍 Buscando reserva 8ICAAR...');
    const reserva = await client.query(`
      SELECT r.*, c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
      FROM reservas r
      JOIN canchas c ON r.cancha_id = c.id
      JOIN complejos co ON c.complejo_id = co.id
      WHERE r.codigo_reserva = $1
    `, ['8ICAAR']);
    
    if (reserva.rows.length === 0) {
      console.log('❌ Reserva no encontrada');
      return;
    }
    
    const reservaData = reserva.rows[0];
    console.log('✅ Reserva encontrada:');
    console.log('   Código:', reservaData.codigo_reserva);
    console.log('   Email:', reservaData.email_cliente);
    console.log('   Nombre:', reservaData.nombre_cliente);
    console.log('   Complejo:', reservaData.complejo_nombre);
    console.log('   Cancha:', reservaData.cancha_nombre);
    console.log('   Fecha:', reservaData.fecha);
    console.log('   Hora:', reservaData.hora_inicio, '-', reservaData.hora_fin);
    console.log('   Precio:', reservaData.precio_total);
    
    // Preparar datos para el email
    const emailData = {
      codigo_reserva: reservaData.codigo_reserva,
      email_cliente: reservaData.email_cliente,
      nombre_cliente: reservaData.nombre_cliente,
      complejo: reservaData.complejo_nombre || 'Complejo Deportivo',
      cancha: reservaData.cancha_nombre || 'Cancha',
      fecha: reservaData.fecha,
      hora_inicio: reservaData.hora_inicio,
      hora_fin: reservaData.hora_fin,
      precio_total: reservaData.precio_total
    };
    
    console.log('\\n📤 Enviando email de confirmación...');
    const emailService = new EmailService();
    
    // Esperar un momento para que se inicialice
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await emailService.sendConfirmationEmails(emailData);
    
    console.log('✅ Resultado del envío:', result);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error enviando email:', error);
  } finally {
    if (pool) await pool.end();
  }
}

// Ejecutar envío
sendConfirmationEmail();
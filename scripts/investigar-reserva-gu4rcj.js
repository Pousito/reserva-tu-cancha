/**
 * Script para investigar la reserva GU4RCJ
 * Verifica: estado, quién la creó, si tiene precio, si se envió email, por qué no está en control financiero
 */

require('dotenv').config();
const { Pool } = require('pg');

// Configuración de base de datos de producción
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function investigarReserva() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando reserva GU4RCJ...\n');
    
    // 1. Buscar reserva (case insensitive)
    console.log('🔍 Buscando reserva (case insensitive)...');
    const reservaQuery = `
      SELECT 
        r.*,
        c.nombre as cancha_nombre,
        c.complejo_id,
        comp.nombre as complejo_nombre,
        u.email as creado_por_email,
        u.nombre as creado_por_nombre,
        u.rol as creado_por_rol
      FROM reservas r
      LEFT JOIN canchas c ON r.cancha_id = c.id
      LEFT JOIN complejos comp ON c.complejo_id = comp.id
      LEFT JOIN usuarios u ON r.admin_id = u.id
      WHERE UPPER(r.codigo_reserva) = UPPER('GU4RCJ')
    `;
    
    const reservaResult = await client.query(reservaQuery);
    
    if (reservaResult.rows.length === 0) {
      console.log('❌ Reserva GU4RCJ no encontrada');
      console.log('');
      console.log('🔍 Buscando todas las reservas del complejo Borde Río para verificar...');
      
      // Buscar todas las reservas del complejo Borde Río (ID 7 en producción)
      const todasReservasQuery = `
        SELECT 
          r.codigo_reserva,
          r.estado,
          r.tipo_reserva,
          r.precio_total,
          r.monto_abonado,
          r.created_at,
          comp.nombre as complejo_nombre
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        JOIN complejos comp ON c.complejo_id = comp.id
        WHERE comp.id = 7 OR comp.nombre ILIKE '%borde%rio%'
        ORDER BY r.created_at DESC
        LIMIT 10
      `;
      
      const todasReservas = await client.query(todasReservasQuery);
      console.log(`\n📋 Últimas ${todasReservas.rows.length} reservas del complejo:`);
      todasReservas.rows.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.codigo_reserva} - ${r.estado} - $${r.precio_total || 0} - ${r.created_at}`);
      });
      
      return;
    }
    
    const reserva = reservaResult.rows[0];
    
    console.log('📋 INFORMACIÓN DE LA RESERVA:');
    console.log('================================');
    console.log(`Código: ${reserva.codigo_reserva}`);
    console.log(`Estado: ${reserva.estado}`);
    console.log(`Estado Pago: ${reserva.estado_pago}`);
    console.log(`Tipo Reserva: ${reserva.tipo_reserva || 'NO DEFINIDO'}`);
    console.log(`Creada por Admin: ${reserva.creada_por_admin ? 'SÍ' : 'NO'}`);
    console.log(`Admin ID: ${reserva.admin_id || 'NO DEFINIDO'}`);
    console.log(`Creado por Email: ${reserva.creado_por_email || 'NO DEFINIDO'}`);
    console.log(`Creado por Nombre: ${reserva.creado_por_nombre || 'NO DEFINIDO'}`);
    console.log(`Creado por Rol: ${reserva.creado_por_rol || 'NO DEFINIDO'}`);
    console.log(`Complejo: ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
    console.log(`Cancha: ${reserva.cancha_nombre} (ID: ${reserva.cancha_id})`);
    console.log(`Cliente: ${reserva.nombre_cliente}`);
    console.log(`Email Cliente: ${reserva.email_cliente || 'NO DEFINIDO'}`);
    console.log(`Teléfono: ${reserva.telefono_cliente || 'NO DEFINIDO'}`);
    console.log(`Fecha: ${reserva.fecha}`);
    console.log(`Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
    console.log(`Precio Total: $${reserva.precio_total || 0}`);
    console.log(`Monto Abonado: $${reserva.monto_abonado || 0}`);
    console.log(`Porcentaje Pagado: ${reserva.porcentaje_pagado || 0}%`);
    console.log(`Método Pago: ${reserva.metodo_pago || 'NO DEFINIDO'}`);
    console.log(`Comisión Aplicada: $${reserva.comision_aplicada || 0}`);
    console.log(`Fecha Creación: ${reserva.created_at || reserva.fecha_creacion}`);
    console.log('');
    
    // 2. Verificar si existe en control financiero
    console.log('💰 VERIFICACIÓN EN CONTROL FINANCIERO:');
    console.log('======================================');
    const ingresoQuery = `
      SELECT * FROM gastos_ingresos
      WHERE descripcion LIKE '%GU4RCJ%'
      OR descripcion LIKE '%Reserva #GU4RCJ%'
    `;
    
    const ingresoResult = await client.query(ingresoQuery);
    
    if (ingresoResult.rows.length === 0) {
      console.log('❌ NO se encontró registro en control financiero');
      console.log('');
      console.log('🔍 RAZONES POSIBLES:');
      console.log('====================');
      
      if (reserva.estado !== 'confirmada') {
        console.log(`❌ Estado no es 'confirmada': ${reserva.estado}`);
        console.log('   → El trigger solo se ejecuta cuando estado = "confirmada"');
      }
      
      if (!reserva.precio_total || reserva.precio_total <= 0) {
        console.log(`❌ Precio total inválido: $${reserva.precio_total || 0}`);
        console.log('   → El trigger solo crea ingresos si precio_total > 0');
      }
      
      // Verificar si existe la categoría
      const categoriaQuery = `
        SELECT id, nombre FROM categorias_gastos
        WHERE complejo_id = $1
        AND tipo = 'ingreso'
        AND (nombre = 'Reservas Web' OR nombre = 'Reservas Administrativas')
      `;
      const categoriaResult = await client.query(categoriaQuery, [reserva.complejo_id]);
      
      if (categoriaResult.rows.length === 0) {
        console.log('❌ No existe categoría de ingresos para este complejo');
        console.log('   → El trigger requiere categoría "Reservas Web" o "Reservas Administrativas"');
      } else {
        console.log(`✅ Categorías encontradas: ${categoriaResult.rows.map(c => c.nombre).join(', ')}`);
      }
      
    } else {
      console.log(`✅ Se encontraron ${ingresoResult.rows.length} registro(s) en control financiero:`);
      ingresoResult.rows.forEach((ingreso, index) => {
        console.log(`\n   Registro ${index + 1}:`);
        console.log(`   - ID: ${ingreso.id}`);
        console.log(`   - Tipo: ${ingreso.tipo}`);
        console.log(`   - Monto: $${ingreso.monto}`);
        console.log(`   - Descripción: ${ingreso.descripcion}`);
        console.log(`   - Fecha: ${ingreso.fecha}`);
        console.log(`   - Método Pago: ${ingreso.metodo_pago}`);
      });
    }
    console.log('');
    
    // 3. Verificar si se envió email
    console.log('📧 VERIFICACIÓN DE EMAIL:');
    console.log('=========================');
    
    if (!reserva.email_cliente) {
      console.log('❌ NO hay email del cliente registrado');
      console.log('   → No se puede enviar email sin email_cliente');
    } else {
      console.log(`✅ Email del cliente: ${reserva.email_cliente}`);
      console.log('');
      console.log('⚠️  NOTA: No hay registro en BD de si se envió el email');
      console.log('   El sistema envía emails pero no guarda un log de envío');
      console.log('   Posibles razones por las que no se envió:');
      console.log('   - Error en configuración SMTP');
      console.log('   - Error al enviar (capturado en try-catch)');
      console.log('   - Email_cliente estaba vacío al momento de crear la reserva');
    }
    console.log('');
    
    // 4. Verificar trigger
    console.log('🔧 VERIFICACIÓN DEL TRIGGER:');
    console.log('============================');
    
    const triggerQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'reservas'
      AND trigger_name LIKE '%sincronizar%'
    `;
    
    const triggerResult = await client.query(triggerQuery);
    
    if (triggerResult.rows.length === 0) {
      console.log('❌ NO se encontró trigger de sincronización');
      console.log('   → Esto explicaría por qué no se registró en control financiero');
    } else {
      console.log(`✅ Trigger encontrado: ${triggerResult.rows[0].trigger_name}`);
      console.log(`   Evento: ${triggerResult.rows[0].event_manipulation}`);
      console.log(`   Tabla: ${triggerResult.rows[0].event_object_table}`);
    }
    console.log('');
    
    // 5. Resumen y diagnóstico
    console.log('📊 DIAGNÓSTICO FINAL:');
    console.log('======================');
    
    const problemas = [];
    const correcto = [];
    
    if (reserva.estado !== 'confirmada') {
      problemas.push(`Estado es "${reserva.estado}" en lugar de "confirmada"`);
    } else {
      correcto.push('Estado es "confirmada"');
    }
    
    if (!reserva.precio_total || reserva.precio_total <= 0) {
      problemas.push(`Precio total es $${reserva.precio_total || 0} (debe ser > 0)`);
    } else {
      correcto.push(`Precio total válido: $${reserva.precio_total}`);
    }
    
    if (!reserva.email_cliente) {
      problemas.push('No hay email del cliente registrado');
    } else {
      correcto.push(`Email del cliente: ${reserva.email_cliente}`);
    }
    
    if (ingresoResult.rows.length === 0) {
      problemas.push('No está registrada en control financiero');
    } else {
      correcto.push('Está registrada en control financiero');
    }
    
    if (reserva.tipo_reserva !== 'administrativa' && reserva.tipo_reserva !== 'directa') {
      problemas.push(`Tipo de reserva no definido: "${reserva.tipo_reserva}"`);
    } else {
      correcto.push(`Tipo de reserva: ${reserva.tipo_reserva}`);
    }
    
    if (correcto.length > 0) {
      console.log('\n✅ CORRECTO:');
      correcto.forEach(item => console.log(`   ✓ ${item}`));
    }
    
    if (problemas.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      problemas.forEach(item => console.log(`   ✗ ${item}`));
    }
    
    console.log('\n');
    console.log('💡 CONCLUSIÓN:');
    console.log('==============');
    
    if (problemas.length === 0) {
      console.log('✅ La reserva parece estar correcta. Si no está en control financiero,');
      console.log('   puede ser que el trigger no se ejecutó o hubo un error silencioso.');
    } else {
      console.log('❌ Se encontraron problemas que explican por qué:');
      if (reserva.estado !== 'confirmada') {
        console.log('   1. El trigger solo se ejecuta cuando estado = "confirmada"');
      }
      if (!reserva.precio_total || reserva.precio_total <= 0) {
        console.log('   2. El trigger solo crea ingresos si precio_total > 0');
      }
      if (!reserva.email_cliente) {
        console.log('   3. No se puede enviar email sin email_cliente');
      }
    }
    
  } catch (error) {
    console.error('❌ Error investigando reserva:', error);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
investigarReserva().catch(console.error);


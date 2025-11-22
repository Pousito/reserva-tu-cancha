#!/usr/bin/env node

/**
 * Script para investigar la reserva GU4RCJ en producción
 * Verifica: estado, precio, email, control financiero, trigger, quién la creó
 */

const { Pool } = require('pg');

// URL de conexión a la base de datos de Render (PRODUCCIÓN)
// Forzar conexión a producción ignorando .env local
const DATABASE_URL = 'postgresql://postgres:r1a3b5c7d9e11f13g15h17i19j21k23l25m27n29o31p33@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reservatucancha_db';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada');
  console.log('💡 Asegúrate de tener la variable de entorno DATABASE_URL configurada');
  process.exit(1);
}

async function investigarReserva() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  let client = null;
  
  try {
    console.log('🔌 Conectando a base de datos de producción...');
    console.log('🔗 URL:', DATABASE_URL.includes('render.com') ? 'Render (producción)' : 'Local');
    client = await pool.connect();
    console.log('✅ Conectado\n');
    
    // 1. Obtener información completa de la reserva
    console.log('📋 INFORMACIÓN DE LA RESERVA GU4RCJ:');
    console.log('═══════════════════════════════════════════════════════');
    
    const reservaQuery = `
      SELECT 
        r.*,
        c.nombre as cancha_nombre,
        c.complejo_id,
        comp.nombre as complejo_nombre,
        u.email as creado_por_email,
        u.nombre as creado_por_nombre,
        u.rol as creado_por_rol,
        u.id as creado_por_id
      FROM reservas r
      LEFT JOIN canchas c ON r.cancha_id = c.id
      LEFT JOIN complejos comp ON c.complejo_id = comp.id
      LEFT JOIN usuarios u ON r.admin_id = u.id
      WHERE UPPER(r.codigo_reserva) = UPPER($1)
    `;
    
    const reservaResult = await client.query(reservaQuery, ['GU4RCJ']);
    
    if (reservaResult.rows.length === 0) {
      console.log('❌ Reserva GU4RCJ no encontrada');
      
      // Buscar reservas recientes del complejo Borde Río
      console.log('\n🔍 Buscando reservas recientes del complejo Borde Río...');
      const recientes = await client.query(`
        SELECT 
          r.codigo_reserva,
          r.estado,
          r.tipo_reserva,
          r.precio_total,
          r.monto_abonado,
          r.email_cliente,
          TO_CHAR(r.created_at, 'YYYY-MM-DD HH24:MI:SS') as fecha_creacion,
          comp.nombre as complejo_nombre
        FROM reservas r
        JOIN canchas c ON r.cancha_id = c.id
        JOIN complejos comp ON c.complejo_id = comp.id
        WHERE comp.id = 7 OR comp.nombre ILIKE '%borde%rio%'
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      
      console.log(`\n📋 Últimas ${recientes.rows.length} reservas del complejo:`);
      recientes.rows.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.codigo_reserva} - ${r.estado} - $${r.precio_total || 0} - ${r.email_cliente || 'SIN EMAIL'} - ${r.fecha_creacion}`);
      });
      
      return;
    }
    
    const reserva = reservaResult.rows[0];
    
    console.log(`Código: ${reserva.codigo_reserva}`);
    console.log(`Estado: ${reserva.estado}`);
    console.log(`Estado Pago: ${reserva.estado_pago || 'NO DEFINIDO'}`);
    console.log(`Tipo Reserva: ${reserva.tipo_reserva || 'NO DEFINIDO'}`);
    console.log(`Creada por Admin: ${reserva.creada_por_admin ? 'SÍ' : 'NO'}`);
    console.log(`Admin ID: ${reserva.admin_id || 'NO DEFINIDO'}`);
    console.log(`Creado por Email: ${reserva.creado_por_email || 'NO DEFINIDO'}`);
    console.log(`Creado por Nombre: ${reserva.creado_por_nombre || 'NO DEFINIDO'}`);
    console.log(`Creado por Rol: ${reserva.creado_por_rol || 'NO DEFINIDO'}`);
    console.log(`Complejo: ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
    console.log(`Cancha: ${reserva.cancha_nombre} (ID: ${reserva.cancha_id})`);
    console.log(`Cliente: ${reserva.nombre_cliente}`);
    console.log(`Email Cliente: ${reserva.email_cliente || '❌ NO DEFINIDO'}`);
    console.log(`Teléfono: ${reserva.telefono_cliente || 'NO DEFINIDO'}`);
    console.log(`RUT: ${reserva.rut_cliente || 'NO DEFINIDO'}`);
    console.log(`Fecha: ${reserva.fecha}`);
    console.log(`Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
    console.log(`Precio Total: $${reserva.precio_total || 0}`);
    console.log(`Monto Abonado: $${reserva.monto_abonado || 0}`);
    console.log(`Porcentaje Pagado: ${reserva.porcentaje_pagado || 0}%`);
    console.log(`Método Pago: ${reserva.metodo_pago || 'NO DEFINIDO'}`);
    console.log(`Comisión Aplicada: $${reserva.comision_aplicada || 0}`);
    console.log(`Fecha Creación: ${reserva.created_at || reserva.fecha_creacion}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // 2. Verificar si existe en control financiero
    console.log('💰 VERIFICACIÓN EN CONTROL FINANCIERO:');
    console.log('═══════════════════════════════════════════════════════');
    
    const ingresoQuery = `
      SELECT * FROM gastos_ingresos
      WHERE descripcion LIKE '%GU4RCJ%'
      OR descripcion LIKE '%Reserva #GU4RCJ%'
      ORDER BY created_at DESC
    `;
    
    const ingresoResult = await client.query(ingresoQuery);
    
    if (ingresoResult.rows.length === 0) {
      console.log('❌ NO se encontró registro en control financiero\n');
      
      // Verificar las otras dos reservas que SÍ están
      console.log('🔍 Verificando reservas VIZJ4P e ISLTLF que SÍ están en control financiero:');
      const otrasReservas = await client.query(`
        SELECT 
          r.codigo_reserva,
          r.estado,
          r.precio_total,
          r.monto_abonado,
          COUNT(gi.id) as registros_financieros
        FROM reservas r
        LEFT JOIN gastos_ingresos gi ON gi.descripcion LIKE '%' || r.codigo_reserva || '%'
        WHERE r.codigo_reserva IN ('VIZJ4P', 'ISLTLF')
        GROUP BY r.codigo_reserva, r.estado, r.precio_total, r.monto_abonado
      `);
      
      otrasReservas.rows.forEach(r => {
        console.log(`   ${r.codigo_reserva}: Estado=${r.estado}, Precio=$${r.precio_total}, Registros=${r.registros_financieros}`);
      });
      console.log('');
      
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
        console.log(`   - Creado: ${ingreso.created_at || ingreso.creado_en}`);
      });
      console.log('');
    }
    
    // 3. Verificar categorías de gastos del complejo
    console.log('📂 VERIFICACIÓN DE CATEGORÍAS DE GASTOS:');
    console.log('═══════════════════════════════════════════════════════');
    
    const categoriaQuery = `
      SELECT id, nombre, tipo FROM categorias_gastos
      WHERE complejo_id = $1
      AND tipo = 'ingreso'
      AND (nombre = 'Reservas Web' OR nombre = 'Reservas Administrativas')
      ORDER BY nombre
    `;
    
    const categoriaResult = await client.query(categoriaQuery, [reserva.complejo_id]);
    
    if (categoriaResult.rows.length === 0) {
      console.log('❌ No se encontraron categorías de ingresos para este complejo');
      console.log('   → Esto explicaría por qué no se registró en control financiero\n');
    } else {
      console.log(`✅ Categorías encontradas (${categoriaResult.rows.length}):`);
      categoriaResult.rows.forEach(cat => {
        console.log(`   - ${cat.nombre} (ID: ${cat.id}, Tipo: ${cat.tipo})`);
      });
      console.log('');
    }
    
    // 4. Verificar trigger
    console.log('🔧 VERIFICACIÓN DEL TRIGGER:');
    console.log('═══════════════════════════════════════════════════════');
    
    const triggerQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'reservas'
      AND trigger_name LIKE '%sincronizar%'
    `;
    
    const triggerResult = await client.query(triggerQuery);
    
    if (triggerResult.rows.length === 0) {
      console.log('❌ NO se encontró trigger de sincronización');
      console.log('   → Esto explicaría por qué no se registró en control financiero\n');
    } else {
      console.log(`✅ Trigger encontrado: ${triggerResult.rows[0].trigger_name}`);
      console.log(`   Evento: ${triggerResult.rows[0].event_manipulation}`);
      console.log(`   Timing: ${triggerResult.rows[0].action_timing}`);
      console.log(`   Tabla: ${triggerResult.rows[0].event_object_table}\n`);
    }
    
    // 5. Verificar función del trigger
    console.log('⚙️  VERIFICACIÓN DE LA FUNCIÓN DEL TRIGGER:');
    console.log('═══════════════════════════════════════════════════════');
    
    const funcionQuery = `
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_name LIKE '%sincronizar%'
      AND routine_schema = 'public'
    `;
    
    const funcionResult = await client.query(funcionQuery);
    
    if (funcionResult.rows.length === 0) {
      console.log('❌ NO se encontró función de sincronización\n');
    } else {
      console.log(`✅ Función encontrada: ${funcionResult.rows[0].routine_name}\n`);
    }
    
    // 6. Diagnóstico final
    console.log('📊 DIAGNÓSTICO FINAL:');
    console.log('═══════════════════════════════════════════════════════');
    
    const problemas = [];
    const correcto = [];
    
    // Verificar estado
    if (reserva.estado !== 'confirmada') {
      problemas.push(`❌ Estado es "${reserva.estado}" en lugar de "confirmada"`);
      problemas.push(`   → El trigger solo se ejecuta cuando estado = "confirmada"`);
    } else {
      correcto.push(`✅ Estado es "confirmada"`);
    }
    
    // Verificar precio
    if (!reserva.precio_total || reserva.precio_total <= 0) {
      problemas.push(`❌ Precio total es $${reserva.precio_total || 0} (debe ser > 0)`);
      problemas.push(`   → El trigger solo crea ingresos si precio_total > 0`);
    } else {
      correcto.push(`✅ Precio total válido: $${reserva.precio_total}`);
    }
    
    // Verificar email
    if (!reserva.email_cliente) {
      problemas.push(`❌ No hay email del cliente registrado`);
      problemas.push(`   → No se puede enviar email sin email_cliente`);
    } else {
      correcto.push(`✅ Email del cliente: ${reserva.email_cliente}`);
    }
    
    // Verificar control financiero
    if (ingresoResult.rows.length === 0) {
      problemas.push(`❌ No está registrada en control financiero`);
    } else {
      correcto.push(`✅ Está registrada en control financiero`);
    }
    
    // Verificar categorías
    if (categoriaResult.rows.length === 0) {
      problemas.push(`❌ No existen categorías de ingresos para el complejo`);
      problemas.push(`   → El trigger requiere categoría "Reservas Web" o "Reservas Administrativas"`);
    } else {
      correcto.push(`✅ Categorías de ingresos existen`);
    }
    
    // Verificar trigger
    if (triggerResult.rows.length === 0) {
      problemas.push(`❌ No existe trigger de sincronización`);
      problemas.push(`   → Sin trigger, no se registran automáticamente los ingresos`);
    } else {
      correcto.push(`✅ Trigger de sincronización existe`);
    }
    
    // Mostrar resultados
    if (correcto.length > 0) {
      console.log('\n✅ CORRECTO:');
      correcto.forEach(item => console.log(`   ${item}`));
    }
    
    if (problemas.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      problemas.forEach(item => console.log(`   ${item}`));
    }
    
    console.log('\n💡 CONCLUSIÓN:');
    console.log('═══════════════════════════════════════════════════════');
    
    if (problemas.length === 0) {
      console.log('✅ La reserva parece estar correcta.');
      console.log('   Si no está en control financiero, puede ser que:');
      console.log('   1. El trigger no se ejecutó en el momento de creación');
      console.log('   2. Hubo un error silencioso en el trigger');
      console.log('   3. La reserva se creó antes de que existiera el trigger');
      console.log('\n   💡 SOLUCIÓN: Usar endpoint de sincronización manual');
      console.log('   POST /api/admin/reservas/GU4RCJ/sincronizar-ingreso');
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
      if (categoriaResult.rows.length === 0) {
        console.log('   4. El trigger requiere categorías de ingresos para el complejo');
      }
      if (triggerResult.rows.length === 0) {
        console.log('   5. No existe trigger de sincronización');
      }
    }
    
    console.log('\n📧 SOBRE EL EMAIL:');
    console.log('═══════════════════════════════════════════════════════');
    if (reserva.email_cliente) {
      console.log(`✅ Email del cliente: ${reserva.email_cliente}`);
      console.log('   El email debería haberse enviado automáticamente al crear la reserva.');
      console.log('   Si no se envió, posibles causas:');
      console.log('   1. Error en configuración SMTP (capturado silenciosamente)');
      console.log('   2. Error al enviar (el código no falla la reserva si falla el email)');
      console.log('   3. El email_cliente estaba vacío al momento de crear la reserva');
      console.log('\n   💡 Revisar logs del servidor en Render para ver errores de email');
    } else {
      console.log('❌ No hay email del cliente registrado');
      console.log('   → No se puede enviar email sin email_cliente');
    }
    
  } catch (error) {
    console.error('❌ Error investigando reserva:', error);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Ejecutar
investigarReserva().catch(console.error);


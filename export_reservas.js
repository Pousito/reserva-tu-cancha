const sqlite3 = require('sqlite3').verbose();

console.log('📤 EXPORTANDO RESERVAS DE LA BASE DE DATOS LOCAL');
console.log('================================================');

// Conectar a la base de datos local
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('❌ Error conectando a la BD local:', err.message);
    return;
  }
  
  console.log('✅ Conectado a la base de datos local');
  exportarReservas();
});

function exportarReservas() {
  console.log('\n📋 EXPORTANDO RESERVAS...');
  
  // Obtener todas las reservas
  db.all(`
    SELECT 
      r.codigo_reserva,
      r.nombre_cliente,
      r.rut_cliente,
      r.email_cliente,
      r.fecha,
      r.hora_inicio,
      r.hora_fin,
      r.precio_total,
      r.estado,
      r.fecha_creacion,
      r.cancha_id
    FROM reservas r
    ORDER BY r.fecha_creacion DESC
  `, (err, reservas) => {
    if (err) {
      console.error('❌ Error obteniendo reservas:', err.message);
      return;
    }
    
    console.log(`📊 Reservas encontradas: ${reservas.length}`);
    
    if (reservas.length === 0) {
      console.log('⚠️ No hay reservas para exportar');
      db.close();
      return;
    }
    
    // Mostrar las reservas
    reservas.forEach((reserva, index) => {
      console.log(`\n${index + 1}. Reserva ${reserva.codigo_reserva}:`);
      console.log(`   Cliente: ${reserva.nombre_cliente}`);
      console.log(`   Fecha: ${reserva.fecha} ${reserva.hora_inicio}`);
      console.log(`   Precio: $${reserva.precio_total.toLocaleString()}`);
      console.log(`   Estado: ${reserva.estado}`);
    });
    
    // Generar script SQL para insertar en Render
    generarScriptSQL(reservas);
  });
}

function generarScriptSQL(reservas) {
  console.log('\n🔧 GENERANDO SCRIPT SQL PARA RENDER...');
  
  const scriptSQL = `
-- SCRIPT PARA INSERTAR RESERVAS EN RENDER
-- Ejecutar en la base de datos de Render

${reservas.map(reserva => `
INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  '${reserva.codigo_reserva}',
  '${reserva.nombre_cliente}',
  '${reserva.rut_cliente}',
  '${reserva.email_cliente}',
  '${reserva.fecha}',
  '${reserva.hora_inicio}',
  '${reserva.hora_fin}',
  ${reserva.precio_total},
  '${reserva.estado}',
  '${reserva.fecha_creacion}',
  ${reserva.cancha_id}
);`).join('\n')}

-- Verificar que se insertaron
SELECT COUNT(*) as total_reservas FROM reservas;
SELECT codigo_reserva, nombre_cliente, fecha, precio_total FROM reservas ORDER BY fecha_creacion DESC LIMIT 5;
`;
  
  // Guardar en archivo
  const fs = require('fs');
  fs.writeFileSync('insertar_reservas_render.sql', scriptSQL);
  
  console.log('✅ Script SQL generado: insertar_reservas_render.sql');
  console.log('\n📋 INSTRUCCIONES PARA RENDER:');
  console.log('1. Copiar el contenido de insertar_reservas_render.sql');
  console.log('2. Ejecutar en la base de datos de Render');
  console.log('3. O usar el endpoint de emergencia que crearemos');
  
  db.close();
}

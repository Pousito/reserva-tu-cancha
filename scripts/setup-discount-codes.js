/**
 * Script para configurar códigos de descuento iniciales
 * Ejecutar después de crear las tablas de descuentos
 */

// Configurar variables de entorno
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: './env.postgresql' });
}

const DatabaseManager = require('../src/config/database');

async function setupDiscountCodes() {
  const db = new DatabaseManager();
  
  try {
    console.log('🎫 CONFIGURANDO CÓDIGOS DE DESCUENTO');
    console.log('====================================');
    
    await db.connect();
    
    // Verificar si ya existen códigos
    const codigosExistentes = await db.query('SELECT COUNT(*) as count FROM codigos_descuento');
    console.log(`📊 Códigos existentes: ${codigosExistentes[0].count}`);
    
    if (codigosExistentes[0].count > 0) {
      console.log('✅ Ya existen códigos de descuento configurados');
      return;
    }
    
    // Crear código de descuento inicial
    const fechaInicio = new Date().toISOString().split('T')[0];
    const fechaFin = new Date();
    fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Válido por 1 año
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    const codigoInicial = {
      codigo: 'RESERVATUSCANCHAS20',
      descripcion: 'Descuento del 20% para nuevos clientes',
      porcentaje_descuento: 20.00,
      monto_maximo_descuento: 10000, // Máximo $10,000 de descuento
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFinStr,
      usos_maximos: 100 // Límite de 100 usos
    };
    
    console.log('🎫 Creando código de descuento inicial...');
    console.log(`   Código: ${codigoInicial.codigo}`);
    console.log(`   Descuento: ${codigoInicial.porcentaje_descuento}%`);
    console.log(`   Máximo descuento: $${codigoInicial.monto_maximo_descuento.toLocaleString()}`);
    console.log(`   Válido hasta: ${codigoInicial.fecha_fin}`);
    console.log(`   Usos máximos: ${codigoInicial.usos_maximos}`);
    
    const resultado = await db.run(`
      INSERT INTO codigos_descuento 
      (codigo, descripcion, porcentaje_descuento, monto_maximo_descuento, 
       fecha_inicio, fecha_fin, usos_maximos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      codigoInicial.codigo,
      codigoInicial.descripcion,
      codigoInicial.porcentaje_descuento,
      codigoInicial.monto_maximo_descuento,
      codigoInicial.fecha_inicio,
      codigoInicial.fecha_fin,
      codigoInicial.usos_maximos
    ]);
    
    console.log('✅ Código de descuento creado exitosamente');
    console.log(`   ID: ${resultado.lastID}`);
    
    // Crear algunos códigos adicionales de ejemplo
    const codigosAdicionales = [
      {
        codigo: 'BIENVENIDA15',
        descripcion: 'Descuento del 15% para nuevos usuarios',
        porcentaje_descuento: 15.00,
        monto_maximo_descuento: 8000,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinStr,
        usos_maximos: 50
      },
      {
        codigo: 'FIDELIDAD10',
        descripcion: 'Descuento del 10% para clientes frecuentes',
        porcentaje_descuento: 10.00,
        monto_maximo_descuento: 5000,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinStr,
        usos_maximos: 200
      }
    ];
    
    console.log('\n🎫 Creando códigos adicionales...');
    for (const codigo of codigosAdicionales) {
      await db.run(`
        INSERT INTO codigos_descuento 
        (codigo, descripcion, porcentaje_descuento, monto_maximo_descuento, 
         fecha_inicio, fecha_fin, usos_maximos)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        codigo.codigo,
        codigo.descripcion,
        codigo.porcentaje_descuento,
        codigo.monto_maximo_descuento,
        codigo.fecha_inicio,
        codigo.fecha_fin,
        codigo.usos_maximos
      ]);
      
      console.log(`   ✅ ${codigo.codigo} - ${codigo.porcentaje_descuento}%`);
    }
    
    // Verificar códigos creados
    const codigosCreados = await db.query(`
      SELECT codigo, porcentaje_descuento, usos_maximos, fecha_fin 
      FROM codigos_descuento 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 CÓDIGOS DE DESCUENTO CONFIGURADOS:');
    console.log('=====================================');
    codigosCreados.forEach(codigo => {
      console.log(`   ${codigo.codigo}: ${codigo.porcentaje_descuento}% (${codigo.usos_maximos} usos) - Válido hasta ${codigo.fecha_fin}`);
    });
    
    console.log('\n✅ Configuración de códigos de descuento completada');
    console.log('💡 Los códigos están listos para ser utilizados en el sistema');
    
  } catch (error) {
    console.error('❌ Error configurando códigos de descuento:', error);
  } finally {
    await db.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDiscountCodes();
}

module.exports = { setupDiscountCodes };

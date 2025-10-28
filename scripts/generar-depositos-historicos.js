/**
 * Script para generar depósitos históricos
 *
 * Este script genera depósitos para todas las fechas donde hay reservas
 * confirmadas y pagadas, pero que aún no tienen depósito generado.
 *
 * Uso:
 *   node scripts/generar-depositos-historicos.js
 */

require('dotenv').config();
const DatabaseManager = require('../src/config/database');

async function generarDepositosHistoricos() {
  const db = new DatabaseManager();

  try {
    console.log('🚀 Iniciando generación de depósitos históricos...');
    console.log('================================================\n');

    // Conectar a la base de datos
    await db.connect();

    // 1. Obtener todas las fechas únicas con reservas confirmadas y pagadas
    console.log('📅 Buscando fechas con reservas confirmadas y pagadas...');
    const fechasConReservas = await db.query(`
      SELECT DISTINCT r.fecha
      FROM reservas r
      WHERE r.estado = 'confirmada'
      AND r.estado_pago = 'pagado'
      ORDER BY r.fecha ASC
    `);

    console.log(`✅ Encontradas ${fechasConReservas.length} fechas con reservas\n`);

    if (fechasConReservas.length === 0) {
      console.log('⚠️  No hay reservas confirmadas y pagadas para procesar');
      return;
    }

    // 2. Para cada fecha, generar depósitos usando la función SQL
    let depositosGenerados = 0;
    let depositosActualizados = 0;
    let errores = 0;

    for (const { fecha } of fechasConReservas) {
      try {
        console.log(`📊 Procesando fecha: ${fecha}`);

        // Verificar si ya existe un depósito para esta fecha
        const depositosExistentes = await db.query(`
          SELECT COUNT(*) as total
          FROM depositos_complejos dc
          JOIN canchas ca ON true
          JOIN reservas r ON r.cancha_id = ca.id AND r.fecha = $1
          WHERE dc.complejo_id = ca.complejo_id
          AND dc.fecha_deposito = $1
          AND r.estado = 'confirmada'
          AND r.estado_pago = 'pagado'
        `, [fecha]);

        // Generar depósitos usando la función SQL
        const resultado = await db.query(`
          SELECT * FROM generar_depositos_diarios($1)
        `, [fecha]);

        if (resultado.length > 0) {
          console.log(`   ✅ Generados ${resultado.length} depósitos`);

          // Mostrar detalle de cada depósito
          for (const dep of resultado) {
            console.log(`      - Complejo ID ${dep.complejo_id}: $${dep.monto_deposito.toLocaleString()} (Comisión: $${dep.comision_total.toLocaleString()})`);
          }

          if (depositosExistentes[0].total > 0) {
            depositosActualizados += resultado.length;
          } else {
            depositosGenerados += resultado.length;
          }
        } else {
          console.log(`   ⚠️  No se generaron depósitos para esta fecha`);
        }

        console.log('');

      } catch (error) {
        console.error(`   ❌ Error procesando fecha ${fecha}:`, error.message);
        errores++;
        console.log('');
      }
    }

    // 3. Resumen final
    console.log('\n================================================');
    console.log('📊 RESUMEN FINAL');
    console.log('================================================');
    console.log(`✅ Depósitos nuevos generados: ${depositosGenerados}`);
    console.log(`🔄 Depósitos actualizados: ${depositosActualizados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📅 Fechas procesadas: ${fechasConReservas.length}`);

    // 4. Verificar totales finales
    console.log('\n📈 Verificando totales en base de datos...');
    const totales = await db.query(`
      SELECT
        COUNT(*) as total_depositos,
        SUM(monto_total_reservas) as total_reservas,
        SUM(comision_total) as total_comisiones,
        SUM(monto_a_depositar) as total_a_depositar
      FROM depositos_complejos
    `);

    if (totales[0]) {
      const t = totales[0];
      console.log(`   📦 Total de depósitos en BD: ${t.total_depositos}`);
      console.log(`   💰 Suma total reservas: $${(t.total_reservas || 0).toLocaleString()}`);
      console.log(`   💳 Suma total comisiones: $${(t.total_comisiones || 0).toLocaleString()}`);
      console.log(`   🏦 Suma total a depositar: $${(t.total_a_depositar || 0).toLocaleString()}`);
    }

    console.log('\n✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Ejecutar script
generarDepositosHistoricos()
  .then(() => {
    console.log('👋 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error no manejado:', error);
    process.exit(1);
  });

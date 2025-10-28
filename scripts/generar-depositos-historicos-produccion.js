/**
 * Script para generar depósitos históricos en PRODUCCIÓN
 *
 * Este script se conecta directamente a la base de datos de producción
 * y genera depósitos para todas las fechas con reservas confirmadas y pagadas.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... node scripts/generar-depositos-historicos-produccion.js
 */

const { Pool } = require('pg');

async function generarDepositosHistoricos() {
  // Verificar que DATABASE_URL esté configurado
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurado');
    console.error('💡 Uso: DATABASE_URL=postgresql://... node scripts/generar-depositos-historicos-produccion.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  let client;

  try {
    console.log('🚀 Iniciando generación de depósitos históricos en PRODUCCIÓN...');
    console.log('================================================\n');

    // Conectar a la base de datos
    client = await pool.connect();
    console.log('✅ Conectado a base de datos de producción\n');

    // Configurar zona horaria
    await client.query("SET timezone = 'America/Santiago'");

    // 1. Obtener todas las fechas únicas con reservas confirmadas y pagadas
    console.log('📅 Buscando fechas con reservas confirmadas y pagadas...');
    const fechasResult = await client.query(`
      SELECT DISTINCT r.fecha
      FROM reservas r
      WHERE r.estado = 'confirmada'
      AND r.estado_pago = 'pagado'
      ORDER BY r.fecha ASC
    `);

    const fechasConReservas = fechasResult.rows;
    console.log(`✅ Encontradas ${fechasConReservas.length} fechas con reservas\n`);

    if (fechasConReservas.length === 0) {
      console.log('⚠️  No hay reservas confirmadas y pagadas para procesar');
      return;
    }

    // Mostrar fechas encontradas
    console.log('📋 Fechas a procesar:');
    fechasConReservas.forEach(({ fecha }) => {
      console.log(`   - ${fecha}`);
    });
    console.log('');

    // 2. Para cada fecha, generar depósitos usando la función SQL
    let depositosGenerados = 0;
    let depositosActualizados = 0;
    let errores = 0;

    for (const { fecha } of fechasConReservas) {
      try {
        console.log(`📊 Procesando fecha: ${fecha}`);

        // Generar depósitos usando la función SQL
        const resultado = await client.query(`
          SELECT * FROM generar_depositos_diarios($1)
        `, [fecha]);

        if (resultado.rows.length > 0) {
          console.log(`   ✅ Procesados ${resultado.rows.length} complejos`);

          // Mostrar detalle de cada depósito
          for (const dep of resultado.rows) {
            console.log(`      - Complejo ID ${dep.complejo_id}: $${parseInt(dep.monto_deposito).toLocaleString()} (Comisión: $${parseInt(dep.comision_total).toLocaleString()})`);
          }

          depositosGenerados += resultado.rows.length;
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
    console.log(`✅ Depósitos generados/actualizados: ${depositosGenerados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📅 Fechas procesadas: ${fechasConReservas.length}`);

    // 4. Verificar totales finales
    console.log('\n📈 Verificando totales en base de datos...');
    const totalesResult = await client.query(`
      SELECT
        COUNT(*) as total_depositos,
        SUM(monto_total_reservas) as total_reservas,
        SUM(comision_total) as total_comisiones,
        SUM(monto_a_depositar) as total_a_depositar
      FROM depositos_complejos
    `);

    if (totalesResult.rows[0]) {
      const t = totalesResult.rows[0];
      console.log(`   📦 Total de depósitos en BD: ${t.total_depositos}`);
      console.log(`   💰 Suma total reservas: $${parseInt(t.total_reservas || 0).toLocaleString()}`);
      console.log(`   💳 Suma total comisiones: $${parseInt(t.total_comisiones || 0).toLocaleString()}`);
      console.log(`   🏦 Suma total a depositar: $${parseInt(t.total_a_depositar || 0).toLocaleString()}`);
    }

    // 5. Mostrar desglose por complejo
    console.log('\n📊 Desglose por complejo:');
    const desglose = await client.query(`
      SELECT
        c.nombre as complejo_nombre,
        COUNT(dc.id) as total_depositos,
        SUM(dc.monto_total_reservas) as total_reservas,
        SUM(dc.comision_total) as total_comisiones,
        SUM(dc.monto_a_depositar) as total_a_depositar,
        COUNT(CASE WHEN dc.estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN dc.estado = 'pagado' THEN 1 END) as pagados
      FROM depositos_complejos dc
      JOIN complejos c ON dc.complejo_id = c.id
      GROUP BY c.id, c.nombre
      ORDER BY c.nombre
    `);

    desglose.rows.forEach(comp => {
      console.log(`\n   🏢 ${comp.complejo_nombre}`);
      console.log(`      Depósitos: ${comp.total_depositos} (${comp.pendientes} pendientes, ${comp.pagados} pagados)`);
      console.log(`      Total reservas: $${parseInt(comp.total_reservas).toLocaleString()}`);
      console.log(`      Comisiones: $${parseInt(comp.total_comisiones).toLocaleString()}`);
      console.log(`      A depositar: $${parseInt(comp.total_a_depositar).toLocaleString()}`);
    });

    console.log('\n✅ Proceso completado exitosamente\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
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

const { Pool } = require('pg');
require('dotenv').config();

// Configuración para la base de datos de Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function limpiarBloqueosDemo3() {
  const client = await pool.connect();
  try {
    console.log('🧹 ================================================');
    console.log('🧹 LIMPIANDO BLOQUEOS TEMPORALES PROBLEMÁTICOS');
    console.log('🧹 ================================================');

    // 1. Verificar canchas del Complejo Demo 3
    const canchasDemo3 = await client.query(
      'SELECT c.id, c.nombre, c.tipo FROM canchas c JOIN complejos co ON c.complejo_id = co.id WHERE co.nombre = $1 ORDER BY c.id',
      ['Complejo Demo 3']
    );

    console.log('🏟️ Canchas del Complejo Demo 3:');
    canchasDemo3.rows.forEach(cancha => {
      console.log(`   ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo})`);
    });

    // 2. Verificar bloqueos temporales para estas canchas
    const canchaIds = canchasDemo3.rows.map(c => c.id);
    console.log(`🔍 Verificando bloqueos para canchas: ${canchaIds.join(', ')}`);

    const bloqueos = await client.query(
      'SELECT id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en FROM bloqueos_temporales WHERE cancha_id = ANY($1) ORDER BY fecha, cancha_id',
      [canchaIds]
    );

    console.log(`📊 Bloqueos encontrados: ${bloqueos.rows.length}`);
    bloqueos.rows.forEach(bloqueo => {
      console.log(`   ${bloqueo.id}: Cancha ${bloqueo.cancha_id} - ${bloqueo.fecha} (${bloqueo.hora_inicio} - ${bloqueo.hora_fin})`);
    });

    // 3. Eliminar bloqueos problemáticos (que cubren todo el día)
    const bloqueosProblematicos = bloqueos.rows.filter(b => 
      b.hora_inicio === '00:00:00' && b.hora_fin === '23:59:59'
    );

    console.log(`🚨 Bloqueos problemáticos encontrados: ${bloqueosProblematicos.length}`);

    if (bloqueosProblematicos.length > 0) {
      console.log('🗑️ Eliminando bloqueos problemáticos...');
      
      for (const bloqueo of bloqueosProblematicos) {
        await client.query('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo.id]);
        console.log(`   ✅ Eliminado: ${bloqueo.id}`);
      }
    }

    // 4. Verificar bloqueos restantes
    const bloqueosRestantes = await client.query(
      'SELECT COUNT(*) as total FROM bloqueos_temporales WHERE cancha_id = ANY($1)',
      [canchaIds]
    );

    console.log(`📊 Bloqueos restantes: ${bloqueosRestantes.rows[0].total}`);

    // 5. Verificar IDs duplicados en canchas
    console.log('\n🔍 Verificando IDs duplicados en canchas...');
    const idsDuplicados = await client.query(`
      SELECT id, COUNT(*) as count 
      FROM canchas 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);

    if (idsDuplicados.rows.length > 0) {
      console.log('⚠️ IDs duplicados encontrados:');
      idsDuplicados.rows.forEach(dup => {
        console.log(`   ID ${dup.id}: ${dup.count} canchas`);
      });
    } else {
      console.log('✅ No hay IDs duplicados en canchas');
    }

    console.log('\n🎉 ================================================');
    console.log('🎉 LIMPIEZA DE BLOQUEOS COMPLETADA');
    console.log('🎉 ================================================');

  } catch (error) {
    console.error('❌ Error limpiando bloqueos:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

limpiarBloqueosDemo3();



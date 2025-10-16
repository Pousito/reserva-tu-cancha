const { Pool } = require('pg');
require('dotenv').config({ path: 'env.postgresql' });

async function updateComplexNamesDirectly() {
  // Configuración de conexión más simple
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'reserva_tu_cancha_local',
    user: 'postgres', // Usar usuario postgres por defecto
    // No incluir password para desarrollo local
  });

  try {
    console.log('🔌 Conectando a PostgreSQL...');
    const client = await pool.connect();
    
    // Configurar zona horaria
    await client.query("SET timezone = 'America/Santiago'");
    
    console.log('🔍 Verificando complejos actuales...');
    const complejos = await client.query('SELECT id, nombre, ciudad_id FROM complejos ORDER BY id');
    
    console.log('📋 Complejos encontrados:');
    complejos.rows.forEach(complejo => {
      console.log(`- ID: ${complejo.id} | Nombre: ${complejo.nombre} | Ciudad ID: ${complejo.ciudad_id}`);
    });
    
    // Buscar los complejos específicos que necesitamos cambiar
    const fundacionGunnen = complejos.rows.find(c => 
      c.nombre.toLowerCase().includes('gunnen') || 
      c.nombre.toLowerCase().includes('fundacion')
    );
    
    const bordeRio = complejos.rows.find(c => 
      c.nombre.toLowerCase().includes('borde') && 
      c.nombre.toLowerCase().includes('rio')
    );
    
    console.log('\n🎯 Complejos a cambiar:');
    if (fundacionGunnen) {
      console.log(`- Fundación Gunnen: ID ${fundacionGunnen.id} -> "Complejo Demo 1"`);
    }
    if (bordeRio) {
      console.log(`- Borde Río: ID ${bordeRio.id} -> "Complejo Demo 2"`);
    }
    
    // Realizar los cambios
    if (fundacionGunnen) {
      await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
      console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
    }
    
    if (bordeRio) {
      await client.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
      console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
    }
    
    // Verificar los cambios
    console.log('\n🔍 Verificando cambios aplicados...');
    const complejosActualizados = await client.query('SELECT id, nombre, ciudad_id FROM complejos ORDER BY id');
    
    console.log('📋 Complejos después de los cambios:');
    complejosActualizados.rows.forEach(complejo => {
      console.log(`- ID: ${complejo.id} | Nombre: ${complejo.nombre} | Ciudad ID: ${complejo.ciudad_id}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('💡 Detalles del error:', error);
  }
}

updateComplexNamesDirectly();

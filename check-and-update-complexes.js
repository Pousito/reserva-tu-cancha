const { Pool } = require('pg');
require('dotenv').config({ path: 'env.postgresql' });

async function checkAndUpdateComplexes() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'reserva_tu_cancha_local',
    user: process.env.DB_USER || 'pousito',
    password: process.env.DB_PASSWORD || '', // Contraseña vacía para desarrollo local
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
    const fundacionGunnen = complejos.rows.find(c => c.nombre.toLowerCase().includes('gunnen'));
    const bordeRio = complejos.rows.find(c => c.nombre.toLowerCase().includes('borde') && c.nombre.toLowerCase().includes('rio'));
    
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
    console.error('💡 Asegúrate de que PostgreSQL esté ejecutándose y la base de datos exista');
  }
}

checkAndUpdateComplexes();

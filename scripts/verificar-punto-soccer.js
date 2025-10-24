const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarPuntoSoccer() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando complejo Punto Soccer...');
    
    // Buscar el complejo
    const result = await client.query(
      'SELECT id, nombre, ciudad_id FROM complejos WHERE nombre LIKE $1',
      ['%Punto Soccer%']
    );
    
    if (result.rows.length > 0) {
      const complejo = result.rows[0];
      console.log('✅ Complejo encontrado:');
      console.log('  - ID:', complejo.id);
      console.log('  - Nombre exacto:', `"${complejo.nombre}"`);
      console.log('  - Longitud del nombre:', complejo.nombre.length);
      console.log('  - Caracteres del nombre:', complejo.nombre.split('').map((c, i) => `${i}: "${c}"`).join(', '));
      
      // Verificar canchas
      const canchasResult = await client.query(
        'SELECT id, nombre, tipo, precio_hora FROM canchas WHERE complejo_id = $1',
        [complejo.id]
      );
      
      console.log('🏟️ Canchas encontradas:');
      canchasResult.rows.forEach(cancha => {
        console.log(`  - ${cancha.nombre} (${cancha.tipo}): $${cancha.precio_hora}`);
      });
      
    } else {
      console.log('❌ No se encontró el complejo Punto Soccer');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verificarPuntoSoccer();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function crearPuntoSoccer() {
  const client = await pool.connect();
  
  try {
    console.log('🏗️ Creando complejo Punto Soccer Canchas Sintéticas...');
    
    // 1. Verificar que existe la ciudad Los Ángeles
    const ciudadResult = await client.query(
      'SELECT id FROM ciudades WHERE nombre = $1',
      ['Los Ángeles']
    );
    
    if (ciudadResult.rows.length === 0) {
      console.log('❌ Ciudad Los Ángeles no encontrada');
      return;
    }
    
    const ciudadId = ciudadResult.rows[0].id;
    console.log('✅ Ciudad Los Ángeles encontrada con ID:', ciudadId);
    
    // 2. Crear el complejo
    const complejoResult = await client.query(`
      INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'Punto Soccer Canchas Sintéticas',
      ciudadId,
      'Camino cerro colorado km. 1.5',
      '+56912345678',
      'contacto@puntosoccer.cl'
    ]);
    
    const complejoId = complejoResult.rows[0].id;
    console.log('✅ Complejo creado con ID:', complejoId);
    
    // 3. Crear las canchas
    // Cancha 1 - No techada
    await client.query(`
      INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora)
      VALUES ($1, $2, $3, $4)
    `, [complejoId, 'Cancha 1', 'futbol', 15000]);
    
    // Cancha 2 - Techada
    await client.query(`
      INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora)
      VALUES ($1, $2, $3, $4)
    `, [complejoId, 'Cancha 2', 'futbol', 18000]);
    
    console.log('✅ Canchas creadas:');
    console.log('  - Cancha 1 (No techada): $15.000/hora');
    console.log('  - Cancha 2 (Techada): $18.000/hora');
    
    console.log('🎉 Complejo Punto Soccer Canchas Sintéticas creado exitosamente!');
    console.log('📋 Detalles:');
    console.log('  - ID del complejo:', complejoId);
    console.log('  - Nombre: Punto Soccer Canchas Sintéticas');
    console.log('  - Ciudad: Los Ángeles');
    console.log('  - Dirección: Camino cerro colorado km. 1.5');
    console.log('  - Canchas: 2 (1 techada, 1 no techada)');
    console.log('  - Capacidad: 7 jugadores por equipo');
    console.log('  - Servicios: Camarines y quincho');
    
  } catch (error) {
    console.error('❌ Error creando complejo:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

crearPuntoSoccer();

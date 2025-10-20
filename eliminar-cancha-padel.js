const { Pool } = require('pg');

// Usar la conexión de producción directamente
const pool = new Pool({
  user: 'reserva_user',
  host: 'dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com',
  database: 'reserva_tu_cancha',
  password: 'reserva_password_2024',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function eliminarCanchaPadel() {
  try {
    console.log('🔍 Verificando canchas de pádel en Complejo Demo 3...');
    
    // Verificar canchas de pádel existentes
    const canchasPadel = await pool.query(
      'SELECT id, nombre, tipo, complejo_id FROM canchas WHERE complejo_id = 8 AND tipo = $1 ORDER BY id',
      ['padel']
    );
    
    console.log('📋 Canchas de pádel encontradas:', canchasPadel.rows);
    
    if (canchasPadel.rows.length > 1) {
      // Eliminar la cancha 2 de pádel (ID: 10)
      const result = await pool.query('DELETE FROM canchas WHERE id = $1', [10]);
      console.log('✅ Cancha 2 de pádel eliminada exitosamente');
      
      // Verificar que se eliminó
      const canchasRestantes = await pool.query(
        'SELECT id, nombre, tipo, complejo_id FROM canchas WHERE complejo_id = 8 AND tipo = $1 ORDER BY id',
        ['padel']
      );
      
      console.log('📋 Canchas de pádel restantes:', canchasRestantes.rows);
    } else {
      console.log('ℹ️ Solo hay una cancha de pádel, no se necesita eliminar ninguna');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

eliminarCanchaPadel();

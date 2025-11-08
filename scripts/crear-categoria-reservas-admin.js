// Script para crear categoría "Reservas Administrativas" para todos los complejos
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function crearCategoriaReservasAdmin() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Creando categoría "Reservas Administrativas" para todos los complejos...');
    
    // Obtener todos los complejos
    const complejos = await client.query('SELECT id, nombre FROM complejos ORDER BY id');
    console.log(`📊 Encontrados ${complejos.rows.length} complejos`);
    
    for (const complejo of complejos.rows) {
      // Verificar si ya existe la categoría
      const existe = await client.query(`
        SELECT id FROM categorias_gastos
        WHERE complejo_id = $1
        AND tipo = 'ingreso'
        AND nombre = 'Reservas Administrativas'
      `, [complejo.id]);
      
      if (existe.rows.length === 0) {
        // Crear categoría
        await client.query(`
          INSERT INTO categorias_gastos (
            complejo_id,
            nombre,
            descripcion,
            icono,
            color,
            tipo,
            es_predefinida
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          complejo.id,
          'Reservas Administrativas',
          'Ingresos por reservas creadas por administradores del complejo',
          'fas fa-user-tie',
          '#007bff',
          'ingreso',
          true
        ]);
        
        console.log(`✅ Categoría creada para complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      } else {
        console.log(`ℹ️  Categoría ya existe para complejo: ${complejo.nombre} (ID: ${complejo.id})`);
      }
    }
    
    await client.query('COMMIT');
    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

crearCategoriaReservasAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


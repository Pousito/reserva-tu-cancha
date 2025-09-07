const { Pool } = require('pg');

async function checkPostgreSQL() {
  console.log('🔍 VERIFICANDO CONEXIÓN POSTGRESQL');
  console.log('==================================');
  console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
  console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Definido' : 'No definido');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL no está definido');
    return;
  }
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    console.log('🔄 Intentando conectar a PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ PostgreSQL conectado exitosamente!');
    
    // Probar una consulta simple
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Hora actual en PostgreSQL:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    console.error('📋 Detalles del error:', error);
  }
}

checkPostgreSQL();

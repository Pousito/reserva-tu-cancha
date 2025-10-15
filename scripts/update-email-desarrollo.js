const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateEmailDesarrollo() {
  console.log('📧 Actualizando email del complejo...\n');
  
  try {
    // Actualizar el email del complejo
    const updateEmail = await pool.query(
      "UPDATE complejos SET email = 'reservas@complejodesarrollo.cl' WHERE nombre = 'Complejo En Desarrollo'"
    );
    console.log(`✅ Email actualizado: ${updateEmail.rowCount} registro(s)`);
    
    // Verificar cambios
    const complejo = await pool.query("SELECT nombre, email FROM complejos WHERE nombre = 'Complejo En Desarrollo'");
    console.log('📊 Complejo actualizado:', complejo.rows[0]);
    
    console.log('\n✅ Actualización de email completada!');
    
  } catch (error) {
    console.error('❌ Error actualizando email:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateEmailDesarrollo();
}

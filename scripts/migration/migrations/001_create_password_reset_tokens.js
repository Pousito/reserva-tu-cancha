/**
 * Migración: Crear tabla password_reset_tokens
 * Fecha: 2025-09-11
 */

async function up(pool) {
  console.log('🔧 Creando tabla password_reset_tokens...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
    )
  `);

  // Crear índice para mejorar rendimiento
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
    ON password_reset_tokens (token)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email 
    ON password_reset_tokens (email)
  `);

  console.log('✅ Tabla password_reset_tokens creada exitosamente');
}

async function down(pool) {
  console.log('🗑️ Eliminando tabla password_reset_tokens...');
  await pool.query('DROP TABLE IF EXISTS password_reset_tokens');
  console.log('✅ Tabla password_reset_tokens eliminada');
}

module.exports = { up, down };

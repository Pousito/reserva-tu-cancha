const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para limpiar la base de datos y dejar solo Los Ángeles y MagnaSports
async function cleanDatabase() {
    console.log('🧹 LIMPIANDO BASE DE DATOS POSTGRESQL');
    console.log('=====================================');
    
    try {
        console.log('🔄 Iniciando limpieza...');
        
        // 1. Eliminar todas las reservas existentes
        const reservasResult = await pool.query('DELETE FROM reservas');
        console.log('✅ Reservas eliminadas:', reservasResult.rowCount);
        
        // 2. Eliminar todos los complejos excepto MagnaSports
        const complejosResult = await pool.query('DELETE FROM complejos WHERE nombre != $1', ['MagnaSports']);
        console.log('✅ Complejos eliminados:', complejosResult.rowCount);
        
        // 3. Eliminar todas las ciudades excepto Los Ángeles
        const ciudadesResult = await pool.query('DELETE FROM ciudades WHERE nombre != $1', ['Los Ángeles']);
        console.log('✅ Ciudades eliminadas:', ciudadesResult.rowCount);
        
        // 4. Eliminar canchas de complejos eliminados
        const canchasResult = await pool.query(`
            DELETE FROM canchas 
            WHERE complejo_id NOT IN (SELECT id FROM complejos)
        `);
        console.log('✅ Canchas eliminadas:', canchasResult.rowCount);
        
        // 5. Eliminar usuarios que no sean super_admin
        const usuariosResult = await pool.query('DELETE FROM usuarios WHERE rol != $1', ['super_admin']);
        console.log('✅ Usuarios eliminados:', usuariosResult.rowCount);
        
        // 6. Eliminar bloqueos temporales
        const bloqueosResult = await pool.query('DELETE FROM bloqueos_temporales');
        console.log('✅ Bloqueos temporales eliminados:', bloqueosResult.rowCount);
        
        // 7. Eliminar pagos
        const pagosResult = await pool.query('DELETE FROM pagos');
        console.log('✅ Pagos eliminados:', pagosResult.rowCount);
        
        // 8. Verificar estado final
        console.log('\n📊 ESTADO FINAL DE LA BASE DE DATOS:');
        console.log('=====================================');
        
        const ciudades = await pool.query('SELECT COUNT(*) as count FROM ciudades');
        const complejos = await pool.query('SELECT COUNT(*) as count FROM complejos');
        const canchas = await pool.query('SELECT COUNT(*) as count FROM canchas');
        const usuarios = await pool.query('SELECT COUNT(*) as count FROM usuarios');
        const reservas = await pool.query('SELECT COUNT(*) as count FROM reservas');
        
        console.log(`📍 Ciudades: ${ciudades.rows[0].count}`);
        console.log(`🏢 Complejos: ${complejos.rows[0].count}`);
        console.log(`⚽ Canchas: ${canchas.rows[0].count}`);
        console.log(`👥 Usuarios: ${usuarios.rows[0].count}`);
        console.log(`📅 Reservas: ${reservas.rows[0].count}`);
        
        // Mostrar datos restantes
        const ciudadesRestantes = await pool.query('SELECT * FROM ciudades');
        const complejosRestantes = await pool.query('SELECT * FROM complejos');
        
        console.log('\n📍 CIUDADES RESTANTES:');
        ciudadesRestantes.rows.forEach(ciudad => {
            console.log(`  - ${ciudad.nombre}`);
        });
        
        console.log('\n🏢 COMPLEJOS RESTANTES:');
        complejosRestantes.rows.forEach(complejo => {
            console.log(`  - ${complejo.nombre}`);
        });
        
        console.log('\n✅ Limpieza completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error.message);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanDatabase();
}

module.exports = { cleanDatabase };
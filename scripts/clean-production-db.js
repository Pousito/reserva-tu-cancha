const { Pool } = require('pg');
require('dotenv').config();

// Función para limpiar la base de datos de producción (PostgreSQL)
async function cleanProductionDatabase() {
    console.log('🧹 LIMPIANDO BASE DE DATOS DE PRODUCCIÓN');
    console.log('=========================================');
    
    // Verificar que DATABASE_URL esté configurado
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no está configurado');
        console.log('💡 Asegúrate de tener la variable de entorno DATABASE_URL configurada');
        return;
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔌 Conectando a la base de datos de producción...');
        
        // 1. Verificar datos actuales
        console.log('\n📊 DATOS ACTUALES:');
        console.log('==================');
        
        const ciudadesResult = await pool.query('SELECT * FROM ciudades');
        console.log('🏙️ Ciudades actuales:');
        ciudadesResult.rows.forEach(ciudad => {
            console.log(`  - ID: ${ciudad.id}, Nombre: ${ciudad.nombre}`);
        });
        
        const complejosResult = await pool.query('SELECT * FROM complejos');
        console.log('🏢 Complejos actuales:');
        complejosResult.rows.forEach(complejo => {
            console.log(`  - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Ciudad ID: ${complejo.ciudad_id}`);
        });
        
        const reservasResult = await pool.query('SELECT COUNT(*) as count FROM reservas');
        console.log(`📋 Reservas actuales: ${reservasResult.rows[0].count}`);
        
        // 2. Confirmar antes de proceder
        console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará todos los datos excepto Los Ángeles y MagnaSports');
        console.log('🔄 Iniciando limpieza...');
        
        // 3. Eliminar todas las reservas existentes
        const reservasDeleteResult = await pool.query('DELETE FROM reservas');
        console.log('✅ Reservas eliminadas:', reservasDeleteResult.rowCount);
        
        // 4. Eliminar todos los complejos excepto MagnaSports
        const complejosDeleteResult = await pool.query('DELETE FROM complejos WHERE nombre != $1', ['MagnaSports']);
        console.log('✅ Complejos eliminados:', complejosDeleteResult.rowCount);
        
        // 5. Eliminar todas las ciudades excepto Los Ángeles
        const ciudadesDeleteResult = await pool.query('DELETE FROM ciudades WHERE nombre != $1', ['Los Ángeles']);
        console.log('✅ Ciudades eliminadas:', ciudadesDeleteResult.rowCount);
        
        // 6. Actualizar el ID de Los Ángeles a 1 para simplificar
        await pool.query('UPDATE ciudades SET id = 1 WHERE nombre = $1', ['Los Ángeles']);
        console.log('✅ ID de Los Ángeles actualizado a 1');
        
        // 7. Actualizar el ID de MagnaSports a 1 y su ciudad_id a 1
        await pool.query('UPDATE complejos SET id = 1, ciudad_id = 1 WHERE nombre = $1', ['MagnaSports']);
        console.log('✅ MagnaSports actualizado - ID: 1, Ciudad ID: 1');
        
        // 8. Verificar el resultado final
        console.log('\n📊 VERIFICACIÓN FINAL:');
        console.log('======================');
        
        const finalCiudadesResult = await pool.query('SELECT * FROM ciudades');
        console.log('🏙️ Ciudades finales:');
        finalCiudadesResult.rows.forEach(ciudad => {
            console.log(`  - ID: ${ciudad.id}, Nombre: ${ciudad.nombre}`);
        });
        
        const finalComplejosResult = await pool.query('SELECT * FROM complejos');
        console.log('🏢 Complejos finales:');
        finalComplejosResult.rows.forEach(complejo => {
            console.log(`  - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Ciudad ID: ${complejo.ciudad_id}`);
        });
        
        const finalReservasResult = await pool.query('SELECT COUNT(*) as count FROM reservas');
        console.log(`📋 Reservas finales: ${finalReservasResult.rows[0].count}`);
        
        console.log('\n✅ Limpieza de producción completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        throw error;
    } finally {
        await pool.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Función para verificar el estado actual sin hacer cambios
async function checkProductionDatabase() {
    console.log('🔍 VERIFICANDO BASE DE DATOS DE PRODUCCIÓN');
    console.log('==========================================');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no está configurado');
        return;
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        const ciudadesResult = await pool.query('SELECT * FROM ciudades ORDER BY id');
        const complejosResult = await pool.query('SELECT * FROM complejos ORDER BY id');
        const reservasResult = await pool.query('SELECT COUNT(*) as count FROM reservas');
        
        console.log('🏙️ Ciudades:');
        ciudadesResult.rows.forEach(ciudad => {
            console.log(`  - ID: ${ciudad.id}, Nombre: ${ciudad.nombre}`);
        });
        
        console.log('🏢 Complejos:');
        complejosResult.rows.forEach(complejo => {
            console.log(`  - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Ciudad ID: ${complejo.ciudad_id}`);
        });
        
        console.log(`📋 Reservas: ${reservasResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error verificando base de datos:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar según el argumento
if (require.main === module) {
    const action = process.argv[2];
    
    if (action === 'check') {
        checkProductionDatabase();
    } else if (action === 'clean') {
        cleanProductionDatabase();
    } else {
        console.log('📋 Uso:');
        console.log('  node scripts/clean-production-db.js check  - Verificar estado actual');
        console.log('  node scripts/clean-production-db.js clean  - Limpiar base de datos');
    }
}

module.exports = { cleanProductionDatabase, checkProductionDatabase };

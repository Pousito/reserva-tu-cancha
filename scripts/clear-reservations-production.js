const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

// Para producción, usar variables de entorno del sistema
// También permitir cargar desde .env si está disponible

async function clearReservationsProduction() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('🔌 Conectando a la base de datos de PRODUCCIÓN...');
        console.log('⚠️  ADVERTENCIA: Esta operación afectará la base de datos de PRODUCCIÓN');
        
        await client.connect();
        
        console.log('✅ Conectado a PostgreSQL de producción');
        
        // Verificar cuántas reservas hay antes de eliminar
        const countResult = await client.query('SELECT COUNT(*) as total FROM reservas');
        const totalReservas = countResult.rows[0].total;
        
        console.log(`📊 Total de reservas en PRODUCCIÓN: ${totalReservas}`);
        
        if (totalReservas === 0) {
            console.log('ℹ️ No hay reservas para eliminar en producción');
            return;
        }
        
        // Confirmación adicional para producción
        console.log('');
        console.log('🚨 ATENCIÓN: OPERACIÓN EN PRODUCCIÓN 🚨');
        console.log('🚨 Se eliminarán TODAS las reservas de la base de datos de PRODUCCIÓN');
        console.log('🚨 Esta acción NO se puede deshacer');
        console.log('🚨 Los clientes perderán acceso a sus reservas existentes');
        console.log('');
        
        // Eliminar todas las reservas
        console.log('🗑️ Eliminando todas las reservas de PRODUCCIÓN...');
        const deleteResult = await client.query('DELETE FROM reservas');
        
        console.log(`✅ Eliminadas ${deleteResult.rowCount} reservas de producción exitosamente`);
        
        // Verificar que se eliminaron todas
        const verifyResult = await client.query('SELECT COUNT(*) as total FROM reservas');
        const reservasRestantes = verifyResult.rows[0].total;
        
        console.log(`📊 Reservas restantes en producción: ${reservasRestantes}`);
        
        if (reservasRestantes === 0) {
            console.log('✅ Base de datos de reservas de PRODUCCIÓN limpiada completamente');
            console.log('✅ El sistema está listo para nuevas reservas');
        } else {
            console.log(`❌ Error: Aún quedan ${reservasRestantes} reservas en la base de datos de producción`);
        }
        
        // Mostrar estadísticas adicionales
        const estadisticasResult = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM canchas) as total_canchas,
                (SELECT COUNT(*) FROM complejos) as total_complejos,
                (SELECT COUNT(*) FROM ciudades) as total_ciudades
        `);
        
        const stats = estadisticasResult.rows[0];
        console.log('');
        console.log('📊 Estado de la base de datos de producción:');
        console.log(`   - Canchas: ${stats.total_canchas}`);
        console.log(`   - Complejos: ${stats.total_complejos}`);
        console.log(`   - Ciudades: ${stats.total_ciudades}`);
        console.log(`   - Reservas: ${reservasRestantes}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('❌ Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexión a producción cerrada');
    }
}

// Verificar que tenemos DATABASE_URL
if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurada');
    console.error('❌ Asegúrate de tener las variables de entorno configuradas');
    console.error('❌ Para desarrollo: cp env.postgresql .env');
    console.error('❌ Para producción: configurar DATABASE_URL en Render');
    process.exit(1);
}

// Verificar el tipo de base de datos
const isProduction = !process.env.DATABASE_URL.includes('localhost') && 
                     !process.env.DATABASE_URL.includes('127.0.0.1');

if (!isProduction) {
    console.log('⚠️  ADVERTENCIA: Parece que estás usando una base de datos local');
    console.log('⚠️  Si quieres limpiar la base de datos de desarrollo, usa:');
    console.log('⚠️  node scripts/clear-reservations-dev.js');
    console.log('');
    console.log('🔄 Continuando con la limpieza...');
}

console.log('🚀 Iniciando limpieza de base de datos de PRODUCCIÓN...');
console.log('🌐 Entorno:', process.env.NODE_ENV || 'production');

// Ejecutar el script
clearReservationsProduction();

const { Client } = require('pg');
require('dotenv').config({ path: 'env.postgresql' });

async function clearReservations() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('🔌 Conectando a la base de datos de desarrollo...');
        await client.connect();
        
        console.log('✅ Conectado a PostgreSQL');
        
        // Verificar cuántas reservas hay antes de eliminar
        const countResult = await client.query('SELECT COUNT(*) as total FROM reservas');
        const totalReservas = countResult.rows[0].total;
        
        console.log(`📊 Total de reservas encontradas: ${totalReservas}`);
        
        if (totalReservas === 0) {
            console.log('ℹ️ No hay reservas para eliminar');
            return;
        }
        
        // Confirmar antes de eliminar
        console.log('⚠️ ADVERTENCIA: Se eliminarán TODAS las reservas de la base de datos de desarrollo');
        console.log('⚠️ Esta acción NO se puede deshacer');
        
        // Eliminar todas las reservas
        console.log('🗑️ Eliminando todas las reservas...');
        const deleteResult = await client.query('DELETE FROM reservas');
        
        console.log(`✅ Eliminadas ${deleteResult.rowCount} reservas exitosamente`);
        
        // Verificar que se eliminaron todas
        const verifyResult = await client.query('SELECT COUNT(*) as total FROM reservas');
        const reservasRestantes = verifyResult.rows[0].total;
        
        console.log(`📊 Reservas restantes: ${reservasRestantes}`);
        
        if (reservasRestantes === 0) {
            console.log('✅ Base de datos de reservas limpiada completamente');
        } else {
            console.log(`❌ Error: Aún quedan ${reservasRestantes} reservas en la base de datos`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar el script
clearReservations();

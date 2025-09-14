const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function diagnoseDatabase() {
    console.log('🔍 DIAGNÓSTICO DE BASE DE DATOS');
    console.log('================================');
    
    console.log('📊 Variables de entorno:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
    
    if (process.env.DATABASE_URL) {
        // Mostrar información de la URL sin exponer credenciales
        const url = process.env.DATABASE_URL;
        const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
        const isProduction = !isLocal;
        
        console.log('  - Tipo de BD:', isLocal ? 'LOCAL (Desarrollo)' : 'PRODUCCIÓN');
        console.log('  - Host:', url.includes('localhost') ? 'localhost' : 'Servidor remoto');
        
        try {
            console.log('\n🔌 Conectando a la base de datos...');
            const client = new Client({
                connectionString: process.env.DATABASE_URL
            });
            
            await client.connect();
            console.log('✅ Conexión exitosa');
            
            // Contar reservas
            const reservasResult = await client.query('SELECT COUNT(*) as total FROM reservas');
            const totalReservas = reservasResult.rows[0].total;
            
            console.log('\n📊 Estadísticas de la base de datos:');
            console.log('  - Total de reservas:', totalReservas);
            
            if (totalReservas > 0) {
                // Mostrar algunas reservas de ejemplo
                const ejemploReservas = await client.query('SELECT codigo_reserva, fecha, estado, nombre_cliente FROM reservas ORDER BY created_at DESC LIMIT 5');
                console.log('\n📋 Últimas 5 reservas:');
                ejemploReservas.rows.forEach((reserva, index) => {
                    console.log(`  ${index + 1}. ${reserva.codigo_reserva} - ${reserva.fecha} - ${reserva.estado} - ${reserva.nombre_cliente}`);
                });
            }
            
            // Verificar otras tablas
            const canchasResult = await client.query('SELECT COUNT(*) as total FROM canchas');
            const complejosResult = await client.query('SELECT COUNT(*) as total FROM complejos');
            const ciudadesResult = await client.query('SELECT COUNT(*) as total FROM ciudades');
            
            console.log('\n🏗️ Estructura de la base de datos:');
            console.log('  - Canchas:', canchasResult.rows[0].total);
            console.log('  - Complejos:', complejosResult.rows[0].total);
            console.log('  - Ciudades:', ciudadesResult.rows[0].total);
            
            await client.end();
            console.log('\n🔌 Conexión cerrada');
            
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error.message);
        }
    } else {
        console.log('❌ DATABASE_URL no está configurada');
    }
    
    console.log('\n📋 Archivos de configuración disponibles:');
    console.log('  - .env:', require('fs').existsSync('.env') ? 'Existe' : 'No existe');
    console.log('  - env.postgresql:', require('fs').existsSync('env.postgresql') ? 'Existe' : 'No existe');
    console.log('  - env.example:', require('fs').existsSync('env.example') ? 'Existe' : 'No existe');
}

diagnoseDatabase();

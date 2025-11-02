const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para borrar todas las reservas del complejo "Espacio Deportivo Borde Río"
async function deleteReservasBordeRio() {
    console.log('🗑️ ELIMINANDO RESERVAS DEL COMPLEJO "ESPACIO DEPORTIVO BORDE RÍO"');
    console.log('================================================================');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Primero, identificar el complejo
        console.log('\n🔍 Buscando el complejo "Espacio Deportivo Borde Río"...');
        const complejoResult = await client.query(
            `SELECT id, nombre, ciudad_id FROM complejos WHERE nombre ILIKE '%borde%río%' OR nombre ILIKE '%borde%rio%' OR nombre ILIKE '%borde rio%'`
        );
        
        if (complejoResult.rows.length === 0) {
            console.log('❌ No se encontró el complejo "Espacio Deportivo Borde Río"');
            await client.query('ROLLBACK');
            return;
        }
        
        const complejo = complejoResult.rows[0];
        console.log(`✅ Complejo encontrado: ID=${complejo.id}, Nombre="${complejo.nombre}"`);
        
        // 2. Obtener las canchas del complejo
        console.log('\n🔍 Obteniendo canchas del complejo...');
        const canchasResult = await client.query(
            `SELECT id, nombre FROM canchas WHERE complejo_id = $1`,
            [complejo.id]
        );
        
        const canchaIds = canchasResult.rows.map(c => c.id);
        console.log(`✅ Canchas encontradas: ${canchasResult.rows.length}`);
        canchasResult.rows.forEach(cancha => {
            console.log(`   - ID: ${cancha.id}, Nombre: ${cancha.nombre}`);
        });
        
        if (canchaIds.length === 0) {
            console.log('⚠️ No hay canchas asociadas al complejo');
            await client.query('ROLLBACK');
            return;
        }
        
        // 3. Contar reservas antes de borrar
        console.log('\n📊 Contando reservas antes de borrar...');
        const countBefore = await client.query(
            `SELECT COUNT(*) as count FROM reservas WHERE cancha_id = ANY($1::int[])`,
            [canchaIds]
        );
        const reservasCount = parseInt(countBefore.rows[0].count);
        console.log(`📋 Total de reservas encontradas: ${reservasCount}`);
        
        if (reservasCount === 0) {
            console.log('✅ No hay reservas para borrar');
            await client.query('ROLLBACK');
            return;
        }
        
        // 4. Mostrar algunas reservas antes de borrar (últimas 10)
        console.log('\n📋 Mostrando últimas 10 reservas que se eliminarán:');
        const sampleReservas = await client.query(
            `SELECT r.codigo_reserva, r.nombre_cliente, TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha_reserva, r.hora_inicio, r.precio_total, co.nombre as complejo_nombre
             FROM reservas r
             JOIN canchas can ON r.cancha_id = can.id
             JOIN complejos co ON can.complejo_id = co.id
             WHERE cancha_id = ANY($1::int[]) 
             ORDER BY r.fecha DESC, r.hora_inicio DESC 
             LIMIT 10`,
            [canchaIds]
        );
        
        console.log(`📋 Total de reservas encontradas para eliminar: ${sampleReservas.rows.length}`);
        sampleReservas.rows.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.nombre_cliente} - ${reserva.complejo_nombre} - ${reserva.fecha_reserva} ${reserva.hora_inicio} - $${reserva.precio_total}`);
        });
        
        // Verificar reservas específicas mencionadas por el usuario
        const reservasEspecificas = await client.query(
            `SELECT r.codigo_reserva, r.nombre_cliente, TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha_reserva, r.hora_inicio, co.nombre as complejo_nombre, co.id as complejo_id
             FROM reservas r
             JOIN canchas can ON r.cancha_id = can.id
             JOIN complejos co ON can.complejo_id = co.id
             WHERE r.codigo_reserva IN ('LTWTUN', '7IAUMO')`,
            []
        );
        
        if (reservasEspecificas.rows.length > 0) {
            console.log('\n🔍 Verificando reservas específicas mencionadas:');
            reservasEspecificas.rows.forEach((reserva) => {
                console.log(`   - ${reserva.codigo_reserva}: Complejo ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
            });
        }
        
        // 5. Eliminar pagos asociados primero (por foreign key)
        console.log('\n💳 Eliminando pagos asociados...');
        const pagosResult = await client.query(
            `DELETE FROM pagos 
             WHERE reserva_id IN (
                 SELECT id FROM reservas WHERE cancha_id = ANY($1::int[])
             )`,
            [canchaIds]
        );
        console.log(`✅ Pagos eliminados: ${pagosResult.rowCount}`);
        
        // 6. Eliminar bloqueos temporales asociados
        console.log('\n🔒 Eliminando bloqueos temporales asociados...');
        const bloqueosResult = await client.query(
            `DELETE FROM bloqueos_temporales 
             WHERE cancha_id = ANY($1::int[])`,
            [canchaIds]
        );
        console.log(`✅ Bloqueos temporales eliminados: ${bloqueosResult.rowCount}`);
        
        // 7. Eliminar las reservas
        console.log('\n🗑️ Eliminando reservas...');
        const reservasResult = await client.query(
            `DELETE FROM reservas WHERE cancha_id = ANY($1::int[])`,
            [canchaIds]
        );
        console.log(`✅ Reservas eliminadas: ${reservasResult.rowCount}`);
        
        // 8. Verificar que se eliminaron correctamente
        console.log('\n🔍 Verificando eliminación...');
        const countAfter = await client.query(
            `SELECT COUNT(*) as count FROM reservas WHERE cancha_id = ANY($1::int[])`,
            [canchaIds]
        );
        const reservasRestantes = parseInt(countAfter.rows[0].count);
        
        if (reservasRestantes === 0) {
            console.log('✅ Todas las reservas fueron eliminadas correctamente');
            await client.query('COMMIT');
        } else {
            console.log(`⚠️ Advertencia: Aún quedan ${reservasRestantes} reservas`);
            await client.query('ROLLBACK');
        }
        
        // 9. Resumen final
        console.log('\n📊 RESUMEN FINAL:');
        console.log('================');
        console.log(`   - Reservas eliminadas: ${reservasResult.rowCount}`);
        console.log(`   - Pagos eliminados: ${pagosResult.rowCount}`);
        console.log(`   - Bloqueos eliminados: ${bloqueosResult.rowCount}`);
        console.log(`   - Reservas restantes: ${reservasRestantes}`);
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('\n❌ Error durante la eliminación:', error.message);
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar el script
deleteReservasBordeRio()
    .then(() => {
        console.log('\n✅ Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });


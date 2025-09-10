#!/usr/bin/env node

/**
 * Script simple para restaurar reservas en producción
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function simpleRestoreReservations() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔄 Iniciando restauración simple de reservas...');
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos de producción');
        
        // Insertar reservas de ejemplo directamente
        const reservas = [
            {
                nombre: 'Reserva Test 1',
                email: 'test1@example.com',
                telefono: '+56912345678',
                cancha_id: 11,
                fecha: '2025-09-10',
                hora_inicio: '10:00',
                hora_fin: '11:00',
                precio_total: 28000,
                estado: 'confirmada'
            },
            {
                nombre: 'Reserva Test 2',
                email: 'test2@example.com',
                telefono: '+56912345679',
                cancha_id: 11,
                fecha: '2025-09-10',
                hora_inicio: '11:00',
                hora_fin: '12:00',
                precio_total: 28000,
                estado: 'confirmada'
            },
            {
                nombre: 'Reserva Test 3',
                email: 'test3@example.com',
                telefono: '+56912345680',
                cancha_id: 12,
                fecha: '2025-09-10',
                hora_inicio: '10:00',
                hora_fin: '11:00',
                precio_total: 28000,
                estado: 'confirmada'
            },
            {
                nombre: 'Reserva Test 4',
                email: 'test4@example.com',
                telefono: '+56912345681',
                cancha_id: 12,
                fecha: '2025-09-10',
                hora_inicio: '11:00',
                hora_fin: '12:00',
                precio_total: 28000,
                estado: 'confirmada'
            },
            {
                nombre: 'Reserva Test 5',
                email: 'test5@example.com',
                telefono: '+56912345682',
                cancha_id: 11,
                fecha: '2025-09-10',
                hora_inicio: '12:00',
                hora_fin: '13:00',
                precio_total: 28000,
                estado: 'confirmada'
            }
        ];
        
        console.log(`📝 Insertando ${reservas.length} reservas...`);
        
        for (const reserva of reservas) {
            try {
                const result = await db.run(`
                    INSERT INTO reservas (
                        nombre, email, telefono, cancha_id, fecha, 
                        hora_inicio, hora_fin, precio_total, estado, 
                        fecha_creacion, fecha_modificacion
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    reserva.nombre,
                    reserva.email,
                    reserva.telefono,
                    reserva.cancha_id,
                    reserva.fecha,
                    reserva.hora_inicio,
                    reserva.hora_fin,
                    reserva.precio_total,
                    reserva.estado,
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
                
                console.log(`   ✅ Reserva insertada: ${reserva.nombre} - Cancha ${reserva.cancha_id}`);
                
            } catch (error) {
                console.error(`   ❌ Error insertando reserva ${reserva.nombre}:`, error.message);
            }
        }
        
        // Verificar resultado final
        const reservasFinales = await db.query('SELECT COUNT(*) as count FROM reservas');
        console.log(`\n🎯 Total de reservas en producción: ${reservasFinales[0].count}`);
        
        console.log('\n🎉 Restauración simple completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la restauración simple:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    simpleRestoreReservations()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { simpleRestoreReservations };

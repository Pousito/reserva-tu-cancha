#!/usr/bin/env node

/**
 * Script para restaurar las reservas de producción
 * 
 * Este script:
 * 1. Obtiene las reservas de la base de datos local
 * 2. Las adapta a los IDs correctos de producción
 * 3. Las inserta en la base de datos de producción
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function restoreProductionReservations() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔄 Iniciando restauración de reservas de producción...');
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos de producción');
        
        const dbInfo = db.getDatabaseInfo();
        console.log(`📊 Base de datos: ${dbInfo.type}`);
        
        if (dbInfo.type !== 'PostgreSQL') {
            throw new Error('Este script está diseñado para PostgreSQL en producción');
        }
        
        // PASO 1: Obtener reservas de la base de datos local
        console.log('\n📥 PASO 1: Obteniendo reservas de la base de datos local...');
        
        // Conectar a la base de datos local temporalmente
        const localDb = new (require('../../src/config/database'))();
        process.env.NODE_ENV = 'development'; // Forzar modo desarrollo
        await localDb.connect();
        
        const reservasLocales = await localDb.query(`
            SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            JOIN ciudades ci ON co.ciudad_id = ci.id
            ORDER BY r.id
        `);
        
        console.log(`📋 Encontradas ${reservasLocales.length} reservas en local`);
        reservasLocales.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.nombre} - ${reserva.cancha_nombre} - ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
        });
        
        await localDb.close();
        
        // PASO 2: Insertar reservas en producción con IDs correctos
        console.log('\n💾 PASO 2: Insertando reservas en producción...');
        
        let reservasInsertadas = 0;
        for (const reserva of reservasLocales) {
            try {
                // Insertar reserva con los IDs correctos de producción
                // Ciudad: Los Ángeles (ID: 1), Complejo: MagnaSports (ID: 1)
                // Cancha: Mapear según el nombre
                let canchaId;
                if (reserva.cancha_nombre === 'Cancha Techada 1') {
                    canchaId = 11; // ID correcto en producción
                } else if (reserva.cancha_nombre === 'Cancha Techada 2') {
                    canchaId = 12; // ID correcto en producción
                } else {
                    console.log(`⚠️ Saltando reserva con cancha desconocida: ${reserva.cancha_nombre}`);
                    continue;
                }
                
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
                    canchaId,
                    reserva.fecha,
                    reserva.hora_inicio,
                    reserva.hora_fin,
                    reserva.precio_total,
                    reserva.estado || 'confirmada',
                    reserva.fecha_creacion || new Date().toISOString(),
                    reserva.fecha_modificacion || new Date().toISOString()
                ]);
                
                reservasInsertadas++;
                console.log(`   ✅ Reserva insertada: ${reserva.nombre} - Cancha ${canchaId} - ${reserva.fecha}`);
                
            } catch (error) {
                console.error(`   ❌ Error insertando reserva ${reserva.nombre}:`, error.message);
            }
        }
        
        // PASO 3: Verificar resultado final
        console.log('\n📊 PASO 3: Verificando resultado final...');
        
        const reservasFinales = await db.query(`
            SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            JOIN ciudades ci ON co.ciudad_id = ci.id
            ORDER BY r.id
        `);
        
        console.log(`\n🎯 RESULTADO FINAL:`);
        console.log(`   - Reservas restauradas: ${reservasInsertadas}`);
        console.log(`   - Total de reservas en producción: ${reservasFinales.length}`);
        
        console.log('\n📋 Reservas en producción:');
        reservasFinales.forEach((reserva, index) => {
            console.log(`   ${index + 1}. ${reserva.nombre} - ${reserva.cancha_nombre} - ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
        });
        
        console.log('\n🎉 Restauración de reservas completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la restauración de reservas:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    restoreProductionReservations()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { restoreProductionReservations };

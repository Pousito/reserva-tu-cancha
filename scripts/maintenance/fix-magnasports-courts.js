#!/usr/bin/env node

/**
 * Script para corregir las canchas de MagnaSports
 * 
 * Este script:
 * 1. Mueve las reservas de las canchas duplicadas a las canchas techadas correctas
 * 2. Elimina las canchas duplicadas
 * 3. Verifica que MagnaSports quede con solo 2 canchas techadas
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function fixMagnaSportsCourts() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔧 Iniciando corrección de canchas de MagnaSports...');
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos');
        
        // Verificar canchas actuales de MagnaSports
        const canchasActuales = await db.query(`
            SELECT id, nombre, tipo, precio_hora 
            FROM canchas 
            WHERE complejo_id = 1 
            ORDER BY id
        `);
        
        console.log('📋 Canchas actuales de MagnaSports:');
        canchasActuales.forEach(cancha => {
            console.log(`   - ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo}) - $${cancha.precio_hora}`);
        });
        
        // Identificar canchas duplicadas y correctas
        const canchasDuplicadas = canchasActuales.filter(c => 
            c.nombre === 'Cancha Futbol 1' || c.nombre === 'Cancha Futbol 2'
        );
        const canchasCorrectas = canchasActuales.filter(c => 
            c.nombre === 'Cancha Techada 1' || c.nombre === 'Cancha Techada 2'
        );
        
        console.log(`\n🔍 Canchas duplicadas encontradas: ${canchasDuplicadas.length}`);
        console.log(`🔍 Canchas correctas encontradas: ${canchasCorrectas.length}`);
        
        if (canchasDuplicadas.length === 0) {
            console.log('✅ No hay canchas duplicadas que corregir');
            return;
        }
        
        // Mapeo de canchas duplicadas a correctas
        const mapeoCanchas = {
            1: 11, // Cancha Futbol 1 -> Cancha Techada 1
            5: 12  // Cancha Futbol 2 -> Cancha Techada 2
        };
        
        // Mover reservas de canchas duplicadas a canchas correctas
        console.log('\n🔄 Moviendo reservas...');
        let reservasMovidas = 0;
        
        for (const [canchaDuplicadaId, canchaCorrectaId] of Object.entries(mapeoCanchas)) {
            // Verificar si la cancha correcta existe
            const canchaCorrecta = await db.get('SELECT id FROM canchas WHERE id = ?', [canchaCorrectaId]);
            if (!canchaCorrecta) {
                console.log(`❌ Cancha correcta ID ${canchaCorrectaId} no encontrada`);
                continue;
            }
            
            // Obtener reservas de la cancha duplicada
            const reservas = await db.query(`
                SELECT id, codigo_reserva, nombre_cliente, fecha, hora_inicio, hora_fin
                FROM reservas 
                WHERE cancha_id = ?
            `, [canchaDuplicadaId]);
            
            console.log(`📋 Moviendo ${reservas.length} reservas de cancha ID ${canchaDuplicadaId} a cancha ID ${canchaCorrectaId}`);
            
            // Mover cada reserva
            for (const reserva of reservas) {
                await db.run(`
                    UPDATE reservas 
                    SET cancha_id = ? 
                    WHERE id = ?
                `, [canchaCorrectaId, reserva.id]);
                
                console.log(`   ✅ Reserva ${reserva.codigo_reserva} (${reserva.nombre_cliente}) movida`);
                reservasMovidas++;
            }
        }
        
        console.log(`\n✅ Total de reservas movidas: ${reservasMovidas}`);
        
        // Eliminar canchas duplicadas
        console.log('\n🗑️ Eliminando canchas duplicadas...');
        let canchasEliminadas = 0;
        
        for (const canchaDuplicada of canchasDuplicadas) {
            // Verificar que no queden reservas
            const reservasRestantes = await db.get(`
                SELECT COUNT(*) as count 
                FROM reservas 
                WHERE cancha_id = ?
            `, [canchaDuplicada.id]);
            
            if (reservasRestantes.count > 0) {
                console.log(`⚠️ No se puede eliminar cancha ID ${canchaDuplicada.id} - aún tiene ${reservasRestantes.count} reservas`);
                continue;
            }
            
            // Eliminar la cancha
            await db.run('DELETE FROM canchas WHERE id = ?', [canchaDuplicada.id]);
            console.log(`✅ Cancha eliminada: ID ${canchaDuplicada.id} (${canchaDuplicada.nombre})`);
            canchasEliminadas++;
        }
        
        // Verificar resultado final
        const canchasFinales = await db.query(`
            SELECT id, nombre, tipo, precio_hora 
            FROM canchas 
            WHERE complejo_id = 1 
            ORDER BY id
        `);
        
        console.log('\n📊 RESULTADO FINAL:');
        console.log(`   - Canchas eliminadas: ${canchasEliminadas}`);
        console.log(`   - Reservas movidas: ${reservasMovidas}`);
        console.log(`   - Canchas finales en MagnaSports: ${canchasFinales.length}`);
        
        console.log('\n🏟️ Canchas finales de MagnaSports:');
        canchasFinales.forEach(cancha => {
            console.log(`   - ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo}) - $${cancha.precio_hora}`);
        });
        
        // Verificar reservas finales
        const reservasFinales = await db.query(`
            SELECT r.codigo_reserva, r.nombre_cliente, c.nombre as cancha_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = 1
            ORDER BY r.fecha, r.hora_inicio
        `);
        
        console.log('\n📋 Reservas finales en MagnaSports:');
        reservasFinales.forEach(reserva => {
            console.log(`   - ${reserva.codigo_reserva}: ${reserva.nombre_cliente} en ${reserva.cancha_nombre}`);
        });
        
        console.log('\n🎉 Corrección completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    fixMagnaSportsCourts()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { fixMagnaSportsCourts };

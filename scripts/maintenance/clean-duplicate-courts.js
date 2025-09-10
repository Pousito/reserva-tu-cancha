#!/usr/bin/env node

/**
 * Script para limpiar canchas duplicadas
 * 
 * Este script:
 * 1. Identifica canchas duplicadas por nombre y complejo
 * 2. Mueve las reservas a las canchas con ID más bajo
 * 3. Elimina las canchas duplicadas
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function cleanDuplicateCourts() {
    const db = new DatabaseManager();

    try {
        console.log('🔧 Iniciando limpieza de canchas duplicadas...');

        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos');

        // PASO 1: Identificar canchas duplicadas
        console.log('\n🔍 PASO 1: Identificando canchas duplicadas...');
        
        const duplicateGroups = await db.query(`
            SELECT nombre, complejo_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
            FROM canchas 
            GROUP BY nombre, complejo_id 
            HAVING COUNT(*) > 1
            ORDER BY complejo_id, nombre
        `);
        
        if (duplicateGroups.length === 0) {
            console.log('✅ No se encontraron canchas duplicadas');
            return;
        }
        
        console.log(`📋 Encontrados ${duplicateGroups.length} grupos de canchas duplicadas:`);
        
        for (const group of duplicateGroups) {
            console.log(`\n📋 Grupo: ${group.nombre} (Complejo ${group.complejo_id})`);
            console.log(`   - Total duplicadas: ${group.count}`);
            
            const ids = group.ids.split(',').map(id => parseInt(id)).sort((a, b) => a - b);
            const keepId = ids[0]; // Mantener la cancha con ID más bajo
            const deleteIds = ids.slice(1); // Eliminar las demás
            
            console.log(`   - Mantener ID: ${keepId}`);
            console.log(`   - IDs a eliminar: ${deleteIds.join(', ')}`);
            
            // PASO 2: Mover reservas de canchas duplicadas a la cancha principal
            console.log(`   🔄 Moviendo reservas...`);
            let movedReservations = 0;
            
            for (const deleteId of deleteIds) {
                const reservationsToMove = await db.query(`
                    SELECT id FROM reservas WHERE cancha_id = $1
                `, [deleteId]);
                
                if (reservationsToMove.length > 0) {
                    await db.run(`
                        UPDATE reservas SET cancha_id = $1 WHERE cancha_id = $2
                    `, [keepId, deleteId]);
                    movedReservations += reservationsToMove.length;
                    console.log(`     - ${reservationsToMove.length} reservas movidas de cancha ${deleteId} a cancha ${keepId}`);
                }
            }
            
            console.log(`   ✅ Total de reservas movidas: ${movedReservations}`);
            
            // PASO 3: Eliminar canchas duplicadas
            console.log(`   🗑️ Eliminando canchas duplicadas...`);
            let deletedCourts = 0;
            
            for (const deleteId of deleteIds) {
                await db.run(`DELETE FROM canchas WHERE id = $1`, [deleteId]);
                deletedCourts++;
                console.log(`     - Cancha ID ${deleteId} eliminada`);
            }
            
            console.log(`   ✅ Total de canchas eliminadas: ${deletedCourts}`);
        }
        
        // PASO 4: Verificar estado final
        console.log('\n✅ PASO 4: Verificando estado final...');
        
        const finalCourts = await db.query(`
            SELECT c.id, c.nombre, c.complejo_id, comp.nombre as complejo_nombre
            FROM canchas c
            JOIN complejos comp ON c.complejo_id = comp.id
            ORDER BY c.complejo_id, c.nombre, c.id
        `);
        
        console.log('📋 Canchas finales:');
        finalCourts.forEach(court => {
            console.log(`   - ID ${court.id}: ${court.nombre} (${court.complejo_nombre})`);
        });
        
        console.log(`\n🎉 Limpieza completada:`);
        console.log(`   - Grupos de duplicados procesados: ${duplicateGroups.length}`);
        console.log(`   - Total de canchas restantes: ${finalCourts.length}`);

    } catch (error) {
        console.error('❌ Error en cleanDuplicateCourts:', error);
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

cleanDuplicateCourts();

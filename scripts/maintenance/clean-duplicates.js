#!/usr/bin/env node

/**
 * Script para limpiar complejos duplicados en la base de datos
 * 
 * Este script identifica y elimina complejos duplicados basándose en:
 * - Nombre del complejo
 * - Ciudad
 * - Dirección
 * - Teléfono
 * - Email
 * 
 * Mantiene el complejo con el ID más bajo (más antiguo).
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function cleanDuplicateComplexes() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔍 Iniciando limpieza de complejos duplicados...');
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos');
        
        // Verificar complejos duplicados - Solo PostgreSQL
        const duplicates = await db.query(`
            SELECT 
                nombre, 
                ciudad_id, 
                direccion, 
                telefono,
                email,
                COUNT(*) as count,
                MIN(id) as keep_id,
                ARRAY_AGG(id ORDER BY id) as all_ids
            FROM complejos 
            GROUP BY nombre, ciudad_id, direccion, telefono, email
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.length === 0) {
            console.log('✅ No se encontraron complejos duplicados');
            return;
        }
        
        console.log(`🔍 Encontrados ${duplicates.length} grupos de complejos duplicados:`);
        
        let totalDeleted = 0;
        
        for (const duplicate of duplicates) {
            console.log(`\n📋 Grupo: ${duplicate.nombre}`);
            console.log(`   - Total duplicados: ${duplicate.count}`);
            console.log(`   - Mantener ID: ${duplicate.keep_id}`);
            console.log(`   - IDs a eliminar: ${duplicate.all_ids.slice(1).join(', ')}`);
            
            // Eliminar duplicados (mantener el de menor ID)
            const idsToDelete = duplicate.all_ids.slice(1);
            
            for (const idToDelete of idsToDelete) {
                // Verificar si el complejo tiene canchas asociadas
                let canchas;
                if (dbInfo.type === 'PostgreSQL') {
                    canchas = await db.query('SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1', [idToDelete]);
                } else {
                    canchas = await db.query('SELECT COUNT(*) as count FROM canchas WHERE complejo_id = ?', [idToDelete]);
                }
                
                if (canchas[0].count > 0) {
                    console.log(`   ⚠️  No se puede eliminar ID ${idToDelete} - tiene ${canchas[0].count} canchas asociadas`);
                    continue;
                }
                
                // Verificar si el complejo tiene reservas asociadas
                let reservas;
                if (dbInfo.type === 'PostgreSQL') {
                    reservas = await db.query(`
                        SELECT COUNT(*) as count 
                        FROM reservas r 
                        JOIN canchas c ON r.cancha_id = c.id 
                        WHERE c.complejo_id = $1
                    `, [idToDelete]);
                } else {
                    reservas = await db.query(`
                        SELECT COUNT(*) as count 
                        FROM reservas r 
                        JOIN canchas c ON r.cancha_id = c.id 
                        WHERE c.complejo_id = ?
                    `, [idToDelete]);
                }
                
                if (reservas[0].count > 0) {
                    console.log(`   ⚠️  No se puede eliminar ID ${idToDelete} - tiene ${reservas[0].count} reservas asociadas`);
                    continue;
                }
                
                // Eliminar el complejo duplicado
                let result;
                if (dbInfo.type === 'PostgreSQL') {
                    result = await db.run('DELETE FROM complejos WHERE id = $1', [idToDelete]);
                } else {
                    result = await db.run('DELETE FROM complejos WHERE id = ?', [idToDelete]);
                }
                console.log(`   ✅ Eliminado ID ${idToDelete}`);
                totalDeleted++;
            }
        }
        
        console.log(`\n🎉 Limpieza completada:`);
        console.log(`   - Grupos de duplicados encontrados: ${duplicates.length}`);
        console.log(`   - Complejos eliminados: ${totalDeleted}`);
        
        // Verificar resultado final
        const finalCount = await db.query('SELECT COUNT(*) as count FROM complejos');
        console.log(`   - Total de complejos restantes: ${finalCount[0].count}`);
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanDuplicateComplexes()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { cleanDuplicateComplexes };

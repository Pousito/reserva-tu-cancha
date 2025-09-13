#!/usr/bin/env node

/**
 * Script para verificar complejos duplicados en la base de datos
 * 
 * Este script identifica complejos duplicados sin eliminarlos,
 * mostrando información detallada para análisis.
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function checkDuplicateComplexes() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔍 Verificando complejos duplicados...');
        
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
                MIN(id) as oldest_id,
                MAX(id) as newest_id,
                ARRAY_AGG(id ORDER BY id) as all_ids
            FROM complejos 
            GROUP BY nombre, ciudad_id, direccion, telefono, email
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.length === 0) {
            console.log('✅ No se encontraron complejos duplicados');
            return { hasDuplicates: false, duplicates: [] };
        }
        
        console.log(`🔍 Encontrados ${duplicates.length} grupos de complejos duplicados:\n`);
        
        const detailedDuplicates = [];
        
        for (const duplicate of duplicates) {
            console.log(`📋 Grupo: ${duplicate.nombre}`);
            console.log(`   - Ciudad ID: ${duplicate.ciudad_id}`);
            console.log(`   - Dirección: ${duplicate.direccion}`);
            console.log(`   - Teléfono: ${duplicate.telefono}`);
            console.log(`   - Email: ${duplicate.email}`);
            console.log(`   - Total duplicados: ${duplicate.count}`);
            console.log(`   - ID más antiguo: ${duplicate.oldest_id}`);
            console.log(`   - ID más nuevo: ${duplicate.newest_id}`);
            console.log(`   - Todos los IDs: ${duplicate.all_ids.join(', ')}`);
            
            // Obtener información detallada de cada duplicado - Solo PostgreSQL
            const details = await db.query(`
                SELECT 
                    c.id,
                    c.nombre,
                    c.direccion,
                    c.telefono,
                    c.email,
                    c.created_at,
                    ci.nombre as ciudad_nombre,
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = c.id) as canchas_count,
                    (SELECT COUNT(*) FROM reservas r 
                     JOIN canchas ch ON r.cancha_id = ch.id 
                     WHERE ch.complejo_id = c.id) as reservas_count
                FROM complejos c
                JOIN ciudades ci ON c.ciudad_id = ci.id
                WHERE c.id = ANY($1)
                ORDER BY c.id
            `, [duplicate.all_ids]);
            
            console.log(`   📊 Detalles por ID:`);
            for (const detail of details) {
                console.log(`      ID ${detail.id}:`);
                console.log(`         - Creado: ${detail.created_at}`);
                console.log(`         - Canchas: ${detail.canchas_count}`);
                console.log(`         - Reservas: ${detail.reservas_count}`);
                console.log(`         - Ciudad: ${detail.ciudad_nombre}`);
            }
            
            detailedDuplicates.push({
                ...duplicate,
                details: details
            });
            
            console.log(''); // Línea en blanco
        }
        
        // Resumen
        const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count, 0);
        const totalToDelete = totalDuplicates - duplicates.length; // Total menos los que se mantendrían
        
        console.log('📊 RESUMEN:');
        console.log(`   - Grupos de duplicados: ${duplicates.length}`);
        console.log(`   - Total de complejos duplicados: ${totalDuplicates}`);
        console.log(`   - Complejos que se eliminarían: ${totalToDelete}`);
        console.log(`   - Complejos que se mantendrían: ${duplicates.length}`);
        
        return { 
            hasDuplicates: true, 
            duplicates: detailedDuplicates,
            summary: {
                groups: duplicates.length,
                totalDuplicates,
                toDelete: totalToDelete,
                toKeep: duplicates.length
            }
        };
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkDuplicateComplexes()
        .then((result) => {
            if (result.hasDuplicates) {
                console.log('\n⚠️  Se encontraron duplicados. Ejecuta clean-duplicates.js para eliminarlos.');
                process.exit(1);
            } else {
                console.log('\n✅ No hay duplicados. Base de datos limpia.');
                process.exit(0);
            }
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { checkDuplicateComplexes };

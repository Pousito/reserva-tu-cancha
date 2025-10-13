const { Pool } = require('pg');
require('dotenv').config();

// IMPORTANTE: Este script se conecta a la BD de PRODUCCIÓN
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixBorderioProduction() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 CORRECCIÓN DE BORDE RIO EN PRODUCCIÓN');
        console.log('=========================================\n');
        
        // 1. Verificar estado actual
        console.log('📊 ANTES de la corrección:');
        const usersBefore = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
            ORDER BY id
        `);
        
        console.log(`   Usuarios encontrados: ${usersBefore.rows.length}`);
        usersBefore.rows.forEach(u => {
            console.log(`   • ID: ${u.id}, email: ${u.email}, complejo_id: ${u.complejo_id}, activo: ${u.activo}`);
        });
        
        // 2. Verificar si existe complejo 6 (Borde Río)
        const complejo6 = await client.query(`
            SELECT id, nombre
            FROM complejos
            WHERE id = 6
        `);
        
        if (complejo6.rows.length === 0) {
            console.log('\n❌ ERROR: No existe complejo con ID 6 en la base de datos de producción');
            console.log('   Por favor verifica que Borde Río esté creado correctamente.');
            return;
        }
        
        console.log(`\n✅ Complejo ID 6 existe: ${complejo6.rows[0].nombre}`);
        
        // 3. Actualizar usuario con complejo_id correcto
        console.log('\n🔧 Actualizando usuario admin@borderio.cl...');
        
        const updateResult = await client.query(`
            UPDATE usuarios
            SET complejo_id = 6
            WHERE email = 'admin@borderio.cl'
            RETURNING id, email, nombre, complejo_id
        `);
        
        if (updateResult.rows.length > 0) {
            console.log('✅ Usuario actualizado:');
            updateResult.rows.forEach(u => {
                console.log(`   • ID: ${u.id}, email: ${u.email}, complejo_id: ${u.complejo_id} ← CORREGIDO`);
            });
        } else {
            console.log('❌ No se encontró el usuario para actualizar');
        }
        
        // 4. Verificar si hay usuarios duplicados
        const allBorderioUsers = await client.query(`
            SELECT id, email, nombre, complejo_id, activo
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
            ORDER BY id
        `);
        
        if (allBorderioUsers.rows.length > 1) {
            console.log('\n⚠️  ADVERTENCIA: Hay usuarios duplicados con email admin@borderio.cl');
            console.log('   Se recomienda mantener solo uno activo.');
            allBorderioUsers.rows.forEach(u => {
                console.log(`   • ID: ${u.id}, complejo_id: ${u.complejo_id}, activo: ${u.activo}`);
            });
        }
        
        // 5. Verificar resultado final
        console.log('\n📊 DESPUÉS de la corrección:');
        const usersAfter = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
            ORDER BY id
        `);
        
        usersAfter.rows.forEach(u => {
            console.log(`   • ID: ${u.id}, email: ${u.email}, complejo_id: ${u.complejo_id}, activo: ${u.activo}`);
        });
        
        console.log('\n✅ CORRECCIÓN COMPLETADA');
        console.log('\n🔄 PRÓXIMOS PASOS:');
        console.log('   1. Cierra sesión en producción');
        console.log('   2. Limpia localStorage (o usa modo incógnito)');
        console.log('   3. Inicia sesión nuevamente');
        console.log('   4. Verifica que los horarios sean 10:00-23:00');
        
    } catch (error) {
        console.error('❌ Error durante la corrección:', error);
        console.error('   Mensaje:', error.message);
        console.error('   Stack:', error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar solo si se confirma
console.log('⚠️  ADVERTENCIA: Este script modificará la base de datos de PRODUCCIÓN');
console.log('   Base de datos:', process.env.DATABASE_URL?.substring(0, 50) + '...');
console.log('\n¿Continuar? (ejecuta el script para proceder)\n');

fixBorderioProduction();


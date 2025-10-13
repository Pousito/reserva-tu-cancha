const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function verifyAndFixBorderio() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 VERIFICACIÓN FINAL DE BORDE RIO');
        console.log('==================================\n');
        
        // 1. Verificar usuario admin@borderio.cl
        const user = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
        `);
        
        console.log('📊 Usuario admin@borderio.cl:');
        if (user.rows.length > 0) {
            user.rows.forEach(u => {
                console.log(`   ✅ ID: ${u.id}, complejo_id: ${u.complejo_id}, activo: ${u.activo}`);
            });
        } else {
            console.log('   ❌ No encontrado');
        }
        
        // 2. Verificar complejo 6
        const complejo6 = await client.query(`
            SELECT id, nombre, ciudad_id
            FROM complejos
            WHERE id = 6
        `);
        
        console.log('\n📊 Complejo ID 6:');
        if (complejo6.rows.length > 0) {
            console.log(`   ✅ Nombre: ${complejo6.rows[0].nombre}`);
        } else {
            console.log('   ❌ No existe');
        }
        
        // 3. Verificar si existe complejo 7
        const complejo7 = await client.query(`
            SELECT id, nombre
            FROM complejos
            WHERE id = 7
        `);
        
        console.log('\n📊 Complejo ID 7:');
        if (complejo7.rows.length > 0) {
            console.log(`   ⚠️  EXISTE: ${complejo7.rows[0].nombre}`);
            console.log('   (Esto NO debería existir)');
        } else {
            console.log('   ✅ No existe (correcto)');
        }
        
        // 4. Verificar usuarios con complejo_id 7
        const usersWithComplejo7 = await client.query(`
            SELECT id, email, nombre, complejo_id
            FROM usuarios
            WHERE complejo_id = 7
        `);
        
        console.log('\n📊 Usuarios con complejo_id = 7:');
        if (usersWithComplejo7.rows.length > 0) {
            console.log('   ⚠️  Usuarios encontrados con complejo_id incorrecto:');
            usersWithComplejo7.rows.forEach(u => {
                console.log(`      ID: ${u.id}, Email: ${u.email}`);
            });
        } else {
            console.log('   ✅ Ninguno (correcto)');
        }
        
        console.log('\n📋 RESUMEN:');
        console.log('==================================');
        
        if (user.rows.length === 1 && user.rows[0].complejo_id === 6 && 
            complejo6.rows.length === 1 && complejo7.rows.length === 0) {
            console.log('✅ BASE DE DATOS ESTÁ CORRECTA');
            console.log('\n🔧 EL PROBLEMA ESTÁ EN EL NAVEGADOR (localStorage)');
            console.log('\n💡 SOLUCIÓN:');
            console.log('   1. Abre modo incógnito');
            console.log('   2. Ve a: https://www.reservatuscanchas.cl/admin-login.html');
            console.log('   3. Inicia sesión con admin@borderio.cl');
            console.log('   4. Verifica que los horarios sean 10:00-23:00');
        } else {
            console.log('⚠️  HAY PROBLEMAS EN LA BASE DE DATOS');
            console.log('   Revisar los detalles arriba');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyAndFixBorderio();


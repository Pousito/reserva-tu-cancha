const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function findDuplicateUsers() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 BUSCANDO USUARIOS DUPLICADOS');
        console.log('================================\n');
        
        // Buscar TODOS los usuarios con email admin@borderio.cl
        const allBorderio = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo, created_at
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
            ORDER BY id
        `);
        
        console.log(`📊 Usuarios con email admin@borderio.cl: ${allBorderio.rows.length}\n`);
        
        allBorderio.rows.forEach((user, index) => {
            console.log(`Usuario ${index + 1}:`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Nombre: ${user.nombre}`);
            console.log(`   Rol: ${user.rol}`);
            console.log(`   complejo_id: ${user.complejo_id}`);
            console.log(`   Activo: ${user.activo}`);
            console.log(`   Creado: ${user.created_at}`);
            console.log('');
        });
        
        if (allBorderio.rows.length > 1) {
            console.log('⚠️  PROBLEMA DETECTADO: HAY USUARIOS DUPLICADOS\n');
            console.log('🔧 SOLUCIÓN:');
            console.log('   1. Desactivar usuario ID 15 (el incorrecto con complejo_id 7)');
            console.log('   2. Mantener activo usuario ID 35 (el correcto con complejo_id 6)\n');
            
            // Verificar si existe complejo 7
            const complejo7 = await client.query('SELECT id, nombre FROM complejos WHERE id = 7');
            if (complejo7.rows.length > 0) {
                console.log(`   Complejo ID 7 existe: ${complejo7.rows[0].nombre}`);
            } else {
                console.log('   Complejo ID 7 NO EXISTE (por eso causa error)');
            }
        }
        
        // Buscar todos los usuarios con complejo_id 7
        console.log('\n📊 TODOS los usuarios con complejo_id 7:');
        const withComplejo7 = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo
            FROM usuarios
            WHERE complejo_id = 7
        `);
        
        if (withComplejo7.rows.length > 0) {
            withComplejo7.rows.forEach(user => {
                console.log(`   ID: ${user.id}, Email: ${user.email}, Nombre: ${user.nombre}`);
            });
        } else {
            console.log('   (ninguno)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

findDuplicateUsers();



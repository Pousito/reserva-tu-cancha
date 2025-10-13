const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function verifyUserComplejo() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 VERIFICACIÓN DIRECTA DE admin@borderio.cl');
        console.log('=============================================\n');
        
        // Query SOLO de la tabla usuarios (sin JOIN)
        const userOnly = await client.query(`
            SELECT id, email, nombre, rol, complejo_id, activo
            FROM usuarios
            WHERE email = 'admin@borderio.cl'
        `);
        
        console.log('📊 Datos SOLO de tabla usuarios:');
        if (userOnly.rows.length > 0) {
            const user = userOnly.rows[0];
            console.log('   ID:', user.id);
            console.log('   Email:', user.email);
            console.log('   Nombre:', user.nombre);
            console.log('   Rol:', user.rol);
            console.log('   complejo_id:', user.complejo_id, '(tipo:', typeof user.complejo_id + ')');
            console.log('   Activo:', user.activo);
        }
        
        // Query con JOIN (como en el login)
        console.log('\n📊 Datos con JOIN (simulando login):');
        const withJoin = await client.query(`
            SELECT u.*, c.nombre as complejo_nombre, c.id as complejo_id
            FROM usuarios u
            LEFT JOIN complejos c ON u.complejo_id = c.id
            WHERE u.email = 'admin@borderio.cl' AND u.activo = true
        `);
        
        if (withJoin.rows.length > 0) {
            const user = withJoin.rows[0];
            console.log('   complejo_id (después del JOIN):', user.complejo_id, '(tipo:', typeof user.complejo_id + ')');
            console.log('   complejo_nombre:', user.complejo_nombre);
            
            console.log('\n🔍 TODAS las columnas devueltas por el SELECT u.*:');
            Object.keys(user).forEach(key => {
                if (key.includes('complejo') || key === 'id' || key === 'rol') {
                    console.log(`   ${key}:`, user[key], `(tipo: ${typeof user[key]})`);
                }
            });
        }
        
        // Verificar si hay duplicados o problemas
        const allBorderio = await client.query(`
            SELECT id, email, nombre, complejo_id
            FROM usuarios
            WHERE email LIKE '%borderio%'
        `);
        
        console.log('\n📊 Todos los usuarios relacionados con "borderio":');
        allBorderio.rows.forEach(u => {
            console.log(`   ID: ${u.id}, Email: ${u.email}, complejo_id: ${u.complejo_id}`);
        });
        
        // Verificar el complejo 6
        const complejo6 = await client.query(`
            SELECT id, nombre
            FROM complejos
            WHERE id = 6
        `);
        
        console.log('\n📊 Complejo ID 6:');
        if (complejo6.rows.length > 0) {
            console.log('   ID:', complejo6.rows[0].id);
            console.log('   Nombre:', complejo6.rows[0].nombre);
        } else {
            console.log('   ❌ No existe complejo con ID 6');
        }
        
        // Verificar el complejo 7
        const complejo7 = await client.query(`
            SELECT id, nombre
            FROM complejos
            WHERE id = 7
        `);
        
        console.log('\n📊 Complejo ID 7:');
        if (complejo7.rows.length > 0) {
            console.log('   ID:', complejo7.rows[0].id);
            console.log('   Nombre:', complejo7.rows[0].nombre);
        } else {
            console.log('   ❌ No existe complejo con ID 7');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyUserComplejo();


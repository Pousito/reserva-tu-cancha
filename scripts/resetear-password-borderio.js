// ============================================
// RESETEAR CONTRASEÑA DEL OWNER DE BORDE RIO
// ============================================

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function resetearPassword() {
    console.log('🔑 RESETEANDO CONTRASEÑA DEL OWNER DE BORDE RIO\n');
    
    try {
        const email = 'admin@borderio.cl';
        const passwordPlain = 'Admin123!';
        
        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlain, salt);
        
        console.log('📝 Información:');
        console.log(`   Email: ${email}`);
        console.log(`   Contraseña: ${passwordPlain}`);
        console.log(`   Hash generado: ${passwordHash.substring(0, 20)}...`);
        
        // Actualizar en la base de datos
        const result = await pool.query(
            'UPDATE usuarios SET password = $1 WHERE email = $2 RETURNING id, email, nombre, rol',
            [passwordHash, email]
        );
        
        if (result.rows.length === 0) {
            console.log('\n❌ Usuario no encontrado');
            return;
        }
        
        console.log('\n✅ Contraseña actualizada correctamente');
        console.log('\n👤 Usuario actualizado:');
        console.log(`   ID: ${result.rows[0].id}`);
        console.log(`   Email: ${result.rows[0].email}`);
        console.log(`   Nombre: ${result.rows[0].nombre}`);
        console.log(`   Rol: ${result.rows[0].rol}`);
        
        // Probar el login
        console.log('\n🧪 Probando login...');
        
        const usuario = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (usuario.rows.length === 0) {
            console.log('❌ Usuario no encontrado en verificación');
            return;
        }
        
        const passwordMatch = await bcrypt.compare(passwordPlain, usuario.rows[0].password);
        
        if (passwordMatch) {
            console.log('✅ Login verificado correctamente');
            console.log('\n📌 Credenciales finales:');
            console.log(`   Email: ${email}`);
            console.log(`   Contraseña: ${passwordPlain}`);
        } else {
            console.log('❌ Error: La contraseña no coincide');
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await pool.end();
    }
}

resetearPassword();


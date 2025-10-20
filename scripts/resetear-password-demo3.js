#!/usr/bin/env node

/**
 * 🔑 RESETEAR CONTRASEÑA DEL OWNER COMPLEJO DEMO 3
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function resetearPassword() {
    console.log('🔑 RESETEANDO CONTRASEÑA DEL OWNER COMPLEJO DEMO 3\n');
    
    try {
        const email = 'owner@complejodemo3.cl';
        const passwordPlain = 'demo123';
        
        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordPlain, salt);
        
        console.log('📝 Información:');
        console.log(`   Email: ${email}`);
        console.log(`   Contraseña: ${passwordPlain}`);
        console.log(`   Hash generado: ${passwordHash.substring(0, 20)}...`);
        
        // Actualizar en la base de datos
        const result = await pool.query(
            'UPDATE usuarios SET password = $1 WHERE email = $2 RETURNING id, email, nombre, rol, complejo_id',
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
        console.log(`   Complejo ID: ${result.rows[0].complejo_id}`);
        
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
            console.log('✅ Login exitoso - La contraseña funciona correctamente');
        } else {
            console.log('❌ Error en el login - La contraseña no coincide');
        }
        
        console.log('\n🎯 CREDENCIALES FINALES:');
        console.log('========================');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Contraseña: ${passwordPlain}`);
        console.log('\n✅ Ahora puedes loguearte con estas credenciales');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

resetearPassword().catch(console.error);



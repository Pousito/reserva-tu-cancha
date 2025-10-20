const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function verificarToken() {
    console.log('🔑 VERIFICANDO TOKEN DE PRODUCCIÓN');
    console.log('==================================');
    
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        console.log('✅ Conexión establecida');
        
        // Verificar usuario owner
        console.log('\n👤 Verificando usuario owner...');
        const usuarioQuery = `
            SELECT id, email, nombre, rol, complejo_id 
            FROM usuarios 
            WHERE email = 'owner@complejodemo3.cl' AND id = 3;
        `;
        const usuario = await client.query(usuarioQuery);
        
        if (usuario.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const userData = usuario.rows[0];
        console.log('✅ Usuario encontrado:', userData);
        
        // Generar token
        const token = jwt.sign(
            {
                userId: userData.id,
                email: userData.email,
                nombre: userData.nombre,
                rol: userData.rol,
                complejo_id: userData.complejo_id
            },
            process.env.JWT_SECRET || 'tu-secreto-jwt',
            { expiresIn: '24h' }
        );
        
        console.log('\n🔑 Token generado:', token);
        
        // Verificar token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu-secreto-jwt');
            console.log('✅ Token válido:', decoded);
        } catch (error) {
            console.log('❌ Token inválido:', error.message);
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verificarToken();

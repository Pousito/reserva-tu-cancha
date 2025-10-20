const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

async function crearUsuarioId3() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        console.log('🔧 Creando usuario con ID 3 para que coincida con el token JWT...');
        
        // Verificar si ya existe un usuario con ID 3
        const existingUser = await pool.query('SELECT * FROM usuarios WHERE id = 3');
        
        if (existingUser.rows.length > 0) {
            console.log('✅ Usuario con ID 3 ya existe:', existingUser.rows[0]);
            
            // Solo actualizar el email del usuario temporal
            const result = await pool.query(`
                UPDATE usuarios 
                SET email = 'owner@complejodemo3.cl', nombre = 'Owner Complejo Demo 3'
                WHERE id = 3
                RETURNING *;
            `);
            
            console.log('✅ Usuario actualizado correctamente:', result.rows[0]);
            return;
        }

        // Verificar si existe el usuario con email owner@complejodemo3.cl
        const existingEmail = await pool.query('SELECT * FROM usuarios WHERE email = $1', ['owner@complejodemo3.cl']);
        
        if (existingEmail.rows.length > 0) {
            const currentUserId = existingEmail.rows[0].id;
            console.log('📋 Usuario actual encontrado con ID:', currentUserId);
            
            // Solo actualizar el complejo_id del usuario existente
            const result = await pool.query(`
                UPDATE usuarios 
                SET complejo_id = 8
                WHERE id = $1
                RETURNING *;
            `, [currentUserId]);
            
            console.log('✅ Usuario actualizado con complejo_id 8:', result.rows[0]);
            console.log('⚠️  El usuario sigue teniendo ID', currentUserId, 'pero ahora está asociado al complejo correcto');
        } else {
            // Crear usuario con ID 3
            const result = await pool.query(`
                INSERT INTO usuarios (id, email, nombre, rol, activo, complejo_id, password)
                VALUES (3, 'owner@complejodemo3.cl', 'Owner Complejo Demo 3', 'owner', true, 8, '$2b$10$rQv8K9mN2pL5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ')
                RETURNING *;
            `);

            console.log('✅ Usuario creado con ID 3:', result.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

crearUsuarioId3().catch(console.error);

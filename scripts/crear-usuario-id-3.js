const { Pool } = require('pg');

class DatabaseManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: false
        });
    }

    async crearUsuarioId3() {
        try {
            console.log('🔧 Creando usuario con ID 3 para que coincida con el token JWT...');
            
            // Verificar si ya existe un usuario con ID 3
            const existingUser = await this.pool.query('SELECT * FROM usuarios WHERE id = 3');
            
            if (existingUser.rows.length > 0) {
                console.log('✅ Usuario con ID 3 ya existe:', existingUser.rows[0]);
                return;
            }

            // Crear usuario con ID 3
            const result = await this.pool.query(`
                INSERT INTO usuarios (id, email, nombre, rol, activo, complejo_id, password_hash)
                VALUES (3, 'owner@complejodemo3.cl', 'Owner Complejo Demo 3', 'owner', true, 8, '$2b$10$rQv8K9mN2pL5sT7uV1wX3yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ')
                RETURNING *;
            `);

            console.log('✅ Usuario creado con ID 3:', result.rows[0]);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    async close() {
        await this.pool.end();
    }
}

async function main() {
    const db = new DatabaseManager();
    await db.crearUsuarioId3();
    await db.close();
}

main().catch(console.error);

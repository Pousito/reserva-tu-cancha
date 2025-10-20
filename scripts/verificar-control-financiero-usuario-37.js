const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

async function verificarControlFinanciero() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        console.log('🔍 Verificando control financiero para usuario ID 37...');
        
        // Verificar usuario
        const usuario = await pool.query('SELECT * FROM usuarios WHERE id = 37');
        console.log('👤 Usuario:', usuario.rows[0]);
        
        // Verificar categorías
        const categorias = await pool.query(`
            SELECT * FROM categorias_gastos 
            WHERE complejo_id = $1
        `, [usuario.rows[0].complejo_id]);
        console.log('📊 Categorías encontradas:', categorias.rows.length);
        
        // Verificar movimientos
        const movimientos = await pool.query(`
            SELECT gi.*, cg.nombre as categoria_nombre
            FROM gastos_ingresos gi
            LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
            WHERE gi.complejo_id = $1
        `, [usuario.rows[0].complejo_id]);
        console.log('💰 Movimientos encontrados:', movimientos.rows.length);
        
        if (movimientos.rows.length > 0) {
            console.log('📋 Primeros movimientos:');
            movimientos.rows.slice(0, 3).forEach(mov => {
                console.log(`  - ${mov.tipo}: $${mov.monto} (${mov.categoria_nombre})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verificarControlFinanciero().catch(console.error);


// Script para agregar la columna codigo_reserva a la tabla bloqueos_temporales
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function addCodigoReservaColumn() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Agregando columna codigo_reserva a bloqueos_temporales...');
        
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bloqueos_temporales' 
            AND column_name = 'codigo_reserva'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ La columna codigo_reserva ya existe en bloqueos_temporales');
            return;
        }
        
        // Agregar la columna
        await client.query(`
            ALTER TABLE bloqueos_temporales 
            ADD COLUMN codigo_reserva VARCHAR(50)
        `);
        
        console.log('✅ Columna codigo_reserva agregada exitosamente a bloqueos_temporales');
        
    } catch (error) {
        console.error('❌ Error agregando columna:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    addCodigoReservaColumn()
        .then(() => {
            console.log('🎉 Migración completada exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Error en migración:', error);
            process.exit(1);
        });
}

module.exports = addCodigoReservaColumn;

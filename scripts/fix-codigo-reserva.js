// Script simple para agregar la columna codigo_reserva usando la conexión del servidor
const db = require('../src/config/database');

async function fixCodigoReserva() {
    try {
        console.log('🔧 Verificando si la columna codigo_reserva existe...');
        
        // Verificar si la columna ya existe
        const checkColumn = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'bloqueos_temporales' 
            AND column_name = 'codigo_reserva'
        `);
        
        if (checkColumn.length > 0) {
            console.log('✅ La columna codigo_reserva ya existe en bloqueos_temporales');
            return;
        }
        
        console.log('🔧 Agregando columna codigo_reserva...');
        
        // Agregar la columna
        await db.query(`
            ALTER TABLE bloqueos_temporales 
            ADD COLUMN codigo_reserva VARCHAR(50)
        `);
        
        console.log('✅ Columna codigo_reserva agregada exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Ejecutar
fixCodigoReserva()
    .then(() => {
        console.log('🎉 Migración completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error:', error);
        process.exit(1);
    });

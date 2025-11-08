const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para agregar columna metodo_pago a la tabla reservas
async function addMetodoPagoColumn() {
    console.log('🔧 Agregando columna metodo_pago a tabla reservas...');
    console.log('====================================================');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' AND column_name = 'metodo_pago'
        `);
        
        if (checkColumn.rows.length > 0) {
            console.log('✅ La columna metodo_pago ya existe en la tabla reservas');
            await client.query('COMMIT');
            return;
        }
        
        // Agregar columna metodo_pago
        console.log('📝 Agregando columna metodo_pago...');
        await client.query(`
            ALTER TABLE reservas 
            ADD COLUMN metodo_pago VARCHAR(50) DEFAULT NULL
        `);
        
        console.log('✅ Columna metodo_pago agregada exitosamente');
        
        // Agregar comentario a la columna
        await client.query(`
            COMMENT ON COLUMN reservas.metodo_pago IS 'Método de pago utilizado: efectivo, transferencia, webpay, tarjeta, otros'
        `);
        
        await client.query('COMMIT');
        console.log('✅ Transacción completada exitosamente');
        
    } catch (error) {
        console.error('\n❌ Error durante la operación:', error.message);
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar el script
addMetodoPagoColumn()
    .then(() => {
        console.log('\n✅ Script finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });



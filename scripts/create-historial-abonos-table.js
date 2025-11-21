const { Pool } = require('pg');
require('dotenv').config();

// Configurar conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para crear tabla historial_abonos_reservas
async function createHistorialAbonosTable() {
    console.log('🔧 Creando tabla historial_abonos_reservas...');
    console.log('====================================================');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Verificar si la tabla ya existe
        const checkTable = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'historial_abonos_reservas'
        `);
        
        if (checkTable.rows.length > 0) {
            console.log('✅ La tabla historial_abonos_reservas ya existe');
            await client.query('COMMIT');
            return;
        }
        
        // Crear tabla historial_abonos_reservas
        console.log('📝 Creando tabla historial_abonos_reservas...');
        await client.query(`
                CREATE TABLE IF NOT EXISTS historial_abonos_reservas (
                id SERIAL PRIMARY KEY,
                reserva_id INTEGER,
                codigo_reserva VARCHAR(50) NOT NULL REFERENCES reservas(codigo_reserva) ON DELETE CASCADE,
                monto_abonado INTEGER NOT NULL,
                metodo_pago VARCHAR(50) NOT NULL,
                fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usuario_id INTEGER REFERENCES usuarios(id),
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crear índices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_historial_abonos_reserva_id 
            ON historial_abonos_reservas(reserva_id)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_historial_abonos_codigo_reserva 
            ON historial_abonos_reservas(codigo_reserva)
        `);
        
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_historial_abonos_fecha 
            ON historial_abonos_reservas(fecha_abono)
        `);
        
        console.log('✅ Tabla historial_abonos_reservas creada exitosamente');
        
        // Agregar comentarios
        await client.query(`
            COMMENT ON TABLE historial_abonos_reservas IS 'Historial de todos los abonos realizados para cada reserva'
        `);
        
        await client.query(`
            COMMENT ON COLUMN historial_abonos_reservas.monto_abonado IS 'Monto del abono específico'
        `);
        
        await client.query(`
            COMMENT ON COLUMN historial_abonos_reservas.metodo_pago IS 'Método de pago usado para este abono: efectivo, transferencia, webpay, tarjeta, etc.'
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
createHistorialAbonosTable()
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






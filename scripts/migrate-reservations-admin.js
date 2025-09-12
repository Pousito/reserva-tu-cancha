const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateReservationsTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Iniciando migración de tabla reservas...');
        
        // Verificar si las columnas ya existen
        const checkColumns = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('tipo_reserva', 'creada_por_admin', 'admin_id', 'comision_aplicada', 'metodo_contacto')
        `);
        
        const existingColumns = checkColumns.rows.map(row => row.column_name);
        console.log('📋 Columnas existentes:', existingColumns);
        
        // Agregar columnas que no existen
        const columnsToAdd = [
            {
                name: 'tipo_reserva',
                definition: 'VARCHAR(20) DEFAULT \'directa\'',
                description: 'Tipo de reserva: directa, administrativa'
            },
            {
                name: 'creada_por_admin',
                definition: 'BOOLEAN DEFAULT FALSE',
                description: 'Indica si la reserva fue creada por un administrador'
            },
            {
                name: 'admin_id',
                definition: 'INTEGER REFERENCES usuarios(id)',
                description: 'ID del administrador que creó la reserva'
            },
            {
                name: 'comision_aplicada',
                definition: 'DECIMAL(10,2) DEFAULT 0.00',
                description: 'Comisión aplicada a la reserva'
            },
            {
                name: 'metodo_contacto',
                definition: 'VARCHAR(50) DEFAULT \'web\'',
                description: 'Método de contacto: web, presencial, whatsapp'
            }
        ];
        
        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Agregando columna: ${column.name}`);
                await client.query(`ALTER TABLE reservas ADD COLUMN ${column.name} ${column.definition}`);
                console.log(`✅ Columna ${column.name} agregada exitosamente`);
            } else {
                console.log(`⏭️ Columna ${column.name} ya existe, omitiendo...`);
            }
        }
        
        // Crear índices para mejorar rendimiento
        console.log('🔍 Creando índices...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_reservas_tipo_reserva ON reservas(tipo_reserva)',
            'CREATE INDEX IF NOT EXISTS idx_reservas_creada_por_admin ON reservas(creada_por_admin)',
            'CREATE INDEX IF NOT EXISTS idx_reservas_admin_id ON reservas(admin_id)',
            'CREATE INDEX IF NOT EXISTS idx_reservas_metodo_contacto ON reservas(metodo_contacto)'
        ];
        
        for (const indexQuery of indexes) {
            try {
                await client.query(indexQuery);
                console.log('✅ Índice creado exitosamente');
            } catch (error) {
                console.log('⚠️ Error creando índice (puede que ya exista):', error.message);
            }
        }
        
        // Actualizar reservas existentes
        console.log('🔄 Actualizando reservas existentes...');
        const updateResult = await client.query(`
            UPDATE reservas 
            SET 
                tipo_reserva = 'directa',
                creada_por_admin = FALSE,
                metodo_contacto = 'web',
                comision_aplicada = precio_total * 0.15
            WHERE tipo_reserva IS NULL
        `);
        
        console.log(`✅ ${updateResult.rowCount} reservas existentes actualizadas`);
        
        // Verificar la migración
        const verifyResult = await client.query(`
            SELECT 
                COUNT(*) as total_reservas,
                COUNT(CASE WHEN tipo_reserva = 'directa' THEN 1 END) as reservas_directas,
                COUNT(CASE WHEN creada_por_admin = TRUE THEN 1 END) as reservas_admin,
                AVG(comision_aplicada) as comision_promedio
            FROM reservas
        `);
        
        console.log('📊 Verificación de migración:');
        console.log(verifyResult.rows[0]);
        
        console.log('🎉 Migración completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
    migrateReservationsTable()
        .then(() => {
            console.log('✅ Migración completada');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error en migración:', error);
            process.exit(1);
        });
}

module.exports = { migrateReservationsTable };

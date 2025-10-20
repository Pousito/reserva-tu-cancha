const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos de producción
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verificarMovimientos() {
    console.log('💰 VERIFICANDO MOVIMIENTOS EN PRODUCCIÓN');
    console.log('========================================');
    
    try {
        const client = await pool.connect();
        console.log('✅ Conexión establecida');
        
        // Verificar movimientos en la tabla correcta
        console.log('\n🔍 Verificando tabla gastos_ingresos...');
        const movimientosQuery = `
            SELECT id, tipo, monto, fecha, descripcion, categoria_id, complejo_id, metodo_pago, numero_documento
            FROM gastos_ingresos 
            WHERE complejo_id = 8
            ORDER BY fecha DESC, id DESC;
        `;
        const movimientos = await client.query(movimientosQuery);
        console.log(`📊 Movimientos encontrados: ${movimientos.rows.length}`);
        
        if (movimientos.rows.length > 0) {
            console.log('\n💸 Detalle de movimientos:');
            movimientos.rows.forEach(mov => {
                console.log(`   - ID: ${mov.id}, Tipo: ${mov.tipo}, Monto: $${mov.monto}, Fecha: ${mov.fecha}`);
                console.log(`     Descripción: ${mov.descripcion}, Categoría: ${mov.categoria_id}`);
                console.log(`     Método: ${mov.metodo_pago}, Documento: ${mov.numero_documento}`);
                console.log('');
            });
        } else {
            console.log('❌ NO HAY MOVIMIENTOS para el Complejo 8');
        }
        
        // Verificar estructura de la tabla
        console.log('\n🔍 Verificando estructura de la tabla gastos_ingresos...');
        const estructuraQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'gastos_ingresos' 
            ORDER BY ordinal_position;
        `;
        const estructura = await client.query(estructuraQuery);
        console.log(`📊 Columnas encontradas: ${estructura.rows.length}`);
        estructura.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar verificación
verificarMovimientos();

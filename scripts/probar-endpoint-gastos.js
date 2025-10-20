const { Pool } = require('pg');
require('dotenv').config();

async function probarEndpoint() {
    console.log('🧪 PROBANDO ENDPOINT DE GASTOS');
    console.log('===============================');
    
    try {
        // Simular la consulta que hace el endpoint
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const client = await pool.connect();
        console.log('✅ Conexión establecida');
        
        // Simular la consulta del endpoint /api/gastos/movimientos
        const query = `
            SELECT 
                gi.id,
                gi.complejo_id,
                gi.categoria_id,
                gi.tipo,
                gi.monto,
                gi.fecha,
                gi.descripcion,
                gi.metodo_pago,
                gi.numero_documento,
                gi.creado_en,
                gi.actualizado_en,
                cat.nombre as categoria_nombre,
                cat.icono as categoria_icono,
                cat.color as categoria_color
            FROM gastos_ingresos gi
            JOIN categorias_gastos cat ON gi.categoria_id = cat.id
            WHERE gi.complejo_id = 8
            ORDER BY gi.fecha DESC, gi.id DESC;
        `;
        
        console.log('\n🔍 Ejecutando consulta del endpoint...');
        const result = await client.query(query);
        console.log(`📊 Resultados: ${result.rows.length} movimientos`);
        
        if (result.rows.length > 0) {
            console.log('\n💸 Movimientos encontrados:');
            result.rows.forEach(mov => {
                console.log(`   - ID: ${mov.id}, Tipo: ${mov.tipo}, Monto: $${mov.monto}`);
                console.log(`     Fecha: ${mov.fecha}, Categoría: ${mov.categoria_nombre}`);
            });
        }
        
        client.release();
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

probarEndpoint();

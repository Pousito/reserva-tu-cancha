const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function sincronizarReservasExistentes() {
    try {
        console.log('🔄 Sincronizando reservas confirmadas existentes...\n');
        
        // Obtener todas las reservas confirmadas sin ingresos asociados
        const reservasConfirmadas = await pool.query(`
            SELECT 
                r.id,
                r.codigo_reserva,
                r.precio_total,
                r.comision_aplicada,
                r.tipo_reserva,
                r.fecha,
                ca.complejo_id,
                co.nombre as complejo_nombre,
                ca.nombre as cancha_nombre
            FROM reservas r
            JOIN canchas ca ON r.cancha_id = ca.id
            JOIN complejos co ON ca.complejo_id = co.id
            LEFT JOIN gastos_ingresos gi ON gi.descripcion LIKE 'Reserva #' || r.codigo_reserva || '%'
            WHERE r.estado = 'confirmada'
            AND gi.id IS NULL
            ORDER BY ca.complejo_id, r.fecha DESC
        `);
        
        console.log(`📋 Reservas confirmadas sin ingresos: ${reservasConfirmadas.rows.length}\n`);
        
        if (reservasConfirmadas.rows.length === 0) {
            console.log('✅ Todas las reservas ya tienen ingresos registrados');
            await pool.end();
            return;
        }
        
        let ingresosCreados = 0;
        let gastosCreados = 0;
        
        for (const reserva of reservasConfirmadas.rows) {
            try {
                // Buscar categoría de ingresos para este complejo
                const catIngreso = await pool.query(`
                    SELECT id FROM categorias_gastos
                    WHERE complejo_id = $1
                    AND tipo = 'ingreso'
                    AND nombre = 'Reservas Web'
                    LIMIT 1
                `, [reserva.complejo_id]);
                
                // Buscar categoría de gastos (comisión) para este complejo
                const catComision = await pool.query(`
                    SELECT id FROM categorias_gastos
                    WHERE complejo_id = $1
                    AND tipo = 'gasto'
                    AND nombre = 'Comisión Plataforma'
                    LIMIT 1
                `, [reserva.complejo_id]);
                
                if (catIngreso.rows.length === 0 || catComision.rows.length === 0) {
                    console.log(`⚠️  Faltan categorías para complejo ${reserva.complejo_nombre}`);
                    continue;
                }
                
                const categoriaIngresoId = catIngreso.rows[0].id;
                const categoriaComisionId = catComision.rows[0].id;
                
                const precio = parseFloat(reserva.precio_total);
                const comision = parseFloat(reserva.comision_aplicada || 0);
                
                const tipoReservaTexto = reserva.tipo_reserva === 'directa' 
                    ? 'Web (3.5% + IVA)' 
                    : 'Admin (1.75% + IVA)';
                
                // Crear ingreso
                if (precio > 0) {
                    await pool.query(`
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, 
                            descripcion, metodo_pago, usuario_id
                        ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico', NULL)
                    `, [
                        reserva.complejo_id,
                        categoriaIngresoId,
                        precio,
                        reserva.fecha,
                        `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`
                    ]);
                    ingresosCreados++;
                }
                
                // Crear gasto de comisión
                if (comision > 0) {
                    await pool.query(`
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha,
                            descripcion, metodo_pago, usuario_id
                        ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico', NULL)
                    `, [
                        reserva.complejo_id,
                        categoriaComisionId,
                        comision,
                        reserva.fecha,
                        `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`
                    ]);
                    gastosCreados++;
                }
                
                console.log(`  ✅ ${reserva.complejo_nombre} - Reserva #${reserva.codigo_reserva}: $${precio.toLocaleString('es-CL')} (comisión: $${comision.toLocaleString('es-CL')})`);
                
            } catch (err) {
                console.error(`  ❌ Error en reserva #${reserva.codigo_reserva}:`, err.message);
            }
        }
        
        console.log(`\n📊 Resumen:`);
        console.log(`  ✅ ${ingresosCreados} ingresos creados`);
        console.log(`  ✅ ${gastosCreados} gastos de comisión creados\n`);
        
        // Mostrar totales por complejo
        const totales = await pool.query(`
            SELECT 
                co.nombre as complejo,
                COUNT(CASE WHEN gi.tipo = 'ingreso' THEN 1 END) as ingresos,
                SUM(CASE WHEN gi.tipo = 'ingreso' THEN gi.monto ELSE 0 END) as total_ingresos,
                COUNT(CASE WHEN gi.tipo = 'gasto' THEN 1 END) as gastos,
                SUM(CASE WHEN gi.tipo = 'gasto' THEN gi.monto ELSE 0 END) as total_gastos
            FROM complejos co
            LEFT JOIN gastos_ingresos gi ON co.id = gi.complejo_id
            GROUP BY co.id, co.nombre
            ORDER BY co.nombre
        `);
        
        console.log('📊 Estado final por complejo:\n');
        totales.rows.forEach(r => {
            console.log(`  ${r.complejo}:`);
            console.log(`    Ingresos: ${r.ingresos} ($${parseFloat(r.total_ingresos || 0).toLocaleString('es-CL')})`);
            console.log(`    Gastos: ${r.gastos} ($${parseFloat(r.total_gastos || 0).toLocaleString('es-CL')})`);
        });
        
        await pool.end();
    } catch (e) {
        console.error('❌ Error:', e);
        await pool.end();
        process.exit(1);
    }
}

sincronizarReservasExistentes();


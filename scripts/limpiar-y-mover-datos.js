#!/usr/bin/env node

/**
 * 🧹 LIMPIAR Y MOVER DATOS AL COMPLEJO 8
 * 
 * Limpiar duplicados y mover todos los datos al complejo correcto
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function limpiarYMoverDatos() {
    console.log('🧹 LIMPIANDO Y MOVIENDO DATOS AL COMPLEJO 8\n');
    
    try {
        // 1. Eliminar categorías duplicadas del complejo 8
        console.log('🧹 LIMPIANDO CATEGORÍAS DUPLICADAS DEL COMPLEJO 8...');
        
        await pool.query('DELETE FROM categorias_gastos WHERE complejo_id = 8');
        console.log('✅ Categorías del Complejo 8 eliminadas');
        
        // 2. Mover categorías del complejo 7 al 8
        console.log('\n🔄 MOVIENDO CATEGORÍAS DEL COMPLEJO 7 AL 8...');
        
        await pool.query(
            'UPDATE categorias_gastos SET complejo_id = 8 WHERE complejo_id = 7'
        );
        
        const categoriasMovidas = await pool.query(
            'SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = 8'
        );
        
        console.log(`✅ Categorías movidas al Complejo 8: ${categoriasMovidas.rows[0].count}`);
        
        // 3. Mover movimientos financieros del complejo 7 al 8
        console.log('\n🔄 MOVIENDO MOVIMIENTOS FINANCIEROS DEL COMPLEJO 7 AL 8...');
        
        await pool.query(
            'UPDATE gastos_ingresos SET complejo_id = 8 WHERE complejo_id = 7'
        );
        
        const movimientosMovidos = await pool.query(
            'SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 8'
        );
        
        console.log(`✅ Movimientos movidos al Complejo 8: ${movimientosMovidos.rows[0].count}`);
        
        // 4. Verificar reservas en el complejo 8
        console.log('\n🔍 VERIFICANDO RESERVAS EN EL COMPLEJO 8...');
        
        const reservasComplejo8 = await pool.query(`
            SELECT 
                r.codigo_reserva,
                r.estado,
                r.precio_total,
                r.comision_aplicada,
                r.fecha,
                c.nombre as cancha_nombre
            FROM reservas r
            LEFT JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = 8
            ORDER BY r.created_at DESC;
        `);
        
        console.log(`📊 Reservas en Complejo 8: ${reservasComplejo8.rows.length}`);
        reservasComplejo8.rows.forEach(reserva => {
            console.log(`   • #${reserva.codigo_reserva} - $${reserva.precio_total} - Estado: ${reserva.estado}`);
        });
        
        // 5. Sincronizar reservas nuevas
        console.log('\n🔄 SINCRONIZANDO RESERVAS NUEVAS...');
        
        for (const reserva of reservasComplejo8.rows) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                // Verificar si ya existe el ingreso
                const ingresoExistente = await pool.query(
                    'SELECT COUNT(*) as count FROM gastos_ingresos WHERE descripcion LIKE $1',
                    [`%Reserva #${reserva.codigo_reserva}%`]
                );
                
                if (parseInt(ingresoExistente.rows[0].count) === 0) {
                    // Obtener categorías del complejo 8
                    const categorias = await pool.query(
                        'SELECT id, tipo, nombre FROM categorias_gastos WHERE complejo_id = 8 ORDER BY tipo, nombre'
                    );
                    
                    const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                    const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                    
                    if (categoriaIngreso && categoriaGasto) {
                        // Crear ingreso
                        await pool.query(
                            'INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                            [8, categoriaIngreso.id, 'ingreso', reserva.precio_total, reserva.fecha, `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`, 'automatico']
                        );
                        console.log(`   ✅ Ingreso creado: $${reserva.precio_total} para reserva #${reserva.codigo_reserva}`);
                        
                        // Crear gasto de comisión si existe
                        if (reserva.comision_aplicada > 0) {
                            await pool.query(
                                'INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                [8, categoriaGasto.id, 'gasto', reserva.comision_aplicada, reserva.fecha, `Comisión Reserva #${reserva.codigo_reserva} - Web (3.5% + IVA)`, 'automatico']
                            );
                            console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} para reserva #${reserva.codigo_reserva}`);
                        }
                    }
                }
            }
        }
        
        // 6. Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        
        const verificacionFinal = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = 8) as movimientos,
                (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = 8) as categorias;
        `);
        
        console.log('📊 COMPLEJO 8 - ESTADO FINAL:');
        console.log(`   Movimientos: ${verificacionFinal.rows[0].movimientos}`);
        console.log(`   Categorías: ${verificacionFinal.rows[0].categorias}`);
        
        // Mostrar movimientos finales
        const movimientosFinales = await pool.query(`
            SELECT 
                gi.tipo,
                gi.monto,
                gi.descripcion,
                cg.nombre as categoria_nombre
            FROM gastos_ingresos gi
            LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
            WHERE gi.complejo_id = 8
            ORDER BY gi.fecha DESC, gi.creado_en DESC;
        `);
        
        console.log('\n💰 MOVIMIENTOS FINANCIEROS EN COMPLEJO 8:');
        movimientosFinales.rows.forEach(mov => {
            console.log(`   • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
            console.log(`     ${mov.descripcion}`);
        });
        
        console.log('\n🎯 SOLUCIÓN COMPLETADA:');
        console.log('========================');
        console.log('✅ Categorías duplicadas eliminadas');
        console.log('✅ Todas las categorías movidas al Complejo 8');
        console.log('✅ Todos los movimientos financieros movidos al Complejo 8');
        console.log('✅ Reservas nuevas sincronizadas');
        console.log('\n🔄 AHORA REFRESCA LA PÁGINA DEL CONTROL FINANCIERO');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

limpiarYMoverDatos().catch(console.error);



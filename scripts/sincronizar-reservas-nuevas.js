#!/usr/bin/env node

/**
 * 🔄 SINCRONIZAR RESERVAS NUEVAS DEL COMPLEJO 8
 * 
 * Sincronizar las reservas #IJRGBH y #1XJAKD que aparecen en el log
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function sincronizarReservasNuevas() {
    console.log('🔄 SINCRONIZANDO RESERVAS NUEVAS DEL COMPLEJO 8\n');
    
    try {
        // 1. Buscar las reservas específicas mencionadas en el log
        console.log('🔍 BUSCANDO RESERVAS ESPECÍFICAS...');
        
        const codigosReserva = ['IJRGBH', '1XJAKD'];
        
        for (const codigo of codigosReserva) {
            const reserva = await pool.query(
                'SELECT * FROM reservas WHERE codigo_reserva = $1',
                [codigo]
            );
            
            if (reserva.rows.length > 0) {
                console.log(`✅ Reserva #${codigo} encontrada: $${reserva.rows[0].precio_total}`);
            } else {
                console.log(`❌ Reserva #${codigo} no encontrada`);
            }
        }
        
        // 2. Buscar todas las reservas del complejo 8
        console.log('\n🔍 BUSCANDO TODAS LAS RESERVAS DEL COMPLEJO 8...');
        
        const reservasComplejo8 = await pool.query(`
            SELECT 
                r.id,
                r.codigo_reserva,
                r.estado,
                r.precio_total,
                r.comision_aplicada,
                r.fecha,
                r.created_at,
                c.nombre as cancha_nombre,
                c.complejo_id
            FROM reservas r
            LEFT JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = 8
            ORDER BY r.created_at DESC;
        `);
        
        console.log(`📊 Total reservas en Complejo 8: ${reservasComplejo8.rows.length}`);
        
        reservasComplejo8.rows.forEach(reserva => {
            console.log(`   • #${reserva.codigo_reserva} - $${reserva.precio_total} - Estado: ${reserva.estado} - Fecha: ${reserva.created_at}`);
        });
        
        // 3. Verificar categorías del complejo 8
        console.log('\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO 8...');
        
        const categorias = await pool.query(
            'SELECT id, nombre, tipo FROM categorias_gastos WHERE complejo_id = 8 ORDER BY tipo, nombre'
        );
        
        console.log(`📊 Categorías disponibles: ${categorias.rows.length}`);
        categorias.rows.forEach(cat => {
            console.log(`   • ${cat.nombre} (${cat.tipo})`);
        });
        
        const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
        const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
        
        if (!categoriaIngreso || !categoriaGasto) {
            console.log('❌ Faltan categorías necesarias para la sincronización');
            return;
        }
        
        // 4. Sincronizar reservas confirmadas
        console.log('\n🔄 SINCRONIZANDO RESERVAS CONFIRMADAS...');
        
        let reservasSincronizadas = 0;
        
        for (const reserva of reservasComplejo8.rows) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                // Verificar si ya existe el ingreso
                const ingresoExistente = await pool.query(
                    'SELECT COUNT(*) as count FROM gastos_ingresos WHERE descripcion LIKE $1',
                    [`%Reserva #${reserva.codigo_reserva}%`]
                );
                
                if (parseInt(ingresoExistente.rows[0].count) === 0) {
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
                    
                    reservasSincronizadas++;
                } else {
                    console.log(`   ⚠️ Reserva #${reserva.codigo_reserva} ya tiene movimientos financieros`);
                }
            }
        }
        
        // 5. Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        
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
        
        console.log(`📊 Total movimientos en Complejo 8: ${movimientosFinales.rows.length}`);
        
        const totalIngresos = movimientosFinales.rows
            .filter(m => m.tipo === 'ingreso')
            .reduce((sum, m) => sum + parseFloat(m.monto), 0);
        
        const totalGastos = movimientosFinales.relationships
            .filter(m => m.tipo === 'gasto')
            .reduce((sum, m) => sum + parseFloat(m.monto), 0);
        
        const totalGastosCorrecto = movimientosFinales.rows
            .filter(m => m.tipo === 'gasto')
            .reduce((sum, m) => sum + parseFloat(m.monto), 0);
        
        console.log(`💰 Total ingresos: $${totalIngresos.toLocaleString()}`);
        console.log(`💸 Total gastos: $${totalGastosCorrecto.toLocaleString()}`);
        console.log(`📈 Balance: $${(totalIngresos - totalGastosCorrecto).toLocaleString()}`);
        
        console.log('\n🎯 SINCRONIZACIÓN COMPLETADA:');
        console.log('==============================');
        console.log(`✅ ${reservasSincronizadas} reservas nuevas sincronizadas`);
        console.log(`✅ Total movimientos: ${movimientosFinales.rows.length}`);
        console.log('\n🔄 AHORA REFRESCA LA PÁGINA DEL CONTROL FINANCIERO');
        console.log('   Deberías ver todos los datos correctamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

sincronizarReservasNuevas().catch(console.error);



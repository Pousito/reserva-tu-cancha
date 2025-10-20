#!/usr/bin/env node

/**
 * 🔍 VERIFICAR ESTADO ACTUAL DEL USUARIO CON CONTRASEÑA FUNCIONANDO
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verificarUsuarioActual() {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL DEL USUARIO\n');
    
    try {
        const email = 'owner@complejodemo3.cl';
        
        // 1. Verificar usuario en la base de datos
        console.log('🔍 VERIFICANDO USUARIO EN BASE DE DATOS...');
        
        const usuario = await pool.query(
            'SELECT id, email, nombre, rol, complejo_id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (usuario.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const user = usuario.rows[0];
        console.log(`   ✅ Usuario encontrado:`);
        console.log(`      • ID: ${user.id}`);
        console.log(`      • Email: ${user.email}`);
        console.log(`      • Nombre: ${user.nombre}`);
        console.log(`      • Rol: ${user.rol}`);
        console.log(`      • Complejo ID: ${user.complejo_id}`);
        
        // 2. Verificar complejo asociado
        console.log('\n🔍 VERIFICANDO COMPLEJO ASOCIADO...');
        
        const complejo = await pool.query(
            'SELECT id, nombre, direccion FROM complejos WHERE id = $1',
            [user.complejo_id]
        );
        
        if (complejo.rows.length === 0) {
            console.log('❌ Complejo no encontrado');
            return;
        }
        
        const comp = complejo.rows[0];
        console.log(`   ✅ Complejo encontrado:`);
        console.log(`      • ID: ${comp.id}`);
        console.log(`      • Nombre: ${comp.nombre}`);
        console.log(`      • Dirección: ${comp.direccion}`);
        
        // 3. Verificar datos del complejo
        console.log('\n🔍 VERIFICANDO DATOS DEL COMPLEJO...');
        
        // Canchas
        const canchas = await pool.query(
            'SELECT id, nombre, tipo FROM canchas WHERE complejo_id = $1',
            [user.complejo_id]
        );
        
        console.log(`   📊 Canchas: ${canchas.rows.length}`);
        canchas.rows.forEach(cancha => {
            console.log(`      • ID: ${cancha.id} | Nombre: ${cancha.nombre} | Tipo: ${cancha.tipo}`);
        });
        
        // Reservas
        const reservasQuery = `
            SELECT 
                r.id,
                r.codigo_reserva,
                r.estado,
                r.precio_total,
                r.comision_aplicada,
                c.nombre as cancha_nombre
            FROM reservas r
            LEFT JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1
            ORDER BY r.created_at DESC;
        `;
        
        const reservas = await pool.query(reservasQuery, [user.complejo_id]);
        
        console.log(`\n   📊 Reservas: ${reservas.rows.length}`);
        reservas.rows.forEach(reserva => {
            console.log(`      • #${reserva.codigo_reserva} - $${reserva.precio_total} - ${reserva.cancha_nombre}`);
        });
        
        // Categorías
        const categorias = await pool.query(
            'SELECT id, nombre, tipo FROM categorias_gastos WHERE complejo_id = $1 ORDER BY tipo, nombre',
            [user.complejo_id]
        );
        
        console.log(`\n   📊 Categorías: ${categorias.rows.length}`);
        categorias.rows.forEach(cat => {
            console.log(`      • ${cat.nombre} (${cat.tipo})`);
        });
        
        // Movimientos financieros
        const movimientosQuery = `
            SELECT 
                gi.id,
                gi.tipo,
                gi.monto,
                gi.descripcion,
                gi.fecha,
                cg.nombre as categoria_nombre
            FROM gastos_ingresos gi
            LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
            WHERE gi.complejo_id = $1
            ORDER BY gi.fecha DESC, gi.creado_en DESC;
        `;
        
        const movimientos = await pool.query(movimientosQuery, [user.complejo_id]);
        
        console.log(`\n   📊 Movimientos financieros: ${movimientos.rows.length}`);
        movimientos.rows.forEach(mov => {
            console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
            console.log(`        ${mov.descripcion} (${mov.fecha})`);
        });
        
        // 4. Análisis del problema
        console.log('\n🤔 ANÁLISIS DEL PROBLEMA...');
        
        if (movimientos.rows.length === 0) {
            console.log('❌ PROBLEMA: No hay movimientos financieros');
            console.log('   CAUSA: Las reservas no se están sincronizando automáticamente');
            
            if (reservas.rows.length > 0) {
                console.log('\n🔧 SOLUCIÓN: Ejecutar sincronización manual...');
                
                // Buscar categorías necesarias
                const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                
                if (!categoriaIngreso || !categoriaGasto) {
                    console.log('❌ Faltan categorías necesarias para la sincronización');
                    console.log('   Creando categorías...');
                    
                    if (!categoriaIngreso) {
                        await pool.query(
                            'INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida) VALUES ($1, $2, $3, $4, $5, $6, true)',
                            [user.complejo_id, 'Reservas Web', 'Reservas realizadas a través de la plataforma web', 'fas fa-globe', '#28a745', 'ingreso']
                        );
                        console.log('   ✅ Categoría "Reservas Web" creada');
                    }
                    
                    if (!categoriaGasto) {
                        await pool.query(
                            'INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida) VALUES ($1, $2, $3, $4, $5, $6, true)',
                            [user.complejo_id, 'Comisión Plataforma', 'Comisión cobrada por la plataforma', 'fas fa-percentage', '#dc3545', 'gasto']
                        );
                        console.log('   ✅ Categoría "Comisión Plataforma" creada');
                    }
                }
                
                // Sincronizar reservas manualmente
                console.log('\n🔄 SINCRONIZANDO RESERVAS MANUALMENTE...');
                
                // Obtener categorías actualizadas
                const categoriasActualizadas = await pool.query(
                    'SELECT id, nombre, tipo FROM categorias_gastos WHERE complejo_id = $1 ORDER BY tipo, nombre',
                    [user.complejo_id]
                );
                
                const categoriaIngresoActualizada = categoriasActualizadas.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                const categoriaGastoActualizada = categoriasActualizadas.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                
                for (const reserva of reservas.rows) {
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
                                [user.complejo_id, categoriaIngresoActualizada.id, 'ingreso', reserva.precio_total, reserva.fecha, `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`, 'automatico']
                            );
                            console.log(`   ✅ Ingreso creado: $${reserva.precio_total} para reserva #${reserva.codigo_reserva}`);
                            
                            // Crear gasto de comisión si existe
                            if (reserva.comision_aplicada > 0) {
                                const tipoReservaTexto = 'Web (3.5% + IVA)';
                                await pool.query(
                                    'INSERT INTO gastos_ingresos (complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                                    [user.complejo_id, categoriaGastoActualizada.id, 'gasto', reserva.comision_aplicada, reserva.fecha, `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`, 'automatico']
                                );
                                console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} para reserva #${reserva.codigo_reserva}`);
                            }
                        }
                    }
                }
                
                console.log('✅ Sincronización manual completada');
            }
        } else {
            console.log('✅ Los movimientos financieros existen');
            console.log('   El problema puede ser de cache o permisos en el frontend');
        }
        
        // 5. Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        
        const movimientosFinales = await pool.query(
            'SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1',
            [user.complejo_id]
        );
        
        const categoriasFinales = await pool.query(
            'SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1',
            [user.complejo_id]
        );
        
        console.log(`   Movimientos finales: ${movimientosFinales.rows[0].count}`);
        console.log(`   Categorías finales: ${categoriasFinales.rows[0].count}`);
        
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('==================');
        console.log(`✅ Usuario: ${user.email} (ID: ${user.id})`);
        console.log(`✅ Complejo: ${comp.nombre} (ID: ${comp.id})`);
        console.log(`✅ Reservas: ${reservas.rows.length}`);
        console.log(`✅ Categorías: ${categoriasFinales.rows[0].count}`);
        console.log(`✅ Movimientos: ${movimientosFinales.rows[0].count}`);
        
        if (parseInt(movimientosFinales.rows[0].count) > 0) {
            console.log('\n🎉 ¡EL CONTROL FINANCIERO DEBERÍA FUNCIONAR!');
            console.log('   Si no ves los datos, cierra el navegador y vuelve a loguearte');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verificarUsuarioActual().catch(console.error);



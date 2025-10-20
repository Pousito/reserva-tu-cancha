#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO CONTROL FINANCIERO AUTOMÁTICO
 * 
 * Este script diagnostica por qué no funciona el control financiero
 * automático en producción después de realizar una reserva.
 */

const { Pool } = require('pg');
require('dotenv').config();

class ControlFinancieroDiagnostico {
    constructor() {
        this.pool = null;
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    async conectar() {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: this.isProduction ? { rejectUnauthorized: false } : false
            });

            console.log('✅ Conectado a la base de datos');
            console.log(`📍 Entorno: ${this.isProduction ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
            console.log(`🔗 URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error.message);
            process.exit(1);
        }
    }

    async verificarTriggers() {
        console.log('\n🔍 VERIFICANDO TRIGGERS...');
        
        try {
            const query = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_timing,
                    action_statement
                FROM information_schema.triggers
                WHERE trigger_name LIKE '%reserva%ingresos%'
                ORDER BY trigger_name;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON TRIGGERS DE SINCRONIZACIÓN');
                console.log('   Los triggers no están instalados en la base de datos');
                return false;
            }
            
            console.log('✅ Triggers encontrados:');
            result.rows.forEach(row => {
                console.log(`   • ${row.trigger_name} - ${row.event_manipulation} en ${row.event_object_table}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando triggers:', error.message);
            return false;
        }
    }

    async verificarFunciones() {
        console.log('\n🔍 VERIFICANDO FUNCIONES...');
        
        try {
            const query = `
                SELECT 
                    routine_name,
                    routine_type,
                    data_type
                FROM information_schema.routines
                WHERE routine_name LIKE '%reserva%ingresos%'
                ORDER BY routine_name;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON FUNCIONES DE SINCRONIZACIÓN');
                return false;
            }
            
            console.log('✅ Funciones encontradas:');
            result.rows.forEach(row => {
                console.log(`   • ${row.routine_name} (${row.routine_type})`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando funciones:', error.message);
            return false;
        }
    }

    async verificarCategorias() {
        console.log('\n🔍 VERIFICANDO CATEGORÍAS...');
        
        try {
            // Verificar categorías de ingresos
            const ingresosQuery = `
                SELECT 
                    cg.id,
                    cg.nombre,
                    cg.complejo_id,
                    c.nombre as complejo_nombre,
                    COUNT(gi.id) as movimientos_count
                FROM categorias_gastos cg
                LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
                LEFT JOIN complejos c ON cg.complejo_id = c.id
                WHERE cg.tipo = 'ingreso'
                GROUP BY cg.id, cg.nombre, cg.complejo_id, c.nombre
                ORDER BY cg.complejo_id, cg.nombre;
            `;
            
            const ingresos = await this.pool.query(ingresosQuery);
            
            // Verificar categorías de gastos (comisión)
            const gastosQuery = `
                SELECT 
                    cg.id,
                    cg.nombre,
                    cg.complejo_id,
                    c.nombre as complejo_nombre,
                    COUNT(gi.id) as movimientos_count
                FROM categorias_gastos cg
                LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
                LEFT JOIN complejos c ON cg.complejo_id = c.id
                WHERE cg.tipo = 'gasto'
                GROUP BY cg.id, cg.nombre, cg.complejo_id, c.nombre
                ORDER BY cg.complejo_id, cg.nombre;
            `;
            
            const gastos = await this.pool.query(gastosQuery);
            
            console.log('📊 CATEGORÍAS DE INGRESOS:');
            if (ingresos.rows.length === 0) {
                console.log('   ❌ No hay categorías de ingresos');
            } else {
                ingresos.rows.forEach(row => {
                    console.log(`   • ${row.nombre} (Complejo: ${row.complejo_nombre}) - ${row.movimientos_count} movimientos`);
                });
            }
            
            console.log('\n📊 CATEGORÍAS DE GASTOS:');
            if (gastos.rows.length === 0) {
                console.log('   ❌ No hay categorías de gastos');
            } else {
                gastos.rows.forEach(row => {
                    console.log(`   • ${row.nombre} (Complejo: ${row.complejo_nombre}) - ${row.movimientos_count} movimientos`);
                });
            }
            
            // Verificar específicamente las categorías necesarias
            const necesariasQuery = `
                SELECT 
                    cg.nombre,
                    cg.tipo,
                    cg.complejo_id,
                    c.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos c ON cg.complejo_id = c.id
                WHERE (cg.nombre = 'Reservas Web' AND cg.tipo = 'ingreso')
                   OR (cg.nombre = 'Comisión Plataforma' AND cg.tipo = 'gasto')
                ORDER BY cg.complejo_id, cg.tipo;
            `;
            
            const necesarias = await this.pool.query(necesariasQuery);
            
            console.log('\n🎯 CATEGORÍAS NECESARIAS PARA SINCRONIZACIÓN:');
            if (necesarias.rows.length === 0) {
                console.log('   ❌ NO EXISTEN las categorías necesarias para la sincronización');
                console.log('   Se necesitan:');
                console.log('     • "Reservas Web" (tipo: ingreso)');
                console.log('     • "Comisión Plataforma" (tipo: gasto)');
                return false;
            } else {
                necesarias.rows.forEach(row => {
                    console.log(`   ✅ ${row.nombre} (${row.tipo}) - Complejo: ${row.complejo_nombre}`);
                });
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async revisarUltimaReserva() {
        console.log('\n🔍 REVISANDO ÚLTIMA RESERVA...');
        
        try {
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    r.tipo_reserva,
                    r.fecha,
                    r.hora_inicio,
                    r.hora_fin,
                    c.nombre as cancha_nombre,
                    comp.nombre as complejo_nombre,
                    r.created_at
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY r.created_at DESC
                LIMIT 5;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log('   ❌ No hay reservas en el sistema');
                return;
            }
            
            console.log('📋 ÚLTIMAS 5 RESERVAS:');
            result.rows.forEach((row, index) => {
                console.log(`\n   ${index + 1}. Reserva #${row.codigo_reserva}`);
                console.log(`      Estado: ${row.estado}`);
                console.log(`      Precio: $${row.precio_total || 0}`);
                console.log(`      Comisión: $${row.comision_aplicada || 0}`);
                console.log(`      Tipo: ${row.tipo_reserva}`);
                console.log(`      Cancha: ${row.cancha_nombre}`);
                console.log(`      Complejo: ${row.complejo_nombre}`);
                console.log(`      Fecha: ${row.fecha} ${row.hora_inicio}-${row.hora_fin}`);
                console.log(`      Creada: ${row.created_at}`);
            });
            
            // Verificar si hay movimientos financieros para la última reserva
            if (result.rows.length > 0) {
                const ultimaReserva = result.rows[0];
                await this.verificarMovimientosReserva(ultimaReserva.codigo_reserva);
            }
            
        } catch (error) {
            console.error('❌ Error revisando última reserva:', error.message);
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        console.log(`\n🔍 VERIFICANDO MOVIMIENTOS PARA RESERVA #${codigoReserva}...`);
        
        try {
            const query = `
                SELECT 
                    gi.id,
                    gi.tipo,
                    gi.monto,
                    gi.descripcion,
                    gi.fecha,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE '%Reserva #${codigoReserva}%'
                ORDER BY gi.tipo, gi.fecha;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log(`   ❌ NO HAY MOVIMIENTOS FINANCIEROS para la reserva #${codigoReserva}`);
                console.log('   Esto confirma que la sincronización automática NO está funcionando');
                return false;
            }
            
            console.log(`   ✅ MOVIMIENTOS ENCONTRADOS para reserva #${codigoReserva}:`);
            result.rows.forEach(row => {
                console.log(`      • ${row.tipo.toUpperCase()}: $${row.monto} - ${row.categoria_nombre}`);
                console.log(`        Descripción: ${row.descripcion}`);
                console.log(`        Fecha: ${row.fecha}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos de reserva:', error.message);
            return false;
        }
    }

    async ejecutarSincronizacionManual() {
        console.log('\n🔧 EJECUTANDO SINCRONIZACIÓN MANUAL...');
        
        try {
            // Buscar reservas confirmadas sin movimientos financieros
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.precio_total,
                    r.comision_aplicada,
                    r.fecha,
                    r.tipo_reserva,
                    c.complejo_id,
                    c.nombre as cancha_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE r.estado = 'confirmada'
                AND r.precio_total > 0
                AND NOT EXISTS (
                    SELECT 1 FROM gastos_ingresos gi
                    WHERE gi.descripcion LIKE '%Reserva #' || r.codigo_reserva || '%'
                )
                ORDER BY r.created_at DESC
                LIMIT 10;
            `;
            
            const reservasSinSincronizar = await this.pool.query(query);
            
            if (reservasSinSincronizar.rows.length === 0) {
                console.log('   ✅ No hay reservas pendientes de sincronización');
                return;
            }
            
            console.log(`   📋 Encontradas ${reservasSinSincronizar.rows.length} reservas sin sincronizar:`);
            
            for (const reserva of reservasSinSincronizar.rows) {
                console.log(`\n   🔄 Sincronizando reserva #${reserva.codigo_reserva}...`);
                
                // Buscar categorías para este complejo
                const categoriasQuery = `
                    SELECT id, tipo, nombre
                    FROM categorias_gastos
                    WHERE complejo_id = $1
                    AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                         OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
                `;
                
                const categorias = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
                
                if (categorias.rows.length < 2) {
                    console.log(`      ❌ Faltan categorías para complejo ${reserva.complejo_id}`);
                    continue;
                }
                
                const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso');
                const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto');
                
                // Insertar ingreso
                const insertIngresoQuery = `
                    INSERT INTO gastos_ingresos (
                        complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                    ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico')
                    RETURNING id;
                `;
                
                const descripcionIngreso = `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`;
                
                const ingresoResult = await this.pool.query(insertIngresoQuery, [
                    reserva.complejo_id,
                    categoriaIngreso.id,
                    reserva.precio_total,
                    reserva.fecha,
                    descripcionIngreso
                ]);
                
                console.log(`      ✅ Ingreso creado: $${reserva.precio_total}`);
                
                // Insertar gasto de comisión si existe
                if (reserva.comision_aplicada > 0) {
                    const tipoReservaTexto = reserva.tipo_reserva === 'directa' ? 
                        'Web (3.5% + IVA)' : 'Admin (1.75% + IVA)';
                    
                    const insertGastoQuery = `
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                        ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico')
                        RETURNING id;
                    `;
                    
                    const descripcionGasto = `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`;
                    
                    const gastoResult = await this.pool.query(insertGastoQuery, [
                        reserva.complejo_id,
                        categoriaGasto.id,
                        reserva.comision_aplicada,
                        reserva.fecha,
                        descripcionGasto
                    ]);
                    
                    console.log(`      ✅ Comisión creada: $${reserva.comision_aplicada}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error ejecutando sincronización manual:', error.message);
        }
    }

    async generarReporte() {
        console.log('\n📊 GENERANDO REPORTE FINAL...');
        
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_reservas,
                    COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
                    COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as reservas_canceladas,
                    SUM(CASE WHEN estado = 'confirmada' THEN precio_total ELSE 0 END) as total_ingresos_reservas,
                    SUM(CASE WHEN estado = 'confirmada' THEN comision_aplicada ELSE 0 END) as total_comisiones
                FROM reservas;
            `;
            
            const reservas = await this.pool.query(query);
            
            const movimientosQuery = `
                SELECT 
                    COUNT(*) as total_movimientos,
                    COUNT(CASE WHEN tipo = 'ingreso' THEN 1 END) as total_ingresos,
                    COUNT(CASE WHEN tipo = 'gasto' THEN 1 END) as total_gastos,
                    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as suma_ingresos,
                    SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as suma_gastos
                FROM gastos_ingresos;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log('\n📈 ESTADÍSTICAS DEL SISTEMA:');
            console.log(`   📋 Total de reservas: ${reservas.rows[0].total_reservas}`);
            console.log(`   ✅ Reservas confirmadas: ${reservas.rows[0].reservas_confirmadas}`);
            console.log(`   ❌ Reservas canceladas: ${reservas.rows[0].reservas_canceladas}`);
            console.log(`   💰 Ingresos por reservas: $${reservas.rows[0].total_ingresos_reservas || 0}`);
            console.log(`   💸 Comisiones por reservas: $${reservas.rows[0].total_comisiones || 0}`);
            
            console.log(`\n💳 MOVIMIENTOS FINANCIEROS:`);
            console.log(`   📊 Total movimientos: ${movimientos.rows[0].total_movimientos}`);
            console.log(`   💰 Total ingresos: $${movimientos.rows[0].suma_ingresos || 0}`);
            console.log(`   💸 Total gastos: $${movimientos.rows[0].suma_gastos || 0}`);
            console.log(`   📈 Balance: $${(movimientos.rows[0].suma_ingresos || 0) - (movimientos.rows[0].suma_gastos || 0)}`);
            
        } catch (error) {
            console.error('❌ Error generando reporte:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO DEL CONTROL FINANCIERO AUTOMÁTICO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // Verificaciones principales
        const triggersOk = await this.verificarTriggers();
        const funcionesOk = await this.verificarFunciones();
        const categoriasOk = await this.verificarCategorias();
        
        await this.revisarUltimaReserva();
        
        // Resumen del diagnóstico
        console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
        console.log('=' .repeat(40));
        
        if (!triggersOk) {
            console.log('❌ PROBLEMA PRINCIPAL: Los triggers no están instalados');
            console.log('   SOLUCIÓN: Ejecutar el script de sincronización de reservas');
        } else if (!categoriasOk) {
            console.log('❌ PROBLEMA PRINCIPAL: Faltan las categorías necesarias');
            console.log('   SOLUCIÓN: Crear las categorías "Reservas Web" y "Comisión Plataforma"');
        } else {
            console.log('✅ El sistema parece estar configurado correctamente');
            console.log('   El problema puede ser temporal o específico de ciertas reservas');
        }
        
        // Preguntar si ejecutar sincronización manual
        console.log('\n🔧 ¿Deseas ejecutar sincronización manual? (y/n)');
        
        // En un entorno automatizado, ejecutar directamente
        await this.ejecutarSincronizacionManual();
        
        await this.generarReporte();
        await this.cerrar();
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const diagnostico = new ControlFinancieroDiagnostico();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = ControlFinancieroDiagnostico;



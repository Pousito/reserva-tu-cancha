#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO CONTROL FINANCIERO EN PRODUCCIÓN
 * 
 * Este script diagnostica el control financiero automático
 * específicamente en el entorno de producción (Render).
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ProduccionDiagnostico {
    constructor() {
        this.pool = null;
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN (Render)...');
            console.log(`📍 URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
            
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            // Verificar conexión
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as server_time');
            client.release();
            
            console.log('✅ Conectado a PRODUCCIÓN');
            console.log(`🕐 Hora del servidor: ${result.rows[0].server_time}`);
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async verificarTriggersProduccion() {
        console.log('\n🔍 VERIFICANDO TRIGGERS EN PRODUCCIÓN...');
        
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
                console.log('❌ NO SE ENCONTRARON TRIGGERS EN PRODUCCIÓN');
                console.log('   PROBLEMA: Los triggers no están instalados en la base de datos de producción');
                return false;
            }
            
            console.log('✅ Triggers encontrados en producción:');
            result.rows.forEach(row => {
                console.log(`   • ${row.trigger_name} - ${row.event_manipulation} en ${row.event_object_table}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando triggers en producción:', error.message);
            return false;
        }
    }

    async verificarCategoriasProduccion() {
        console.log('\n🔍 VERIFICANDO CATEGORÍAS EN PRODUCCIÓN...');
        
        try {
            // Verificar categorías necesarias para sincronización
            const query = `
                SELECT 
                    cg.nombre,
                    cg.tipo,
                    cg.complejo_id,
                    c.nombre as complejo_nombre,
                    COUNT(gi.id) as movimientos_count
                FROM categorias_gastos cg
                LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
                LEFT JOIN complejos c ON cg.complejo_id = c.id
                WHERE (cg.nombre = 'Reservas Web' AND cg.tipo = 'ingreso')
                   OR (cg.nombre = 'Comisión Plataforma' AND cg.tipo = 'gasto')
                GROUP BY cg.id, cg.nombre, cg.tipo, cg.complejo_id, c.nombre
                ORDER BY cg.complejo_id, cg.tipo;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS NECESARIAS EN PRODUCCIÓN');
                console.log('   PROBLEMA: Faltan las categorías "Reservas Web" y "Comisión Plataforma"');
                return false;
            }
            
            console.log('📊 CATEGORÍAS NECESARIAS EN PRODUCCIÓN:');
            result.rows.forEach(row => {
                console.log(`   ✅ ${row.nombre} (${row.tipo}) - Complejo: ${row.complejo_nombre || 'NULL'} - ${row.movimientos_count} movimientos`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando categorías en producción:', error.message);
            return false;
        }
    }

    async revisarReservasRecientesProduccion() {
        console.log('\n🔍 REVISANDO RESERVAS RECIENTES EN PRODUCCIÓN...');
        
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
                WHERE r.created_at >= NOW() - INTERVAL '7 days'
                ORDER BY r.created_at DESC
                LIMIT 10;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log('   ⚠️ No hay reservas en los últimos 7 días');
                return;
            }
            
            console.log('📋 RESERVAS DE LOS ÚLTIMOS 7 DÍAS:');
            result.rows.forEach((row, index) => {
                console.log(`\n   ${index + 1}. Reserva #${row.codigo_reserva}`);
                console.log(`      Estado: ${row.estado}`);
                console.log(`      Precio: $${row.precio_total || 0}`);
                console.log(`      Comisión: $${row.comision_aplicada || 0}`);
                console.log(`      Complejo: ${row.complejo_nombre}`);
                console.log(`      Fecha: ${row.fecha} ${row.hora_inicio}-${row.hora_fin}`);
                console.log(`      Creada: ${row.created_at}`);
                
                // Verificar si tiene movimientos financieros
                this.verificarMovimientosReserva(row.codigo_reserva);
            });
            
        } catch (error) {
            console.error('❌ Error revisando reservas en producción:', error.message);
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        try {
            const query = `
                SELECT 
                    gi.tipo,
                    gi.monto,
                    gi.descripcion,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE '%Reserva #${codigoReserva}%'
                ORDER BY gi.tipo;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log(`      ❌ SIN MOVIMIENTOS FINANCIEROS`);
                return false;
            }
            
            console.log(`      ✅ CON MOVIMIENTOS:`);
            result.rows.forEach(row => {
                console.log(`         • ${row.tipo.toUpperCase()}: $${row.monto} - ${row.categoria_nombre}`);
            });
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error verificando movimientos de reserva #${codigoReserva}:`, error.message);
            return false;
        }
    }

    async instalarTriggersSiFaltan() {
        console.log('\n🔧 VERIFICANDO SI NECESITA INSTALAR TRIGGERS...');
        
        const triggersExisten = await this.verificarTriggersProduccion();
        
        if (!triggersExisten) {
            console.log('\n🚀 INSTALANDO TRIGGERS EN PRODUCCIÓN...');
            
            try {
                // Leer el script de sincronización
                const fs = require('fs');
                const path = require('path');
                const scriptPath = path.join(__dirname, 'sql', 'sincronizar-reservas-ingresos.sql');
                
                if (fs.existsSync(scriptPath)) {
                    const script = fs.readFileSync(scriptPath, 'utf8');
                    
                    // Ejecutar el script
                    await this.pool.query(script);
                    
                    console.log('✅ Triggers instalados correctamente en producción');
                    return true;
                } else {
                    console.log('❌ No se encontró el script de sincronización');
                    return false;
                }
                
            } catch (error) {
                console.error('❌ Error instalando triggers:', error.message);
                return false;
            }
        }
        
        return true;
    }

    async crearCategoriasSiFaltan() {
        console.log('\n🔧 VERIFICANDO SI NECESITA CREAR CATEGORÍAS...');
        
        try {
            // Verificar si existen categorías para algún complejo
            const query = `
                SELECT DISTINCT cg.complejo_id, c.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos c ON cg.complejo_id = c.id
                WHERE cg.nombre IN ('Reservas Web', 'Comisión Plataforma')
                GROUP BY cg.complejo_id, c.nombre;
            `;
            
            const complejosConCategorias = await this.pool.query(query);
            
            // Obtener todos los complejos
            const todosComplejos = await this.pool.query('SELECT id, nombre FROM complejos ORDER BY id');
            
            console.log(`📊 Complejos con categorías: ${complejosConCategorias.rows.length}`);
            console.log(`📊 Total de complejos: ${todosComplejos.rows.length}`);
            
            if (complejosConCategorias.rows.length < todosComplejos.rows.length) {
                console.log('🚀 CREANDO CATEGORÍAS FALTANTES...');
                
                for (const complejo of todosComplejos.rows) {
                    const tieneCategorias = complejosConCategorias.rows.some(c => c.complejo_id === complejo.id);
                    
                    if (!tieneCategorias) {
                        console.log(`   📝 Creando categorías para: ${complejo.nombre}`);
                        
                        // Crear categoría de ingresos
                        await this.pool.query(`
                            INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
                            VALUES ($1, 'Reservas Web', 'Reservas realizadas a través de la plataforma web', 'fas fa-globe', '#28a745', 'ingreso', true)
                            ON CONFLICT (nombre, complejo_id) DO NOTHING;
                        `, [complejo.id]);
                        
                        // Crear categoría de comisión
                        await this.pool.query(`
                            INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
                            VALUES ($1, 'Comisión Plataforma', 'Comisión cobrada por la plataforma por reservas web', 'fas fa-percentage', '#dc3545', 'gasto', true)
                            ON CONFLICT (nombre, complejo_id) DO NOTHING;
                        `, [complejo.id]);
                        
                        console.log(`      ✅ Categorías creadas para ${complejo.nombre}`);
                    }
                }
                
                console.log('✅ Proceso de creación de categorías completado');
            } else {
                console.log('✅ Todos los complejos ya tienen las categorías necesarias');
            }
            
        } catch (error) {
            console.error('❌ Error creando categorías:', error.message);
        }
    }

    async sincronizarReservasPendientes() {
        console.log('\n🔄 SINCRONIZANDO RESERVAS PENDIENTES EN PRODUCCIÓN...');
        
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
                ORDER BY r.created_at DESC;
            `;
            
            const reservasSinSincronizar = await this.pool.query(query);
            
            if (reservasSinSincronizar.rows.length === 0) {
                console.log('   ✅ No hay reservas pendientes de sincronización');
                return;
            }
            
            console.log(`   📋 Encontradas ${reservasSinSincronizar.rows.length} reservas sin sincronizar`);
            
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
                
                await this.pool.query(insertIngresoQuery, [
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
                    
                    await this.pool.query(insertGastoQuery, [
                        reserva.complejo_id,
                        categoriaGasto.id,
                        reserva.comision_aplicada,
                        reserva.fecha,
                        descripcionGasto
                    ]);
                    
                    console.log(`      ✅ Comisión creada: $${reserva.comision_aplicada}`);
                }
            }
            
            console.log('\n✅ Sincronización manual completada');
            
        } catch (error) {
            console.error('❌ Error en sincronización manual:', error.message);
        }
    }

    async generarReporteProduccion() {
        console.log('\n📊 REPORTE DE PRODUCCIÓN...');
        
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_reservas,
                    COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
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
            
            console.log('\n📈 ESTADÍSTICAS DE PRODUCCIÓN:');
            console.log(`   📋 Total de reservas: ${reservas.rows[0].total_reservas}`);
            console.log(`   ✅ Reservas confirmadas: ${reservas.rows[0].reservas_confirmadas}`);
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
            console.log('\n✅ Conexión a producción cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO DE PRODUCCIÓN - CONTROL FINANCIERO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // Verificaciones principales
        const triggersOk = await this.verificarTriggersProduccion();
        const categoriasOk = await this.verificarCategoriasProduccion();
        
        // Instalar componentes faltantes
        if (!triggersOk) {
            await this.instalarTriggersSiFaltan();
        }
        
        if (!categoriasOk) {
            await this.crearCategoriasSiFaltan();
        }
        
        await this.revisarReservasRecientesProduccion();
        await this.sincronizarReservasPendientes();
        await this.generarReporteProduccion();
        
        // Resumen final
        console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO DE PRODUCCIÓN:');
        console.log('=' .repeat(50));
        
        if (!triggersOk) {
            console.log('✅ SOLUCIONADO: Triggers instalados en producción');
        }
        
        if (!categoriasOk) {
            console.log('✅ SOLUCIONADO: Categorías creadas en producción');
        }
        
        console.log('✅ El control financiero automático debería funcionar ahora');
        console.log('🔄 Las próximas reservas se sincronizarán automáticamente');
        
        await this.cerrar();
    }
}

// Ejecutar diagnóstico de producción
if (require.main === module) {
    const diagnostico = new ProduccionDiagnostico();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = ProduccionDiagnostico;



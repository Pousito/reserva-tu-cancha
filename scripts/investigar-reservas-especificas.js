#!/usr/bin/env node

/**
 * 🔍 INVESTIGACIÓN DE RESERVAS ESPECÍFICAS
 * 
 * Este script investiga por qué las reservas BQNI8W e IJRGBH
 * no están generando movimientos financieros automáticos.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionReservasEspecificas {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH'];
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN para investigar reservas específicas...');
            
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

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

    async investigarReservasEspecificas() {
        console.log('\n🔍 INVESTIGANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(60));
        
        for (const codigoReserva of this.reservasEspecificas) {
            console.log(`\n📋 INVESTIGANDO RESERVA: ${codigoReserva}`);
            console.log('-'.repeat(40));
            
            await this.investigarReservaIndividual(codigoReserva);
        }
    }

    async investigarReservaIndividual(codigoReserva) {
        try {
            // 1. Buscar la reserva
            const reservaQuery = `
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
                    r.created_at,
                    c.nombre as cancha_nombre,
                    c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.codigo_reserva = $1;
            `;
            
            const reservaResult = await this.pool.query(reservaQuery, [codigoReserva]);
            
            if (reservaResult.rows.length === 0) {
                console.log(`❌ RESERVA NO ENCONTRADA: ${codigoReserva}`);
                return;
            }
            
            const reserva = reservaResult.rows[0];
            console.log(`✅ Reserva encontrada:`);
            console.log(`   • ID: ${reserva.id}`);
            console.log(`   • Estado: ${reserva.estado}`);
            console.log(`   • Precio Total: $${reserva.precio_total || 0}`);
            console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
            console.log(`   • Tipo: ${reserva.tipo_reserva}`);
            console.log(`   • Fecha: ${reserva.fecha}`);
            console.log(`   • Cancha: ${reserva.cancha_nombre}`);
            console.log(`   • Complejo: ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
            console.log(`   • Creada: ${reserva.created_at}`);
            
            // 2. Verificar si tiene movimientos financieros
            console.log(`\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...`);
            
            const movimientosQuery = `
                SELECT 
                    gi.id,
                    gi.tipo,
                    gi.monto,
                    gi.fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.creado_en,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE $1
                ORDER BY gi.tipo, gi.creado_en;
            `;
            
            const movimientosResult = await this.pool.query(movimientosQuery, [`%${codigoReserva}%`]);
            
            if (movimientosResult.rows.length === 0) {
                console.log(`❌ NO HAY MOVIMIENTOS FINANCIEROS PARA ESTA RESERVA`);
                
                // 3. Verificar si las categorías existen para este complejo
                await this.verificarCategoriasComplejo(reserva.complejo_id);
                
                // 4. Intentar crear los movimientos manualmente
                if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                    console.log(`\n🔧 INTENTANDO CREAR MOVIMIENTOS MANUALMENTE...`);
                    await this.crearMovimientosManuales(reserva);
                }
                
            } else {
                console.log(`✅ MOVIMIENTOS ENCONTRADOS: ${movimientosResult.rows.length}`);
                movimientosResult.rows.forEach(mov => {
                    console.log(`   • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     Descripción: ${mov.descripcion}`);
                    console.log(`     Creado: ${mov.creado_en}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Error investigando reserva ${codigoReserva}:`, error.message);
        }
    }

    async verificarCategoriasComplejo(complejoId) {
        console.log(`\n🔍 VERIFICANDO CATEGORÍAS PARA COMPLEJO ${complejoId}...`);
        
        try {
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'))
                ORDER BY tipo, nombre;
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
            
            if (categoriasResult.rows.length < 2) {
                console.log(`❌ FALTAN CATEGORÍAS NECESARIAS:`);
                console.log(`   Categorías encontradas: ${categoriasResult.rows.length}`);
                categoriasResult.rows.forEach(cat => {
                    console.log(`   • ${cat.nombre} (${cat.tipo})`);
                });
                return false;
            } else {
                console.log(`✅ CATEGORÍAS NECESARIAS ENCONTRADAS:`);
                categoriasResult.rows.forEach(cat => {
                    console.log(`   • ${cat.nombre} (${cat.tipo}) - ID: ${cat.id}`);
                });
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async crearMovimientosManuales(reserva) {
        try {
            console.log(`🔧 Creando movimientos para reserva ${reserva.codigo_reserva}...`);
            
            // Obtener categorías
            const categoriasQuery = `
                SELECT id, tipo, nombre
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
            
            if (categoriasResult.rows.length < 2) {
                console.log(`❌ No se pueden crear movimientos: faltan categorías`);
                return;
            }
            
            const categoriaIngreso = categoriasResult.rows.find(c => c.tipo === 'ingreso');
            const categoriaGasto = categoriasResult.rows.find(c => c.tipo === 'gasto');
            
            // Crear ingreso
            if (reserva.precio_total > 0) {
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
                
                console.log(`✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
            }
            
            // Crear gasto de comisión
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
                
                console.log(`✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
            }
            
        } catch (error) {
            console.error('❌ Error creando movimientos manuales:', error.message);
        }
    }

    async verificarTriggers() {
        console.log('\n⚡ VERIFICANDO TRIGGERS EN PRODUCCIÓN...');
        console.log('=' .repeat(50));
        
        try {
            const triggersQuery = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_timing,
                    action_statement
                FROM information_schema.triggers
                WHERE event_object_table = 'reservas'
                AND trigger_name LIKE '%sincronizar%'
                ORDER BY trigger_name;
            `;
            
            const triggersResult = await this.pool.query(triggersQuery);
            
            if (triggersResult.rows.length === 0) {
                console.log('❌ NO HAY TRIGGERS DE SINCRONIZACIÓN ACTIVOS');
                console.log('   PROBLEMA: Los triggers no están instalados en producción');
                return false;
            } else {
                console.log(`✅ TRIGGERS ENCONTRADOS: ${triggersResult.rows.length}`);
                triggersResult.rows.forEach(trigger => {
                    console.log(`   • ${trigger.trigger_name}`);
                    console.log(`     Tabla: ${trigger.event_object_table}`);
                    console.log(`     Evento: ${trigger.event_manipulation}`);
                    console.log(`     Timing: ${trigger.action_timing}`);
                });
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error verificando triggers:', error.message);
            return false;
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE RESERVAS ESPECÍFICAS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a investigar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // Verificar triggers primero
        const triggersOk = await this.verificarTriggers();
        
        // Investigar reservas específicas
        await this.investigarReservasEspecificas();
        
        // Resumen
        console.log('\n🎯 RESUMEN DE LA INVESTIGACIÓN:');
        console.log('=' .repeat(40));
        
        if (!triggersOk) {
            console.log('❌ PROBLEMA IDENTIFICADO: Triggers no están activos');
            console.log('💡 SOLUCIÓN: Ejecutar script de instalación de triggers');
        } else {
            console.log('✅ Triggers están activos');
            console.log('🔍 Revisar logs de la investigación anterior para más detalles');
        }
        
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionReservasEspecificas();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionReservasEspecificas;

/**
 * 🔍 INVESTIGACIÓN DE RESERVAS ESPECÍFICAS
 * 
 * Este script investiga por qué las reservas BQNI8W e IJRGBH
 * no están generando movimientos financieros automáticos.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionReservasEspecificas {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH'];
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN para investigar reservas específicas...');
            
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

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

    async investigarReservasEspecificas() {
        console.log('\n🔍 INVESTIGANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(60));
        
        for (const codigoReserva of this.reservasEspecificas) {
            console.log(`\n📋 INVESTIGANDO RESERVA: ${codigoReserva}`);
            console.log('-'.repeat(40));
            
            await this.investigarReservaIndividual(codigoReserva);
        }
    }

    async investigarReservaIndividual(codigoReserva) {
        try {
            // 1. Buscar la reserva
            const reservaQuery = `
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
                    r.created_at,
                    c.nombre as cancha_nombre,
                    c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.codigo_reserva = $1;
            `;
            
            const reservaResult = await this.pool.query(reservaQuery, [codigoReserva]);
            
            if (reservaResult.rows.length === 0) {
                console.log(`❌ RESERVA NO ENCONTRADA: ${codigoReserva}`);
                return;
            }
            
            const reserva = reservaResult.rows[0];
            console.log(`✅ Reserva encontrada:`);
            console.log(`   • ID: ${reserva.id}`);
            console.log(`   • Estado: ${reserva.estado}`);
            console.log(`   • Precio Total: $${reserva.precio_total || 0}`);
            console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
            console.log(`   • Tipo: ${reserva.tipo_reserva}`);
            console.log(`   • Fecha: ${reserva.fecha}`);
            console.log(`   • Cancha: ${reserva.cancha_nombre}`);
            console.log(`   • Complejo: ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
            console.log(`   • Creada: ${reserva.created_at}`);
            
            // 2. Verificar si tiene movimientos financieros
            console.log(`\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...`);
            
            const movimientosQuery = `
                SELECT 
                    gi.id,
                    gi.tipo,
                    gi.monto,
                    gi.fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.creado_en,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE $1
                ORDER BY gi.tipo, gi.creado_en;
            `;
            
            const movimientosResult = await this.pool.query(movimientosQuery, [`%${codigoReserva}%`]);
            
            if (movimientosResult.rows.length === 0) {
                console.log(`❌ NO HAY MOVIMIENTOS FINANCIEROS PARA ESTA RESERVA`);
                
                // 3. Verificar si las categorías existen para este complejo
                await this.verificarCategoriasComplejo(reserva.complejo_id);
                
                // 4. Intentar crear los movimientos manualmente
                if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                    console.log(`\n🔧 INTENTANDO CREAR MOVIMIENTOS MANUALMENTE...`);
                    await this.crearMovimientosManuales(reserva);
                }
                
            } else {
                console.log(`✅ MOVIMIENTOS ENCONTRADOS: ${movimientosResult.rows.length}`);
                movimientosResult.rows.forEach(mov => {
                    console.log(`   • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     Descripción: ${mov.descripcion}`);
                    console.log(`     Creado: ${mov.creado_en}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Error investigando reserva ${codigoReserva}:`, error.message);
        }
    }

    async verificarCategoriasComplejo(complejoId) {
        console.log(`\n🔍 VERIFICANDO CATEGORÍAS PARA COMPLEJO ${complejoId}...`);
        
        try {
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'))
                ORDER BY tipo, nombre;
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
            
            if (categoriasResult.rows.length < 2) {
                console.log(`❌ FALTAN CATEGORÍAS NECESARIAS:`);
                console.log(`   Categorías encontradas: ${categoriasResult.rows.length}`);
                categoriasResult.rows.forEach(cat => {
                    console.log(`   • ${cat.nombre} (${cat.tipo})`);
                });
                return false;
            } else {
                console.log(`✅ CATEGORÍAS NECESARIAS ENCONTRADAS:`);
                categoriasResult.rows.forEach(cat => {
                    console.log(`   • ${cat.nombre} (${cat.tipo}) - ID: ${cat.id}`);
                });
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async crearMovimientosManuales(reserva) {
        try {
            console.log(`🔧 Creando movimientos para reserva ${reserva.codigo_reserva}...`);
            
            // Obtener categorías
            const categoriasQuery = `
                SELECT id, tipo, nombre
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
            
            if (categoriasResult.rows.length < 2) {
                console.log(`❌ No se pueden crear movimientos: faltan categorías`);
                return;
            }
            
            const categoriaIngreso = categoriasResult.rows.find(c => c.tipo === 'ingreso');
            const categoriaGasto = categoriasResult.rows.find(c => c.tipo === 'gasto');
            
            // Crear ingreso
            if (reserva.precio_total > 0) {
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
                
                console.log(`✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
            }
            
            // Crear gasto de comisión
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
                
                console.log(`✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
            }
            
        } catch (error) {
            console.error('❌ Error creando movimientos manuales:', error.message);
        }
    }

    async verificarTriggers() {
        console.log('\n⚡ VERIFICANDO TRIGGERS EN PRODUCCIÓN...');
        console.log('=' .repeat(50));
        
        try {
            const triggersQuery = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_timing,
                    action_statement
                FROM information_schema.triggers
                WHERE event_object_table = 'reservas'
                AND trigger_name LIKE '%sincronizar%'
                ORDER BY trigger_name;
            `;
            
            const triggersResult = await this.pool.query(triggersQuery);
            
            if (triggersResult.rows.length === 0) {
                console.log('❌ NO HAY TRIGGERS DE SINCRONIZACIÓN ACTIVOS');
                console.log('   PROBLEMA: Los triggers no están instalados en producción');
                return false;
            } else {
                console.log(`✅ TRIGGERS ENCONTRADOS: ${triggersResult.rows.length}`);
                triggersResult.rows.forEach(trigger => {
                    console.log(`   • ${trigger.trigger_name}`);
                    console.log(`     Tabla: ${trigger.event_object_table}`);
                    console.log(`     Evento: ${trigger.event_manipulation}`);
                    console.log(`     Timing: ${trigger.action_timing}`);
                });
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error verificando triggers:', error.message);
            return false;
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE RESERVAS ESPECÍFICAS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a investigar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // Verificar triggers primero
        const triggersOk = await this.verificarTriggers();
        
        // Investigar reservas específicas
        await this.investigarReservasEspecificas();
        
        // Resumen
        console.log('\n🎯 RESUMEN DE LA INVESTIGACIÓN:');
        console.log('=' .repeat(40));
        
        if (!triggersOk) {
            console.log('❌ PROBLEMA IDENTIFICADO: Triggers no están activos');
            console.log('💡 SOLUCIÓN: Ejecutar script de instalación de triggers');
        } else {
            console.log('✅ Triggers están activos');
            console.log('🔍 Revisar logs de la investigación anterior para más detalles');
        }
        
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionReservasEspecificas();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionReservasEspecificas;

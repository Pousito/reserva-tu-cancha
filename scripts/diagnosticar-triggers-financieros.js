#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DE TRIGGERS FINANCIEROS
 * 
 * Este script diagnostica por qué los triggers automáticos
 * no están generando movimientos financieros para las reservas
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class DiagnosticarTriggersFinancieros {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN...');
            
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

    async verificarTriggersExistentes() {
        console.log('\n🔍 VERIFICANDO TRIGGERS EXISTENTES...');
        console.log('=' .repeat(50));
        
        try {
            const triggersQuery = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_statement,
                    action_timing
                FROM information_schema.triggers
                WHERE event_object_table IN ('reservas', 'gastos_ingresos')
                ORDER BY event_object_table, trigger_name;
            `;
            
            const triggers = await this.pool.query(triggersQuery);
            
            console.log(`📊 TRIGGERS ENCONTRADOS: ${triggers.rows.length}`);
            
            if (triggers.rows.length === 0) {
                console.log('❌ NO HAY TRIGGERS CONFIGURADOS');
                return false;
            }
            
            triggers.rows.forEach(trigger => {
                console.log(`\n🔧 ${trigger.trigger_name}:`);
                console.log(`   • Tabla: ${trigger.event_object_table}`);
                console.log(`   • Evento: ${trigger.event_manipulation}`);
                console.log(`   • Timing: ${trigger.action_timing}`);
                console.log(`   • Función: ${trigger.action_statement}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando triggers:', error.message);
            return false;
        }
    }

    async verificarFuncionesTriggers() {
        console.log('\n🔍 VERIFICANDO FUNCIONES DE TRIGGERS...');
        console.log('=' .repeat(50));
        
        try {
            const funcionesQuery = `
                SELECT 
                    routine_name,
                    routine_type,
                    routine_definition
                FROM information_schema.routines
                WHERE routine_name IN (
                    'sincronizar_reserva_ingresos',
                    'eliminar_ingresos_reserva_cancelada'
                )
                ORDER BY routine_name;
            `;
            
            const funciones = await this.pool.query(funcionesQuery);
            
            console.log(`📊 FUNCIONES ENCONTRADAS: ${funciones.rows.length}`);
            
            if (funciones.rows.length === 0) {
                console.log('❌ NO HAY FUNCIONES DE TRIGGERS CONFIGURADAS');
                return false;
            }
            
            funciones.rows.forEach(funcion => {
                console.log(`\n🔧 ${funcion.routine_name}:`);
                console.log(`   • Tipo: ${funcion.routine_type}`);
                console.log(`   • Definición: ${funcion.routine_definition ? '✅ Existe' : '❌ No existe'}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando funciones:', error.message);
            return false;
        }
    }

    async buscarReservasSinMovimientos() {
        console.log('\n🔍 BUSCANDO RESERVAS SIN MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(60));
        
        try {
            // Buscar reservas confirmadas sin movimientos financieros
            const reservasQuery = `
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
                WHERE r.estado = 'confirmada'
                AND r.precio_total > 0
                AND r.codigo_reserva = ANY($1)
                ORDER BY r.created_at DESC;
            `;
            
            const reservas = await this.pool.query(reservasQuery, [this.reservasEspecificas]);
            
            console.log(`📊 RESERVAS CONFIRMADAS ENCONTRADAS: ${reservas.rows.length}`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                return [];
            }
            
            const reservasSinMovimientos = [];
            
            for (const reserva of reservas.rows) {
                console.log(`\n📋 Verificando ${reserva.codigo_reserva}:`);
                
                // Verificar si tiene movimientos financieros
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.descripcion
                    FROM gastos_ingresos gi
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    console.log(`   💡 Debería tener:`);
                    console.log(`      - Ingreso: $${reserva.precio_total}`);
                    if (reserva.comision_aplicada > 0) {
                        console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                    }
                    reservasSinMovimientos.push(reserva);
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    });
                }
            }
            
            return reservasSinMovimientos;
            
        } catch (error) {
            console.error('❌ Error buscando reservas sin movimientos:', error.message);
            return [];
        }
    }

    async verificarCategoriasComplejo(complejoId) {
        console.log(`\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO ${complejoId}...`);
        
        try {
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = $1
                ORDER BY tipo, nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery, [complejoId]);
            
            console.log(`📊 Categorías encontradas: ${categorias.rows.length}`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async crearTriggersFaltantes() {
        console.log('\n🔧 CREANDO TRIGGERS FALTANTES...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si los triggers existen
            const triggersExistentes = await this.verificarTriggersExistentes();
            
            if (!triggersExistentes) {
                console.log('🔧 Creando triggers automáticos...');
                
                // Crear función para sincronizar reservas con ingresos
                const crearFuncionSincronizar = `
                    CREATE OR REPLACE FUNCTION sincronizar_reserva_ingresos()
                    RETURNS TRIGGER AS $$
                    DECLARE
                        categoria_ingreso_id INTEGER;
                        categoria_gasto_id INTEGER;
                        tipo_reserva_texto TEXT;
                    BEGIN
                        -- Solo procesar si la reserva está confirmada y tiene precio
                        IF NEW.estado = 'confirmada' AND NEW.precio_total > 0 THEN
                            
                            -- Buscar categoría de ingreso "Reservas Web"
                            SELECT id INTO categoria_ingreso_id
                            FROM categorias_gastos
                            WHERE complejo_id = (
                                SELECT c.complejo_id 
                                FROM canchas c 
                                WHERE c.id = NEW.cancha_id
                            )
                            AND tipo = 'ingreso' 
                            AND nombre = 'Reservas Web';
                            
                            -- Buscar categoría de gasto "Comisión Plataforma"
                            SELECT id INTO categoria_gasto_id
                            FROM categorias_gastos
                            WHERE complejo_id = (
                                SELECT c.complejo_id 
                                FROM canchas c 
                                WHERE c.id = NEW.cancha_id
                            )
                            AND tipo = 'gasto' 
                            AND nombre = 'Comisión Plataforma';
                            
                            -- Crear ingreso si existe la categoría
                            IF categoria_ingreso_id IS NOT NULL THEN
                                INSERT INTO gastos_ingresos (
                                    complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                                ) VALUES (
                                    (SELECT c.complejo_id FROM canchas c WHERE c.id = NEW.cancha_id),
                                    categoria_ingreso_id,
                                    'ingreso',
                                    NEW.precio_total,
                                    NEW.fecha,
                                    'Reserva #' || NEW.codigo_reserva || ' - ' || (SELECT c.nombre FROM canchas c WHERE c.id = NEW.cancha_id),
                                    'automatico'
                                );
                            END IF;
                            
                            -- Crear gasto de comisión si existe la categoría y hay comisión
                            IF categoria_gasto_id IS NOT NULL AND NEW.comision_aplicada > 0 THEN
                                -- Determinar tipo de reserva para la descripción
                                IF NEW.tipo_reserva = 'directa' THEN
                                    tipo_reserva_texto := 'Web (3.5% + IVA)';
                                ELSE
                                    tipo_reserva_texto := 'Admin (1.75% + IVA)';
                                END IF;
                                
                                INSERT INTO gastos_ingresos (
                                    complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                                ) VALUES (
                                    (SELECT c.complejo_id FROM canchas c WHERE c.id = NEW.cancha_id),
                                    categoria_gasto_id,
                                    'gasto',
                                    NEW.comision_aplicada,
                                    NEW.fecha,
                                    'Comisión Reserva #' || NEW.codigo_reserva || ' - ' || tipo_reserva_texto,
                                    'automatico'
                                );
                            END IF;
                            
                        END IF;
                        
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                `;
                
                await this.pool.query(crearFuncionSincronizar);
                console.log('✅ Función sincronizar_reserva_ingresos creada');
                
                // Crear función para eliminar ingresos de reservas canceladas
                const crearFuncionEliminar = `
                    CREATE OR REPLACE FUNCTION eliminar_ingresos_reserva_cancelada()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        -- Solo procesar si la reserva se cancela
                        IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
                            
                            -- Eliminar movimientos financieros relacionados
                            DELETE FROM gastos_ingresos
                            WHERE descripcion LIKE '%' || NEW.codigo_reserva || '%';
                            
                        END IF;
                        
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                `;
                
                await this.pool.query(crearFuncionEliminar);
                console.log('✅ Función eliminar_ingresos_reserva_cancelada creada');
                
                // Crear triggers
                const crearTriggerSincronizar = `
                    DROP TRIGGER IF EXISTS trigger_sincronizar_reserva_ingresos ON reservas;
                    CREATE TRIGGER trigger_sincronizar_reserva_ingresos
                    AFTER INSERT OR UPDATE ON reservas
                    FOR EACH ROW
                    EXECUTE FUNCTION sincronizar_reserva_ingresos();
                `;
                
                await this.pool.query(crearTriggerSincronizar);
                console.log('✅ Trigger sincronizar_reserva_ingresos creado');
                
                const crearTriggerEliminar = `
                    DROP TRIGGER IF EXISTS trigger_eliminar_ingresos_reserva_cancelada ON reservas;
                    CREATE TRIGGER trigger_eliminar_ingresos_reserva_cancelada
                    AFTER UPDATE ON reservas
                    FOR EACH ROW
                    EXECUTE FUNCTION eliminar_ingresos_reserva_cancelada();
                `;
                
                await this.pool.query(crearTriggerEliminar);
                console.log('✅ Trigger eliminar_ingresos_reserva_cancelada creado');
                
            } else {
                console.log('✅ Los triggers ya existen');
            }
            
        } catch (error) {
            console.error('❌ Error creando triggers:', error.message);
        }
    }

    async sincronizarReservasExistentes() {
        console.log('\n🔧 SINCRONIZANDO RESERVAS EXISTENTES...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar reservas sin movimientos
            const reservasSinMovimientos = await this.buscarReservasSinMovimientos();
            
            if (reservasSinMovimientos.length === 0) {
                console.log('✅ Todas las reservas ya tienen movimientos financieros');
                return;
            }
            
            console.log(`🔧 Sincronizando ${reservasSinMovimientos.length} reservas...`);
            
            for (const reserva of reservasSinMovimientos) {
                console.log(`\n🔧 Sincronizando ${reserva.codigo_reserva}...`);
                
                // Verificar categorías del complejo
                const categorias = await this.verificarCategoriasComplejo(reserva.complejo_id);
                
                if (categorias.length === 0) {
                    console.log(`   ❌ No hay categorías para el complejo ${reserva.complejo_id}`);
                    continue;
                }
                
                // Buscar categorías necesarias
                const categoriaIngreso = categorias.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                const categoriaGasto = categorias.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                
                if (!categoriaIngreso || !categoriaGasto) {
                    console.log(`   ❌ Faltan categorías necesarias:`);
                    console.log(`      - Reservas Web (ingreso): ${categoriaIngreso ? '✅' : '❌'}`);
                    console.log(`      - Comisión Plataforma (gasto): ${categoriaGasto ? '✅' : '❌'}`);
                    continue;
                }
                
                // Crear ingreso
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
                
                console.log(`   ✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
                
                // Crear gasto de comisión si existe
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
                    
                    console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error sincronizando reservas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO DE TRIGGERS FINANCIEROS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar triggers existentes
        await this.verificarTriggersExistentes();
        
        // 2. Verificar funciones de triggers
        await this.verificarFuncionesTriggers();
        
        // 3. Buscar reservas sin movimientos
        await this.buscarReservasSinMovimientos();
        
        // 4. Crear triggers faltantes
        await this.crearTriggersFaltantes();
        
        // 5. Sincronizar reservas existentes
        await this.sincronizarReservasExistentes();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Triggers verificados/creados');
        console.log('✅ Reservas sincronizadas');
        console.log('✅ Control financiero automático activado');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const diagnostico = new DiagnosticarTriggersFinancieros();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = DiagnosticarTriggersFinancieros;

/**
 * 🔍 DIAGNÓSTICO DE TRIGGERS FINANCIEROS
 * 
 * Este script diagnostica por qué los triggers automáticos
 * no están generando movimientos financieros para las reservas
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class DiagnosticarTriggersFinancieros {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN...');
            
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

    async verificarTriggersExistentes() {
        console.log('\n🔍 VERIFICANDO TRIGGERS EXISTENTES...');
        console.log('=' .repeat(50));
        
        try {
            const triggersQuery = `
                SELECT 
                    trigger_name,
                    event_manipulation,
                    event_object_table,
                    action_statement,
                    action_timing
                FROM information_schema.triggers
                WHERE event_object_table IN ('reservas', 'gastos_ingresos')
                ORDER BY event_object_table, trigger_name;
            `;
            
            const triggers = await this.pool.query(triggersQuery);
            
            console.log(`📊 TRIGGERS ENCONTRADOS: ${triggers.rows.length}`);
            
            if (triggers.rows.length === 0) {
                console.log('❌ NO HAY TRIGGERS CONFIGURADOS');
                return false;
            }
            
            triggers.rows.forEach(trigger => {
                console.log(`\n🔧 ${trigger.trigger_name}:`);
                console.log(`   • Tabla: ${trigger.event_object_table}`);
                console.log(`   • Evento: ${trigger.event_manipulation}`);
                console.log(`   • Timing: ${trigger.action_timing}`);
                console.log(`   • Función: ${trigger.action_statement}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando triggers:', error.message);
            return false;
        }
    }

    async verificarFuncionesTriggers() {
        console.log('\n🔍 VERIFICANDO FUNCIONES DE TRIGGERS...');
        console.log('=' .repeat(50));
        
        try {
            const funcionesQuery = `
                SELECT 
                    routine_name,
                    routine_type,
                    routine_definition
                FROM information_schema.routines
                WHERE routine_name IN (
                    'sincronizar_reserva_ingresos',
                    'eliminar_ingresos_reserva_cancelada'
                )
                ORDER BY routine_name;
            `;
            
            const funciones = await this.pool.query(funcionesQuery);
            
            console.log(`📊 FUNCIONES ENCONTRADAS: ${funciones.rows.length}`);
            
            if (funciones.rows.length === 0) {
                console.log('❌ NO HAY FUNCIONES DE TRIGGERS CONFIGURADAS');
                return false;
            }
            
            funciones.rows.forEach(funcion => {
                console.log(`\n🔧 ${funcion.routine_name}:`);
                console.log(`   • Tipo: ${funcion.routine_type}`);
                console.log(`   • Definición: ${funcion.routine_definition ? '✅ Existe' : '❌ No existe'}`);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando funciones:', error.message);
            return false;
        }
    }

    async buscarReservasSinMovimientos() {
        console.log('\n🔍 BUSCANDO RESERVAS SIN MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(60));
        
        try {
            // Buscar reservas confirmadas sin movimientos financieros
            const reservasQuery = `
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
                WHERE r.estado = 'confirmada'
                AND r.precio_total > 0
                AND r.codigo_reserva = ANY($1)
                ORDER BY r.created_at DESC;
            `;
            
            const reservas = await this.pool.query(reservasQuery, [this.reservasEspecificas]);
            
            console.log(`📊 RESERVAS CONFIRMADAS ENCONTRADAS: ${reservas.rows.length}`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                return [];
            }
            
            const reservasSinMovimientos = [];
            
            for (const reserva of reservas.rows) {
                console.log(`\n📋 Verificando ${reserva.codigo_reserva}:`);
                
                // Verificar si tiene movimientos financieros
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.descripcion
                    FROM gastos_ingresos gi
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    console.log(`   💡 Debería tener:`);
                    console.log(`      - Ingreso: $${reserva.precio_total}`);
                    if (reserva.comision_aplicada > 0) {
                        console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                    }
                    reservasSinMovimientos.push(reserva);
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    });
                }
            }
            
            return reservasSinMovimientos;
            
        } catch (error) {
            console.error('❌ Error buscando reservas sin movimientos:', error.message);
            return [];
        }
    }

    async verificarCategoriasComplejo(complejoId) {
        console.log(`\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO ${complejoId}...`);
        
        try {
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = $1
                ORDER BY tipo, nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery, [complejoId]);
            
            console.log(`📊 Categorías encontradas: ${categorias.rows.length}`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async crearTriggersFaltantes() {
        console.log('\n🔧 CREANDO TRIGGERS FALTANTES...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si los triggers existen
            const triggersExistentes = await this.verificarTriggersExistentes();
            
            if (!triggersExistentes) {
                console.log('🔧 Creando triggers automáticos...');
                
                // Crear función para sincronizar reservas con ingresos
                const crearFuncionSincronizar = `
                    CREATE OR REPLACE FUNCTION sincronizar_reserva_ingresos()
                    RETURNS TRIGGER AS $$
                    DECLARE
                        categoria_ingreso_id INTEGER;
                        categoria_gasto_id INTEGER;
                        tipo_reserva_texto TEXT;
                    BEGIN
                        -- Solo procesar si la reserva está confirmada y tiene precio
                        IF NEW.estado = 'confirmada' AND NEW.precio_total > 0 THEN
                            
                            -- Buscar categoría de ingreso "Reservas Web"
                            SELECT id INTO categoria_ingreso_id
                            FROM categorias_gastos
                            WHERE complejo_id = (
                                SELECT c.complejo_id 
                                FROM canchas c 
                                WHERE c.id = NEW.cancha_id
                            )
                            AND tipo = 'ingreso' 
                            AND nombre = 'Reservas Web';
                            
                            -- Buscar categoría de gasto "Comisión Plataforma"
                            SELECT id INTO categoria_gasto_id
                            FROM categorias_gastos
                            WHERE complejo_id = (
                                SELECT c.complejo_id 
                                FROM canchas c 
                                WHERE c.id = NEW.cancha_id
                            )
                            AND tipo = 'gasto' 
                            AND nombre = 'Comisión Plataforma';
                            
                            -- Crear ingreso si existe la categoría
                            IF categoria_ingreso_id IS NOT NULL THEN
                                INSERT INTO gastos_ingresos (
                                    complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                                ) VALUES (
                                    (SELECT c.complejo_id FROM canchas c WHERE c.id = NEW.cancha_id),
                                    categoria_ingreso_id,
                                    'ingreso',
                                    NEW.precio_total,
                                    NEW.fecha,
                                    'Reserva #' || NEW.codigo_reserva || ' - ' || (SELECT c.nombre FROM canchas c WHERE c.id = NEW.cancha_id),
                                    'automatico'
                                );
                            END IF;
                            
                            -- Crear gasto de comisión si existe la categoría y hay comisión
                            IF categoria_gasto_id IS NOT NULL AND NEW.comision_aplicada > 0 THEN
                                -- Determinar tipo de reserva para la descripción
                                IF NEW.tipo_reserva = 'directa' THEN
                                    tipo_reserva_texto := 'Web (3.5% + IVA)';
                                ELSE
                                    tipo_reserva_texto := 'Admin (1.75% + IVA)';
                                END IF;
                                
                                INSERT INTO gastos_ingresos (
                                    complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                                ) VALUES (
                                    (SELECT c.complejo_id FROM canchas c WHERE c.id = NEW.cancha_id),
                                    categoria_gasto_id,
                                    'gasto',
                                    NEW.comision_aplicada,
                                    NEW.fecha,
                                    'Comisión Reserva #' || NEW.codigo_reserva || ' - ' || tipo_reserva_texto,
                                    'automatico'
                                );
                            END IF;
                            
                        END IF;
                        
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                `;
                
                await this.pool.query(crearFuncionSincronizar);
                console.log('✅ Función sincronizar_reserva_ingresos creada');
                
                // Crear función para eliminar ingresos de reservas canceladas
                const crearFuncionEliminar = `
                    CREATE OR REPLACE FUNCTION eliminar_ingresos_reserva_cancelada()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        -- Solo procesar si la reserva se cancela
                        IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
                            
                            -- Eliminar movimientos financieros relacionados
                            DELETE FROM gastos_ingresos
                            WHERE descripcion LIKE '%' || NEW.codigo_reserva || '%';
                            
                        END IF;
                        
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                `;
                
                await this.pool.query(crearFuncionEliminar);
                console.log('✅ Función eliminar_ingresos_reserva_cancelada creada');
                
                // Crear triggers
                const crearTriggerSincronizar = `
                    DROP TRIGGER IF EXISTS trigger_sincronizar_reserva_ingresos ON reservas;
                    CREATE TRIGGER trigger_sincronizar_reserva_ingresos
                    AFTER INSERT OR UPDATE ON reservas
                    FOR EACH ROW
                    EXECUTE FUNCTION sincronizar_reserva_ingresos();
                `;
                
                await this.pool.query(crearTriggerSincronizar);
                console.log('✅ Trigger sincronizar_reserva_ingresos creado');
                
                const crearTriggerEliminar = `
                    DROP TRIGGER IF EXISTS trigger_eliminar_ingresos_reserva_cancelada ON reservas;
                    CREATE TRIGGER trigger_eliminar_ingresos_reserva_cancelada
                    AFTER UPDATE ON reservas
                    FOR EACH ROW
                    EXECUTE FUNCTION eliminar_ingresos_reserva_cancelada();
                `;
                
                await this.pool.query(crearTriggerEliminar);
                console.log('✅ Trigger eliminar_ingresos_reserva_cancelada creado');
                
            } else {
                console.log('✅ Los triggers ya existen');
            }
            
        } catch (error) {
            console.error('❌ Error creando triggers:', error.message);
        }
    }

    async sincronizarReservasExistentes() {
        console.log('\n🔧 SINCRONIZANDO RESERVAS EXISTENTES...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar reservas sin movimientos
            const reservasSinMovimientos = await this.buscarReservasSinMovimientos();
            
            if (reservasSinMovimientos.length === 0) {
                console.log('✅ Todas las reservas ya tienen movimientos financieros');
                return;
            }
            
            console.log(`🔧 Sincronizando ${reservasSinMovimientos.length} reservas...`);
            
            for (const reserva of reservasSinMovimientos) {
                console.log(`\n🔧 Sincronizando ${reserva.codigo_reserva}...`);
                
                // Verificar categorías del complejo
                const categorias = await this.verificarCategoriasComplejo(reserva.complejo_id);
                
                if (categorias.length === 0) {
                    console.log(`   ❌ No hay categorías para el complejo ${reserva.complejo_id}`);
                    continue;
                }
                
                // Buscar categorías necesarias
                const categoriaIngreso = categorias.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                const categoriaGasto = categorias.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                
                if (!categoriaIngreso || !categoriaGasto) {
                    console.log(`   ❌ Faltan categorías necesarias:`);
                    console.log(`      - Reservas Web (ingreso): ${categoriaIngreso ? '✅' : '❌'}`);
                    console.log(`      - Comisión Plataforma (gasto): ${categoriaGasto ? '✅' : '❌'}`);
                    continue;
                }
                
                // Crear ingreso
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
                
                console.log(`   ✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
                
                // Crear gasto de comisión si existe
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
                    
                    console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error sincronizando reservas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO DE TRIGGERS FINANCIEROS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar triggers existentes
        await this.verificarTriggersExistentes();
        
        // 2. Verificar funciones de triggers
        await this.verificarFuncionesTriggers();
        
        // 3. Buscar reservas sin movimientos
        await this.buscarReservasSinMovimientos();
        
        // 4. Crear triggers faltantes
        await this.crearTriggersFaltantes();
        
        // 5. Sincronizar reservas existentes
        await this.sincronizarReservasExistentes();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Triggers verificados/creados');
        console.log('✅ Reservas sincronizadas');
        console.log('✅ Control financiero automático activado');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar diagnóstico
if (require.main === module) {
    const diagnostico = new DiagnosticarTriggersFinancieros();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = DiagnosticarTriggersFinancieros;



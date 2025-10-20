#!/usr/bin/env node

/**
 * 🔍 BÚSQUEDA CON CONSULTA EXACTA DE LA APLICACIÓN
 * 
 * Este script usa EXACTAMENTE la misma consulta SQL que la aplicación web
 * para encontrar las reservas BQNI8W, IJRGBH y 1XJAKD
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasConsultaExacta {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        this.complejoId = 7; // Complejo Demo 3
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

    async buscarReservasConsultaExacta() {
        console.log('\n🔍 BUSCANDO CON CONSULTA EXACTA DE LA APLICACIÓN...');
        console.log('=' .repeat(60));
        
        try {
            // Usar EXACTAMENTE la misma consulta que la aplicación web
            // Basada en el código del server.js línea 1980-1990
            const query = `
                SELECT r.*, c.nombre as cancha_nombre, 
                       CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
                       co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                JOIN ciudades ci ON co.ciudad_id = ci.id
                WHERE c.complejo_id = $1
                ORDER BY r.fecha_creacion DESC
            `;
            
            const reservas = await this.pool.query(query, [this.complejoId]);
            
            console.log(`📊 TOTAL DE RESERVAS EN COMPLEJO ${this.complejoId}: ${reservas.rows.length}`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN EL COMPLEJO');
                return [];
            }
            
            // Mostrar todas las reservas para debug
            console.log('\n📋 TODAS LAS RESERVAS DEL COMPLEJO:');
            reservas.rows.forEach((reserva, index) => {
                console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                console.log(`      Cancha: ${reserva.cancha_nombre}`);
                console.log(`      Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`      Creada: ${reserva.fecha_creacion}`);
            });
            
            // Buscar las reservas específicas
            const reservasEspecificas = reservas.rows.filter(r => 
                this.reservasEspecificas.includes(r.codigo_reserva)
            );
            
            console.log(`\n🔍 RESERVAS ESPECÍFICAS ENCONTRADAS: ${reservasEspecificas.length}`);
            
            if (reservasEspecificas.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                return [];
            }
            
            for (const reserva of reservasEspecificas) {
                console.log(`\n📋 ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Ciudad: ${reserva.ciudad_nombre}`);
                console.log(`   • Creada: ${reserva.fecha_creacion}`);
            }
            
            return reservasEspecificas;
            
        } catch (error) {
            console.error('❌ Error buscando reservas:', error.message);
            return [];
        }
    }

    async verificarMovimientosFinancieros(reservas) {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            console.log(`\n📋 Reserva ${reserva.codigo_reserva}:`);
            
            try {
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.fecha,
                        gi.descripcion,
                        gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo, gi.creado_en;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    
                    if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                        console.log(`   ⚠️ PROBLEMA: Reserva confirmada sin movimientos financieros`);
                        console.log(`   💡 Debería tener:`);
                        console.log(`      - Ingreso: $${reserva.precio_total}`);
                        if (reserva.comision_aplicada > 0) {
                            console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                        }
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                        console.log(`        Descripción: ${mov.descripcion}`);
                        console.log(`        Creado: ${mov.creado_en}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
            }
        }
    }

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
                    // Verificar categorías del complejo
                    const categoriasQuery = `
                        SELECT 
                            id, nombre, tipo, descripcion
                        FROM categorias_gastos
                        WHERE complejo_id = $1
                        ORDER BY tipo, nombre;
                    `;
                    
                    const categorias = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
                    
                    console.log(`   📊 Categorías disponibles para complejo ${reserva.complejo_id}: ${categorias.rows.length}`);
                    categorias.rows.forEach(cat => {
                        console.log(`      • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
                    });
                    
                    if (categorias.rows.length === 0) {
                        console.log(`   ❌ No hay categorías para el complejo ${reserva.complejo_id}`);
                        continue;
                    }
                    
                    // Buscar categorías necesarias
                    const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                    const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                    
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
                    
                } catch (error) {
                    console.error(`❌ Error creando movimientos para ${reserva.codigo_reserva}:`, error.message);
                }
            }
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async buscar() {
        console.log('🔍 BÚSQUEDA CON CONSULTA EXACTA DE LA APLICACIÓN');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        console.log(`🏢 Complejo: ${this.complejoId} (Complejo Demo 3)`);
        
        await this.conectar();
        
        // 1. Buscar reservas con consulta exacta
        const reservas = await this.buscarReservasConsultaExacta();
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros(reservas);
        
        // 3. Crear movimientos faltantes
        await this.crearMovimientosFaltantes(reservas);
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Reservas encontradas: ${reservas.length}`);
        console.log('✅ Movimientos financieros verificados/creados');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar búsqueda
if (require.main === module) {
    const busqueda = new BusquedaReservasConsultaExacta();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasConsultaExacta;

/**
 * 🔍 BÚSQUEDA CON CONSULTA EXACTA DE LA APLICACIÓN
 * 
 * Este script usa EXACTAMENTE la misma consulta SQL que la aplicación web
 * para encontrar las reservas BQNI8W, IJRGBH y 1XJAKD
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasConsultaExacta {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        this.complejoId = 7; // Complejo Demo 3
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

    async buscarReservasConsultaExacta() {
        console.log('\n🔍 BUSCANDO CON CONSULTA EXACTA DE LA APLICACIÓN...');
        console.log('=' .repeat(60));
        
        try {
            // Usar EXACTAMENTE la misma consulta que la aplicación web
            // Basada en el código del server.js línea 1980-1990
            const query = `
                SELECT r.*, c.nombre as cancha_nombre, 
                       CASE WHEN c.tipo = 'futbol' THEN 'Fútbol' ELSE c.tipo END as tipo,
                       co.nombre as complejo_nombre, co.id as complejo_id, ci.nombre as ciudad_nombre
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                JOIN ciudades ci ON co.ciudad_id = ci.id
                WHERE c.complejo_id = $1
                ORDER BY r.fecha_creacion DESC
            `;
            
            const reservas = await this.pool.query(query, [this.complejoId]);
            
            console.log(`📊 TOTAL DE RESERVAS EN COMPLEJO ${this.complejoId}: ${reservas.rows.length}`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN EL COMPLEJO');
                return [];
            }
            
            // Mostrar todas las reservas para debug
            console.log('\n📋 TODAS LAS RESERVAS DEL COMPLEJO:');
            reservas.rows.forEach((reserva, index) => {
                console.log(`   ${index + 1}. ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                console.log(`      Cancha: ${reserva.cancha_nombre}`);
                console.log(`      Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`      Creada: ${reserva.fecha_creacion}`);
            });
            
            // Buscar las reservas específicas
            const reservasEspecificas = reservas.rows.filter(r => 
                this.reservasEspecificas.includes(r.codigo_reserva)
            );
            
            console.log(`\n🔍 RESERVAS ESPECÍFICAS ENCONTRADAS: ${reservasEspecificas.length}`);
            
            if (reservasEspecificas.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                return [];
            }
            
            for (const reserva of reservasEspecificas) {
                console.log(`\n📋 ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Ciudad: ${reserva.ciudad_nombre}`);
                console.log(`   • Creada: ${reserva.fecha_creacion}`);
            }
            
            return reservasEspecificas;
            
        } catch (error) {
            console.error('❌ Error buscando reservas:', error.message);
            return [];
        }
    }

    async verificarMovimientosFinancieros(reservas) {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            console.log(`\n📋 Reserva ${reserva.codigo_reserva}:`);
            
            try {
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.fecha,
                        gi.descripcion,
                        gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo, gi.creado_en;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    
                    if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                        console.log(`   ⚠️ PROBLEMA: Reserva confirmada sin movimientos financieros`);
                        console.log(`   💡 Debería tener:`);
                        console.log(`      - Ingreso: $${reserva.precio_total}`);
                        if (reserva.comision_aplicada > 0) {
                            console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                        }
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                        console.log(`        Descripción: ${mov.descripcion}`);
                        console.log(`        Creado: ${mov.creado_en}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
            }
        }
    }

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
                    // Verificar categorías del complejo
                    const categoriasQuery = `
                        SELECT 
                            id, nombre, tipo, descripcion
                        FROM categorias_gastos
                        WHERE complejo_id = $1
                        ORDER BY tipo, nombre;
                    `;
                    
                    const categorias = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
                    
                    console.log(`   📊 Categorías disponibles para complejo ${reserva.complejo_id}: ${categorias.rows.length}`);
                    categorias.rows.forEach(cat => {
                        console.log(`      • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
                    });
                    
                    if (categorias.rows.length === 0) {
                        console.log(`   ❌ No hay categorías para el complejo ${reserva.complejo_id}`);
                        continue;
                    }
                    
                    // Buscar categorías necesarias
                    const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso' && c.nombre === 'Reservas Web');
                    const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto' && c.nombre === 'Comisión Plataforma');
                    
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
                    
                } catch (error) {
                    console.error(`❌ Error creando movimientos para ${reserva.codigo_reserva}:`, error.message);
                }
            }
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async buscar() {
        console.log('🔍 BÚSQUEDA CON CONSULTA EXACTA DE LA APLICACIÓN');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        console.log(`🏢 Complejo: ${this.complejoId} (Complejo Demo 3)`);
        
        await this.conectar();
        
        // 1. Buscar reservas con consulta exacta
        const reservas = await this.buscarReservasConsultaExacta();
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros(reservas);
        
        // 3. Crear movimientos faltantes
        await this.crearMovimientosFaltantes(reservas);
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Reservas encontradas: ${reservas.length}`);
        console.log('✅ Movimientos financieros verificados/creados');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar búsqueda
if (require.main === module) {
    const busqueda = new BusquedaReservasConsultaExacta();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasConsultaExacta;



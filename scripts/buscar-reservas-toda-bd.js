#!/usr/bin/env node

/**
 * 🔍 BÚSQUEDA DE RESERVAS EN TODA LA BASE DE DATOS
 * 
 * Este script busca las reservas específicas BQNI8W, IJRGBH y 1XJAKD
 * en toda la base de datos de Render, sin limitaciones de complejo.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasTodaBD {
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

    async buscarReservasEnTodaBD() {
        console.log('\n🔍 BUSCANDO RESERVAS EN TODA LA BASE DE DATOS...');
        console.log('=' .repeat(60));
        
        try {
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
                    comp.nombre as complejo_nombre,
                    comp.email as complejo_email
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.codigo_reserva = ANY($1)
                ORDER BY r.created_at DESC;
            `;
            
            const reservas = await this.pool.query(reservasQuery, [this.reservasEspecificas]);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                console.log('   Reservas buscadas:', this.reservasEspecificas.join(', '));
                return [];
            }
            
            console.log(`✅ RESERVAS ENCONTRADAS: ${reservas.rows.length}`);
            
            for (const reserva of reservas.rows) {
                console.log(`\n📋 ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Email complejo: ${reserva.complejo_email}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            }
            
            return reservas.rows;
            
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
                    
                    // Verificar si debería tener movimientos
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

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
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
        console.log('🔍 BÚSQUEDA DE RESERVAS EN TODA LA BASE DE DATOS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar reservas en toda la BD
        const reservas = await this.buscarReservasEnTodaBD();
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas en la base de datos');
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
    const busqueda = new BusquedaReservasTodaBD();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasTodaBD;

/**
 * 🔍 BÚSQUEDA DE RESERVAS EN TODA LA BASE DE DATOS
 * 
 * Este script busca las reservas específicas BQNI8W, IJRGBH y 1XJAKD
 * en toda la base de datos de Render, sin limitaciones de complejo.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasTodaBD {
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

    async buscarReservasEnTodaBD() {
        console.log('\n🔍 BUSCANDO RESERVAS EN TODA LA BASE DE DATOS...');
        console.log('=' .repeat(60));
        
        try {
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
                    comp.nombre as complejo_nombre,
                    comp.email as complejo_email
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.codigo_reserva = ANY($1)
                ORDER BY r.created_at DESC;
            `;
            
            const reservas = await this.pool.query(reservasQuery, [this.reservasEspecificas]);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO SE ENCONTRARON LAS RESERVAS ESPECÍFICAS');
                console.log('   Reservas buscadas:', this.reservasEspecificas.join(', '));
                return [];
            }
            
            console.log(`✅ RESERVAS ENCONTRADAS: ${reservas.rows.length}`);
            
            for (const reserva of reservas.rows) {
                console.log(`\n📋 ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Email complejo: ${reserva.complejo_email}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            }
            
            return reservas.rows;
            
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
                    
                    // Verificar si debería tener movimientos
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

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
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
        console.log('🔍 BÚSQUEDA DE RESERVAS EN TODA LA BASE DE DATOS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar reservas en toda la BD
        const reservas = await this.buscarReservasEnTodaBD();
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas en la base de datos');
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
    const busqueda = new BusquedaReservasTodaBD();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasTodaBD;



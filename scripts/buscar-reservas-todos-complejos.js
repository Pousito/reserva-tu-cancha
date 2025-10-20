#!/usr/bin/env node

/**
 * 🔍 BÚSQUEDA EXHAUSTIVA EN TODOS LOS COMPLEJOS
 * 
 * Este script busca las reservas BQNI8W, IJRGBH y 1XJAKD
 * en TODOS los complejos de la base de datos, no solo en Demo 3.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasTodosComplejos {
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

    async buscarEnTodosLosComplejos() {
        console.log('\n🔍 BUSCANDO EN TODOS LOS COMPLEJOS...');
        console.log('=' .repeat(60));
        
        try {
            // Primero, obtener todos los complejos
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, email
                FROM complejos
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS DISPONIBLES: ${complejos.rows.length}`);
            complejos.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Email: ${complejo.email}`);
            });
            
            // Buscar las reservas específicas en cada complejo
            const reservasEncontradas = [];
            
            for (const complejo of complejos.rows) {
                console.log(`\n🔍 Buscando en [${complejo.id}] ${complejo.nombre}:`);
                
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
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2)
                    ORDER BY r.created_at DESC;
                `;
                
                const reservas = await this.pool.query(reservasQuery, [complejo.id, this.reservasEspecificas]);
                
                if (reservas.rows.length > 0) {
                    console.log(`   ✅ ENCONTRADAS: ${reservas.rows.length} reservas`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        reservasEncontradas.push(reserva);
                    });
                } else {
                    console.log(`   ❌ No se encontraron las reservas específicas`);
                }
            }
            
            return reservasEncontradas;
            
        } catch (error) {
            console.error('❌ Error buscando en todos los complejos:', error.message);
            return [];
        }
    }

    async buscarPorPatrones() {
        console.log('\n🔍 BÚSQUEDA POR PATRONES...');
        console.log('=' .repeat(40));
        
        const patrones = ['BQNI', 'IJRG', '1XJA', 'BQ', 'IJ', '1X'];
        const reservasEncontradas = [];
        
        for (const patron of patrones) {
            console.log(`\n🔍 Buscando patrón "${patron}":`);
            
            try {
                const query = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.created_at,
                        c.nombre as cancha_nombre,
                        comp.nombre as complejo_nombre,
                        comp.id as complejo_id
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva LIKE $1
                    ORDER BY r.created_at DESC
                    LIMIT 10;
                `;
                
                const result = await this.pool.query(query, [`%${patron}%`]);
                
                if (result.rows.length > 0) {
                    console.log(`   ✅ Encontradas: ${result.rows.length} reservas`);
                    result.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        if (this.reservasEspecificas.includes(reserva.codigo_reserva)) {
                            reservasEncontradas.push(reserva);
                        }
                    });
                } else {
                    console.log(`   ❌ Sin resultados`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando patrón ${patron}:`, error.message);
            }
        }
        
        return reservasEncontradas;
    }

    async buscarReservasRecientes() {
        console.log('\n🕐 BUSCANDO RESERVAS RECIENTES (ÚLTIMAS 48 HORAS)...');
        console.log('=' .repeat(60));
        
        try {
            const query = `
                SELECT 
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    comp.nombre as complejo_nombre,
                    comp.id as complejo_id
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.created_at >= NOW() - INTERVAL '48 hours'
                ORDER BY r.created_at DESC;
            `;
            
            const reservasRecientes = await this.pool.query(query);
            
            console.log(`📊 RESERVAS RECIENTES: ${reservasRecientes.rows.length}`);
            
            if (reservasRecientes.rows.length > 0) {
                reservasRecientes.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                    console.log(`     [${reserva.complejo_id}] ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                    console.log(`     Creada: ${reserva.created_at}`);
                });
            }
            
            return reservasRecientes.rows;
            
        } catch (error) {
            console.error('❌ Error buscando reservas recientes:', error.message);
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
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
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
        console.log('🔍 BÚSQUEDA EXHAUSTIVA EN TODOS LOS COMPLEJOS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar en todos los complejos
        const reservasEncontradas = await this.buscarEnTodosLosComplejos();
        
        // 2. Buscar por patrones
        const reservasPorPatrones = await this.buscarPorPatrones();
        
        // 3. Buscar reservas recientes
        const reservasRecientes = await this.buscarReservasRecientes();
        
        // 4. Verificar movimientos financieros
        if (reservasEncontradas.length > 0) {
            await this.verificarMovimientosFinancieros(reservasEncontradas);
        }
        
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('=' .repeat(40));
        console.log(`✅ Reservas específicas encontradas: ${reservasEncontradas.length}`);
        console.log(`✅ Reservas por patrones: ${reservasPorPatrones.length}`);
        console.log(`✅ Reservas recientes: ${reservasRecientes.length}`);
        
        if (reservasEncontradas.length === 0) {
            console.log('\n❌ CONCLUSIÓN:');
            console.log('Las reservas BQNI8W, IJRGBH y 1XJAKD NO existen en ningún complejo');
            console.log('de la base de datos de Render. Es probable que:');
            console.log('1. Estén en caché del navegador');
            console.log('2. Sean de desarrollo local');
            console.log('3. No se hayan guardado correctamente');
        }
        
        await this.cerrar();
    }
}

// Ejecutar búsqueda exhaustiva
if (require.main === module) {
    const busqueda = new BusquedaReservasTodosComplejos();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasTodosComplejos;

/**
 * 🔍 BÚSQUEDA EXHAUSTIVA EN TODOS LOS COMPLEJOS
 * 
 * Este script busca las reservas BQNI8W, IJRGBH y 1XJAKD
 * en TODOS los complejos de la base de datos, no solo en Demo 3.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class BusquedaReservasTodosComplejos {
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

    async buscarEnTodosLosComplejos() {
        console.log('\n🔍 BUSCANDO EN TODOS LOS COMPLEJOS...');
        console.log('=' .repeat(60));
        
        try {
            // Primero, obtener todos los complejos
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, email
                FROM complejos
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS DISPONIBLES: ${complejos.rows.length}`);
            complejos.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Email: ${complejo.email}`);
            });
            
            // Buscar las reservas específicas en cada complejo
            const reservasEncontradas = [];
            
            for (const complejo of complejos.rows) {
                console.log(`\n🔍 Buscando en [${complejo.id}] ${complejo.nombre}:`);
                
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
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2)
                    ORDER BY r.created_at DESC;
                `;
                
                const reservas = await this.pool.query(reservasQuery, [complejo.id, this.reservasEspecificas]);
                
                if (reservas.rows.length > 0) {
                    console.log(`   ✅ ENCONTRADAS: ${reservas.rows.length} reservas`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        reservasEncontradas.push(reserva);
                    });
                } else {
                    console.log(`   ❌ No se encontraron las reservas específicas`);
                }
            }
            
            return reservasEncontradas;
            
        } catch (error) {
            console.error('❌ Error buscando en todos los complejos:', error.message);
            return [];
        }
    }

    async buscarPorPatrones() {
        console.log('\n🔍 BÚSQUEDA POR PATRONES...');
        console.log('=' .repeat(40));
        
        const patrones = ['BQNI', 'IJRG', '1XJA', 'BQ', 'IJ', '1X'];
        const reservasEncontradas = [];
        
        for (const patron of patrones) {
            console.log(`\n🔍 Buscando patrón "${patron}":`);
            
            try {
                const query = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.created_at,
                        c.nombre as cancha_nombre,
                        comp.nombre as complejo_nombre,
                        comp.id as complejo_id
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva LIKE $1
                    ORDER BY r.created_at DESC
                    LIMIT 10;
                `;
                
                const result = await this.pool.query(query, [`%${patron}%`]);
                
                if (result.rows.length > 0) {
                    console.log(`   ✅ Encontradas: ${result.rows.length} reservas`);
                    result.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        if (this.reservasEspecificas.includes(reserva.codigo_reserva)) {
                            reservasEncontradas.push(reserva);
                        }
                    });
                } else {
                    console.log(`   ❌ Sin resultados`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando patrón ${patron}:`, error.message);
            }
        }
        
        return reservasEncontradas;
    }

    async buscarReservasRecientes() {
        console.log('\n🕐 BUSCANDO RESERVAS RECIENTES (ÚLTIMAS 48 HORAS)...');
        console.log('=' .repeat(60));
        
        try {
            const query = `
                SELECT 
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    comp.nombre as complejo_nombre,
                    comp.id as complejo_id
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.created_at >= NOW() - INTERVAL '48 hours'
                ORDER BY r.created_at DESC;
            `;
            
            const reservasRecientes = await this.pool.query(query);
            
            console.log(`📊 RESERVAS RECIENTES: ${reservasRecientes.rows.length}`);
            
            if (reservasRecientes.rows.length > 0) {
                reservasRecientes.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                    console.log(`     [${reserva.complejo_id}] ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                    console.log(`     Creada: ${reserva.created_at}`);
                });
            }
            
            return reservasRecientes.rows;
            
        } catch (error) {
            console.error('❌ Error buscando reservas recientes:', error.message);
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
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
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
        console.log('🔍 BÚSQUEDA EXHAUSTIVA EN TODOS LOS COMPLEJOS');
        console.log('=' .repeat(60));
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar en todos los complejos
        const reservasEncontradas = await this.buscarEnTodosLosComplejos();
        
        // 2. Buscar por patrones
        const reservasPorPatrones = await this.buscarPorPatrones();
        
        // 3. Buscar reservas recientes
        const reservasRecientes = await this.buscarReservasRecientes();
        
        // 4. Verificar movimientos financieros
        if (reservasEncontradas.length > 0) {
            await this.verificarMovimientosFinancieros(reservasEncontradas);
        }
        
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('=' .repeat(40));
        console.log(`✅ Reservas específicas encontradas: ${reservasEncontradas.length}`);
        console.log(`✅ Reservas por patrones: ${reservasPorPatrones.length}`);
        console.log(`✅ Reservas recientes: ${reservasRecientes.length}`);
        
        if (reservasEncontradas.length === 0) {
            console.log('\n❌ CONCLUSIÓN:');
            console.log('Las reservas BQNI8W, IJRGBH y 1XJAKD NO existen en ningún complejo');
            console.log('de la base de datos de Render. Es probable que:');
            console.log('1. Estén en caché del navegador');
            console.log('2. Sean de desarrollo local');
            console.log('3. No se hayan guardado correctamente');
        }
        
        await this.cerrar();
    }
}

// Ejecutar búsqueda exhaustiva
if (require.main === module) {
    const busqueda = new BusquedaReservasTodosComplejos();
    busqueda.buscar().catch(console.error);
}

module.exports = BusquedaReservasTodosComplejos;



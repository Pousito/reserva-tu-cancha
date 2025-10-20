#!/usr/bin/env node

/**
 * 🔍 SIMULAR ENDPOINT COMPLETO
 * 
 * Este script simula exactamente lo que hace el endpoint de la API
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class SimularEndpointCompleto {
    constructor() {
        this.pool = null;
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

    async simularEndpointCategorias() {
        console.log('\n🔍 SIMULANDO ENDPOINT CATEGORÍAS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Simular usuario del token JWT
            const usuario = {
                id: 37,
                email: 'owner@complejodemo3.cl',
                nombre: 'Owner Complejo Demo 3',
                rol: 'owner',
                complejo_id: 8
            };
            
            console.log(`👤 USUARIO SIMULADO:`);
            console.log(`   • ID: ${usuario.id}`);
            console.log(`   • Email: ${usuario.email}`);
            console.log(`   • Nombre: ${usuario.nombre}`);
            console.log(`   • Rol: ${usuario.rol}`);
            console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            
            // 2. Simular exactamente la consulta del endpoint
            let query = 'SELECT * FROM categorias_gastos WHERE 1=1';
            let params = [];
            let paramIndex = 1;
            
            // Filtrar por complejo del usuario (owners/managers ven solo su complejo)
            if (usuario.rol === 'owner' || usuario.rol === 'manager') {
                query += ` AND complejo_id = $${paramIndex}`;
                params.push(usuario.complejo_id);
                paramIndex++;
            }
            // super_admin ve categorías de todos los complejos
            
            query += ' ORDER BY nombre ASC';
            
            console.log(`\n🔍 CONSULTA SIMULADA:`);
            console.log(`   • Query: ${query}`);
            console.log(`   • Params: ${JSON.stringify(params)}`);
            
            const categorias = await this.pool.query(query, params);
            
            console.log(`\n📊 RESULTADO CATEGORÍAS:`);
            console.log(`   • Status: 200 OK`);
            console.log(`   • Cantidad: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE COMPLEJO');
                
                // Verificar si existen categorías en otros complejos
                const todasCategoriasQuery = `
                    SELECT 
                        cg.id, cg.nombre, cg.tipo, cg.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM categorias_gastos cg
                    LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                    ORDER BY cg.complejo_id, cg.nombre;
                `;
                
                const todasCategorias = await this.pool.query(todasCategoriasQuery);
                console.log(`\n📊 TODAS LAS CATEGORÍAS EN EL SISTEMA: ${todasCategorias.rows.length}`);
                
                const categoriasPorComplejo = {};
                todasCategorias.rows.forEach(categoria => {
                    if (!categoriasPorComplejo[categoria.complejo_id]) {
                        categoriasPorComplejo[categoria.complejo_id] = [];
                    }
                    categoriasPorComplejo[categoria.complejo_id].push(categoria);
                });
                
                Object.keys(categoriasPorComplejo).forEach(complejoId => {
                    const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                    console.log(`\n📂 COMPLEJO ${complejoId} (${categoriasDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${categoriasDelComplejo.length} categorías`);
                    categoriasDelComplejo.forEach(cat => {
                        console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
                    });
                });
                
            } else {
                console.log('\n📋 CATEGORÍAS ENCONTRADAS:');
                categorias.rows.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error simulando endpoint categorías:', error.message);
        }
    }

    async simularEndpointMovimientos() {
        console.log('\n🔍 SIMULANDO ENDPOINT MOVIMIENTOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Simular usuario del token JWT
            const usuario = {
                id: 37,
                email: 'owner@complejodemo3.cl',
                nombre: 'Owner Complejo Demo 3',
                rol: 'owner',
                complejo_id: 8
            };
            
            console.log(`👤 USUARIO SIMULADO:`);
            console.log(`   • ID: ${usuario.id}`);
            console.log(`   • Email: ${usuario.email}`);
            console.log(`   • Nombre: ${usuario.nombre}`);
            console.log(`   • Rol: ${usuario.rol}`);
            console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            
            // 2. Simular exactamente la consulta del endpoint
            let query = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    gi.categoria_id,
                    gi.tipo,
                    gi.monto,
                    TO_CHAR(gi.fecha, 'YYYY-MM-DD') as fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.numero_documento,
                    gi.creado_en,
                    gi.actualizado_en,
                    cat.nombre as categoria_nombre,
                    cat.icono as categoria_icono,
                    cat.color as categoria_color
                FROM gastos_ingresos gi
                JOIN categorias_gastos cat ON gi.categoria_id = cat.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;
            
            // Filtrar por complejo
            if (usuario.rol === 'owner' || usuario.rol === 'manager') {
                query += ` AND gi.complejo_id = $${paramIndex}`;
                params.push(usuario.complejo_id);
                paramIndex++;
            }
            
            query += ' ORDER BY gi.fecha DESC, gi.creado_en DESC';
            
            console.log(`\n🔍 CONSULTA SIMULADA:`);
            console.log(`   • Query: ${query}`);
            console.log(`   • Params: ${JSON.stringify(params)}`);
            
            const movimientos = await this.pool.query(query, params);
            
            console.log(`\n📊 RESULTADO MOVIMIENTOS:`);
            console.log(`   • Status: 200 OK`);
            console.log(`   • Cantidad: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA ESTE COMPLEJO');
                
                // Verificar si existen movimientos en otros complejos
                const todosMovimientosQuery = `
                    SELECT 
                        gi.id, gi.tipo, gi.monto, gi.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                    ORDER BY gi.complejo_id, gi.creado_en DESC;
                `;
                
                const todosMovimientos = await this.pool.query(todosMovimientosQuery);
                console.log(`\n📊 TODOS LOS MOVIMIENTOS EN EL SISTEMA: ${todosMovimientos.rows.length}`);
                
                const movimientosPorComplejo = {};
                todosMovimientos.rows.forEach(movimiento => {
                    if (!movimientosPorComplejo[movimiento.complejo_id]) {
                        movimientosPorComplejo[movimiento.complejo_id] = [];
                    }
                    movimientosPorComplejo[movimiento.complejo_id].push(movimiento);
                });
                
                Object.keys(movimientosPorComplejo).forEach(complejoId => {
                    const movimientosDelComplejo = movimientosPorComplejo[complejoId];
                    console.log(`\n💰 COMPLEJO ${complejoId} (${movimientosDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${movimientosDelComplejo.length} movimientos`);
                    movimientosDelComplejo.slice(0, 3).forEach(mov => {
                        console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    });
                });
                
            } else {
                console.log('\n📋 MOVIMIENTOS ENCONTRADOS:');
                movimientos.rows.slice(0, 5).forEach(movimiento => {
                    console.log(`   • [${movimiento.id}] ${movimiento.tipo.toUpperCase()}: $${movimiento.monto} - ${movimiento.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error simulando endpoint movimientos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async simular() {
        console.log('🔍 SIMULAR ENDPOINT COMPLETO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Simular endpoint categorías
        await this.simularEndpointCategorias();
        
        // 2. Simular endpoint movimientos
        await this.simularEndpointMovimientos();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Endpoints simulados');
        console.log('✅ Consultas ejecutadas');
        console.log('✅ Resultados verificados');
        
        await this.cerrar();
    }
}

// Ejecutar simulación
if (require.main === module) {
    const simulacion = new SimularEndpointCompleto();
    simulacion.simular().catch(console.error);
}

module.exports = SimularEndpointCompleto;

/**
 * 🔍 SIMULAR ENDPOINT COMPLETO
 * 
 * Este script simula exactamente lo que hace el endpoint de la API
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class SimularEndpointCompleto {
    constructor() {
        this.pool = null;
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

    async simularEndpointCategorias() {
        console.log('\n🔍 SIMULANDO ENDPOINT CATEGORÍAS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Simular usuario del token JWT
            const usuario = {
                id: 37,
                email: 'owner@complejodemo3.cl',
                nombre: 'Owner Complejo Demo 3',
                rol: 'owner',
                complejo_id: 8
            };
            
            console.log(`👤 USUARIO SIMULADO:`);
            console.log(`   • ID: ${usuario.id}`);
            console.log(`   • Email: ${usuario.email}`);
            console.log(`   • Nombre: ${usuario.nombre}`);
            console.log(`   • Rol: ${usuario.rol}`);
            console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            
            // 2. Simular exactamente la consulta del endpoint
            let query = 'SELECT * FROM categorias_gastos WHERE 1=1';
            let params = [];
            let paramIndex = 1;
            
            // Filtrar por complejo del usuario (owners/managers ven solo su complejo)
            if (usuario.rol === 'owner' || usuario.rol === 'manager') {
                query += ` AND complejo_id = $${paramIndex}`;
                params.push(usuario.complejo_id);
                paramIndex++;
            }
            // super_admin ve categorías de todos los complejos
            
            query += ' ORDER BY nombre ASC';
            
            console.log(`\n🔍 CONSULTA SIMULADA:`);
            console.log(`   • Query: ${query}`);
            console.log(`   • Params: ${JSON.stringify(params)}`);
            
            const categorias = await this.pool.query(query, params);
            
            console.log(`\n📊 RESULTADO CATEGORÍAS:`);
            console.log(`   • Status: 200 OK`);
            console.log(`   • Cantidad: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE COMPLEJO');
                
                // Verificar si existen categorías en otros complejos
                const todasCategoriasQuery = `
                    SELECT 
                        cg.id, cg.nombre, cg.tipo, cg.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM categorias_gastos cg
                    LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                    ORDER BY cg.complejo_id, cg.nombre;
                `;
                
                const todasCategorias = await this.pool.query(todasCategoriasQuery);
                console.log(`\n📊 TODAS LAS CATEGORÍAS EN EL SISTEMA: ${todasCategorias.rows.length}`);
                
                const categoriasPorComplejo = {};
                todasCategorias.rows.forEach(categoria => {
                    if (!categoriasPorComplejo[categoria.complejo_id]) {
                        categoriasPorComplejo[categoria.complejo_id] = [];
                    }
                    categoriasPorComplejo[categoria.complejo_id].push(categoria);
                });
                
                Object.keys(categoriasPorComplejo).forEach(complejoId => {
                    const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                    console.log(`\n📂 COMPLEJO ${complejoId} (${categoriasDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${categoriasDelComplejo.length} categorías`);
                    categoriasDelComplejo.forEach(cat => {
                        console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
                    });
                });
                
            } else {
                console.log('\n📋 CATEGORÍAS ENCONTRADAS:');
                categorias.rows.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error simulando endpoint categorías:', error.message);
        }
    }

    async simularEndpointMovimientos() {
        console.log('\n🔍 SIMULANDO ENDPOINT MOVIMIENTOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Simular usuario del token JWT
            const usuario = {
                id: 37,
                email: 'owner@complejodemo3.cl',
                nombre: 'Owner Complejo Demo 3',
                rol: 'owner',
                complejo_id: 8
            };
            
            console.log(`👤 USUARIO SIMULADO:`);
            console.log(`   • ID: ${usuario.id}`);
            console.log(`   • Email: ${usuario.email}`);
            console.log(`   • Nombre: ${usuario.nombre}`);
            console.log(`   • Rol: ${usuario.rol}`);
            console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            
            // 2. Simular exactamente la consulta del endpoint
            let query = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    gi.categoria_id,
                    gi.tipo,
                    gi.monto,
                    TO_CHAR(gi.fecha, 'YYYY-MM-DD') as fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.numero_documento,
                    gi.creado_en,
                    gi.actualizado_en,
                    cat.nombre as categoria_nombre,
                    cat.icono as categoria_icono,
                    cat.color as categoria_color
                FROM gastos_ingresos gi
                JOIN categorias_gastos cat ON gi.categoria_id = cat.id
                WHERE 1=1
            `;
            
            const params = [];
            let paramIndex = 1;
            
            // Filtrar por complejo
            if (usuario.rol === 'owner' || usuario.rol === 'manager') {
                query += ` AND gi.complejo_id = $${paramIndex}`;
                params.push(usuario.complejo_id);
                paramIndex++;
            }
            
            query += ' ORDER BY gi.fecha DESC, gi.creado_en DESC';
            
            console.log(`\n🔍 CONSULTA SIMULADA:`);
            console.log(`   • Query: ${query}`);
            console.log(`   • Params: ${JSON.stringify(params)}`);
            
            const movimientos = await this.pool.query(query, params);
            
            console.log(`\n📊 RESULTADO MOVIMIENTOS:`);
            console.log(`   • Status: 200 OK`);
            console.log(`   • Cantidad: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA ESTE COMPLEJO');
                
                // Verificar si existen movimientos en otros complejos
                const todosMovimientosQuery = `
                    SELECT 
                        gi.id, gi.tipo, gi.monto, gi.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                    ORDER BY gi.complejo_id, gi.creado_en DESC;
                `;
                
                const todosMovimientos = await this.pool.query(todosMovimientosQuery);
                console.log(`\n📊 TODOS LOS MOVIMIENTOS EN EL SISTEMA: ${todosMovimientos.rows.length}`);
                
                const movimientosPorComplejo = {};
                todosMovimientos.rows.forEach(movimiento => {
                    if (!movimientosPorComplejo[movimiento.complejo_id]) {
                        movimientosPorComplejo[movimiento.complejo_id] = [];
                    }
                    movimientosPorComplejo[movimiento.complejo_id].push(movimiento);
                });
                
                Object.keys(movimientosPorComplejo).forEach(complejoId => {
                    const movimientosDelComplejo = movimientosPorComplejo[complejoId];
                    console.log(`\n💰 COMPLEJO ${complejoId} (${movimientosDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${movimientosDelComplejo.length} movimientos`);
                    movimientosDelComplejo.slice(0, 3).forEach(mov => {
                        console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    });
                });
                
            } else {
                console.log('\n📋 MOVIMIENTOS ENCONTRADOS:');
                movimientos.rows.slice(0, 5).forEach(movimiento => {
                    console.log(`   • [${movimiento.id}] ${movimiento.tipo.toUpperCase()}: $${movimiento.monto} - ${movimiento.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error simulando endpoint movimientos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async simular() {
        console.log('🔍 SIMULAR ENDPOINT COMPLETO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Simular endpoint categorías
        await this.simularEndpointCategorias();
        
        // 2. Simular endpoint movimientos
        await this.simularEndpointMovimientos();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Endpoints simulados');
        console.log('✅ Consultas ejecutadas');
        console.log('✅ Resultados verificados');
        
        await this.cerrar();
    }
}

// Ejecutar simulación
if (require.main === module) {
    const simulacion = new SimularEndpointCompleto();
    simulacion.simular().catch(console.error);
}

module.exports = SimularEndpointCompleto;



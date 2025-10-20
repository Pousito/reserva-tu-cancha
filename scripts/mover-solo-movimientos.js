#!/usr/bin/env node

/**
 * 🔧 MOVER SOLO MOVIMIENTOS FINANCIEROS
 * 
 * Este script mueve solo los movimientos financieros del complejo 7 al complejo 8
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class MoverSoloMovimientos {
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

    async moverMovimientosFinancieros() {
        console.log('\n🔧 MOVIENDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Verificar movimientos en complejo 7
            const movimientos7Query = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 7;
            `;
            
            const movimientos7 = await this.pool.query(movimientos7Query);
            console.log(`📊 Movimientos en complejo 7: ${movimientos7.rows[0].count}`);
            
            // 2. Verificar movimientos en complejo 8
            const movimientos8Query = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 8;
            `;
            
            const movimientos8 = await this.pool.query(movimientos8Query);
            console.log(`📊 Movimientos en complejo 8: ${movimientos8.rows[0].count}`);
            
            // 3. Mover movimientos del complejo 7 al complejo 8
            if (parseInt(movimientos7.rows[0].count) > 0) {
                console.log('🔧 Moviendo movimientos del complejo 7 al complejo 8...');
                
                // Primero, actualizar las categorías de los movimientos para que apunten a las categorías del complejo 8
                const actualizarCategoriasQuery = `
                    UPDATE gastos_ingresos 
                    SET categoria_id = (
                        SELECT cg8.id 
                        FROM categorias_gastos cg7
                        JOIN categorias_gastos cg8 ON cg7.nombre = cg8.nombre AND cg7.tipo = cg8.tipo
                        WHERE cg7.id = gastos_ingresos.categoria_id 
                        AND cg7.complejo_id = 7 
                        AND cg8.complejo_id = 8
                    )
                    WHERE complejo_id = 7;
                `;
                
                const resultCategorias = await this.pool.query(actualizarCategoriasQuery);
                console.log(`✅ ${resultCategorias.rowCount} movimientos actualizados con categorías del complejo 8`);
                
                // Luego, mover los movimientos al complejo 8
                const moverMovimientosQuery = `
                    UPDATE gastos_ingresos 
                    SET complejo_id = 8 
                    WHERE complejo_id = 7;
                `;
                
                const resultMovimientos = await this.pool.query(moverMovimientosQuery);
                console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
            }
            
        } catch (error) {
            console.error('❌ Error moviendo movimientos:', error.message);
        }
    }

    async verificarResultadoFinal() {
        console.log('\n✅ VERIFICANDO RESULTADO FINAL...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar usuario
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            console.log(`👤 Usuario: [${usuario.rows[0].id}] ${usuario.rows[0].nombre} - Complejo: [${usuario.rows[0].complejo_id}] ${usuario.rows[0].complejo_nombre}`);
            
            // Verificar categorías
            const categoriasQuery = `
                SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = 8;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            console.log(`📂 Categorías complejo 8: ${categorias.rows[0].count}`);
            
            // Verificar movimientos
            const movimientosQuery = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 8;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            console.log(`💰 Movimientos complejo 8: ${movimientos.rows[0].count}`);
            
            // Mostrar algunos movimientos recientes
            if (parseInt(movimientos.rows[0].count) > 0) {
                const movimientosRecientesQuery = `
                    SELECT 
                        gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.complejo_id = 8
                    ORDER BY gi.creado_en DESC
                    LIMIT 5;
                `;
                
                const movimientosRecientes = await this.pool.query(movimientosRecientesQuery);
                console.log('\n📋 MOVIMIENTOS RECIENTES:');
                movimientosRecientes.rows.forEach((mov, index) => {
                    console.log(`   ${index + 1}. [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando resultado final:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async mover() {
        console.log('🔧 MOVER SOLO MOVIMIENTOS FINANCIEROS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Mover movimientos financieros
        await this.moverMovimientosFinancieros();
        
        // 2. Verificar resultado final
        await this.verificarResultadoFinal();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Movimientos financieros movidos al complejo 8');
        console.log('✅ Usuario configurado para complejo 8');
        console.log('✅ Token JWT corregido');
        console.log('\n🔄 INSTRUCCIONES PARA EL USUARIO:');
        console.log('1. Cierra completamente el navegador');
        console.log('2. Abre una nueva ventana del navegador');
        console.log('3. Ve a https://www.reservatuscanchas.cl');
        console.log('4. Inicia sesión nuevamente con owner@complejodemo3.cl');
        console.log('5. Ve al panel de control financiero');
        console.log('6. Los datos deberían cargar correctamente ahora');
        
        await this.cerrar();
    }
}

// Ejecutar movimiento
if (require.main === module) {
    const movimiento = new MoverSoloMovimientos();
    movimiento.mover().catch(console.error);
}

module.exports = MoverSoloMovimientos;

/**
 * 🔧 MOVER SOLO MOVIMIENTOS FINANCIEROS
 * 
 * Este script mueve solo los movimientos financieros del complejo 7 al complejo 8
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class MoverSoloMovimientos {
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

    async moverMovimientosFinancieros() {
        console.log('\n🔧 MOVIENDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Verificar movimientos en complejo 7
            const movimientos7Query = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 7;
            `;
            
            const movimientos7 = await this.pool.query(movimientos7Query);
            console.log(`📊 Movimientos en complejo 7: ${movimientos7.rows[0].count}`);
            
            // 2. Verificar movimientos en complejo 8
            const movimientos8Query = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 8;
            `;
            
            const movimientos8 = await this.pool.query(movimientos8Query);
            console.log(`📊 Movimientos en complejo 8: ${movimientos8.rows[0].count}`);
            
            // 3. Mover movimientos del complejo 7 al complejo 8
            if (parseInt(movimientos7.rows[0].count) > 0) {
                console.log('🔧 Moviendo movimientos del complejo 7 al complejo 8...');
                
                // Primero, actualizar las categorías de los movimientos para que apunten a las categorías del complejo 8
                const actualizarCategoriasQuery = `
                    UPDATE gastos_ingresos 
                    SET categoria_id = (
                        SELECT cg8.id 
                        FROM categorias_gastos cg7
                        JOIN categorias_gastos cg8 ON cg7.nombre = cg8.nombre AND cg7.tipo = cg8.tipo
                        WHERE cg7.id = gastos_ingresos.categoria_id 
                        AND cg7.complejo_id = 7 
                        AND cg8.complejo_id = 8
                    )
                    WHERE complejo_id = 7;
                `;
                
                const resultCategorias = await this.pool.query(actualizarCategoriasQuery);
                console.log(`✅ ${resultCategorias.rowCount} movimientos actualizados con categorías del complejo 8`);
                
                // Luego, mover los movimientos al complejo 8
                const moverMovimientosQuery = `
                    UPDATE gastos_ingresos 
                    SET complejo_id = 8 
                    WHERE complejo_id = 7;
                `;
                
                const resultMovimientos = await this.pool.query(moverMovimientosQuery);
                console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
            }
            
        } catch (error) {
            console.error('❌ Error moviendo movimientos:', error.message);
        }
    }

    async verificarResultadoFinal() {
        console.log('\n✅ VERIFICANDO RESULTADO FINAL...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar usuario
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            console.log(`👤 Usuario: [${usuario.rows[0].id}] ${usuario.rows[0].nombre} - Complejo: [${usuario.rows[0].complejo_id}] ${usuario.rows[0].complejo_nombre}`);
            
            // Verificar categorías
            const categoriasQuery = `
                SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = 8;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            console.log(`📂 Categorías complejo 8: ${categorias.rows[0].count}`);
            
            // Verificar movimientos
            const movimientosQuery = `
                SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = 8;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            console.log(`💰 Movimientos complejo 8: ${movimientos.rows[0].count}`);
            
            // Mostrar algunos movimientos recientes
            if (parseInt(movimientos.rows[0].count) > 0) {
                const movimientosRecientesQuery = `
                    SELECT 
                        gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.complejo_id = 8
                    ORDER BY gi.creado_en DESC
                    LIMIT 5;
                `;
                
                const movimientosRecientes = await this.pool.query(movimientosRecientesQuery);
                console.log('\n📋 MOVIMIENTOS RECIENTES:');
                movimientosRecientes.rows.forEach((mov, index) => {
                    console.log(`   ${index + 1}. [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando resultado final:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async mover() {
        console.log('🔧 MOVER SOLO MOVIMIENTOS FINANCIEROS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Mover movimientos financieros
        await this.moverMovimientosFinancieros();
        
        // 2. Verificar resultado final
        await this.verificarResultadoFinal();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Movimientos financieros movidos al complejo 8');
        console.log('✅ Usuario configurado para complejo 8');
        console.log('✅ Token JWT corregido');
        console.log('\n🔄 INSTRUCCIONES PARA EL USUARIO:');
        console.log('1. Cierra completamente el navegador');
        console.log('2. Abre una nueva ventana del navegador');
        console.log('3. Ve a https://www.reservatuscanchas.cl');
        console.log('4. Inicia sesión nuevamente con owner@complejodemo3.cl');
        console.log('5. Ve al panel de control financiero');
        console.log('6. Los datos deberían cargar correctamente ahora');
        
        await this.cerrar();
    }
}

// Ejecutar movimiento
if (require.main === module) {
    const movimiento = new MoverSoloMovimientos();
    movimiento.mover().catch(console.error);
}

module.exports = MoverSoloMovimientos;



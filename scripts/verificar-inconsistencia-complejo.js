#!/usr/bin/env node

/**
 * 🔍 VERIFICAR INCONSISTENCIA DE COMPLEJO
 * 
 * Este script verifica por qué el usuario tiene complejo_id: 8
 * pero nosotros trabajamos con complejo_id: 7
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarInconsistenciaComplejo {
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

    async verificarUsuarios() {
        console.log('\n👤 VERIFICANDO USUARIOS...');
        console.log('=' .repeat(50));
        
        try {
            const usuariosQuery = `
                SELECT 
                    id, email, nombre, rol, complejo_id
                FROM usuarios
                WHERE email = 'owner@complejodemo3.cl'
                ORDER BY id;
            `;
            
            const usuarios = await this.pool.query(usuariosQuery);
            
            console.log(`📊 USUARIOS ENCONTRADOS: ${usuarios.rows.length}`);
            
            usuarios.rows.forEach(usuario => {
                console.log(`\n👤 [${usuario.id}] ${usuario.nombre}:`);
                console.log(`   • Email: ${usuario.email}`);
                console.log(`   • Rol: ${usuario.rol}`);
                console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            });
            
            return usuarios.rows;
            
        } catch (error) {
            console.error('❌ Error verificando usuarios:', error.message);
            return [];
        }
    }

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                WHERE nombre LIKE '%Demo 3%' OR email = 'owner@complejodemo3.cl'
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS ENCONTRADOS: ${complejos.rows.length}`);
            
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            });
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
            return [];
        }
    }

    async verificarCategoriasPorComplejo() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id IN (7, 8)
                ORDER BY cg.complejo_id, cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS ENCONTRADAS: ${categorias.rows.length}`);
            
            const categoriasPorComplejo = {};
            categorias.rows.forEach(categoria => {
                if (!categoriasPorComplejo[categoria.complejo_id]) {
                    categoriasPorComplejo[categoria.complejo_id] = [];
                }
                categoriasPorComplejo[categoria.complejo_id].push(categoria);
            });
            
            Object.keys(categoriasPorComplejo).forEach(complejoId => {
                const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                console.log(`\n📂 COMPLEJO ${complejoId} (${categoriasDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${categoriasDelComplejo.length} categorías`);
                
                categoriasDelComplejo.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosPorComplejo() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.complejo_id IN (7, 8)
                ORDER BY gi.creado_en DESC
                LIMIT 10;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS ENCONTRADOS: ${movimientos.rows.length}`);
            
            const movimientosPorComplejo = {};
            movimientos.rows.forEach(movimiento => {
                if (!movimientosPorComplejo[movimiento.complejo_id]) {
                    movimientosPorComplejo[movimiento.complejo_id] = [];
                }
                movimientosPorComplejo[movimiento.complejo_id].push(movimiento);
            });
            
            Object.keys(movimientosPorComplejo).forEach(complejoId => {
                const movimientosDelComplejo = movimientosPorComplejo[complejoId];
                console.log(`\n💰 COMPLEJO ${complejoId} (${movimientosDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${movimientosDelComplejo.length} movimientos`);
                
                movimientosDelComplejo.forEach(mov => {
                    console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     Descripción: ${mov.descripcion}`);
                    console.log(`     Creado: ${mov.creado_en}`);
                });
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async corregirUsuarioComplejo() {
        console.log('\n🔧 CORRIGIENDO USUARIO COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si existe el complejo 8
            const complejo8Query = `
                SELECT id, nombre, email FROM complejos WHERE id = 8;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length > 0) {
                console.log(`📊 Complejo 8 encontrado: ${complejo8.rows[0].nombre}`);
                
                // Verificar si el complejo 8 tiene categorías
                const categorias8Query = `
                    SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = 8;
                `;
                
                const categorias8 = await this.pool.query(categorias8Query);
                console.log(`📊 Categorías en complejo 8: ${categorias8.rows[0].count}`);
                
                if (parseInt(categorias8.rows[0].count) === 0) {
                    console.log('🔧 El complejo 8 no tiene categorías, copiando desde complejo 7...');
                    
                    // Copiar categorías del complejo 7 al complejo 8
                    const copiarCategoriasQuery = `
                        INSERT INTO categorias_gastos (nombre, tipo, descripcion, complejo_id)
                        SELECT nombre, tipo, descripcion, 8
                        FROM categorias_gastos
                        WHERE complejo_id = 7;
                    `;
                    
                    const result = await this.pool.query(copiarCategoriasQuery);
                    console.log(`✅ ${result.rowCount} categorías copiadas al complejo 8`);
                    
                } else {
                    console.log('✅ El complejo 8 ya tiene categorías');
                }
                
            } else {
                console.log('❌ El complejo 8 no existe');
                
                // Crear el complejo 8
                console.log('🔧 Creando complejo 8...');
                
                const crearComplejoQuery = `
                    INSERT INTO complejos (id, nombre, direccion, telefono, email, ciudad_id)
                    VALUES (8, 'Complejo Demo 3', 'Av. Los Robles 2450, Los Ángeles', '+56912345678', 'owner@complejodemo3.cl', 1)
                    RETURNING id;
                `;
                
                const result = await this.pool.query(crearComplejoQuery);
                console.log(`✅ Complejo 8 creado (ID: ${result.rows[0].id})`);
                
                // Copiar categorías del complejo 7 al complejo 8
                const copiarCategoriasQuery = `
                    INSERT INTO categorias_gastos (nombre, tipo, descripcion, complejo_id)
                    SELECT nombre, tipo, descripcion, 8
                    FROM categorias_gastos
                    WHERE complejo_id = 7;
                `;
                
                const result2 = await this.pool.query(copiarCategoriasQuery);
                console.log(`✅ ${result2.rowCount} categorías copiadas al complejo 8`);
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo usuario complejo:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR INCONSISTENCIA DE COMPLEJO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuarios
        const usuarios = await this.verificarUsuarios();
        
        // 2. Verificar complejos
        const complejos = await this.verificarComplejos();
        
        // 3. Verificar categorías por complejo
        const categorias = await this.verificarCategoriasPorComplejo();
        
        // 4. Verificar movimientos por complejo
        const movimientos = await this.verificarMovimientosPorComplejo();
        
        // 5. Corregir usuario complejo
        await this.corregirUsuarioComplejo();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuarios verificados: ${usuarios.length}`);
        console.log(`✅ Complejos verificados: ${complejos.length}`);
        console.log(`✅ Categorías verificadas: ${categorias.length}`);
        console.log(`✅ Movimientos verificados: ${movimientos.length}`);
        console.log('✅ Inconsistencia de complejo corregida');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarInconsistenciaComplejo();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarInconsistenciaComplejo;

/**
 * 🔍 VERIFICAR INCONSISTENCIA DE COMPLEJO
 * 
 * Este script verifica por qué el usuario tiene complejo_id: 8
 * pero nosotros trabajamos con complejo_id: 7
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarInconsistenciaComplejo {
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

    async verificarUsuarios() {
        console.log('\n👤 VERIFICANDO USUARIOS...');
        console.log('=' .repeat(50));
        
        try {
            const usuariosQuery = `
                SELECT 
                    id, email, nombre, rol, complejo_id
                FROM usuarios
                WHERE email = 'owner@complejodemo3.cl'
                ORDER BY id;
            `;
            
            const usuarios = await this.pool.query(usuariosQuery);
            
            console.log(`📊 USUARIOS ENCONTRADOS: ${usuarios.rows.length}`);
            
            usuarios.rows.forEach(usuario => {
                console.log(`\n👤 [${usuario.id}] ${usuario.nombre}:`);
                console.log(`   • Email: ${usuario.email}`);
                console.log(`   • Rol: ${usuario.rol}`);
                console.log(`   • Complejo ID: ${usuario.complejo_id}`);
            });
            
            return usuarios.rows;
            
        } catch (error) {
            console.error('❌ Error verificando usuarios:', error.message);
            return [];
        }
    }

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                WHERE nombre LIKE '%Demo 3%' OR email = 'owner@complejodemo3.cl'
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS ENCONTRADOS: ${complejos.rows.length}`);
            
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            });
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
            return [];
        }
    }

    async verificarCategoriasPorComplejo() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id IN (7, 8)
                ORDER BY cg.complejo_id, cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS ENCONTRADAS: ${categorias.rows.length}`);
            
            const categoriasPorComplejo = {};
            categorias.rows.forEach(categoria => {
                if (!categoriasPorComplejo[categoria.complejo_id]) {
                    categoriasPorComplejo[categoria.complejo_id] = [];
                }
                categoriasPorComplejo[categoria.complejo_id].push(categoria);
            });
            
            Object.keys(categoriasPorComplejo).forEach(complejoId => {
                const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                console.log(`\n📂 COMPLEJO ${complejoId} (${categoriasDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${categoriasDelComplejo.length} categorías`);
                
                categoriasDelComplejo.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosPorComplejo() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.complejo_id IN (7, 8)
                ORDER BY gi.creado_en DESC
                LIMIT 10;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS ENCONTRADOS: ${movimientos.rows.length}`);
            
            const movimientosPorComplejo = {};
            movimientos.rows.forEach(movimiento => {
                if (!movimientosPorComplejo[movimiento.complejo_id]) {
                    movimientosPorComplejo[movimiento.complejo_id] = [];
                }
                movimientosPorComplejo[movimiento.complejo_id].push(movimiento);
            });
            
            Object.keys(movimientosPorComplejo).forEach(complejoId => {
                const movimientosDelComplejo = movimientosPorComplejo[complejoId];
                console.log(`\n💰 COMPLEJO ${complejoId} (${movimientosDelComplejo[0]?.complejo_nombre || 'Sin nombre'}): ${movimientosDelComplejo.length} movimientos`);
                
                movimientosDelComplejo.forEach(mov => {
                    console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     Descripción: ${mov.descripcion}`);
                    console.log(`     Creado: ${mov.creado_en}`);
                });
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async corregirUsuarioComplejo() {
        console.log('\n🔧 CORRIGIENDO USUARIO COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si existe el complejo 8
            const complejo8Query = `
                SELECT id, nombre, email FROM complejos WHERE id = 8;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length > 0) {
                console.log(`📊 Complejo 8 encontrado: ${complejo8.rows[0].nombre}`);
                
                // Verificar si el complejo 8 tiene categorías
                const categorias8Query = `
                    SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = 8;
                `;
                
                const categorias8 = await this.pool.query(categorias8Query);
                console.log(`📊 Categorías en complejo 8: ${categorias8.rows[0].count}`);
                
                if (parseInt(categorias8.rows[0].count) === 0) {
                    console.log('🔧 El complejo 8 no tiene categorías, copiando desde complejo 7...');
                    
                    // Copiar categorías del complejo 7 al complejo 8
                    const copiarCategoriasQuery = `
                        INSERT INTO categorias_gastos (nombre, tipo, descripcion, complejo_id)
                        SELECT nombre, tipo, descripcion, 8
                        FROM categorias_gastos
                        WHERE complejo_id = 7;
                    `;
                    
                    const result = await this.pool.query(copiarCategoriasQuery);
                    console.log(`✅ ${result.rowCount} categorías copiadas al complejo 8`);
                    
                } else {
                    console.log('✅ El complejo 8 ya tiene categorías');
                }
                
            } else {
                console.log('❌ El complejo 8 no existe');
                
                // Crear el complejo 8
                console.log('🔧 Creando complejo 8...');
                
                const crearComplejoQuery = `
                    INSERT INTO complejos (id, nombre, direccion, telefono, email, ciudad_id)
                    VALUES (8, 'Complejo Demo 3', 'Av. Los Robles 2450, Los Ángeles', '+56912345678', 'owner@complejodemo3.cl', 1)
                    RETURNING id;
                `;
                
                const result = await this.pool.query(crearComplejoQuery);
                console.log(`✅ Complejo 8 creado (ID: ${result.rows[0].id})`);
                
                // Copiar categorías del complejo 7 al complejo 8
                const copiarCategoriasQuery = `
                    INSERT INTO categorias_gastos (nombre, tipo, descripcion, complejo_id)
                    SELECT nombre, tipo, descripcion, 8
                    FROM categorias_gastos
                    WHERE complejo_id = 7;
                `;
                
                const result2 = await this.pool.query(copiarCategoriasQuery);
                console.log(`✅ ${result2.rowCount} categorías copiadas al complejo 8`);
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo usuario complejo:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR INCONSISTENCIA DE COMPLEJO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuarios
        const usuarios = await this.verificarUsuarios();
        
        // 2. Verificar complejos
        const complejos = await this.verificarComplejos();
        
        // 3. Verificar categorías por complejo
        const categorias = await this.verificarCategoriasPorComplejo();
        
        // 4. Verificar movimientos por complejo
        const movimientos = await this.verificarMovimientosPorComplejo();
        
        // 5. Corregir usuario complejo
        await this.corregirUsuarioComplejo();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuarios verificados: ${usuarios.length}`);
        console.log(`✅ Complejos verificados: ${complejos.length}`);
        console.log(`✅ Categorías verificadas: ${categorias.length}`);
        console.log(`✅ Movimientos verificados: ${movimientos.length}`);
        console.log('✅ Inconsistencia de complejo corregida');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarInconsistenciaComplejo();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarInconsistenciaComplejo;



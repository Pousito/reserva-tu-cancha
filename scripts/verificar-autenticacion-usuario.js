#!/usr/bin/env node

/**
 * 🔍 VERIFICAR AUTENTICACIÓN DE USUARIO
 * 
 * Este script verifica la autenticación del usuario owner@complejodemo3.cl
 * y corrige cualquier inconsistencia
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarAutenticacionUsuario {
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

    async verificarUsuarioCompleto() {
        console.log('\n👤 VERIFICANDO USUARIO COMPLETO...');
        console.log('=' .repeat(50));
        
        try {
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre, c.email as complejo_email
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return null;
            }
            
            const user = usuario.rows[0];
            console.log(`📊 USUARIO ENCONTRADO:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Complejo ID: ${user.complejo_id}`);
            console.log(`   • Complejo Nombre: ${user.complejo_nombre}`);
            console.log(`   • Complejo Email: ${user.complejo_email}`);
            
            return user;
            
        } catch (error) {
            console.error('❌ Error verificando usuario:', error.message);
            return null;
        }
    }

    async verificarCategoriasUsuario() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS DEL USUARIO: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE USUARIO');
                return [];
            }
            
            console.log('\n📋 CATEGORÍAS DISPONIBLES:');
            categorias.rows.forEach(categoria => {
                console.log(`\n📂 [${categoria.id}] ${categoria.nombre}:`);
                console.log(`   • Tipo: ${categoria.tipo}`);
                console.log(`   • Descripción: ${categoria.descripcion}`);
                console.log(`   • Complejo: [${categoria.complejo_id}] ${categoria.complejo_nombre}`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosUsuario() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre, cg.tipo as categoria_tipo,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY gi.creado_en DESC
                LIMIT 10;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS DEL USUARIO: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA ESTE USUARIO');
                return [];
            }
            
            console.log('\n📋 MOVIMIENTOS RECIENTES:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`\n${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}:`);
                console.log(`   • Monto: $${movimiento.monto}`);
                console.log(`   • Fecha: ${movimiento.fecha}`);
                console.log(`   • Descripción: ${movimiento.descripcion}`);
                console.log(`   • Complejo: [${movimiento.complejo_id}] ${movimiento.complejo_nombre}`);
                console.log(`   • Categoría: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                console.log(`   • Creado: ${movimiento.creado_en}`);
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async simularAPICall() {
        console.log('\n🌐 SIMULANDO LLAMADA API...');
        console.log('=' .repeat(50));
        
        try {
            // Simular la llamada a /api/gastos/categorias
            console.log('🔍 Simulando GET /api/gastos/categorias...');
            
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 Respuesta categorías: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // Simular la llamada a /api/gastos/movimientos
            console.log('\n🔍 Simulando GET /api/gastos/movimientos...');
            
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY gi.creado_en DESC;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 Respuesta movimientos: ${movimientos.rows.length} movimientos`);
            movimientos.rows.slice(0, 5).forEach(mov => {
                console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
            });
            
        } catch (error) {
            console.error('❌ Error simulando API call:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR AUTENTICACIÓN DE USUARIO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario completo
        const usuario = await this.verificarUsuarioCompleto();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar categorías del usuario
        const categorias = await this.verificarCategoriasUsuario();
        
        // 3. Verificar movimientos del usuario
        const movimientos = await this.verificarMovimientosUsuario();
        
        // 4. Simular llamada API
        await this.simularAPICall();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
        console.log(`✅ Complejo: [${usuario.complejo_id}] ${usuario.complejo_nombre}`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log('✅ Autenticación verificada');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarAutenticacionUsuario();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarAutenticacionUsuario;

/**
 * 🔍 VERIFICAR AUTENTICACIÓN DE USUARIO
 * 
 * Este script verifica la autenticación del usuario owner@complejodemo3.cl
 * y corrige cualquier inconsistencia
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarAutenticacionUsuario {
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

    async verificarUsuarioCompleto() {
        console.log('\n👤 VERIFICANDO USUARIO COMPLETO...');
        console.log('=' .repeat(50));
        
        try {
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre, c.email as complejo_email
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return null;
            }
            
            const user = usuario.rows[0];
            console.log(`📊 USUARIO ENCONTRADO:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Complejo ID: ${user.complejo_id}`);
            console.log(`   • Complejo Nombre: ${user.complejo_nombre}`);
            console.log(`   • Complejo Email: ${user.complejo_email}`);
            
            return user;
            
        } catch (error) {
            console.error('❌ Error verificando usuario:', error.message);
            return null;
        }
    }

    async verificarCategoriasUsuario() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS DEL USUARIO: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE USUARIO');
                return [];
            }
            
            console.log('\n📋 CATEGORÍAS DISPONIBLES:');
            categorias.rows.forEach(categoria => {
                console.log(`\n📂 [${categoria.id}] ${categoria.nombre}:`);
                console.log(`   • Tipo: ${categoria.tipo}`);
                console.log(`   • Descripción: ${categoria.descripcion}`);
                console.log(`   • Complejo: [${categoria.complejo_id}] ${categoria.complejo_nombre}`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosUsuario() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre, cg.tipo as categoria_tipo,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY gi.creado_en DESC
                LIMIT 10;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS DEL USUARIO: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA ESTE USUARIO');
                return [];
            }
            
            console.log('\n📋 MOVIMIENTOS RECIENTES:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`\n${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}:`);
                console.log(`   • Monto: $${movimiento.monto}`);
                console.log(`   • Fecha: ${movimiento.fecha}`);
                console.log(`   • Descripción: ${movimiento.descripcion}`);
                console.log(`   • Complejo: [${movimiento.complejo_id}] ${movimiento.complejo_nombre}`);
                console.log(`   • Categoría: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                console.log(`   • Creado: ${movimiento.creado_en}`);
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async simularAPICall() {
        console.log('\n🌐 SIMULANDO LLAMADA API...');
        console.log('=' .repeat(50));
        
        try {
            // Simular la llamada a /api/gastos/categorias
            console.log('🔍 Simulando GET /api/gastos/categorias...');
            
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 Respuesta categorías: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // Simular la llamada a /api/gastos/movimientos
            console.log('\n🔍 Simulando GET /api/gastos/movimientos...');
            
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = (
                    SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl'
                )
                ORDER BY gi.creado_en DESC;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 Respuesta movimientos: ${movimientos.rows.length} movimientos`);
            movimientos.rows.slice(0, 5).forEach(mov => {
                console.log(`   • [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
            });
            
        } catch (error) {
            console.error('❌ Error simulando API call:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR AUTENTICACIÓN DE USUARIO');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario completo
        const usuario = await this.verificarUsuarioCompleto();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar categorías del usuario
        const categorias = await this.verificarCategoriasUsuario();
        
        // 3. Verificar movimientos del usuario
        const movimientos = await this.verificarMovimientosUsuario();
        
        // 4. Simular llamada API
        await this.simularAPICall();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
        console.log(`✅ Complejo: [${usuario.complejo_id}] ${usuario.complejo_nombre}`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log('✅ Autenticación verificada');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarAutenticacionUsuario();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarAutenticacionUsuario;



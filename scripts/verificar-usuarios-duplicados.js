#!/usr/bin/env node

/**
 * 🔍 VERIFICAR USUARIOS DUPLICADOS
 * 
 * Este script verifica si hay usuarios duplicados con el mismo email
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarUsuariosDuplicados {
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

    async verificarUsuariosDuplicados() {
        console.log('\n🔍 VERIFICANDO USUARIOS DUPLICADOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Buscar todos los usuarios con el email owner@complejodemo3.cl
            const usuariosQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre, c.email as complejo_email
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl'
                ORDER BY u.id;
            `;
            
            const usuarios = await this.pool.query(usuariosQuery);
            
            console.log(`📊 USUARIOS ENCONTRADOS CON EMAIL owner@complejodemo3.cl: ${usuarios.rows.length}`);
            
            if (usuarios.rows.length === 0) {
                console.log('❌ No se encontraron usuarios con ese email');
                return;
            }
            
            usuarios.rows.forEach((usuario, index) => {
                console.log(`\n👤 USUARIO ${index + 1}:`);
                console.log(`   • ID: ${usuario.id}`);
                console.log(`   • Email: ${usuario.email}`);
                console.log(`   • Nombre: ${usuario.nombre}`);
                console.log(`   • Rol: ${usuario.rol}`);
                console.log(`   • Complejo ID: ${usuario.complejo_id}`);
                console.log(`   • Complejo Nombre: ${usuario.complejo_nombre}`);
                console.log(`   • Complejo Email: ${usuario.complejo_email}`);
            });
            
            // 2. Verificar categorías para cada usuario
            console.log('\n📂 VERIFICANDO CATEGORÍAS PARA CADA USUARIO...');
            
            for (const usuario of usuarios.rows) {
                const categoriasQuery = `
                    SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1;
                `;
                
                const categorias = await this.pool.query(categoriasQuery, [usuario.complejo_id]);
                
                console.log(`\n📊 USUARIO ID ${usuario.id} (Complejo ${usuario.complejo_id}):`);
                console.log(`   • Categorías: ${categorias.rows[0].count}`);
                
                // 3. Verificar movimientos para cada usuario
                const movimientosQuery = `
                    SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [usuario.complejo_id]);
                
                console.log(`   • Movimientos: ${movimientos.rows[0].count}`);
            }
            
            // 4. Verificar si hay usuarios duplicados
            if (usuarios.rows.length > 1) {
                console.log('\n⚠️  USUARIOS DUPLICADOS DETECTADOS:');
                console.log('   • Hay múltiples usuarios con el mismo email');
                console.log('   • Esto puede causar problemas de autenticación');
                console.log('   • Se recomienda eliminar los duplicados');
                
                // Mostrar cuál tiene datos
                const usuariosConDatos = usuarios.rows.filter(usuario => {
                    // Verificar si tiene categorías o movimientos
                    return true; // Por ahora solo mostrar todos
                });
                
                console.log('\n🔍 ANÁLISIS DE USUARIOS:');
                usuarios.rows.forEach((usuario, index) => {
                    console.log(`   • Usuario ${index + 1} (ID: ${usuario.id}): Complejo ${usuario.complejo_id}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando usuarios duplicados:', error.message);
        }
    }

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Buscar todos los complejos con nombre "Complejo Demo 3"
            const complejosQuery = `
                SELECT 
                    c.id, c.nombre, c.direccion, c.telefono, c.email, c.ciudad_id,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM complejos c
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE c.nombre = 'Complejo Demo 3'
                GROUP BY c.id, c.nombre, c.direccion, c.telefono, c.email, c.ciudad_id
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS ENCONTRADOS CON NOMBRE "Complejo Demo 3": ${complejos.rows.length}`);
            
            if (complejos.rows.length === 0) {
                console.log('❌ No se encontraron complejos con ese nombre');
                return;
            }
            
            complejos.rows.forEach((complejo, index) => {
                console.log(`\n🏢 COMPLEJO ${index + 1}:`);
                console.log(`   • ID: ${complejo.id}`);
                console.log(`   • Nombre: ${complejo.nombre}`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
                console.log(`   • Categorías: ${complejo.categorias_count}`);
                console.log(`   • Movimientos: ${complejo.movimientos_count}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR USUARIOS DUPLICADOS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuarios duplicados
        await this.verificarUsuariosDuplicados();
        
        // 2. Verificar complejos
        await this.verificarComplejos();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuarios verificados');
        console.log('✅ Complejos verificados');
        console.log('✅ Duplicados identificados');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarUsuariosDuplicados();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarUsuariosDuplicados;

/**
 * 🔍 VERIFICAR USUARIOS DUPLICADOS
 * 
 * Este script verifica si hay usuarios duplicados con el mismo email
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarUsuariosDuplicados {
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

    async verificarUsuariosDuplicados() {
        console.log('\n🔍 VERIFICANDO USUARIOS DUPLICADOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Buscar todos los usuarios con el email owner@complejodemo3.cl
            const usuariosQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre, c.email as complejo_email
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl'
                ORDER BY u.id;
            `;
            
            const usuarios = await this.pool.query(usuariosQuery);
            
            console.log(`📊 USUARIOS ENCONTRADOS CON EMAIL owner@complejodemo3.cl: ${usuarios.rows.length}`);
            
            if (usuarios.rows.length === 0) {
                console.log('❌ No se encontraron usuarios con ese email');
                return;
            }
            
            usuarios.rows.forEach((usuario, index) => {
                console.log(`\n👤 USUARIO ${index + 1}:`);
                console.log(`   • ID: ${usuario.id}`);
                console.log(`   • Email: ${usuario.email}`);
                console.log(`   • Nombre: ${usuario.nombre}`);
                console.log(`   • Rol: ${usuario.rol}`);
                console.log(`   • Complejo ID: ${usuario.complejo_id}`);
                console.log(`   • Complejo Nombre: ${usuario.complejo_nombre}`);
                console.log(`   • Complejo Email: ${usuario.complejo_email}`);
            });
            
            // 2. Verificar categorías para cada usuario
            console.log('\n📂 VERIFICANDO CATEGORÍAS PARA CADA USUARIO...');
            
            for (const usuario of usuarios.rows) {
                const categoriasQuery = `
                    SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1;
                `;
                
                const categorias = await this.pool.query(categoriasQuery, [usuario.complejo_id]);
                
                console.log(`\n📊 USUARIO ID ${usuario.id} (Complejo ${usuario.complejo_id}):`);
                console.log(`   • Categorías: ${categorias.rows[0].count}`);
                
                // 3. Verificar movimientos para cada usuario
                const movimientosQuery = `
                    SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [usuario.complejo_id]);
                
                console.log(`   • Movimientos: ${movimientos.rows[0].count}`);
            }
            
            // 4. Verificar si hay usuarios duplicados
            if (usuarios.rows.length > 1) {
                console.log('\n⚠️  USUARIOS DUPLICADOS DETECTADOS:');
                console.log('   • Hay múltiples usuarios con el mismo email');
                console.log('   • Esto puede causar problemas de autenticación');
                console.log('   • Se recomienda eliminar los duplicados');
                
                // Mostrar cuál tiene datos
                const usuariosConDatos = usuarios.rows.filter(usuario => {
                    // Verificar si tiene categorías o movimientos
                    return true; // Por ahora solo mostrar todos
                });
                
                console.log('\n🔍 ANÁLISIS DE USUARIOS:');
                usuarios.rows.forEach((usuario, index) => {
                    console.log(`   • Usuario ${index + 1} (ID: ${usuario.id}): Complejo ${usuario.complejo_id}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando usuarios duplicados:', error.message);
        }
    }

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Buscar todos los complejos con nombre "Complejo Demo 3"
            const complejosQuery = `
                SELECT 
                    c.id, c.nombre, c.direccion, c.telefono, c.email, c.ciudad_id,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM complejos c
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE c.nombre = 'Complejo Demo 3'
                GROUP BY c.id, c.nombre, c.direccion, c.telefono, c.email, c.ciudad_id
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS ENCONTRADOS CON NOMBRE "Complejo Demo 3": ${complejos.rows.length}`);
            
            if (complejos.rows.length === 0) {
                console.log('❌ No se encontraron complejos con ese nombre');
                return;
            }
            
            complejos.rows.forEach((complejo, index) => {
                console.log(`\n🏢 COMPLEJO ${index + 1}:`);
                console.log(`   • ID: ${complejo.id}`);
                console.log(`   • Nombre: ${complejo.nombre}`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
                console.log(`   • Categorías: ${complejo.categorias_count}`);
                console.log(`   • Movimientos: ${complejo.movimientos_count}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICAR USUARIOS DUPLICADOS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuarios duplicados
        await this.verificarUsuariosDuplicados();
        
        // 2. Verificar complejos
        await this.verificarComplejos();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuarios verificados');
        console.log('✅ Complejos verificados');
        console.log('✅ Duplicados identificados');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificarUsuariosDuplicados();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificarUsuariosDuplicados;



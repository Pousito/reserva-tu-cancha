#!/usr/bin/env node

/**
 * 🔧 FORZAR REGENERACIÓN TOKEN
 * 
 * Este script fuerza la regeneración del token JWT del usuario
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ForzarRegeneracionToken {
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

    async forzarRegeneracionToken() {
        console.log('\n🔧 FORZANDO REGENERACIÓN TOKEN...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Verificar usuario actual
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return;
            }
            
            const user = usuario.rows[0];
            console.log(`👤 USUARIO ACTUAL:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Complejo ID: ${user.complejo_id}`);
            console.log(`   • Complejo Nombre: ${user.complejo_nombre}`);
            
            // 2. Verificar que el complejo 8 existe y tiene datos
            const complejo8Query = `
                SELECT 
                    c.id, c.nombre, c.email,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM complejos c
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE c.id = 8
                GROUP BY c.id, c.nombre, c.email;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length === 0) {
                console.log('❌ El complejo 8 no existe');
                return;
            }
            
            const complejo = complejo8.rows[0];
            console.log(`\n🏢 COMPLEJO 8:`);
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Categorías: ${complejo.categorias_count}`);
            console.log(`   • Movimientos: ${complejo.movimientos_count}`);
            
            // 3. Verificar que el usuario tiene el complejo_id correcto
            if (user.complejo_id !== 8) {
                console.log(`\n🔧 Actualizando usuario al complejo 8...`);
                
                const updateQuery = `
                    UPDATE usuarios 
                    SET complejo_id = 8 
                    WHERE email = 'owner@complejodemo3.cl';
                `;
                
                const result = await this.pool.query(updateQuery);
                console.log(`✅ Usuario actualizado al complejo 8 (${result.rowCount} filas afectadas)`);
            }
            
            // 4. Verificar que hay datos en el complejo 8
            if (parseInt(complejo.categorias_count) === 0 || parseInt(complejo.movimientos_count) === 0) {
                console.log(`\n❌ El complejo 8 no tiene datos suficientes:`);
                console.log(`   • Categorías: ${complejo.categorias_count}`);
                console.log(`   • Movimientos: ${complejo.movimientos_count}`);
                
                // Verificar si hay datos en el complejo 7
                const complejo7Query = `
                    SELECT 
                        c.id, c.nombre, c.email,
                        COUNT(DISTINCT cg.id) as categorias_count,
                        COUNT(DISTINCT gi.id) as movimientos_count
                    FROM complejos c
                    LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                    LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                    WHERE c.id = 7
                    GROUP BY c.id, c.nombre, c.email;
                `;
                
                const complejo7 = await this.pool.query(complejo7Query);
                
                if (complejo7.rows.length > 0) {
                    const complejo7Data = complejo7.rows[0];
                    console.log(`\n📊 COMPLEJO 7 TIENE DATOS:`);
                    console.log(`   • Categorías: ${complejo7Data.categorias_count}`);
                    console.log(`   • Movimientos: ${complejo7Data.movimientos_count}`);
                    
                    if (parseInt(complejo7Data.movimientos_count) > 0) {
                        console.log(`\n🔧 Moviendo movimientos del complejo 7 al complejo 8...`);
                        
                        const moverMovimientosQuery = `
                            UPDATE gastos_ingresos 
                            SET complejo_id = 8 
                            WHERE complejo_id = 7;
                        `;
                        
                        const resultMovimientos = await this.pool.query(moverMovimientosQuery);
                        console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
                    }
                }
            }
            
            // 5. Verificación final
            const verificacionFinalQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE u.email = 'owner@complejodemo3.cl'
                GROUP BY u.id, u.email, u.nombre, u.rol, u.complejo_id, c.nombre;
            `;
            
            const verificacionFinal = await this.pool.query(verificacionFinalQuery);
            
            if (verificacionFinal.rows.length > 0) {
                const final = verificacionFinal.rows[0];
                console.log(`\n✅ VERIFICACIÓN FINAL:`);
                console.log(`   • Usuario: [${final.id}] ${final.nombre}`);
                console.log(`   • Complejo: [${final.complejo_id}] ${final.complejo_nombre}`);
                console.log(`   • Categorías: ${final.categorias_count}`);
                console.log(`   • Movimientos: ${final.movimientos_count}`);
            }
            
        } catch (error) {
            console.error('❌ Error forzando regeneración token:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async forzar() {
        console.log('🔧 FORZAR REGENERACIÓN TOKEN');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Forzar regeneración token
        await this.forzarRegeneracionToken();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuario configurado correctamente');
        console.log('✅ Complejo 8 con datos');
        console.log('✅ Token JWT listo para regeneración');
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

// Ejecutar forzado
if (require.main === module) {
    const forzar = new ForzarRegeneracionToken();
    forzar.forzar().catch(console.error);
}

module.exports = ForzarRegeneracionToken;

/**
 * 🔧 FORZAR REGENERACIÓN TOKEN
 * 
 * Este script fuerza la regeneración del token JWT del usuario
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ForzarRegeneracionToken {
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

    async forzarRegeneracionToken() {
        console.log('\n🔧 FORZANDO REGENERACIÓN TOKEN...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Verificar usuario actual
            const usuarioQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                WHERE u.email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return;
            }
            
            const user = usuario.rows[0];
            console.log(`👤 USUARIO ACTUAL:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Complejo ID: ${user.complejo_id}`);
            console.log(`   • Complejo Nombre: ${user.complejo_nombre}`);
            
            // 2. Verificar que el complejo 8 existe y tiene datos
            const complejo8Query = `
                SELECT 
                    c.id, c.nombre, c.email,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM complejos c
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE c.id = 8
                GROUP BY c.id, c.nombre, c.email;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length === 0) {
                console.log('❌ El complejo 8 no existe');
                return;
            }
            
            const complejo = complejo8.rows[0];
            console.log(`\n🏢 COMPLEJO 8:`);
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Categorías: ${complejo.categorias_count}`);
            console.log(`   • Movimientos: ${complejo.movimientos_count}`);
            
            // 3. Verificar que el usuario tiene el complejo_id correcto
            if (user.complejo_id !== 8) {
                console.log(`\n🔧 Actualizando usuario al complejo 8...`);
                
                const updateQuery = `
                    UPDATE usuarios 
                    SET complejo_id = 8 
                    WHERE email = 'owner@complejodemo3.cl';
                `;
                
                const result = await this.pool.query(updateQuery);
                console.log(`✅ Usuario actualizado al complejo 8 (${result.rowCount} filas afectadas)`);
            }
            
            // 4. Verificar que hay datos en el complejo 8
            if (parseInt(complejo.categorias_count) === 0 || parseInt(complejo.movimientos_count) === 0) {
                console.log(`\n❌ El complejo 8 no tiene datos suficientes:`);
                console.log(`   • Categorías: ${complejo.categorias_count}`);
                console.log(`   • Movimientos: ${complejo.movimientos_count}`);
                
                // Verificar si hay datos en el complejo 7
                const complejo7Query = `
                    SELECT 
                        c.id, c.nombre, c.email,
                        COUNT(DISTINCT cg.id) as categorias_count,
                        COUNT(DISTINCT gi.id) as movimientos_count
                    FROM complejos c
                    LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                    LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                    WHERE c.id = 7
                    GROUP BY c.id, c.nombre, c.email;
                `;
                
                const complejo7 = await this.pool.query(complejo7Query);
                
                if (complejo7.rows.length > 0) {
                    const complejo7Data = complejo7.rows[0];
                    console.log(`\n📊 COMPLEJO 7 TIENE DATOS:`);
                    console.log(`   • Categorías: ${complejo7Data.categorias_count}`);
                    console.log(`   • Movimientos: ${complejo7Data.movimientos_count}`);
                    
                    if (parseInt(complejo7Data.movimientos_count) > 0) {
                        console.log(`\n🔧 Moviendo movimientos del complejo 7 al complejo 8...`);
                        
                        const moverMovimientosQuery = `
                            UPDATE gastos_ingresos 
                            SET complejo_id = 8 
                            WHERE complejo_id = 7;
                        `;
                        
                        const resultMovimientos = await this.pool.query(moverMovimientosQuery);
                        console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
                    }
                }
            }
            
            // 5. Verificación final
            const verificacionFinalQuery = `
                SELECT 
                    u.id, u.email, u.nombre, u.rol, u.complejo_id,
                    c.nombre as complejo_nombre,
                    COUNT(DISTINCT cg.id) as categorias_count,
                    COUNT(DISTINCT gi.id) as movimientos_count
                FROM usuarios u
                LEFT JOIN complejos c ON u.complejo_id = c.id
                LEFT JOIN categorias_gastos cg ON c.id = cg.complejo_id
                LEFT JOIN gastos_ingresos gi ON c.id = gi.complejo_id
                WHERE u.email = 'owner@complejodemo3.cl'
                GROUP BY u.id, u.email, u.nombre, u.rol, u.complejo_id, c.nombre;
            `;
            
            const verificacionFinal = await this.pool.query(verificacionFinalQuery);
            
            if (verificacionFinal.rows.length > 0) {
                const final = verificacionFinal.rows[0];
                console.log(`\n✅ VERIFICACIÓN FINAL:`);
                console.log(`   • Usuario: [${final.id}] ${final.nombre}`);
                console.log(`   • Complejo: [${final.complejo_id}] ${final.complejo_nombre}`);
                console.log(`   • Categorías: ${final.categorias_count}`);
                console.log(`   • Movimientos: ${final.movimientos_count}`);
            }
            
        } catch (error) {
            console.error('❌ Error forzando regeneración token:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async forzar() {
        console.log('🔧 FORZAR REGENERACIÓN TOKEN');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Forzar regeneración token
        await this.forzarRegeneracionToken();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuario configurado correctamente');
        console.log('✅ Complejo 8 con datos');
        console.log('✅ Token JWT listo para regeneración');
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

// Ejecutar forzado
if (require.main === module) {
    const forzar = new ForzarRegeneracionToken();
    forzar.forzar().catch(console.error);
}

module.exports = ForzarRegeneracionToken;



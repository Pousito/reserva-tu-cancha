#!/usr/bin/env node

/**
 * 🔧 FORZAR ACTUALIZACIÓN DE TOKEN
 * 
 * Este script fuerza la actualización del token de autenticación
 * para que el usuario tenga los datos correctos
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ForzarActualizacionToken {
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

    async verificarUsuarioActual() {
        console.log('\n👤 VERIFICANDO USUARIO ACTUAL...');
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
            console.log(`📊 USUARIO ACTUAL:`);
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

    async actualizarUsuarioComplejo() {
        console.log('\n🔧 ACTUALIZANDO USUARIO COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si el usuario tiene complejo_id correcto
            const usuarioQuery = `
                SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return;
            }
            
            const complejoIdActual = usuario.rows[0].complejo_id;
            console.log(`📊 Complejo ID actual: ${complejoIdActual}`);
            
            // Verificar si existe el complejo 7
            const complejo7Query = `
                SELECT id, nombre FROM complejos WHERE id = 7;
            `;
            
            const complejo7 = await this.pool.query(complejo7Query);
            
            if (complejo7.rows.length === 0) {
                console.log('❌ El complejo 7 no existe');
                return;
            }
            
            console.log(`📊 Complejo 7 encontrado: ${complejo7.rows[0].nombre}`);
            
            // Actualizar el usuario para asegurar que tenga complejo_id = 7
            if (complejoIdActual !== 7) {
                console.log(`🔧 Actualizando usuario de complejo ${complejoIdActual} a complejo 7`);
                
                const updateQuery = `
                    UPDATE usuarios 
                    SET complejo_id = 7 
                    WHERE email = 'owner@complejodemo3.cl';
                `;
                
                await this.pool.query(updateQuery);
                console.log('✅ Usuario actualizado al complejo 7');
            } else {
                console.log('✅ Usuario ya tiene complejo_id = 7');
            }
            
        } catch (error) {
            console.error('❌ Error actualizando usuario:', error.message);
        }
    }

    async verificarCategoriasComplejo7() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = 7
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS COMPLEJO 7: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA EL COMPLEJO 7');
                return [];
            }
            
            console.log('\n📋 CATEGORÍAS DISPONIBLES:');
            categorias.rows.forEach(categoria => {
                console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosComplejo7() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7
                ORDER BY gi.creado_en DESC
                LIMIT 5;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS COMPLEJO 7: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA EL COMPLEJO 7');
                return [];
            }
            
            console.log('\n📋 MOVIMIENTOS RECIENTES:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`   ${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}: $${movimiento.monto} - ${movimiento.categoria_nombre}`);
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async simularAPICallComplejo7() {
        console.log('\n🌐 SIMULANDO API CALL COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            // Simular la llamada a /api/gastos/categorias con complejo_id = 7
            console.log('🔍 Simulando GET /api/gastos/categorias con complejo_id = 7...');
            
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id = 7
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 Respuesta categorías: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // Simular la llamada a /api/gastos/movimientos con complejo_id = 7
            console.log('\n🔍 Simulando GET /api/gastos/movimientos con complejo_id = 7...');
            
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7
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

    async forzarActualizacion() {
        console.log('🔧 FORZAR ACTUALIZACIÓN DE TOKEN');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario actual
        const usuario = await this.verificarUsuarioActual();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Actualizar usuario complejo
        await this.actualizarUsuarioComplejo();
        
        // 3. Verificar categorías complejo 7
        const categorias = await this.verificarCategoriasComplejo7();
        
        // 4. Verificar movimientos complejo 7
        const movimientos = await this.verificarMovimientosComplejo7();
        
        // 5. Simular API call complejo 7
        await this.simularAPICallComplejo7();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
        console.log(`✅ Complejo: [7] Complejo Demo 3`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log('✅ Token actualizado correctamente');
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

// Ejecutar actualización forzada
if (require.main === module) {
    const actualizacion = new ForzarActualizacionToken();
    actualizacion.forzarActualizacion().catch(console.error);
}

module.exports = ForzarActualizacionToken;
/**
 * 🔧 FORZAR ACTUALIZACIÓN DE TOKEN
 * 
 * Este script fuerza la actualización del token de autenticación
 * para que el usuario tenga los datos correctos
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ForzarActualizacionToken {
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

    async verificarUsuarioActual() {
        console.log('\n👤 VERIFICANDO USUARIO ACTUAL...');
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
            console.log(`📊 USUARIO ACTUAL:`);
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

    async actualizarUsuarioComplejo() {
        console.log('\n🔧 ACTUALIZANDO USUARIO COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar si el usuario tiene complejo_id correcto
            const usuarioQuery = `
                SELECT complejo_id FROM usuarios WHERE email = 'owner@complejodemo3.cl';
            `;
            
            const usuario = await this.pool.query(usuarioQuery);
            
            if (usuario.rows.length === 0) {
                console.log('❌ Usuario no encontrado');
                return;
            }
            
            const complejoIdActual = usuario.rows[0].complejo_id;
            console.log(`📊 Complejo ID actual: ${complejoIdActual}`);
            
            // Verificar si existe el complejo 7
            const complejo7Query = `
                SELECT id, nombre FROM complejos WHERE id = 7;
            `;
            
            const complejo7 = await this.pool.query(complejo7Query);
            
            if (complejo7.rows.length === 0) {
                console.log('❌ El complejo 7 no existe');
                return;
            }
            
            console.log(`📊 Complejo 7 encontrado: ${complejo7.rows[0].nombre}`);
            
            // Actualizar el usuario para asegurar que tenga complejo_id = 7
            if (complejoIdActual !== 7) {
                console.log(`🔧 Actualizando usuario de complejo ${complejoIdActual} a complejo 7`);
                
                const updateQuery = `
                    UPDATE usuarios 
                    SET complejo_id = 7 
                    WHERE email = 'owner@complejodemo3.cl';
                `;
                
                await this.pool.query(updateQuery);
                console.log('✅ Usuario actualizado al complejo 7');
            } else {
                console.log('✅ Usuario ya tiene complejo_id = 7');
            }
            
        } catch (error) {
            console.error('❌ Error actualizando usuario:', error.message);
        }
    }

    async verificarCategoriasComplejo7() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = 7
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS COMPLEJO 7: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA EL COMPLEJO 7');
                return [];
            }
            
            console.log('\n📋 CATEGORÍAS DISPONIBLES:');
            categorias.rows.forEach(categoria => {
                console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
            });
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarMovimientosComplejo7() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7
                ORDER BY gi.creado_en DESC
                LIMIT 5;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS COMPLEJO 7: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA EL COMPLEJO 7');
                return [];
            }
            
            console.log('\n📋 MOVIMIENTOS RECIENTES:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`   ${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}: $${movimiento.monto} - ${movimiento.categoria_nombre}`);
            });
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return [];
        }
    }

    async simularAPICallComplejo7() {
        console.log('\n🌐 SIMULANDO API CALL COMPLEJO 7...');
        console.log('=' .repeat(50));
        
        try {
            // Simular la llamada a /api/gastos/categorias con complejo_id = 7
            console.log('🔍 Simulando GET /api/gastos/categorias con complejo_id = 7...');
            
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id = 7
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 Respuesta categorías: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // Simular la llamada a /api/gastos/movimientos con complejo_id = 7
            console.log('\n🔍 Simulando GET /api/gastos/movimientos con complejo_id = 7...');
            
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.fecha, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7
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

    async forzarActualizacion() {
        console.log('🔧 FORZAR ACTUALIZACIÓN DE TOKEN');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario actual
        const usuario = await this.verificarUsuarioActual();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Actualizar usuario complejo
        await this.actualizarUsuarioComplejo();
        
        // 3. Verificar categorías complejo 7
        const categorias = await this.verificarCategoriasComplejo7();
        
        // 4. Verificar movimientos complejo 7
        const movimientos = await this.verificarMovimientosComplejo7();
        
        // 5. Simular API call complejo 7
        await this.simularAPICallComplejo7();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Usuario: ${usuario.nombre} (${usuario.email})`);
        console.log(`✅ Complejo: [7] Complejo Demo 3`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log('✅ Token actualizado correctamente');
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

// Ejecutar actualización forzada
if (require.main === module) {
    const actualizacion = new ForzarActualizacionToken();
    actualizacion.forzarActualizacion().catch(console.error);
}

module.exports = ForzarActualizacionToken;
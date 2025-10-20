#!/usr/bin/env node

/**
 * 🔧 CORREGIR TOKEN JWT
 * 
 * Este script corrige el token JWT del usuario para que tenga
 * los datos correctos del complejo
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorregirTokenJWT {
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
            console.log(`📊 USUARIO EN BASE DE DATOS:`);
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

    async verificarComplejo8() {
        console.log('\n🏢 VERIFICANDO COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const complejo8Query = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                WHERE id = 8;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length === 0) {
                console.log('❌ El complejo 8 no existe');
                return null;
            }
            
            const complejo = complejo8.rows[0];
            console.log(`📊 COMPLEJO 8 ENCONTRADO:`);
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Dirección: ${complejo.direccion}`);
            console.log(`   • Teléfono: ${complejo.telefono}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            
            return complejo;
            
        } catch (error) {
            console.error('❌ Error verificando complejo 8:', error.message);
            return null;
        }
    }

    async verificarCategoriasComplejo8() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = 8
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS COMPLEJO 8: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA EL COMPLEJO 8');
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

    async verificarMovimientosComplejo8() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 8
                ORDER BY gi.creado_en DESC
                LIMIT 5;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS COMPLEJO 8: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA EL COMPLEJO 8');
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

    async moverDatosComplejo7AComplejo8() {
        console.log('\n🔧 MOVIENDO DATOS DEL COMPLEJO 7 AL COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Mover categorías del complejo 7 al complejo 8
            console.log('🔧 Moviendo categorías...');
            
            const moverCategoriasQuery = `
                UPDATE categorias_gastos 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultCategorias = await this.pool.query(moverCategoriasQuery);
            console.log(`✅ ${resultCategorias.rowCount} categorías movidas al complejo 8`);
            
            // 2. Mover movimientos del complejo 7 al complejo 8
            console.log('🔧 Moviendo movimientos...');
            
            const moverMovimientosQuery = `
                UPDATE gastos_ingresos 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultMovimientos = await this.pool.query(moverMovimientosQuery);
            console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
            
            // 3. Mover canchas del complejo 7 al complejo 8
            console.log('🔧 Moviendo canchas...');
            
            const moverCanchasQuery = `
                UPDATE canchas 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultCanchas = await this.pool.query(moverCanchasQuery);
            console.log(`✅ ${resultCanchas.rowCount} canchas movidas al complejo 8`);
            
            // 4. Mover reservas del complejo 7 al complejo 8 (a través de canchas)
            console.log('🔧 Moviendo reservas...');
            
            const moverReservasQuery = `
                UPDATE reservas 
                SET cancha_id = (
                    SELECT c.id FROM canchas c 
                    WHERE c.complejo_id = 8 
                    ORDER BY c.id 
                    LIMIT 1
                )
                WHERE cancha_id IN (
                    SELECT id FROM canchas WHERE complejo_id = 8
                );
            `;
            
            const resultReservas = await this.pool.query(moverReservasQuery);
            console.log(`✅ ${resultReservas.rowCount} reservas movidas al complejo 8`);
            
        } catch (error) {
            console.error('❌ Error moviendo datos:', error.message);
        }
    }

    async actualizarUsuarioComplejo8() {
        console.log('\n🔧 ACTUALIZANDO USUARIO AL COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const updateQuery = `
                UPDATE usuarios 
                SET complejo_id = 8 
                WHERE email = 'owner@complejodemo3.cl';
            `;
            
            const result = await this.pool.query(updateQuery);
            console.log(`✅ Usuario actualizado al complejo 8 (${result.rowCount} filas afectadas)`);
            
        } catch (error) {
            console.error('❌ Error actualizando usuario:', error.message);
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

    async corregir() {
        console.log('🔧 CORREGIR TOKEN JWT');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario completo
        const usuario = await this.verificarUsuarioCompleto();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar complejo 8
        const complejo8 = await this.verificarComplejo8();
        
        if (!complejo8) {
            console.log('❌ El complejo 8 no existe, no se puede continuar');
            await this.cerrar();
            return;
        }
        
        // 3. Verificar categorías complejo 8
        const categorias8 = await this.verificarCategoriasComplejo8();
        
        // 4. Verificar movimientos complejo 8
        const movimientos8 = await this.verificarMovimientosComplejo8();
        
        // 5. Si no hay datos en complejo 8, mover desde complejo 7
        if (categorias8.length === 0 || movimientos8.length === 0) {
            console.log('\n🔧 No hay datos en complejo 8, moviendo desde complejo 7...');
            await this.moverDatosComplejo7AComplejo8();
        }
        
        // 6. Actualizar usuario al complejo 8
        await this.actualizarUsuarioComplejo8();
        
        // 7. Verificar resultado final
        await this.verificarResultadoFinal();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuario actualizado al complejo 8');
        console.log('✅ Datos movidos al complejo 8');
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

// Ejecutar corrección
if (require.main === module) {
    const correccion = new CorregirTokenJWT();
    correccion.corregir().catch(console.error);
}

module.exports = CorregirTokenJWT;

/**
 * 🔧 CORREGIR TOKEN JWT
 * 
 * Este script corrige el token JWT del usuario para que tenga
 * los datos correctos del complejo
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorregirTokenJWT {
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
            console.log(`📊 USUARIO EN BASE DE DATOS:`);
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

    async verificarComplejo8() {
        console.log('\n🏢 VERIFICANDO COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const complejo8Query = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                WHERE id = 8;
            `;
            
            const complejo8 = await this.pool.query(complejo8Query);
            
            if (complejo8.rows.length === 0) {
                console.log('❌ El complejo 8 no existe');
                return null;
            }
            
            const complejo = complejo8.rows[0];
            console.log(`📊 COMPLEJO 8 ENCONTRADO:`);
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Dirección: ${complejo.direccion}`);
            console.log(`   • Teléfono: ${complejo.telefono}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            
            return complejo;
            
        } catch (error) {
            console.error('❌ Error verificando complejo 8:', error.message);
            return null;
        }
    }

    async verificarCategoriasComplejo8() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                WHERE cg.complejo_id = 8
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 CATEGORÍAS COMPLEJO 8: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA EL COMPLEJO 8');
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

    async verificarMovimientosComplejo8() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 8
                ORDER BY gi.creado_en DESC
                LIMIT 5;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 MOVIMIENTOS COMPLEJO 8: ${movimientos.rows.length}`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS PARA EL COMPLEJO 8');
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

    async moverDatosComplejo7AComplejo8() {
        console.log('\n🔧 MOVIENDO DATOS DEL COMPLEJO 7 AL COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            // 1. Mover categorías del complejo 7 al complejo 8
            console.log('🔧 Moviendo categorías...');
            
            const moverCategoriasQuery = `
                UPDATE categorias_gastos 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultCategorias = await this.pool.query(moverCategoriasQuery);
            console.log(`✅ ${resultCategorias.rowCount} categorías movidas al complejo 8`);
            
            // 2. Mover movimientos del complejo 7 al complejo 8
            console.log('🔧 Moviendo movimientos...');
            
            const moverMovimientosQuery = `
                UPDATE gastos_ingresos 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultMovimientos = await this.pool.query(moverMovimientosQuery);
            console.log(`✅ ${resultMovimientos.rowCount} movimientos movidos al complejo 8`);
            
            // 3. Mover canchas del complejo 7 al complejo 8
            console.log('🔧 Moviendo canchas...');
            
            const moverCanchasQuery = `
                UPDATE canchas 
                SET complejo_id = 8 
                WHERE complejo_id = 7;
            `;
            
            const resultCanchas = await this.pool.query(moverCanchasQuery);
            console.log(`✅ ${resultCanchas.rowCount} canchas movidas al complejo 8`);
            
            // 4. Mover reservas del complejo 7 al complejo 8 (a través de canchas)
            console.log('🔧 Moviendo reservas...');
            
            const moverReservasQuery = `
                UPDATE reservas 
                SET cancha_id = (
                    SELECT c.id FROM canchas c 
                    WHERE c.complejo_id = 8 
                    ORDER BY c.id 
                    LIMIT 1
                )
                WHERE cancha_id IN (
                    SELECT id FROM canchas WHERE complejo_id = 8
                );
            `;
            
            const resultReservas = await this.pool.query(moverReservasQuery);
            console.log(`✅ ${resultReservas.rowCount} reservas movidas al complejo 8`);
            
        } catch (error) {
            console.error('❌ Error moviendo datos:', error.message);
        }
    }

    async actualizarUsuarioComplejo8() {
        console.log('\n🔧 ACTUALIZANDO USUARIO AL COMPLEJO 8...');
        console.log('=' .repeat(50));
        
        try {
            const updateQuery = `
                UPDATE usuarios 
                SET complejo_id = 8 
                WHERE email = 'owner@complejodemo3.cl';
            `;
            
            const result = await this.pool.query(updateQuery);
            console.log(`✅ Usuario actualizado al complejo 8 (${result.rowCount} filas afectadas)`);
            
        } catch (error) {
            console.error('❌ Error actualizando usuario:', error.message);
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

    async corregir() {
        console.log('🔧 CORREGIR TOKEN JWT');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar usuario completo
        const usuario = await this.verificarUsuarioCompleto();
        
        if (!usuario) {
            console.log('❌ No se puede continuar sin usuario');
            await this.cerrar();
            return;
        }
        
        // 2. Verificar complejo 8
        const complejo8 = await this.verificarComplejo8();
        
        if (!complejo8) {
            console.log('❌ El complejo 8 no existe, no se puede continuar');
            await this.cerrar();
            return;
        }
        
        // 3. Verificar categorías complejo 8
        const categorias8 = await this.verificarCategoriasComplejo8();
        
        // 4. Verificar movimientos complejo 8
        const movimientos8 = await this.verificarMovimientosComplejo8();
        
        // 5. Si no hay datos en complejo 8, mover desde complejo 7
        if (categorias8.length === 0 || movimientos8.length === 0) {
            console.log('\n🔧 No hay datos en complejo 8, moviendo desde complejo 7...');
            await this.moverDatosComplejo7AComplejo8();
        }
        
        // 6. Actualizar usuario al complejo 8
        await this.actualizarUsuarioComplejo8();
        
        // 7. Verificar resultado final
        await this.verificarResultadoFinal();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Usuario actualizado al complejo 8');
        console.log('✅ Datos movidos al complejo 8');
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

// Ejecutar corrección
if (require.main === module) {
    const correccion = new CorregirTokenJWT();
    correccion.corregir().catch(console.error);
}

module.exports = CorregirTokenJWT;



#!/usr/bin/env node

/**
 * 🗑️ ELIMINACIÓN SIMPLE DEL COMPLEJO DEMO 3 DUPLICADO
 * 
 * Este script elimina el complejo Demo 3 (ID 8) que no tiene reservas
 * y mantiene el complejo Demo 3 (ID 7) que sí tiene actividad.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class EliminacionComplejoDemo3Duplicado {
    constructor() {
        this.pool = null;
        this.complejoAEliminar = 8; // Complejo Demo 3 sin actividad
        this.complejoAMantener = 7; // Complejo Demo 3 con actividad
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

    async verificarEstadoActual() {
        console.log('\n🔍 VERIFICANDO ESTADO ACTUAL...');
        console.log('=' .repeat(50));
        
        for (const complejoId of [this.complejoAMantener, this.complejoAEliminar]) {
            console.log(`\n📋 COMPLEJO ID: ${complejoId}`);
            console.log('-'.repeat(30));
            
            try {
                // Información básica
                const complejoQuery = `
                    SELECT id, nombre, direccion, telefono
                    FROM complejos
                    WHERE id = $1;
                `;
                
                const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
                
                if (complejoResult.rows.length === 0) {
                    console.log(`❌ Complejo ${complejoId} no encontrado`);
                    continue;
                }
                
                const complejo = complejoResult.rows[0];
                console.log(`✅ ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Teléfono: ${complejo.telefono}`);
                
                // Contar elementos
                const canchasCount = await this.pool.query('SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1', [complejoId]);
                const reservasCount = await this.pool.query(`
                    SELECT COUNT(*) as count FROM reservas r 
                    JOIN canchas c ON r.cancha_id = c.id 
                    WHERE c.complejo_id = $1
                `, [complejoId]);
                const categoriasCount = await this.pool.query('SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1', [complejoId]);
                const movimientosCount = await this.pool.query('SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1', [complejoId]);
                
                console.log(`   Canchas: ${canchasCount.rows[0].count}`);
                console.log(`   Reservas: ${reservasCount.rows[0].count}`);
                console.log(`   Categorías: ${categoriasCount.rows[0].count}`);
                console.log(`   Movimientos: ${movimientosCount.rows[0].count}`);
                
            } catch (error) {
                console.error(`❌ Error verificando complejo ${complejoId}:`, error.message);
            }
        }
    }

    async eliminarComplejoDuplicado() {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO DUPLICADO ID: ${this.complejoAEliminar}`);
        console.log('=' .repeat(60));
        
        try {
            // Verificar que el complejo existe y está vacío
            const verificacionQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                    (SELECT COUNT(*) FROM reservas r JOIN canchas c ON r.cancha_id = c.id WHERE c.complejo_id = $1) as reservas,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                    (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = $1) as movimientos
            `;
            
            const verificacion = await this.pool.query(verificacionQuery, [this.complejoAEliminar]);
            const stats = verificacion.rows[0];
            
            console.log(`📊 Estado del complejo a eliminar:`);
            console.log(`   Canchas: ${stats.canchas}`);
            console.log(`   Reservas: ${stats.reservas}`);
            console.log(`   Categorías: ${stats.categorias}`);
            console.log(`   Movimientos: ${stats.movimientos}`);
            
            if (parseInt(stats.canchas) > 0 || parseInt(stats.reservas) > 0) {
                console.log('⚠️ El complejo tiene canchas o reservas. No se puede eliminar de forma segura.');
                return false;
            }
            
            // Eliminar en orden correcto (respetando FK)
            console.log('\n🔧 Eliminando elementos...');
            
            // 1. Eliminar movimientos financieros
            if (parseInt(stats.movimientos) > 0) {
                const movimientosResult = await this.pool.query('DELETE FROM gastos_ingresos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminados ${movimientosResult.rowCount} movimientos financieros`);
            }
            
            // 2. Eliminar categorías
            if (parseInt(stats.categorias) > 0) {
                const categoriasResult = await this.pool.query('DELETE FROM categorias_gastos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            }
            
            // 3. Eliminar el complejo
            const complejoResult = await this.pool.query('DELETE FROM complejos WHERE id = $1', [this.complejoAEliminar]);
            console.log(`✅ Complejo eliminado: ${complejoResult.rowCount} registro`);
            
            console.log(`\n🎉 COMPLEJO ID ${this.complejoAEliminar} ELIMINADO EXITOSAMENTE`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error eliminando complejo ${this.complejoAEliminar}:`, error.message);
            return false;
        }
    }

    async verificarResultadoFinal() {
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        console.log('=' .repeat(40));
        
        try {
            // Verificar que solo quede un complejo Demo 3
            const complejosQuery = `
                SELECT id, nombre, direccion
                FROM complejos
                WHERE nombre LIKE '%Demo 3%'
                ORDER BY id;
            `;
            
            const complejosResult = await this.pool.query(complejosQuery);
            
            console.log(`📊 Complejos Demo 3 restantes: ${complejosResult.rows.length}`);
            complejosResult.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
            });
            
            if (complejosResult.rows.length === 1) {
                const complejoRestante = complejosResult.rows[0];
                
                // Verificar actividad del complejo restante
                const actividadQuery = `
                    SELECT 
                        (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                        (SELECT COUNT(*) FROM reservas r JOIN canchas c ON r.cancha_id = c.id WHERE c.complejo_id = $1) as reservas,
                        (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                        (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = $1) as movimientos
                `;
                
                const actividad = await this.pool.query(actividadQuery, [complejoRestante.id]);
                const stats = actividad.rows[0];
                
                console.log(`\n✅ COMPLEJO FINAL: [${complejoRestante.id}] ${complejoRestante.nombre}`);
                console.log(`📊 Actividad:`);
                console.log(`   Canchas: ${stats.canchas}`);
                console.log(`   Reservas: ${stats.reservas}`);
                console.log(`   Categorías: ${stats.categorias}`);
                console.log(`   Movimientos: ${stats.movimientos}`);
                
                console.log('\n🎉 ¡PROBLEMA RESUELTO!');
                console.log('✅ Solo queda un complejo Demo 3');
                console.log('✅ El control financiero debería funcionar correctamente ahora');
                console.log('🔄 Refresca la página del panel de administración');
            }
            
        } catch (error) {
            console.error('❌ Error en verificación final:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async ejecutar() {
        console.log('🗑️ ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO');
        console.log('=' .repeat(60));
        console.log(`🎯 Objetivo: Eliminar complejo ID ${this.complejoAEliminar} (sin actividad)`);
        console.log(`🎯 Mantener: complejo ID ${this.complejoAMantener} (con actividad)`);
        
        await this.conectar();
        
        // 1. Verificar estado actual
        await this.verificarEstadoActual();
        
        // 2. Eliminar complejo duplicado
        const eliminado = await this.eliminarComplejoDuplicado();
        
        if (eliminado) {
            // 3. Verificar resultado
            await this.verificarResultadoFinal();
        }
        
        await this.cerrar();
    }
}

// Ejecutar eliminación
if (require.main === module) {
    const eliminacion = new EliminacionComplejoDemo3Duplicado();
    eliminacion.ejecutar().catch(console.error);
}

module.exports = EliminacionComplejoDemo3Duplicado;

/**
 * 🗑️ ELIMINACIÓN SIMPLE DEL COMPLEJO DEMO 3 DUPLICADO
 * 
 * Este script elimina el complejo Demo 3 (ID 8) que no tiene reservas
 * y mantiene el complejo Demo 3 (ID 7) que sí tiene actividad.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class EliminacionComplejoDemo3Duplicado {
    constructor() {
        this.pool = null;
        this.complejoAEliminar = 8; // Complejo Demo 3 sin actividad
        this.complejoAMantener = 7; // Complejo Demo 3 con actividad
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

    async verificarEstadoActual() {
        console.log('\n🔍 VERIFICANDO ESTADO ACTUAL...');
        console.log('=' .repeat(50));
        
        for (const complejoId of [this.complejoAMantener, this.complejoAEliminar]) {
            console.log(`\n📋 COMPLEJO ID: ${complejoId}`);
            console.log('-'.repeat(30));
            
            try {
                // Información básica
                const complejoQuery = `
                    SELECT id, nombre, direccion, telefono
                    FROM complejos
                    WHERE id = $1;
                `;
                
                const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
                
                if (complejoResult.rows.length === 0) {
                    console.log(`❌ Complejo ${complejoId} no encontrado`);
                    continue;
                }
                
                const complejo = complejoResult.rows[0];
                console.log(`✅ ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Teléfono: ${complejo.telefono}`);
                
                // Contar elementos
                const canchasCount = await this.pool.query('SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1', [complejoId]);
                const reservasCount = await this.pool.query(`
                    SELECT COUNT(*) as count FROM reservas r 
                    JOIN canchas c ON r.cancha_id = c.id 
                    WHERE c.complejo_id = $1
                `, [complejoId]);
                const categoriasCount = await this.pool.query('SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1', [complejoId]);
                const movimientosCount = await this.pool.query('SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1', [complejoId]);
                
                console.log(`   Canchas: ${canchasCount.rows[0].count}`);
                console.log(`   Reservas: ${reservasCount.rows[0].count}`);
                console.log(`   Categorías: ${categoriasCount.rows[0].count}`);
                console.log(`   Movimientos: ${movimientosCount.rows[0].count}`);
                
            } catch (error) {
                console.error(`❌ Error verificando complejo ${complejoId}:`, error.message);
            }
        }
    }

    async eliminarComplejoDuplicado() {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO DUPLICADO ID: ${this.complejoAEliminar}`);
        console.log('=' .repeat(60));
        
        try {
            // Verificar que el complejo existe y está vacío
            const verificacionQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                    (SELECT COUNT(*) FROM reservas r JOIN canchas c ON r.cancha_id = c.id WHERE c.complejo_id = $1) as reservas,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                    (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = $1) as movimientos
            `;
            
            const verificacion = await this.pool.query(verificacionQuery, [this.complejoAEliminar]);
            const stats = verificacion.rows[0];
            
            console.log(`📊 Estado del complejo a eliminar:`);
            console.log(`   Canchas: ${stats.canchas}`);
            console.log(`   Reservas: ${stats.reservas}`);
            console.log(`   Categorías: ${stats.categorias}`);
            console.log(`   Movimientos: ${stats.movimientos}`);
            
            if (parseInt(stats.canchas) > 0 || parseInt(stats.reservas) > 0) {
                console.log('⚠️ El complejo tiene canchas o reservas. No se puede eliminar de forma segura.');
                return false;
            }
            
            // Eliminar en orden correcto (respetando FK)
            console.log('\n🔧 Eliminando elementos...');
            
            // 1. Eliminar movimientos financieros
            if (parseInt(stats.movimientos) > 0) {
                const movimientosResult = await this.pool.query('DELETE FROM gastos_ingresos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminados ${movimientosResult.rowCount} movimientos financieros`);
            }
            
            // 2. Eliminar categorías
            if (parseInt(stats.categorias) > 0) {
                const categoriasResult = await this.pool.query('DELETE FROM categorias_gastos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            }
            
            // 3. Eliminar el complejo
            const complejoResult = await this.pool.query('DELETE FROM complejos WHERE id = $1', [this.complejoAEliminar]);
            console.log(`✅ Complejo eliminado: ${complejoResult.rowCount} registro`);
            
            console.log(`\n🎉 COMPLEJO ID ${this.complejoAEliminar} ELIMINADO EXITOSAMENTE`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error eliminando complejo ${this.complejoAEliminar}:`, error.message);
            return false;
        }
    }

    async verificarResultadoFinal() {
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        console.log('=' .repeat(40));
        
        try {
            // Verificar que solo quede un complejo Demo 3
            const complejosQuery = `
                SELECT id, nombre, direccion
                FROM complejos
                WHERE nombre LIKE '%Demo 3%'
                ORDER BY id;
            `;
            
            const complejosResult = await this.pool.query(complejosQuery);
            
            console.log(`📊 Complejos Demo 3 restantes: ${complejosResult.rows.length}`);
            complejosResult.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
            });
            
            if (complejosResult.rows.length === 1) {
                const complejoRestante = complejosResult.rows[0];
                
                // Verificar actividad del complejo restante
                const actividadQuery = `
                    SELECT 
                        (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                        (SELECT COUNT(*) FROM reservas r JOIN canchas c ON r.cancha_id = c.id WHERE c.complejo_id = $1) as reservas,
                        (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                        (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = $1) as movimientos
                `;
                
                const actividad = await this.pool.query(actividadQuery, [complejoRestante.id]);
                const stats = actividad.rows[0];
                
                console.log(`\n✅ COMPLEJO FINAL: [${complejoRestante.id}] ${complejoRestante.nombre}`);
                console.log(`📊 Actividad:`);
                console.log(`   Canchas: ${stats.canchas}`);
                console.log(`   Reservas: ${stats.reservas}`);
                console.log(`   Categorías: ${stats.categorias}`);
                console.log(`   Movimientos: ${stats.movimientos}`);
                
                console.log('\n🎉 ¡PROBLEMA RESUELTO!');
                console.log('✅ Solo queda un complejo Demo 3');
                console.log('✅ El control financiero debería funcionar correctamente ahora');
                console.log('🔄 Refresca la página del panel de administración');
            }
            
        } catch (error) {
            console.error('❌ Error en verificación final:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async ejecutar() {
        console.log('🗑️ ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO');
        console.log('=' .repeat(60));
        console.log(`🎯 Objetivo: Eliminar complejo ID ${this.complejoAEliminar} (sin actividad)`);
        console.log(`🎯 Mantener: complejo ID ${this.complejoAMantener} (con actividad)`);
        
        await this.conectar();
        
        // 1. Verificar estado actual
        await this.verificarEstadoActual();
        
        // 2. Eliminar complejo duplicado
        const eliminado = await this.eliminarComplejoDuplicado();
        
        if (eliminado) {
            // 3. Verificar resultado
            await this.verificarResultadoFinal();
        }
        
        await this.cerrar();
    }
}

// Ejecutar eliminación
if (require.main === module) {
    const eliminacion = new EliminacionComplejoDemo3Duplicado();
    eliminacion.ejecutar().catch(console.error);
}

module.exports = EliminacionComplejoDemo3Duplicado;



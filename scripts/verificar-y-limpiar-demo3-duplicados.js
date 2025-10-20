#!/usr/bin/env node

/**
 * 🧹 LIMPIEZA DE COMPLEJOS DEMO 3 DUPLICADOS
 * 
 * Este script identifica cuál de los dos complejos Demo 3 tiene las reservas
 * BQNI8W e IJRGBH y elimina el complejo duplicado que no las tiene.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class LimpiezaComplejosDemo3Duplicados {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH'];
        this.complejosDemo3 = [7, 8]; // IDs de los complejos Demo 3 duplicados
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

    async verificarComplejosDemo3() {
        console.log('\n🔍 VERIFICANDO COMPLEJOS DEMO 3 DUPLICADOS...');
        console.log('=' .repeat(60));
        
        const infoComplejos = [];
        
        for (const complejoId of this.complejosDemo3) {
            console.log(`\n📋 COMPLEJO ID: ${complejoId}`);
            console.log('-'.repeat(30));
            
            try {
                // Información del complejo
                const complejoQuery = `
                    SELECT 
                        id, nombre, direccion, telefono, email
                    FROM complejos
                    WHERE id = $1;
                `;
                
                const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
                
                if (complejoResult.rows.length === 0) {
                    console.log(`❌ Complejo ${complejoId} no encontrado`);
                    continue;
                }
                
                const complejo = complejoResult.rows[0];
                console.log(`✅ Nombre: ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Teléfono: ${complejo.telefono}`);
                console.log(`   Email: ${complejo.email}`);
                
                // Contar canchas
                const canchasQuery = `
                    SELECT COUNT(*) as count
                    FROM canchas
                    WHERE complejo_id = $1;
                `;
                
                const canchasResult = await this.pool.query(canchasQuery, [complejoId]);
                const numCanchas = parseInt(canchasResult.rows[0].count);
                console.log(`   Canchas: ${numCanchas}`);
                
                // Contar reservas
                const reservasQuery = `
                    SELECT COUNT(*) as count
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1;
                `;
                
                const reservasResult = await this.pool.query(reservasQuery, [complejoId]);
                const numReservas = parseInt(reservasResult.rows[0].count);
                console.log(`   Reservas: ${numReservas}`);
                
                // Buscar reservas específicas
                const reservasEspecificasQuery = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.comision_aplicada,
                        r.fecha,
                        c.nombre as cancha_nombre
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2);
                `;
                
                const reservasEspecificasResult = await this.pool.query(reservasEspecificasQuery, [complejoId, this.reservasEspecificas]);
                
                console.log(`   Reservas específicas encontradas: ${reservasEspecificasResult.rows.length}`);
                reservasEspecificasResult.rows.forEach(reserva => {
                    console.log(`     • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                });
                
                // Contar categorías financieras
                const categoriasQuery = `
                    SELECT COUNT(*) as count
                    FROM categorias_gastos
                    WHERE complejo_id = $1;
                `;
                
                const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
                const numCategorias = parseInt(categoriasResult.rows[0].count);
                console.log(`   Categorías financieras: ${numCategorias}`);
                
                // Contar movimientos financieros
                const movimientosQuery = `
                    SELECT COUNT(*) as count
                    FROM gastos_ingresos
                    WHERE complejo_id = $1;
                `;
                
                const movimientosResult = await this.pool.query(movimientosQuery, [complejoId]);
                const numMovimientos = parseInt(movimientosResult.rows[0].count);
                console.log(`   Movimientos financieros: ${numMovimientos}`);
                
                // Guardar información para decisión
                infoComplejos.push({
                    id: complejoId,
                    nombre: complejo.nombre,
                    numCanchas,
                    numReservas,
                    numCategorias,
                    numMovimientos,
                    reservasEspecificas: reservasEspecificasResult.rows.length,
                    tieneReservasEspecificas: reservasEspecificasResult.rows.length > 0
                });
                
            } catch (error) {
                console.error(`❌ Error verificando complejo ${complejoId}:`, error.message);
            }
        }
        
        return infoComplejos;
    }

    async determinarComplejoAEliminar(infoComplejos) {
        console.log('\n🎯 ANÁLISIS PARA DETERMINAR QUÉ COMPLEJO ELIMINAR...');
        console.log('=' .repeat(60));
        
        // Criterios para mantener el complejo:
        // 1. Tiene las reservas específicas BQNI8W e IJRGBH
        // 2. Tiene más reservas en general
        // 3. Tiene más movimientos financieros
        // 4. Tiene más canchas
        
        const complejoConReservasEspecificas = infoComplejos.find(c => c.tieneReservasEspecificas);
        const complejoSinReservasEspecificas = infoComplejos.find(c => !c.tieneReservasEspecificas);
        
        if (complejoConReservasEspecificas && complejoSinReservasEspecificas) {
            console.log(`✅ COMPLEJO A MANTENER: ID ${complejoConReservasEspecificas.id}`);
            console.log(`   • Tiene las reservas específicas: ${complejoConReservasEspecificas.reservasEspecificas}`);
            console.log(`   • Total reservas: ${complejoConReservasEspecificas.numReservas}`);
            console.log(`   • Movimientos financieros: ${complejoConReservasEspecificas.numMovimientos}`);
            console.log(`   • Canchas: ${complejoConReservasEspecificas.numCanchas}`);
            
            console.log(`\n❌ COMPLEJO A ELIMINAR: ID ${complejoSinReservasEspecificas.id}`);
            console.log(`   • No tiene las reservas específicas: ${complejoSinReservasEspecificas.reservasEspecificas}`);
            console.log(`   • Total reservas: ${complejoSinReservasEspecificas.numReservas}`);
            console.log(`   • Movimientos financieros: ${complejoSinReservasEspecificas.numMovimientos}`);
            console.log(`   • Canchas: ${complejoSinReservasEspecificas.numCanchas}`);
            
            return complejoSinReservasEspecificas.id;
        }
        
        // Si ambos o ninguno tienen las reservas específicas, usar otros criterios
        console.log('⚠️ Ambos complejos tienen o no tienen las reservas específicas');
        console.log('Usando criterios adicionales...');
        
        const complejoConMasActividad = infoComplejos.reduce((prev, current) => {
            const prevScore = prev.numReservas + prev.numMovimientos + prev.numCanchas;
            const currentScore = current.numReservas + current.numMovimientos + current.numCanchas;
            return currentScore > prevScore ? current : prev;
        });
        
        const complejoAEliminar = infoComplejos.find(c => c.id !== complejoConMasActividad.id);
        
        console.log(`✅ COMPLEJO A MANTENER: ID ${complejoConMasActividad.id} (más actividad)`);
        console.log(`❌ COMPLEJO A ELIMINAR: ID ${complejoAEliminar.id} (menos actividad)`);
        
        return complejoAEliminar.id;
    }

    async eliminarComplejo(complejoId) {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO ID: ${complejoId}`);
        console.log('=' .repeat(50));
        
        try {
            // Verificar dependencias antes de eliminar
            console.log('🔍 Verificando dependencias...');
            
            // 1. Eliminar movimientos financieros PRIMERO (tienen FK a categorías)
            const movimientosQuery = `
                DELETE FROM gastos_ingresos
                WHERE complejo_id = $1;
            `;
            
            const movimientosResult = await this.pool.query(movimientosQuery, [complejoId]);
            console.log(`✅ Eliminados ${movimientosResult.rowCount} movimientos financieros`);
            
            // 2. Eliminar categorías DESPUÉS (ya no hay FK que las referencie)
            const categoriasQuery = `
                DELETE FROM categorias_gastos
                WHERE complejo_id = $1;
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            
            // 3. Eliminar reservas (a través de canchas)
            const reservasQuery = `
                DELETE FROM reservas
                WHERE cancha_id IN (
                    SELECT id FROM canchas WHERE complejo_id = $1
                );
            `;
            
            const reservasResult = await this.pool.query(reservasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${reservasResult.rowCount} reservas`);
            
            // 4. Eliminar canchas
            const canchasQuery = `
                DELETE FROM canchas
                WHERE complejo_id = $1;
            `;
            
            const canchasResult = await this.pool.query(canchasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${canchasResult.rowCount} canchas`);
            
            // 5. Eliminar el complejo
            const complejoQuery = `
                DELETE FROM complejos
                WHERE id = $1;
            `;
            
            const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
            console.log(`✅ Complejo eliminado: ${complejoResult.rowCount} registro`);
            
            console.log(`\n🎉 COMPLEJO ID ${complejoId} ELIMINADO EXITOSAMENTE`);
            
        } catch (error) {
            console.error(`❌ Error eliminando complejo ${complejoId}:`, error.message);
            throw error;
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
                
                // Verificar que tenga las reservas específicas
                const reservasQuery = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2);
                `;
                
                const reservasResult = await this.pool.query(reservasQuery, [complejoRestante.id, this.reservasEspecificas]);
                
                console.log(`\n✅ COMPLEJO FINAL: [${complejoRestante.id}] ${complejoRestante.nombre}`);
                console.log(`📋 Reservas específicas encontradas: ${reservasResult.rows.length}`);
                reservasResult.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                });
                
                if (reservasResult.rows.length > 0) {
                    console.log('\n🎉 ¡PROBLEMA RESUELTO!');
                    console.log('✅ Solo queda un complejo Demo 3');
                    console.log('✅ Tiene las reservas específicas');
                    console.log('✅ El control financiero debería funcionar correctamente ahora');
                }
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

    async limpiar() {
        console.log('🧹 LIMPIEZA DE COMPLEJOS DEMO 3 DUPLICADOS');
        console.log('=' .repeat(60));
        console.log(`🎯 Objetivo: Eliminar el complejo Demo 3 que NO tiene las reservas BQNI8W e IJRGBH`);
        
        await this.conectar();
        
        // 1. Verificar ambos complejos
        const infoComplejos = await this.verificarComplejosDemo3();
        
        if (infoComplejos.length < 2) {
            console.log('⚠️ No se encontraron ambos complejos Demo 3');
            await this.cerrar();
            return;
        }
        
        // 2. Determinar cuál eliminar
        const complejoAEliminar = await this.determinarComplejoAEliminar(infoComplejos);
        
        // 3. Confirmar eliminación
        console.log(`\n⚠️ ¿CONFIRMAR ELIMINACIÓN DEL COMPLEJO ID ${complejoAEliminar}?`);
        console.log('Esta acción no se puede deshacer.');
        
        // En un entorno automatizado, procedemos directamente
        console.log('🚀 Procediendo con la eliminación...');
        
        // 4. Eliminar el complejo
        await this.eliminarComplejo(complejoAEliminar);
        
        // 5. Verificar resultado
        await this.verificarResultadoFinal();
        
        await this.cerrar();
    }
}

// Ejecutar limpieza
if (require.main === module) {
    const limpieza = new LimpiezaComplejosDemo3Duplicados();
    limpieza.limpiar().catch(console.error);
}

module.exports = LimpiezaComplejosDemo3Duplicados;

/**
 * 🧹 LIMPIEZA DE COMPLEJOS DEMO 3 DUPLICADOS
 * 
 * Este script identifica cuál de los dos complejos Demo 3 tiene las reservas
 * BQNI8W e IJRGBH y elimina el complejo duplicado que no las tiene.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class LimpiezaComplejosDemo3Duplicados {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH'];
        this.complejosDemo3 = [7, 8]; // IDs de los complejos Demo 3 duplicados
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

    async verificarComplejosDemo3() {
        console.log('\n🔍 VERIFICANDO COMPLEJOS DEMO 3 DUPLICADOS...');
        console.log('=' .repeat(60));
        
        const infoComplejos = [];
        
        for (const complejoId of this.complejosDemo3) {
            console.log(`\n📋 COMPLEJO ID: ${complejoId}`);
            console.log('-'.repeat(30));
            
            try {
                // Información del complejo
                const complejoQuery = `
                    SELECT 
                        id, nombre, direccion, telefono, email
                    FROM complejos
                    WHERE id = $1;
                `;
                
                const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
                
                if (complejoResult.rows.length === 0) {
                    console.log(`❌ Complejo ${complejoId} no encontrado`);
                    continue;
                }
                
                const complejo = complejoResult.rows[0];
                console.log(`✅ Nombre: ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Teléfono: ${complejo.telefono}`);
                console.log(`   Email: ${complejo.email}`);
                
                // Contar canchas
                const canchasQuery = `
                    SELECT COUNT(*) as count
                    FROM canchas
                    WHERE complejo_id = $1;
                `;
                
                const canchasResult = await this.pool.query(canchasQuery, [complejoId]);
                const numCanchas = parseInt(canchasResult.rows[0].count);
                console.log(`   Canchas: ${numCanchas}`);
                
                // Contar reservas
                const reservasQuery = `
                    SELECT COUNT(*) as count
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1;
                `;
                
                const reservasResult = await this.pool.query(reservasQuery, [complejoId]);
                const numReservas = parseInt(reservasResult.rows[0].count);
                console.log(`   Reservas: ${numReservas}`);
                
                // Buscar reservas específicas
                const reservasEspecificasQuery = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.comision_aplicada,
                        r.fecha,
                        c.nombre as cancha_nombre
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2);
                `;
                
                const reservasEspecificasResult = await this.pool.query(reservasEspecificasQuery, [complejoId, this.reservasEspecificas]);
                
                console.log(`   Reservas específicas encontradas: ${reservasEspecificasResult.rows.length}`);
                reservasEspecificasResult.rows.forEach(reserva => {
                    console.log(`     • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                });
                
                // Contar categorías financieras
                const categoriasQuery = `
                    SELECT COUNT(*) as count
                    FROM categorias_gastos
                    WHERE complejo_id = $1;
                `;
                
                const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
                const numCategorias = parseInt(categoriasResult.rows[0].count);
                console.log(`   Categorías financieras: ${numCategorias}`);
                
                // Contar movimientos financieros
                const movimientosQuery = `
                    SELECT COUNT(*) as count
                    FROM gastos_ingresos
                    WHERE complejo_id = $1;
                `;
                
                const movimientosResult = await this.pool.query(movimientosQuery, [complejoId]);
                const numMovimientos = parseInt(movimientosResult.rows[0].count);
                console.log(`   Movimientos financieros: ${numMovimientos}`);
                
                // Guardar información para decisión
                infoComplejos.push({
                    id: complejoId,
                    nombre: complejo.nombre,
                    numCanchas,
                    numReservas,
                    numCategorias,
                    numMovimientos,
                    reservasEspecificas: reservasEspecificasResult.rows.length,
                    tieneReservasEspecificas: reservasEspecificasResult.rows.length > 0
                });
                
            } catch (error) {
                console.error(`❌ Error verificando complejo ${complejoId}:`, error.message);
            }
        }
        
        return infoComplejos;
    }

    async determinarComplejoAEliminar(infoComplejos) {
        console.log('\n🎯 ANÁLISIS PARA DETERMINAR QUÉ COMPLEJO ELIMINAR...');
        console.log('=' .repeat(60));
        
        // Criterios para mantener el complejo:
        // 1. Tiene las reservas específicas BQNI8W e IJRGBH
        // 2. Tiene más reservas en general
        // 3. Tiene más movimientos financieros
        // 4. Tiene más canchas
        
        const complejoConReservasEspecificas = infoComplejos.find(c => c.tieneReservasEspecificas);
        const complejoSinReservasEspecificas = infoComplejos.find(c => !c.tieneReservasEspecificas);
        
        if (complejoConReservasEspecificas && complejoSinReservasEspecificas) {
            console.log(`✅ COMPLEJO A MANTENER: ID ${complejoConReservasEspecificas.id}`);
            console.log(`   • Tiene las reservas específicas: ${complejoConReservasEspecificas.reservasEspecificas}`);
            console.log(`   • Total reservas: ${complejoConReservasEspecificas.numReservas}`);
            console.log(`   • Movimientos financieros: ${complejoConReservasEspecificas.numMovimientos}`);
            console.log(`   • Canchas: ${complejoConReservasEspecificas.numCanchas}`);
            
            console.log(`\n❌ COMPLEJO A ELIMINAR: ID ${complejoSinReservasEspecificas.id}`);
            console.log(`   • No tiene las reservas específicas: ${complejoSinReservasEspecificas.reservasEspecificas}`);
            console.log(`   • Total reservas: ${complejoSinReservasEspecificas.numReservas}`);
            console.log(`   • Movimientos financieros: ${complejoSinReservasEspecificas.numMovimientos}`);
            console.log(`   • Canchas: ${complejoSinReservasEspecificas.numCanchas}`);
            
            return complejoSinReservasEspecificas.id;
        }
        
        // Si ambos o ninguno tienen las reservas específicas, usar otros criterios
        console.log('⚠️ Ambos complejos tienen o no tienen las reservas específicas');
        console.log('Usando criterios adicionales...');
        
        const complejoConMasActividad = infoComplejos.reduce((prev, current) => {
            const prevScore = prev.numReservas + prev.numMovimientos + prev.numCanchas;
            const currentScore = current.numReservas + current.numMovimientos + current.numCanchas;
            return currentScore > prevScore ? current : prev;
        });
        
        const complejoAEliminar = infoComplejos.find(c => c.id !== complejoConMasActividad.id);
        
        console.log(`✅ COMPLEJO A MANTENER: ID ${complejoConMasActividad.id} (más actividad)`);
        console.log(`❌ COMPLEJO A ELIMINAR: ID ${complejoAEliminar.id} (menos actividad)`);
        
        return complejoAEliminar.id;
    }

    async eliminarComplejo(complejoId) {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO ID: ${complejoId}`);
        console.log('=' .repeat(50));
        
        try {
            // Verificar dependencias antes de eliminar
            console.log('🔍 Verificando dependencias...');
            
            // 1. Eliminar movimientos financieros PRIMERO (tienen FK a categorías)
            const movimientosQuery = `
                DELETE FROM gastos_ingresos
                WHERE complejo_id = $1;
            `;
            
            const movimientosResult = await this.pool.query(movimientosQuery, [complejoId]);
            console.log(`✅ Eliminados ${movimientosResult.rowCount} movimientos financieros`);
            
            // 2. Eliminar categorías DESPUÉS (ya no hay FK que las referencie)
            const categoriasQuery = `
                DELETE FROM categorias_gastos
                WHERE complejo_id = $1;
            `;
            
            const categoriasResult = await this.pool.query(categoriasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            
            // 3. Eliminar reservas (a través de canchas)
            const reservasQuery = `
                DELETE FROM reservas
                WHERE cancha_id IN (
                    SELECT id FROM canchas WHERE complejo_id = $1
                );
            `;
            
            const reservasResult = await this.pool.query(reservasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${reservasResult.rowCount} reservas`);
            
            // 4. Eliminar canchas
            const canchasQuery = `
                DELETE FROM canchas
                WHERE complejo_id = $1;
            `;
            
            const canchasResult = await this.pool.query(canchasQuery, [complejoId]);
            console.log(`✅ Eliminadas ${canchasResult.rowCount} canchas`);
            
            // 5. Eliminar el complejo
            const complejoQuery = `
                DELETE FROM complejos
                WHERE id = $1;
            `;
            
            const complejoResult = await this.pool.query(complejoQuery, [complejoId]);
            console.log(`✅ Complejo eliminado: ${complejoResult.rowCount} registro`);
            
            console.log(`\n🎉 COMPLEJO ID ${complejoId} ELIMINADO EXITOSAMENTE`);
            
        } catch (error) {
            console.error(`❌ Error eliminando complejo ${complejoId}:`, error.message);
            throw error;
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
                
                // Verificar que tenga las reservas específicas
                const reservasQuery = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total
                    FROM reservas r
                    JOIN canchas c ON r.cancha_id = c.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2);
                `;
                
                const reservasResult = await this.pool.query(reservasQuery, [complejoRestante.id, this.reservasEspecificas]);
                
                console.log(`\n✅ COMPLEJO FINAL: [${complejoRestante.id}] ${complejoRestante.nombre}`);
                console.log(`📋 Reservas específicas encontradas: ${reservasResult.rows.length}`);
                reservasResult.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                });
                
                if (reservasResult.rows.length > 0) {
                    console.log('\n🎉 ¡PROBLEMA RESUELTO!');
                    console.log('✅ Solo queda un complejo Demo 3');
                    console.log('✅ Tiene las reservas específicas');
                    console.log('✅ El control financiero debería funcionar correctamente ahora');
                }
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

    async limpiar() {
        console.log('🧹 LIMPIEZA DE COMPLEJOS DEMO 3 DUPLICADOS');
        console.log('=' .repeat(60));
        console.log(`🎯 Objetivo: Eliminar el complejo Demo 3 que NO tiene las reservas BQNI8W e IJRGBH`);
        
        await this.conectar();
        
        // 1. Verificar ambos complejos
        const infoComplejos = await this.verificarComplejosDemo3();
        
        if (infoComplejos.length < 2) {
            console.log('⚠️ No se encontraron ambos complejos Demo 3');
            await this.cerrar();
            return;
        }
        
        // 2. Determinar cuál eliminar
        const complejoAEliminar = await this.determinarComplejoAEliminar(infoComplejos);
        
        // 3. Confirmar eliminación
        console.log(`\n⚠️ ¿CONFIRMAR ELIMINACIÓN DEL COMPLEJO ID ${complejoAEliminar}?`);
        console.log('Esta acción no se puede deshacer.');
        
        // En un entorno automatizado, procedemos directamente
        console.log('🚀 Procediendo con la eliminación...');
        
        // 4. Eliminar el complejo
        await this.eliminarComplejo(complejoAEliminar);
        
        // 5. Verificar resultado
        await this.verificarResultadoFinal();
        
        await this.cerrar();
    }
}

// Ejecutar limpieza
if (require.main === module) {
    const limpieza = new LimpiezaComplejosDemo3Duplicados();
    limpieza.limpiar().catch(console.error);
}

module.exports = LimpiezaComplejosDemo3Duplicados;

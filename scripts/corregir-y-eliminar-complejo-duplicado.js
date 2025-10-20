#!/usr/bin/env node

/**
 * 🔧 CORRECCIÓN Y ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO
 * 
 * Este script:
 * 1. Corrige las inconsistencias de claves foráneas
 * 2. Elimina el complejo Demo 3 duplicado (ID 8)
 * 3. Mantiene el complejo Demo 3 con actividad (ID 7)
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorreccionYEliminacionComplejoDuplicado {
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

    async corregirInconsistenciasFK() {
        console.log('\n🔧 CORRIGIENDO INCONSISTENCIAS DE CLAVES FORÁNEAS...');
        console.log('=' .repeat(60));
        
        try {
            // Buscar movimientos que usan categorías del complejo 8
            const movimientosIncorrectosQuery = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    gi.categoria_id,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE cg.complejo_id = $1;
            `;
            
            const movimientosIncorrectos = await this.pool.query(movimientosIncorrectosQuery, [this.complejoAEliminar]);
            
            if (movimientosIncorrectos.rows.length === 0) {
                console.log('✅ No hay movimientos que corregir');
                return true;
            }
            
            console.log(`📊 Movimientos a corregir: ${movimientosIncorrectos.rows.length}`);
            
            for (const movimiento of movimientosIncorrectos.rows) {
                console.log(`\n🔧 Corrigiendo movimiento ID ${movimiento.id}:`);
                console.log(`   Complejo movimiento: ${movimiento.complejo_id}`);
                console.log(`   Categoría incorrecta: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                
                // Buscar categoría equivalente en el complejo correcto
                const categoriaCorrectaQuery = `
                    SELECT id, nombre
                    FROM categorias_gastos
                    WHERE complejo_id = $1 
                    AND nombre = $2
                    AND tipo = $3
                    LIMIT 1;
                `;
                
                const categoriaCorrecta = await this.pool.query(categoriaCorrectaQuery, [
                    movimiento.complejo_id, // Usar el complejo del movimiento
                    movimiento.categoria_nombre,
                    movimiento.categoria_tipo
                ]);
                
                if (categoriaCorrecta.rows.length > 0) {
                    const nuevaCategoriaId = categoriaCorrecta.rows[0].id;
                    console.log(`   Categoría correcta: [${nuevaCategoriaId}] ${categoriaCorrecta.rows[0].nombre}`);
                    
                    // Actualizar el movimiento
                    const updateQuery = `
                        UPDATE gastos_ingresos
                        SET categoria_id = $1
                        WHERE id = $2;
                    `;
                    
                    await this.pool.query(updateQuery, [nuevaCategoriaId, movimiento.id]);
                    console.log(`   ✅ Movimiento actualizado`);
                    
                } else {
                    console.log(`   ⚠️ No se encontró categoría equivalente en complejo ${movimiento.complejo_id}`);
                    console.log(`   🔧 Creando categoría faltante...`);
                    
                    // Crear la categoría faltante
                    const insertCategoriaQuery = `
                        INSERT INTO categorias_gastos (
                            complejo_id, nombre, tipo, descripcion, icono, color, es_predefinida
                        ) VALUES ($1, $2, $3, $4, $5, $6, true)
                        RETURNING id;
                    `;
                    
                    const icono = movimiento.categoria_tipo === 'ingreso' ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
                    const color = movimiento.categoria_tipo === 'ingreso' ? '#28a745' : '#dc3545';
                    
                    const nuevaCategoria = await this.pool.query(insertCategoriaQuery, [
                        movimiento.complejo_id,
                        movimiento.categoria_nombre,
                        movimiento.categoria_tipo,
                        `Categoría automática para ${movimiento.categoria_nombre}`,
                        icono,
                        color
                    ]);
                    
                    const nuevaCategoriaId = nuevaCategoria.rows[0].id;
                    console.log(`   ✅ Categoría creada: [${nuevaCategoriaId}] ${movimiento.categoria_nombre}`);
                    
                    // Actualizar el movimiento
                    await this.pool.query(updateQuery, [nuevaCategoriaId, movimiento.id]);
                    console.log(`   ✅ Movimiento actualizado`);
                }
            }
            
            console.log('\n✅ Todas las inconsistencias corregidas');
            return true;
            
        } catch (error) {
            console.error('❌ Error corrigiendo inconsistencias:', error.message);
            return false;
        }
    }

    async eliminarComplejoDuplicado() {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO DUPLICADO ID: ${this.complejoAEliminar}`);
        console.log('=' .repeat(60));
        
        try {
            // Verificar que ya no hay referencias
            const verificacionQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM gastos_ingresos gi 
                     JOIN categorias_gastos cg ON gi.categoria_id = cg.id 
                     WHERE cg.complejo_id = $1) as movimientos_con_categorias,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                    (SELECT COUNT(*) FROM reservas r 
                     JOIN canchas c ON r.cancha_id = c.id 
                     WHERE c.complejo_id = $1) as reservas
            `;
            
            const verificacion = await this.pool.query(verificacionQuery, [this.complejoAEliminar]);
            const stats = verificacion.rows[0];
            
            console.log(`📊 Estado del complejo a eliminar:`);
            console.log(`   Movimientos con categorías: ${stats.movimientos_con_categorias}`);
            console.log(`   Categorías: ${stats.categorias}`);
            console.log(`   Canchas: ${stats.canchas}`);
            console.log(`   Reservas: ${stats.reservas}`);
            
            if (parseInt(stats.movimientos_con_categorias) > 0) {
                console.log('❌ Aún hay movimientos que referencian categorías de este complejo');
                return false;
            }
            
            // Eliminar en orden correcto
            console.log('\n🔧 Eliminando elementos...');
            
            // 1. Eliminar categorías (ya no hay FK que las referencie)
            if (parseInt(stats.categorias) > 0) {
                const categoriasResult = await this.pool.query('DELETE FROM categorias_gastos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            }
            
            // 2. Eliminar el complejo
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
                
                // Verificar que no hay inconsistencias
                const inconsistenciasQuery = `
                    SELECT COUNT(*) as count
                    FROM gastos_ingresos gi
                    JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.complejo_id != cg.complejo_id;
                `;
                
                const inconsistencias = await this.pool.query(inconsistenciasQuery);
                const numInconsistencias = parseInt(inconsistencias.rows[0].count);
                
                console.log(`\n🔍 Verificación de consistencia:`);
                console.log(`   Inconsistencias restantes: ${numInconsistencias}`);
                
                if (numInconsistencias === 0) {
                    console.log('\n🎉 ¡PROBLEMA COMPLETAMENTE RESUELTO!');
                    console.log('✅ Solo queda un complejo Demo 3');
                    console.log('✅ No hay inconsistencias de claves foráneas');
                    console.log('✅ El control financiero debería funcionar correctamente ahora');
                    console.log('🔄 Refresca la página del panel de administración');
                } else {
                    console.log('\n⚠️ Aún hay inconsistencias que revisar');
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

    async ejecutar() {
        console.log('🔧 CORRECCIÓN Y ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO');
        console.log('=' .repeat(70));
        console.log(`🎯 Objetivo: Corregir FK y eliminar complejo ID ${this.complejoAEliminar}`);
        console.log(`🎯 Mantener: complejo ID ${this.complejoAMantener}`);
        
        await this.conectar();
        
        // 1. Corregir inconsistencias de FK
        const inconsistenciasCorregidas = await this.corregirInconsistenciasFK();
        
        if (inconsistenciasCorregidas) {
            // 2. Eliminar complejo duplicado
            const eliminado = await this.eliminarComplejoDuplicado();
            
            if (eliminado) {
                // 3. Verificar resultado
                await this.verificarResultadoFinal();
            }
        }
        
        await this.cerrar();
    }
}

// Ejecutar corrección y eliminación
if (require.main === module) {
    const correccion = new CorreccionYEliminacionComplejoDuplicado();
    correccion.ejecutar().catch(console.error);
}

module.exports = CorreccionYEliminacionComplejoDuplicado;

/**
 * 🔧 CORRECCIÓN Y ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO
 * 
 * Este script:
 * 1. Corrige las inconsistencias de claves foráneas
 * 2. Elimina el complejo Demo 3 duplicado (ID 8)
 * 3. Mantiene el complejo Demo 3 con actividad (ID 7)
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorreccionYEliminacionComplejoDuplicado {
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

    async corregirInconsistenciasFK() {
        console.log('\n🔧 CORRIGIENDO INCONSISTENCIAS DE CLAVES FORÁNEAS...');
        console.log('=' .repeat(60));
        
        try {
            // Buscar movimientos que usan categorías del complejo 8
            const movimientosIncorrectosQuery = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    gi.categoria_id,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE cg.complejo_id = $1;
            `;
            
            const movimientosIncorrectos = await this.pool.query(movimientosIncorrectosQuery, [this.complejoAEliminar]);
            
            if (movimientosIncorrectos.rows.length === 0) {
                console.log('✅ No hay movimientos que corregir');
                return true;
            }
            
            console.log(`📊 Movimientos a corregir: ${movimientosIncorrectos.rows.length}`);
            
            for (const movimiento of movimientosIncorrectos.rows) {
                console.log(`\n🔧 Corrigiendo movimiento ID ${movimiento.id}:`);
                console.log(`   Complejo movimiento: ${movimiento.complejo_id}`);
                console.log(`   Categoría incorrecta: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                
                // Buscar categoría equivalente en el complejo correcto
                const categoriaCorrectaQuery = `
                    SELECT id, nombre
                    FROM categorias_gastos
                    WHERE complejo_id = $1 
                    AND nombre = $2
                    AND tipo = $3
                    LIMIT 1;
                `;
                
                const categoriaCorrecta = await this.pool.query(categoriaCorrectaQuery, [
                    movimiento.complejo_id, // Usar el complejo del movimiento
                    movimiento.categoria_nombre,
                    movimiento.categoria_tipo
                ]);
                
                if (categoriaCorrecta.rows.length > 0) {
                    const nuevaCategoriaId = categoriaCorrecta.rows[0].id;
                    console.log(`   Categoría correcta: [${nuevaCategoriaId}] ${categoriaCorrecta.rows[0].nombre}`);
                    
                    // Actualizar el movimiento
                    const updateQuery = `
                        UPDATE gastos_ingresos
                        SET categoria_id = $1
                        WHERE id = $2;
                    `;
                    
                    await this.pool.query(updateQuery, [nuevaCategoriaId, movimiento.id]);
                    console.log(`   ✅ Movimiento actualizado`);
                    
                } else {
                    console.log(`   ⚠️ No se encontró categoría equivalente en complejo ${movimiento.complejo_id}`);
                    console.log(`   🔧 Creando categoría faltante...`);
                    
                    // Crear la categoría faltante
                    const insertCategoriaQuery = `
                        INSERT INTO categorias_gastos (
                            complejo_id, nombre, tipo, descripcion, icono, color, es_predefinida
                        ) VALUES ($1, $2, $3, $4, $5, $6, true)
                        RETURNING id;
                    `;
                    
                    const icono = movimiento.categoria_tipo === 'ingreso' ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
                    const color = movimiento.categoria_tipo === 'ingreso' ? '#28a745' : '#dc3545';
                    
                    const nuevaCategoria = await this.pool.query(insertCategoriaQuery, [
                        movimiento.complejo_id,
                        movimiento.categoria_nombre,
                        movimiento.categoria_tipo,
                        `Categoría automática para ${movimiento.categoria_nombre}`,
                        icono,
                        color
                    ]);
                    
                    const nuevaCategoriaId = nuevaCategoria.rows[0].id;
                    console.log(`   ✅ Categoría creada: [${nuevaCategoriaId}] ${movimiento.categoria_nombre}`);
                    
                    // Actualizar el movimiento
                    await this.pool.query(updateQuery, [nuevaCategoriaId, movimiento.id]);
                    console.log(`   ✅ Movimiento actualizado`);
                }
            }
            
            console.log('\n✅ Todas las inconsistencias corregidas');
            return true;
            
        } catch (error) {
            console.error('❌ Error corrigiendo inconsistencias:', error.message);
            return false;
        }
    }

    async eliminarComplejoDuplicado() {
        console.log(`\n🗑️ ELIMINANDO COMPLEJO DUPLICADO ID: ${this.complejoAEliminar}`);
        console.log('=' .repeat(60));
        
        try {
            // Verificar que ya no hay referencias
            const verificacionQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM gastos_ingresos gi 
                     JOIN categorias_gastos cg ON gi.categoria_id = cg.id 
                     WHERE cg.complejo_id = $1) as movimientos_con_categorias,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = $1) as categorias,
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = $1) as canchas,
                    (SELECT COUNT(*) FROM reservas r 
                     JOIN canchas c ON r.cancha_id = c.id 
                     WHERE c.complejo_id = $1) as reservas
            `;
            
            const verificacion = await this.pool.query(verificacionQuery, [this.complejoAEliminar]);
            const stats = verificacion.rows[0];
            
            console.log(`📊 Estado del complejo a eliminar:`);
            console.log(`   Movimientos con categorías: ${stats.movimientos_con_categorias}`);
            console.log(`   Categorías: ${stats.categorias}`);
            console.log(`   Canchas: ${stats.canchas}`);
            console.log(`   Reservas: ${stats.reservas}`);
            
            if (parseInt(stats.movimientos_con_categorias) > 0) {
                console.log('❌ Aún hay movimientos que referencian categorías de este complejo');
                return false;
            }
            
            // Eliminar en orden correcto
            console.log('\n🔧 Eliminando elementos...');
            
            // 1. Eliminar categorías (ya no hay FK que las referencie)
            if (parseInt(stats.categorias) > 0) {
                const categoriasResult = await this.pool.query('DELETE FROM categorias_gastos WHERE complejo_id = $1', [this.complejoAEliminar]);
                console.log(`✅ Eliminadas ${categoriasResult.rowCount} categorías`);
            }
            
            // 2. Eliminar el complejo
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
                
                // Verificar que no hay inconsistencias
                const inconsistenciasQuery = `
                    SELECT COUNT(*) as count
                    FROM gastos_ingresos gi
                    JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.complejo_id != cg.complejo_id;
                `;
                
                const inconsistencias = await this.pool.query(inconsistenciasQuery);
                const numInconsistencias = parseInt(inconsistencias.rows[0].count);
                
                console.log(`\n🔍 Verificación de consistencia:`);
                console.log(`   Inconsistencias restantes: ${numInconsistencias}`);
                
                if (numInconsistencias === 0) {
                    console.log('\n🎉 ¡PROBLEMA COMPLETAMENTE RESUELTO!');
                    console.log('✅ Solo queda un complejo Demo 3');
                    console.log('✅ No hay inconsistencias de claves foráneas');
                    console.log('✅ El control financiero debería funcionar correctamente ahora');
                    console.log('🔄 Refresca la página del panel de administración');
                } else {
                    console.log('\n⚠️ Aún hay inconsistencias que revisar');
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

    async ejecutar() {
        console.log('🔧 CORRECCIÓN Y ELIMINACIÓN DEL COMPLEJO DEMO 3 DUPLICADO');
        console.log('=' .repeat(70));
        console.log(`🎯 Objetivo: Corregir FK y eliminar complejo ID ${this.complejoAEliminar}`);
        console.log(`🎯 Mantener: complejo ID ${this.complejoAMantener}`);
        
        await this.conectar();
        
        // 1. Corregir inconsistencias de FK
        const inconsistenciasCorregidas = await this.corregirInconsistenciasFK();
        
        if (inconsistenciasCorregidas) {
            // 2. Eliminar complejo duplicado
            const eliminado = await this.eliminarComplejoDuplicado();
            
            if (eliminado) {
                // 3. Verificar resultado
                await this.verificarResultadoFinal();
            }
        }
        
        await this.cerrar();
    }
}

// Ejecutar corrección y eliminación
if (require.main === module) {
    const correccion = new CorreccionYEliminacionComplejoDuplicado();
    correccion.ejecutar().catch(console.error);
}

module.exports = CorreccionYEliminacionComplejoDuplicado;



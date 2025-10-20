#!/usr/bin/env node

/**
 * 🔍 INVESTIGACIÓN DE PROBLEMA DE CLAVES FORÁNEAS
 * 
 * Este script investiga por qué no se puede eliminar el complejo 8
 * debido a violaciones de claves foráneas.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionFKProblema {
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
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async investigarProblemaFK() {
        console.log('\n🔍 INVESTIGANDO PROBLEMA DE CLAVES FORÁNEAS...');
        console.log('=' .repeat(60));
        
        try {
            // 1. Verificar categorías del complejo 8
            console.log('\n📋 CATEGORÍAS DEL COMPLEJO 8:');
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = 8
                ORDER BY tipo, nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            console.log(`Total: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // 2. Verificar movimientos que referencian estas categorías
            if (categorias.rows.length > 0) {
                console.log('\n💰 MOVIMIENTOS QUE REFERENCIAN ESTAS CATEGORÍAS:');
                
                for (const categoria of categorias.rows) {
                    const movimientosQuery = `
                        SELECT 
                            gi.id,
                            gi.tipo,
                            gi.monto,
                            gi.descripcion,
                            gi.complejo_id,
                            cg.complejo_id as categoria_complejo_id
                        FROM gastos_ingresos gi
                        JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                        WHERE gi.categoria_id = $1;
                    `;
                    
                    const movimientos = await this.pool.query(movimientosQuery, [categoria.id]);
                    
                    if (movimientos.rows.length > 0) {
                        console.log(`\n   📊 Categoría [${categoria.id}] ${categoria.nombre}:`);
                        movimientos.rows.forEach(mov => {
                            console.log(`      • Movimiento ID ${mov.id}: $${mov.monto} (${mov.tipo})`);
                            console.log(`        Complejo movimiento: ${mov.complejo_id}`);
                            console.log(`        Complejo categoría: ${mov.categoria_complejo_id}`);
                            console.log(`        Descripción: ${mov.descripcion}`);
                        });
                    }
                }
            }
            
            // 3. Verificar inconsistencias
            console.log('\n⚠️ VERIFICANDO INCONSISTENCIAS...');
            const inconsistenciasQuery = `
                SELECT 
                    gi.id as movimiento_id,
                    gi.complejo_id as movimiento_complejo,
                    cg.complejo_id as categoria_complejo,
                    cg.nombre as categoria_nombre,
                    gi.descripcion
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id != cg.complejo_id;
            `;
            
            const inconsistencias = await this.pool.query(inconsistenciasQuery);
            
            if (inconsistencias.rows.length > 0) {
                console.log(`❌ INCONSISTENCIAS ENCONTRADAS: ${inconsistencias.rows.length}`);
                inconsistencias.rows.forEach(inc => {
                    console.log(`   • Movimiento ID ${inc.movimiento_id}:`);
                    console.log(`     Complejo movimiento: ${inc.movimiento_complejo}`);
                    console.log(`     Complejo categoría: ${inc.categoria_complejo}`);
                    console.log(`     Categoría: ${inc.categoria_nombre}`);
                    console.log(`     Descripción: ${inc.descripcion}`);
                });
            } else {
                console.log('✅ No se encontraron inconsistencias');
            }
            
        } catch (error) {
            console.error('❌ Error investigando FK:', error.message);
        }
    }

    async corregirInconsistencias() {
        console.log('\n🔧 CORRIGIENDO INCONSISTENCIAS...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar movimientos del complejo 7 que usan categorías del complejo 8
            const movimientosIncorrectosQuery = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    cg.complejo_id as categoria_complejo_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7 AND cg.complejo_id = 8;
            `;
            
            const movimientosIncorrectos = await this.pool.query(movimientosIncorrectosQuery);
            
            if (movimientosIncorrectos.rows.length === 0) {
                console.log('✅ No hay movimientos incorrectos que corregir');
                return;
            }
            
            console.log(`📊 Movimientos a corregir: ${movimientosIncorrectos.rows.length}`);
            
            // Para cada movimiento incorrecto, buscar la categoría correcta en el complejo 7
            for (const movimiento of movimientosIncorrectos.rows) {
                console.log(`\n🔧 Corrigiendo movimiento ID ${movimiento.id}:`);
                console.log(`   Categoría incorrecta: [${movimiento.categoria_complejo_id}] ${movimiento.categoria_nombre}`);
                
                // Buscar categoría equivalente en el complejo 7
                const categoriaCorrectaQuery = `
                    SELECT id, nombre
                    FROM categorias_gastos
                    WHERE complejo_id = 7 
                    AND nombre = $1
                    AND tipo = (
                        SELECT tipo FROM categorias_gastos WHERE id = $2
                    )
                    LIMIT 1;
                `;
                
                const categoriaCorrecta = await this.pool.query(categoriaCorrectaQuery, [
                    movimiento.categoria_nombre,
                    movimiento.id
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
                    console.log(`   ⚠️ No se encontró categoría equivalente en complejo 7`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo inconsistencias:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE PROBLEMA DE CLAVES FORÁNEAS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.investigarProblemaFK();
        await this.corregirInconsistencias();
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionFKProblema();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionFKProblema;

/**
 * 🔍 INVESTIGACIÓN DE PROBLEMA DE CLAVES FORÁNEAS
 * 
 * Este script investiga por qué no se puede eliminar el complejo 8
 * debido a violaciones de claves foráneas.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionFKProblema {
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
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async investigarProblemaFK() {
        console.log('\n🔍 INVESTIGANDO PROBLEMA DE CLAVES FORÁNEAS...');
        console.log('=' .repeat(60));
        
        try {
            // 1. Verificar categorías del complejo 8
            console.log('\n📋 CATEGORÍAS DEL COMPLEJO 8:');
            const categoriasQuery = `
                SELECT 
                    id, nombre, tipo, descripcion
                FROM categorias_gastos
                WHERE complejo_id = 8
                ORDER BY tipo, nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            console.log(`Total: ${categorias.rows.length} categorías`);
            categorias.rows.forEach(cat => {
                console.log(`   • [${cat.id}] ${cat.nombre} (${cat.tipo})`);
            });
            
            // 2. Verificar movimientos que referencian estas categorías
            if (categorias.rows.length > 0) {
                console.log('\n💰 MOVIMIENTOS QUE REFERENCIAN ESTAS CATEGORÍAS:');
                
                for (const categoria of categorias.rows) {
                    const movimientosQuery = `
                        SELECT 
                            gi.id,
                            gi.tipo,
                            gi.monto,
                            gi.descripcion,
                            gi.complejo_id,
                            cg.complejo_id as categoria_complejo_id
                        FROM gastos_ingresos gi
                        JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                        WHERE gi.categoria_id = $1;
                    `;
                    
                    const movimientos = await this.pool.query(movimientosQuery, [categoria.id]);
                    
                    if (movimientos.rows.length > 0) {
                        console.log(`\n   📊 Categoría [${categoria.id}] ${categoria.nombre}:`);
                        movimientos.rows.forEach(mov => {
                            console.log(`      • Movimiento ID ${mov.id}: $${mov.monto} (${mov.tipo})`);
                            console.log(`        Complejo movimiento: ${mov.complejo_id}`);
                            console.log(`        Complejo categoría: ${mov.categoria_complejo_id}`);
                            console.log(`        Descripción: ${mov.descripcion}`);
                        });
                    }
                }
            }
            
            // 3. Verificar inconsistencias
            console.log('\n⚠️ VERIFICANDO INCONSISTENCIAS...');
            const inconsistenciasQuery = `
                SELECT 
                    gi.id as movimiento_id,
                    gi.complejo_id as movimiento_complejo,
                    cg.complejo_id as categoria_complejo,
                    cg.nombre as categoria_nombre,
                    gi.descripcion
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id != cg.complejo_id;
            `;
            
            const inconsistencias = await this.pool.query(inconsistenciasQuery);
            
            if (inconsistencias.rows.length > 0) {
                console.log(`❌ INCONSISTENCIAS ENCONTRADAS: ${inconsistencias.rows.length}`);
                inconsistencias.rows.forEach(inc => {
                    console.log(`   • Movimiento ID ${inc.movimiento_id}:`);
                    console.log(`     Complejo movimiento: ${inc.movimiento_complejo}`);
                    console.log(`     Complejo categoría: ${inc.categoria_complejo}`);
                    console.log(`     Categoría: ${inc.categoria_nombre}`);
                    console.log(`     Descripción: ${inc.descripcion}`);
                });
            } else {
                console.log('✅ No se encontraron inconsistencias');
            }
            
        } catch (error) {
            console.error('❌ Error investigando FK:', error.message);
        }
    }

    async corregirInconsistencias() {
        console.log('\n🔧 CORRIGIENDO INCONSISTENCIAS...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar movimientos del complejo 7 que usan categorías del complejo 8
            const movimientosIncorrectosQuery = `
                SELECT 
                    gi.id,
                    gi.complejo_id,
                    cg.complejo_id as categoria_complejo_id,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = 7 AND cg.complejo_id = 8;
            `;
            
            const movimientosIncorrectos = await this.pool.query(movimientosIncorrectosQuery);
            
            if (movimientosIncorrectos.rows.length === 0) {
                console.log('✅ No hay movimientos incorrectos que corregir');
                return;
            }
            
            console.log(`📊 Movimientos a corregir: ${movimientosIncorrectos.rows.length}`);
            
            // Para cada movimiento incorrecto, buscar la categoría correcta en el complejo 7
            for (const movimiento of movimientosIncorrectos.rows) {
                console.log(`\n🔧 Corrigiendo movimiento ID ${movimiento.id}:`);
                console.log(`   Categoría incorrecta: [${movimiento.categoria_complejo_id}] ${movimiento.categoria_nombre}`);
                
                // Buscar categoría equivalente en el complejo 7
                const categoriaCorrectaQuery = `
                    SELECT id, nombre
                    FROM categorias_gastos
                    WHERE complejo_id = 7 
                    AND nombre = $1
                    AND tipo = (
                        SELECT tipo FROM categorias_gastos WHERE id = $2
                    )
                    LIMIT 1;
                `;
                
                const categoriaCorrecta = await this.pool.query(categoriaCorrectaQuery, [
                    movimiento.categoria_nombre,
                    movimiento.id
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
                    console.log(`   ⚠️ No se encontró categoría equivalente en complejo 7`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo inconsistencias:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE PROBLEMA DE CLAVES FORÁNEAS');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.investigarProblemaFK();
        await this.corregirInconsistencias();
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionFKProblema();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionFKProblema;



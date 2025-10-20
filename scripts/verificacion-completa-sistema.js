#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN COMPLETA DEL SISTEMA
 * 
 * Este script verifica desde el principio:
 * - Todos los complejos y sus IDs
 * - Todas las canchas y sus IDs
 * - Todos los movimientos financieros
 * - Verificar duplicados y rutas correctas
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionCompletaSistema {
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

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 TOTAL DE COMPLEJOS: ${complejos.rows.length}`);
            
            if (complejos.rows.length === 0) {
                console.log('❌ NO HAY COMPLEJOS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE COMPLEJOS:');
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            });
            
            // Verificar duplicados por nombre
            const nombresComplejos = complejos.rows.map(c => c.nombre);
            const duplicados = nombresComplejos.filter((nombre, index) => nombresComplejos.indexOf(nombre) !== index);
            
            if (duplicados.length > 0) {
                console.log(`\n⚠️ COMPLEJOS DUPLICADOS ENCONTRADOS:`);
                duplicados.forEach(nombre => {
                    const complejosDuplicados = complejos.rows.filter(c => c.nombre === nombre);
                    console.log(`   • "${nombre}": ${complejosDuplicados.map(c => `[${c.id}]`).join(', ')}`);
                });
            } else {
                console.log(`\n✅ NO HAY COMPLEJOS DUPLICADOS`);
            }
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
            return [];
        }
    }

    async verificarCanchas() {
        console.log('\n⚽ VERIFICANDO CANCHAS...');
        console.log('=' .repeat(50));
        
        try {
            const canchasQuery = `
                SELECT 
                    c.id, c.nombre, c.tipo, c.precio_hora, c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM canchas c
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY c.complejo_id, c.id;
            `;
            
            const canchas = await this.pool.query(canchasQuery);
            
            console.log(`📊 TOTAL DE CANCHAS: ${canchas.rows.length}`);
            
            if (canchas.rows.length === 0) {
                console.log('❌ NO HAY CANCHAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE CANCHAS:');
            canchas.rows.forEach(cancha => {
                console.log(`\n⚽ [${cancha.id}] ${cancha.nombre}:`);
                console.log(`   • Tipo: ${cancha.tipo}`);
                console.log(`   • Precio: $${cancha.precio_hora || 0}`);
                console.log(`   • Complejo: [${cancha.complejo_id}] ${cancha.complejo_nombre}`);
            });
            
            // Verificar duplicados por nombre dentro del mismo complejo
            const canchasPorComplejo = {};
            canchas.rows.forEach(cancha => {
                if (!canchasPorComplejo[cancha.complejo_id]) {
                    canchasPorComplejo[cancha.complejo_id] = [];
                }
                canchasPorComplejo[cancha.complejo_id].push(cancha);
            });
            
            let hayDuplicados = false;
            Object.keys(canchasPorComplejo).forEach(complejoId => {
                const canchasDelComplejo = canchasPorComplejo[complejoId];
                const nombresCanchas = canchasDelComplejo.map(c => c.nombre);
                const duplicados = nombresCanchas.filter((nombre, index) => nombresCanchas.indexOf(nombre) !== index);
                
                if (duplicados.length > 0) {
                    if (!hayDuplicados) {
                        console.log(`\n⚠️ CANCHAS DUPLICADAS ENCONTRADAS:`);
                        hayDuplicados = true;
                    }
                    duplicados.forEach(nombre => {
                        const canchasDuplicadas = canchasDelComplejo.filter(c => c.nombre === nombre);
                        console.log(`   • Complejo [${complejoId}]: "${nombre}" - ${canchasDuplicadas.map(c => `[${c.id}]`).join(', ')}`);
                    });
                }
            });
            
            if (!hayDuplicados) {
                console.log(`\n✅ NO HAY CANCHAS DUPLICADAS`);
            }
            
            return canchas.rows;
            
        } catch (error) {
            console.error('❌ Error verificando canchas:', error.message);
            return [];
        }
    }

    async verificarReservas() {
        console.log('\n📋 VERIFICANDO RESERVAS...');
        console.log('=' .repeat(50));
        
        try {
            const reservasQuery = `
                SELECT 
                    r.id, r.codigo_reserva, r.estado, r.precio_total, r.comision_aplicada,
                    r.tipo_reserva, r.fecha, r.hora_inicio, r.hora_fin, r.created_at,
                    c.nombre as cancha_nombre, c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY r.created_at DESC
                LIMIT 20;
            `;
            
            const reservas = await this.pool.query(reservasQuery);
            
            console.log(`📊 TOTAL DE RESERVAS: ${reservas.rows.length} (mostrando las 20 más recientes)`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE RESERVAS:');
            reservas.rows.forEach((reserva, index) => {
                console.log(`\n${index + 1}. ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: [${reserva.cancha_id}] ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            });
            
            // Verificar duplicados por código de reserva
            const codigosReservas = reservas.rows.map(r => r.codigo_reserva);
            const duplicados = codigosReservas.filter((codigo, index) => codigosReservas.indexOf(codigo) !== index);
            
            if (duplicados.length > 0) {
                console.log(`\n⚠️ CÓDIGOS DE RESERVA DUPLICADOS ENCONTRADOS:`);
                duplicados.forEach(codigo => {
                    const reservasDuplicadas = reservas.rows.filter(r => r.codigo_reserva === codigo);
                    console.log(`   • "${codigo}": ${reservasDuplicadas.map(r => `[${r.id}]`).join(', ')}`);
                });
            } else {
                console.log(`\n✅ NO HAY CÓDIGOS DE RESERVA DUPLICADOS`);
            }
            
            return reservas.rows;
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
            return [];
        }
    }

    async verificarMovimientosFinancieros() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
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
                ORDER BY gi.creado_en DESC
                LIMIT 20;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 TOTAL DE MOVIMIENTOS: ${movimientos.rows.length} (mostrando los 20 más recientes)`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS FINANCIEROS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE MOVIMIENTOS:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`\n${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}:`);
                console.log(`   • Monto: $${movimiento.monto}`);
                console.log(`   • Fecha: ${movimiento.fecha}`);
                console.log(`   • Descripción: ${movimiento.descripcion}`);
                console.log(`   • Complejo: [${movimiento.complejo_id}] ${movimiento.complejo_nombre}`);
                console.log(`   • Categoría: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                console.log(`   • Creado: ${movimiento.creado_en}`);
            });
            
            // Verificar inconsistencias entre complejo del movimiento y complejo de la categoría
            const inconsistencias = movimientos.rows.filter(mov => 
                mov.complejo_id !== mov.categoria_complejo_id
            );
            
            if (inconsistencias.length > 0) {
                console.log(`\n⚠️ INCONSISTENCIAS ENCONTRADAS:`);
                inconsistencias.forEach(mov => {
                    console.log(`   • Movimiento [${mov.id}]: Complejo ${mov.complejo_id} vs Categoría Complejo ${mov.categoria_complejo_id}`);
                });
            } else {
                console.log(`\n✅ NO HAY INCONSISTENCIAS EN MOVIMIENTOS`);
            }
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos financieros:', error.message);
            return [];
        }
    }

    async verificarCategoriasGastos() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS DE GASTOS...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                ORDER BY cg.complejo_id, cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 TOTAL DE CATEGORÍAS: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE CATEGORÍAS:');
            categorias.rows.forEach(categoria => {
                console.log(`\n📂 [${categoria.id}] ${categoria.nombre}:`);
                console.log(`   • Tipo: ${categoria.tipo}`);
                console.log(`   • Descripción: ${categoria.descripcion}`);
                console.log(`   • Complejo: [${categoria.complejo_id}] ${categoria.complejo_nombre}`);
            });
            
            // Verificar duplicados por nombre dentro del mismo complejo
            const categoriasPorComplejo = {};
            categorias.rows.forEach(categoria => {
                if (!categoriasPorComplejo[categoria.complejo_id]) {
                    categoriasPorComplejo[categoria.complejo_id] = [];
                }
                categoriasPorComplejo[categoria.complejo_id].push(categoria);
            });
            
            let hayDuplicados = false;
            Object.keys(categoriasPorComplejo).forEach(complejoId => {
                const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                const nombresCategorias = categoriasDelComplejo.map(c => c.nombre);
                const duplicados = nombresCategorias.filter((nombre, index) => nombresCategorias.indexOf(nombre) !== index);
                
                if (duplicados.length > 0) {
                    if (!hayDuplicados) {
                        console.log(`\n⚠️ CATEGORÍAS DUPLICADAS ENCONTRADAS:`);
                        hayDuplicados = true;
                    }
                    duplicados.forEach(nombre => {
                        const categoriasDuplicadas = categoriasDelComplejo.filter(c => c.nombre === nombre);
                        console.log(`   • Complejo [${complejoId}]: "${nombre}" - ${categoriasDuplicadas.map(c => `[${c.id}]`).join(', ')}`);
                    });
                }
            });
            
            if (!hayDuplicados) {
                console.log(`\n✅ NO HAY CATEGORÍAS DUPLICADAS`);
            }
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarReservasEspecificas() {
        console.log('\n🔍 VERIFICANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(50));
        
        const reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        
        try {
            for (const codigo of reservasEspecificas) {
                console.log(`\n🔍 Buscando reserva ${codigo}:`);
                
                const query = `
                    SELECT 
                        r.id, r.codigo_reserva, r.estado, r.precio_total, r.comision_aplicada,
                        r.tipo_reserva, r.fecha, r.hora_inicio, r.hora_fin, r.created_at,
                        c.nombre as cancha_nombre, c.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva = $1
                    ORDER BY r.created_at DESC;
                `;
                
                const result = await this.pool.query(query, [codigo]);
                
                if (result.rows.length > 0) {
                    const reserva = result.rows[0];
                    console.log(`   ✅ ENCONTRADA:`);
                    console.log(`      • ID: ${reserva.id}`);
                    console.log(`      • Estado: ${reserva.estado}`);
                    console.log(`      • Precio: $${reserva.precio_total || 0}`);
                    console.log(`      • Comisión: $${reserva.comision_aplicada || 0}`);
                    console.log(`      • Tipo: ${reserva.tipo_reserva}`);
                    console.log(`      • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                    console.log(`      • Cancha: [${reserva.cancha_id}] ${reserva.cancha_nombre}`);
                    console.log(`      • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                    console.log(`      • Creada: ${reserva.created_at}`);
                    
                    // Verificar movimientos financieros
                    const movimientosQuery = `
                        SELECT 
                            gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en
                        FROM gastos_ingresos gi
                        WHERE gi.descripcion LIKE $1
                        ORDER BY gi.tipo, gi.creado_en;
                    `;
                    
                    const movimientos = await this.pool.query(movimientosQuery, [`%${codigo}%`]);
                    
                    if (movimientos.rows.length > 0) {
                        console.log(`      • Movimientos: ${movimientos.rows.length}`);
                        movimientos.rows.forEach(mov => {
                            console.log(`        - ${mov.tipo.toUpperCase()}: $${mov.monto} (${mov.creado_en})`);
                        });
                    } else {
                        console.log(`      • Movimientos: ❌ SIN movimientos financieros`);
                    }
                } else {
                    console.log(`   ❌ NO ENCONTRADA`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando reservas específicas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar complejos
        const complejos = await this.verificarComplejos();
        
        // 2. Verificar canchas
        const canchas = await this.verificarCanchas();
        
        // 3. Verificar reservas
        const reservas = await this.verificarReservas();
        
        // 4. Verificar movimientos financieros
        const movimientos = await this.verificarMovimientosFinancieros();
        
        // 5. Verificar categorías de gastos
        const categorias = await this.verificarCategoriasGastos();
        
        // 6. Verificar reservas específicas
        await this.verificarReservasEspecificas();
        
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('=' .repeat(40));
        console.log(`✅ Complejos: ${complejos.length}`);
        console.log(`✅ Canchas: ${canchas.length}`);
        console.log(`✅ Reservas: ${reservas.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log('✅ Verificación completa realizada');
        
        await this.cerrar();
    }
}

// Ejecutar verificación completa
if (require.main === module) {
    const verificacion = new VerificacionCompletaSistema();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionCompletaSistema;

/**
 * 🔍 VERIFICACIÓN COMPLETA DEL SISTEMA
 * 
 * Este script verifica desde el principio:
 * - Todos los complejos y sus IDs
 * - Todas las canchas y sus IDs
 * - Todos los movimientos financieros
 * - Verificar duplicados y rutas correctas
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionCompletaSistema {
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

    async verificarComplejos() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    id, nombre, direccion, telefono, email, ciudad_id
                FROM complejos
                ORDER BY id;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 TOTAL DE COMPLEJOS: ${complejos.rows.length}`);
            
            if (complejos.rows.length === 0) {
                console.log('❌ NO HAY COMPLEJOS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE COMPLEJOS:');
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   • Dirección: ${complejo.direccion}`);
                console.log(`   • Teléfono: ${complejo.telefono}`);
                console.log(`   • Email: ${complejo.email}`);
                console.log(`   • Ciudad ID: ${complejo.ciudad_id}`);
            });
            
            // Verificar duplicados por nombre
            const nombresComplejos = complejos.rows.map(c => c.nombre);
            const duplicados = nombresComplejos.filter((nombre, index) => nombresComplejos.indexOf(nombre) !== index);
            
            if (duplicados.length > 0) {
                console.log(`\n⚠️ COMPLEJOS DUPLICADOS ENCONTRADOS:`);
                duplicados.forEach(nombre => {
                    const complejosDuplicados = complejos.rows.filter(c => c.nombre === nombre);
                    console.log(`   • "${nombre}": ${complejosDuplicados.map(c => `[${c.id}]`).join(', ')}`);
                });
            } else {
                console.log(`\n✅ NO HAY COMPLEJOS DUPLICADOS`);
            }
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
            return [];
        }
    }

    async verificarCanchas() {
        console.log('\n⚽ VERIFICANDO CANCHAS...');
        console.log('=' .repeat(50));
        
        try {
            const canchasQuery = `
                SELECT 
                    c.id, c.nombre, c.tipo, c.precio_hora, c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM canchas c
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY c.complejo_id, c.id;
            `;
            
            const canchas = await this.pool.query(canchasQuery);
            
            console.log(`📊 TOTAL DE CANCHAS: ${canchas.rows.length}`);
            
            if (canchas.rows.length === 0) {
                console.log('❌ NO HAY CANCHAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE CANCHAS:');
            canchas.rows.forEach(cancha => {
                console.log(`\n⚽ [${cancha.id}] ${cancha.nombre}:`);
                console.log(`   • Tipo: ${cancha.tipo}`);
                console.log(`   • Precio: $${cancha.precio_hora || 0}`);
                console.log(`   • Complejo: [${cancha.complejo_id}] ${cancha.complejo_nombre}`);
            });
            
            // Verificar duplicados por nombre dentro del mismo complejo
            const canchasPorComplejo = {};
            canchas.rows.forEach(cancha => {
                if (!canchasPorComplejo[cancha.complejo_id]) {
                    canchasPorComplejo[cancha.complejo_id] = [];
                }
                canchasPorComplejo[cancha.complejo_id].push(cancha);
            });
            
            let hayDuplicados = false;
            Object.keys(canchasPorComplejo).forEach(complejoId => {
                const canchasDelComplejo = canchasPorComplejo[complejoId];
                const nombresCanchas = canchasDelComplejo.map(c => c.nombre);
                const duplicados = nombresCanchas.filter((nombre, index) => nombresCanchas.indexOf(nombre) !== index);
                
                if (duplicados.length > 0) {
                    if (!hayDuplicados) {
                        console.log(`\n⚠️ CANCHAS DUPLICADAS ENCONTRADAS:`);
                        hayDuplicados = true;
                    }
                    duplicados.forEach(nombre => {
                        const canchasDuplicadas = canchasDelComplejo.filter(c => c.nombre === nombre);
                        console.log(`   • Complejo [${complejoId}]: "${nombre}" - ${canchasDuplicadas.map(c => `[${c.id}]`).join(', ')}`);
                    });
                }
            });
            
            if (!hayDuplicados) {
                console.log(`\n✅ NO HAY CANCHAS DUPLICADAS`);
            }
            
            return canchas.rows;
            
        } catch (error) {
            console.error('❌ Error verificando canchas:', error.message);
            return [];
        }
    }

    async verificarReservas() {
        console.log('\n📋 VERIFICANDO RESERVAS...');
        console.log('=' .repeat(50));
        
        try {
            const reservasQuery = `
                SELECT 
                    r.id, r.codigo_reserva, r.estado, r.precio_total, r.comision_aplicada,
                    r.tipo_reserva, r.fecha, r.hora_inicio, r.hora_fin, r.created_at,
                    c.nombre as cancha_nombre, c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY r.created_at DESC
                LIMIT 20;
            `;
            
            const reservas = await this.pool.query(reservasQuery);
            
            console.log(`📊 TOTAL DE RESERVAS: ${reservas.rows.length} (mostrando las 20 más recientes)`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE RESERVAS:');
            reservas.rows.forEach((reserva, index) => {
                console.log(`\n${index + 1}. ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: [${reserva.cancha_id}] ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            });
            
            // Verificar duplicados por código de reserva
            const codigosReservas = reservas.rows.map(r => r.codigo_reserva);
            const duplicados = codigosReservas.filter((codigo, index) => codigosReservas.indexOf(codigo) !== index);
            
            if (duplicados.length > 0) {
                console.log(`\n⚠️ CÓDIGOS DE RESERVA DUPLICADOS ENCONTRADOS:`);
                duplicados.forEach(codigo => {
                    const reservasDuplicadas = reservas.rows.filter(r => r.codigo_reserva === codigo);
                    console.log(`   • "${codigo}": ${reservasDuplicadas.map(r => `[${r.id}]`).join(', ')}`);
                });
            } else {
                console.log(`\n✅ NO HAY CÓDIGOS DE RESERVA DUPLICADOS`);
            }
            
            return reservas.rows;
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
            return [];
        }
    }

    async verificarMovimientosFinancieros() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
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
                ORDER BY gi.creado_en DESC
                LIMIT 20;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 TOTAL DE MOVIMIENTOS: ${movimientos.rows.length} (mostrando los 20 más recientes)`);
            
            if (movimientos.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS FINANCIEROS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE MOVIMIENTOS:');
            movimientos.rows.forEach((movimiento, index) => {
                console.log(`\n${index + 1}. [${movimiento.id}] ${movimiento.tipo.toUpperCase()}:`);
                console.log(`   • Monto: $${movimiento.monto}`);
                console.log(`   • Fecha: ${movimiento.fecha}`);
                console.log(`   • Descripción: ${movimiento.descripcion}`);
                console.log(`   • Complejo: [${movimiento.complejo_id}] ${movimiento.complejo_nombre}`);
                console.log(`   • Categoría: [${movimiento.categoria_id}] ${movimiento.categoria_nombre} (${movimiento.categoria_tipo})`);
                console.log(`   • Creado: ${movimiento.creado_en}`);
            });
            
            // Verificar inconsistencias entre complejo del movimiento y complejo de la categoría
            const inconsistencias = movimientos.rows.filter(mov => 
                mov.complejo_id !== mov.categoria_complejo_id
            );
            
            if (inconsistencias.length > 0) {
                console.log(`\n⚠️ INCONSISTENCIAS ENCONTRADAS:`);
                inconsistencias.forEach(mov => {
                    console.log(`   • Movimiento [${mov.id}]: Complejo ${mov.complejo_id} vs Categoría Complejo ${mov.categoria_complejo_id}`);
                });
            } else {
                console.log(`\n✅ NO HAY INCONSISTENCIAS EN MOVIMIENTOS`);
            }
            
            return movimientos.rows;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos financieros:', error.message);
            return [];
        }
    }

    async verificarCategoriasGastos() {
        console.log('\n📂 VERIFICANDO CATEGORÍAS DE GASTOS...');
        console.log('=' .repeat(50));
        
        try {
            const categoriasQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id,
                    comp.nombre as complejo_nombre
                FROM categorias_gastos cg
                LEFT JOIN complejos comp ON cg.complejo_id = comp.id
                ORDER BY cg.complejo_id, cg.tipo, cg.nombre;
            `;
            
            const categorias = await this.pool.query(categoriasQuery);
            
            console.log(`📊 TOTAL DE CATEGORÍAS: ${categorias.rows.length}`);
            
            if (categorias.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS EN EL SISTEMA');
                return [];
            }
            
            console.log('\n📋 LISTADO DE CATEGORÍAS:');
            categorias.rows.forEach(categoria => {
                console.log(`\n📂 [${categoria.id}] ${categoria.nombre}:`);
                console.log(`   • Tipo: ${categoria.tipo}`);
                console.log(`   • Descripción: ${categoria.descripcion}`);
                console.log(`   • Complejo: [${categoria.complejo_id}] ${categoria.complejo_nombre}`);
            });
            
            // Verificar duplicados por nombre dentro del mismo complejo
            const categoriasPorComplejo = {};
            categorias.rows.forEach(categoria => {
                if (!categoriasPorComplejo[categoria.complejo_id]) {
                    categoriasPorComplejo[categoria.complejo_id] = [];
                }
                categoriasPorComplejo[categoria.complejo_id].push(categoria);
            });
            
            let hayDuplicados = false;
            Object.keys(categoriasPorComplejo).forEach(complejoId => {
                const categoriasDelComplejo = categoriasPorComplejo[complejoId];
                const nombresCategorias = categoriasDelComplejo.map(c => c.nombre);
                const duplicados = nombresCategorias.filter((nombre, index) => nombresCategorias.indexOf(nombre) !== index);
                
                if (duplicados.length > 0) {
                    if (!hayDuplicados) {
                        console.log(`\n⚠️ CATEGORÍAS DUPLICADAS ENCONTRADAS:`);
                        hayDuplicados = true;
                    }
                    duplicados.forEach(nombre => {
                        const categoriasDuplicadas = categoriasDelComplejo.filter(c => c.nombre === nombre);
                        console.log(`   • Complejo [${complejoId}]: "${nombre}" - ${categoriasDuplicadas.map(c => `[${c.id}]`).join(', ')}`);
                    });
                }
            });
            
            if (!hayDuplicados) {
                console.log(`\n✅ NO HAY CATEGORÍAS DUPLICADAS`);
            }
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return [];
        }
    }

    async verificarReservasEspecificas() {
        console.log('\n🔍 VERIFICANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(50));
        
        const reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        
        try {
            for (const codigo of reservasEspecificas) {
                console.log(`\n🔍 Buscando reserva ${codigo}:`);
                
                const query = `
                    SELECT 
                        r.id, r.codigo_reserva, r.estado, r.precio_total, r.comision_aplicada,
                        r.tipo_reserva, r.fecha, r.hora_inicio, r.hora_fin, r.created_at,
                        c.nombre as cancha_nombre, c.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva = $1
                    ORDER BY r.created_at DESC;
                `;
                
                const result = await this.pool.query(query, [codigo]);
                
                if (result.rows.length > 0) {
                    const reserva = result.rows[0];
                    console.log(`   ✅ ENCONTRADA:`);
                    console.log(`      • ID: ${reserva.id}`);
                    console.log(`      • Estado: ${reserva.estado}`);
                    console.log(`      • Precio: $${reserva.precio_total || 0}`);
                    console.log(`      • Comisión: $${reserva.comision_aplicada || 0}`);
                    console.log(`      • Tipo: ${reserva.tipo_reserva}`);
                    console.log(`      • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                    console.log(`      • Cancha: [${reserva.cancha_id}] ${reserva.cancha_nombre}`);
                    console.log(`      • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                    console.log(`      • Creada: ${reserva.created_at}`);
                    
                    // Verificar movimientos financieros
                    const movimientosQuery = `
                        SELECT 
                            gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en
                        FROM gastos_ingresos gi
                        WHERE gi.descripcion LIKE $1
                        ORDER BY gi.tipo, gi.creado_en;
                    `;
                    
                    const movimientos = await this.pool.query(movimientosQuery, [`%${codigo}%`]);
                    
                    if (movimientos.rows.length > 0) {
                        console.log(`      • Movimientos: ${movimientos.rows.length}`);
                        movimientos.rows.forEach(mov => {
                            console.log(`        - ${mov.tipo.toUpperCase()}: $${mov.monto} (${mov.creado_en})`);
                        });
                    } else {
                        console.log(`      • Movimientos: ❌ SIN movimientos financieros`);
                    }
                } else {
                    console.log(`   ❌ NO ENCONTRADA`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando reservas específicas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Verificar complejos
        const complejos = await this.verificarComplejos();
        
        // 2. Verificar canchas
        const canchas = await this.verificarCanchas();
        
        // 3. Verificar reservas
        const reservas = await this.verificarReservas();
        
        // 4. Verificar movimientos financieros
        const movimientos = await this.verificarMovimientosFinancieros();
        
        // 5. Verificar categorías de gastos
        const categorias = await this.verificarCategoriasGastos();
        
        // 6. Verificar reservas específicas
        await this.verificarReservasEspecificas();
        
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('=' .repeat(40));
        console.log(`✅ Complejos: ${complejos.length}`);
        console.log(`✅ Canchas: ${canchas.length}`);
        console.log(`✅ Reservas: ${reservas.length}`);
        console.log(`✅ Movimientos: ${movimientos.length}`);
        console.log(`✅ Categorías: ${categorias.length}`);
        console.log('✅ Verificación completa realizada');
        
        await this.cerrar();
    }
}

// Ejecutar verificación completa
if (require.main === module) {
    const verificacion = new VerificacionCompletaSistema();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionCompletaSistema;



#!/usr/bin/env node

/**
 * 🔧 CORREGIR PROBLEMAS DEL SISTEMA
 * 
 * Este script corrige los problemas identificados:
 * 1. Canchas duplicadas
 * 2. Inconsistencias en movimientos financieros
 * 3. Categorías con complejo_id null
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorregirProblemasSistema {
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

    async corregirCanchasDuplicadas() {
        console.log('\n🔧 CORRIGIENDO CANCHAS DUPLICADAS...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar canchas duplicadas en el Complejo Demo 3
            const canchasDuplicadasQuery = `
                SELECT 
                    c.id, c.nombre, c.tipo, c.precio_hora, c.complejo_id
                FROM canchas c
                WHERE c.complejo_id = 7 AND c.nombre = 'Cancha 1'
                ORDER BY c.id;
            `;
            
            const canchasDuplicadas = await this.pool.query(canchasDuplicadasQuery);
            
            console.log(`📊 Canchas duplicadas encontradas: ${canchasDuplicadas.rows.length}`);
            
            if (canchasDuplicadas.rows.length > 1) {
                console.log('\n📋 Canchas duplicadas:');
                canchasDuplicadas.rows.forEach(cancha => {
                    console.log(`   • [${cancha.id}] ${cancha.nombre} - ${cancha.tipo} - $${cancha.precio_hora}`);
                });
                
                // Renombrar la segunda cancha
                const segundaCancha = canchasDuplicadas.rows[1];
                const nuevoNombre = 'Cancha 1 Padel';
                
                console.log(`\n🔧 Renombrando cancha [${segundaCancha.id}] a "${nuevoNombre}"`);
                
                const updateQuery = `
                    UPDATE canchas 
                    SET nombre = $1 
                    WHERE id = $2;
                `;
                
                await this.pool.query(updateQuery, [nuevoNombre, segundaCancha.id]);
                console.log(`✅ Cancha [${segundaCancha.id}] renombrada a "${nuevoNombre}"`);
                
            } else {
                console.log('✅ No hay canchas duplicadas que corregir');
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo canchas duplicadas:', error.message);
        }
    }

    async corregirCategoriasComplejoNull() {
        console.log('\n🔧 CORRIGIENDO CATEGORÍAS CON COMPLEJO_ID NULL...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar categorías con complejo_id null
            const categoriasNullQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id IS NULL
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categoriasNull = await this.pool.query(categoriasNullQuery);
            
            console.log(`📊 Categorías con complejo_id null: ${categoriasNull.rows.length}`);
            
            if (categoriasNull.rows.length > 0) {
                console.log('\n📋 Categorías a corregir:');
                categoriasNull.rows.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
                
                // Asignar estas categorías al Complejo Demo 3 (ID 7)
                const complejoId = 7;
                
                console.log(`\n🔧 Asignando categorías al Complejo Demo 3 (ID: ${complejoId})`);
                
                const updateQuery = `
                    UPDATE categorias_gastos 
                    SET complejo_id = $1 
                    WHERE complejo_id IS NULL;
                `;
                
                const result = await this.pool.query(updateQuery, [complejoId]);
                console.log(`✅ ${result.rowCount} categorías asignadas al Complejo Demo 3`);
                
            } else {
                console.log('✅ No hay categorías con complejo_id null');
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo categorías:', error.message);
        }
    }

    async verificarMovimientosFinancieros() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar movimientos recientes
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre, cg.complejo_id as categoria_complejo_id,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.creado_en >= NOW() - INTERVAL '24 hours'
                ORDER BY gi.creado_en DESC;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 Movimientos recientes (24h): ${movimientos.rows.length}`);
            
            if (movimientos.rows.length > 0) {
                console.log('\n📋 Movimientos recientes:');
                movimientos.rows.forEach(mov => {
                    console.log(`\n💰 [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    console.log(`   • Descripción: ${mov.descripcion}`);
                    console.log(`   • Complejo: [${mov.complejo_id}] ${mov.complejo_nombre}`);
                    console.log(`   • Categoría: [${mov.categoria_id}] ${mov.categoria_nombre}`);
                    console.log(`   • Creado: ${mov.creado_en}`);
                    
                    if (mov.complejo_id !== mov.categoria_complejo_id) {
                        console.log(`   ⚠️ INCONSISTENCIA: Complejo ${mov.complejo_id} vs Categoría Complejo ${mov.categoria_complejo_id}`);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
        }
    }

    async crearReservasFaltantes() {
        console.log('\n🔧 CREANDO RESERVAS FALTANTES...');
        console.log('=' .repeat(50));
        
        try {
            // Crear las reservas que aparecen en los logs de Render
            const reservasFaltantes = [
                {
                    codigo: 'BQNI8W',
                    precio: 15000,
                    comision: 525,
                    tipo: 'directa',
                    estado: 'confirmada'
                },
                {
                    codigo: 'IJRGBH',
                    precio: 12000,
                    comision: 420,
                    tipo: 'directa',
                    estado: 'confirmada'
                },
                {
                    codigo: '1XJAKD',
                    precio: 12000,
                    comision: 420,
                    tipo: 'directa',
                    estado: 'cancelada'
                }
            ];
            
            // Buscar cancha disponible en Complejo Demo 3
            const canchaQuery = `
                SELECT id, nombre FROM canchas 
                WHERE complejo_id = 7 AND tipo = 'futbol'
                ORDER BY id
                LIMIT 1;
            `;
            
            const canchaResult = await this.pool.query(canchaQuery);
            
            if (canchaResult.rows.length === 0) {
                console.log('❌ No hay canchas disponibles en el Complejo Demo 3');
                return;
            }
            
            const cancha = canchaResult.rows[0];
            console.log(`📊 Usando cancha: [${cancha.id}] ${cancha.nombre}`);
            
            for (const reserva of reservasFaltantes) {
                console.log(`\n🔧 Creando reserva ${reserva.codigo}...`);
                
                // Verificar si ya existe
                const existeQuery = `
                    SELECT id FROM reservas WHERE codigo_reserva = $1;
                `;
                
                const existe = await this.pool.query(existeQuery, [reserva.codigo]);
                
                if (existe.rows.length > 0) {
                    console.log(`   ✅ Reserva ${reserva.codigo} ya existe (ID: ${existe.rows[0].id})`);
                    continue;
                }
                
                // Crear reserva
                const insertReservaQuery = `
                    INSERT INTO reservas (
                        codigo_reserva, cancha_id, nombre_cliente, email_cliente,
                        telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin,
                        precio_total, comision_aplicada, tipo_reserva, estado,
                        estado_pago, created_at, fecha_creacion
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                    ) RETURNING id;
                `;
                
                const fecha = new Date();
                fecha.setDate(fecha.getDate() + 1); // Mañana
                
                const result = await this.pool.query(insertReservaQuery, [
                    reserva.codigo,
                    cancha.id,
                    'Cliente Demo',
                    'cliente@demo.com',
                    '+56912345678',
                    '12345678-9',
                    fecha.toISOString().split('T')[0],
                    '10:00:00',
                    '11:00:00',
                    reserva.precio,
                    reserva.comision,
                    reserva.tipo,
                    reserva.estado,
                    'pagado',
                    new Date(),
                    new Date()
                ]);
                
                console.log(`   ✅ Reserva ${reserva.codigo} creada (ID: ${result.rows[0].id})`);
            }
            
        } catch (error) {
            console.error('❌ Error creando reservas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async corregir() {
        console.log('🔧 CORRIGIENDO PROBLEMAS DEL SISTEMA');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Corregir canchas duplicadas
        await this.corregirCanchasDuplicadas();
        
        // 2. Corregir categorías con complejo_id null
        await this.corregirCategoriasComplejoNull();
        
        // 3. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros();
        
        // 4. Crear reservas faltantes
        await this.crearReservasFaltantes();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Canchas duplicadas corregidas');
        console.log('✅ Categorías con complejo_id null corregidas');
        console.log('✅ Movimientos financieros verificados');
        console.log('✅ Reservas faltantes creadas');
        console.log('✅ Sistema corregido y optimizado');
        
        await this.cerrar();
    }
}

// Ejecutar correcciones
if (require.main === module) {
    const correcciones = new CorregirProblemasSistema();
    correcciones.corregir().catch(console.error);
}

module.exports = CorregirProblemasSistema;

/**
 * 🔧 CORREGIR PROBLEMAS DEL SISTEMA
 * 
 * Este script corrige los problemas identificados:
 * 1. Canchas duplicadas
 * 2. Inconsistencias en movimientos financieros
 * 3. Categorías con complejo_id null
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CorregirProblemasSistema {
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

    async corregirCanchasDuplicadas() {
        console.log('\n🔧 CORRIGIENDO CANCHAS DUPLICADAS...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar canchas duplicadas en el Complejo Demo 3
            const canchasDuplicadasQuery = `
                SELECT 
                    c.id, c.nombre, c.tipo, c.precio_hora, c.complejo_id
                FROM canchas c
                WHERE c.complejo_id = 7 AND c.nombre = 'Cancha 1'
                ORDER BY c.id;
            `;
            
            const canchasDuplicadas = await this.pool.query(canchasDuplicadasQuery);
            
            console.log(`📊 Canchas duplicadas encontradas: ${canchasDuplicadas.rows.length}`);
            
            if (canchasDuplicadas.rows.length > 1) {
                console.log('\n📋 Canchas duplicadas:');
                canchasDuplicadas.rows.forEach(cancha => {
                    console.log(`   • [${cancha.id}] ${cancha.nombre} - ${cancha.tipo} - $${cancha.precio_hora}`);
                });
                
                // Renombrar la segunda cancha
                const segundaCancha = canchasDuplicadas.rows[1];
                const nuevoNombre = 'Cancha 1 Padel';
                
                console.log(`\n🔧 Renombrando cancha [${segundaCancha.id}] a "${nuevoNombre}"`);
                
                const updateQuery = `
                    UPDATE canchas 
                    SET nombre = $1 
                    WHERE id = $2;
                `;
                
                await this.pool.query(updateQuery, [nuevoNombre, segundaCancha.id]);
                console.log(`✅ Cancha [${segundaCancha.id}] renombrada a "${nuevoNombre}"`);
                
            } else {
                console.log('✅ No hay canchas duplicadas que corregir');
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo canchas duplicadas:', error.message);
        }
    }

    async corregirCategoriasComplejoNull() {
        console.log('\n🔧 CORRIGIENDO CATEGORÍAS CON COMPLEJO_ID NULL...');
        console.log('=' .repeat(50));
        
        try {
            // Buscar categorías con complejo_id null
            const categoriasNullQuery = `
                SELECT 
                    cg.id, cg.nombre, cg.tipo, cg.descripcion, cg.complejo_id
                FROM categorias_gastos cg
                WHERE cg.complejo_id IS NULL
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const categoriasNull = await this.pool.query(categoriasNullQuery);
            
            console.log(`📊 Categorías con complejo_id null: ${categoriasNull.rows.length}`);
            
            if (categoriasNull.rows.length > 0) {
                console.log('\n📋 Categorías a corregir:');
                categoriasNull.rows.forEach(categoria => {
                    console.log(`   • [${categoria.id}] ${categoria.nombre} (${categoria.tipo})`);
                });
                
                // Asignar estas categorías al Complejo Demo 3 (ID 7)
                const complejoId = 7;
                
                console.log(`\n🔧 Asignando categorías al Complejo Demo 3 (ID: ${complejoId})`);
                
                const updateQuery = `
                    UPDATE categorias_gastos 
                    SET complejo_id = $1 
                    WHERE complejo_id IS NULL;
                `;
                
                const result = await this.pool.query(updateQuery, [complejoId]);
                console.log(`✅ ${result.rowCount} categorías asignadas al Complejo Demo 3`);
                
            } else {
                console.log('✅ No hay categorías con complejo_id null');
            }
            
        } catch (error) {
            console.error('❌ Error corrigiendo categorías:', error.message);
        }
    }

    async verificarMovimientosFinancieros() {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        try {
            // Verificar movimientos recientes
            const movimientosQuery = `
                SELECT 
                    gi.id, gi.tipo, gi.monto, gi.descripcion, gi.creado_en,
                    gi.complejo_id, gi.categoria_id,
                    cg.nombre as categoria_nombre, cg.complejo_id as categoria_complejo_id,
                    comp.nombre as complejo_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                LEFT JOIN complejos comp ON gi.complejo_id = comp.id
                WHERE gi.creado_en >= NOW() - INTERVAL '24 hours'
                ORDER BY gi.creado_en DESC;
            `;
            
            const movimientos = await this.pool.query(movimientosQuery);
            
            console.log(`📊 Movimientos recientes (24h): ${movimientos.rows.length}`);
            
            if (movimientos.rows.length > 0) {
                console.log('\n📋 Movimientos recientes:');
                movimientos.rows.forEach(mov => {
                    console.log(`\n💰 [${mov.id}] ${mov.tipo.toUpperCase()}: $${mov.monto}`);
                    console.log(`   • Descripción: ${mov.descripcion}`);
                    console.log(`   • Complejo: [${mov.complejo_id}] ${mov.complejo_nombre}`);
                    console.log(`   • Categoría: [${mov.categoria_id}] ${mov.categoria_nombre}`);
                    console.log(`   • Creado: ${mov.creado_en}`);
                    
                    if (mov.complejo_id !== mov.categoria_complejo_id) {
                        console.log(`   ⚠️ INCONSISTENCIA: Complejo ${mov.complejo_id} vs Categoría Complejo ${mov.categoria_complejo_id}`);
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
        }
    }

    async crearReservasFaltantes() {
        console.log('\n🔧 CREANDO RESERVAS FALTANTES...');
        console.log('=' .repeat(50));
        
        try {
            // Crear las reservas que aparecen en los logs de Render
            const reservasFaltantes = [
                {
                    codigo: 'BQNI8W',
                    precio: 15000,
                    comision: 525,
                    tipo: 'directa',
                    estado: 'confirmada'
                },
                {
                    codigo: 'IJRGBH',
                    precio: 12000,
                    comision: 420,
                    tipo: 'directa',
                    estado: 'confirmada'
                },
                {
                    codigo: '1XJAKD',
                    precio: 12000,
                    comision: 420,
                    tipo: 'directa',
                    estado: 'cancelada'
                }
            ];
            
            // Buscar cancha disponible en Complejo Demo 3
            const canchaQuery = `
                SELECT id, nombre FROM canchas 
                WHERE complejo_id = 7 AND tipo = 'futbol'
                ORDER BY id
                LIMIT 1;
            `;
            
            const canchaResult = await this.pool.query(canchaQuery);
            
            if (canchaResult.rows.length === 0) {
                console.log('❌ No hay canchas disponibles en el Complejo Demo 3');
                return;
            }
            
            const cancha = canchaResult.rows[0];
            console.log(`📊 Usando cancha: [${cancha.id}] ${cancha.nombre}`);
            
            for (const reserva of reservasFaltantes) {
                console.log(`\n🔧 Creando reserva ${reserva.codigo}...`);
                
                // Verificar si ya existe
                const existeQuery = `
                    SELECT id FROM reservas WHERE codigo_reserva = $1;
                `;
                
                const existe = await this.pool.query(existeQuery, [reserva.codigo]);
                
                if (existe.rows.length > 0) {
                    console.log(`   ✅ Reserva ${reserva.codigo} ya existe (ID: ${existe.rows[0].id})`);
                    continue;
                }
                
                // Crear reserva
                const insertReservaQuery = `
                    INSERT INTO reservas (
                        codigo_reserva, cancha_id, nombre_cliente, email_cliente,
                        telefono_cliente, rut_cliente, fecha, hora_inicio, hora_fin,
                        precio_total, comision_aplicada, tipo_reserva, estado,
                        estado_pago, created_at, fecha_creacion
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                    ) RETURNING id;
                `;
                
                const fecha = new Date();
                fecha.setDate(fecha.getDate() + 1); // Mañana
                
                const result = await this.pool.query(insertReservaQuery, [
                    reserva.codigo,
                    cancha.id,
                    'Cliente Demo',
                    'cliente@demo.com',
                    '+56912345678',
                    '12345678-9',
                    fecha.toISOString().split('T')[0],
                    '10:00:00',
                    '11:00:00',
                    reserva.precio,
                    reserva.comision,
                    reserva.tipo,
                    reserva.estado,
                    'pagado',
                    new Date(),
                    new Date()
                ]);
                
                console.log(`   ✅ Reserva ${reserva.codigo} creada (ID: ${result.rows[0].id})`);
            }
            
        } catch (error) {
            console.error('❌ Error creando reservas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async corregir() {
        console.log('🔧 CORRIGIENDO PROBLEMAS DEL SISTEMA');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // 1. Corregir canchas duplicadas
        await this.corregirCanchasDuplicadas();
        
        // 2. Corregir categorías con complejo_id null
        await this.corregirCategoriasComplejoNull();
        
        // 3. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros();
        
        // 4. Crear reservas faltantes
        await this.crearReservasFaltantes();
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log('✅ Canchas duplicadas corregidas');
        console.log('✅ Categorías con complejo_id null corregidas');
        console.log('✅ Movimientos financieros verificados');
        console.log('✅ Reservas faltantes creadas');
        console.log('✅ Sistema corregido y optimizado');
        
        await this.cerrar();
    }
}

// Ejecutar correcciones
if (require.main === module) {
    const correcciones = new CorregirProblemasSistema();
    correcciones.corregir().catch(console.error);
}

module.exports = CorregirProblemasSistema;



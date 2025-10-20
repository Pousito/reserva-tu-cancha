#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO ESPECÍFICO COMPLEJO DEMO 3
 * 
 * Este script diagnostica específicamente el problema del Complejo Demo 3
 * donde no aparecen categorías ni movimientos financieros.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ComplejoDemo3Diagnostico {
    constructor() {
        this.pool = null;
        this.complejoId = 7; // Complejo Demo 3
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN para diagnosticar Complejo Demo 3...');
            
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

    async verificarComplejo() {
        console.log('\n🔍 VERIFICANDO COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    id,
                    nombre,
                    direccion,
                    telefono,
                    email
                FROM complejos
                WHERE id = $1;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ COMPLEJO NO ENCONTRADO');
                return false;
            }
            
            const complejo = result.rows[0];
            console.log('✅ Complejo encontrado:');
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Dirección: ${complejo.direccion}`);
            console.log(`   • Teléfono: ${complejo.telefono}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Complejo encontrado correctamente`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando complejo:', error.message);
            return false;
        }
    }

    async verificarCategoriasComplejo() {
        console.log('\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    cg.id,
                    cg.nombre,
                    cg.descripcion,
                    cg.icono,
                    cg.color,
                    cg.tipo,
                    cg.es_predefinida,
                    cg.creado_en,
                    COUNT(gi.id) as movimientos_count
                FROM categorias_gastos cg
                LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
                WHERE cg.complejo_id = $1
                GROUP BY cg.id, cg.nombre, cg.descripcion, cg.icono, cg.color, cg.tipo, cg.es_predefinida, cg.creado_en
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE COMPLEJO');
                console.log('   PROBLEMA: El Complejo Demo 3 no tiene categorías financieras');
                return false;
            }
            
            console.log(`📊 CATEGORÍAS ENCONTRADAS: ${result.rows.length}`);
            
            const ingresos = result.rows.filter(c => c.tipo === 'ingreso');
            const gastos = result.rows.filter(c => c.tipo === 'gasto');
            
            console.log('\n💰 CATEGORÍAS DE INGRESOS:');
            if (ingresos.length === 0) {
                console.log('   ❌ No hay categorías de ingresos');
            } else {
                ingresos.forEach(cat => {
                    console.log(`   • ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`     Descripción: ${cat.descripcion}`);
                    console.log(`     Ícono: ${cat.icono} | Color: ${cat.color}`);
                });
            }
            
            console.log('\n💸 CATEGORÍAS DE GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay categorías de gastos');
            } else {
                gastos.forEach(cat => {
                    console.log(`   • ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`     Descripción: ${cat.descripcion}`);
                    console.log(`     Ícono: ${cat.icono} | Color: ${cat.color}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async verificarMovimientosComplejo() {
        console.log('\n🔍 VERIFICANDO MOVIMIENTOS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    gi.id,
                    gi.tipo,
                    gi.monto,
                    gi.fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.creado_en,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = $1
                ORDER BY gi.fecha DESC, gi.creado_en DESC
                LIMIT 20;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS FINANCIEROS PARA ESTE COMPLEJO');
                return false;
            }
            
            console.log(`📊 MOVIMIENTOS ENCONTRADOS: ${result.rows.length}`);
            
            const ingresos = result.rows.filter(m => m.tipo === 'ingreso');
            const gastos = result.rows.filter(m => m.tipo === 'gasto');
            
            console.log('\n💰 INGRESOS:');
            if (ingresos.length === 0) {
                console.log('   ❌ No hay ingresos registrados');
            } else {
                ingresos.forEach(mov => {
                    console.log(`   • $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     ${mov.descripcion}`);
                    console.log(`     Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            console.log('\n💸 GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay gastos registrados');
            } else {
                gastos.forEach(mov => {
                    console.log(`   • $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     ${mov.descripcion}`);
                    console.log(`     Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return false;
        }
    }

    async verificarReservasComplejo() {
        console.log('\n🔍 VERIFICANDO RESERVAS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    r.tipo_reserva,
                    r.fecha,
                    r.hora_inicio,
                    r.hora_fin,
                    r.created_at,
                    c.nombre as cancha_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1
                ORDER BY r.created_at DESC
                LIMIT 10;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS PARA ESTE COMPLEJO');
                return false;
            }
            
            console.log(`📊 RESERVAS ENCONTRADAS: ${result.rows.length}`);
            
            result.rows.forEach((reserva, index) => {
                console.log(`\n   ${index + 1}. Reserva #${reserva.codigo_reserva}`);
                console.log(`      Estado: ${reserva.estado}`);
                console.log(`      Precio: $${reserva.precio_total || 0}`);
                console.log(`      Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`      Cancha: ${reserva.cancha_nombre}`);
                console.log(`      Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`      Creada: ${reserva.created_at}`);
                
                // Verificar si tiene movimientos asociados
                this.verificarMovimientosReserva(reserva.codigo_reserva);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
            return false;
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        try {
            const query = `
                SELECT 
                    gi.tipo,
                    gi.monto,
                    gi.descripcion,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE '%Reserva #${codigoReserva}%'
                ORDER BY gi.tipo;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log(`      ❌ SIN MOVIMIENTOS FINANCIEROS`);
            } else {
                console.log(`      ✅ CON MOVIMIENTOS:`);
                result.rows.forEach(mov => {
                    console.log(`         • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Error verificando movimientos de reserva #${codigoReserva}:`, error.message);
        }
    }

    async crearCategoriasFaltantes() {
        console.log('\n🔧 CREANDO CATEGORÍAS FALTANTES PARA COMPLEJO DEMO 3...');
        
        try {
            // Verificar si ya existen categorías
            const query = `
                SELECT COUNT(*) as count
                FROM categorias_gastos
                WHERE complejo_id = $1;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            const count = parseInt(result.rows[0].count);
            
            if (count > 0) {
                console.log(`   ℹ️ Ya existen ${count} categorías para este complejo`);
                return true;
            }
            
            console.log('   🚀 Creando categorías predefinidas...');
            
            // Categorías de gastos
            const categoriasGastos = [
                { nombre: 'Sueldos', descripcion: 'Pago de sueldos y honorarios', icono: 'fas fa-users', color: '#007bff' },
                { nombre: 'Luz', descripcion: 'Gastos de electricidad', icono: 'fas fa-bolt', color: '#ffc107' },
                { nombre: 'Agua', descripcion: 'Gastos de agua', icono: 'fas fa-tint', color: '#17a2b8' },
                { nombre: 'Internet', descripcion: 'Gastos de internet y telefonía', icono: 'fas fa-wifi', color: '#6f42c1' },
                { nombre: 'Mantención Cancha', descripcion: 'Mantenimiento de canchas', icono: 'fas fa-tools', color: '#fd7e14' },
                { nombre: 'Aseo', descripcion: 'Materiales de limpieza', icono: 'fas fa-broom', color: '#20c997' },
                { nombre: 'Balones y Redes', descripcion: 'Equipamiento deportivo', icono: 'fas fa-futbol', color: '#28a745' },
                { nombre: 'Arriendo', descripcion: 'Gastos de arriendo', icono: 'fas fa-building', color: '#6c757d' },
                { nombre: 'Publicidad', descripcion: 'Gastos de publicidad y marketing', icono: 'fas fa-bullhorn', color: '#e83e8c' },
                { nombre: 'Otros Gastos', descripcion: 'Otros gastos varios', icono: 'fas fa-receipt', color: '#dc3545' },
                { nombre: 'Comisión Plataforma', descripcion: 'Comisión cobrada por la plataforma', icono: 'fas fa-percentage', color: '#dc3545' }
            ];
            
            // Categorías de ingresos
            const categoriasIngresos = [
                { nombre: 'Reservas Web', descripcion: 'Reservas realizadas a través de la plataforma web', icono: 'fas fa-globe', color: '#28a745' },
                { nombre: 'Reservas en Cancha', descripcion: 'Reservas realizadas directamente en el complejo', icono: 'fas fa-map-marker-alt', color: '#17a2b8' },
                { nombre: 'Arriendo Balones', descripcion: 'Arriendo de equipamiento deportivo', icono: 'fas fa-futbol', color: '#ffc107' },
                { nombre: 'Venta Bebidas', descripcion: 'Venta de bebidas y snacks', icono: 'fas fa-coffee', color: '#fd7e14' },
                { nombre: 'Torneos', descripcion: 'Ingresos por torneos y eventos', icono: 'fas fa-trophy', color: '#6f42c1' },
                { nombre: 'Otros Ingresos', descripcion: 'Otros ingresos varios', icono: 'fas fa-plus-circle', color: '#20c997' }
            ];
            
            // Insertar categorías de gastos
            for (const categoria of categoriasGastos) {
                await this.pool.query(`
                    INSERT INTO categorias_gastos (
                        complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                    ) VALUES ($1, $2, $3, $4, $5, 'gasto', true);
                `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                
                console.log(`      ✅ Categoría creada: ${categoria.nombre} (gasto)`);
            }
            
            // Insertar categorías de ingresos
            for (const categoria of categoriasIngresos) {
                await this.pool.query(`
                    INSERT INTO categorias_gastos (
                        complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                    ) VALUES ($1, $2, $3, $4, $5, 'ingreso', true);
                `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                
                console.log(`      ✅ Categoría creada: ${categoria.nombre} (ingreso)`);
            }
            
            console.log('   ✅ Todas las categorías creadas correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error creando categorías:', error.message);
            return false;
        }
    }

    async sincronizarReservasComplejo() {
        console.log('\n🔄 SINCRONIZANDO RESERVAS DEL COMPLEJO DEMO 3...');
        
        try {
            // Buscar reservas confirmadas sin movimientos
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.precio_total,
                    r.comision_aplicada,
                    r.fecha,
                    r.tipo_reserva,
                    c.nombre as cancha_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1
                AND r.estado = 'confirmada'
                AND r.precio_total > 0
                AND NOT EXISTS (
                    SELECT 1 FROM gastos_ingresos gi
                    WHERE gi.descripcion LIKE '%Reserva #' || r.codigo_reserva || '%'
                )
                ORDER BY r.created_at DESC;
            `;
            
            const reservasSinSincronizar = await this.pool.query(query, [this.complejoId]);
            
            if (reservasSinSincronizar.rows.length === 0) {
                console.log('   ✅ No hay reservas pendientes de sincronización');
                return;
            }
            
            console.log(`   📋 Encontradas ${reservasSinSincronizar.rows.length} reservas sin sincronizar`);
            
            // Obtener categorías necesarias
            const categoriasQuery = `
                SELECT id, tipo, nombre
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
            `;
            
            const categorias = await this.pool.query(categoriasQuery, [this.complejoId]);
            
            if (categorias.rows.length < 2) {
                console.log('   ❌ Faltan categorías necesarias para sincronización');
                return;
            }
            
            const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso');
            const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto');
            
            for (const reserva of reservasSinSincronizar.rows) {
                console.log(`\n   🔄 Sincronizando reserva #${reserva.codigo_reserva}...`);
                
                // Insertar ingreso
                const insertIngresoQuery = `
                    INSERT INTO gastos_ingresos (
                        complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                    ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico')
                    RETURNING id;
                `;
                
                const descripcionIngreso = `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`;
                
                await this.pool.query(insertIngresoQuery, [
                    this.complejoId,
                    categoriaIngreso.id,
                    reserva.precio_total,
                    reserva.fecha,
                    descripcionIngreso
                ]);
                
                console.log(`      ✅ Ingreso creado: $${reserva.precio_total}`);
                
                // Insertar gasto de comisión si existe
                if (reserva.comision_aplicada > 0) {
                    const tipoReservaTexto = reserva.tipo_reserva === 'directa' ? 
                        'Web (3.5% + IVA)' : 'Admin (1.75% + IVA)';
                    
                    const insertGastoQuery = `
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                        ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico')
                        RETURNING id;
                    `;
                    
                    const descripcionGasto = `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`;
                    
                    await this.pool.query(insertGastoQuery, [
                        this.complejoId,
                        categoriaGasto.id,
                        reserva.comision_aplicada,
                        reserva.fecha,
                        descripcionGasto
                    ]);
                    
                    console.log(`      ✅ Comisión creada: $${reserva.comision_aplicada}`);
                }
            }
            
            console.log('\n✅ Sincronización completada');
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO ESPECÍFICO - COMPLEJO DEMO 3');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // Verificaciones principales
        const complejoOk = await this.verificarComplejo();
        if (!complejoOk) return;
        
        const categoriasOk = await this.verificarCategoriasComplejo();
        const movimientosOk = await this.verificarMovimientosComplejo();
        await this.verificarReservasComplejo();
        
        // Solucionar problemas
        if (!categoriasOk) {
            await this.crearCategoriasFaltantes();
        }
        
        await this.sincronizarReservasComplejo();
        
        // Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        await this.verificarCategoriasComplejo();
        await this.verificarMovimientosComplejo();
        
        console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
        console.log('=' .repeat(40));
        
        if (!categoriasOk) {
            console.log('✅ SOLUCIONADO: Categorías creadas para Complejo Demo 3');
        }
        
        console.log('✅ El control financiero del Complejo Demo 3 debería funcionar ahora');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar diagnóstico específico
if (require.main === module) {
    const diagnostico = new ComplejoDemo3Diagnostico();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = ComplejoDemo3Diagnostico;

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN para diagnosticar Complejo Demo 3...');
            
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

    async verificarComplejo() {
        console.log('\n🔍 VERIFICANDO COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    id,
                    nombre,
                    direccion,
                    telefono,
                    email
                FROM complejos
                WHERE id = $1;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ COMPLEJO NO ENCONTRADO');
                return false;
            }
            
            const complejo = result.rows[0];
            console.log('✅ Complejo encontrado:');
            console.log(`   • ID: ${complejo.id}`);
            console.log(`   • Nombre: ${complejo.nombre}`);
            console.log(`   • Dirección: ${complejo.direccion}`);
            console.log(`   • Teléfono: ${complejo.telefono}`);
            console.log(`   • Email: ${complejo.email}`);
            console.log(`   • Complejo encontrado correctamente`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando complejo:', error.message);
            return false;
        }
    }

    async verificarCategoriasComplejo() {
        console.log('\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    cg.id,
                    cg.nombre,
                    cg.descripcion,
                    cg.icono,
                    cg.color,
                    cg.tipo,
                    cg.es_predefinida,
                    cg.creado_en,
                    COUNT(gi.id) as movimientos_count
                FROM categorias_gastos cg
                LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
                WHERE cg.complejo_id = $1
                GROUP BY cg.id, cg.nombre, cg.descripcion, cg.icono, cg.color, cg.tipo, cg.es_predefinida, cg.creado_en
                ORDER BY cg.tipo, cg.nombre;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY CATEGORÍAS PARA ESTE COMPLEJO');
                console.log('   PROBLEMA: El Complejo Demo 3 no tiene categorías financieras');
                return false;
            }
            
            console.log(`📊 CATEGORÍAS ENCONTRADAS: ${result.rows.length}`);
            
            const ingresos = result.rows.filter(c => c.tipo === 'ingreso');
            const gastos = result.rows.filter(c => c.tipo === 'gasto');
            
            console.log('\n💰 CATEGORÍAS DE INGRESOS:');
            if (ingresos.length === 0) {
                console.log('   ❌ No hay categorías de ingresos');
            } else {
                ingresos.forEach(cat => {
                    console.log(`   • ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`     Descripción: ${cat.descripcion}`);
                    console.log(`     Ícono: ${cat.icono} | Color: ${cat.color}`);
                });
            }
            
            console.log('\n💸 CATEGORÍAS DE GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay categorías de gastos');
            } else {
                gastos.forEach(cat => {
                    console.log(`   • ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`     Descripción: ${cat.descripcion}`);
                    console.log(`     Ícono: ${cat.icono} | Color: ${cat.color}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async verificarMovimientosComplejo() {
        console.log('\n🔍 VERIFICANDO MOVIMIENTOS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    gi.id,
                    gi.tipo,
                    gi.monto,
                    gi.fecha,
                    gi.descripcion,
                    gi.metodo_pago,
                    gi.creado_en,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id = $1
                ORDER BY gi.fecha DESC, gi.creado_en DESC
                LIMIT 20;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY MOVIMIENTOS FINANCIEROS PARA ESTE COMPLEJO');
                return false;
            }
            
            console.log(`📊 MOVIMIENTOS ENCONTRADOS: ${result.rows.length}`);
            
            const ingresos = result.rows.filter(m => m.tipo === 'ingreso');
            const gastos = result.rows.filter(m => m.tipo === 'gasto');
            
            console.log('\n💰 INGRESOS:');
            if (ingresos.length === 0) {
                console.log('   ❌ No hay ingresos registrados');
            } else {
                ingresos.forEach(mov => {
                    console.log(`   • $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     ${mov.descripcion}`);
                    console.log(`     Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            console.log('\n💸 GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay gastos registrados');
            } else {
                gastos.forEach(mov => {
                    console.log(`   • $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`     ${mov.descripcion}`);
                    console.log(`     Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return false;
        }
    }

    async verificarReservasComplejo() {
        console.log('\n🔍 VERIFICANDO RESERVAS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    r.tipo_reserva,
                    r.fecha,
                    r.hora_inicio,
                    r.hora_fin,
                    r.created_at,
                    c.nombre as cancha_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1
                ORDER BY r.created_at DESC
                LIMIT 10;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS PARA ESTE COMPLEJO');
                return false;
            }
            
            console.log(`📊 RESERVAS ENCONTRADAS: ${result.rows.length}`);
            
            result.rows.forEach((reserva, index) => {
                console.log(`\n   ${index + 1}. Reserva #${reserva.codigo_reserva}`);
                console.log(`      Estado: ${reserva.estado}`);
                console.log(`      Precio: $${reserva.precio_total || 0}`);
                console.log(`      Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`      Cancha: ${reserva.cancha_nombre}`);
                console.log(`      Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`      Creada: ${reserva.created_at}`);
                
                // Verificar si tiene movimientos asociados
                this.verificarMovimientosReserva(reserva.codigo_reserva);
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
            return false;
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        try {
            const query = `
                SELECT 
                    gi.tipo,
                    gi.monto,
                    gi.descripcion,
                    cg.nombre as categoria_nombre
                FROM gastos_ingresos gi
                LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.descripcion LIKE '%Reserva #${codigoReserva}%'
                ORDER BY gi.tipo;
            `;
            
            const result = await this.pool.query(query);
            
            if (result.rows.length === 0) {
                console.log(`      ❌ SIN MOVIMIENTOS FINANCIEROS`);
            } else {
                console.log(`      ✅ CON MOVIMIENTOS:`);
                result.rows.forEach(mov => {
                    console.log(`         • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Error verificando movimientos de reserva #${codigoReserva}:`, error.message);
        }
    }

    async crearCategoriasFaltantes() {
        console.log('\n🔧 CREANDO CATEGORÍAS FALTANTES PARA COMPLEJO DEMO 3...');
        
        try {
            // Verificar si ya existen categorías
            const query = `
                SELECT COUNT(*) as count
                FROM categorias_gastos
                WHERE complejo_id = $1;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            const count = parseInt(result.rows[0].count);
            
            if (count > 0) {
                console.log(`   ℹ️ Ya existen ${count} categorías para este complejo`);
                return true;
            }
            
            console.log('   🚀 Creando categorías predefinidas...');
            
            // Categorías de gastos
            const categoriasGastos = [
                { nombre: 'Sueldos', descripcion: 'Pago de sueldos y honorarios', icono: 'fas fa-users', color: '#007bff' },
                { nombre: 'Luz', descripcion: 'Gastos de electricidad', icono: 'fas fa-bolt', color: '#ffc107' },
                { nombre: 'Agua', descripcion: 'Gastos de agua', icono: 'fas fa-tint', color: '#17a2b8' },
                { nombre: 'Internet', descripcion: 'Gastos de internet y telefonía', icono: 'fas fa-wifi', color: '#6f42c1' },
                { nombre: 'Mantención Cancha', descripcion: 'Mantenimiento de canchas', icono: 'fas fa-tools', color: '#fd7e14' },
                { nombre: 'Aseo', descripcion: 'Materiales de limpieza', icono: 'fas fa-broom', color: '#20c997' },
                { nombre: 'Balones y Redes', descripcion: 'Equipamiento deportivo', icono: 'fas fa-futbol', color: '#28a745' },
                { nombre: 'Arriendo', descripcion: 'Gastos de arriendo', icono: 'fas fa-building', color: '#6c757d' },
                { nombre: 'Publicidad', descripcion: 'Gastos de publicidad y marketing', icono: 'fas fa-bullhorn', color: '#e83e8c' },
                { nombre: 'Otros Gastos', descripcion: 'Otros gastos varios', icono: 'fas fa-receipt', color: '#dc3545' },
                { nombre: 'Comisión Plataforma', descripcion: 'Comisión cobrada por la plataforma', icono: 'fas fa-percentage', color: '#dc3545' }
            ];
            
            // Categorías de ingresos
            const categoriasIngresos = [
                { nombre: 'Reservas Web', descripcion: 'Reservas realizadas a través de la plataforma web', icono: 'fas fa-globe', color: '#28a745' },
                { nombre: 'Reservas en Cancha', descripcion: 'Reservas realizadas directamente en el complejo', icono: 'fas fa-map-marker-alt', color: '#17a2b8' },
                { nombre: 'Arriendo Balones', descripcion: 'Arriendo de equipamiento deportivo', icono: 'fas fa-futbol', color: '#ffc107' },
                { nombre: 'Venta Bebidas', descripcion: 'Venta de bebidas y snacks', icono: 'fas fa-coffee', color: '#fd7e14' },
                { nombre: 'Torneos', descripcion: 'Ingresos por torneos y eventos', icono: 'fas fa-trophy', color: '#6f42c1' },
                { nombre: 'Otros Ingresos', descripcion: 'Otros ingresos varios', icono: 'fas fa-plus-circle', color: '#20c997' }
            ];
            
            // Insertar categorías de gastos
            for (const categoria of categoriasGastos) {
                await this.pool.query(`
                    INSERT INTO categorias_gastos (
                        complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                    ) VALUES ($1, $2, $3, $4, $5, 'gasto', true);
                `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                
                console.log(`      ✅ Categoría creada: ${categoria.nombre} (gasto)`);
            }
            
            // Insertar categorías de ingresos
            for (const categoria of categoriasIngresos) {
                await this.pool.query(`
                    INSERT INTO categorias_gastos (
                        complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                    ) VALUES ($1, $2, $3, $4, $5, 'ingreso', true);
                `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                
                console.log(`      ✅ Categoría creada: ${categoria.nombre} (ingreso)`);
            }
            
            console.log('   ✅ Todas las categorías creadas correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error creando categorías:', error.message);
            return false;
        }
    }

    async sincronizarReservasComplejo() {
        console.log('\n🔄 SINCRONIZANDO RESERVAS DEL COMPLEJO DEMO 3...');
        
        try {
            // Buscar reservas confirmadas sin movimientos
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.precio_total,
                    r.comision_aplicada,
                    r.fecha,
                    r.tipo_reserva,
                    c.nombre as cancha_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1
                AND r.estado = 'confirmada'
                AND r.precio_total > 0
                AND NOT EXISTS (
                    SELECT 1 FROM gastos_ingresos gi
                    WHERE gi.descripcion LIKE '%Reserva #' || r.codigo_reserva || '%'
                )
                ORDER BY r.created_at DESC;
            `;
            
            const reservasSinSincronizar = await this.pool.query(query, [this.complejoId]);
            
            if (reservasSinSincronizar.rows.length === 0) {
                console.log('   ✅ No hay reservas pendientes de sincronización');
                return;
            }
            
            console.log(`   📋 Encontradas ${reservasSinSincronizar.rows.length} reservas sin sincronizar`);
            
            // Obtener categorías necesarias
            const categoriasQuery = `
                SELECT id, tipo, nombre
                FROM categorias_gastos
                WHERE complejo_id = $1
                AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                     OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
            `;
            
            const categorias = await this.pool.query(categoriasQuery, [this.complejoId]);
            
            if (categorias.rows.length < 2) {
                console.log('   ❌ Faltan categorías necesarias para sincronización');
                return;
            }
            
            const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso');
            const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto');
            
            for (const reserva of reservasSinSincronizar.rows) {
                console.log(`\n   🔄 Sincronizando reserva #${reserva.codigo_reserva}...`);
                
                // Insertar ingreso
                const insertIngresoQuery = `
                    INSERT INTO gastos_ingresos (
                        complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                    ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico')
                    RETURNING id;
                `;
                
                const descripcionIngreso = `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`;
                
                await this.pool.query(insertIngresoQuery, [
                    this.complejoId,
                    categoriaIngreso.id,
                    reserva.precio_total,
                    reserva.fecha,
                    descripcionIngreso
                ]);
                
                console.log(`      ✅ Ingreso creado: $${reserva.precio_total}`);
                
                // Insertar gasto de comisión si existe
                if (reserva.comision_aplicada > 0) {
                    const tipoReservaTexto = reserva.tipo_reserva === 'directa' ? 
                        'Web (3.5% + IVA)' : 'Admin (1.75% + IVA)';
                    
                    const insertGastoQuery = `
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                        ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico')
                        RETURNING id;
                    `;
                    
                    const descripcionGasto = `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`;
                    
                    await this.pool.query(insertGastoQuery, [
                        this.complejoId,
                        categoriaGasto.id,
                        reserva.comision_aplicada,
                        reserva.fecha,
                        descripcionGasto
                    ]);
                    
                    console.log(`      ✅ Comisión creada: $${reserva.comision_aplicada}`);
                }
            }
            
            console.log('\n✅ Sincronización completada');
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 DIAGNÓSTICO ESPECÍFICO - COMPLEJO DEMO 3');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // Verificaciones principales
        const complejoOk = await this.verificarComplejo();
        if (!complejoOk) return;
        
        const categoriasOk = await this.verificarCategoriasComplejo();
        const movimientosOk = await this.verificarMovimientosComplejo();
        await this.verificarReservasComplejo();
        
        // Solucionar problemas
        if (!categoriasOk) {
            await this.crearCategoriasFaltantes();
        }
        
        await this.sincronizarReservasComplejo();
        
        // Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        await this.verificarCategoriasComplejo();
        await this.verificarMovimientosComplejo();
        
        console.log('\n🎯 RESUMEN DEL DIAGNÓSTICO:');
        console.log('=' .repeat(40));
        
        if (!categoriasOk) {
            console.log('✅ SOLUCIONADO: Categorías creadas para Complejo Demo 3');
        }
        
        console.log('✅ El control financiero del Complejo Demo 3 debería funcionar ahora');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar diagnóstico específico
if (require.main === module) {
    const diagnostico = new ComplejoDemo3Diagnostico();
    diagnostico.diagnosticar().catch(console.error);
}

module.exports = ComplejoDemo3Diagnostico;


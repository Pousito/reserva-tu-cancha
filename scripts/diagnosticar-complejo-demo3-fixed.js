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
        this.complejoId = 8; // Complejo Demo 3
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
                });
            }
            
            console.log('\n💸 CATEGORÍAS DE GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay categorías de gastos');
            } else {
                gastos.forEach(cat => {
                    console.log(`   • ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
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
        
        // Solucionar problemas
        if (!categoriasOk) {
            await this.crearCategoriasFaltantes();
        }
        
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

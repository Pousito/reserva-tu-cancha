#!/usr/bin/env node

/**
 * 🔧 CREAR CATEGORÍAS COMPLETAS PARA COMPLEJO DEMO 3
 * 
 * Este script crea todas las categorías necesarias para el complejo demo 3
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class CreadorCategoriasCompletas {
    constructor() {
        this.pool = null;
        this.complejoId = 8; // Complejo Demo 3
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

    async crearCategoriasCompletas() {
        console.log('\n🔧 CREANDO CATEGORÍAS COMPLETAS PARA COMPLEJO DEMO 3...');
        
        try {
            // Verificar categorías existentes
            const query = `
                SELECT COUNT(*) as count
                FROM categorias_gastos
                WHERE complejo_id = $1;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            const count = parseInt(result.rows[0].count);
            
            console.log(`📊 Categorías existentes: ${count}`);
            
            // Categorías de gastos completas
            const categoriasGastos = [
                { nombre: 'Sueldos', descripcion: 'Pago de sueldos y honorarios del personal', icono: 'fas fa-users', color: '#007bff' },
                { nombre: 'Luz', descripcion: 'Gastos de electricidad del complejo', icono: 'fas fa-bolt', color: '#ffc107' },
                { nombre: 'Agua', descripcion: 'Gastos de agua potable y riego', icono: 'fas fa-tint', color: '#17a2b8' },
                { nombre: 'Internet', descripcion: 'Gastos de internet y telefonía', icono: 'fas fa-wifi', color: '#6f42c1' },
                { nombre: 'Mantención Cancha', descripcion: 'Mantenimiento y reparación de canchas', icono: 'fas fa-tools', color: '#fd7e14' },
                { nombre: 'Aseo', descripcion: 'Materiales de limpieza y productos químicos', icono: 'fas fa-broom', color: '#20c997' },
                { nombre: 'Balones y Redes', descripcion: 'Equipamiento deportivo y accesorios', icono: 'fas fa-futbol', color: '#28a745' },
                { nombre: 'Arriendo', descripcion: 'Gastos de arriendo del terreno o instalaciones', icono: 'fas fa-building', color: '#6c757d' },
                { nombre: 'Publicidad', descripcion: 'Gastos de publicidad y marketing', icono: 'fas fa-bullhorn', color: '#e83e8c' },
                { nombre: 'Seguros', descripcion: 'Seguros del complejo y responsabilidad civil', icono: 'fas fa-shield-alt', color: '#6c757d' },
                { nombre: 'Otros Gastos', descripcion: 'Otros gastos varios del complejo', icono: 'fas fa-receipt', color: '#dc3545' }
            ];
            
            // Categorías de ingresos completas
            const categoriasIngresos = [
                { nombre: 'Reservas Web', descripcion: 'Reservas realizadas a través de la plataforma web', icono: 'fas fa-globe', color: '#28a745' },
                { nombre: 'Reservas en Cancha', descripcion: 'Reservas realizadas directamente en el complejo', icono: 'fas fa-map-marker-alt', color: '#17a2b8' },
                { nombre: 'Arriendo Balones', descripcion: 'Arriendo de equipamiento deportivo', icono: 'fas fa-futbol', color: '#ffc107' },
                { nombre: 'Venta Bebidas', descripcion: 'Venta de bebidas y snacks', icono: 'fas fa-coffee', color: '#fd7e14' },
                { nombre: 'Torneos', descripcion: 'Ingresos por torneos y eventos deportivos', icono: 'fas fa-trophy', color: '#6f42c1' },
                { nombre: 'Clases Particulares', descripcion: 'Ingresos por clases de fútbol o padel', icono: 'fas fa-chalkboard-teacher', color: '#20c997' },
                { nombre: 'Alquiler Vestuarios', descripcion: 'Alquiler de vestuarios y duchas', icono: 'fas fa-shower', color: '#17a2b8' },
                { nombre: 'Otros Ingresos', descripcion: 'Otros ingresos varios del complejo', icono: 'fas fa-plus-circle', color: '#20c997' }
            ];
            
            // Insertar categorías de gastos (solo las que no existen)
            console.log('\n💸 CREANDO CATEGORÍAS DE GASTOS:');
            for (const categoria of categoriasGastos) {
                // Verificar si ya existe
                const existeQuery = `
                    SELECT id FROM categorias_gastos 
                    WHERE complejo_id = $1 AND nombre = $2 AND tipo = 'gasto';
                `;
                const existe = await this.pool.query(existeQuery, [this.complejoId, categoria.nombre]);
                
                if (existe.rows.length === 0) {
                    await this.pool.query(`
                        INSERT INTO categorias_gastos (
                            complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                        ) VALUES ($1, $2, $3, $4, $5, 'gasto', true);
                    `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                    
                    console.log(`   ✅ ${categoria.nombre}`);
                } else {
                    console.log(`   ⏭️ ${categoria.nombre} (ya existe)`);
                }
            }
            
            // Insertar categorías de ingresos (solo las que no existen)
            console.log('\n💰 CREANDO CATEGORÍAS DE INGRESOS:');
            for (const categoria of categoriasIngresos) {
                // Verificar si ya existe
                const existeQuery = `
                    SELECT id FROM categorias_gastos 
                    WHERE complejo_id = $1 AND nombre = $2 AND tipo = 'ingreso';
                `;
                const existe = await this.pool.query(existeQuery, [this.complejoId, categoria.nombre]);
                
                if (existe.rows.length === 0) {
                    await this.pool.query(`
                        INSERT INTO categorias_gastos (
                            complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida
                        ) VALUES ($1, $2, $3, $4, $5, 'ingreso', true);
                    `, [this.complejoId, categoria.nombre, categoria.descripcion, categoria.icono, categoria.color]);
                    
                    console.log(`   ✅ ${categoria.nombre}`);
                } else {
                    console.log(`   ⏭️ ${categoria.nombre} (ya existe)`);
                }
            }
            
            // Verificar resultado final
            const finalQuery = `
                SELECT COUNT(*) as count, tipo
                FROM categorias_gastos
                WHERE complejo_id = $1
                GROUP BY tipo
                ORDER BY tipo;
            `;
            
            const finalResult = await this.pool.query(finalQuery, [this.complejoId]);
            
            console.log('\n📊 RESUMEN FINAL:');
            finalResult.rows.forEach(row => {
                console.log(`   ${row.tipo}: ${row.count} categorías`);
            });
            
            console.log('\n✅ Categorías completas creadas correctamente');
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

    async ejecutar() {
        console.log('🔧 CREADOR DE CATEGORÍAS COMPLETAS - COMPLEJO DEMO 3');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.crearCategoriasCompletas();
        await this.cerrar();
    }
}

// Ejecutar
if (require.main === module) {
    const creador = new CreadorCategoriasCompletas();
    creador.ejecutar().catch(console.error);
}

module.exports = CreadorCategoriasCompletas;

#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN FINAL - CATEGORÍAS COMPLEJO DEMO 3
 * 
 * Este script verifica que las categorías del complejo demo 3 estén funcionando correctamente
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificadorCategoriasDemo3 {
    constructor() {
        this.pool = null;
        this.complejoId = 8; // Complejo Demo 3
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN para verificar categorías...');
            
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

    async verificarCategoriasCompleto() {
        console.log('\n🔍 VERIFICACIÓN COMPLETA DE CATEGORÍAS...');
        
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
                    console.log(`   ✅ ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`      Descripción: ${cat.descripcion}`);
                    console.log(`      Ícono: ${cat.icono} | Color: ${cat.color}`);
                    console.log(`      Predefinida: ${cat.es_predefinida ? 'Sí' : 'No'}`);
                });
            }
            
            console.log('\n💸 CATEGORÍAS DE GASTOS:');
            if (gastos.length === 0) {
                console.log('   ❌ No hay categorías de gastos');
            } else {
                gastos.forEach(cat => {
                    console.log(`   ✅ ${cat.nombre} - ${cat.movimientos_count} movimientos`);
                    console.log(`      Descripción: ${cat.descripcion}`);
                    console.log(`      Ícono: ${cat.icono} | Color: ${cat.color}`);
                    console.log(`      Predefinida: ${cat.es_predefinida ? 'Sí' : 'No'}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando categorías:', error.message);
            return false;
        }
    }

    async verificarMovimientos() {
        console.log('\n🔍 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        
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
                LIMIT 10;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('ℹ️ No hay movimientos financieros para este complejo');
                return true;
            }
            
            console.log(`📊 MOVIMIENTOS ENCONTRADOS: ${result.rows.length}`);
            
            const ingresos = result.rows.filter(m => m.tipo === 'ingreso');
            const gastos = result.rows.filter(m => m.tipo === 'gasto');
            
            console.log('\n💰 INGRESOS:');
            if (ingresos.length === 0) {
                console.log('   ℹ️ No hay ingresos registrados');
            } else {
                ingresos.forEach(mov => {
                    console.log(`   ✅ $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`      ${mov.descripcion}`);
                    console.log(`      Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            console.log('\n💸 GASTOS:');
            if (gastos.length === 0) {
                console.log('   ℹ️ No hay gastos registrados');
            } else {
                gastos.forEach(mov => {
                    console.log(`   ✅ $${mov.monto} - ${mov.categoria_nombre}`);
                    console.log(`      ${mov.descripcion}`);
                    console.log(`      Fecha: ${mov.fecha} | Creado: ${mov.creado_en}`);
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error verificando movimientos:', error.message);
            return false;
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN FINAL - CATEGORÍAS COMPLEJO DEMO 3');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        // Verificaciones principales
        const complejoOk = await this.verificarComplejo();
        if (!complejoOk) return;
        
        const categoriasOk = await this.verificarCategoriasCompleto();
        await this.verificarMovimientos();
        
        console.log('\n🎯 RESUMEN DE LA VERIFICACIÓN:');
        console.log('=' .repeat(40));
        
        if (categoriasOk) {
            console.log('✅ CATEGORÍAS: Funcionando correctamente');
            console.log('✅ El control financiero del Complejo Demo 3 está listo');
            console.log('🔄 Puedes acceder al panel de administración y ver las categorías');
        } else {
            console.log('❌ CATEGORÍAS: Hay problemas que necesitan ser solucionados');
        }
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificador = new VerificadorCategoriasDemo3();
    verificador.verificar().catch(console.error);
}

module.exports = VerificadorCategoriasDemo3;

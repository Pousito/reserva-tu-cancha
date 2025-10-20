#!/usr/bin/env node

/**
 * 🧪 PROBAR ENDPOINT DE CATEGORÍAS
 * 
 * Este script prueba el endpoint de categorías directamente
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ProbadorEndpointCategorias {
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

    async probarConsultaCategorias() {
        console.log('\n🧪 PROBANDO CONSULTA DE CATEGORÍAS...');
        
        try {
            // Simular la consulta que hace el endpoint
            const query = 'SELECT * FROM categorias_gastos WHERE complejo_id = $1 ORDER BY nombre ASC';
            const params = [8]; // Complejo Demo 3
            
            console.log('📋 Ejecutando consulta:', query);
            console.log('📋 Parámetros:', params);
            
            const categorias = await this.pool.query(query, params);
            
            console.log('✅ Consulta exitosa');
            console.log('📊 Número de categorías encontradas:', categorias ? categorias.rows.length : 0);
            
            if (categorias && categorias.rows && categorias.rows.length > 0) {
                console.log('🔍 Primer elemento:');
                console.log('   - ID:', categorias.rows[0].id);
                console.log('   - Nombre:', categorias.rows[0].nombre);
                console.log('   - Descripción:', categorias.rows[0].descripcion);
                console.log('   - Ícono:', categorias.rows[0].icono);
                console.log('   - Color:', categorias.rows[0].color);
                console.log('   - Tipo:', categorias.rows[0].tipo);
                
                console.log('\n📋 Todas las categorías:');
                categorias.rows.forEach((cat, index) => {
                    console.log(`   ${index + 1}. ${cat.nombre} (${cat.tipo}) - ${cat.icono} - ${cat.color}`);
                });
            } else {
                console.log('⚠️ No se encontraron categorías');
            }
            
            return categorias.rows;
            
        } catch (error) {
            console.error('❌ Error en la consulta:', error.message);
            return null;
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async ejecutar() {
        console.log('🧪 PROBADOR DE ENDPOINT DE CATEGORÍAS');
        console.log('=' .repeat(50));
        
        await this.conectar();
        const categorias = await this.probarConsultaCategorias();
        
        if (categorias) {
            console.log('\n✅ La consulta funciona correctamente');
            console.log('🔄 El problema podría estar en el servidor web');
            console.log('💡 Intenta reiniciar el servidor o verificar los logs');
        } else {
            console.log('\n❌ Hay un problema con la consulta');
        }
        
        await this.cerrar();
    }
}

// Ejecutar
if (require.main === module) {
    const probador = new ProbadorEndpointCategorias();
    probador.ejecutar().catch(console.error);
}

module.exports = ProbadorEndpointCategorias;

#!/usr/bin/env node

/**
 * 🧪 PROBAR CONSULTA EXACTA DEL SERVIDOR
 * 
 * Este script simula exactamente la consulta que hace el servidor
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class ProbadorConsultaExacta {
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

    async probarConsultaExacta() {
        console.log('\n🧪 PROBANDO CONSULTA EXACTA DEL SERVIDOR...');
        
        try {
            // Simular exactamente la consulta que hace el servidor
            const query = 'SELECT * FROM categorias_gastos WHERE 1=1 AND complejo_id = $1 ORDER BY nombre ASC';
            const params = [8];
            
            console.log('📋 Query:', query);
            console.log('📋 Parámetros:', params);
            
            const categorias = await this.pool.query(query, params);
            
            console.log('\n🔍 RESULTADO COMPLETO:');
            console.log('   - Tipo:', typeof categorias);
            console.log('   - Es null:', categorias === null);
            console.log('   - Es undefined:', categorias === undefined);
            console.log('   - Propiedades:', Object.keys(categorias || {}));
            
            if (categorias) {
                console.log('   - Tiene rows:', 'rows' in categorias);
                console.log('   - rows es array:', Array.isArray(categorias.rows));
                console.log('   - Número de filas:', categorias.rows ? categorias.rows.length : 'N/A');
                
                if (categorias.rows && categorias.rows.length > 0) {
                    console.log('   - Primera fila:', categorias.rows[0]);
                }
            }
            
            // Probar también con query directo
            console.log('\n🔍 PROBANDO CONSULTA DIRECTA:');
            const resultadoDirecto = await this.pool.query('SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = 8');
            console.log('   - Count directo:', resultadoDirecto.rows[0].count);
            
        } catch (error) {
            console.error('❌ Error en la consulta:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async ejecutar() {
        console.log('🧪 PROBADOR DE CONSULTA EXACTA');
        console.log('=' .repeat(50));
        
        await this.conectar();
        await this.probarConsultaExacta();
        await this.cerrar();
    }
}

// Ejecutar
if (require.main === module) {
    const probador = new ProbadorConsultaExacta();
    probador.ejecutar().catch(console.error);
}

module.exports = ProbadorConsultaExacta;

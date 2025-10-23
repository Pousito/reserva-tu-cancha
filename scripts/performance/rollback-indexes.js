#!/usr/bin/env node

/**
 * Script de rollback para eliminar índices si algo sale mal
 * SOLO usar en caso de emergencia
 */

require('dotenv').config();
const { Pool } = require('pg');

class IndexRollback {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.droppedIndexes = [];
        this.errors = [];
    }

    async connect() {
        try {
            const client = await this.pool.connect();
            console.log('✅ Conectado a la base de datos');
            return client;
        } catch (error) {
            console.error('❌ Error conectando a la BD:', error);
            throw error;
        }
    }

    async dropIndex(indexName, description) {
        try {
            console.log(`🗑️  Eliminando índice: ${indexName}`);
            console.log(`   📝 ${description}`);
            
            const start = Date.now();
            await this.pool.query(`DROP INDEX IF EXISTS ${indexName}`);
            const duration = Date.now() - start;
            
            this.droppedIndexes.push({
                name: indexName,
                description,
                duration,
                timestamp: new Date().toISOString()
            });
            
            console.log(`   ✅ Eliminado en ${duration}ms\n`);
            return true;
        } catch (error) {
            console.error(`   ❌ Error eliminando índice ${indexName}:`, error.message);
            this.errors.push({
                name: indexName,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    async rollbackOptimizationIndexes() {
        console.log('⚠️  INICIANDO ROLLBACK DE OPTIMIZACIONES\n');
        console.log('🚨 ADVERTENCIA: Esto eliminará todos los índices de optimización\n');
        console.log('=' .repeat(60));

        // Lista de índices a eliminar (en orden inverso de creación)
        const indexesToDrop = [
            {
                name: 'idx_reservas_complejo_fecha_estado',
                description: 'Índice compuesto para reportes complejos'
            },
            {
                name: 'idx_gastos_fecha_tipo',
                description: 'Índice para consultas de gastos por fecha'
            },
            {
                name: 'idx_usuarios_email',
                description: 'Índice para autenticación por email'
            },
            {
                name: 'idx_complejos_ciudad',
                description: 'Índice para consultas de complejos por ciudad'
            },
            {
                name: 'idx_canchas_complejo_tipo',
                description: 'Índice para consultas de canchas por complejo y tipo'
            },
            {
                name: 'idx_reservas_estado_precio',
                description: 'Índice para cálculos de ingresos'
            },
            {
                name: 'idx_reservas_codigo',
                description: 'Índice para búsqueda por código de reserva'
            },
            {
                name: 'idx_reservas_created_at',
                description: 'Índice para consultas de reservas recientes'
            },
            {
                name: 'idx_reservas_fecha_estado',
                description: 'Índice para consultas de reservas por fecha'
            },
            {
                name: 'idx_reservas_cancha_fecha_estado',
                description: 'Índice para consultas de disponibilidad'
            }
        ];

        for (const index of indexesToDrop) {
            await this.dropIndex(index.name, index.description);
        }
    }

    async listRemainingIndexes() {
        console.log('\n📋 Índices restantes en la base de datos:\n');
        
        try {
            const result = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE schemaname = 'public'
                AND indexname NOT LIKE 'pg_%'
                ORDER BY tablename, indexname
            `);
            
            if (result.rows.length > 0) {
                result.rows.forEach(row => {
                    console.log(`📊 ${row.indexname} (${row.tablename})`);
                });
            } else {
                console.log('ℹ️  No hay índices personalizados restantes');
            }
        } catch (error) {
            console.error('Error listando índices:', error.message);
        }
    }

    generateReport() {
        console.log('\n📋 REPORTE DE ROLLBACK\n');
        console.log('=' .repeat(60));
        
        console.log(`✅ Índices eliminados exitosamente: ${this.droppedIndexes.length}`);
        this.droppedIndexes.forEach(index => {
            console.log(`   - ${index.name} (${index.duration}ms)`);
        });
        
        if (this.errors.length > 0) {
            console.log(`\n❌ Errores encontrados: ${this.errors.length}`);
            this.errors.forEach(error => {
                console.log(`   - ${error.name}: ${error.error}`);
            });
        }
        
        console.log('\n⚠️  IMPORTANTE:');
        console.log('   - La base de datos ha vuelto a su estado anterior');
        console.log('   - Las consultas pueden ser más lentas');
        console.log('   - Considera ejecutar el benchmark para verificar el impacto');
        
        // Guardar reporte
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            action: 'rollback',
            droppedIndexes: this.droppedIndexes,
            errors: this.errors,
            summary: {
                totalIndexes: this.droppedIndexes.length + this.errors.length,
                successful: this.droppedIndexes.length,
                failed: this.errors.length
            }
        };
        
        fs.writeFileSync('./rollback-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📄 Reporte guardado en: rollback-report.json');
    }

    async close() {
        await this.pool.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar rollback
async function main() {
    const rollback = new IndexRollback();
    
    try {
        await rollback.connect();
        await rollback.rollbackOptimizationIndexes();
        await rollback.listRemainingIndexes();
        rollback.generateReport();
    } catch (error) {
        console.error('❌ Error ejecutando rollback:', error);
    } finally {
        await rollback.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = IndexRollback;

#!/usr/bin/env node

/**
 * Script para crear índices optimizados en la base de datos
 * Basado en el análisis de consultas más frecuentes
 */

require('dotenv').config();
const { Pool } = require('pg');

class DatabaseOptimizer {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.createdIndexes = [];
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

    async createIndex(name, query, description) {
        try {
            console.log(`🔨 Creando índice: ${name}`);
            console.log(`   📝 ${description}`);
            
            const start = Date.now();
            await this.pool.query(query);
            const duration = Date.now() - start;
            
            this.createdIndexes.push({
                name,
                query,
                description,
                duration,
                timestamp: new Date().toISOString()
            });
            
            console.log(`   ✅ Creado en ${duration}ms\n`);
            return true;
        } catch (error) {
            console.error(`   ❌ Error creando índice ${name}:`, error.message);
            this.errors.push({
                name,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    async checkIndexExists(indexName) {
        try {
            const result = await this.pool.query(`
                SELECT indexname 
                FROM pg_indexes 
                WHERE indexname = $1 AND schemaname = 'public'
            `, [indexName]);
            
            return result.rows.length > 0;
        } catch (error) {
            console.error(`Error verificando índice ${indexName}:`, error.message);
            return false;
        }
    }

    async createOptimizedIndexes() {
        console.log('🚀 Iniciando optimización de base de datos...\n');
        console.log('=' .repeat(60));

        // 1. Índice para consultas de disponibilidad (MÁS CRÍTICO)
        // Usado en: getDisponibilidad, getDisponibilidadComplejo
        await this.createIndex(
            'idx_reservas_cancha_fecha_estado',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_cancha_fecha_estado 
             ON reservas (cancha_id, fecha, estado) 
             WHERE estado != 'cancelada'`,
            'Optimiza consultas de disponibilidad por cancha y fecha'
        );

        // 2. Índice para consultas por fecha (CRÍTICO)
        // Usado en: getReservasHoy, getReservasPorDia
        await this.createIndex(
            'idx_reservas_fecha_estado',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_fecha_estado 
             ON reservas (fecha, estado) 
             WHERE estado != 'cancelada'`,
            'Optimiza consultas de reservas por fecha'
        );

        // 3. Índice para reservas recientes (IMPORTANTE)
        // Usado en: getReservasRecientes
        await this.createIndex(
            'idx_reservas_created_at',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_created_at 
             ON reservas (created_at DESC)`,
            'Optimiza consultas de reservas recientes'
        );

        // 4. Índice para búsqueda por código de reserva (IMPORTANTE)
        // Usado en: getReservaByCodigo
        await this.createIndex(
            'idx_reservas_codigo',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_codigo 
             ON reservas (codigo_reserva)`,
            'Optimiza búsqueda por código de reserva'
        );

        // 5. Índice para consultas de ingresos (IMPORTANTE)
        // Usado en: getEstadisticas (ingresos totales)
        await this.createIndex(
            'idx_reservas_estado_precio',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_estado_precio 
             ON reservas (estado, precio_total) 
             WHERE estado = 'confirmada'`,
            'Optimiza cálculos de ingresos'
        );

        // 6. Índice para canchas por complejo (IMPORTANTE)
        // Usado en: getCanchasByComplejoAndTipo
        await this.createIndex(
            'idx_canchas_complejo_tipo',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_canchas_complejo_tipo 
             ON canchas (complejo_id, tipo)`,
            'Optimiza consultas de canchas por complejo y tipo'
        );

        // 7. Índice para complejos por ciudad (MODERADO)
        // Usado en: getComplejosByCiudad
        await this.createIndex(
            'idx_complejos_ciudad',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_complejos_ciudad 
             ON complejos (ciudad_id)`,
            'Optimiza consultas de complejos por ciudad'
        );

        // 8. Índice para usuarios por email (MODERADO)
        // Usado en: autenticación
        await this.createIndex(
            'idx_usuarios_email',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuarios_email 
             ON usuarios (email)`,
            'Optimiza autenticación por email'
        );

        // 9. Índice para gastos por fecha (MODERADO)
        // Usado en: getMovimientos, getEstadisticas (gastos)
        await this.createIndex(
            'idx_gastos_fecha_tipo',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gastos_fecha_tipo 
             ON gastos (fecha, tipo)`,
            'Optimiza consultas de gastos por fecha'
        );

        // 10. Índice compuesto para reportes complejos (AVANZADO)
        // Usado en: reportes con múltiples filtros
        await this.createIndex(
            'idx_reservas_complejo_fecha_estado',
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reservas_complejo_fecha_estado 
             ON reservas (cancha_id, fecha, estado, precio_total) 
             INCLUDE (nombre_cliente, email_cliente, codigo_reserva)`,
            'Índice compuesto para reportes complejos (PostgreSQL 11+)'
        );
    }

    async analyzeTableSizes() {
        console.log('\n📊 Análisis de tamaños de tablas después de optimización:\n');
        
        try {
            const result = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `);
            
            result.rows.forEach(row => {
                console.log(`📋 ${row.tablename}: ${row.size}`);
            });
        } catch (error) {
            console.error('Error analizando tamaños:', error.message);
        }
    }

    async analyzeIndexUsage() {
        console.log('\n📈 Análisis de uso de índices:\n');
        
        try {
            const result = await this.pool.query(`
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public'
                ORDER BY idx_tup_read DESC
                LIMIT 10
            `);
            
            if (result.rows.length > 0) {
                result.rows.forEach(row => {
                    console.log(`📊 ${row.indexname}: ${row.idx_tup_read} lecturas, ${row.idx_tup_fetch} fetches`);
                });
            } else {
                console.log('ℹ️  No hay estadísticas de uso aún (normal en índices nuevos)');
            }
        } catch (error) {
            console.error('Error analizando uso de índices:', error.message);
        }
    }

    generateReport() {
        console.log('\n📋 REPORTE DE OPTIMIZACIÓN\n');
        console.log('=' .repeat(60));
        
        console.log(`✅ Índices creados exitosamente: ${this.createdIndexes.length}`);
        this.createdIndexes.forEach(index => {
            console.log(`   - ${index.name} (${index.duration}ms)`);
        });
        
        if (this.errors.length > 0) {
            console.log(`\n❌ Errores encontrados: ${this.errors.length}`);
            this.errors.forEach(error => {
                console.log(`   - ${error.name}: ${error.error}`);
            });
        }
        
        console.log('\n💡 Beneficios esperados:');
        console.log('   - Consultas de disponibilidad: 3-5x más rápidas');
        console.log('   - Dashboard: 2-3x más rápido');
        console.log('   - Búsqueda de reservas: 5-10x más rápida');
        console.log('   - Reportes: 2-4x más rápidos');
        
        // Guardar reporte
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            createdIndexes: this.createdIndexes,
            errors: this.errors,
            summary: {
                totalIndexes: this.createdIndexes.length + this.errors.length,
                successful: this.createdIndexes.length,
                failed: this.errors.length
            }
        };
        
        fs.writeFileSync('./optimization-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📄 Reporte guardado en: optimization-report.json');
    }

    async close() {
        await this.pool.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar optimización
async function main() {
    const optimizer = new DatabaseOptimizer();
    
    try {
        await optimizer.connect();
        await optimizer.createOptimizedIndexes();
        await optimizer.analyzeTableSizes();
        await optimizer.analyzeIndexUsage();
        optimizer.generateReport();
    } catch (error) {
        console.error('❌ Error ejecutando optimización:', error);
    } finally {
        await optimizer.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = DatabaseOptimizer;

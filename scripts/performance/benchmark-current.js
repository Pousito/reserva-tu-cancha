#!/usr/bin/env node

/**
 * Script para medir el rendimiento actual de la base de datos
 * Antes de aplicar optimizaciones
 */

require('dotenv').config();
const { Pool } = require('pg');

class PerformanceBenchmark {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.results = [];
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

    async measureQuery(name, query, params = []) {
        const start = Date.now();
        try {
            const result = await this.pool.query(query, params);
            const duration = Date.now() - start;
            
            const measurement = {
                name,
                duration,
                rows: result.rows.length,
                timestamp: new Date().toISOString()
            };
            
            this.results.push(measurement);
            console.log(`📊 ${name}: ${duration}ms (${result.rows.length} filas)`);
            
            return measurement;
        } catch (error) {
            console.error(`❌ Error en ${name}:`, error.message);
            return { name, error: error.message, duration: -1 };
        }
    }

    async runBenchmarks() {
        console.log('🔍 Iniciando benchmark de rendimiento...\n');

        // 1. Consulta de estadísticas del dashboard (más crítica)
        await this.measureQuery(
            'Dashboard - Estadísticas Generales',
            `
            SELECT 
                COUNT(*) as total_reservas,
                COALESCE(SUM(CASE WHEN estado = 'confirmada' THEN precio_total ELSE 0 END), 0) as ingresos,
                COUNT(DISTINCT cancha_id) as canchas_activas
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE r.estado != 'cancelada'
            `
        );

        // 2. Consulta de reservas por día (últimos 7 días)
        await this.measureQuery(
            'Dashboard - Reservas por Día (7 días)',
            `
            SELECT TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha, COUNT(*) as cantidad 
            FROM reservas r
            WHERE r.fecha >= CURRENT_DATE - INTERVAL '7 days'
            AND r.estado != 'cancelada'
            GROUP BY r.fecha::date
            ORDER BY r.fecha::date
            `
        );

        // 3. Consulta de disponibilidad (más frecuente)
        await this.measureQuery(
            'Disponibilidad - Cancha Específica',
            `
            SELECT hora_inicio, hora_fin 
            FROM reservas 
            WHERE cancha_id = 1 AND fecha = CURRENT_DATE AND estado != 'cancelada'
            ORDER BY hora_inicio
            `
        );

        // 4. Consulta de disponibilidad completa de complejo
        await this.measureQuery(
            'Disponibilidad - Complejo Completo',
            `
            SELECT 
                c.id as cancha_id,
                c.nombre as cancha_nombre,
                c.tipo as cancha_tipo,
                c.precio_hora,
                r.hora_inicio,
                r.hora_fin,
                r.estado
            FROM canchas c
            LEFT JOIN reservas r ON c.id = r.cancha_id 
                AND r.fecha = CURRENT_DATE 
                AND r.estado != 'cancelada'
            WHERE c.complejo_id = 1
            ORDER BY c.id, r.hora_inicio
            `
        );

        // 5. Consulta de reservas recientes
        await this.measureQuery(
            'Reservas Recientes (últimas 5)',
            `
            SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                   r.estado, r.estado_pago, r.created_at,
                   co.nombre as complejo_nombre, can.nombre as cancha_nombre
            FROM reservas r
            JOIN canchas can ON r.cancha_id = can.id
            JOIN complejos co ON can.complejo_id = co.id
            ORDER BY r.created_at DESC LIMIT 5
            `
        );

        // 6. Consulta de reservas de hoy
        await this.measureQuery(
            'Reservas de Hoy',
            `
            SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                   r.estado, r.estado_pago,
                   co.nombre as complejo_nombre, can.nombre as cancha_nombre
            FROM reservas r
            JOIN canchas can ON r.cancha_id = can.id
            JOIN complejos co ON can.complejo_id = co.id
            WHERE r.fecha::date = CURRENT_DATE
            ORDER BY r.hora_inicio
            `
        );

        // 7. Análisis de índices existentes
        await this.measureQuery(
            'Análisis - Índices Existentes',
            `
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname
            `
        );

        // 8. Análisis de tamaño de tablas
        await this.measureQuery(
            'Análisis - Tamaño de Tablas',
            `
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `
        );

        // 9. Análisis de consultas lentas (si está habilitado)
        await this.measureQuery(
            'Análisis - Configuración de Logs',
            `
            SELECT name, setting, unit, context 
            FROM pg_settings 
            WHERE name IN ('log_min_duration_statement', 'log_statement', 'log_line_prefix')
            `
        );
    }

    generateReport() {
        console.log('\n📋 REPORTE DE RENDIMIENTO ACTUAL\n');
        console.log('=' .repeat(60));
        
        const successful = this.results.filter(r => r.duration >= 0);
        const failed = this.results.filter(r => r.duration < 0);
        
        if (successful.length > 0) {
            console.log('\n✅ CONSULTAS EXITOSAS:');
            successful.forEach(result => {
                const status = result.duration > 1000 ? '🐌 LENTA' : 
                              result.duration > 500 ? '⚠️  MODERADA' : '✅ RÁPIDA';
                console.log(`${status} ${result.name}: ${result.duration}ms`);
            });
            
            const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
            console.log(`\n📊 Duración promedio: ${Math.round(avgDuration)}ms`);
            
            const slowQueries = successful.filter(r => r.duration > 500);
            if (slowQueries.length > 0) {
                console.log('\n🐌 CONSULTAS LENTAS (>500ms):');
                slowQueries.forEach(q => console.log(`   - ${q.name}: ${q.duration}ms`));
            }
        }
        
        if (failed.length > 0) {
            console.log('\n❌ CONSULTAS FALLIDAS:');
            failed.forEach(result => console.log(`   - ${result.name}: ${result.error}`));
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('💡 Próximo paso: Crear índices optimizados');
        
        // Guardar resultados en archivo
        const fs = require('fs');
        const reportData = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            results: this.results,
            summary: {
                totalQueries: this.results.length,
                successful: successful.length,
                failed: failed.length,
                averageDuration: successful.length > 0 ? Math.round(successful.reduce((sum, r) => sum + r.duration, 0) / successful.length) : 0,
                slowQueries: 0
            }
        };
        
        fs.writeFileSync('./performance-before.json', JSON.stringify(reportData, null, 2));
        console.log('📄 Reporte guardado en: performance-before.json');
    }

    async close() {
        await this.pool.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar benchmark
async function main() {
    const benchmark = new PerformanceBenchmark();
    
    try {
        await benchmark.connect();
        await benchmark.runBenchmarks();
        benchmark.generateReport();
    } catch (error) {
        console.error('❌ Error ejecutando benchmark:', error);
    } finally {
        await benchmark.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = PerformanceBenchmark;

#!/usr/bin/env node

/**
 * Script para comparar rendimiento antes y después de la optimización
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

class PerformanceComparator {
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

    async measureQuery(name, query, params = [], iterations = 3) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const result = await this.pool.query(query, params);
                const duration = Date.now() - start;
                times.push(duration);
            } catch (error) {
                console.error(`❌ Error en ${name} (iteración ${i + 1}):`, error.message);
                return { name, error: error.message, duration: -1 };
            }
        }
        
        const avgTime = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        const measurement = {
            name,
            avgTime,
            minTime,
            maxTime,
            times,
            iterations,
            timestamp: new Date().toISOString()
        };
        
        this.results.push(measurement);
        console.log(`📊 ${name}: ${avgTime}ms promedio (${minTime}-${maxTime}ms)`);
        
        return measurement;
    }

    async runPerformanceTest() {
        console.log('🔍 Ejecutando test de rendimiento post-optimización...\n');

        // 1. Test de estadísticas del dashboard
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

        // 2. Test de reservas por día
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

        // 3. Test de disponibilidad
        await this.measureQuery(
            'Disponibilidad - Cancha Específica',
            `
            SELECT hora_inicio, hora_fin 
            FROM reservas 
            WHERE cancha_id = 1 AND fecha = CURRENT_DATE AND estado != 'cancelada'
            ORDER BY hora_inicio
            `
        );

        // 4. Test de disponibilidad completa
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

        // 5. Test de reservas recientes
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

        // 6. Test de búsqueda por código
        await this.measureQuery(
            'Búsqueda por Código de Reserva',
            `
            SELECT r.*, c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE r.codigo_reserva = 'TEST1'
            `
        );
    }

    compareWithBefore() {
        console.log('\n📊 COMPARACIÓN DE RENDIMIENTO\n');
        console.log('=' .repeat(60));

        // Cargar datos anteriores
        let beforeData = null;
        try {
            if (fs.existsSync('./performance-before.json')) {
                beforeData = JSON.parse(fs.readFileSync('./performance-before.json', 'utf8'));
                console.log('📄 Datos anteriores cargados desde performance-before.json');
            } else {
                console.log('⚠️  No se encontró performance-before.json');
                console.log('   Ejecuta primero: node scripts/performance/benchmark-current.js');
                return;
            }
        } catch (error) {
            console.error('Error cargando datos anteriores:', error.message);
            return;
        }

        // Comparar resultados
        const improvements = [];
        const regressions = [];
        const noChange = [];

        this.results.forEach(afterResult => {
            const beforeResult = beforeData.results.find(r => r.name === afterResult.name);
            
            if (beforeResult && beforeResult.duration >= 0) {
                const improvement = ((beforeResult.duration - afterResult.avgTime) / beforeResult.duration) * 100;
                const improvementMs = beforeResult.duration - afterResult.avgTime;
                
                const comparison = {
                    name: afterResult.name,
                    before: beforeResult.duration,
                    after: afterResult.avgTime,
                    improvement: Math.round(improvement),
                    improvementMs: Math.round(improvementMs)
                };

                if (improvement > 10) {
                    improvements.push(comparison);
                } else if (improvement < -10) {
                    regressions.push(comparison);
                } else {
                    noChange.push(comparison);
                }
            }
        });

        // Mostrar mejoras
        if (improvements.length > 0) {
            console.log('\n🚀 MEJORAS SIGNIFICATIVAS (>10%):');
            improvements.forEach(imp => {
                const emoji = imp.improvement > 50 ? '🔥' : imp.improvement > 30 ? '⚡' : '✅';
                console.log(`${emoji} ${imp.name}:`);
                console.log(`   Antes: ${imp.before}ms → Después: ${imp.after}ms`);
                console.log(`   Mejora: ${imp.improvement}% (${imp.improvementMs}ms más rápido)\n`);
            });
        }

        // Mostrar regresiones
        if (regressions.length > 0) {
            console.log('\n⚠️  REGRESIONES DETECTADAS:');
            regressions.forEach(reg => {
                console.log(`❌ ${reg.name}:`);
                console.log(`   Antes: ${reg.before}ms → Después: ${reg.after}ms`);
                console.log(`   Regresión: ${Math.abs(reg.improvement)}% (${Math.abs(reg.improvementMs)}ms más lento)\n`);
            });
        }

        // Mostrar sin cambios significativos
        if (noChange.length > 0) {
            console.log('\n➡️  SIN CAMBIOS SIGNIFICATIVOS:');
            noChange.forEach(nc => {
                console.log(`➡️  ${nc.name}: ${nc.before}ms → ${nc.after}ms (${nc.improvement}%)\n`);
            });
        }

        // Resumen general
        const totalImprovement = improvements.reduce((sum, imp) => sum + imp.improvement, 0);
        const avgImprovement = improvements.length > 0 ? totalImprovement / improvements.length : 0;
        
        console.log('📈 RESUMEN GENERAL:');
        console.log(`   ✅ Mejoras: ${improvements.length}`);
        console.log(`   ❌ Regresiones: ${regressions.length}`);
        console.log(`   ➡️  Sin cambios: ${noChange.length}`);
        console.log(`   📊 Mejora promedio: ${Math.round(avgImprovement)}%`);

        // Guardar comparación
        const comparisonData = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            before: beforeData,
            after: {
                results: this.results,
                summary: {
                    totalQueries: this.results.length,
                    averageDuration: Math.round(this.results.reduce((sum, r) => sum + r.avgTime, 0) / this.results.length)
                }
            },
            comparison: {
                improvements,
                regressions,
                noChange,
                summary: {
                    totalImprovements: improvements.length,
                    totalRegressions: regressions.length,
                    averageImprovement: Math.round(avgImprovement)
                }
            }
        };

        fs.writeFileSync('./performance-comparison.json', JSON.stringify(comparisonData, null, 2));
        console.log('\n📄 Comparación guardada en: performance-comparison.json');
    }

    async close() {
        await this.pool.end();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar comparación
async function main() {
    const comparator = new PerformanceComparator();
    
    try {
        await comparator.connect();
        await comparator.runPerformanceTest();
        comparator.compareWithBefore();
    } catch (error) {
        console.error('❌ Error ejecutando comparación:', error);
    } finally {
        await comparator.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = PerformanceComparator;

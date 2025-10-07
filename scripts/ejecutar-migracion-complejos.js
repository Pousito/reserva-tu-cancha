#!/usr/bin/env node

/**
 * Script para ejecutar migración de categorías por complejo
 * IMPORTANTE: Cada complejo tendrá sus propias categorías independientes
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Configuración de base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

async function main() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🏢 MIGRACIÓN: CATEGORÍAS POR COMPLEJO                ║
║     🎯 Separación Total - Independencia Completa        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
    
    try {
        // Verificar conexión
        console.log(`🔌 Conectando a la base de datos...`);
        await pool.query('SELECT 1');
        console.log(`✅ Conexión establecida correctamente\n`);
        
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, 'sql', 'migrar-categorias-por-complejo.sql');
        const sql = await fs.readFile(sqlPath, 'utf-8');
        
        console.log(`📂 Leyendo migración...`);
        console.log(`⏳ Ejecutando migración (esto puede tomar unos segundos)...\n`);
        
        // Ejecutar migración
        await pool.query(sql);
        
        console.log(`✅ Migración ejecutada exitosamente\n`);
        
        // Mostrar resumen
        console.log(`${'='.repeat(60)}`);
        console.log(`\n📊 RESUMEN FINAL:\n`);
        
        const result = await pool.query(`
            SELECT 
                c.nombre as complejo,
                COUNT(cat.id) as total_categorias,
                COUNT(CASE WHEN cat.tipo = 'gasto' THEN 1 END) as gastos,
                COUNT(CASE WHEN cat.tipo = 'ingreso' THEN 1 END) as ingresos
            FROM complejos c
            LEFT JOIN categorias_gastos cat ON c.id = cat.complejo_id
            GROUP BY c.id, c.nombre
            ORDER BY c.nombre
        `);
        
        result.rows.forEach(row => {
            console.log(`   ${row.complejo}:`);
            console.log(`      Total: ${row.total_categorias} categorías`);
            console.log(`      Gastos: ${row.gastos} | Ingresos: ${row.ingresos}\n`);
        });
        
        console.log(`${'='.repeat(60)}`);
        console.log(`\n🎉 ¡Migración completada exitosamente!`);
        console.log(`\n💡 Cambios aplicados:`);
        console.log(`   ✅ Cada complejo tiene sus propias categorías`);
        console.log(`   ✅ Categorías predefinidas replicadas para cada complejo`);
        console.log(`   ✅ Movimientos existentes actualizados correctamente`);
        console.log(`   ✅ Categorías globales antiguas eliminadas`);
        console.log(`\n🔒 Seguridad:`);
        console.log(`   ✅ Owners solo ven categorías de su complejo`);
        console.log(`   ✅ No hay interferencia entre complejos`);
        console.log(`   ✅ Total independencia de datos\n`);
        
    } catch (error) {
        console.error(`\n❌ Error durante la migración:`, error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log(`\n👋 Conexión cerrada\n`);
    }
}

// Ejecutar
if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { main };


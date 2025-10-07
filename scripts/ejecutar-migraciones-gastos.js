#!/usr/bin/env node

/**
 * Script para ejecutar migraciones de Control de Gastos
 * 1. Actualiza categorías a términos chilenos simples
 * 2. Configura sincronización automática de reservas → ingresos
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

async function ejecutarSQL(nombreArchivo, descripcion) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${descripcion}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
        const rutaSQL = path.join(__dirname, 'sql', nombreArchivo);
        const sql = await fs.readFile(rutaSQL, 'utf-8');
        
        console.log(`📂 Leyendo: ${nombreArchivo}`);
        console.log(`⏳ Ejecutando migracion...`);
        
        const resultado = await pool.query(sql);
        
        console.log(`✅ Migración ejecutada exitosamente`);
        console.log(`📊 Filas afectadas: ${resultado.rowCount || 'N/A'}`);
        
        return true;
    } catch (error) {
        console.error(`❌ Error al ejecutar migración:`, error.message);
        console.error(`💡 Detalle:`, error.detail || 'No disponible');
        return false;
    }
}

async function main() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🏢 MIGRACIONES - CONTROL DE GASTOS                   ║
║     📊 Sistema de gestión financiera para complejos      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
    
    try {
        // Verificar conexión
        console.log(`🔌 Conectando a la base de datos...`);
        await pool.query('SELECT 1');
        console.log(`✅ Conexión establecida correctamente\n`);
        
        // 1. Actualizar categorías
        const categoriaExitosa = await ejecutarSQL(
            'actualizar-categorias-chile.sql',
            'Actualizar categorías a términos chilenos simples'
        );
        
        if (!categoriaExitosa) {
            console.log(`⚠️  Advertencia: Error en categorías, pero continuando...`);
        }
        
        // 2. Configurar sincronización de reservas
        const sincronizacionExitosa = await ejecutarSQL(
            'sincronizar-reservas-ingresos.sql',
            'Configurar sincronización automática Reservas → Ingresos'
        );
        
        if (!sincronizacionExitosa) {
            console.log(`⚠️  Advertencia: Error en sincronización`);
        }
        
        // Resumen final
        console.log(`\n${'='.repeat(60)}`);
        console.log(`\n📊 RESUMEN DE MIGRACIONES:`);
        console.log(`   ${categoriaExitosa ? '✅' : '❌'} Categorías actualizadas`);
        console.log(`   ${sincronizacionExitosa ? '✅' : '❌'} Sincronización configurada`);
        
        if (categoriaExitosa && sincronizacionExitosa) {
            console.log(`\n🎉 ¡Todas las migraciones completadas exitosamente!`);
            console.log(`\n💡 Próximos pasos:`);
            console.log(`   1. Las nuevas categorías ya están disponibles`);
            console.log(`   2. Las reservas confirmadas generarán ingresos automáticamente`);
            console.log(`   3. Se registrará la comisión real (3.5% o 1.75% + IVA) como gasto`);
            console.log(`   4. Si se cancela una reserva, se eliminan los registros automáticamente`);
        } else {
            console.log(`\n⚠️  Algunas migraciones tuvieron problemas. Revisa los errores arriba.`);
        }
        
        console.log(`\n${'='.repeat(60)}\n`);
        
    } catch (error) {
        console.error(`\n❌ Error fatal:`, error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
        console.log(`\n👋 Conexión cerrada\n`);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = { ejecutarSQL };


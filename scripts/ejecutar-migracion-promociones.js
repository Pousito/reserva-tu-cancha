const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false // Desarrollo local
});

async function ejecutarMigracion() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Iniciando migración de sistema de promociones...\n');
        
        // Leer archivo SQL
        const sqlPath = path.join(__dirname, 'sql', 'crear-tabla-promociones.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 Ejecutando script SQL...');
        await client.query(sql);
        
        console.log('\n✅ Migración completada exitosamente!\n');
        console.log('📋 Resumen:');
        console.log('   ✓ Tabla promociones_canchas creada');
        console.log('   ✓ Índices optimizados agregados');
        console.log('   ✓ Triggers de timestamp configurados');
        console.log('   ✓ Validaciones a nivel de base de datos activas\n');
        
        // Verificar estructura
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'promociones_canchas'
            ORDER BY ordinal_position;
        `);
        
        console.log('📊 Estructura de la tabla promociones_canchas:');
        result.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
        });
        
        console.log('\n💡 Próximos pasos:');
        console.log('   1. Backend: Implementar endpoints CRUD para promociones');
        console.log('   2. Frontend: Crear UI en admin-courts para gestionar promociones');
        console.log('   3. Integración: Modificar endpoint de canchas para aplicar precios promocionales');
        console.log('   4. Testing: Probar diferentes combinaciones de fechas y horarios\n');
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar
ejecutarMigracion().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
});


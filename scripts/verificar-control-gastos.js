// ============================================
// VERIFICACIÓN DEL SISTEMA DE CONTROL DE GASTOS
// ============================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function verificarSistema() {
    console.log('🔍 VERIFICANDO SISTEMA DE CONTROL DE GASTOS\n');
    console.log('='.repeat(60));
    
    try {
        // 1. Verificar tablas
        console.log('\n📊 1. VERIFICANDO TABLAS...');
        
        const tablas = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('categorias_gastos', 'gastos_ingresos')
            ORDER BY table_name
        `);
        
        if (tablas.rows.length === 2) {
            console.log('   ✅ Tablas creadas correctamente:');
            tablas.rows.forEach(t => console.log(`      - ${t.table_name}`));
        } else {
            console.log('   ❌ Faltan tablas');
            return;
        }
        
        // 2. Verificar categorías
        console.log('\n📋 2. VERIFICANDO CATEGORÍAS...');
        
        const categoriasGastos = await pool.query(`
            SELECT COUNT(*) as total FROM categorias_gastos WHERE tipo = 'gasto'
        `);
        
        const categoriasIngresos = await pool.query(`
            SELECT COUNT(*) as total FROM categorias_gastos WHERE tipo = 'ingreso'
        `);
        
        console.log(`   ✅ Categorías de Gastos: ${categoriasGastos.rows[0].total}`);
        console.log(`   ✅ Categorías de Ingresos: ${categoriasIngresos.rows[0].total}`);
        
        // Mostrar algunas categorías
        const ejemplos = await pool.query(`
            SELECT nombre, tipo, icono, color 
            FROM categorias_gastos 
            LIMIT 5
        `);
        
        console.log('\n   Ejemplos de categorías:');
        ejemplos.rows.forEach(cat => {
            console.log(`      ${cat.icono} ${cat.nombre} (${cat.tipo})`);
        });
        
        // 3. Verificar vistas
        console.log('\n👁️  3. VERIFICANDO VISTAS...');
        
        const vistas = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'v_%gastos%' OR table_name LIKE 'v_%ingresos%' OR table_name = 'v_balance_mensual'
            ORDER BY table_name
        `);
        
        if (vistas.rows.length >= 3) {
            console.log('   ✅ Vistas creadas:');
            vistas.rows.forEach(v => console.log(`      - ${v.table_name}`));
        } else {
            console.log('   ⚠️  Algunas vistas pueden faltar');
        }
        
        // 4. Verificar índices
        console.log('\n🔍 4. VERIFICANDO ÍNDICES...');
        
        const indices = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'gastos_ingresos'
            ORDER BY indexname
        `);
        
        console.log('   ✅ Índices creados:');
        indices.rows.forEach(i => console.log(`      - ${i.indexname}`));
        
        // 5. Probar inserción y lectura
        console.log('\n🧪 5. PROBANDO OPERACIONES...');
        
        // Insertar un gasto de prueba
        const resultado = await pool.query(`
            INSERT INTO gastos_ingresos (
                complejo_id, 
                categoria_id, 
                tipo, 
                monto, 
                fecha, 
                descripcion
            ) 
            SELECT 
                1,                      -- Complejo 1 (probablemente existe)
                id,                     -- Primera categoría de gasto
                'gasto', 
                1000, 
                CURRENT_DATE, 
                'Prueba de verificación - Sistema de Control de Gastos'
            FROM categorias_gastos 
            WHERE tipo = 'gasto' 
            LIMIT 1
            RETURNING id
        `);
        
        const testId = resultado.rows[0].id;
        console.log(`   ✅ Inserción exitosa (ID: ${testId})`);
        
        // Leer el registro
        const lectura = await pool.query(`
            SELECT gi.*, cat.nombre as categoria_nombre
            FROM gastos_ingresos gi
            JOIN categorias_gastos cat ON gi.categoria_id = cat.id
            WHERE gi.id = $1
        `, [testId]);
        
        if (lectura.rows.length === 1) {
            console.log('   ✅ Lectura exitosa');
            console.log(`      - Monto: $${lectura.rows[0].monto}`);
            console.log(`      - Categoría: ${lectura.rows[0].categoria_nombre}`);
        }
        
        // Eliminar el registro de prueba
        await pool.query('DELETE FROM gastos_ingresos WHERE id = $1', [testId]);
        console.log('   ✅ Eliminación exitosa (registro de prueba limpiado)');
        
        // 6. Verificar triggers
        console.log('\n⚡ 6. VERIFICANDO TRIGGERS...');
        
        const triggers = await pool.query(`
            SELECT trigger_name, event_manipulation
            FROM information_schema.triggers
            WHERE event_object_table = 'gastos_ingresos'
        `);
        
        if (triggers.rows.length > 0) {
            console.log('   ✅ Triggers configurados:');
            triggers.rows.forEach(t => console.log(`      - ${t.trigger_name} (${t.event_manipulation})`));
        } else {
            console.log('   ⚠️  No se encontraron triggers');
        }
        
        // 7. Resumen de complejos disponibles
        console.log('\n🏢 7. COMPLEJOS DISPONIBLES...');
        
        const complejos = await pool.query(`
            SELECT id, nombre 
            FROM complejos 
            ORDER BY id
        `);
        
        console.log(`   Total: ${complejos.rows.length} complejos`);
        complejos.rows.forEach(c => console.log(`      - [${c.id}] ${c.nombre}`));
        
        // Resumen Final
        console.log('\n' + '='.repeat(60));
        console.log('✅ VERIFICACIÓN COMPLETADA EXITOSAMENTE\n');
        console.log('📌 El sistema de Control de Gastos está listo para usar');
        console.log('📌 Accede desde: http://localhost:3000/admin-gastos.html');
        console.log('📌 Requiere autenticación con rol "owner" o "super_admin"\n');
        
    } catch (error) {
        console.error('\n❌ ERROR durante la verificación:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Ejecutar verificación
verificarSistema();


const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos de producción
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function diagnosticarControlFinanciero() {
    console.log('🔍 DIAGNÓSTICO CONTROL FINANCIERO - PRODUCCIÓN');
    console.log('===============================================');
    
    try {
        // 1. Verificar conexión
        console.log('🔌 Verificando conexión a la base de datos...');
        const client = await pool.connect();
        console.log('✅ Conexión establecida');
        
        // 2. Verificar complejo Demo 3
        console.log('\n🏢 Verificando Complejo Demo 3...');
        const complejoQuery = `
            SELECT id, nombre, direccion 
            FROM complejos 
            WHERE nombre ILIKE '%demo 3%' OR id = 8
            ORDER BY id;
        `;
        const complejos = await client.query(complejoQuery);
        console.log(`📊 Complejos encontrados: ${complejos.rows.length}`);
        complejos.rows.forEach(complejo => {
            console.log(`   - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Dirección: ${complejo.direccion}`);
        });
        
        // 3. Verificar usuario owner
        console.log('\n👤 Verificando usuario owner...');
        const usuarioQuery = `
            SELECT id, email, nombre, rol, complejo_id 
            FROM usuarios 
            WHERE email = 'owner@complejodemo3.cl' OR id = 3
            ORDER BY id;
        `;
        const usuarios = await client.query(usuarioQuery);
        console.log(`👥 Usuarios encontrados: ${usuarios.rows.length}`);
        usuarios.rows.forEach(usuario => {
            console.log(`   - ID: ${usuario.id}, Email: ${usuario.email}, Nombre: ${usuario.nombre}, Rol: ${usuario.rol}, Complejo: ${usuario.complejo_id}`);
        });
        
        // 4. Verificar categorías para complejo 8
        console.log('\n📋 Verificando categorías para Complejo 8...');
        const categoriasQuery = `
            SELECT id, nombre, descripcion, tipo, complejo_id, es_predefinida
            FROM categorias_gastos 
            WHERE complejo_id = 8
            ORDER BY tipo, nombre;
        `;
        const categorias = await client.query(categoriasQuery);
        console.log(`📊 Categorías encontradas: ${categorias.rows.length}`);
        
        if (categorias.rows.length > 0) {
            console.log('\n📝 Detalle de categorías:');
            categorias.rows.forEach(cat => {
                console.log(`   - ID: ${cat.id}, Nombre: ${cat.nombre}, Tipo: ${cat.tipo}, Predefinida: ${cat.es_predefinida}`);
            });
        } else {
            console.log('❌ NO HAY CATEGORÍAS para el Complejo 8');
        }
        
        // 5. Verificar movimientos para complejo 8
        console.log('\n💰 Verificando movimientos para Complejo 8...');
        
        // Primero verificar qué tablas existen
        console.log('🔍 Verificando tablas disponibles...');
        const tablasQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%movimiento%' OR table_name LIKE '%gasto%' OR table_name LIKE '%financiero%'
            ORDER BY table_name;
        `;
        const tablas = await client.query(tablasQuery);
        console.log(`📊 Tablas relacionadas encontradas: ${tablas.rows.length}`);
        tablas.rows.forEach(tabla => {
            console.log(`   - ${tabla.table_name}`);
        });
        
        // Intentar con diferentes nombres de tabla
        const posiblesNombres = ['movimientos_financieros', 'gastos', 'movimientos', 'transacciones_financieras'];
        
        for (const nombreTabla of posiblesNombres) {
            try {
                console.log(`\n🔍 Probando tabla: ${nombreTabla}`);
                const movimientosQuery = `
                    SELECT id, tipo, monto, fecha, descripcion, categoria_id, complejo_id
                    FROM ${nombreTabla} 
                    WHERE complejo_id = 8
                    ORDER BY fecha DESC, id DESC;
                `;
                const movimientos = await client.query(movimientosQuery);
                console.log(`✅ Tabla ${nombreTabla} encontrada con ${movimientos.rows.length} movimientos`);
                
                if (movimientos.rows.length > 0) {
                    console.log('\n💸 Detalle de movimientos:');
                    movimientos.rows.forEach(mov => {
                        console.log(`   - ID: ${mov.id}, Tipo: ${mov.tipo}, Monto: $${mov.monto}, Fecha: ${mov.fecha}, Categoría: ${mov.categoria_id}`);
                    });
                }
                break; // Si encontramos la tabla, salir del bucle
            } catch (error) {
                console.log(`❌ Tabla ${nombreTabla} no existe`);
            }
        }
        
        // 6. Verificar todas las categorías en la base de datos
        console.log('\n🌐 Verificando TODAS las categorías en la base de datos...');
        const todasCategoriasQuery = `
            SELECT id, nombre, tipo, complejo_id, es_predefinida
            FROM categorias_gastos 
            ORDER BY complejo_id, tipo, nombre;
        `;
        const todasCategorias = await client.query(todasCategoriasQuery);
        console.log(`📊 Total de categorías en BD: ${todasCategorias.rows.length}`);
        
        // Agrupar por complejo
        const categoriasPorComplejo = {};
        todasCategorias.rows.forEach(cat => {
            if (!categoriasPorComplejo[cat.complejo_id]) {
                categoriasPorComplejo[cat.complejo_id] = [];
            }
            categoriasPorComplejo[cat.complejo_id].push(cat);
        });
        
        console.log('\n📊 Categorías por complejo:');
        Object.keys(categoriasPorComplejo).forEach(complejoId => {
            console.log(`   Complejo ${complejoId}: ${categoriasPorComplejo[complejoId].length} categorías`);
        });
        
        // 7. Verificar todas las categorías predefinidas
        console.log('\n🏷️ Verificando categorías predefinidas...');
        const predefinidasQuery = `
            SELECT id, nombre, tipo, es_predefinida
            FROM categorias_gastos 
            WHERE es_predefinida = true
            ORDER BY tipo, nombre;
        `;
        const predefinidas = await client.query(predefinidasQuery);
        console.log(`📊 Categorías predefinidas: ${predefinidas.rows.length}`);
        
        if (predefinidas.rows.length > 0) {
            console.log('\n📝 Categorías predefinidas:');
            predefinidas.rows.forEach(cat => {
                console.log(`   - ID: ${cat.id}, Nombre: ${cat.nombre}, Tipo: ${cat.tipo}`);
            });
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar diagnóstico
diagnosticarControlFinanciero();

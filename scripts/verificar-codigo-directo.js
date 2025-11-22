#!/usr/bin/env node

/**
 * Script para verificar directamente en la base de datos el código BASTIANCABRERA5MIL
 */

process.env.NODE_ENV = 'production';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

async function verificarCodigo() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🔌 Conectando a base de datos...');
        const client = await pool.connect();
        console.log('✅ Conectado\n');

        const codigo = 'BASTIANCABRERA5MIL';

        // Verificar si la tabla existe
        const tablaExiste = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'codigos_unico_uso'
            )
        `);
        console.log('📊 Tabla codigos_unico_uso existe:', tablaExiste.rows[0].exists);

        if (!tablaExiste.rows[0].exists) {
            console.log('❌ La tabla no existe');
            return;
        }

        // Buscar el código exacto
        console.log(`\n🔍 Buscando código exacto: "${codigo}"`);
        const resultadoExacto = await client.query(`
            SELECT * FROM codigos_unico_uso 
            WHERE codigo = $1
        `, [codigo]);
        console.log(`📦 Resultados (búsqueda exacta): ${resultadoExacto.rows.length}`);
        if (resultadoExacto.rows.length > 0) {
            console.log('✅ Código encontrado:', resultadoExacto.rows[0]);
        }

        // Buscar el código en mayúsculas
        console.log(`\n🔍 Buscando código en mayúsculas: "${codigo.toUpperCase()}"`);
        const resultadoUpper = await client.query(`
            SELECT * FROM codigos_unico_uso 
            WHERE codigo = $1
        `, [codigo.toUpperCase()]);
        console.log(`📦 Resultados (mayúsculas): ${resultadoUpper.rows.length}`);
        if (resultadoUpper.rows.length > 0) {
            console.log('✅ Código encontrado:', resultadoUpper.rows[0]);
        }

        // Buscar todos los códigos
        console.log(`\n🔍 Buscando todos los códigos en la tabla:`);
        const todosLosCodigos = await client.query(`
            SELECT codigo, email_cliente, usado, monto_descuento, LENGTH(codigo) as longitud
            FROM codigos_unico_uso
        `);
        console.log(`📦 Total de códigos: ${todosLosCodigos.rows.length}`);
        todosLosCodigos.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. Código: "${row.codigo}" (longitud: ${row.longitud}), Email: ${row.email_cliente}, Usado: ${row.usado}, Descuento: $${row.monto_descuento}`);
        });

        // Buscar con LIKE
        console.log(`\n🔍 Buscando código con LIKE "%BASTIAN%"`);
        const resultadoLike = await client.query(`
            SELECT * FROM codigos_unico_uso 
            WHERE codigo LIKE $1
        `, [`%BASTIAN%`]);
        console.log(`📦 Resultados (LIKE): ${resultadoLike.rows.length}`);
        if (resultadoLike.rows.length > 0) {
            resultadoLike.rows.forEach(row => {
                console.log('✅ Código encontrado:', row);
            });
        }

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

verificarCodigo()
    .then(() => {
        console.log('\n✅ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script falló:', error);
        process.exit(1);
    });


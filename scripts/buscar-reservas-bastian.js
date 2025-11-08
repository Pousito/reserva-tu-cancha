#!/usr/bin/env node

/**
 * Script para buscar reservas de Bastián y luego permitir modificaciones
 */

const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    process.exit(1);
}

async function buscarReservasBastian() {
    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    let client = null;
    
    try {
        console.log('🔌 Conectando a base de datos de producción...');
        client = await pool.connect();
        console.log('✅ Conectado');
        
        // Buscar reservas de Bastián
        console.log('\n🔍 Buscando reservas de Bastián Cabrera...');
        const result = await client.query(`
            SELECT r.id, r.codigo_reserva, r.nombre_cliente, r.email_cliente,
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.precio_total, r.porcentaje_pagado,
                   r.estado, r.estado_pago,
                   TO_CHAR(r.fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_creacion,
                   c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE LOWER(r.nombre_cliente) LIKE '%basti%' 
               OR LOWER(r.nombre_cliente) LIKE '%cabrera%'
               OR LOWER(r.email_cliente) LIKE '%basti%'
               OR LOWER(r.email_cliente) LIKE '%eliecer%'
            ORDER BY r.fecha_creacion DESC
            LIMIT 20
        `);
        
        if (result.rows && result.rows.length > 0) {
            console.log(`\n📋 Encontradas ${result.rows.length} reservas de Bastián:`);
            console.log('═══════════════════════════════════════════════════════');
            result.rows.forEach((r, i) => {
                console.log(`\n${i + 1}. Código: ${r.codigo_reserva}`);
                console.log(`   Cliente: ${r.nombre_cliente}`);
                console.log(`   Email: ${r.email_cliente}`);
                console.log(`   Complejo: ${r.complejo_nombre}`);
                console.log(`   Cancha: ${r.cancha_nombre}`);
                console.log(`   Fecha: ${r.fecha}`);
                console.log(`   Horario: ${r.hora_inicio} - ${r.hora_fin}`);
                console.log(`   Precio Total: $${r.precio_total}`);
                console.log(`   Porcentaje Pagado: ${r.porcentaje_pagado || 100}%`);
                console.log(`   Estado: ${r.estado}`);
                console.log(`   Estado Pago: ${r.estado_pago}`);
                console.log(`   Fecha Creación: ${r.fecha_creacion}`);
            });
            console.log('\n═══════════════════════════════════════════════════════');
        } else {
            console.log('❌ No se encontraron reservas de Bastián');
        }
        
        // También buscar específicamente VIZJ4P con diferentes variaciones
        console.log('\n🔍 Buscando específicamente VIZJ4P con diferentes variaciones...');
        const codigosBuscar = ['VIZJ4P', 'vizj4p', 'Vizj4p', 'VIZj4p'];
        
        for (const codigo of codigosBuscar) {
            const resultCodigo = await client.query(`
                SELECT r.id, r.codigo_reserva, r.nombre_cliente, r.email_cliente,
                       TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                       r.hora_inicio, r.hora_fin, r.precio_total, r.porcentaje_pagado,
                       r.estado, r.estado_pago,
                       c.nombre as cancha_nombre, co.nombre as complejo_nombre
                FROM reservas r
                JOIN canchas c ON r.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                WHERE r.codigo_reserva = $1
            `, [codigo]);
            
            if (resultCodigo.rows && resultCodigo.rows.length > 0) {
                const reserva = resultCodigo.rows[0];
                console.log(`\n✅ Reserva encontrada con código: ${codigo}`);
                console.log('═══════════════════════════════════════════════════════');
                console.log(`ID: ${reserva.id}`);
                console.log(`Código: ${reserva.codigo_reserva}`);
                console.log(`Cliente: ${reserva.nombre_cliente}`);
                console.log(`Email: ${reserva.email_cliente}`);
                console.log(`Complejo: ${reserva.complejo_nombre}`);
                console.log(`Cancha: ${reserva.cancha_nombre}`);
                console.log(`Fecha: ${reserva.fecha}`);
                console.log(`Horario: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
                console.log(`Precio Total: $${reserva.precio_total}`);
                console.log(`Porcentaje Pagado: ${reserva.porcentaje_pagado || 100}%`);
                console.log(`Estado: ${reserva.estado}`);
                console.log(`Estado Pago: ${reserva.estado_pago}`);
                console.log('═══════════════════════════════════════════════════════');
                return reserva;
            }
        }
        
        console.log('\n💡 Si la reserva existe pero no aparece, puede ser que:');
        console.log('   1. El código sea diferente');
        console.log('   2. La reserva aún no se haya creado');
        console.log('   3. Esté en otra base de datos');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
    }
}

buscarReservasBastian()
    .then(() => {
        console.log('\n✅ Búsqueda completada');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Proceso falló:', error);
        process.exit(1);
    });


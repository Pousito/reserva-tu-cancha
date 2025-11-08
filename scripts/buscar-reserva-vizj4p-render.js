#!/usr/bin/env node

/**
 * Script para buscar y modificar la reserva VIZJ4P en Render
 * Usa DATABASE_URL de las variables de entorno
 */

const { Pool } = require('pg');
require('dotenv').config();

// Usar DATABASE_URL de las variables de entorno (debe estar configurada con la URL de Render)
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está configurado');
    console.log('💡 Necesitas configurar DATABASE_URL con la URL de Render');
    console.log('   Puedes obtenerla desde el dashboard de Render');
    process.exit(1);
}

async function buscarYMostrarReserva() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    let client = null;
    
    try {
        console.log('🔌 Conectando a base de datos...');
        console.log('🔗 URL:', DATABASE_URL.includes('render.com') ? 'Render' : DATABASE_URL.includes('neon') ? 'Neon' : 'Otro');
        client = await pool.connect();
        console.log('✅ Conectado');
        
        // Buscar la reserva VIZJ4P
        console.log('\n🔍 Buscando reserva VIZJ4P...');
        const result = await client.query(`
            SELECT r.id, r.cancha_id, r.nombre_cliente, r.email_cliente,
                   r.telefono_cliente, r.rut_cliente,
                   TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
                   r.hora_inicio, r.hora_fin, r.precio_total, r.codigo_reserva,
                   r.porcentaje_pagado, r.estado, r.estado_pago,
                   r.fecha_creacion, r.tipo_reserva, r.comision_aplicada,
                   c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre, co.id as complejo_id
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            WHERE UPPER(r.codigo_reserva) = UPPER($1)
        `, ['VIZJ4P']);
        
        if (!result.rows || result.rows.length === 0) {
            console.error('❌ Reserva VIZJ4P no encontrada');
            
            // Buscar reservas recientes para debug
            console.log('\n🔍 Buscando reservas recientes...');
            const recientes = await client.query(`
                SELECT codigo_reserva, nombre_cliente, email_cliente, precio_total, porcentaje_pagado,
                       TO_CHAR(fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') as fecha_creacion
                FROM reservas
                ORDER BY fecha_creacion DESC
                LIMIT 20
            `);
            
            console.log(`\n📋 Últimas ${recientes.rows.length} reservas:`);
            recientes.rows.forEach((r, i) => {
                console.log(`${i + 1}. ${r.codigo_reserva} - ${r.nombre_cliente} - $${r.precio_total} (${r.porcentaje_pagado || 100}%) - ${r.fecha_creacion}`);
            });
            
            return null;
        }
        
        const reserva = result.rows[0];
        
        console.log('\n✅ Reserva encontrada:');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`ID: ${reserva.id}`);
        console.log(`Código: ${reserva.codigo_reserva}`);
        console.log(`Cliente: ${reserva.nombre_cliente}`);
        console.log(`Email: ${reserva.email_cliente}`);
        console.log(`Teléfono: ${reserva.telefono_cliente || 'No especificado'}`);
        console.log(`RUT: ${reserva.rut_cliente || 'No especificado'}`);
        console.log(`Complejo ID: ${reserva.complejo_id}`);
        console.log(`Complejo: ${reserva.complejo_nombre}`);
        console.log(`Cancha ID: ${reserva.cancha_id}`);
        console.log(`Cancha: ${reserva.cancha_nombre} (${reserva.tipo})`);
        console.log(`Fecha: ${reserva.fecha}`);
        console.log(`Horario: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
        console.log(`Precio Total: $${reserva.precio_total}`);
        console.log(`Porcentaje Pagado: ${reserva.porcentaje_pagado || 100}%`);
        console.log(`Estado: ${reserva.estado}`);
        console.log(`Estado Pago: ${reserva.estado_pago}`);
        console.log(`Tipo Reserva: ${reserva.tipo_reserva || 'No especificado'}`);
        console.log(`Comisión Aplicada: $${reserva.comision_aplicada || 0}`);
        console.log(`Fecha Creación: ${reserva.fecha_creacion}`);
        console.log('═══════════════════════════════════════════════════════');
        
        return reserva;
        
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

buscarYMostrarReserva()
    .then((reserva) => {
        if (reserva) {
            console.log('\n✅ Reserva encontrada y lista para modificar');
            console.log('💡 Ahora puedes indicar qué campos quieres modificar');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Proceso falló:', error);
        process.exit(1);
    });


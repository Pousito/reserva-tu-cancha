#!/usr/bin/env node

/**
 * Script para verificar el estado detallado de las reservas en producción
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkReservationsDetailed() {
    console.log('🔍 VERIFICACIÓN DETALLADA DE RESERVAS EN PRODUCCIÓN');
    console.log('=================================================');
    
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no está configurado');
        return;
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        const client = await pool.connect();
        
        // Verificar conteo total de reservas
        const totalReservas = await client.query('SELECT COUNT(*) as count FROM reservas');
        console.log(`📊 Total de reservas: ${totalReservas.rows[0].count}`);
        
        // Verificar reservas por fecha
        const reservasPorFecha = await client.query(`
            SELECT fecha, COUNT(*) as count 
            FROM reservas 
            GROUP BY fecha 
            ORDER BY fecha DESC 
            LIMIT 10
        `);
        
        console.log('\n📅 Reservas por fecha (últimas 10):');
        reservasPorFecha.rows.forEach(row => {
            console.log(`   - ${row.fecha}: ${row.count} reservas`);
        });
        
        // Verificar reservas por cancha
        const reservasPorCancha = await client.query(`
            SELECT c.nombre as cancha, co.nombre as complejo, COUNT(*) as count
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            GROUP BY c.id, c.nombre, co.nombre
            ORDER BY count DESC
        `);
        
        console.log('\n🏟️ Reservas por cancha:');
        reservasPorCancha.rows.forEach(row => {
            console.log(`   - ${row.cancha} (${row.complejo}): ${row.count} reservas`);
        });
        
        // Verificar reservas recientes
        const reservasRecientes = await client.query(`
            SELECT r.id, r.codigo_reserva, r.nombre_cliente, r.fecha, r.hora_inicio,
                   c.nombre as cancha, co.nombre as complejo
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            ORDER BY r.created_at DESC
            LIMIT 5
        `);
        
        console.log('\n🕒 Últimas 5 reservas:');
        reservasRecientes.rows.forEach(row => {
            console.log(`   - ${row.codigo_reserva}: ${row.nombre_cliente} - ${row.cancha} (${row.complejo}) - ${row.fecha} ${row.hora_inicio}`);
        });
        
        // Verificar si hay reservas duplicadas
        const reservasDuplicadas = await client.query(`
            SELECT codigo_reserva, COUNT(*) as count
            FROM reservas
            GROUP BY codigo_reserva
            HAVING COUNT(*) > 1
        `);
        
        if (reservasDuplicadas.rows.length > 0) {
            console.log('\n⚠️ RESERVAS DUPLICADAS DETECTADAS:');
            reservasDuplicadas.rows.forEach(row => {
                console.log(`   - Código ${row.codigo_reserva}: ${row.count} veces`);
            });
        } else {
            console.log('\n✅ No se encontraron reservas duplicadas');
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error verificando reservas:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    checkReservationsDetailed();
}

module.exports = { checkReservationsDetailed };

#!/usr/bin/env node

/**
 * Script para verificar consistencia de fechas en producción
 * Verifica que las fechas se manejen correctamente en todo el flujo
 */

require('dotenv').config({ path: './.env' });
const DatabaseManager = require('../../src/config/database');
const db = new DatabaseManager();

async function checkDateConsistency() {
    try {
        await db.connect();
        console.log('🔍 VERIFICANDO CONSISTENCIA DE FECHAS EN PRODUCCIÓN');
        console.log('================================================');
        
        // 1. Verificar zona horaria del servidor
        console.log('\n📅 INFORMACIÓN DE ZONA HORARIA:');
        const timezoneQuery = await db.query('SELECT NOW() as server_time, CURRENT_TIME as current_time, CURRENT_DATE as current_date');
        console.log('⏰ Hora del servidor:', timezoneQuery[0].server_time);
        console.log('⏰ Hora actual:', timezoneQuery[0].current_time);
        console.log('📅 Fecha actual:', timezoneQuery[0].current_date);
        
        // 2. Verificar reservas recientes
        console.log('\n📋 RESERVAS RECIENTES (últimas 5):');
        const recentReservations = await db.query(`
            SELECT 
                id,
                codigo_reserva,
                fecha,
                hora_inicio,
                hora_fin,
                nombre_cliente,
                created_at,
                DATE(fecha) as fecha_solo
            FROM reservas 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        recentReservations.forEach((reserva, index) => {
            console.log(`\n${index + 1}. Reserva ${reserva.codigo_reserva}:`);
            console.log(`   - Fecha en BD: ${reserva.fecha}`);
            console.log(`   - Fecha solo: ${reserva.fecha_solo}`);
            console.log(`   - Hora inicio: ${reserva.hora_inicio}`);
            console.log(`   - Hora fin: ${reserva.hora_fin}`);
            console.log(`   - Creada: ${reserva.created_at}`);
        });
        
        // 3. Verificar bloqueos temporales
        console.log('\n🔒 BLOQUEOS TEMPORALES ACTIVOS:');
        const activeBlocks = await db.query(`
            SELECT 
                id,
                cancha_id,
                fecha,
                hora_inicio,
                hora_fin,
                session_id,
                expira_en,
                created_at
            FROM bloqueos_temporales 
            WHERE expira_en > NOW()
            ORDER BY created_at DESC
            LIMIT 3
        `);
        
        if (activeBlocks.length > 0) {
            activeBlocks.forEach((block, index) => {
                console.log(`\n${index + 1}. Bloqueo ${block.id}:`);
                console.log(`   - Fecha: ${block.fecha}`);
                console.log(`   - Hora: ${block.hora_inicio} - ${block.hora_fin}`);
                console.log(`   - Session: ${block.session_id}`);
                console.log(`   - Expira: ${block.expira_en}`);
            });
        } else {
            console.log('   No hay bloqueos temporales activos');
        }
        
        // 4. Simular creación de reserva de prueba
        console.log('\n🧪 SIMULANDO CREACIÓN DE RESERVA:');
        const testDate = '2025-09-15';
        const testTime = '16:00';
        const testTimeEnd = '17:00';
        
        console.log(`   - Fecha de prueba: ${testDate}`);
        console.log(`   - Hora de prueba: ${testTime} - ${testTimeEnd}`);
        
        // Verificar disponibilidad para la fecha de prueba
        const availability = await db.query(`
            SELECT 
                r.fecha,
                r.hora_inicio,
                r.hora_fin,
                r.codigo_reserva,
                DATE(r.fecha) as fecha_solo
            FROM reservas r
            WHERE r.fecha = $1::date
            AND r.cancha_id = 1
            AND r.estado != 'cancelada'
            ORDER BY r.hora_inicio
        `, [testDate]);
        
        console.log(`   - Reservas existentes para ${testDate}:`, availability.length);
        availability.forEach((reserva, index) => {
            console.log(`     ${index + 1}. ${reserva.codigo_reserva}: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
        });
        
        // 5. Verificar configuración de zona horaria
        console.log('\n⚙️ CONFIGURACIÓN DE ZONA HORARIA:');
        const timezoneConfig = await db.query(`
            SHOW timezone
        `);
        console.log('   - Zona horaria de PostgreSQL:', timezoneConfig[0].timezone);
        
        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error verificando consistencia de fechas:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await db.close();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    checkDateConsistency();
}

module.exports = { checkDateConsistency };

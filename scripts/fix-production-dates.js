#!/usr/bin/env node

/**
 * Script para corregir fechas en producción
 * Asegura que todas las fechas se manejen consistentemente
 */

require('dotenv').config({ path: './.env' });
const DatabaseManager = require('../src/config/database');
const db = new DatabaseManager();

async function fixProductionDates() {
    try {
        await db.connect();
        console.log('🔧 CORRIGIENDO FECHAS EN PRODUCCIÓN');
        console.log('==================================');
        
        // 1. Verificar configuración actual
        console.log('\n📅 CONFIGURACIÓN ACTUAL:');
        const timezoneQuery = await db.query('SELECT NOW() as server_time, CURRENT_TIME as current_time');
        console.log('⏰ Hora del servidor:', timezoneQuery[0].server_time);
        console.log('⏰ Hora actual:', timezoneQuery[0].current_time);
        
        // 2. Verificar reservas con problemas de fecha
        console.log('\n🔍 VERIFICANDO RESERVAS CON PROBLEMAS:');
        const problematicReservations = await db.query(`
            SELECT 
                id,
                codigo_reserva,
                fecha,
                hora_inicio,
                hora_fin,
                nombre_cliente,
                created_at,
                fecha::text as fecha_text
            FROM reservas 
            WHERE fecha::text LIKE '%GMT%'
            OR fecha::text LIKE '%UTC%'
            OR fecha::text LIKE '%Chile%'
            OR fecha::text LIKE '%Summer%'
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        if (problematicReservations.length > 0) {
            console.log(`❌ Encontradas ${problematicReservations.length} reservas con problemas de zona horaria:`);
            problematicReservations.forEach((reserva, index) => {
                console.log(`\n${index + 1}. Reserva ${reserva.codigo_reserva}:`);
                console.log(`   - Fecha actual: ${reserva.fecha}`);
                console.log(`   - Timezone info: ${reserva.timezone_info}`);
                console.log(`   - Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
            });
            
            // 3. Corregir fechas problemáticas
            console.log('\n🔧 CORRIGIENDO FECHAS PROBLEMÁTICAS:');
            
            for (const reserva of problematicReservations) {
                try {
                    // Extraer solo la fecha sin zona horaria
                    const fechaOriginal = reserva.fecha;
                    const fechaCorregida = fechaOriginal.toISOString().split('T')[0]; // YYYY-MM-DD
                    
                    console.log(`   - Corrigiendo reserva ${reserva.codigo_reserva}:`);
                    console.log(`     De: ${fechaOriginal}`);
                    console.log(`     A:  ${fechaCorregida}`);
                    
                    // Actualizar la fecha en la base de datos
                    await db.run(`
                        UPDATE reservas 
                        SET fecha = $1::date 
                        WHERE id = $2
                    `, [fechaCorregida, reserva.id]);
                    
                    console.log(`     ✅ Corregida exitosamente`);
                    
                } catch (error) {
                    console.log(`     ❌ Error corrigiendo reserva ${reserva.codigo_reserva}:`, error.message);
                }
            }
            
        } else {
            console.log('✅ No se encontraron reservas con problemas de zona horaria');
        }
        
        // 4. Verificar bloqueos temporales
        console.log('\n🔒 VERIFICANDO BLOQUEOS TEMPORALES:');
        const problematicBlocks = await db.query(`
            SELECT 
                id,
                fecha,
                hora_inicio,
                hora_fin,
                session_id,
                expira_en,
                fecha::text as fecha_text
            FROM bloqueos_temporales 
            WHERE fecha::text LIKE '%GMT%'
            OR fecha::text LIKE '%UTC%'
            OR fecha::text LIKE '%Chile%'
            OR fecha::text LIKE '%Summer%'
            ORDER BY created_at DESC
        `);
        
        if (problematicBlocks.length > 0) {
            console.log(`❌ Encontrados ${problematicBlocks.length} bloqueos con problemas de zona horaria:`);
            
            for (const bloqueo of problematicBlocks) {
                try {
                    const fechaOriginal = bloqueo.fecha;
                    const fechaCorregida = fechaOriginal.toISOString().split('T')[0];
                    
                    console.log(`   - Corrigiendo bloqueo ${bloqueo.id}:`);
                    console.log(`     De: ${fechaOriginal}`);
                    console.log(`     A:  ${fechaCorregida}`);
                    
                    await db.run(`
                        UPDATE bloqueos_temporales 
                        SET fecha = $1::date 
                        WHERE id = $2
                    `, [fechaCorregida, bloqueo.id]);
                    
                    console.log(`     ✅ Corregido exitosamente`);
                    
                } catch (error) {
                    console.log(`     ❌ Error corrigiendo bloqueo ${bloqueo.id}:`, error.message);
                }
            }
        } else {
            console.log('✅ No se encontraron bloqueos con problemas de zona horaria');
        }
        
        // 5. Verificar resultado final
        console.log('\n✅ VERIFICACIÓN FINAL:');
        const finalCheck = await db.query(`
            SELECT 
                COUNT(*) as total_reservas,
                COUNT(CASE WHEN fecha::text NOT LIKE '%GMT%' 
                    AND fecha::text NOT LIKE '%UTC%' 
                    AND fecha::text NOT LIKE '%Chile%' 
                    AND fecha::text NOT LIKE '%Summer%' THEN 1 END) as fechas_correctas
            FROM reservas
        `);
        
        console.log(`📊 Total de reservas: ${finalCheck[0].total_reservas}`);
        console.log(`✅ Fechas correctas: ${finalCheck[0].fechas_correctas}`);
        
        if (finalCheck[0].total_reservas === finalCheck[0].fechas_correctas) {
            console.log('🎉 ¡Todas las fechas están correctas!');
        } else {
            console.log('⚠️ Aún hay fechas que necesitan corrección');
        }
        
        console.log('\n✅ CORRECCIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error corrigiendo fechas en producción:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await db.close();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    fixProductionDates();
}

module.exports = { fixProductionDates };

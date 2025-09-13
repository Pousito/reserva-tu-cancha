#!/usr/bin/env node

/**
 * Script para verificar el estado actual en producción
 * Verifica fechas, horas y consistencia en el deploy
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://reserva-tu-cancha.onrender.com';

async function checkProductionStatus() {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL EN PRODUCCIÓN');
    console.log('=========================================');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    
    try {
        // 1. Verificar que el servidor esté funcionando
        console.log('\n📡 PASO 1: Verificando conectividad');
        const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`, {
            method: 'GET',
            timeout: 10000
        });
        
        if (!healthResponse.ok) {
            console.log('⚠️ Servidor no responde correctamente, probando endpoint principal...');
            const mainResponse = await fetch(PRODUCTION_URL, { timeout: 10000 });
            if (!mainResponse.ok) {
                throw new Error(`Servidor no disponible: ${mainResponse.status}`);
            }
            console.log('✅ Servidor principal responde');
        } else {
            console.log('✅ Endpoint de salud responde');
        }
        
        // 2. Verificar reservas recientes
        console.log('\n📋 PASO 2: Verificando reservas recientes');
        
        // Buscar reservas de prueba recientes
        const testCodes = ['JRATW8', 'FYYELT', 'LHAWAL', 'YWQXUH'];
        let reservaEncontrada = null;
        
        for (const codigo of testCodes) {
            try {
                console.log(`   - Buscando reserva: ${codigo}`);
                const reservaResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${codigo}`, {
                    timeout: 10000
                });
                
                if (reservaResponse.ok) {
                    const reserva = await reservaResponse.json();
                    if (reserva.id) {
                        reservaEncontrada = reserva;
                        console.log(`   ✅ Reserva encontrada: ${codigo}`);
                        console.log(`   📅 Fecha: ${reserva.fecha}`);
                        console.log(`   🕐 Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
                        break;
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error buscando ${codigo}: ${error.message}`);
            }
        }
        
        if (!reservaEncontrada) {
            console.log('   ⚠️ No se encontraron reservas de prueba recientes');
            console.log('   💡 Creando una reserva de prueba...');
            
            // Crear una reserva de prueba
            const testDate = '2025-09-22';
            const testTime = '22:00';
            const testTimeEnd = '23:00';
            
            const createResponse = await fetch(`${PRODUCTION_URL}/api/reservas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancha_id: 1,
                    nombre_cliente: 'Test Producción',
                    email_cliente: 'ignacio.araya.lillo@gmail.com',
                    telefono_cliente: '950994195',
                    fecha: testDate,
                    hora_inicio: testTime,
                    hora_fin: testTimeEnd,
                    precio_total: 28000
                }),
                timeout: 15000
            });
            
            if (createResponse.ok) {
                const createResult = await createResponse.json();
                console.log(`   ✅ Reserva de prueba creada: ${createResult.codigo_reserva}`);
                
                // Verificar la reserva creada
                const verifyResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${createResult.codigo_reserva}`, {
                    timeout: 10000
                });
                
                if (verifyResponse.ok) {
                    const verifyResult = await verifyResponse.json();
                    reservaEncontrada = verifyResult;
                    console.log(`   📅 Fecha en producción: ${verifyResult.fecha}`);
                    console.log(`   🕐 Hora en producción: ${verifyResult.hora_inicio} - ${verifyResult.hora_fin}`);
                }
            } else {
                console.log(`   ❌ Error creando reserva de prueba: ${createResponse.status}`);
            }
        }
        
        // 3. Analizar consistencia
        console.log('\n📊 PASO 3: Análisis de consistencia');
        
        if (reservaEncontrada) {
            console.log('   📋 Datos de la reserva:');
            console.log(`      - ID: ${reservaEncontrada.id}`);
            console.log(`      - Código: ${reservaEncontrada.codigo_reserva}`);
            console.log(`      - Fecha: ${reservaEncontrada.fecha}`);
            console.log(`      - Hora inicio: ${reservaEncontrada.hora_inicio}`);
            console.log(`      - Hora fin: ${reservaEncontrada.hora_fin}`);
            console.log(`      - Cliente: ${reservaEncontrada.nombre_cliente}`);
            console.log(`      - Creada: ${reservaEncontrada.created_at}`);
            
            // Verificar si la fecha tiene zona horaria
            const fechaTieneTimezone = reservaEncontrada.fecha.includes('T') || 
                                      reservaEncontrada.fecha.includes('Z') ||
                                      reservaEncontrada.fecha.includes('GMT');
            
            console.log(`   🔍 Análisis:`);
            console.log(`      - Fecha tiene zona horaria: ${fechaTieneTimezone ? '❌ SÍ' : '✅ NO'}`);
            console.log(`      - Formato de fecha: ${fechaTieneTimezone ? 'PROBLEMÁTICO' : 'CORRECTO'}`);
            
            if (fechaTieneTimezone) {
                console.log('\n❌ PROBLEMA DETECTADO EN PRODUCCIÓN');
                console.log('   Las fechas aún tienen información de zona horaria');
                console.log('   Esto causa inconsistencias en el frontend');
                return {
                    success: false,
                    problem: 'fecha_timezone',
                    message: 'Las fechas en producción tienen zona horaria',
                    reserva: reservaEncontrada
                };
            } else {
                console.log('\n✅ FECHAS CORRECTAS EN PRODUCCIÓN');
                console.log('   Las fechas se almacenan sin zona horaria');
                return {
                    success: true,
                    message: 'Fechas correctas en producción',
                    reserva: reservaEncontrada
                };
            }
        } else {
            console.log('\n⚠️ NO SE PUDO VERIFICAR');
            console.log('   No se encontraron reservas para analizar');
            return {
                success: false,
                problem: 'no_reservas',
                message: 'No se pudieron verificar las reservas'
            };
        }
        
    } catch (error) {
        console.error('❌ Error verificando producción:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    checkProductionStatus().then(result => {
        console.log('\n📊 RESULTADO:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { checkProductionStatus };

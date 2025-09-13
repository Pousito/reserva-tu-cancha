#!/usr/bin/env node

/**
 * Script simple para probar el problema de fechas en producción
 * Crea una reserva y verifica las fechas en cada paso
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://reserva-tu-cancha.onrender.com';

async function simpleProductionTest() {
    console.log('🧪 PRUEBA SIMPLE DE FECHAS EN PRODUCCIÓN');
    console.log('======================================');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    
    try {
        // 1. Crear una reserva directamente
        console.log('\n📅 PASO 1: Creando reserva directamente');
        const testDate = '2025-09-24';
        const testTime = '14:00';
        const testTimeEnd = '15:00';
        
        console.log(`   - Fecha: ${testDate}`);
        console.log(`   - Hora: ${testTime} - ${testTimeEnd}`);
        
        const reservationResponse = await fetch(`${PRODUCTION_URL}/api/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 1,
                nombre_cliente: 'Test Simple Producción',
                email_cliente: 'ignacio.araya.lillo@gmail.com',
                telefono_cliente: '950994195',
                fecha: testDate,
                hora_inicio: testTime,
                hora_fin: testTimeEnd,
                precio_total: 28000
            }),
            timeout: 15000
        });
        
        if (!reservationResponse.ok) {
            const error = await reservationResponse.text();
            console.log(`   ❌ Error creando reserva: ${reservationResponse.status}`);
            console.log(`   Error: ${error}`);
            return { success: false, error: error };
        }
        
        const reservationResult = await reservationResponse.json();
        console.log(`   ✅ Reserva creada: ${reservationResult.codigo_reserva}`);
        
        // 2. Verificar la reserva inmediatamente
        console.log('\n📋 PASO 2: Verificando reserva creada');
        const checkResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${reservationResult.codigo_reserva}`, {
            timeout: 10000
        });
        
        if (!checkResponse.ok) {
            console.log(`   ❌ Error verificando reserva: ${checkResponse.status}`);
            return { success: false, error: 'No se pudo verificar la reserva' };
        }
        
        const checkResult = await checkResponse.json();
        console.log(`   ✅ Reserva verificada`);
        console.log(`   📅 Fecha en BD: ${checkResult.fecha}`);
        console.log(`   🕐 Hora en BD: ${checkResult.hora_inicio} - ${checkResult.hora_fin}`);
        
        // 3. Probar el flujo de bloqueo temporal
        console.log('\n🔒 PASO 3: Probando bloqueo temporal');
        const sessionId = 'TEST_SIMPLE_' + Date.now();
        
        const blockResponse = await fetch(`${PRODUCTION_URL}/api/reservas/bloquear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 1,
                fecha: testDate,
                hora_inicio: testTime,
                hora_fin: testTimeEnd,
                session_id: sessionId
            }),
            timeout: 15000
        });
        
        if (!blockResponse.ok) {
            const blockError = await blockResponse.text();
            console.log(`   ❌ Error creando bloqueo: ${blockResponse.status}`);
            console.log(`   Error: ${blockError}`);
        } else {
            const blockResult = await blockResponse.json();
            console.log(`   ✅ Bloqueo creado: ${blockResult.bloqueoId}`);
        }
        
        // 4. Probar el flujo completo de bloqueo y pago
        console.log('\n💳 PASO 4: Probando flujo completo de bloqueo y pago');
        
        // Primero crear el bloqueo
        const blockSessionId = 'TEST_COMPLETE_' + Date.now();
        const blockForPaymentResponse = await fetch(`${PRODUCTION_URL}/api/reservas/bloquear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 1,
                fecha: testDate,
                hora_inicio: testTime,
                hora_fin: testTimeEnd,
                session_id: blockSessionId
            }),
            timeout: 15000
        });
        
        if (blockForPaymentResponse.ok) {
            const blockForPaymentResult = await blockForPaymentResponse.json();
            console.log(`   ✅ Bloqueo para pago creado: ${blockForPaymentResult.bloqueoId}`);
            
            // Ahora procesar el pago
            const paymentResponse = await fetch(`${PRODUCTION_URL}/api/reservas/bloquear-y-pagar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cancha_id: 1,
                    nombre_cliente: 'Test Completo Producción',
                    email_cliente: 'ignacio.araya.lillo@gmail.com',
                    telefono_cliente: '950994195',
                    rut_cliente: '19.372.087-0',
                    fecha: testDate,
                    hora_inicio: testTime,
                    hora_fin: testTimeEnd,
                    precio_total: 28000,
                    session_id: blockSessionId
                }),
                timeout: 15000
            });
            
            if (paymentResponse.ok) {
                const paymentResult = await paymentResponse.json();
                console.log(`   ✅ Pago procesado: ${paymentResult.codigo_reserva}`);
                console.log(`   📅 Fecha en respuesta de pago: ${paymentResult.fecha}`);
                console.log(`   🕐 Hora en respuesta de pago: ${paymentResult.hora_inicio} - ${paymentResult.hora_fin}`);
                
                // Verificar la reserva final
                const finalCheckResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${paymentResult.codigo_reserva}`, {
                    timeout: 10000
                });
                
                if (finalCheckResponse.ok) {
                    const finalCheckResult = await finalCheckResponse.json();
                    console.log(`   ✅ Reserva final verificada`);
                    console.log(`   📅 Fecha final: ${finalCheckResult.fecha}`);
                    console.log(`   🕐 Hora final: ${finalCheckResult.hora_inicio} - ${finalCheckResult.hora_fin}`);
                    
                    // Análisis final
                    console.log('\n📊 ANÁLISIS FINAL:');
                    console.log(`   📅 Fecha original: ${testDate}`);
                    console.log(`   📅 Fecha en reserva directa: ${checkResult.fecha}`);
                    console.log(`   📅 Fecha en respuesta de pago: ${paymentResult.fecha}`);
                    console.log(`   📅 Fecha en reserva final: ${finalCheckResult.fecha}`);
                    
                    const todasConsistentes = [
                        checkResult.fecha,
                        paymentResult.fecha,
                        finalCheckResult.fecha
                    ].every(fecha => fecha === testDate);
                    
                    if (todasConsistentes) {
                        console.log('\n✅ TODAS LAS FECHAS SON CONSISTENTES');
                        console.log('   El problema no está en el backend');
                        console.log('   El problema debe estar en el frontend');
                        return {
                            success: true,
                            message: 'Backend consistente, problema en frontend',
                            fecha_original: testDate,
                            fechas_backend: {
                                directa: checkResult.fecha,
                                pago: paymentResult.fecha,
                                final: finalCheckResult.fecha
                            }
                        };
                    } else {
                        console.log('\n❌ INCONSISTENCIA EN BACKEND');
                        console.log('   Las fechas no son consistentes en el backend');
                        return {
                            success: false,
                            problem: 'backend_inconsistency',
                            fecha_original: testDate,
                            fechas_backend: {
                                directa: checkResult.fecha,
                                pago: paymentResult.fecha,
                                final: finalCheckResult.fecha
                            }
                        };
                    }
                }
            } else {
                const paymentError = await paymentResponse.text();
                console.log(`   ❌ Error procesando pago: ${paymentResponse.status}`);
                console.log(`   Error: ${paymentError}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error en prueba simple:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    simpleProductionTest().then(result => {
        console.log('\n📊 RESULTADO:', result);
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { simpleProductionTest };

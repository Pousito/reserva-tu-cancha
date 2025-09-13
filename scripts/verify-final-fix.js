#!/usr/bin/env node

/**
 * Script final para verificar que las correcciones de fechas funcionan
 * Verifica específicamente el problema reportado por el usuario
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://reserva-tu-cancha.onrender.com';

async function verifyFinalFix() {
    console.log('🎯 VERIFICACIÓN FINAL DE CORRECCIÓN DE FECHAS');
    console.log('=============================================');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    console.log(`🕐 Hora actual en Chile: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
    
    try {
        // 1. Verificar la reserva original del usuario
        console.log('\n📋 PASO 1: Verificando reserva original del usuario');
        const userReservationResponse = await fetch(`${PRODUCTION_URL}/api/reservas/36MPP8`, {
            timeout: 10000
        });
        
        if (userReservationResponse.ok) {
            const userReservation = await userReservationResponse.json();
            console.log(`   ✅ Reserva del usuario encontrada: ${userReservation.codigo_reserva}`);
            console.log(`   📅 Fecha en BD: ${userReservation.fecha}`);
            console.log(`   🕐 Hora: ${userReservation.hora_inicio} - ${userReservation.hora_fin}`);
            console.log(`   👤 Cliente: ${userReservation.nombre_cliente}`);
        } else {
            console.log(`   ❌ No se pudo verificar la reserva del usuario`);
        }
        
        // 2. Verificar la nueva reserva de prueba
        console.log('\n📋 PASO 2: Verificando nueva reserva de prueba');
        const testReservationResponse = await fetch(`${PRODUCTION_URL}/api/reservas/LO4WTC`, {
            timeout: 10000
        });
        
        if (testReservationResponse.ok) {
            const testReservation = await testReservationResponse.json();
            console.log(`   ✅ Reserva de prueba encontrada: ${testReservation.codigo_reserva}`);
            console.log(`   📅 Fecha en BD: ${testReservation.fecha}`);
            console.log(`   🕐 Hora: ${testReservation.hora_inicio} - ${testReservation.hora_fin}`);
            console.log(`   👤 Cliente: ${testReservation.nombre_cliente}`);
        }
        
        // 3. Crear una nueva reserva para probar el flujo completo
        console.log('\n🔄 PASO 3: Probando flujo completo con fecha de hoy');
        
        // Usar fecha de hoy en Chile
        const hoyChile = new Date().toLocaleDateString('en-CA', {
            timeZone: 'America/Santiago'
        });
        
        console.log(`   📅 Fecha de hoy en Chile: ${hoyChile}`);
        
        const newReservationResponse = await fetch(`${PRODUCTION_URL}/api/reservas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 2,
                nombre_cliente: 'Verificación Final Fechas',
                email_cliente: 'ignacio.araya.lillo@gmail.com',
                telefono_cliente: '950994195',
                fecha: hoyChile,
                hora_inicio: '15:00',
                hora_fin: '16:00',
                precio_total: 28000
            }),
            timeout: 15000
        });
        
        if (newReservationResponse.ok) {
            const newReservation = await newReservationResponse.json();
            console.log(`   ✅ Nueva reserva creada: ${newReservation.codigo_reserva}`);
            
            // Verificar inmediatamente
            const verifyResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${newReservation.codigo_reserva}`, {
                timeout: 10000
            });
            
            if (verifyResponse.ok) {
                const verifyResult = await verifyResponse.json();
                console.log(`   📅 Fecha verificada: ${verifyResult.fecha}`);
                console.log(`   🕐 Hora verificada: ${verifyResult.hora_inicio} - ${verifyResult.hora_fin}`);
                
                // Verificar consistencia
                const fechaConsistente = verifyResult.fecha === hoyChile;
                
                if (fechaConsistente) {
                    console.log('\n🎉 ¡CORRECCIÓN EXITOSA!');
                    console.log('   ✅ Las fechas se manejan correctamente en el backend');
                    console.log('   ✅ El problema de zona horaria ha sido resuelto');
                    console.log('   ✅ Las reservas se almacenan con la fecha correcta');
                    
                    return {
                        success: true,
                        message: 'Corrección exitosa - Fechas consistentes',
                        reserva: verifyResult,
                        fecha_original: hoyChile,
                        fecha_almacenada: verifyResult.fecha
                    };
                } else {
                    console.log('\n❌ PROBLEMA PERSISTE');
                    console.log(`   ⚠️ Fecha original: ${hoyChile}`);
                    console.log(`   ⚠️ Fecha almacenada: ${verifyResult.fecha}`);
                    
                    return {
                        success: false,
                        message: 'Problema persiste - Fechas inconsistentes',
                        fecha_original: hoyChile,
                        fecha_almacenada: verifyResult.fecha
                    };
                }
            }
        } else {
            console.log(`   ❌ Error creando nueva reserva: ${newReservationResponse.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error en verificación final:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    verifyFinalFix().then(result => {
        console.log('\n📊 RESULTADO FINAL:', result);
        
        if (result.success) {
            console.log('\n✅ ESTADO: PROBLEMA RESUELTO');
            console.log('   Las correcciones han sido aplicadas exitosamente.');
            console.log('   El usuario debe limpiar el cache del navegador para ver los cambios.');
            console.log('\n💡 INSTRUCCIONES PARA EL USUARIO:');
            console.log('   1. Presionar Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)');
            console.log('   2. O abrir una ventana incógnita/privada');
            console.log('   3. Probar el flujo de reserva nuevamente');
            console.log('   4. Las fechas ahora deben ser consistentes');
        } else {
            console.log('\n❌ ESTADO: PROBLEMA PERSISTE');
            console.log('   Se requieren correcciones adicionales.');
        }
        
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { verifyFinalFix };

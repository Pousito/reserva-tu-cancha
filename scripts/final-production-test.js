#!/usr/bin/env node

/**
 * Script final para probar el problema de fechas en producción
 * Simula exactamente el flujo que reporta el usuario
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://reserva-tu-cancha.onrender.com';

async function finalProductionTest() {
    console.log('🎯 PRUEBA FINAL DEL PROBLEMA DE FECHAS EN PRODUCCIÓN');
    console.log('==================================================');
    console.log(`🌐 URL: ${PRODUCTION_URL}`);
    
    try {
        // Simular exactamente el flujo del usuario
        console.log('\n📋 SIMULANDO FLUJO DEL USUARIO:');
        console.log('1. Usuario selecciona fecha en página principal');
        console.log('2. Usuario confirma y procede con pago');
        console.log('3. Se muestra ventana de "Procesar Pago"');
        console.log('4. Se simula el pago');
        console.log('5. Se envía email de confirmación');
        console.log('6. Se muestra en lista de reservas');
        
        // Fecha que el usuario selecciona (como reporta el problema)
        const fechaSeleccionada = '2025-09-25';
        const horaSeleccionada = '15:00';
        const horaFinSeleccionada = '16:00';
        
        console.log(`\n📅 FECHA SELECCIONADA POR EL USUARIO:`);
        console.log(`   - Fecha: ${fechaSeleccionada}`);
        console.log(`   - Hora: ${horaSeleccionada} - ${horaFinSeleccionada}`);
        
        // PASO 1: Crear bloqueo temporal (como hace el frontend)
        console.log('\n🔒 PASO 1: Creando bloqueo temporal');
        const sessionId = 'USER_FLOW_' + Date.now();
        
        const blockResponse = await fetch(`${PRODUCTION_URL}/api/reservas/bloquear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 1,
                fecha: fechaSeleccionada,
                hora_inicio: horaSeleccionada,
                hora_fin: horaFinSeleccionada,
                session_id: sessionId
            }),
            timeout: 15000
        });
        
        if (!blockResponse.ok) {
            const blockError = await blockResponse.text();
            console.log(`   ❌ Error creando bloqueo: ${blockResponse.status}`);
            console.log(`   Error: ${blockError}`);
            return { success: false, error: 'No se pudo crear bloqueo temporal' };
        }
        
        const blockResult = await blockResponse.json();
        console.log(`   ✅ Bloqueo creado: ${blockResult.bloqueoId}`);
        
        // PASO 2: Procesar pago (ventana de "Procesar Pago")
        console.log('\n💳 PASO 2: Procesando pago');
        
        const paymentResponse = await fetch(`${PRODUCTION_URL}/api/reservas/bloquear-y-pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: 1,
                nombre_cliente: 'Usuario Test Flujo',
                email_cliente: 'ignacio.araya.lillo@gmail.com',
                telefono_cliente: '950994195',
                rut_cliente: '19.372.087-0',
                fecha: fechaSeleccionada,
                hora_inicio: horaSeleccionada,
                hora_fin: horaFinSeleccionada,
                precio_total: 28000,
                session_id: sessionId
            }),
            timeout: 15000
        });
        
        if (!paymentResponse.ok) {
            const paymentError = await paymentResponse.text();
            console.log(`   ❌ Error procesando pago: ${paymentResponse.status}`);
            console.log(`   Error: ${paymentError}`);
            return { success: false, error: 'No se pudo procesar pago' };
        }
        
        const paymentResult = await paymentResponse.json();
        console.log(`   ✅ Pago procesado: ${paymentResult.codigo_reserva}`);
        console.log(`   📅 Fecha en respuesta de pago: ${paymentResult.fecha}`);
        console.log(`   🕐 Hora en respuesta de pago: ${paymentResult.hora_inicio} - ${paymentResult.hora_fin}`);
        
        // PASO 3: Verificar reserva final (lista de reservas)
        console.log('\n📋 PASO 3: Verificando reserva en lista');
        
        const finalResponse = await fetch(`${PRODUCTION_URL}/api/reservas/${paymentResult.codigo_reserva}`, {
            timeout: 10000
        });
        
        if (!finalResponse.ok) {
            console.log(`   ❌ Error verificando reserva final: ${finalResponse.status}`);
            return { success: false, error: 'No se pudo verificar reserva final' };
        }
        
        const finalResult = await finalResponse.json();
        console.log(`   ✅ Reserva verificada`);
        console.log(`   📅 Fecha en lista de reservas: ${finalResult.fecha}`);
        console.log(`   🕐 Hora en lista de reservas: ${finalResult.hora_inicio} - ${finalResult.hora_fin}`);
        
        // ANÁLISIS FINAL
        console.log('\n📊 ANÁLISIS FINAL DEL FLUJO:');
        console.log('================================');
        
        const datos = {
            fecha_seleccionada: fechaSeleccionada,
            fecha_respuesta_pago: paymentResult.fecha,
            fecha_lista_reservas: finalResult.fecha,
            hora_seleccionada: horaSeleccionada,
            hora_respuesta_pago: paymentResult.hora_inicio,
            hora_lista_reservas: finalResult.hora_inicio
        };
        
        console.log('📋 DATOS COMPLETOS:');
        Object.entries(datos).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        // Verificar consistencia
        const fechaConsistente = datos.fecha_respuesta_pago === fechaSeleccionada && 
                                datos.fecha_lista_reservas === fechaSeleccionada;
        
        const horaConsistente = datos.hora_respuesta_pago === horaSeleccionada && 
                               datos.hora_lista_reservas === horaSeleccionada;
        
        console.log('\n🔍 VERIFICACIÓN DE CONSISTENCIA:');
        console.log(`   📅 Fecha consistente: ${fechaConsistente ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   🕐 Hora consistente: ${horaConsistente ? '✅ SÍ' : '❌ NO'}`);
        
        if (fechaConsistente && horaConsistente) {
            console.log('\n🎉 ¡FLUJO COMPLETAMENTE CONSISTENTE!');
            console.log('   ✅ Todas las fechas y horas son consistentes');
            console.log('   ✅ El backend está funcionando correctamente');
            console.log('   ✅ El problema debe estar en el frontend/cache del navegador');
            
            return {
                success: true,
                message: 'Backend consistente, problema en frontend',
                datos: datos,
                recomendacion: 'Limpiar cache del navegador y verificar JavaScript del frontend'
            };
        } else {
            console.log('\n❌ INCONSISTENCIA DETECTADA EN BACKEND');
            console.log('   ⚠️ Las fechas o horas no son consistentes');
            
            const problemas = [];
            if (!fechaConsistente) {
                problemas.push('Fechas inconsistentes');
            }
            if (!horaConsistente) {
                problemas.push('Horas inconsistentes');
            }
            
            return {
                success: false,
                message: 'Inconsistencia en backend detectada',
                problemas: problemas,
                datos: datos
            };
        }
        
    } catch (error) {
        console.error('❌ Error en prueba final:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    finalProductionTest().then(result => {
        console.log('\n📊 RESULTADO FINAL:', result);
        
        if (result.success) {
            console.log('\n💡 RECOMENDACIÓN:');
            console.log('   El backend está funcionando correctamente.');
            console.log('   El problema está en el frontend o cache del navegador.');
            console.log('   Soluciones:');
            console.log('   1. Limpiar cache del navegador (Ctrl+F5 o Cmd+Shift+R)');
            console.log('   2. Verificar que los archivos JavaScript se hayan actualizado');
            console.log('   3. Probar en modo incógnito/privado');
        } else {
            console.log('\n🔧 ACCIÓN REQUERIDA:');
            console.log('   Hay inconsistencias en el backend que deben corregirse.');
        }
        
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = { finalProductionTest };

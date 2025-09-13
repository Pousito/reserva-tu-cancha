#!/usr/bin/env node

/**
 * Script para simular el problema de fecha en el proceso de pago
 * Demuestra exactamente dónde está el problema
 */

console.log('🧪 SIMULACIÓN DEL PROBLEMA DE FECHA EN PROCESO DE PAGO');
console.log('=====================================================');

// Simular la función formatDate problemática del payment.html
function formatDateProblematica(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Simular la función formatDate corregida
function formatDateCorregida(dateString) {
    // Crear fecha en zona horaria local para mantener la fecha correcta
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Simular el flujo completo
console.log('\n📋 SIMULACIÓN DEL FLUJO COMPLETO:');
console.log('================================');

// 1. Usuario selecciona fecha
const fechaSeleccionada = '2025-09-30';
console.log('1. Usuario selecciona:', fechaSeleccionada);

// 2. Frontend envía la fecha al servidor
console.log('2. Frontend envía:', fechaSeleccionada);

// 3. Servidor procesa y almacena
console.log('3. Servidor almacena:', fechaSeleccionada);

// 4. Usuario va a proceso de pago
console.log('4. Usuario va a proceso de pago');

// 5. PROBLEMA: formatDate problemática
const fechaProblematica = formatDateProblematica(fechaSeleccionada);
console.log('5. ❌ PROBLEMA - formatDate problemática muestra:', fechaProblematica);

// 6. SOLUCIÓN: formatDate corregida
const fechaCorregida = formatDateCorregida(fechaSeleccionada);
console.log('6. ✅ SOLUCIÓN - formatDate corregida muestra:', fechaCorregida);

// 7. Verificar el problema
console.log('\n🔍 ANÁLISIS DEL PROBLEMA:');
console.log('========================');

const fechaOriginal = new Date(fechaSeleccionada);
const fechaCorregidaObj = new Date(2025, 8, 30); // mes - 1 porque Date usa 0-11

console.log('Fecha original (problemática):', fechaOriginal.toISOString());
console.log('Fecha corregida:', fechaCorregidaObj.toISOString());
console.log('Diferencia en días:', Math.floor((fechaOriginal.getTime() - fechaCorregidaObj.getTime()) / (1000 * 60 * 60 * 24)));

// 8. Probar con diferentes fechas
console.log('\n🧪 PRUEBAS CON DIFERENTES FECHAS:');
console.log('=================================');

const fechasPrueba = [
    '2025-09-30',
    '2025-12-25',
    '2025-01-01',
    '2025-06-15'
];

fechasPrueba.forEach(fecha => {
    const problematica = formatDateProblematica(fecha);
    const corregida = formatDateCorregida(fecha);
    const [year, month, day] = fecha.split('-');
    const diaEsperado = parseInt(day);
    
    console.log(`${fecha}:`);
    console.log(`  ❌ Problemática: ${problematica}`);
    console.log(`  ✅ Corregida: ${corregida}`);
    console.log(`  📅 Día esperado: ${diaEsperado}`);
    console.log(`  🎯 Correcto: ${corregida.includes(`${diaEsperado} de`) ? 'SÍ' : 'NO'}`);
    console.log('');
});

// 9. Resumen
console.log('📊 RESUMEN:');
console.log('===========');
console.log('❌ PROBLEMA: new Date(dateString) sin zona horaria causa -1 día');
console.log('✅ SOLUCIÓN: new Date(year, month-1, day) mantiene fecha correcta');
console.log('📍 UBICACIÓN: public/payment.html línea 520-521');
console.log('🔧 ACCIÓN: Reemplazar formatDate con versión corregida');

console.log('\n🎯 PRÓXIMO PASO:');
console.log('Corregir la función formatDate en public/payment.html');

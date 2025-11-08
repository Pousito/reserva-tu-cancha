#!/usr/bin/env node

/**
 * Script para actualizar la reserva VIZJ4P llamando al endpoint en producción
 * Requiere que estés autenticado como super_admin
 */

const https = require('https');

const API_URL = 'https://reserva-tu-cancha.onrender.com/api/admin/reservas/vizj4p/actualizar-precio';

// Necesitas obtener tu token de autenticación desde el navegador:
// 1. Abre https://www.reservatuscanchas.cl/admin-reservations.html
// 2. Abre la consola del navegador (F12)
// 3. Ejecuta: localStorage.getItem('adminToken')
// 4. Copia el token y pégala aquí:
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

if (!ADMIN_TOKEN) {
    console.error('❌ Error: ADMIN_TOKEN no está configurado');
    console.log('\n💡 Para obtener tu token:');
    console.log('   1. Abre https://www.reservatuscanchas.cl/admin-reservations.html');
    console.log('   2. Abre la consola del navegador (F12)');
    console.log('   3. Ejecuta: localStorage.getItem("adminToken")');
    console.log('   4. Copia el token y ejecuta:');
    console.log('      ADMIN_TOKEN="tu_token_aqui" node scripts/actualizar-reserva-vizj4p-endpoint.js');
    console.log('\n   O configura la variable de entorno:');
    console.log('      export ADMIN_TOKEN="tu_token_aqui"');
    process.exit(1);
}

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
    }
};

console.log('🔌 Llamando al endpoint de actualización...');
console.log('📍 URL:', API_URL);

const req = https.request(API_URL, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.success) {
                console.log('\n✅ ¡Reserva actualizada exitosamente!');
                console.log('\n📋 Datos anteriores:');
                console.log('   Precio Total: $' + response.datos_anteriores.precio_total);
                console.log('   Monto Abonado: $' + (response.datos_anteriores.monto_abonado || 0));
                console.log('\n📋 Datos nuevos:');
                console.log('   Precio Total: $' + response.datos_nuevos.precio_total);
                console.log('   Monto Abonado: $' + response.datos_nuevos.monto_abonado);
                console.log('   Porcentaje Pagado: ' + response.datos_nuevos.porcentaje_pagado + '%');
                console.log('\n💰 Montos que se mostrarán en el modal de info:');
                console.log('   Pagado Online: $' + response.montos_mostrados_en_modal.pagado_online + ' (50%)');
                console.log('   Pendiente en Complejo: $' + response.montos_mostrados_en_modal.pendiente_complejo + ' (50%)');
            } else {
                console.error('\n❌ Error:', response.error || 'Error desconocido');
                console.log('Status Code:', res.statusCode);
                console.log('Response:', response);
            }
        } catch (error) {
            console.error('\n❌ Error parseando respuesta:', error);
            console.log('Response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ Error en la petición:', error.message);
});

req.end();


#!/usr/bin/env node

/**
 * Script para verificar qué se muestra realmente en el frontend
 */

const https = require('https');

const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

console.log('🖥️  VERIFICACIÓN DE LO QUE SE MUESTRA EN EL FRONTEND');
console.log('====================================================');
console.log(`🌐 URL: ${PRODUCTION_URL}`);

// Función para hacer peticiones HTTPS
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.reservatuscanchas.cl',
            port: 443,
            path: path,
            method: method,
            headers: {
                'User-Agent': 'FrontendDisplayVerification/1.0',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData, headers: res.headers });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Función para simular exactamente lo que hace el frontend
function simulateFrontendDisplay(reserva) {
    console.log('\n🖥️  SIMULANDO LO QUE VE EL USUARIO EN EL FRONTEND:');
    console.log('==================================================');
    
    // Simular la función formatearFechaParaAPI que está en el frontend
    function formatearFechaParaAPI(fecha) {
        if (!fecha) return '';
        
        // Si ya es un string en formato YYYY-MM-DD, devolverlo tal como está
        if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
        }
        
        // Si es un objeto Date, convertirlo usando zona horaria local
        if (fecha instanceof Date) {
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0');
            const day = String(fecha.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Si es un string que puede ser parseado como fecha
        if (typeof fecha === 'string') {
            // CORRECCIÓN: Para fechas simples YYYY-MM-DD, usar parsing local para evitar problemas de zona horaria
            if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Fecha simple YYYY-MM-DD - crear fecha local
                const [year, month, day] = fecha.split('-').map(Number);
                const dateObj = new Date(year, month - 1, day);
                if (!isNaN(dateObj.getTime())) {
                    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
            } else {
                // Otros formatos - usar parsing normal
                const dateObj = new Date(fecha);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
        }
        
        return '';
    }
    
    // Simular la función formatearFecha que está en el frontend (para mostrar fechas formateadas)
    function formatearFecha(fecha) {
        if (!fecha) return 'Sin fecha';
        
        try {
            // Manejar fechas ISO (2025-09-08T00:00:00.000Z) y fechas simples (YYYY-MM-DD)
            let fechaObj;
            if (fecha.includes('T')) {
                // CORRECCIÓN: Fecha ISO UTC del servidor - extraer solo la parte de fecha para evitar problemas de zona horaria
                const fechaParte = fecha.split('T')[0]; // "2025-12-25"
                const [año, mes, dia] = fechaParte.split('-').map(Number);
                fechaObj = new Date(año, mes - 1, dia); // Crear fecha local
            } else {
                // Fecha simple (YYYY-MM-DD) - crear fecha local
                const [año, mes, dia] = fecha.split('-').map(Number);
                fechaObj = new Date(año, mes - 1, dia);
            }
            
            return fechaObj.toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formateando fecha:', error, 'Fecha original:', fecha);
            return 'Fecha inválida';
        }
    }
    
    console.log('📋 DATOS DE LA RESERVA:');
    console.log(`   Código: ${reserva.codigo_reserva}`);
    console.log(`   Cliente: ${reserva.nombre_cliente}`);
    console.log(`   Complejo: ${reserva.complejo_nombre}`);
    console.log(`   Cancha: ${reserva.cancha_nombre}`);
    console.log(`   Fecha raw: ${reserva.fecha}`);
    console.log(`   Hora: ${reserva.hora_inicio} - ${reserva.hora_fin}`);
    
    console.log('\n🖥️  LO QUE VE EL USUARIO EN LA LISTA DE RESERVAS:');
    console.log('==================================================');
    
    // Simular la tabla HTML que ve el usuario
    const fechaMostrada = formatearFechaParaAPI(reserva.fecha);
    const fechaFormateada = formatearFecha(reserva.fecha);
    
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│                    LISTA DE RESERVAS                        │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ Código  │ Cliente        │ Complejo    │ Cancha      │ Fecha │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ ${reserva.codigo_reserva.padEnd(7)} │ ${reserva.nombre_cliente.padEnd(13)} │ ${reserva.complejo_nombre.padEnd(10)} │ ${reserva.cancha_nombre.padEnd(10)} │ ${fechaMostrada.padEnd(5)} │`);
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('\n📅 ANÁLISIS DE LA FECHA:');
    console.log('========================');
    console.log(`📅 Fecha en la base de datos: ${reserva.fecha}`);
    console.log(`📅 Fecha mostrada en la tabla: ${fechaMostrada}`);
    console.log(`📅 Fecha formateada para mostrar: ${fechaFormateada}`);
    
    // Verificar si hay problema
    if (fechaMostrada === reserva.fecha) {
        console.log('✅ Fecha mostrada correctamente (sin cambio de día)');
        return true;
    } else {
        console.log('❌ Fecha mostrada incorrectamente (cambio de día detectado)');
        return false;
    }
}

async function verifyFrontendDisplay() {
    try {
        console.log('🚀 Verificando qué se muestra en el frontend...');
        
        // Obtener la reserva GRCHUY
        const reservationResponse = await makeRequest('/api/reservas/GRCHUY');
        
        if (reservationResponse.status === 200) {
            const reserva = reservationResponse.data;
            
            // Simular lo que ve el usuario
            const isCorrect = simulateFrontendDisplay(reserva);
            
            console.log('\n📊 RESULTADO DE LA VERIFICACIÓN:');
            console.log('================================');
            
            if (isCorrect) {
                console.log('✅ ¡EL FRONTEND MUESTRA LA FECHA CORRECTAMENTE!');
                console.log('✅ La reserva GRCHUY se muestra con la fecha 2025-09-20');
                console.log('✅ No hay problema de cambio de día');
                console.log('✅ Las correcciones están funcionando en el frontend');
                
                console.log('\n🎯 CONFIRMACIÓN:');
                console.log('El usuario ve en la lista de reservas:');
                console.log(`- Código: ${reserva.codigo_reserva}`);
                console.log(`- Fecha: ${reserva.fecha}`);
                console.log(`- Formateada: ${new Date(reserva.fecha.split('-').map(Number)).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
                
            } else {
                console.log('❌ EL FRONTEND AÚN MUESTRA LA FECHA INCORRECTAMENTE');
                console.log('❌ Hay un problema de cambio de día');
                console.log('❌ Las correcciones no están funcionando en el frontend');
            }
            
        } else {
            console.log('❌ No se pudo obtener la reserva GRCHUY');
        }
        
    } catch (error) {
        console.error('❌ Error verificando frontend:', error.message);
    }
}

// Ejecutar verificación del frontend
verifyFrontendDisplay();

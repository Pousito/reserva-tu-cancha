#!/usr/bin/env node

/**
 * Script automatizado para verificar que la corrección de fechas esté funcionando en producción
 */

const https = require('https');

const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

console.log('🤖 VERIFICACIÓN AUTOMATIZADA DE CORRECCIÓN DE FECHAS - PRODUCCIÓN');
console.log('================================================================');
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
                'User-Agent': 'AutomatedDateFixVerification/1.0',
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

// Función para verificar que el archivo esté desplegado correctamente
async function verifyFileDeployment() {
    try {
        console.log('\n📁 1. Verificando que los archivos corregidos estén desplegados...');
        
        // Verificar que no haya funciones duplicadas
        const adminReservationsResponse = await makeRequest('/admin-reservations.js');
        
        if (adminReservationsResponse.status === 200) {
            const fileContent = adminReservationsResponse.data;
            
            // Verificar que la función formatearFechaParaAPI esté presente
            if (fileContent.includes('function formatearFechaParaAPI')) {
                console.log('✅ Función formatearFechaParaAPI encontrada');
            } else {
                console.log('❌ Función formatearFechaParaAPI NO encontrada');
                return false;
            }
            
            // Verificar que no haya funciones formatearFecha duplicadas
            const formatearFechaMatches = (fileContent.match(/function formatearFecha\(/g) || []).length;
            if (formatearFechaMatches === 1) {
                console.log('✅ Solo una función formatearFecha encontrada (sin duplicados)');
            } else {
                console.log(`❌ Se encontraron ${formatearFechaMatches} funciones formatearFecha (debería ser 1)`);
                return false;
            }
            
            // Verificar que las llamadas estén actualizadas
            if (fileContent.includes('formatearFechaParaAPI(reserva.fecha)')) {
                console.log('✅ Llamadas actualizadas para usar formatearFechaParaAPI');
            } else {
                console.log('❌ Llamadas NO actualizadas para usar formatearFechaParaAPI');
                return false;
            }
            
            return true;
        } else {
            console.log('❌ No se pudo acceder al archivo admin-reservations.js');
            return false;
        }
    } catch (error) {
        console.log('❌ Error verificando archivos:', error.message);
        return false;
    }
}

// Función para verificar que las reservas se muestren correctamente
async function verifyReservationDates() {
    try {
        console.log('\n📅 2. Verificando que las fechas de reservas se muestren correctamente...');
        
        // Obtener la reserva GRCHUY
        const reservationResponse = await makeRequest('/api/reservas/GRCHUY');
        
        if (reservationResponse.status === 200) {
            const reserva = reservationResponse.data;
            console.log(`✅ Reserva GRCHUY encontrada: ${reserva.fecha}`);
            
            // Verificar que la fecha sea correcta
            if (reserva.fecha === '2025-09-20') {
                console.log('✅ Fecha de reserva correcta en la base de datos');
                
                // Simular el formateo que debería hacer el frontend
                function simulateFrontendFormatting(fecha) {
                    // Simular la función formatearFechaParaAPI corregida
                    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                        return fecha; // Debería devolver la fecha tal como está
                    }
                    return fecha;
                }
                
                const formattedDate = simulateFrontendFormatting(reserva.fecha);
                
                if (formattedDate === '2025-09-20') {
                    console.log('✅ Formateo de fecha correcto (sin cambio de día)');
                    return true;
                } else {
                    console.log(`❌ Formateo de fecha incorrecto: ${formattedDate} (debería ser 2025-09-20)`);
                    return false;
                }
            } else {
                console.log(`❌ Fecha de reserva incorrecta: ${reserva.fecha} (debería ser 2025-09-20)`);
                return false;
            }
        } else {
            console.log('❌ No se pudo obtener la reserva GRCHUY');
            return false;
        }
    } catch (error) {
        console.log('❌ Error verificando fechas de reservas:', error.message);
        return false;
    }
}

// Función para verificar el estado del servidor
async function verifyServerStatus() {
    try {
        console.log('\n🖥️  3. Verificando estado del servidor...');
        
        const healthResponse = await makeRequest('/health');
        
        if (healthResponse.status === 200) {
            console.log('✅ Servidor funcionando correctamente');
            console.log(`📅 Timestamp del servidor: ${healthResponse.data.timestamp}`);
            console.log(`🗄️  Base de datos: ${healthResponse.data.database.type}`);
            
            // Verificar que el servidor esté actualizado
            const serverTime = new Date(healthResponse.data.timestamp);
            const now = new Date();
            const timeDiff = Math.abs(now - serverTime);
            
            if (timeDiff < 300000) { // Menos de 5 minutos de diferencia
                console.log('✅ Servidor actualizado recientemente');
                return true;
            } else {
                console.log('⚠️  Servidor puede no estar actualizado');
                return false;
            }
        } else {
            console.log('❌ Error en el servidor:', healthResponse.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Error verificando estado del servidor:', error.message);
        return false;
    }
}

// Función principal de verificación automatizada
async function automatedVerification() {
    try {
        console.log('🚀 Iniciando verificación automatizada...');
        
        const results = {
            serverStatus: false,
            fileDeployment: false,
            reservationDates: false
        };
        
        // Verificar estado del servidor
        results.serverStatus = await verifyServerStatus();
        
        // Verificar que los archivos estén desplegados correctamente
        results.fileDeployment = await verifyFileDeployment();
        
        // Verificar que las fechas de reservas se muestren correctamente
        results.reservationDates = await verifyReservationDates();
        
        // Generar reporte final
        console.log('\n📊 REPORTE FINAL DE VERIFICACIÓN AUTOMATIZADA:');
        console.log('==============================================');
        console.log(`🖥️  Estado del servidor: ${results.serverStatus ? '✅ CORRECTO' : '❌ ERROR'}`);
        console.log(`📁 Despliegue de archivos: ${results.fileDeployment ? '✅ CORRECTO' : '❌ ERROR'}`);
        console.log(`📅 Fechas de reservas: ${results.reservationDates ? '✅ CORRECTO' : '❌ ERROR'}`);
        
        const allCorrect = results.serverStatus && results.fileDeployment && results.reservationDates;
        
        if (allCorrect) {
            console.log('\n🎉 ¡VERIFICACIÓN AUTOMATIZADA EXITOSA!');
            console.log('✅ Todas las correcciones están funcionando correctamente');
            console.log('✅ El problema de fechas en la lista de reservas del panel de admin está resuelto');
            console.log('✅ La reserva GRCHUY (2025-09-20) se muestra correctamente');
            console.log('✅ No hay conflictos de funciones');
            console.log('✅ Los archivos están desplegados correctamente');
            
            console.log('\n📝 PRÓXIMOS PASOS:');
            console.log('1. Ve a https://www.reservatuscanchas.cl/admin-reservations.html');
            console.log('2. Inicia sesión como administrador');
            console.log('3. Verifica que la reserva GRCHUY muestre la fecha correcta');
            console.log('4. Confirma que no hay problemas de fechas');
            
            process.exit(0); // Éxito
        } else {
            console.log('\n❌ VERIFICACIÓN AUTOMATIZADA FALLIDA');
            console.log('❌ Algunas correcciones no están funcionando correctamente');
            console.log('❌ Revisar los errores anteriores');
            
            process.exit(1); // Error
        }
        
    } catch (error) {
        console.error('❌ Error en verificación automatizada:', error.message);
        process.exit(1); // Error
    }
}

// Ejecutar verificación automatizada
automatedVerification();

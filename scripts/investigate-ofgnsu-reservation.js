#!/usr/bin/env node

/**
 * Script para investigar específicamente la reserva OFGNSU en producción
 */

const https = require('https');

const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

console.log('🔍 INVESTIGACIÓN ESPECÍFICA DE LA RESERVA OFGNSU EN PRODUCCIÓN');
console.log('============================================================');
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
                'User-Agent': 'OFGNSUInvestigation/1.0',
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

async function investigateOFGNSUReservation() {
    try {
        console.log('\n📊 1. Verificando estado del servidor...');
        const healthResponse = await makeRequest('/health');
        
        if (healthResponse.status === 200) {
            console.log('✅ Servidor funcionando correctamente');
            console.log('📅 Timestamp del servidor:', healthResponse.data.timestamp);
            console.log('🗄️  Base de datos:', healthResponse.data.database.type);
        } else {
            console.log('❌ Error en el servidor:', healthResponse.status);
            return;
        }

        console.log('\n🔍 2. Investigando la reserva OFGNSU...');
        
        // Intentar obtener información de la reserva OFGNSU
        try {
            const reservationResponse = await makeRequest('/api/reservas/OFGNSU');
            
            if (reservationResponse.status === 200) {
                console.log('✅ Reserva OFGNSU encontrada');
                console.log('📋 Datos de la reserva:', JSON.stringify(reservationResponse.data, null, 2));
                
                const reserva = reservationResponse.data;
                
                console.log('\n🔍 3. Análisis detallado de la fecha de la reserva OFGNSU:');
                console.log('========================================================');
                console.log('📅 Fecha raw de la reserva:', reserva.fecha);
                console.log('📅 Tipo de fecha:', typeof reserva.fecha);
                console.log('📅 Fecha en formato ISO:', new Date(reserva.fecha).toISOString());
                console.log('📅 Fecha en formato local:', new Date(reserva.fecha).toLocaleDateString('es-CL'));
                
                // Probar diferentes métodos de parsing
                console.log('\n🧪 PRUEBAS DE PARSING DE LA FECHA OFGNSU:');
                console.log('==========================================');
                
                const fechaRaw = reserva.fecha;
                
                // Método 1: new Date(string) - problemático
                const fecha1 = new Date(fechaRaw);
                const formatted1 = fecha1.toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                console.log(`1. new Date("${fechaRaw}"): ${formatted1}`);
                
                // Método 2: Extraer parte de fecha y crear local
                if (fechaRaw.includes('T')) {
                    const fechaParte = fechaRaw.split('T')[0];
                    const [year, month, day] = fechaParte.split('-').map(Number);
                    const fecha2 = new Date(year, month - 1, day);
                    const formatted2 = fecha2.toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    console.log(`2. new Date(${year}, ${month-1}, ${day}): ${formatted2}`);
                }
                
                // Método 3: Con timezone específico
                const fecha3 = new Date(fechaRaw);
                const formatted3 = fecha3.toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'America/Santiago'
                });
                console.log(`3. Con timezone America/Santiago: ${formatted3}`);
                
                console.log('\n🔍 4. Verificando qué está pasando en la base de datos...');
                
                // Verificar si hay información adicional en la respuesta
                console.log('📋 Todos los campos de la reserva:');
                Object.keys(reserva).forEach(key => {
                    console.log(`  ${key}: ${reserva[key]} (tipo: ${typeof reserva[key]})`);
                });
                
            } else {
                console.log('❌ No se pudo obtener la reserva OFGNSU:', reservationResponse.status);
                console.log('📋 Respuesta:', reservationResponse.data);
            }
        } catch (error) {
            console.log('❌ Error obteniendo reserva OFGNSU:', error.message);
        }

        console.log('\n🔍 5. Verificando el endpoint de reservas del admin...');
        
        // Intentar obtener todas las reservas para ver si OFGNSU está ahí
        try {
            const adminReservationsResponse = await makeRequest('/api/admin/reservas');
            
            if (adminReservationsResponse.status === 200) {
                console.log('✅ Endpoint de reservas del admin accesible');
                const reservas = adminReservationsResponse.data;
                console.log(`📊 Total de reservas encontradas: ${reservas.length}`);
                
                // Buscar la reserva OFGNSU
                const reservaOFGNSU = reservas.find(r => r.codigo_reserva === 'OFGNSU');
                
                if (reservaOFGNSU) {
                    console.log('✅ Reserva OFGNSU encontrada en la lista del admin');
                    console.log('📋 Datos de la reserva en admin:', JSON.stringify(reservaOFGNSU, null, 2));
                    
                    console.log('\n🔍 6. Análisis de la fecha en la lista del admin:');
                    console.log('==============================================');
                    console.log('📅 Fecha raw en admin:', reservaOFGNSU.fecha);
                    console.log('📅 Tipo de fecha en admin:', typeof reservaOFGNSU.fecha);
                    
                    // Probar la función formatearFecha del admin
                    function formatearFechaAdmin(fecha) {
                        if (!fecha) return 'Sin fecha';
                        
                        try {
                            let fechaObj;
                            if (fecha.includes('T')) {
                                // CORRECCIÓN: Fecha ISO UTC del servidor - extraer solo la parte de fecha
                                const fechaParte = fecha.split('T')[0];
                                const [año, mes, dia] = fechaParte.split('-').map(Number);
                                fechaObj = new Date(año, mes - 1, dia);
                            } else {
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
                            return 'Fecha inválida';
                        }
                    }
                    
                    const fechaFormateada = formatearFechaAdmin(reservaOFGNSU.fecha);
                    console.log('📅 Fecha formateada con función corregida:', fechaFormateada);
                    
                } else {
                    console.log('❌ Reserva OFGNSU no encontrada en la lista del admin');
                    console.log('📋 Códigos de reserva disponibles:', reservas.map(r => r.codigo_reserva).slice(0, 10));
                }
                
            } else {
                console.log('❌ No se pudo acceder al endpoint de reservas del admin:', adminReservationsResponse.status);
            }
        } catch (error) {
            console.log('❌ Error accediendo al endpoint de reservas del admin:', error.message);
        }

        console.log('\n🔍 7. Verificando la configuración de zona horaria del servidor...');
        
        const serverTime = new Date(healthResponse.data.timestamp);
        const localTime = new Date();
        
        console.log('🕐 Tiempo del servidor (UTC):', serverTime.toISOString());
        console.log('🕐 Tiempo local:', localTime.toISOString());
        console.log('🕐 Diferencia de tiempo:', Math.abs(serverTime - localTime), 'ms');
        
        // Verificar si hay información de zona horaria
        console.log('🌍 Zona horaria del servidor:', healthResponse.data.timezone || 'No especificada');

        console.log('\n📝 PRÓXIMOS PASOS:');
        console.log('1. Analizar los datos obtenidos de la reserva OFGNSU');
        console.log('2. Verificar si el problema está en el servidor o en el frontend');
        console.log('3. Revisar la configuración de zona horaria');
        console.log('4. Probar diferentes métodos de parsing de fechas');

    } catch (error) {
        console.error('❌ Error en la investigación:', error.message);
    }
}

// Ejecutar la investigación
investigateOFGNSUReservation();

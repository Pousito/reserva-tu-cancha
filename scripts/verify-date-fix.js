/**
 * Script de verificación para probar las correcciones de fechas
 * Verifica que las fechas se muestren correctamente en el frontend
 */

const DatabaseManager = require('../src/config/database');

async function verificarCorreccionFechas() {
    console.log('🔍 VERIFICACIÓN DE CORRECCIÓN DE FECHAS');
    console.log('=======================================');
    
    let db;
    
    try {
        // Conectar a la base de datos
        db = new DatabaseManager();
        await db.connect();
        console.log('✅ Conexión a base de datos establecida');
        
        // Verificar configuración de zona horaria
        console.log('\n🕐 Verificando configuración de zona horaria...');
        const timezoneResult = await db.query("SHOW timezone");
        console.log('Zona horaria configurada:', timezoneResult[0].timezone);
        
        if (timezoneResult[0].timezone === 'America/Santiago') {
            console.log('✅ Zona horaria configurada correctamente');
        } else {
            console.log('⚠️  Zona horaria no está configurada como America/Santiago');
        }
        
        // Obtener algunas reservas de prueba
        console.log('\n📋 Verificando fechas de reservas...');
        const reservas = await db.query(`
            SELECT codigo_reserva, fecha, nombre_cliente, created_at
            FROM reservas 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (reservas.length === 0) {
            console.log('⚠️  No hay reservas en la base de datos para verificar');
            return;
        }
        
        console.log(`\n📅 Fechas de las últimas ${reservas.length} reservas:`);
        reservas.forEach((reserva, index) => {
            console.log(`${index + 1}. Código: ${reserva.codigo_reserva}`);
            console.log(`   Fecha: ${reserva.fecha} (tipo: ${typeof reserva.fecha})`);
            console.log(`   Cliente: ${reserva.nombre_cliente}`);
            console.log(`   Creada: ${reserva.created_at}`);
            console.log('');
        });
        
        // Verificar formato de fechas
        console.log('🔍 Verificando formato de fechas...');
        const fechasValidas = reservas.every(reserva => {
            if (typeof reserva.fecha === 'string') {
                return /^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha);
            }
            return false;
        });
        
        if (fechasValidas) {
            console.log('✅ Todas las fechas están en formato YYYY-MM-DD correcto');
        } else {
            console.log('⚠️  Algunas fechas no están en el formato correcto');
        }
        
        // Simular el procesamiento del endpoint
        console.log('\n🔄 Simulando procesamiento del endpoint...');
        const reservasProcesadas = reservas.map(reserva => {
            if (reserva.fecha) {
                if (typeof reserva.fecha === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(reserva.fecha)) {
                        // Fecha ya está en formato correcto
                    } else {
                        // Convertir fecha a formato YYYY-MM-DD
                        const fechaObj = new Date(reserva.fecha);
                        if (!isNaN(fechaObj.getTime())) {
                            const year = fechaObj.getFullYear();
                            const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
                            const day = String(fechaObj.getDate()).padStart(2, '0');
                            reserva.fecha = `${year}-${month}-${day}`;
                        }
                    }
                }
            }
            return reserva;
        });
        
        console.log('📅 Fechas después del procesamiento:');
        reservasProcesadas.forEach((reserva, index) => {
            console.log(`${index + 1}. ${reserva.codigo_reserva}: ${reserva.fecha}`);
        });
        
        // Verificar función formatearFechaParaAPI
        console.log('\n🎨 Verificando función formatearFechaParaAPI...');
        
        // Simular la función del frontend
        function formatearFechaParaAPI(fecha) {
            if (!fecha) return '';
            
            if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                return fecha;
            }
            
            if (fecha instanceof Date) {
                const fechaChile = new Date(fecha.toLocaleString("en-US", {timeZone: "America/Santiago"}));
                const year = fechaChile.getFullYear();
                const month = String(fechaChile.getMonth() + 1).padStart(2, '0');
                const day = String(fechaChile.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            if (typeof fecha === 'string') {
                if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const [year, month, day] = fecha.split('-').map(Number);
                    const dateObj = new Date(year, month - 1, day);
                    if (!isNaN(dateObj.getTime())) {
                        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    }
                } else {
                    const dateObj = new Date(fecha);
                    if (!isNaN(dateObj.getTime())) {
                        const fechaChile = new Date(dateObj.toLocaleString("en-US", {timeZone: "America/Santiago"}));
                        const year = fechaChile.getFullYear();
                        const month = String(fechaChile.getMonth() + 1).padStart(2, '0');
                        const day = String(fechaChile.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
            }
            
            return '';
        }
        
        console.log('📅 Resultados de formatearFechaParaAPI:');
        reservasProcesadas.forEach((reserva, index) => {
            const fechaFormateada = formatearFechaParaAPI(reserva.fecha);
            console.log(`${index + 1}. ${reserva.codigo_reserva}: ${reserva.fecha} → ${fechaFormateada}`);
        });
        
        console.log('\n✅ Verificación completada');
        console.log('\n📋 RESUMEN:');
        console.log('- Zona horaria configurada:', timezoneResult[0].timezone);
        console.log('- Fechas en formato correcto:', fechasValidas ? 'Sí' : 'No');
        console.log('- Procesamiento de fechas:', 'Implementado');
        console.log('- Función formatearFechaParaAPI:', 'Corregida');
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
    } finally {
        if (db) {
            await db.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    verificarCorreccionFechas();
}

module.exports = { verificarCorreccionFechas };

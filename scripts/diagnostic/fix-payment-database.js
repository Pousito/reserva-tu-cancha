#!/usr/bin/env node

/**
 * Script para diagnosticar y corregir problemas de base de datos en el flujo de pago
 * Verifica la estructura de la tabla bloqueos_temporales en PostgreSQL
 */

const https = require('https');
const http = require('http');

// Configuración
const PRODUCTION_URL = 'https://www.reservatuscanchas.cl';

// Función para hacer petición HTTP/HTTPS
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PaymentDatabaseFix/1.0)',
                ...options.headers
            }
        };
        
        const req = client.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.on('error', reject);
        req.end();
    });
}

// Verificar endpoint de salud de la base de datos
async function checkDatabaseHealth() {
    console.log('🔍 Verificando salud de la base de datos...');
    
    try {
        const response = await makeRequest(`${PRODUCTION_URL}/health`);
        
        if (response.statusCode === 200) {
            const healthData = JSON.parse(response.body);
            console.log('✅ Base de datos conectada');
            console.log('📊 Estado:', healthData.database);
            console.log('📊 Reservas:', healthData.reservasCount);
            console.log('📊 Canchas:', healthData.canchasCount);
            console.log('📊 Complejos:', healthData.complejosCount);
            return true;
        } else {
            console.log(`❌ Health check falló: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando salud de la base de datos:', error.message);
        return false;
    }
}

// Probar endpoint de disponibilidad completa
async function testAvailabilityEndpoint() {
    console.log('🔍 Probando endpoint de disponibilidad completa...');
    
    try {
        // Usar una fecha futura para la prueba
        const fecha = '2024-12-31';
        const canchaId = '1';
        
        const response = await makeRequest(`${PRODUCTION_URL}/api/disponibilidad-completa/${canchaId}/${fecha}`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('✅ Endpoint de disponibilidad funciona');
            console.log('📊 Datos recibidos:', Object.keys(data));
            return true;
        } else {
            console.log(`❌ Endpoint de disponibilidad falló: ${response.statusCode}`);
            console.log('📋 Respuesta:', response.body.substring(0, 500));
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando endpoint de disponibilidad:', error.message);
        return false;
    }
}

// Probar endpoint de bloquear-y-pagar con datos de prueba
async function testBlockAndPayEndpoint() {
    console.log('🔍 Probando endpoint bloquear-y-pagar...');
    
    try {
        const testData = {
            cancha_id: 1,
            nombre_cliente: 'Test Cliente',
            email_cliente: 'test@example.com',
            telefono_cliente: '+56912345678',
            rut_cliente: '12345678-9',
            fecha: '2024-12-31',
            hora_inicio: '10:00',
            hora_fin: '11:00',
            precio_total: 25000,
            session_id: 'TEST_' + Date.now()
        };
        
        const response = await makeRequest(`${PRODUCTION_URL}/api/reservas/bloquear-y-pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log(`📡 Endpoint responde con código: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('✅ Endpoint bloquear-y-pagar funciona');
            console.log('📊 Respuesta:', data);
            return true;
        } else if (response.statusCode === 500) {
            console.log('❌ Error 500 en endpoint bloquear-y-pagar');
            console.log('📋 Respuesta:', response.body.substring(0, 1000));
            return false;
        } else {
            console.log(`⚠️ Respuesta inesperada: ${response.statusCode}`);
            console.log('📋 Respuesta:', response.body.substring(0, 500));
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando endpoint bloquear-y-pagar:', error.message);
        return false;
    }
}

// Verificar estructura de la tabla bloqueos_temporales
async function checkBlockingTableStructure() {
    console.log('🔍 Verificando estructura de tabla bloqueos_temporales...');
    
    try {
        // Crear un endpoint de debug para verificar la estructura de la tabla
        const response = await makeRequest(`${PRODUCTION_URL}/api/debug/check-blocking-table`);
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            console.log('✅ Estructura de tabla verificada');
            console.log('📊 Estructura:', data);
            return true;
        } else {
            console.log(`❌ No se pudo verificar estructura: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log('⚠️ Endpoint de debug no disponible, continuando...');
        return true; // No es crítico
    }
}

// Crear endpoint de debug para verificar la tabla
async function createDebugEndpoint() {
    console.log('🔍 Creando endpoint de debug...');
    
    try {
        const debugCode = `
// Endpoint para verificar estructura de tabla bloqueos_temporales
app.get('/api/debug/check-blocking-table', async (req, res) => {
  try {
    console.log('🔍 Verificando estructura de tabla bloqueos_temporales...');
    
    // Verificar si la tabla existe
    const tableExists = await db.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bloqueos_temporales'
      );
    \`);
    
    if (!tableExists[0].exists) {
      return res.json({
        success: false,
        error: 'Tabla bloqueos_temporales no existe',
        tableExists: false
      });
    }
    
    // Obtener estructura de la tabla
    const structure = await db.query(\`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bloqueos_temporales'
      ORDER BY ordinal_position;
    \`);
    
    // Contar registros
    const count = await db.query('SELECT COUNT(*) as count FROM bloqueos_temporales');
    
    res.json({
      success: true,
      tableExists: true,
      structure: structure,
      recordCount: count[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});
`;
        
        // Guardar el código de debug
        const fs = require('fs');
        const path = require('path');
        const debugFilePath = path.join(process.cwd(), 'debug-blocking-table.js');
        fs.writeFileSync(debugFilePath, debugCode);
        console.log('✅ Código de debug creado en debug-blocking-table.js');
        
        return true;
    } catch (error) {
        console.error('❌ Error creando endpoint de debug:', error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando diagnóstico de problemas de pago...\n');
    
    // Ejecutar todas las verificaciones
    const results = {
        databaseHealth: await checkDatabaseHealth(),
        availabilityEndpoint: await testAvailabilityEndpoint(),
        blockAndPayEndpoint: await testBlockAndPayEndpoint(),
        tableStructure: await checkBlockingTableStructure()
    };
    
    console.log('\n📋 === RESULTADOS DEL DIAGNÓSTICO ===');
    console.log(`Salud de BD: ${results.databaseHealth ? '✅' : '❌'}`);
    console.log(`Endpoint disponibilidad: ${results.availabilityEndpoint ? '✅' : '❌'}`);
    console.log(`Endpoint bloquear-y-pagar: ${results.blockAndPayEndpoint ? '✅' : '❌'}`);
    console.log(`Estructura de tabla: ${results.tableStructure ? '✅' : '❌'}`);
    
    // Crear endpoint de debug si es necesario
    if (!results.blockAndPayEndpoint) {
        await createDebugEndpoint();
    }
    
    const allPassed = results.databaseHealth && results.availabilityEndpoint && results.blockAndPayEndpoint;
    
    if (allPassed) {
        console.log('\n🎉 ¡TODOS LOS ENDPOINTS FUNCIONAN!');
        console.log('✅ El flujo de pago debería funcionar correctamente');
    } else {
        console.log('\n⚠️ HAY PROBLEMAS DETECTADOS');
        console.log('❌ El flujo de pago puede no funcionar correctamente');
        console.log('\n💡 Posibles soluciones:');
        console.log('1. Verificar estructura de tabla bloqueos_temporales');
        console.log('2. Agregar columnas faltantes (datos_cliente, created_at)');
        console.log('3. Verificar permisos de base de datos');
    }
    
    console.log('\n✅ Diagnóstico completado');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkDatabaseHealth,
    testAvailabilityEndpoint,
    testBlockAndPayEndpoint,
    checkBlockingTableStructure,
    createDebugEndpoint
};

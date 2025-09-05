const http = require('http');

console.log('=== PRUEBA COMPLETA DEL SISTEMA ===');

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function testSystem() {
    try {
        console.log('1. Probando login de Super Admin...');
        const superAdminLogin = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'admin@reservatucancha.com',
            password: 'admin123'
        });
        
        if (superAdminLogin.status === 200) {
            console.log('✅ Super Admin login exitoso');
            console.log(`   Token: ${superAdminLogin.data.token.substring(0, 20)}...`);
            console.log(`   Rol: ${superAdminLogin.data.user.rol}`);
        } else {
            console.log('❌ Error en Super Admin login');
        }
        
        console.log('\n2. Probando login de Dueño de Complejo...');
        const complexOwnerLogin = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'magnasports@reservatucancha.com',
            password: 'magnasports123'
        });
        
        if (complexOwnerLogin.status === 200) {
            console.log('✅ Dueño de Complejo login exitoso');
            console.log(`   Token: ${complexOwnerLogin.data.token.substring(0, 20)}...`);
            console.log(`   Rol: ${complexOwnerLogin.data.user.rol}`);
            console.log(`   Complejo ID: ${complexOwnerLogin.data.user.complejo_id}`);
        } else {
            console.log('❌ Error en Dueño de Complejo login');
        }
        
        console.log('\n3. Probando estadísticas de Super Admin...');
        const superAdminStats = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/estadisticas',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${superAdminLogin.data.token}` }
        });
        
        if (superAdminStats.status === 200) {
            console.log('✅ Estadísticas Super Admin obtenidas');
            console.log(`   Total reservas: ${superAdminStats.data.totalReservas}`);
            console.log(`   Total complejos: ${superAdminStats.data.totalComplejos}`);
            console.log(`   Total canchas: ${superAdminStats.data.totalCanchas}`);
        } else {
            console.log('❌ Error obteniendo estadísticas Super Admin');
        }
        
        console.log('\n4. Probando estadísticas de Dueño de Complejo...');
        const complexOwnerStats = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/estadisticas',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${complexOwnerLogin.data.token}` }
        });
        
        if (complexOwnerStats.status === 200) {
            console.log('✅ Estadísticas Dueño de Complejo obtenidas');
            console.log(`   Total reservas: ${complexOwnerStats.data.totalReservas}`);
            console.log(`   Total complejos: ${complexOwnerStats.data.totalComplejos}`);
            console.log(`   Total canchas: ${complexOwnerStats.data.totalCanchas}`);
        } else {
            console.log('❌ Error obteniendo estadísticas Dueño de Complejo');
        }
        
        console.log('\n5. Probando reservas recientes de Super Admin...');
        const superAdminRecent = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/reservas-recientes',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${superAdminLogin.data.token}` }
        });
        
        if (superAdminRecent.status === 200) {
            console.log('✅ Reservas recientes Super Admin obtenidas');
            console.log(`   Cantidad: ${superAdminRecent.data.length}`);
            if (superAdminRecent.data.length > 0) {
                console.log(`   Primera reserva: ${superAdminRecent.data[0].cliente_nombre} - ${superAdminRecent.data[0].complejo_nombre}`);
            }
        } else {
            console.log('❌ Error obteniendo reservas recientes Super Admin');
        }
        
        console.log('\n6. Probando reservas recientes de Dueño de Complejo...');
        const complexOwnerRecent = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/reservas-recientes',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${complexOwnerLogin.data.token}` }
        });
        
        if (complexOwnerRecent.status === 200) {
            console.log('✅ Reservas recientes Dueño de Complejo obtenidas');
            console.log(`   Cantidad: ${complexOwnerRecent.data.length}`);
            if (complexOwnerRecent.data.length > 0) {
                console.log(`   Primera reserva: ${complexOwnerRecent.data[0].cliente_nombre} - ${complexOwnerRecent.data[0].complejo_nombre}`);
            }
        } else {
            console.log('❌ Error obteniendo reservas recientes Dueño de Complejo');
        }
        
        console.log('\n7. Probando validación de reservas duplicadas...');
        const duplicateTest = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/reservas',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            cancha_id: 5,
            fecha: '2025-08-27',
            hora_inicio: '16:00',
            hora_fin: '17:00',
            nombre_cliente: 'Test Duplicado',
            rut_cliente: '11111111-1',
            email_cliente: 'test@email.com',
            precio_total: 28000
        });
        
        if (duplicateTest.status === 400) {
            if (duplicateTest.data.code === 'RESERVATION_CONFLICT') {
                console.log('✅ Validación de duplicados funcionando correctamente');
                console.log(`   Error: ${duplicateTest.data.error}`);
            } else {
                console.log('❌ Error inesperado en validación de duplicados');
            }
        } else {
            console.log('❌ La validación de duplicados no está funcionando');
        }
        
        console.log('\n🎉 Prueba del sistema completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error durante las pruebas:', error.message);
    }
}

testSystem();

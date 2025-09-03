const http = require('http');

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

async function testComplexUpdate() {
    console.log('=== PRUEBA DE ACTUALIZACIÓN DE COMPLEJO ===');
    
    try {
        // Primero hacer login
        console.log('1. Haciendo login...');
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'admin@reservatucancha.com',
            password: 'admin123'
        });
        
        if (loginResponse.status !== 200) {
            console.log('❌ Error en login:', loginResponse.data);
            return;
        }
        
        console.log('✅ Login exitoso');
        const token = loginResponse.data.token;
        
        // Probar actualización de complejo
        console.log('2. Probando actualización de complejo...');
        const updateResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/complejos/1',
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            nombre: 'Complejo Deportivo Central - Actualizado',
            ciudad_id: 1,
            email: 'info@complejocentral.cl',
            telefono: '+56 2 1234 5678',
            direccion: 'Av. Principal 123, Santiago',
            descripcion: 'Complejo deportivo actualizado para pruebas'
        });
        
        console.log('Respuesta de actualización:', updateResponse.status, updateResponse.data);
        
        if (updateResponse.status === 200) {
            console.log('✅ Actualización exitosa');
        } else {
            console.log('❌ Error en actualización:', updateResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
    }
}

testComplexUpdate();




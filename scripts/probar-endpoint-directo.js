const fetch = require('node-fetch');

async function probarEndpointDirecto() {
    console.log('🌐 PROBANDO ENDPOINT DIRECTO');
    console.log('============================');
    
    try {
        // URL de producción
        const baseUrl = 'https://www.reservatuscanchas.cl';
        
        // Simular token (necesitarías un token real)
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImVtYWlsIjoib3duZXJAY29tcGxlam9kZW1vMy5jbCIsIm5vbWJyZSI6Ik93bmVyIENvbXBsZWpvIERlbW8gMyIsInJvbCI6Im93bmVyIiwiY29tcGxlam9faWQiOjgsImlhdCI6MTczNDY5NzUyMCwiZXhwIjoxNzM0NzgzOTIwfQ.8QZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ';
        
        console.log('🔍 Probando endpoint de categorías...');
        const categoriasResponse = await fetch(`${baseUrl}/api/gastos/categorias`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`📊 Status categorías: ${categoriasResponse.status}`);
        const categoriasData = await categoriasResponse.json();
        console.log(`📊 Categorías recibidas: ${Array.isArray(categoriasData) ? categoriasData.length : 'No es array'}`);
        
        console.log('\n🔍 Probando endpoint de movimientos...');
        const movimientosResponse = await fetch(`${baseUrl}/api/gastos/movimientos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`📊 Status movimientos: ${movimientosResponse.status}`);
        const movimientosData = await movimientosResponse.json();
        console.log(`📊 Movimientos recibidos: ${Array.isArray(movimientosData) ? movimientosData.length : 'No es array'}`);
        
        if (movimientosResponse.status !== 200) {
            console.log('❌ Error en movimientos:', movimientosData);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

probarEndpointDirecto();

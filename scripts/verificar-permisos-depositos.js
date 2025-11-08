const fetch = require('node-fetch');

async function verificarPermisosDepositos() {
    console.log('🔐 VERIFICANDO PERMISOS DE GESTIÓN DE DEPÓSITOS');
    console.log('='.repeat(60));
    
    try {
        // 1. Probar acceso como super admin
        console.log('\n👑 PROBANDO ACCESO COMO SUPER ADMIN:');
        const adminLoginResponse = await fetch('https://reservatuscanchas.cl/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'admin@reservatuscanchas.cl', 
                password: 'admin123' 
            })
        });
        
        if (adminLoginResponse.ok) {
            const adminData = await adminLoginResponse.json();
            const adminToken = adminData.token;
            
            // Probar acceso a depósitos como super admin
            const adminDepositosResponse = await fetch('https://reservatuscanchas.cl/api/admin/depositos', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            if (adminDepositosResponse.ok) {
                console.log('✅ Super admin puede acceder a gestión de depósitos');
            } else {
                console.log('❌ Super admin NO puede acceder a gestión de depósitos');
            }
        }
        
        // 2. Probar acceso como owner
        console.log('\n🏢 PROBANDO ACCESO COMO OWNER:');
        const ownerLoginResponse = await fetch('https://reservatuscanchas.cl/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'owner@complejodemo3.com', 
                password: 'owner123' 
            })
        });
        
        if (ownerLoginResponse.ok) {
            const ownerData = await ownerLoginResponse.json();
            const ownerToken = ownerData.token;
            
            // Probar acceso a depósitos como owner
            const ownerDepositosResponse = await fetch('https://reservatuscanchas.cl/api/admin/depositos', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${ownerToken}` }
            });
            
            if (ownerDepositosResponse.ok) {
                console.log('❌ Owner PUEDE acceder a gestión de depósitos (NO DEBERÍA)');
            } else {
                console.log('✅ Owner NO puede acceder a gestión de depósitos (CORRECTO)');
            }
        }
        
        // 3. Probar acceso como manager
        console.log('\n👨‍💼 PROBANDO ACCESO COMO MANAGER:');
        const managerLoginResponse = await fetch('https://reservatuscanchas.cl/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: 'manager@complejodemo3.com', 
                password: 'manager123' 
            })
        });
        
        if (managerLoginResponse.ok) {
            const managerData = await managerLoginResponse.json();
            const managerToken = managerData.token;
            
            // Probar acceso a depósitos como manager
            const managerDepositosResponse = await fetch('https://reservatuscanchas.cl/api/admin/depositos', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${managerToken}` }
            });
            
            if (managerDepositosResponse.ok) {
                console.log('❌ Manager PUEDE acceder a gestión de depósitos (NO DEBERÍA)');
            } else {
                console.log('✅ Manager NO puede acceder a gestión de depósitos (CORRECTO)');
            }
        }
        
        console.log('\n🎯 RESUMEN DE PERMISOS:');
        console.log('   ✅ Super Admin: Debe poder acceder');
        console.log('   ❌ Owner: NO debe poder acceder');
        console.log('   ❌ Manager: NO debe poder acceder');
        
        console.log('\n📋 NOTA: Los cambios en el frontend (HTML) requieren que el usuario');
        console.log('   recargue la página para ver el efecto de las clases CSS.');
        
    } catch (error) {
        console.error('❌ Error verificando permisos:', error.message);
    }
}

verificarPermisosDepositos();




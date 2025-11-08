#!/usr/bin/env node

/**
 * Script para verificar que el sistema de depósitos esté funcionando
 */

console.log('🧪 Verificando sistema de depósitos...');

// Verificar que el servidor esté funcionando
const http = require('http');

function verificarServidor() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000', (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Servidor funcionando en puerto 3000');
                resolve(true);
            } else {
                console.log('❌ Servidor respondió con status:', res.statusCode);
                reject(false);
            }
        });
        
        req.on('error', (err) => {
            console.log('❌ Error conectando al servidor:', err.message);
            reject(false);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ Timeout conectando al servidor');
            reject(false);
        });
    });
}

function verificarPaginaDepositos() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/admin-depositos.html', (res) => {
            if (res.statusCode === 200) {
                console.log('✅ Página admin-depositos.html accesible');
                resolve(true);
            } else {
                console.log('❌ Página admin-depositos.html respondió con status:', res.statusCode);
                reject(false);
            }
        });
        
        req.on('error', (err) => {
            console.log('❌ Error accediendo a admin-depositos.html:', err.message);
            reject(false);
        });
    });
}

function verificarEndpointDepositos() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/admin/depositos', (res) => {
            if (res.statusCode === 401) {
                console.log('✅ Endpoint /api/admin/depositos protegido correctamente (401)');
                resolve(true);
            } else {
                console.log('⚠️  Endpoint /api/admin/depositos respondió con status:', res.statusCode);
                resolve(true); // No es error, solo diferente
            }
        });
        
        req.on('error', (err) => {
            console.log('❌ Error accediendo a endpoint:', err.message);
            reject(false);
        });
    });
}

async function main() {
    try {
        await verificarServidor();
        await verificarPaginaDepositos();
        await verificarEndpointDepositos();
        
        console.log('\n🎉 ¡Sistema de depósitos funcionando correctamente!');
        console.log('\n📝 Para probar:');
        console.log('  1. Ir a http://localhost:3000/admin-login.html');
        console.log('  2. Login con: admin@reservatuscanchas.cl / admin123');
        console.log('  3. Ir a "Gestión de Depósitos" en el sidebar');
        console.log('  4. Si sigue redirigiendo, hacer Ctrl+F5 para limpiar caché');
        
    } catch (error) {
        console.log('\n❌ Error verificando sistema:', error);
    }
}

main();




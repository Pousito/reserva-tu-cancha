#!/usr/bin/env node

/**
 * Script para corregir el rol de MagnaSports de 'admin' a 'owner'
 * Ejecutar: node scripts/fix-magnasports-role.js
 */

const bcrypt = require('bcryptjs');
const DatabaseManager = require('../src/config/database');

async function fixMagnasportsRole() {
    console.log('🏢 CORRIGIENDO ROL DE MAGNA SPORTS');
    console.log('===================================');
    
    let db;
    
    try {
        // Conectar a la base de datos
        db = new DatabaseManager();
        await db.connect();
        console.log('✅ Conectado a la base de datos');
        
        // Buscar usuario de MagnaSports
        const magnasportsUser = await db.get(
            'SELECT * FROM usuarios WHERE email = $1',
            ['naxiin320@gmail.com']
        );
        
        if (!magnasportsUser) {
            console.log('❌ Usuario de MagnaSports no encontrado');
            return;
        }
        
        console.log(`📧 Usuario encontrado: ${magnasportsUser.email}`);
        console.log(`👤 Nombre: ${magnasportsUser.nombre}`);
        console.log(`🎭 Rol actual: ${magnasportsUser.rol}`);
        console.log(`🏢 Complejo ID: ${magnasportsUser.complejo_id}`);
        
        // Verificar si ya tiene rol correcto
        if (magnasportsUser.rol === 'owner') {
            console.log('✅ El usuario ya tiene rol correcto (owner)');
            return;
        }
        
        // Actualizar rol a 'owner'
        const result = await db.run(
            'UPDATE usuarios SET rol = $1, nombre = $2 WHERE email = $3',
            ['owner', 'Dueño MagnaSports', 'naxiin320@gmail.com']
        );
        
        if (result.changes > 0) {
            console.log('✅ Rol actualizado exitosamente');
            console.log('🎭 Nuevo rol: owner');
            console.log('👤 Nuevo nombre: Dueño MagnaSports');
        } else {
            console.log('❌ No se pudo actualizar el rol');
        }
        
        // Verificar el cambio
        const updatedUser = await db.get(
            'SELECT u.*, c.nombre as complejo_nombre FROM usuarios u LEFT JOIN complejos c ON u.complejo_id = c.id WHERE u.email = $1',
            ['naxiin320@gmail.com']
        );
        
        console.log('\n🔍 VERIFICACIÓN FINAL:');
        console.log(`📧 Email: ${updatedUser.email}`);
        console.log(`👤 Nombre: ${updatedUser.nombre}`);
        console.log(`🎭 Rol: ${updatedUser.rol}`);
        console.log(`🏢 Complejo: ${updatedUser.complejo_nombre || 'Sin asignar'}`);
        console.log(`✅ Activo: ${updatedUser.activo ? 'Sí' : 'No'}`);
        
        console.log('\n🎉 CORRECCIÓN COMPLETADA');
        console.log('========================');
        console.log('🏢 MAGNA SPORTS - CREDENCIALES ACTUALIZADAS:');
        console.log('📧 Email: naxiin320@gmail.com');
        console.log('🔑 Password: magnasports2024');
        console.log('🎭 Rol: owner (Dueño)');
        console.log('🌐 URL: https://www.reservatuscanchas.cl/admin-login.html');
        console.log('');
        console.log('📋 PERMISOS ACTUALIZADOS:');
        console.log('   ✅ Ver reportes de MagnaSports');
        console.log('   ✅ Ver ingresos de MagnaSports');
        console.log('   ✅ Gestionar canchas de MagnaSports');
        console.log('   ✅ Gestionar reservas de MagnaSports');
        console.log('   ❌ No puede ver otros complejos');
        
    } catch (error) {
        console.error('❌ Error corrigiendo rol de MagnaSports:', error);
    } finally {
        if (db) {
            await db.close();
            console.log('\n🔌 Conexión a base de datos cerrada');
        }
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    fixMagnasportsRole()
        .then(() => {
            console.log('\n✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = fixMagnasportsRole;

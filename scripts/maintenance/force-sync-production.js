#!/usr/bin/env node

/**
 * Script para forzar la sincronización completa de la base de datos de producción
 * 
 * Este script:
 * 1. Elimina TODOS los datos existentes
 * 2. Recrea la estructura exacta de local
 * 3. Asegura que los IDs sean consistentes
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function forceSyncProduction() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔄 Iniciando sincronización forzada de producción...');
        
        // Verificar que estamos en producción
        if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️ ADVERTENCIA: Este script está diseñado para producción');
            console.log('   NODE_ENV actual:', process.env.NODE_ENV);
            console.log('   Continuando de todas formas...');
        }
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos de producción');
        
        console.log('📊 Base de datos: PostgreSQL (producción)');
        
        // PASO 1: Eliminar TODOS los datos existentes
        console.log('\n🧹 PASO 1: Eliminando todos los datos existentes...');
        
        // Eliminar en orden correcto para evitar problemas de foreign key
        await db.run('DELETE FROM reservas');
        console.log('✅ Reservas eliminadas');
        
        await db.run('DELETE FROM canchas');
        console.log('✅ Canchas eliminadas');
        
        // Actualizar usuarios para que no referencien complejos
        await db.run('UPDATE usuarios SET complejo_id = NULL WHERE complejo_id IS NOT NULL');
        console.log('✅ Referencias de usuarios a complejos eliminadas');
        
        await db.run('DELETE FROM complejos');
        console.log('✅ Complejos eliminados');
        
        await db.run('DELETE FROM ciudades');
        console.log('✅ Ciudades eliminadas');
        
        // PASO 2: Recrear estructura exacta de local
        console.log('\n🏗️ PASO 2: Recreando estructura exacta...');
        
        // Crear ciudad Los Ángeles con ID 1 (como en local)
        const ciudadResult = await db.run('INSERT INTO ciudades (id, nombre) VALUES (1, $1)', ['Los Ángeles']);
        console.log(`✅ Ciudad Los Ángeles creada con ID: 1`);
        
        // Crear complejo MagnaSports con ID 1 (como en local)
        const complejoResult = await db.run(`
            INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
            VALUES (1, $1, 1, $2, $3, $4)
        `, [
            'MagnaSports',
            'Monte Perdido 1685',
            '+56987654321',
            'reservas@magnasports.cl'
        ]);
        console.log(`✅ Complejo MagnaSports creado con ID: 1`);
        
        // Crear canchas con IDs 11 y 12 (como en local)
        const cancha1Result = await db.run(`
            INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
            VALUES (11, 1, $1, $2, $3)
        `, ['Cancha Techada 1', 'futbol', 28000]);
        console.log(`✅ Cancha Techada 1 creada con ID: 11`);
        
        const cancha2Result = await db.run(`
            INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
            VALUES (12, 1, $1, $2, $3)
        `, ['Cancha Techada 2', 'futbol', 28000]);
        console.log(`✅ Cancha Techada 2 creada con ID: 12`);
        
        // PASO 3: Verificar resultado final
        console.log('\n📊 PASO 3: Verificando resultado final...');
        
        const ciudadesFinales = await db.query('SELECT * FROM ciudades ORDER BY id');
        const complejosFinales = await db.query(`
            SELECT c.*, ci.nombre as ciudad_nombre 
            FROM complejos c 
            JOIN ciudades ci ON c.ciudad_id = ci.id 
            ORDER BY c.id
        `);
        const canchasFinales = await db.query(`
            SELECT c.*, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM canchas c 
            JOIN complejos co ON c.complejo_id = co.id 
            JOIN ciudades ci ON co.ciudad_id = ci.id 
            ORDER BY c.id
        `);
        
        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`   - Ciudades: ${ciudadesFinales.length}`);
        ciudadesFinales.forEach(ciudad => {
            console.log(`     * ${ciudad.nombre} (ID: ${ciudad.id})`);
        });
        
        console.log(`   - Complejos: ${complejosFinales.length}`);
        complejosFinales.forEach(complejo => {
            console.log(`     * ${complejo.nombre} en ${complejo.ciudad_nombre} (ID: ${complejo.id})`);
        });
        
        console.log(`   - Canchas: ${canchasFinales.length}`);
        canchasFinales.forEach(cancha => {
            console.log(`     * ${cancha.nombre} en ${cancha.complejo_nombre} (ID: ${cancha.id}) - $${cancha.precio_hora}`);
        });
        
        console.log('\n🎉 Sincronización forzada completada exitosamente');
        console.log('📋 Estructura final (IDENTICA A LOCAL):');
        console.log('   - Ciudad: Los Ángeles (ID: 1)');
        console.log('   - Complejo: MagnaSports (ID: 1)');
        console.log('   - Canchas: Cancha Techada 1 (ID: 11), Cancha Techada 2 (ID: 12)');
        
    } catch (error) {
        console.error('❌ Error durante la sincronización forzada:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    forceSyncProduction()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { forceSyncProduction };

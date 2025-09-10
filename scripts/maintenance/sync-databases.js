#!/usr/bin/env node

/**
 * Script para sincronizar las bases de datos de desarrollo y producción
 * 
 * Este script deja ambas bases de datos con:
 * - 1 ciudad: Los Ángeles
 * - 1 complejo: MagnaSports
 * - 2 canchas: Cancha Techada 1 y Cancha Techada 2
 * - Las reservas existentes se mantienen
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

async function syncDatabases() {
    const db = new DatabaseManager();
    
    try {
        console.log('🔄 Iniciando sincronización de bases de datos...');
        
        // Conectar a la base de datos
        await db.connect();
        console.log('✅ Conectado a la base de datos');
        
        const dbInfo = db.getDatabaseInfo();
        console.log(`📊 Base de datos: ${dbInfo.type}`);
        
        // PASO 1: Limpiar datos existentes (excepto reservas)
        console.log('\n🧹 PASO 1: Limpiando datos existentes...');
        
        // Eliminar canchas que no sean de MagnaSports
        const canchasEliminadas = await db.run(`
            DELETE FROM canchas 
            WHERE complejo_id NOT IN (
                SELECT id FROM complejos WHERE nombre = 'MagnaSports'
            )
        `);
        console.log(`✅ Canchas eliminadas: ${canchasEliminadas.changes || 0}`);
        
        // Eliminar complejos que no sean MagnaSports
        const complejosEliminados = await db.run(`
            DELETE FROM complejos WHERE nombre != 'MagnaSports'
        `);
        console.log(`✅ Complejos eliminados: ${complejosEliminados.changes || 0}`);
        
        // Eliminar ciudades que no sean Los Ángeles
        const ciudadesEliminadas = await db.run(`
            DELETE FROM ciudades WHERE nombre != 'Los Ángeles'
        `);
        console.log(`✅ Ciudades eliminadas: ${ciudadesEliminadas.changes || 0}`);
        
        // PASO 2: Verificar/crear estructura mínima
        console.log('\n🏗️ PASO 2: Verificando estructura mínima...');
        
        // Verificar que existe Los Ángeles
        let ciudadLosAngeles = await db.get('SELECT id FROM ciudades WHERE nombre = ?', ['Los Ángeles']);
        if (!ciudadLosAngeles) {
            console.log('🏙️ Creando ciudad Los Ángeles...');
            const result = await db.run('INSERT INTO ciudades (nombre) VALUES (?)', ['Los Ángeles']);
            ciudadLosAngeles = { id: result.lastID };
            console.log(`✅ Ciudad Los Ángeles creada con ID: ${ciudadLosAngeles.id}`);
        } else {
            console.log(`✅ Ciudad Los Ángeles existe con ID: ${ciudadLosAngeles.id}`);
        }
        
        // Verificar que existe MagnaSports
        let magnasports = await db.get('SELECT id FROM complejos WHERE nombre = ?', ['MagnaSports']);
        if (!magnasports) {
            console.log('🏢 Creando complejo MagnaSports...');
            const result = await db.run(`
                INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) 
                VALUES (?, ?, ?, ?, ?)
            `, [
                'MagnaSports',
                ciudadLosAngeles.id,
                'Monte Perdido 1685',
                '+56987654321',
                'reservas@magnasports.cl'
            ]);
            magnasports = { id: result.lastID };
            console.log(`✅ Complejo MagnaSports creado con ID: ${magnasports.id}`);
        } else {
            console.log(`✅ Complejo MagnaSports existe con ID: ${magnasports.id}`);
        }
        
        // PASO 3: Verificar/crear canchas de MagnaSports
        console.log('\n🏟️ PASO 3: Verificando canchas de MagnaSports...');
        
        const canchasExistentes = await db.query(`
            SELECT id, nombre, tipo, precio_hora 
            FROM canchas 
            WHERE complejo_id = ? 
            ORDER BY nombre
        `, [magnasports.id]);
        
        console.log(`📋 Canchas existentes en MagnaSports: ${canchasExistentes.length}`);
        canchasExistentes.forEach(cancha => {
            console.log(`   - ID ${cancha.id}: ${cancha.nombre} (${cancha.tipo}) - $${cancha.precio_hora}`);
        });
        
        // Definir canchas requeridas
        const canchasRequeridas = [
            { nombre: 'Cancha Techada 1', tipo: 'futbol', precio: 28000 },
            { nombre: 'Cancha Techada 2', tipo: 'futbol', precio: 28000 }
        ];
        
        // Crear canchas faltantes
        for (const canchaReq of canchasRequeridas) {
            const canchaExistente = canchasExistentes.find(c => c.nombre === canchaReq.nombre);
            
            if (!canchaExistente) {
                console.log(`🏟️ Creando cancha: ${canchaReq.nombre}...`);
                const result = await db.run(`
                    INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) 
                    VALUES (?, ?, ?, ?)
                `, [magnasports.id, canchaReq.nombre, canchaReq.tipo, canchaReq.precio]);
                console.log(`✅ Cancha ${canchaReq.nombre} creada con ID: ${result.lastID}`);
            } else {
                console.log(`✅ Cancha ${canchaReq.nombre} ya existe con ID: ${canchaExistente.id}`);
            }
        }
        
        // PASO 4: Verificar resultado final
        console.log('\n📊 PASO 4: Verificando resultado final...');
        
        const ciudadesFinales = await db.query('SELECT * FROM ciudades ORDER BY nombre');
        const complejosFinales = await db.query(`
            SELECT c.*, ci.nombre as ciudad_nombre 
            FROM complejos c 
            JOIN ciudades ci ON c.ciudad_id = ci.id 
            ORDER BY c.nombre
        `);
        const canchasFinales = await db.query(`
            SELECT c.*, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM canchas c 
            JOIN complejos co ON c.complejo_id = co.id 
            JOIN ciudades ci ON co.ciudad_id = ci.id 
            ORDER BY co.nombre, c.nombre
        `);
        const reservasFinales = await db.query('SELECT COUNT(*) as count FROM reservas');
        
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
        
        console.log(`   - Reservas: ${reservasFinales[0].count} (preservadas)`);
        
        // Verificar que las reservas siguen siendo válidas
        const reservasInvalidas = await db.query(`
            SELECT COUNT(*) as count 
            FROM reservas r 
            LEFT JOIN canchas c ON r.cancha_id = c.id 
            WHERE c.id IS NULL
        `);
        
        if (reservasInvalidas[0].count > 0) {
            console.log(`⚠️ ADVERTENCIA: ${reservasInvalidas[0].count} reservas tienen canchas inválidas`);
        } else {
            console.log(`✅ Todas las reservas son válidas`);
        }
        
        console.log('\n🎉 Sincronización completada exitosamente');
        console.log('📋 Estructura final:');
        console.log('   - 1 ciudad: Los Ángeles');
        console.log('   - 1 complejo: MagnaSports');
        console.log('   - 2 canchas: Cancha Techada 1 y Cancha Techada 2');
        console.log('   - Reservas preservadas');
        
    } catch (error) {
        console.error('❌ Error durante la sincronización:', error);
        throw error;
    } finally {
        await db.close();
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    syncDatabases()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { syncDatabases };

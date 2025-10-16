#!/usr/bin/env node

/**
 * Script para corregir las fechas de bloqueo - 2025 en lugar de 2024
 */

// Configurar entorno de desarrollo
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: './env.postgresql' });

const DatabaseManager = require('../src/config/database');

async function fixBlockingDates() {
    console.log('🔧 CORRIGIENDO FECHAS DE BLOQUEO - 2025');
    console.log('=========================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        await db.connect();
        
        // Eliminar bloqueos antiguos (2024)
        console.log('🗑️ Eliminando bloqueos antiguos (2024)...');
        await db.run(`
            DELETE FROM bloqueos_temporales 
            WHERE session_id = 'sistema_bloqueo_oct31'
        `);
        console.log('✅ Bloqueos antiguos eliminados');
        
        // Buscar el complejo Espacio Deportivo Borde Río
        console.log('🔍 Buscando complejo Espacio Deportivo Borde Río...');
        const complejo = await db.get(`
            SELECT id, nombre FROM complejos 
            WHERE nombre = 'Espacio Deportivo Borde Río'
        `);
        
        if (!complejo) {
            console.log('❌ No se encontró el complejo Espacio Deportivo Borde Río');
            return;
        }
        
        console.log(`📋 Complejo encontrado: ID ${complejo.id} - ${complejo.nombre}`);
        
        // Buscar las canchas del complejo
        console.log('🔍 Buscando canchas del complejo...');
        const canchas = await db.all(`
            SELECT id, nombre, tipo, precio_hora 
            FROM canchas 
            WHERE complejo_id = $1
        `, [complejo.id]);
        
        console.log('⚽ Canchas encontradas:');
        canchas.forEach(cancha => {
            console.log(`   🆔 ID: ${cancha.id} | ${cancha.nombre} | ${cancha.tipo} | $${cancha.precio_hora}`);
        });
        
        // Crear bloqueos temporales para cada cancha hasta el 31 de octubre de 2025
        const fechaLimite = '2025-10-31';
        console.log(`\n🚧 Creando bloqueos hasta el ${fechaLimite}...`);
        
        for (const cancha of canchas) {
            // Crear un bloqueo temporal que expire el 31 de octubre de 2025
            const bloqueoId = `bloqueo_${cancha.id}_oct31_2025_${Date.now()}`;
            const expiraEn = '2025-10-31 23:59:59';
            
            try {
                await db.run(`
                    INSERT INTO bloqueos_temporales 
                    (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    bloqueoId,
                    cancha.id,
                    fechaLimite,
                    '00:00:00',
                    '23:59:59',
                    'sistema_bloqueo_oct31_2025',
                    expiraEn,
                    JSON.stringify({
                        motivo: 'Complejo en preparación para trabajo a partir del 1 de noviembre de 2025',
                        bloqueado_hasta: fechaLimite,
                        cancha: cancha.nombre,
                        año: 2025
                    })
                ]);
                
                console.log(`✅ Bloqueo creado para cancha ${cancha.id} (${cancha.nombre}) hasta ${fechaLimite}`);
                
            } catch (error) {
                console.log(`⚠️ Error creando bloqueo para cancha ${cancha.id}: ${error.message}`);
            }
        }
        
        // Verificar bloqueos creados
        console.log('\n🔍 Verificando bloqueos creados...');
        const bloqueos = await db.all(`
            SELECT bt.id, bt.cancha_id, c.nombre as cancha_nombre, bt.fecha, bt.expira_en
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            WHERE bt.session_id = 'sistema_bloqueo_oct31_2025'
            ORDER BY bt.cancha_id
        `);
        
        console.log('🚧 Bloqueos activos:');
        bloqueos.forEach(bloqueo => {
            console.log(`   🆔 Cancha ${bloqueo.cancha_id} (${bloqueo.cancha_nombre}) - Expira: ${bloqueo.expira_en}`);
        });
        
        // Verificar fechas
        const hoy = new Date().toISOString().split('T')[0];
        console.log('\n📅 Estado de fechas:');
        console.log(`   Hoy: ${hoy}`);
        console.log(`   Bloqueado hasta: ${fechaLimite}`);
        console.log(`   Estado: ${hoy <= fechaLimite ? '🚧 BLOQUEADO' : '✅ DISPONIBLE'}`);
        
        console.log('\n✅ Bloqueos de reservas configurados correctamente para 2025');
        console.log('📅 Las reservas estarán bloqueadas hasta el 31 de octubre de 2025');
        console.log('🚀 A partir del 1 de noviembre de 2025, el complejo estará disponible para trabajo');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
fixBlockingDates();

#!/usr/bin/env node

/**
 * Script para bloquear TODAS las fechas desde hoy hasta el 31 de octubre de 2025
 */

// Configurar entorno de desarrollo
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: './env.postgresql' });

const DatabaseManager = require('../src/config/database');

async function blockAllDatesUntilOct31() {
    console.log('🚧 BLOQUEANDO TODAS LAS FECHAS HASTA EL 31 DE OCTUBRE');
    console.log('====================================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        await db.connect();
        
        // Eliminar bloqueos antiguos
        console.log('🗑️ Eliminando bloqueos antiguos...');
        await db.run(`
            DELETE FROM bloqueos_temporales 
            WHERE session_id LIKE 'sistema_bloqueo_oct31%'
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
        
        // Generar todas las fechas desde hoy hasta el 31 de octubre
        const hoy = new Date();
        const fechaLimite = new Date('2025-10-31');
        const fechas = [];
        
        for (let fecha = new Date(hoy); fecha <= fechaLimite; fecha.setDate(fecha.getDate() + 1)) {
            fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        console.log(`\n📅 Generando bloqueos para ${fechas.length} fechas:`);
        fechas.forEach(fecha => console.log(`   ${fecha}`));
        
        // Crear bloqueos para cada fecha y cada cancha
        let bloqueosCreados = 0;
        
        for (const fecha of fechas) {
            for (const cancha of canchas) {
                const bloqueoId = `bloqueo_${cancha.id}_${fecha.replace(/-/g, '')}_${Date.now()}`;
                const expiraEn = '2025-10-31 23:59:59';
                
                try {
                    await db.run(`
                        INSERT INTO bloqueos_temporales 
                        (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        bloqueoId,
                        cancha.id,
                        fecha,
                        '00:00:00',
                        '23:59:59',
                        'sistema_bloqueo_oct31_2025',
                        expiraEn,
                        JSON.stringify({
                            motivo: 'Complejo en preparación para trabajo a partir del 1 de noviembre de 2025',
                            bloqueado_hasta: '2025-10-31',
                            cancha: cancha.nombre,
                            año: 2025
                        })
                    ]);
                    
                    bloqueosCreados++;
                    
                } catch (error) {
                    console.log(`⚠️ Error creando bloqueo para cancha ${cancha.id} fecha ${fecha}: ${error.message}`);
                }
            }
        }
        
        console.log(`\n✅ ${bloqueosCreados} bloqueos creados exitosamente`);
        
        // Verificar bloqueos creados
        console.log('\n🔍 Verificando bloqueos creados...');
        const bloqueos = await db.all(`
            SELECT bt.fecha, COUNT(*) as cantidad
            FROM bloqueos_temporales bt
            WHERE bt.session_id = 'sistema_bloqueo_oct31_2025'
            GROUP BY bt.fecha
            ORDER BY bt.fecha
            LIMIT 10
        `);
        
        console.log('🚧 Resumen de bloqueos (primeras 10 fechas):');
        bloqueos.forEach(bloqueo => {
            console.log(`   📅 ${bloqueo.fecha}: ${bloqueo.cantidad} bloqueos`);
        });
        
        // Verificar fechas
        const hoyStr = hoy.toISOString().split('T')[0];
        console.log('\n📅 Estado de fechas:');
        console.log(`   Hoy: ${hoyStr}`);
        console.log(`   Bloqueado hasta: 2025-10-31`);
        console.log(`   Estado: ${hoyStr <= '2025-10-31' ? '🚧 BLOQUEADO' : '✅ DISPONIBLE'}`);
        
        console.log('\n✅ Bloqueos de reservas configurados correctamente');
        console.log('📅 Las reservas estarán bloqueadas desde hoy hasta el 31 de octubre de 2025');
        console.log('🚀 A partir del 1 de noviembre de 2025, el complejo estará disponible para trabajo');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
blockAllDatesUntilOct31();

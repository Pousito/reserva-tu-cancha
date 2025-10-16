#!/usr/bin/env node

/**
 * Script para bloquear reservas del complejo Espacio Deportivo Borde Río hasta el 31 de octubre
 */

// Configurar entorno de desarrollo
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: './env.postgresql' });

const DatabaseManager = require('../src/config/database');

async function blockReservationsUntilOct31() {
    console.log('🚧 BLOQUEANDO RESERVAS HASTA EL 31 DE OCTUBRE');
    console.log('==============================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        await db.connect();
        
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
        
        // Crear bloqueos temporales para cada cancha hasta el 31 de octubre
        const fechaLimite = '2024-10-31';
        console.log(`\n🚧 Creando bloqueos hasta el ${fechaLimite}...`);
        
        for (const cancha of canchas) {
            // Crear un bloqueo temporal que expire el 31 de octubre
            const bloqueoId = `bloqueo_${cancha.id}_oct31_${Date.now()}`;
            const expiraEn = '2024-10-31 23:59:59';
            
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
                    'sistema_bloqueo_oct31',
                    expiraEn,
                    JSON.stringify({
                        motivo: 'Complejo en preparación para trabajo a partir del 1 de noviembre',
                        bloqueado_hasta: fechaLimite,
                        cancha: cancha.nombre
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
            WHERE bt.session_id = 'sistema_bloqueo_oct31'
            ORDER BY bt.cancha_id
        `);
        
        console.log('🚧 Bloqueos activos:');
        bloqueos.forEach(bloqueo => {
            console.log(`   🆔 Cancha ${bloqueo.cancha_id} (${bloqueo.cancha_nombre}) - Expira: ${bloqueo.expira_en}`);
        });
        
        console.log('\n✅ Bloqueos de reservas configurados exitosamente');
        console.log('📅 Las reservas estarán bloqueadas hasta el 31 de octubre de 2024');
        console.log('🚀 A partir del 1 de noviembre, el complejo estará disponible para trabajo');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Ejecutar
blockReservationsUntilOct31();

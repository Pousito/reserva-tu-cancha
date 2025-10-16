#!/usr/bin/env node

/**
 * Script para aplicar bloqueos completos en producción (Neon)
 * Bloquea todas las fechas desde hoy hasta el 31 de octubre de 2025
 */

require('dotenv').config({ path: './neon-migration-config.env' });
const { Pool } = require('pg');

async function applyProductionBlocking() {
    console.log('🚀 APLICANDO BLOQUEOS COMPLETOS EN PRODUCCIÓN (NEON)');
    console.log('====================================================');
    
    const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
    
    if (!NEON_DATABASE_URL) {
        console.error('❌ NEON_DATABASE_URL no está configurado en neon-migration-config.env');
        return;
    }
    
    const pool = new Pool({
        connectionString: NEON_DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('🔌 Conectando a Neon...');
        const client = await pool.connect();
        console.log('✅ Conectado a Neon exitosamente');
        
        const complexName = 'Espacio Deportivo Borde Río';
        const newPrice = 20000;
        const reason = 'Complejo en preparación para trabajo a partir del 1 de noviembre de 2025';
        
        // 1. Buscar el complejo
        const complexResult = await client.query(
            `SELECT id FROM complejos WHERE nombre = $1`,
            [complexName]
        );
        
        if (complexResult.rows.length === 0) {
            console.log(`🔍 No se encontró el complejo "${complexName}".`);
            return;
        }
        const complexId = complexResult.rows[0].id;
        console.log(`📋 Complejo encontrado: ID ${complexId} - ${complexName}`);
        
        // 2. Buscar las canchas del complejo
        const courtsResult = await client.query(
            `SELECT id, nombre, precio_hora FROM canchas WHERE complejo_id = $1`,
            [complexId]
        );
        
        if (courtsResult.rows.length === 0) {
            console.log(`🔍 No se encontraron canchas para el complejo "${complexName}".`);
            return;
        }
        console.log('⚽ Canchas encontradas:');
        courtsResult.rows.forEach(c => console.log(`   🆔 ID: ${c.id} | ${c.nombre} | futbol | $${c.precio_hora}`));
        
        // 3. Actualizar el precio de cada cancha
        console.log(`💰 Actualizando precio a $${newPrice}...`);
        for (const court of courtsResult.rows) {
            await client.query(
                `UPDATE canchas SET precio_hora = $1 WHERE id = $2`,
                [newPrice, court.id]
            );
            console.log(`✅ Precio actualizado para cancha ${court.id} (${court.nombre}): $${newPrice}`);
        }
        
        // 4. Eliminar bloqueos antiguos
        console.log('🗑️ Eliminando bloqueos antiguos...');
        await client.query(
            `DELETE FROM bloqueos_temporales 
             WHERE cancha_id IN (SELECT id FROM canchas WHERE complejo_id = $1)
             AND session_id LIKE 'sistema_bloqueo_oct31%'`,
            [complexId]
        );
        console.log('✅ Bloqueos antiguos eliminados');
        
        // 5. Generar todas las fechas desde hoy hasta el 31 de octubre
        const hoy = new Date();
        const fechaLimite = new Date('2025-10-31');
        const fechas = [];
        
        for (let fecha = new Date(hoy); fecha <= fechaLimite; fecha.setDate(fecha.getDate() + 1)) {
            fechas.push(fecha.toISOString().split('T')[0]);
        }
        
        console.log(`\n📅 Generando bloqueos para ${fechas.length} fechas:`);
        fechas.forEach(fecha => console.log(`   ${fecha}`));
        
        // 6. Crear bloqueos para cada fecha y cada cancha
        let bloqueosCreados = 0;
        
        for (const fecha of fechas) {
            for (const court of courtsResult.rows) {
                const bloqueoId = `bloqueo_${court.id}_${fecha.replace(/-/g, '')}_${Date.now()}`;
                const expiraEn = '2025-10-31 23:59:59';
                
                try {
                    await client.query(
                        `INSERT INTO bloqueos_temporales 
                         (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            bloqueoId,
                            court.id,
                            fecha,
                            '00:00:00',
                            '23:59:59',
                            'sistema_bloqueo_oct31_2025',
                            expiraEn,
                            JSON.stringify({
                                motivo: reason,
                                bloqueado_hasta: '2025-10-31',
                                cancha: court.nombre,
                                año: 2025
                            })
                        ]
                    );
                    
                    bloqueosCreados++;
                    
                } catch (error) {
                    console.log(`⚠️ Error creando bloqueo para cancha ${court.id} fecha ${fecha}: ${error.message}`);
                }
            }
        }
        
        console.log(`\n✅ ${bloqueosCreados} bloqueos creados exitosamente`);
        
        // 7. Verificar cambios aplicados
        console.log('\n🔍 Verificando cambios aplicados...');
        const updatedCourts = await client.query(
            `SELECT id, nombre, precio_hora FROM canchas WHERE complejo_id = $1`,
            [complexId]
        );
        console.log('💰 Precios actualizados:');
        updatedCourts.rows.forEach(c => console.log(`   🆔 Cancha ${c.id} (${c.nombre}): $${c.precio_hora}`));
        
        const activeBlocks = await client.query(
            `SELECT bt.fecha, COUNT(*) as cantidad
             FROM bloqueos_temporales bt 
             JOIN canchas c ON bt.cancha_id = c.id 
             WHERE bt.session_id = 'sistema_bloqueo_oct31_2025' 
             AND c.complejo_id = $1
             GROUP BY bt.fecha
             ORDER BY bt.fecha`,
            [complexId]
        );
        console.log('🚧 Bloqueos activos:');
        activeBlocks.rows.forEach(b => {
            const fecha = new Date(b.fecha);
            const fechaStr = fecha.toLocaleDateString('es-CL', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            console.log(`   📅 ${fechaStr}: ${b.cantidad} bloqueos`);
        });
        
        const hoyStr = hoy.toISOString().split('T')[0];
        console.log('\n📅 Estado de fechas:');
        console.log(`   Hoy: ${hoyStr}`);
        console.log(`   Bloqueado hasta: 2025-10-31`);
        console.log(`   Estado: ${hoyStr <= '2025-10-31' ? '🚧 BLOQUEADO' : '✅ DISPONIBLE'}`);
        
        console.log('\n✅ Cambios aplicados exitosamente en PRODUCCIÓN (Neon)');
        console.log(`📅 Las reservas estarán bloqueadas desde hoy hasta el 31 de octubre de 2025`);
        console.log(`💰 Precios actualizados a $${newPrice}`);
        console.log(`🚀 A partir del 1 de noviembre de 2025, el complejo estará disponible para trabajo`);
        
    } catch (error) {
        console.error('❌ Error aplicando cambios en Neon:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    applyProductionBlocking();
}

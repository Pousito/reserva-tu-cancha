#!/usr/bin/env node

/**
 * Script para actualizar precio y bloquear reservas en producción (Neon)
 */

require('dotenv').config({ path: './neon-migration-config.env' });
const { Pool } = require('pg');

async function updateProductionOct31() {
    console.log('🚀 ACTUALIZANDO PRODUCCIÓN (NEON) - OCTUBRE 31');
    console.log('==============================================');

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

        // 1. Buscar el complejo Espacio Deportivo Borde Río
        console.log('\n🔍 Buscando complejo Espacio Deportivo Borde Río...');
        const complejo = await client.query(
            `SELECT id, nombre FROM complejos WHERE nombre = 'Espacio Deportivo Borde Río'`
        );

        if (complejo.rows.length === 0) {
            console.log('❌ No se encontró el complejo Espacio Deportivo Borde Río');
            return;
        }

        const complejoId = complejo.rows[0].id;
        console.log(`📋 Complejo encontrado: ID ${complejoId} - ${complejo.rows[0].nombre}`);

        // 2. Buscar las canchas del complejo
        console.log('\n🔍 Buscando canchas del complejo...');
        const canchas = await client.query(
            `SELECT id, nombre, tipo, precio_hora FROM canchas WHERE complejo_id = $1`,
            [complejoId]
        );

        console.log('⚽ Canchas encontradas:');
        canchas.rows.forEach(cancha => {
            console.log(`   🆔 ID: ${cancha.id} | ${cancha.nombre} | ${cancha.tipo} | $${cancha.precio_hora}`);
        });

        // 3. Actualizar precio a $20.000
        console.log('\n💰 Actualizando precio a $20.000...');
        for (const cancha of canchas.rows) {
            await client.query(
                `UPDATE canchas SET precio_hora = $1 WHERE id = $2`,
                [20000, cancha.id]
            );
            console.log(`✅ Precio actualizado para cancha ${cancha.id} (${cancha.nombre}): $20.000`);
        }

        // 4. Crear bloqueos temporales hasta el 31 de octubre
        console.log('\n🚧 Creando bloqueos hasta el 31 de octubre...');
        const fechaLimite = '2024-10-31';
        
        for (const cancha of canchas.rows) {
            const bloqueoId = `bloqueo_${cancha.id}_oct31_${Date.now()}`;
            const expiraEn = '2024-10-31 23:59:59';
            
            try {
                await client.query(`
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

        // 5. Verificar cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        
        // Verificar precios
        const canchasActualizadas = await client.query(
            `SELECT id, nombre, precio_hora FROM canchas WHERE complejo_id = $1`,
            [complejoId]
        );
        
        console.log('💰 Precios actualizados:');
        canchasActualizadas.rows.forEach(cancha => {
            console.log(`   🆔 Cancha ${cancha.id} (${cancha.nombre}): $${cancha.precio_hora}`);
        });

        // Verificar bloqueos
        const bloqueos = await client.query(`
            SELECT bt.id, bt.cancha_id, c.nombre as cancha_nombre, bt.fecha, bt.expira_en
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            WHERE bt.session_id = 'sistema_bloqueo_oct31'
            ORDER BY bt.cancha_id
        `);
        
        console.log('\n🚧 Bloqueos activos:');
        bloqueos.rows.forEach(bloqueo => {
            console.log(`   🆔 Cancha ${bloqueo.cancha_id} (${bloqueo.cancha_nombre}) - Expira: ${bloqueo.expira_en}`);
        });

        console.log('\n✅ Cambios aplicados exitosamente en PRODUCCIÓN (Neon)');
        console.log('📅 Las reservas estarán bloqueadas hasta el 31 de octubre de 2024');
        console.log('💰 Precios actualizados a $20.000');
        console.log('🚀 A partir del 1 de noviembre, el complejo estará disponible para trabajo');

    } catch (error) {
        console.error('❌ Error actualizando producción:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    updateProductionOct31();
}

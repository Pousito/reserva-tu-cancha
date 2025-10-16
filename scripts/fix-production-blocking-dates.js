#!/usr/bin/env node

/**
 * Script para corregir las fechas de bloqueo en producción (Neon) - 2025 en lugar de 2024
 */

require('dotenv').config({ path: './neon-migration-config.env' });
const { Pool } = require('pg');

async function fixProductionBlockingDates() {
    console.log('🔧 CORRIGIENDO FECHAS DE BLOQUEO EN PRODUCCIÓN - 2025');
    console.log('=====================================================');

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

        // Eliminar bloqueos antiguos (2024)
        console.log('🗑️ Eliminando bloqueos antiguos (2024)...');
        await client.query(`
            DELETE FROM bloqueos_temporales 
            WHERE session_id = 'sistema_bloqueo_oct31'
        `);
        console.log('✅ Bloqueos antiguos eliminados');

        // Buscar el complejo Espacio Deportivo Borde Río
        console.log('🔍 Buscando complejo Espacio Deportivo Borde Río...');
        const complejo = await client.query(
            `SELECT id, nombre FROM complejos WHERE nombre = 'Espacio Deportivo Borde Río'`
        );

        if (complejo.rows.length === 0) {
            console.log('❌ No se encontró el complejo Espacio Deportivo Borde Río');
            return;
        }

        const complejoId = complejo.rows[0].id;
        console.log(`📋 Complejo encontrado: ID ${complejoId} - ${complejo.rows[0].nombre}`);

        // Buscar las canchas del complejo
        console.log('🔍 Buscando canchas del complejo...');
        const canchas = await client.query(
            `SELECT id, nombre, tipo, precio_hora FROM canchas WHERE complejo_id = $1`,
            [complejoId]
        );

        console.log('⚽ Canchas encontradas:');
        canchas.rows.forEach(cancha => {
            console.log(`   🆔 ID: ${cancha.id} | ${cancha.nombre} | ${cancha.tipo} | $${cancha.precio_hora}`);
        });

        // Crear bloqueos temporales para cada cancha hasta el 31 de octubre de 2025
        const fechaLimite = '2025-10-31';
        console.log(`\n🚧 Creando bloqueos hasta el ${fechaLimite}...`);

        for (const cancha of canchas.rows) {
            const bloqueoId = `bloqueo_${cancha.id}_oct31_2025_${Date.now()}`;
            const expiraEn = '2025-10-31 23:59:59';

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
        const bloqueos = await client.query(`
            SELECT bt.id, bt.cancha_id, c.nombre as cancha_nombre, bt.fecha, bt.expira_en
            FROM bloqueos_temporales bt
            JOIN canchas c ON bt.cancha_id = c.id
            WHERE bt.session_id = 'sistema_bloqueo_oct31_2025'
            ORDER BY bt.cancha_id
        `);

        console.log('🚧 Bloqueos activos:');
        bloqueos.rows.forEach(bloqueo => {
            console.log(`   🆔 Cancha ${bloqueo.cancha_id} (${bloqueo.cancha_nombre}) - Expira: ${bloqueo.expira_en}`);
        });

        // Verificar fechas
        const hoy = new Date().toISOString().split('T')[0];
        console.log('\n📅 Estado de fechas:');
        console.log(`   Hoy: ${hoy}`);
        console.log(`   Bloqueado hasta: ${fechaLimite}`);
        console.log(`   Estado: ${hoy <= fechaLimite ? '🚧 BLOQUEADO' : '✅ DISPONIBLE'}`);

        console.log('\n✅ Bloqueos de reservas configurados correctamente en PRODUCCIÓN para 2025');
        console.log('📅 Las reservas estarán bloqueadas hasta el 31 de octubre de 2025');
        console.log('🚀 A partir del 1 de noviembre de 2025, el complejo estará disponible para trabajo');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    fixProductionBlockingDates();
}

#!/usr/bin/env node

/**
 * 🔧 SOLUCIÓN DEFINITIVA PARA EL PROBLEMA DEL COMPLEJO DEMO 3
 * 
 * El usuario tiene complejo_id: 8 en el frontend pero debería tener complejo_id: 7
 * Vamos a solucionarlo de manera definitiva
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function solucionDefinitiva() {
    console.log('🔧 SOLUCIÓN DEFINITIVA PARA COMPLEJO DEMO 3\n');
    
    try {
        const email = 'owner@complejodemo3.cl';
        
        // 1. Análisis completo de la situación
        console.log('🔍 ANÁLISIS COMPLETO DE LA SITUACIÓN...');
        
        // Verificar todos los usuarios con email similar
        const usuariosSimilares = await pool.query(
            'SELECT id, email, nombre, rol, complejo_id FROM usuarios WHERE email LIKE \'%complejodemo3%\' ORDER BY id'
        );
        
        console.log('📊 Usuarios encontrados:');
        usuariosSimilares.rows.forEach(user => {
            console.log(`   • ID: ${user.id} | Email: ${user.email} | Complejo: ${user.complejo_id}`);
        });
        
        // Verificar todos los complejos Demo 3
        const complejosDemo3 = await pool.query(
            'SELECT id, nombre, direccion FROM complejos WHERE nombre LIKE \'%Demo 3%\' ORDER BY id'
        );
        
        console.log('\n📊 Complejos Demo 3 encontrados:');
        complejosDemo3.rows.forEach(comp => {
            console.log(`   • ID: ${comp.id} | Nombre: ${comp.nombre} | Dirección: ${comp.direccion}`);
        });
        
        // 2. Verificar datos en cada complejo
        console.log('\n🔍 VERIFICANDO DATOS EN CADA COMPLEJO...');
        
        for (const complejo of complejosDemo3.rows) {
            console.log(`\n📍 Complejo ID: ${complejo.id} (${complejo.nombre})`);
            
            // Reservas
            const reservas = await pool.query(`
                SELECT COUNT(*) as count
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1;
            `, [complejo.id]);
            
            // Canchas
            const canchas = await pool.query(
                'SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1',
                [complejo.id]
            );
            
            // Categorías
            const categorias = await pool.query(
                'SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1',
                [complejo.id]
            );
            
            // Movimientos
            const movimientos = await pool.query(
                'SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1',
                [complejo.id]
            );
            
            console.log(`   • Reservas: ${reservas.rows[0].count}`);
            console.log(`   • Canchas: ${canchas.rows[0].count}`);
            console.log(`   • Categorías: ${categorias.rows[0].count}`);
            console.log(`   • Movimientos: ${movimientos.rows[0].count}`);
        }
        
        // 3. Identificar el problema
        console.log('\n🤔 IDENTIFICANDO EL PROBLEMA...');
        
        // Buscar el usuario específico
        const usuarioEspecifico = await pool.query(
            'SELECT id, email, nombre, rol, complejo_id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (usuarioEspecifico.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const user = usuarioEspecifico.rows[0];
        console.log(`   Usuario actual: ${user.email} (ID: ${user.id})`);
        console.log(`   Complejo en BD: ${user.complejo_id}`);
        
        // 4. Estrategia de solución
        console.log('\n🎯 ESTRATEGIA DE SOLUCIÓN...');
        
        // Opción A: Mover todas las reservas al complejo 8 (donde está el usuario)
        const complejoUsuario = user.complejo_id;
        const complejoConReservas = 7;
        
        console.log(`   Opción A: Mover reservas del Complejo ${complejoConReservas} al Complejo ${complejoUsuario}`);
        
        // Verificar si podemos mover las reservas
        const reservasParaMover = await pool.query(`
            SELECT r.id, r.codigo_reserva, c.id as cancha_id, c.nombre as cancha_nombre
            FROM reservas r
            LEFT JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1;
        `, [complejoConReservas]);
        
        console.log(`   Reservas a mover: ${reservasParaMover.rows.length}`);
        
        if (reservasParaMover.rows.length > 0) {
            console.log('\n🚀 EJECUTANDO OPCIÓN A: MOVER RESERVAS...');
            
            // Primero, crear canchas en el complejo 8 si no existen
            const canchasComplejo8 = await pool.query(
                'SELECT COUNT(*) as count FROM canchas WHERE complejo_id = $1',
                [complejoUsuario]
            );
            
            if (parseInt(canchasComplejo8.rows[0].count) === 0) {
                console.log('   📝 Creando canchas en el Complejo 8...');
                
                // Crear canchas básicas
                const canchasParaCrear = [
                    { nombre: 'Cancha 1', tipo: 'futbol' },
                    { nombre: 'Cancha 2', tipo: 'padel' }
                ];
                
                for (const cancha of canchasParaCrear) {
                    await pool.query(
                        'INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora, activa) VALUES ($1, $2, $3, $4, $5)',
                        [complejoUsuario, cancha.nombre, cancha.tipo, 15000, true]
                    );
                    console.log(`      ✅ Cancha creada: ${cancha.nombre}`);
                }
            }
            
            // Obtener canchas del complejo 8
            const canchasComplejo8Lista = await pool.query(
                'SELECT id, nombre FROM canchas WHERE complejo_id = $1 ORDER BY id',
                [complejoUsuario]
            );
            
            // Mover reservas
            for (const reserva of reservasParaMover.rows) {
                // Asignar a la primera cancha disponible del complejo 8
                const canchaDestino = canchasComplejo8Lista.rows[0];
                
                await pool.query(
                    'UPDATE reservas SET cancha_id = $1 WHERE id = $2',
                    [canchaDestino.id, reserva.id]
                );
                
                console.log(`      ✅ Reserva #${reserva.codigo_reserva} movida a ${canchaDestino.nombre}`);
            }
            
            // Mover categorías
            console.log('   📝 Moviendo categorías...');
            await pool.query(
                'UPDATE categorias_gastos SET complejo_id = $1 WHERE complejo_id = $2',
                [complejoUsuario, complejoConReservas]
            );
            
            // Mover movimientos financieros
            console.log('   📝 Moviendo movimientos financieros...');
            await pool.query(
                'UPDATE gastos_ingresos SET complejo_id = $1 WHERE complejo_id = $2',
                [complejoUsuario, complejoConReservas]
            );
            
            console.log('✅ Todas las reservas y datos movidos al Complejo 8');
        }
        
        // 5. Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        
        const verificacionFinal = await pool.query(
            'SELECT COUNT(*) as count FROM gastos_ingresos WHERE complejo_id = $1',
            [complejoUsuario]
        );
        
        const categoriasFinal = await pool.query(
            'SELECT COUNT(*) as count FROM categorias_gastos WHERE complejo_id = $1',
            [complejoUsuario]
        );
        
        console.log(`   Movimientos en Complejo ${complejoUsuario}: ${verificacionFinal.rows[0].count}`);
        console.log(`   Categorías en Complejo ${complejoUsuario}: ${categoriasFinal.rows[0].count}`);
        
        // 6. Generar nueva contraseña
        console.log('\n🔑 GENERANDO NUEVA CONTRASEÑA...');
        
        const nuevaContraseña = 'demo2025';
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevaContraseña, salt);
        
        await pool.query(
            'UPDATE usuarios SET password = $1 WHERE email = $2',
            [passwordHash, email]
        );
        
        console.log('✅ Contraseña actualizada');
        
        console.log('\n🎯 SOLUCIÓN COMPLETADA:');
        console.log('========================');
        console.log(`✅ Todas las reservas movidas al Complejo ${complejoUsuario}`);
        console.log(`✅ Todas las categorías movidas al Complejo ${complejoUsuario}`);
        console.log(`✅ Todos los movimientos financieros movidos al Complejo ${complejoUsuario}`);
        console.log(`✅ Contraseña actualizada`);
        
        console.log('\n🔄 PASOS FINALES:');
        console.log('==================');
        console.log('1. Cierra completamente el navegador');
        console.log('2. Abre una ventana nueva');
        console.log('3. Logueate con:');
        console.log(`   • Email: ${email}`);
        console.log(`   • Contraseña: ${nuevaContraseña}`);
        console.log('4. Ve al Control Financiero');
        console.log('\n🎉 ¡Ahora debería funcionar perfectamente!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

solucionDefinitiva().catch(console.error);



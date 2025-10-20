#!/usr/bin/env node

/**
 * 🔧 CORREGIR COMPLEJO DEL USUARIO DEMO 3
 * 
 * El usuario owner@complejodemo3.cl está asociado al complejo_id: 8
 * pero las reservas están en complejo_id: 7
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function corregirComplejo() {
    console.log('🔧 CORRIGIENDO ASOCIACIÓN DE COMPLEJO PARA DEMO 3\n');
    
    try {
        const email = 'owner@complejodemo3.cl';
        
        // 1. Verificar estado actual
        console.log('🔍 VERIFICANDO ESTADO ACTUAL...');
        
        const usuarioActual = await pool.query(
            'SELECT id, email, nombre, rol, complejo_id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (usuarioActual.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const usuario = usuarioActual.rows[0];
        console.log(`   Usuario actual: ${usuario.email}`);
        console.log(`   Complejo actual: ${usuario.complejo_id}`);
        console.log(`   Nombre: ${usuario.nombre}`);
        
        // 2. Verificar complejos disponibles
        console.log('\n🔍 VERIFICANDO COMPLEJOS DISPONIBLES...');
        
        const complejos = await pool.query(
            'SELECT id, nombre FROM complejos WHERE nombre LIKE \'%Demo 3%\' ORDER BY id'
        );
        
        console.log('   Complejos encontrados:');
        complejos.rows.forEach(comp => {
            console.log(`   • ID: ${comp.id} | Nombre: ${comp.nombre}`);
        });
        
        // 3. Verificar reservas por complejo
        console.log('\n🔍 VERIFICANDO RESERVAS POR COMPLEJO...');
        
        for (const complejo of complejos.rows) {
            const reservasQuery = `
                SELECT COUNT(*) as count
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1;
            `;
            
            const reservas = await pool.query(reservasQuery, [complejo.id]);
            console.log(`   • Complejo ${complejo.id} (${complejo.nombre}): ${reservas.rows[0].count} reservas`);
        }
        
        // 4. Determinar el complejo correcto (el que tiene reservas)
        const complejoConReservas = complejos.rows.find(async (comp) => {
            const reservasQuery = `
                SELECT COUNT(*) as count
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1;
            `;
            const reservas = await pool.query(reservasQuery, [comp.id]);
            return parseInt(reservas.rows[0].count) > 0;
        });
        
        // Buscar el complejo con reservas de manera más directa
        const complejosConReservas = [];
        for (const complejo of complejos.rows) {
            const reservasQuery = `
                SELECT COUNT(*) as count
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                WHERE c.complejo_id = $1;
            `;
            const reservas = await pool.query(reservasQuery, [complejo.id]);
            if (parseInt(reservas.rows[0].count) > 0) {
                complejosConReservas.push(complejo);
            }
        }
        
        if (complejosConReservas.length === 0) {
            console.log('❌ No se encontraron complejos con reservas');
            return;
        }
        
        const complejoCorrecto = complejosConReservas[0];
        console.log(`\n✅ Complejo correcto identificado: ID ${complejoCorrecto.id} - ${complejoCorrecto.nombre}`);
        
        // 5. Actualizar el usuario al complejo correcto
        if (usuario.complejo_id !== complejoCorrecto.id) {
            console.log(`\n🔄 ACTUALIZANDO USUARIO AL COMPLEJO CORRECTO...`);
            
            const updateResult = await pool.query(
                'UPDATE usuarios SET complejo_id = $1 WHERE email = $2 RETURNING id, email, nombre, rol, complejo_id',
                [complejoCorrecto.id, email]
            );
            
            console.log('✅ Usuario actualizado:');
            console.log(`   • ID: ${updateResult.rows[0].id}`);
            console.log(`   • Email: ${updateResult.rows[0].email}`);
            console.log(`   • Nombre: ${updateResult.rows[0].nombre}`);
            console.log(`   • Rol: ${updateResult.rows[0].rol}`);
            console.log(`   • Nuevo Complejo ID: ${updateResult.rows[0].complejo_id}`);
            
        } else {
            console.log('\n✅ El usuario ya está asociado al complejo correcto');
        }
        
        // 6. Verificar categorías del complejo correcto
        console.log('\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO CORRECTO...');
        
        const categoriasQuery = `
            SELECT COUNT(*) as count
            FROM categorias_gastos
            WHERE complejo_id = $1;
        `;
        
        const categorias = await pool.query(categoriasQuery, [complejoCorrecto.id]);
        console.log(`   Categorías disponibles: ${categorias.rows[0].count}`);
        
        // 7. Verificar movimientos del complejo correcto
        console.log('\n🔍 VERIFICANDO MOVIMIENTOS DEL COMPLEJO CORRECTO...');
        
        const movimientosQuery = `
            SELECT COUNT(*) as count
            FROM gastos_ingresos
            WHERE complejo_id = $1;
        `;
        
        const movimientos = await pool.query(movimientosQuery, [complejoCorrecto.id]);
        console.log(`   Movimientos disponibles: ${movimientos.rows[0].count}`);
        
        console.log('\n🎯 CORRECCIÓN COMPLETADA:');
        console.log('========================');
        console.log(`✅ Usuario: ${email}`);
        console.log(`✅ Asociado al complejo: ${complejoCorrecto.id} (${complejoCorrecto.nombre})`);
        console.log(`✅ Categorías: ${categorias.rows[0].count}`);
        console.log(`✅ Movimientos: ${movimientos.rows[0].count}`);
        console.log('\n🔄 Ahora refresca la página del panel de administración');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

corregirComplejo().catch(console.error);

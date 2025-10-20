#!/usr/bin/env node

/**
 * 🔍 VERIFICAR TOKEN Y SESIÓN DEL USUARIO DEMO 3
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verificarToken() {
    console.log('🔍 VERIFICANDO TOKEN Y SESIÓN DEL USUARIO DEMO 3\n');
    
    try {
        const email = 'owner@complejodemo3.cl';
        
        // 1. Verificar usuario en la base de datos
        console.log('🔍 VERIFICANDO USUARIO EN BASE DE DATOS...');
        
        const usuario = await pool.query(
            'SELECT id, email, nombre, rol, complejo_id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (usuario.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const user = usuario.rows[0];
        console.log(`   ✅ Usuario encontrado:`);
        console.log(`      • ID: ${user.id}`);
        console.log(`      • Email: ${user.email}`);
        console.log(`      • Nombre: ${user.nombre}`);
        console.log(`      • Rol: ${user.rol}`);
        console.log(`      • Complejo ID: ${user.complejo_id}`);
        
        // 2. Verificar complejo asociado
        console.log('\n🔍 VERIFICANDO COMPLEJO ASOCIADO...');
        
        const complejo = await pool.query(
            'SELECT id, nombre, direccion FROM complejos WHERE id = $1',
            [user.complejo_id]
        );
        
        if (complejo.rows.length === 0) {
            console.log('❌ Complejo no encontrado');
            return;
        }
        
        const comp = complejo.rows[0];
        console.log(`   ✅ Complejo encontrado:`);
        console.log(`      • ID: ${comp.id}`);
        console.log(`      • Nombre: ${comp.nombre}`);
        console.log(`      • Dirección: ${comp.direccion}`);
        
        // 3. Verificar canchas del complejo
        console.log('\n🔍 VERIFICANDO CANCHAS DEL COMPLEJO...');
        
        const canchas = await pool.query(
            'SELECT id, nombre, tipo FROM canchas WHERE complejo_id = $1',
            [user.complejo_id]
        );
        
        console.log(`   📊 Canchas encontradas: ${canchas.rows.length}`);
        canchas.rows.forEach(cancha => {
            console.log(`      • ID: ${cancha.id} | Nombre: ${cancha.nombre} | Tipo: ${cancha.tipo}`);
        });
        
        // 4. Verificar reservas del complejo
        console.log('\n🔍 VERIFICANDO RESERVAS DEL COMPLEJO...');
        
        const reservasQuery = `
            SELECT 
                r.id,
                r.codigo_reserva,
                r.estado,
                r.precio_total,
                r.comision_aplicada,
                c.nombre as cancha_nombre
            FROM reservas r
            LEFT JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5;
        `;
        
        const reservas = await pool.query(reservasQuery, [user.complejo_id]);
        
        console.log(`   📊 Reservas encontradas: ${reservas.rows.length}`);
        reservas.rows.forEach(reserva => {
            console.log(`      • #${reserva.codigo_reserva} - $${reserva.precio_total} - ${reserva.cancha_nombre}`);
        });
        
        // 5. Verificar categorías del complejo
        console.log('\n🔍 VERIFICANDO CATEGORÍAS DEL COMPLEJO...');
        
        const categoriasQuery = `
            SELECT 
                cg.id,
                cg.nombre,
                cg.tipo,
                COUNT(gi.id) as movimientos_count
            FROM categorias_gastos cg
            LEFT JOIN gastos_ingresos gi ON cg.id = gi.categoria_id
            WHERE cg.complejo_id = $1
            GROUP BY cg.id, cg.nombre, cg.tipo
            ORDER BY cg.tipo, cg.nombre;
        `;
        
        const categorias = await pool.query(categoriasQuery, [user.complejo_id]);
        
        console.log(`   📊 Categorías encontradas: ${categorias.rows.length}`);
        categorias.rows.forEach(cat => {
            console.log(`      • ${cat.nombre} (${cat.tipo}) - ${cat.movimientos_count} movimientos`);
        });
        
        // 6. Verificar movimientos financieros
        console.log('\n🔍 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        
        const movimientosQuery = `
            SELECT 
                gi.id,
                gi.tipo,
                gi.monto,
                gi.descripcion,
                gi.fecha,
                cg.nombre as categoria_nombre
            FROM gastos_ingresos gi
            LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
            WHERE gi.complejo_id = $1
            ORDER BY gi.fecha DESC, gi.creado_en DESC
            LIMIT 10;
        `;
        
        const movimientos = await pool.query(movimientosQuery, [user.complejo_id]);
        
        console.log(`   📊 Movimientos encontrados: ${movimientos.rows.length}`);
        movimientos.rows.forEach(mov => {
            console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
            console.log(`        ${mov.descripcion} (${mov.fecha})`);
        });
        
        // 7. Resumen final
        console.log('\n🎯 RESUMEN FINAL:');
        console.log('==================');
        console.log(`✅ Usuario: ${user.email} (ID: ${user.id})`);
        console.log(`✅ Complejo: ${comp.nombre} (ID: ${comp.id})`);
        console.log(`✅ Canchas: ${canchas.rows.length}`);
        console.log(`✅ Reservas: ${reservas.rows.length}`);
        console.log(`✅ Categorías: ${categorias.rows.length}`);
        console.log(`✅ Movimientos: ${movimientos.rows.length}`);
        
        if (movimientos.rows.length > 0) {
            console.log('\n🎉 ¡EL CONTROL FINANCIERO DEBERÍA FUNCIONAR!');
            console.log('   Si no ves los datos en el frontend, es un problema de cache/sesión');
            console.log('   Solución: Cerrar navegador y volver a loguearse');
        } else {
            console.log('\n⚠️ No hay movimientos financieros registrados');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verificarToken().catch(console.error);

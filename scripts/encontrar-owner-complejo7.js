#!/usr/bin/env node

/**
 * 🔍 ENCONTRAR OWNER DEL COMPLEJO ID: 7
 */

const { Pool } = require('pg');

process.env.NODE_ENV = 'production';
require('dotenv').config();

async function encontrarOwner() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔍 BUSCANDO OWNER DEL COMPLEJO ID: 7...');
        
        // Buscar el complejo
        const complejoQuery = `
            SELECT id, nombre, email
            FROM complejos
            WHERE id = 7;
        `;
        
        const complejo = await pool.query(complejoQuery);
        
        if (complejo.rows.length === 0) {
            console.log('❌ Complejo ID: 7 no encontrado');
            return;
        }
        
        console.log('✅ Complejo encontrado:');
        console.log(`   • ID: ${complejo.rows[0].id}`);
        console.log(`   • Nombre: ${complejo.rows[0].nombre}`);
        console.log(`   • Email: ${complejo.rows[0].email}`);
        
        // Buscar usuarios asociados a este complejo
        const usuariosQuery = `
            SELECT id, email, nombre, rol
            FROM usuarios
            WHERE complejo_id = 7;
        `;
        
        const usuarios = await pool.query(usuariosQuery);
        
        console.log(`\n👥 USUARIOS ASOCIADOS AL COMPLEJO ID: 7:`);
        if (usuarios.rows.length === 0) {
            console.log('   ❌ No hay usuarios asociados');
        } else {
            usuarios.rows.forEach(usuario => {
                console.log(`   • ID: ${usuario.id} | Email: ${usuario.email}`);
                console.log(`     Nombre: ${usuario.nombre} | Rol: ${usuario.rol}`);
            });
        }
        
        // Buscar también en la tabla de owners si existe
        const ownersQuery = `
            SELECT DISTINCT u.id, u.email, u.nombre, u.rol
            FROM usuarios u
            WHERE u.complejo_id = 7 AND u.rol = 'owner'
            LIMIT 1;
        `;
        
        const owner = await pool.query(ownersQuery);
        
        if (owner.rows.length > 0) {
            console.log(`\n🎯 OWNER ENCONTRADO:`);
            console.log(`   • Email: ${owner.rows[0].email}`);
            console.log(`   • Nombre: ${owner.rows[0].nombre}`);
            console.log(`\n✅ SOLUCIÓN: Logueate con la cuenta ${owner.rows[0].email}`);
        } else {
            console.log(`\n❌ No se encontró un owner específico para el Complejo ID: 7`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

encontrarOwner().catch(console.error);



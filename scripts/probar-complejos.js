#!/usr/bin/env node

/**
 * Script para probar la carga de complejos
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function probarComplejos() {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Probando carga de complejos...');
    
    // Verificar complejos en la base de datos
    const complejos = await client.query(`
      SELECT id, nombre 
      FROM complejos 
      ORDER BY id
    `);
    
    console.log(`📊 Complejos en la base de datos: ${complejos.rows.length}`);
    complejos.rows.forEach(complejo => {
      console.log(`  - ID: ${complejo.id} | Nombre: ${complejo.nombre}`);
    });
    
    // Verificar endpoint de complejos
    console.log('\n🔌 Probando endpoint /api/admin/complejos...');
    
    try {
      const response = await fetch('http://localhost:3000/api/admin/complejos');
      console.log(`Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('✅ Endpoint protegido correctamente (401)');
      } else if (response.status === 200) {
        const data = await response.json();
        console.log(`✅ Endpoint funcionando, ${data.complejos?.length || 0} complejos`);
      } else {
        console.log(`⚠️  Status inesperado: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Error probando endpoint:', error.message);
    }
    
    console.log('\n🎯 Solución:');
    console.log('1. Ir a http://localhost:3000/admin-login.html');
    console.log('2. Login con admin@reservatuscanchas.cl / admin123');
    console.log('3. Ir a Gestión de Depósitos');
    console.log('4. Los complejos deberían cargarse automáticamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

probarComplejos().catch(console.error);

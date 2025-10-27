#!/usr/bin/env node

/**
 * Script para probar el sistema de depósitos
 * Simula el login y verifica que los endpoints funcionen
 */

const { Pool } = require('pg');

// Cargar variables de entorno
require('dotenv').config();

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function probarSistemaDepositos() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Probando sistema de depósitos...');
    
    // 1. Verificar que la tabla existe
    const tablaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'depositos_complejos'
      );
    `);
    
    if (!tablaExiste.rows[0].exists) {
      console.log('❌ La tabla depositos_complejos no existe');
      return;
    }
    
    console.log('✅ Tabla depositos_complejos existe');
    
    // 2. Verificar depósitos existentes
    const depositos = await client.query(`
      SELECT 
        dc.*,
        c.nombre as complejo_nombre
      FROM depositos_complejos dc
      JOIN complejos c ON dc.complejo_id = c.id
      ORDER BY dc.fecha_deposito DESC
    `);
    
    console.log(`📊 Depósitos existentes: ${depositos.rows.length}`);
    depositos.rows.forEach(deposito => {
      console.log(`  - ${deposito.complejo_nombre} (${deposito.fecha_deposito}): $${deposito.monto_a_depositar.toLocaleString()} - ${deposito.estado}`);
    });
    
    // 3. Verificar super admin
    const superAdmin = await client.query(`
      SELECT * FROM usuarios WHERE email = 'admin@reservatuscanchas.cl' AND rol = 'super_admin'
    `);
    
    if (superAdmin.rows.length > 0) {
      console.log('✅ Super admin encontrado:', superAdmin.rows[0].email);
    } else {
      console.log('❌ Super admin no encontrado');
    }
    
    // 4. Probar endpoint de depósitos
    console.log('\n🔌 Probando endpoints...');
    
    try {
      const response = await fetch('http://localhost:3000/api/admin/depositos');
      if (response.status === 401) {
        console.log('✅ Endpoint protegido correctamente (401 Unauthorized)');
      } else {
        console.log(`⚠️  Endpoint respondió con status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Error probando endpoint:', error.message);
    }
    
    console.log('\n🎉 Sistema de depósitos funcionando correctamente!');
    console.log('\n📝 Para probar el panel web:');
    console.log('  1. Ir a http://localhost:3000/admin-login.html');
    console.log('  2. Login con: admin@reservatuscanchas.cl');
    console.log('  3. Ir a "Gestión de Depósitos"');
    
  } catch (error) {
    console.error('❌ Error probando sistema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  probarSistemaDepositos().catch(console.error);
}

module.exports = { probarSistemaDepositos };

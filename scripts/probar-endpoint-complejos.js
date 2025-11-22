#!/usr/bin/env node

/**
 * Script para probar el endpoint de complejos con JWT
 */

const jwt = require('jsonwebtoken');

// Generar token JWT válido
const userData = {
  userId: 10,
  email: 'admin@reservatuscanchas.cl',
  nombre: 'Super Administrador',
  rol: 'super_admin',
  complejo_id: null,
  complejo_nombre: null
};

const secret = process.env.JWT_SECRET || 'fallback-secret-key';
const token = jwt.sign(userData, secret, { expiresIn: '24h' });

console.log('🔑 Token JWT generado para prueba');
console.log('📡 Probando endpoint /api/admin/complejos...');

// Probar el endpoint
fetch('http://localhost:3000/api/admin/complejos', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log(`📡 Status: ${response.status} ${response.statusText}`);
  return response.json();
})
.then(data => {
  console.log('📊 Respuesta del servidor:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.success && data.complejos) {
    console.log(`\n✅ ${data.complejos.length} complejos encontrados:`);
    data.complejos.forEach(complejo => {
      console.log(`  - ${complejo.nombre} (ID: ${complejo.id})`);
    });
  } else {
    console.log('\n❌ Formato de respuesta inesperado');
  }
})
.catch(error => {
  console.error('❌ Error:', error.message);
});








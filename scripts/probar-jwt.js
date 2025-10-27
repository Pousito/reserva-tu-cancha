#!/usr/bin/env node

/**
 * Script para probar la autenticación JWT
 */

const jwt = require('jsonwebtoken');

// Simular el token que se genera en el login
const userData = {
  userId: 10,
  email: 'admin@reservatuscanchas.cl',
  nombre: 'Super Administrador',
  rol: 'super_admin',
  complejo_id: null,
  complejo_nombre: null
};

const secret = process.env.JWT_SECRET || 'fallback-secret-key';

// Generar token JWT
const token = jwt.sign(userData, secret, { expiresIn: '24h' });

console.log('🔑 Token JWT generado:');
console.log(token.substring(0, 50) + '...');
console.log('\n📊 Datos del usuario:');
console.log(JSON.stringify(userData, null, 2));

// Verificar el token
try {
  const decoded = jwt.verify(token, secret);
  console.log('\n✅ Token verificado correctamente:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('\n❌ Error verificando token:', error.message);
}

console.log('\n🧪 Para probar:');
console.log('1. Hacer login en http://localhost:3000/admin-login.html');
console.log('2. Abrir DevTools → Application → Local Storage');
console.log('3. Verificar que adminToken contenga un JWT token');
console.log('4. Ir a Gestión de Depósitos');
console.log('5. Los complejos deberían cargarse');

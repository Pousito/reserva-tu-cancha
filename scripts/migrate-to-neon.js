#!/usr/bin/env node

/**
 * Script para migrar de Render PostgreSQL a Neon
 * Pasos para la migración completa
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 GUÍA DE MIGRACIÓN A NEON POSTGRESQL');
console.log('=====================================');

console.log('\n📋 PASOS PARA MIGRAR A NEON:');
console.log('============================');

console.log('\n1️⃣ CREAR CUENTA EN NEON:');
console.log('   • Ve a: https://neon.tech');
console.log('   • Crea cuenta gratuita');
console.log('   • Crea nuevo proyecto');
console.log('   • Copia la connection string');

console.log('\n2️⃣ CONFIGURAR NEON:');
console.log('   • Plan gratuito: 3 GB (sin expiración)');
console.log('   • Región: Oregon (más cerca de Chile)');
console.log('   • Backup automático incluido');

console.log('\n3️⃣ EXPORTAR DATOS DE RENDER:');
console.log('   • Ejecuta: node scripts/export-render-data.js');
console.log('   • Se creará backup completo');

console.log('\n4️⃣ IMPORTAR A NEON:');
console.log('   • Ejecuta: node scripts/import-to-neon.js');
console.log('   • Se importarán todos los datos');

console.log('\n5️⃣ ACTUALIZAR CONFIGURACIÓN:');
console.log('   • Actualizar render.yaml con nueva DATABASE_URL');
console.log('   • Hacer deploy');
console.log('   • Verificar funcionamiento');

console.log('\n💡 VENTAJAS DE NEON:');
console.log('   ✅ Plan gratuito sin expiración');
console.log('   ✅ Mejor rendimiento que Render');
console.log('   ✅ Backup automático');
console.log('   ✅ Interfaz web moderna');
console.log('   ✅ Escalabilidad automática');

console.log('\n⚠️ IMPORTANTE:');
console.log('   • Haz backup completo antes de migrar');
console.log('   • Prueba en ambiente de desarrollo primero');
console.log('   • Coordina la migración en horario de bajo tráfico');

console.log('\n🔧 COMANDOS PARA EJECUTAR:');
console.log('   1. node scripts/export-render-data.js');
console.log('   2. node scripts/import-to-neon.js');
console.log('   3. Actualizar render.yaml');
console.log('   4. git add . && git commit -m "Migrate to Neon" && git push');

console.log('\n📞 SOPORTE:');
console.log('   • Neon Docs: https://neon.tech/docs');
console.log('   • Discord: https://discord.gg/92vNTz9Q7a');

console.log('\n✅ ¿Listo para comenzar la migración?');
console.log('   Ejecuta: node scripts/export-render-data.js');

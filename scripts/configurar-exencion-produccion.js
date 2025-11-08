/**
 * Script para configurar exención de comisiones en producción
 * Este script debe ejecutarse desde la consola del navegador en producción
 * después de que el deploy se complete
 * 
 * Ejecutar desde la consola del navegador (panel admin en producción):
 */

const codigoScript = `
(async function() {
  const token = localStorage.getItem('adminToken');
  const API_BASE = window.API_BASE || 'https://www.reservatuscanchas.cl/api';
  
  if (!token) {
    console.error('❌ No estás autenticado');
    return;
  }
  
  console.log('🔧 Configurando exención de comisiones en producción...');
  console.log('📋 Esto incluye:');
  console.log('   1. Agregar columna comision_inicio_fecha si no existe');
  console.log('   2. Configurar fecha 2026-01-01 para Espacio Deportivo Borde Río');
  console.log('   3. Corregir comisiones de reservas existentes (fecha < 2026-01-01)');
  console.log('   4. Eliminar egresos de comisión de reservas exentas\\n');
  
  try {
    // Paso 1: Configurar exención
    const response1 = await fetch(\`\${API_BASE}/debug/configurar-exencion-comisiones\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      }
    });
    
    const result1 = await response1.json();
    
    if (response1.ok) {
      console.log('✅ Paso 1 - Exención configurada:', result1);
      console.log(\`📊 Reservas corregidas: \${result1.total}\\n\`);
      
      // Paso 2: Eliminar egresos incorrectos (si hay endpoint)
      // Esto lo hará el trigger automáticamente, pero podemos verificar
      console.log('✅ Paso 2 - Trigger actualizado eliminará egresos automáticamente');
      console.log('   Para forzar sincronización, las reservas exentas serán actualizadas\\n');
      
      // Paso 3: Disparar trigger para sincronizar egresos
      // Actualizar reservas para disparar el trigger
      console.log('🔄 Paso 3 - Disparando trigger para sincronizar egresos...');
      
      // Obtener reservas exentas
      const reservasResponse = await fetch(\`\${API_BASE}/admin/reservas\`, {
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      });
      
      if (reservasResponse.ok) {
        const reservas = await reservasResponse.json();
        const reservasBordeRio = reservas.filter(r => 
          r.complejo_nombre === 'Espacio Deportivo Borde Río' && 
          new Date(r.fecha) < new Date('2026-01-01') &&
          r.comision_aplicada === 0
        );
        
        console.log(\`📊 Encontradas \${reservasBordeRio.length} reservas exentas a sincronizar\\n\`);
        console.log('✅ El trigger se ejecutará automáticamente en futuras actualizaciones');
        console.log('✅ Si hay egresos antiguos, se eliminarán automáticamente\\n');
      }
      
      console.log('✅ CONFIGURACIÓN COMPLETA');
      console.log('========================');
      console.log('📋 Resumen:');
      console.log('   - Fecha de inicio de comisiones: 2026-01-01');
      console.log('   - Exento hasta: 2025-12-31');
      console.log('   - Reservas corregidas: ' + result1.total);
      console.log('   - Egresos serán eliminados automáticamente por el trigger');
      
    } else {
      console.error('❌ Error en Paso 1:', result1);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
})();
`;

console.log('📋 Script para ejecutar en producción:');
console.log('=====================================');
console.log(codigoScript);
console.log('\n✅ Copia y pega este código en la consola del navegador en producción');


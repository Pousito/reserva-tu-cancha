/**
 * Script para diagnosticar discrepancia entre reportes y control financiero
 * 
 * Uso: Copiar y pegar en la consola del navegador desde el panel de admin
 */

(async function diagnosticarDiscrepancia() {
  try {
    // Obtener token y usuario
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    if (!token || !userStr) {
      console.error('❌ No estás autenticado. Por favor inicia sesión primero.');
      return;
    }
    
    const user = JSON.parse(userStr);
    const API_BASE = window.API_BASE || window.URL_CONFIG?.API_URL || '/api';
    const baseUrl = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`;
    
    // Parámetros del período (ajusta estas fechas según necesites)
    const complejoId = user.complejo_id || 8; // Demo 3
    const fechaDesde = '2025-09-01';
    const fechaHasta = '2025-11-30';
    
    console.log('🔍 Diagnosticando discrepancia de ingresos...');
    console.log('📅 Período:', fechaDesde, 'a', fechaHasta);
    console.log('🏢 Complejo ID:', complejoId);
    
    // Llamar al endpoint de diagnóstico
    const response = await fetch(
      `${baseUrl}/admin/diagnosticar-ingresos?complejo_id=${complejoId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error:', data.error);
      return;
    }
    
    // Mostrar resultados
    console.log('\n📊 REPORTES (monto_abonado de reservas):');
    console.log('  - Total reservas:', data.reportes.total_reservas);
    console.log('  - Reservas confirmadas:', data.reportes.reservas_confirmadas);
    console.log('  - Ingresos brutos:', data.reportes.ingresos_brutos);
    
    console.log('\n💰 CONTROL FINANCIERO:');
    console.log('  - Total ingresos (todos):', data.control_financiero.total_ingresos);
    console.log('  - Total movimientos:', data.control_financiero.total_movimientos);
    console.log('  - Ingresos de reservas:', data.control_financiero.ingresos_reservas);
    console.log('  - Cantidad ingresos reservas:', data.control_financiero.cantidad_ingresos_reservas);
    console.log('  - Otros ingresos:', data.control_financiero.otros_ingresos);
    console.log('  - Cantidad otros ingresos:', data.control_financiero.cantidad_otros_ingresos);
    
    if (Object.keys(data.control_financiero.otros_por_categoria).length > 0) {
      console.log('\n📦 OTROS INGRESOS POR CATEGORÍA:');
      Object.entries(data.control_financiero.otros_por_categoria).forEach(([cat, monto]) => {
        console.log(`  • ${cat}: $${monto}`);
      });
    }
    
    if (data.duplicados.cantidad > 0) {
      console.log('\n⚠️ INGRESOS DUPLICADOS ENCONTRADOS:');
      console.log('  - Cantidad de reservas duplicadas:', data.duplicados.cantidad);
      console.log('  - Total duplicado:', data.duplicados.total_duplicado);
      data.duplicados.detalles.forEach(dup => {
        console.log(`  - Reserva #${dup.codigo}: ${dup.cantidad} ingresos (Total: $${dup.total})`);
        dup.detalles.forEach(ing => {
          console.log(`    • ID ${ing.id}: $${ing.monto} (${ing.fecha})`);
        });
      });
    } else {
      console.log('\n✅ No se encontraron ingresos duplicados');
    }
    
    console.log('\n📊 RESUMEN DE DIFERENCIAS:');
    console.log('  - Control Financiero (todos) vs Reportes:', data.diferencias.control_vs_reportes);
    console.log('  - Control Financiero (reservas) vs Reportes:', data.diferencias.reservas_vs_reportes);
    console.log('  - Otros ingresos (no de reservas):', data.diferencias.otros_ingresos);
    
    console.log('\n💡 ANÁLISIS:');
    if (data.diferencias.otros_ingresos > 0) {
      console.log(`  ⚠️ Hay $${data.diferencias.otros_ingresos} en ingresos manuales que no son de reservas.`);
      console.log('     Esto explica parte de la diferencia.');
    }
    
    if (data.duplicados.cantidad > 0) {
      console.log(`  ⚠️ Hay ${data.duplicados.cantidad} reservas con ingresos duplicados (Total: $${data.duplicados.total_duplicado}).`);
      console.log('     Esto también explica parte de la diferencia.');
    }
    
    if (Math.abs(data.diferencias.reservas_vs_reportes) > 100) {
      console.log(`  ⚠️ Diferencia significativa entre ingresos de reservas y reportes: $${data.diferencias.reservas_vs_reportes}`);
      console.log('     Posibles causas:');
      console.log('     - Fechas diferentes (fecha de reserva vs fecha de ingreso)');
      console.log('     - Montos diferentes (monto_abonado vs precio_total)');
      console.log('     - Reservas sincronizadas múltiples veces');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();


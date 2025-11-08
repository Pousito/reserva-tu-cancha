// Script para normalizar métodos de pago de reservas web
// Ejecutar desde la consola del navegador en admin-gastos.html

const token = localStorage.getItem('adminToken');

if (!token) {
  console.error('❌ No hay token de autenticación. Por favor, inicia sesión primero.');
} else {
  fetch('/api/admin/normalizar-metodos-pago-reservas-web', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Normalización completada:', data);
      console.log(`📊 Registros actualizados: ${data.registros_actualizados}`);
      alert(`✅ Métodos de pago normalizados exitosamente.\n\nRegistros actualizados: ${data.registros_actualizados}\n\nPor favor, recarga la página para ver los cambios.`);
      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      console.error('❌ Error:', data);
      alert('❌ Error: ' + (data.error || data.message || 'Error desconocido'));
    }
  })
  .catch(error => {
    console.error('❌ Error en la petición:', error);
    alert('❌ Error en la petición: ' + error.message);
  });
}


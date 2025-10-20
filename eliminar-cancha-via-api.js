const fetch = require('node-fetch');

async function eliminarCanchaPadel() {
  try {
    console.log('🗑️ Eliminando cancha 2 de pádel duplicada via API...');
    
    // Llamar al endpoint que creamos
    const response = await fetch('https://www.reservatuscanchas.cl/api/admin/eliminar-cancha-padel-duplicada', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Respuesta:', result);
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

eliminarCanchaPadel();

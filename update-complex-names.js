const fetch = require('node-fetch');

async function updateComplexNames() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🔍 Verificando complejos actuales...');
    
    // Obtener ciudades primero
    const ciudadesResponse = await fetch(`${baseUrl}/api/ciudades`);
    const ciudades = await ciudadesResponse.json();
    console.log('📋 Ciudades encontradas:', ciudades);
    
    // Para cada ciudad, obtener sus complejos
    for (const ciudad of ciudades) {
      console.log(`\n🏙️ Ciudad: ${ciudad.nombre} (ID: ${ciudad.id})`);
      
      const complejosResponse = await fetch(`${baseUrl}/api/complejos/${ciudad.id}`);
      const complejos = await complejosResponse.json();
      
      console.log('📋 Complejos en esta ciudad:');
      complejos.forEach(complejo => {
        console.log(`- ID: ${complejo.id} | Nombre: ${complejo.nombre}`);
      });
      
      // Buscar los complejos específicos que necesitamos cambiar
      const fundacionGunnen = complejos.find(c => 
        c.nombre.toLowerCase().includes('gunnen') || 
        c.nombre.toLowerCase().includes('fundacion')
      );
      
      const bordeRio = complejos.find(c => 
        c.nombre.toLowerCase().includes('borde') && 
        c.nombre.toLowerCase().includes('rio')
      );
      
      console.log('\n🎯 Complejos a cambiar:');
      if (fundacionGunnen) {
        console.log(`- Fundación Gunnen: ID ${fundacionGunnen.id} -> "Complejo Demo 1"`);
      }
      if (bordeRio) {
        console.log(`- Borde Río: ID ${bordeRio.id} -> "Complejo Demo 2"`);
      }
      
      // Realizar los cambios usando la API
      if (fundacionGunnen) {
        try {
          const updateResponse = await fetch(`${baseUrl}/api/admin/complejos/${fundacionGunnen.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nombre: 'Complejo Demo 1'
            })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
          } else {
            console.log('❌ Error actualizando Fundación Gunnen:', await updateResponse.text());
          }
        } catch (error) {
          console.log('❌ Error en actualización:', error.message);
        }
      }
      
      if (bordeRio) {
        try {
          const updateResponse = await fetch(`${baseUrl}/api/admin/complejos/${bordeRio.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nombre: 'Complejo Demo 2'
            })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
          } else {
            console.log('❌ Error actualizando Borde Río:', await updateResponse.text());
          }
        } catch (error) {
          console.log('❌ Error en actualización:', error.message);
        }
      }
    }
    
    // Verificar los cambios
    console.log('\n🔍 Verificando cambios aplicados...');
    for (const ciudad of ciudades) {
      const complejosResponse = await fetch(`${baseUrl}/api/complejos/${ciudad.id}`);
      const complejos = await complejosResponse.json();
      
      console.log(`\n📋 Complejos en ${ciudad.nombre} después de los cambios:`);
      complejos.forEach(complejo => {
        console.log(`- ID: ${complejo.id} | Nombre: ${complejo.nombre}`);
      });
    }
    
    console.log('\n✅ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:3000');
  }
}

// Esperar un poco para que el servidor se inicie
setTimeout(updateComplexNames, 5000);

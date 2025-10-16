const DatabaseManager = require('./src/config/database');

async function updateComplexNamesViaServer() {
    console.log('🏢 ACTUALIZANDO NOMBRES DE COMPLEJOS VÍA SERVIDOR');
    console.log('================================================');
    
    const db = new DatabaseManager();
    
    try {
        console.log('🔌 Conectando a la base de datos...');
        await db.connect();
        
        console.log('🔍 Verificando complejos actuales...');
        
        // Verificar complejos actuales
        const complejos = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados:');
        complejos.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log('   ---');
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
        
        // Realizar los cambios
        if (fundacionGunnen) {
            console.log('\n🔄 Actualizando Fundación Gunnen...');
            await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río...');
            await db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos después de los cambios:');
        complejosActualizados.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log('   ---');
        });
        
        console.log('\n✅ Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('📋 Detalles del error:', error);
    } finally {
        await db.close();
    }
}

// Configurar variables de entorno para desarrollo
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: 'env.postgresql' });

updateComplexNamesViaServer();

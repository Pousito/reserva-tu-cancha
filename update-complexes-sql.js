const { Pool } = require('pg');

async function updateComplexNamesSQL() {
    console.log('🏢 ACTUALIZANDO NOMBRES DE COMPLEJOS VÍA SQL DIRECTO');
    console.log('===================================================');
    
    // Intentar diferentes configuraciones de conexión
    const configs = [
        {
            name: 'Configuración 1: postgres sin contraseña',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'reserva_tu_cancha_local',
                user: 'postgres',
                password: ''
            }
        },
        {
            name: 'Configuración 2: pousito sin contraseña',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'reserva_tu_cancha_local',
                user: 'pousito',
                password: ''
            }
        },
        {
            name: 'Configuración 3: postgres con contraseña postgres',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'reserva_tu_cancha_local',
                user: 'postgres',
                password: 'postgres'
            }
        },
        {
            name: 'Configuración 4: pousito con contraseña postgres',
            config: {
                host: 'localhost',
                port: 5432,
                database: 'reserva_tu_cancha_local',
                user: 'pousito',
                password: 'postgres'
            }
        }
    ];
    
    let pool = null;
    let successfulConfig = null;
    
    // Intentar cada configuración
    for (const config of configs) {
        try {
            console.log(`\n🔄 Probando: ${config.name}`);
            pool = new Pool(config.config);
            const client = await pool.connect();
            console.log(`✅ Conexión exitosa con: ${config.name}`);
            successfulConfig = config;
            client.release();
            break;
        } catch (error) {
            console.log(`❌ Falló: ${config.name} - ${error.message}`);
            if (pool) {
                await pool.end();
                pool = null;
            }
        }
    }
    
    if (!successfulConfig) {
        console.log('\n❌ No se pudo conectar con ninguna configuración');
        return;
    }
    
    try {
        console.log(`\n🔌 Usando configuración exitosa: ${successfulConfig.name}`);
        
        // Verificar complejos actuales
        const complejosCheck = await pool.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos encontrados:');
        complejosCheck.rows.forEach(complejo => {
            console.log(`   🆔 ID: ${complejo.id}`);
            console.log(`   🏢 Nombre: ${complejo.nombre}`);
            console.log(`   🏙️ Ciudad: ${complejo.ciudad_nombre}`);
            console.log('   ---');
        });
        
        // Buscar los complejos específicos que necesitamos cambiar
        const fundacionGunnen = complejosCheck.rows.find(c => 
            c.nombre.toLowerCase().includes('gunnen') || 
            c.nombre.toLowerCase().includes('fundacion')
        );
        
        const bordeRio = complejosCheck.rows.find(c => 
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
            await pool.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 1', fundacionGunnen.id]);
            console.log('✅ Actualizado: Fundación Gunnen -> Complejo Demo 1');
        }
        
        if (bordeRio) {
            console.log('\n🔄 Actualizando Borde Río...');
            await pool.query('UPDATE complejos SET nombre = $1 WHERE id = $2', ['Complejo Demo 2', bordeRio.id]);
            console.log('✅ Actualizado: Borde Río -> Complejo Demo 2');
        }
        
        // Verificar los cambios
        console.log('\n🔍 Verificando cambios aplicados...');
        const complejosActualizados = await pool.query(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('📊 Complejos después de los cambios:');
        complejosActualizados.rows.forEach(complejo => {
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
        if (pool) {
            await pool.end();
        }
    }
}

updateComplexNamesSQL();

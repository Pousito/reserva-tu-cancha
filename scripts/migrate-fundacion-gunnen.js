/**
 * Script para migrar Fundación Gunnen a producción
 * Agrega el complejo y sus canchas a la base de datos
 */

const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://pousito:password@localhost:5432/reserva_tu_cancha_local'
});

async function migrateFundacionGunnen() {
    try {
        console.log('🚀 Iniciando migración de Fundación Gunnen...');
        
        // Verificar si el complejo ya existe
        const existingComplex = await pool.query(
            'SELECT id FROM complejos WHERE nombre = $1',
            ['Fundación Gunnen']
        );
        
        if (existingComplex.rows.length > 0) {
            console.log('⚠️ Fundación Gunnen ya existe en la base de datos');
            console.log(`ID del complejo existente: ${existingComplex.rows[0].id}`);
            return;
        }
        
        // 1. Insertar el complejo Fundación Gunnen
        console.log('📝 Insertando complejo Fundación Gunnen...');
        const complexResult = await pool.query(`
            INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id
        `, [
            'Fundación Gunnen',
            1, // Ciudad ID: Los Ángeles
            'Calle Don Victor 1310',
            '+56972815810',
            'naxiin_320@hotmail.com'
        ]);
        
        const complexId = complexResult.rows[0].id;
        console.log(`✅ Complejo Fundación Gunnen creado con ID: ${complexId}`);
        
        // 2. Insertar las canchas
        console.log('⚽ Insertando canchas de Fundación Gunnen...');
        
        const canchas = [
            { nombre: 'Cancha 1', tipo: 'futbol', precio: 8000, numero: 1 },
            { nombre: 'Cancha 2', tipo: 'futbol', precio: 8000, numero: 2 }
        ];
        
        for (const cancha of canchas) {
            const canchaResult = await pool.query(`
                INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora, numero) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id
            `, [complexId, cancha.nombre, cancha.tipo, cancha.precio, cancha.numero]);
            
            console.log(`✅ Cancha "${cancha.nombre}" creada con ID: ${canchaResult.rows[0].id}`);
        }
        
        // 3. Verificar la migración
        console.log('\n🔍 Verificando migración...');
        const verifyComplex = await pool.query(
            'SELECT * FROM complejos WHERE nombre = $1',
            ['Fundación Gunnen']
        );
        
        const verifyCanchas = await pool.query(
            'SELECT * FROM canchas WHERE complejo_id = $1',
            [complexId]
        );
        
        console.log(`✅ Complejo verificado: ${verifyComplex.rows[0].nombre}`);
        console.log(`✅ Canchas verificadas: ${verifyCanchas.rows.length} canchas`);
        
        console.log('\n🎉 Migración de Fundación Gunnen completada exitosamente!');
        console.log(`📊 Resumen:`);
        console.log(`   - Complejo ID: ${complexId}`);
        console.log(`   - Canchas creadas: ${verifyCanchas.rows.length}`);
        console.log(`   - Precio por hora: $8,000`);
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
    migrateFundacionGunnen()
        .then(() => {
            console.log('✅ Script completado');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script falló:', error);
            process.exit(1);
        });
}

module.exports = { migrateFundacionGunnen };

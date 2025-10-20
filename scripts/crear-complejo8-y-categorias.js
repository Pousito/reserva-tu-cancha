const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearComplejo8YCategorias() {
  const client = await pool.connect();
  try {
    console.log('🏗️ ================================================');
    console.log('🏗️ CREANDO COMPLEJO ID 8 Y SUS CATEGORÍAS');
    console.log('🏗️ ================================================');

    // 1. Verificar si el complejo ID 8 ya existe
    const complejoExistente = await client.query('SELECT id, nombre FROM complejos WHERE id = $1', [8]);
    
    if (complejoExistente.rows.length > 0) {
      console.log(`✅ Complejo ID 8 ya existe: ${complejoExistente.rows[0].nombre}`);
    } else {
      console.log('➕ Creando Complejo Demo 3 con ID 8...');
      
      // Crear el complejo con ID 8
      await client.query(`
        INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        8,
        'Complejo Demo 3',
        1, // ciudad_id para Los Ángeles
        'Av. Los Robles 2450, Los Ángeles',
        '+56912345678',
        'owner@complejodemo3.cl'
      ]);
      
      console.log('✅ Complejo Demo 3 creado con ID 8');
    }

    // 2. Verificar categorías existentes para complejo ID 8
    console.log('\n🔍 Verificando categorías existentes para complejo ID 8...');
    const categoriasExistentes = await client.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [8]);

    console.log(`📊 Categorías existentes: ${categoriasExistentes.rows.length}`);
    categoriasExistentes.rows.forEach(c => {
      console.log(`   - ${c.nombre} (${c.tipo})`);
    });

    // 3. Categorías necesarias para el sistema de reservas
    const categoriasNecesarias = [
      { nombre: 'Reservas Web', tipo: 'ingreso' },
      { nombre: 'Comisión Plataforma', tipo: 'gasto' }
    ];

    const categoriasCreadas = [];
    const categoriasExistentesNombres = categoriasExistentes.rows.map(c => c.nombre);

    // 4. Crear categorías que no existen
    for (const categoria of categoriasNecesarias) {
      if (!categoriasExistentesNombres.includes(categoria.nombre)) {
        console.log(`➕ Creando categoría: ${categoria.nombre} (${categoria.tipo})`);
        
        const result = await client.query(`
          INSERT INTO categorias_gastos (complejo_id, nombre, tipo, descripcion)
          VALUES ($1, $2, $3, $4)
          RETURNING id, nombre, tipo
        `, [
          8,
          categoria.nombre,
          categoria.tipo,
          `Categoría automática para ${categoria.nombre}`
        ]);
        
        const categoriaCreada = result.rows[0];
        categoriasCreadas.push(categoriaCreada);
        console.log(`✅ Categoría creada: ${categoriaCreada.nombre} (ID: ${categoriaCreada.id})`);
      } else {
        console.log(`⚠️ Categoría ya existe: ${categoria.nombre}`);
      }
    }

    // 5. Verificar categorías finales
    console.log('\n🔍 Verificando categorías finales...');
    const categoriasFinales = await client.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [8]);

    console.log(`📊 Total de categorías: ${categoriasFinales.rows.length}`);
    categoriasFinales.rows.forEach(c => {
      console.log(`   ${c.id}. ${c.nombre} (${c.tipo}) - ${c.descripcion}`);
    });

    console.log('\n🎉 ================================================');
    console.log('🎉 COMPLEJO ID 8 Y CATEGORÍAS CONFIGURADOS');
    console.log('🎉 ================================================');
    console.log(`🏟️  Complejo: Complejo Demo 3 (ID: 8)`);
    console.log(`📊 Categorías creadas: ${categoriasCreadas.length}`);
    console.log(`📊 Total categorías: ${categoriasFinales.rows.length}`);

    if (categoriasCreadas.length > 0) {
      console.log('\n✅ Categorías creadas:');
      categoriasCreadas.forEach(c => {
        console.log(`   - ${c.nombre} (${c.tipo}) - ID: ${c.id}`);
      });
    }

    console.log('\n💡 Ahora el sistema podrá registrar movimientos financieros automáticamente');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

crearComplejo8YCategorias();



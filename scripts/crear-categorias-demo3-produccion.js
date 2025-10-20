const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearCategoriasDemo3Produccion() {
  const client = await pool.connect();
  try {
    console.log('🏗️ ================================================');
    console.log('🏗️ CREANDO CATEGORÍAS FINANCIERAS - COMPLEJO DEMO 3');
    console.log('🏗️ ================================================');

    // 1. Buscar el Complejo Demo 3 por nombre
    console.log('🔍 Buscando Complejo Demo 3...');
    const complejos = await client.query('SELECT id, nombre FROM complejos WHERE nombre LIKE $1', ['%Demo 3%']);
    
    if (complejos.rows.length === 0) {
      console.error(`❌ Complejo Demo 3 no encontrado.`);
      console.log('🔍 Listando todos los complejos disponibles:');
      const todosComplejos = await client.query('SELECT id, nombre FROM complejos ORDER BY id');
      todosComplejos.rows.forEach(c => {
        console.log(`   ${c.id}. ${c.nombre}`);
      });
      return;
    }
    
    const complejo = complejos.rows[0];
    const complejoId = complejo.id;
    const complejoNombre = complejo.nombre;
    console.log(`✅ Complejo encontrado: ${complejoNombre} (ID: ${complejoId})`);

    // 2. Verificar categorías existentes
    console.log('🔍 Verificando categorías existentes...');
    const categoriasExistentes = await client.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [complejoId]);

    console.log(`📊 Categorías existentes: ${categoriasExistentes.length}`);
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
          complejoId,
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
    `, [complejoId]);

    console.log(`📊 Total de categorías: ${categoriasFinales.rows.length}`);
    categoriasFinales.rows.forEach(c => {
      console.log(`   ${c.id}. ${c.nombre} (${c.tipo}) - ${c.descripcion}`);
    });

    console.log('\n🎉 ================================================');
    console.log('🎉 CATEGORÍAS FINANCIERAS CREADAS EXITOSAMENTE');
    console.log('🎉 ================================================');
    console.log(`🏟️  Complejo: ${complejoNombre} (ID: ${complejoId})`);
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

crearCategoriasDemo3Produccion();

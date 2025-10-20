const { Pool } = require('pg');
require('dotenv').config();

// Configuración para producción (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function crearCategoriasComplejo8() {
  const client = await pool.connect();
  try {
    console.log('🏗️ ================================================');
    console.log('🏗️ CREANDO CATEGORÍAS FINANCIERAS - COMPLEJO ID 8');
    console.log('🏗️ ================================================');

    const complejoId = 8; // ID del Complejo Demo 3 (segundo registro)

    // 1. Verificar que el complejo existe
    const complejo = await client.query('SELECT id, nombre FROM complejos WHERE id = $1', [complejoId]);
    if (complejo.rows.length === 0) {
      console.error(`❌ Complejo con ID ${complejoId} no encontrado.`);
      return;
    }
    console.log(`✅ Complejo encontrado: ${complejo.rows[0].nombre} (ID: ${complejo.rows[0].id})`);

    // 2. Verificar categorías existentes
    console.log('🔍 Verificando categorías existentes...');
    const categoriasExistentes = await client.query(`
      SELECT * FROM categorias_gastos 
      WHERE complejo_id = $1 
      ORDER BY tipo, nombre
    `, [complejoId]);

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
    console.log(`🏟️  Complejo: ${complejo.rows[0].nombre} (ID: ${complejoId})`);
    console.log(`📊 Categorías creadas: ${categoriasCreadas.length}`);
    console.log(`📊 Total categorías: ${categoriasFinales.rows.length}`);

    if (categoriasCreadas.length > 0) {
      console.log('\n✅ Categorías creadas:');
      categoriasCreadas.forEach(c => {
        console.log(`   - ${c.nombre} (${c.tipo}) - ID: ${c.id}`);
      });
    }

    console.log('\n💡 Ahora el sistema podrá registrar movimientos financieros automáticamente para este complejo');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

crearCategoriasComplejo8();



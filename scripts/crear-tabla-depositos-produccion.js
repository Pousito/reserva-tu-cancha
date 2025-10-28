/**
 * Script para crear la tabla depositos_complejos en PRODUCCIÓN
 * 
 * IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ en producción
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos de PRODUCCIÓN
const productionConfig = {
  host: 'dpg-ctbkckbtq21c73a8dq20-a.oregon-postgres.render.com',
  port: 5432,
  database: 'reserva_tu_cancha',
  user: 'reserva_tu_cancha_user',
  password: 'EeHSrS0D0KeH3QL1hAmxZCVkBq8i5fHn',
  ssl: {
    rejectUnauthorized: false
  }
};

async function crearTablaDepositos() {
  console.log('🚀 Iniciando creación de tabla depositos_complejos en PRODUCCIÓN...\n');
  
  const client = new Client(productionConfig);
  
  try {
    // Conectar a la base de datos
    console.log('📡 Conectando a la base de datos de producción...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');
    
    // Leer el script SQL
    const sqlPath = path.join(__dirname, 'sql', 'crear-tabla-depositos-complejos.sql');
    console.log('📄 Leyendo script SQL:', sqlPath);
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ Script SQL cargado\n');
    
    // Verificar si la tabla ya existe
    console.log('🔍 Verificando si la tabla ya existe...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'depositos_complejos'
      );
    `);
    
    if (checkResult.rows[0].exists) {
      console.log('⚠️  La tabla depositos_complejos YA EXISTE en producción');
      console.log('ℹ️  No es necesario crearla de nuevo');
      return;
    }
    
    console.log('📝 La tabla NO existe, procediendo con la creación...\n');
    
    // Ejecutar el script SQL
    console.log('⚡ Ejecutando script SQL...');
    await client.query(sqlScript);
    console.log('✅ Script ejecutado exitosamente\n');
    
    // Verificar que se creó correctamente
    console.log('🔍 Verificando creación de la tabla...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'depositos_complejos'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Tabla creada con', verifyResult.rows.length, 'columnas:');
    verifyResult.rows.forEach(col => {
      console.log('   -', col.column_name, ':', col.data_type);
    });
    
    console.log('\n✅ ¡ÉXITO! Tabla depositos_complejos creada en producción');
    console.log('🎉 Ahora puedes usar la sección de Gestión de Depósitos');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await client.end();
    console.log('\n📡 Conexión cerrada');
  }
}

// Ejecutar el script
crearTablaDepositos()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando el script:', error);
    process.exit(1);
  });

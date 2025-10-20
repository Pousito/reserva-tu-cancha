const { Pool } = require('pg');

// URL de conexión directa a la base de datos de Render
// Esta URL debe ser obtenida del dashboard de Render
const connectionString = 'postgresql://reserva_user:YOUR_PASSWORD_HERE@dpg-d2uhibjuibrs73fm8ec0-a:5432/reserva_tu_cancha';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createDemo3Users() {
  const client = await pool.connect();
  try {
    console.log('🏟️ ================================================');
    console.log('🏟️ CREANDO USUARIOS PARA COMPLEJO DEMO 3 - RENDER');
    console.log('🏟️ ================================================');

    // Verificar que el complejo Demo 3 existe
    const complejoResult = await client.query('SELECT id, nombre FROM complejos WHERE nombre = $1', ['Complejo Demo 3']);
    
    if (complejoResult.rows.length === 0) {
      console.error('❌ Complejo Demo 3 no encontrado en la base de datos');
      return;
    }

    const complejoId = complejoResult.rows[0].id;
    console.log(`✅ Complejo Demo 3 encontrado: ID ${complejoId}`);

    // Verificar si los usuarios ya existen
    const existingUsers = await client.query(
      'SELECT email, rol FROM usuarios WHERE email IN ($1, $2)',
      ['owner@complejodemo3.cl', 'manager@complejodemo3.cl']
    );

    console.log(`🔍 Usuarios existentes encontrados: ${existingUsers.rows.length}`);
    existingUsers.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.rol})`);
    });

    // Crear usuario Owner
    const ownerEmail = 'owner@complejodemo3.cl';
    const ownerPassword = 'Owner1234!';
    const ownerExists = existingUsers.rows.find(u => u.email === ownerEmail);

    if (ownerExists) {
      console.log(`⚠️ Usuario Owner ya existe: ${ownerEmail}`);
    } else {
      console.log('👤 Creando usuario Owner...');
      await client.query(`
        INSERT INTO usuarios (email, password, rol, complejo_id, nombre, activo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        ownerEmail,
        ownerPassword,
        'owner',
        complejoId,
        'Owner Complejo Demo 3',
        true
      ]);
      console.log(`✅ Usuario Owner creado: ${ownerEmail}`);
    }

    // Crear usuario Manager
    const managerEmail = 'manager@complejodemo3.cl';
    const managerPassword = 'Manager1234!';
    const managerExists = existingUsers.rows.find(u => u.email === managerEmail);

    if (managerExists) {
      console.log(`⚠️ Usuario Manager ya existe: ${managerEmail}`);
    } else {
      console.log('👤 Creando usuario Manager...');
      await client.query(`
        INSERT INTO usuarios (email, password, rol, complejo_id, nombre, activo, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        managerEmail,
        managerPassword,
        'manager',
        complejoId,
        'Manager Complejo Demo 3',
        true
      ]);
      console.log(`✅ Usuario Manager creado: ${managerEmail}`);
    }

    // Verificar usuarios creados
    console.log('\n🔍 Verificando usuarios creados...');
    const finalUsers = await client.query(
      'SELECT email, rol, nombre, activo FROM usuarios WHERE complejo_id = $1 ORDER BY rol, email',
      [complejoId]
    );

    console.log(`📊 Total usuarios en Complejo Demo 3: ${finalUsers.rows.length}`);
    finalUsers.rows.forEach(user => {
      console.log(`   ${user.rol.toUpperCase()}: ${user.email} - ${user.nombre} (${user.activo ? 'Activo' : 'Inactivo'})`);
    });

    console.log('\n🎉 ================================================');
    console.log('🎉 USUARIOS COMPLEJO DEMO 3 CREADOS EXITOSAMENTE');
    console.log('🎉 ================================================');
    console.log('📧 Credenciales:');
    console.log('   Owner:  owner@complejodemo3.cl / Owner1234!');
    console.log('   Manager: manager@complejodemo3.cl / Manager1234!');
    console.log('🏟️ Complejo: Complejo Demo 3 (ID: ' + complejoId + ')');

  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
  } finally {
    client.release();
    pool.end();
    console.log('✅ Conexión cerrada');
  }
}

createDemo3Users();



const sqlite3 = require('sqlite3').verbose();

// Ruta de la base de datos local
const dbPath = './database.sqlite';

console.log('🔍 VERIFICANDO BASE DE DATOS LOCAL');
console.log('==================================');
console.log(`📁 Ruta: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    return;
  }
  
  console.log('✅ Conectado a la base de datos SQLite local');
  
  // Verificar tablas existentes
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Error consultando tablas:', err.message);
      return;
    }
    
    console.log('\n📋 TABLAS EXISTENTES:');
    console.log('=====================');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });
    
    // Verificar si existe la tabla usuarios
    const hasUsersTable = tables.some(t => t.name === 'usuarios');
    console.log(`\n👥 Tabla usuarios existe: ${hasUsersTable ? '✅ SÍ' : '❌ NO'}`);
    
    if (hasUsersTable) {
      // Verificar usuarios en la tabla
      db.all("SELECT * FROM usuarios", (err, usuarios) => {
        if (err) {
          console.error('❌ Error consultando usuarios:', err.message);
        } else {
          console.log(`\n👤 USUARIOS ENCONTRADOS: ${usuarios.length}`);
          usuarios.forEach(usuario => {
            console.log(`   - ${usuario.email} (${usuario.rol}) - Activo: ${usuario.activo ? 'Sí' : 'No'}`);
          });
        }
        db.close();
      });
    } else {
      console.log('\n⚠️  La tabla usuarios NO existe en local tampoco.');
      db.close();
    }
  });
});

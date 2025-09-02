const { exec } = require('child_process');
const { populateWithSampleReservations } = require('./populate_reservas');
const { checkRenderDatabaseStatus } = require('./check_render_status');

// Función para ejecutar comandos de git
function runGitCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Ejecutando: ${command}`);
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error ejecutando: ${command}`);
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`⚠️  Stderr: ${stderr}`);
      }
      console.log(`✅ Completado: ${command}`);
      console.log(`Output: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Función principal de despliegue
async function deployAndPopulate() {
  console.log('🚀 INICIANDO DESPLIEGUE AUTOMÁTICO A RENDER');
  console.log('============================================');
  
  try {
    // Paso 1: Verificar estado de git
    console.log('\n📋 PASO 1: Verificando estado de Git...');
    await runGitCommand('git status');
    
    // Paso 2: Agregar todos los cambios
    console.log('\n📋 PASO 2: Agregando cambios a Git...');
    await runGitCommand('git add .');
    
    // Paso 3: Hacer commit
    console.log('\n📋 PASO 3: Creando commit...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await runGitCommand(`git commit -m "Auto-deploy: Población de base de datos - ${timestamp}"`);
    
    // Paso 4: Push a main
    console.log('\n📋 PASO 4: Enviando cambios a Render...');
    await runGitCommand('git push origin main');
    
    console.log('\n✅ DESPLIEGUE COMPLETADO!');
    console.log('🔄 Render está procesando los cambios...');
    console.log('⏳ Esperando 30 segundos para que Render termine el despliegue...');
    
    // Esperar a que Render termine el despliegue
    setTimeout(async () => {
      console.log('\n🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS...');
      
      try {
        // Verificar el estado de la base de datos
        await checkRenderDatabaseStatus();
        
        console.log('\n🌱 POBLANDO BASE DE DATOS CON RESERVAS...');
        
        // Poblar con reservas de ejemplo
        await populateWithSampleReservations();
        
        console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE!');
        console.log('✅ Tu aplicación está desplegada en Render');
        console.log('✅ La base de datos tiene reservas de ejemplo');
        console.log('✅ Puedes acceder a tu aplicación web');
        
      } catch (error) {
        console.error('\n❌ Error durante la verificación/población:', error.message);
        console.log('⚠️  El despliegue se completó, pero hay problemas con la base de datos');
      }
      
    }, 30000); // 30 segundos
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE EL DESPLIEGUE:', error.message);
    console.log('🔧 Revisa los errores y vuelve a intentar');
  }
}

// Función para solo poblar la base de datos (sin despliegue)
async function onlyPopulateDatabase() {
  console.log('🌱 SOLO POBLANDO BASE DE DATOS (SIN DESPLIEGUE)');
  console.log('================================================');
  
  try {
    await populateWithSampleReservations();
    console.log('\n✅ Base de datos poblada exitosamente!');
  } catch (error) {
    console.error('\n❌ Error poblando base de datos:', error.message);
  }
}

// Función para solo verificar el estado
async function onlyCheckStatus() {
  console.log('🔍 SOLO VERIFICANDO ESTADO DE LA BASE DE DATOS');
  console.log('===============================================');
  
  try {
    await checkRenderDatabaseStatus();
  } catch (error) {
    console.error('\n❌ Error verificando estado:', error.message);
  }
}

// Manejar argumentos de línea de comandos
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'deploy':
    deployAndPopulate();
    break;
  case 'populate':
    onlyPopulateDatabase();
    break;
  case 'check':
    onlyCheckStatus();
    break;
  default:
    console.log('🚀 SCRIPT DE DESPLIEGUE Y POBLACIÓN DE BASE DE DATOS');
    console.log('=====================================================');
    console.log('');
    console.log('Uso:');
    console.log('  node deploy_and_populate.js deploy    - Desplegar y poblar BD');
    console.log('  node deploy_and_populate.js populate  - Solo poblar BD');
    console.log('  node deploy_and_populate.js check     - Solo verificar estado');
    console.log('');
    console.log('Ejecutando despliegue completo por defecto...');
    console.log('');
    deployAndPopulate();
}

module.exports = { deployAndPopulate, onlyPopulateDatabase, onlyCheckStatus };

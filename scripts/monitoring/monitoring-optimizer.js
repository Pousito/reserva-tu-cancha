/**
 * Script de Optimización de Monitoreo
 * Implementa el sistema completo de monitoreo y analytics
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando implementación del Sistema de Monitoreo y Analytics...\n');

// Función para verificar si un archivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Función para crear directorio si no existe
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Directorio creado: ${dirPath}`);
  }
}

// Función para integrar middleware en server.js
function integrateMonitoringInServer() {
  const serverPath = path.join(__dirname, '../../server.js');
  
  if (!fileExists(serverPath)) {
    console.error('❌ No se encontró server.js');
    return false;
  }

  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Verificar si ya está integrado
  if (serverContent.includes('metricsCollector')) {
    console.log('⚠️  El sistema de monitoreo ya está integrado en server.js');
    return true;
  }

  // Agregar imports
  const importsToAdd = `
// Importar sistema de monitoreo
const metricsCollector = require('./src/utils/metrics-collector');
const alertSystem = require('./src/utils/alert-system');
const monitoringRoutes = require('./src/routes/monitoring');
const {
  apiMetricsMiddleware,
  databaseMetricsMiddleware,
  authMetricsMiddleware,
  pageMetricsMiddleware,
  errorMetricsMiddleware,
  userMetricsMiddleware,
  metricsCleanupMiddleware
} = require('./src/middleware/metrics-middleware');
`;

  // Insertar imports después de los imports existentes
  const importInsertionPoint = serverContent.indexOf('const bcrypt = require(\'bcryptjs\');');
  if (importInsertionPoint !== -1) {
    const insertAfter = serverContent.indexOf('\n', importInsertionPoint);
    serverContent = serverContent.slice(0, insertAfter + 1) + importsToAdd + serverContent.slice(insertAfter + 1);
  }

  // Agregar configuración de alertas
  const alertConfigToAdd = `
// Configurar sistema de alertas
alertSystem.setupAlerts();

// Conectar eventos de métricas con alertas
metricsCollector.on('slowApiCall', (data) => {
  alertSystem.processEvent('slowApi', data);
});

metricsCollector.on('slowDatabaseQuery', (data) => {
  alertSystem.processEvent('slowDatabaseQuery', data);
});

metricsCollector.on('error', (data) => {
  alertSystem.processEvent('error', data);
});

metricsCollector.on('highMemoryUsage', (data) => {
  alertSystem.processEvent('highMemoryUsage', data);
});

metricsCollector.on('reservationMetric', (data) => {
  alertSystem.processEvent('reservation', data);
});

metricsCollector.on('paymentMetric', (data) => {
  alertSystem.processEvent('payment', data);
});
`;

  // Insertar configuración de alertas después de CORS
  const corsInsertionPoint = serverContent.indexOf('app.use(cors(corsOptions));');
  if (corsInsertionPoint !== -1) {
    const insertAfter = serverContent.indexOf('\n', corsInsertionPoint);
    serverContent = serverContent.slice(0, insertAfter + 1) + alertConfigToAdd + serverContent.slice(insertAfter + 1);
  }

  // Agregar middleware de métricas
  const middlewareToAdd = `
// Middleware de métricas
app.use(apiMetricsMiddleware);
app.use(authMetricsMiddleware);
app.use(pageMetricsMiddleware);
app.use(userMetricsMiddleware);
app.use(metricsCleanupMiddleware);

// Middleware de métricas de base de datos (se aplicará después de la conexión DB)
`;

  // Insertar middleware después de la configuración de alertas
  const middlewareInsertionPoint = serverContent.indexOf('metricsCollector.on(\'paymentMetric\', (data) => {');
  if (middlewareInsertionPoint !== -1) {
    const insertAfter = serverContent.indexOf('});', middlewareInsertionPoint) + 3;
    serverContent = serverContent.slice(0, insertAfter + 1) + middlewareToAdd + serverContent.slice(insertAfter + 1);
  }

  // Agregar rutas de monitoreo
  const routesToAdd = `
// Rutas de monitoreo
app.use('/api/monitoring', monitoringRoutes);

// Dashboard de monitoreo
app.get('/monitoring', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/monitoring-dashboard.html'));
});
`;

  // Insertar rutas antes de las rutas existentes
  const routesInsertionPoint = serverContent.indexOf('app.use(\'/api\', apiRoutes);');
  if (routesInsertionPoint !== -1) {
    serverContent = serverContent.slice(0, routesInsertionPoint) + routesToAdd + '\n' + serverContent.slice(routesInsertionPoint);
  }

  // Agregar middleware de errores de métricas
  const errorMiddlewareToAdd = `
// Middleware de errores de métricas (debe ir al final)
app.use(errorMetricsMiddleware);
`;

  // Insertar al final del archivo, antes de app.listen
  const listenInsertionPoint = serverContent.lastIndexOf('app.listen');
  if (listenInsertionPoint !== -1) {
    serverContent = serverContent.slice(0, listenInsertionPoint) + errorMiddlewareToAdd + '\n' + serverContent.slice(listenInsertionPoint);
  }

  // Aplicar middleware de base de datos después de la conexión
  const dbConnectionPoint = serverContent.indexOf('const db = new Pool({');
  if (dbConnectionPoint !== -1) {
    const insertAfter = serverContent.indexOf('});', dbConnectionPoint) + 3;
    const dbMiddlewareCode = `
// Aplicar middleware de métricas de base de datos
app.use(databaseMetricsMiddleware(db));
`;
    serverContent = serverContent.slice(0, insertAfter + 1) + dbMiddlewareCode + serverContent.slice(insertAfter + 1);
  }

  fs.writeFileSync(serverPath, serverContent);
  console.log('✅ Sistema de monitoreo integrado en server.js');
  return true;
}

// Función para actualizar package.json con scripts de monitoreo
function updatePackageJson() {
  const packagePath = path.join(__dirname, '../../package.json');
  
  if (!fileExists(packagePath)) {
    console.error('❌ No se encontró package.json');
    return false;
  }

  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Agregar scripts de monitoreo
  const monitoringScripts = {
    "monitoring:setup": "node scripts/monitoring/monitoring-optimizer.js",
    "monitoring:dashboard": "echo 'Dashboard disponible en: http://localhost:3000/monitoring'",
    "monitoring:metrics": "curl -s http://localhost:3000/api/monitoring/summary | jq",
    "monitoring:alerts": "curl -s http://localhost:3000/api/monitoring/alerts | jq",
    "monitoring:health": "curl -s http://localhost:3000/api/monitoring/health | jq",
    "monitoring:cleanup": "node scripts/monitoring/cleanup-old-metrics.js"
  };

  packageContent.scripts = { ...packageContent.scripts, ...monitoringScripts };

  fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
  console.log('✅ Scripts de monitoreo agregados a package.json');
  return true;
}

// Función para crear script de limpieza de métricas
function createCleanupScript() {
  const cleanupScriptPath = path.join(__dirname, 'cleanup-old-metrics.js');
  
  const cleanupScript = `/**
 * Script de Limpieza de Métricas Antiguas
 * Limpia métricas y alertas antiguas para mantener el rendimiento
 */

const metricsCollector = require('../../src/utils/metrics-collector');
const alertSystem = require('../../src/utils/alert-system');

console.log('🧹 Iniciando limpieza de métricas antiguas...');

try {
  // Limpiar métricas antiguas (más de 7 días)
  metricsCollector.cleanupOldMetrics();
  console.log('✅ Métricas antiguas limpiadas');

  // Limpiar alertas antiguas (más de 30 días)
  alertSystem.cleanupOldAlerts(30 * 24 * 60 * 60 * 1000);
  console.log('✅ Alertas antiguas limpiadas');

  console.log('🎉 Limpieza completada exitosamente');
} catch (error) {
  console.error('❌ Error durante la limpieza:', error);
  process.exit(1);
}
`;

  fs.writeFileSync(cleanupScriptPath, cleanupScript);
  console.log('✅ Script de limpieza creado');
}

// Función para crear archivo de configuración de monitoreo
function createMonitoringConfig() {
  const configPath = path.join(__dirname, '../../src/config/monitoring.js');
  
  const configContent = `/**
 * Configuración del Sistema de Monitoreo
 */

module.exports = {
  // Configuración de métricas
  metrics: {
    // Intervalo de recolección de métricas de sistema (ms)
    systemMetricsInterval: 30000, // 30 segundos
    
    // Intervalo de recolección de métricas de memoria (ms)
    memoryMetricsInterval: 10000, // 10 segundos
    
    // Intervalo de limpieza de métricas antiguas (ms)
    cleanupInterval: 300000, // 5 minutos
    
    // Edad máxima de métricas (ms)
    maxMetricsAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    
    // Historial máximo de memoria
    maxMemoryHistory: 100
  },

  // Configuración de alertas
  alerts: {
    // Cooldown por defecto para alertas (ms)
    defaultCooldown: 300000, // 5 minutos
    
    // Edad máxima de alertas (ms)
    maxAlertAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    
    // Máximo de alertas en historial
    maxAlertHistory: 1000
  },

  // Configuración de email
  email: {
    enabled: process.env.EMAIL_USER && process.env.EMAIL_PASS,
    service: 'gmail',
    alertRecipients: process.env.ALERT_EMAIL ? [process.env.ALERT_EMAIL] : []
  },

  // Configuración de webhook
  webhook: {
    enabled: !!process.env.WEBHOOK_URL,
    url: process.env.WEBHOOK_URL
  },

  // Umbrales de alertas
  thresholds: {
    // API lenta (ms)
    slowApiThreshold: 5000,
    
    // Query de DB lenta (ms)
    slowDatabaseThreshold: 2000,
    
    // Tasa de error alta (%)
    highErrorRateThreshold: 0.05, // 5%
    
    // Uso alto de memoria (%)
    highMemoryUsageThreshold: 0.8, // 80%
    
    // Muchas conexiones de DB
    highDatabaseConnectionsThreshold: 80
  }
};
`;

  fs.writeFileSync(configPath, configContent);
  console.log('✅ Configuración de monitoreo creada');
}

// Función para crear documentación
function createDocumentation() {
  const docPath = path.join(__dirname, '../../monitoring-documentation.md');
  
  const documentation = `# Sistema de Monitoreo y Analytics

## 📊 Descripción

Sistema completo de monitoreo en tiempo real para Reserva Tu Cancha que incluye:

- **Métricas de Rendimiento**: APIs, base de datos, memoria, CPU
- **Métricas de Negocio**: Reservas, pagos, usuarios
- **Sistema de Alertas**: Email, webhook, logs
- **Dashboard en Tiempo Real**: Visualización de métricas

## 🚀 Características

### 📈 Métricas de Rendimiento
- Tiempo de respuesta de APIs
- Rendimiento de consultas de base de datos
- Uso de memoria y CPU
- Tasa de errores
- Tiempo de carga de páginas

### 💼 Métricas de Negocio
- Reservas por complejo y hora
- Ingresos y conversión
- Métricas de pagos
- Actividad de usuarios

### 🚨 Sistema de Alertas
- Alertas por rendimiento lento
- Alertas por errores críticos
- Alertas de negocio
- Notificaciones por email/webhook

### 📊 Dashboard
- Métricas en tiempo real
- Gráficos interactivos
- Historial de alertas
- Estado del sistema

## 🛠️ Uso

### Acceder al Dashboard
\`\`\`
http://localhost:3000/monitoring
\`\`\`

### APIs de Monitoreo
\`\`\`
GET /api/monitoring/summary          # Resumen general
GET /api/monitoring/performance      # Métricas de rendimiento
GET /api/monitoring/business         # Métricas de negocio
GET /api/monitoring/system           # Métricas de sistema
GET /api/monitoring/apis             # Estadísticas de APIs
GET /api/monitoring/database         # Estadísticas de DB
GET /api/monitoring/reservations     # Estadísticas de reservas
GET /api/monitoring/payments         # Estadísticas de pagos
GET /api/monitoring/alerts           # Historial de alertas
GET /api/monitoring/health           # Health check
\`\`\`

### Scripts Disponibles
\`\`\`
npm run monitoring:setup              # Configurar sistema
npm run monitoring:dashboard          # Ver URL del dashboard
npm run monitoring:metrics            # Ver métricas resumidas
npm run monitoring:alerts             # Ver alertas recientes
npm run monitoring:health             # Health check
npm run monitoring:cleanup            # Limpiar métricas antiguas
\`\`\`

## ⚙️ Configuración

### Variables de Entorno
\`\`\`
# Email para alertas
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password

# Email de destino para alertas
ALERT_EMAIL=admin@tudominio.com

# Webhook para alertas (opcional)
WEBHOOK_URL=https://hooks.slack.com/services/...
\`\`\`

### Configuración de Alertas
Las alertas se configuran automáticamente con umbrales sensatos:

- **API lenta**: > 5 segundos
- **Query DB lenta**: > 2 segundos
- **Tasa de error alta**: > 5%
- **Uso alto de memoria**: > 80%

## 📊 Métricas Disponibles

### Rendimiento
- Tiempo de respuesta de APIs
- Rendimiento de consultas DB
- Uso de memoria/CPU
- Tasa de errores

### Negocio
- Total de reservas
- Ingresos totales
- Tasa de éxito de pagos
- Reservas por complejo/hora

### Sistema
- Tiempo activo
- Uso de memoria
- Conexiones de DB
- Requests activos

## 🚨 Tipos de Alertas

### Críticas
- Errores de servidor (5xx)
- Errores de base de datos
- Errores de pagos
- Tasa alta de fallos en pagos

### Advertencias
- APIs lentas
- Queries DB lentas
- Uso alto de memoria
- Caída en reservas

### Información
- Servidor inactivo
- Métricas de uso

## 🔧 Mantenimiento

### Limpieza Automática
- Métricas antiguas: 7 días
- Alertas antiguas: 30 días
- Historial de memoria: 100 entradas

### Limpieza Manual
\`\`\`
npm run monitoring:cleanup
\`\`\`

## 📈 Interpretación de Métricas

### Tiempo de Respuesta
- **< 100ms**: Excelente
- **100-500ms**: Bueno
- **500-1000ms**: Aceptable
- **> 1000ms**: Requiere atención

### Uso de Memoria
- **< 50%**: Normal
- **50-80%**: Monitorear
- **> 80%**: Crítico

### Tasa de Error
- **< 1%**: Excelente
- **1-5%**: Aceptable
- **> 5%**: Requiere atención

## 🎯 Mejores Prácticas

1. **Monitorear regularmente** el dashboard
2. **Configurar alertas** por email/webhook
3. **Revisar métricas** semanalmente
4. **Limpiar métricas** antiguas mensualmente
5. **Optimizar** basándose en métricas

## 🆘 Solución de Problemas

### Dashboard no carga
- Verificar que el servidor esté corriendo
- Verificar rutas de monitoreo
- Revisar logs del servidor

### Alertas no llegan
- Verificar configuración de email
- Verificar variables de entorno
- Revisar logs de alertas

### Métricas no se actualizan
- Verificar middleware de métricas
- Revisar conexión a base de datos
- Verificar logs de métricas
`;

  fs.writeFileSync(docPath, documentation);
  console.log('✅ Documentación de monitoreo creada');
}

// Función principal
async function main() {
  try {
    console.log('📁 Verificando estructura de directorios...');
    ensureDirectoryExists(path.join(__dirname, '../../src/utils'));
    ensureDirectoryExists(path.join(__dirname, '../../src/routes'));
    ensureDirectoryExists(path.join(__dirname, '../../src/middleware'));
    ensureDirectoryExists(path.join(__dirname, '../../src/config'));
    ensureDirectoryExists(path.join(__dirname, '../../public'));
    ensureDirectoryExists(path.join(__dirname));

    console.log('\n🔧 Integrando sistema de monitoreo en server.js...');
    if (!integrateMonitoringInServer()) {
      console.error('❌ Error integrando monitoreo en server.js');
      return;
    }

    console.log('\n📦 Actualizando package.json...');
    if (!updatePackageJson()) {
      console.error('❌ Error actualizando package.json');
      return;
    }

    console.log('\n🧹 Creando script de limpieza...');
    createCleanupScript();

    console.log('\n⚙️ Creando configuración de monitoreo...');
    createMonitoringConfig();

    console.log('\n📚 Creando documentación...');
    createDocumentation();

    console.log('\n🎉 ¡Sistema de Monitoreo y Analytics implementado exitosamente!');
    console.log('\n📊 Dashboard disponible en: http://localhost:3000/monitoring');
    console.log('📖 Documentación disponible en: monitoring-documentation.md');
    console.log('\n🚀 Para activar el sistema:');
    console.log('   1. Reinicia el servidor');
    console.log('   2. Visita http://localhost:3000/monitoring');
    console.log('   3. Configura variables de entorno para alertas (opcional)');

  } catch (error) {
    console.error('❌ Error durante la implementación:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main };

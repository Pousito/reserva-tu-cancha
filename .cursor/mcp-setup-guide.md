# 🔧 Guía de Configuración MCP - Reserva Tu Cancha

## 📋 MCP Servers Disponibles

### **1. 📚 Documentación (`docs-server.js`)**
**Propósito**: Búsqueda y gestión de documentación del proyecto
**Herramientas**:
- `search_docs` - Buscar en documentación
- `get_project_info` - Información del proyecto
- `get_deployment_status` - Estado de deployment

### **2. 🚀 Render Monitor (`render-monitor.js`)**
**Propósito**: Monitoreo y gestión de Render
**Herramientas**:
- `check_render_status` - Estado del servicio
- `get_render_deployments` - Historial de deployments
- `check_render_logs` - Logs del servicio
- `trigger_render_deploy` - Disparar deployment
- `check_render_metrics` - Métricas de performance
- `monitor_render_health` - Salud del servicio
- `check_render_env_vars` - Variables de entorno

### **3. 🗄️ Neon DB Manager (`neon-manager.js`)**
**Propósito**: Gestión de base de datos Neon
**Herramientas**:
- `check_neon_connection` - Verificar conexión
- `get_neon_status` - Estado de la BD
- `backup_neon_db` - Crear backup
- `check_table_sizes` - Tamaños de tablas
- `check_active_connections` - Conexiones activas
- `run_neon_query` - Ejecutar consultas SQL
- `check_neon_performance` - Performance de BD
- `monitor_neon_resources` - Recursos de BD

### **4. 🛠️ Deployment Assistant (`deployment-assistant.js`)**
**Propósito**: Asistencia en deployments
**Herramientas**:
- `pre_deploy_check` - Verificaciones pre-deploy
- `safe_deploy` - Deploy seguro
- `check_production_status` - Estado de producción
- `create_backup` - Crear backup
- `rollback_deployment` - Rollback

## 🔧 Configuración Requerida

### **Variables de Entorno Necesarias:**

#### **Para Render Monitor:**
```bash
RENDER_API_KEY=tu_api_key_de_render
RENDER_SERVICE_ID=tu_service_id_de_render
```

#### **Para Neon Manager:**
```bash
DATABASE_URL=tu_connection_string_de_neon
```

#### **Para Deployment Assistant:**
```bash
PROJECT_ROOT=/ruta/a/tu/proyecto
GIT_BRANCH=main
```

## 📦 Instalación de Dependencias

### **1. Instalar SDK de MCP:**
```bash
npm install @modelcontextprotocol/sdk
```

### **2. Instalar dependencias adicionales:**
```bash
npm install node-fetch
```

## 🚀 Cómo Usar los MCP Servers

### **1. Configurar Variables de Entorno:**
```bash
# Crear archivo .env.mcp
RENDER_API_KEY=tu_api_key_aqui
RENDER_SERVICE_ID=tu_service_id_aqui
DATABASE_URL=tu_database_url_aqui
```

### **2. Activar MCP en Cursor:**
1. Reiniciar Cursor
2. Los servers se activarán automáticamente
3. Usar herramientas desde el chat

### **3. Ejemplos de Uso:**

#### **Verificar Estado de Render:**
```
¿Puedes verificar el estado de mi servicio en Render?
```

#### **Crear Backup de Neon:**
```
¿Puedes crear un backup de mi base de datos Neon?
```

#### **Verificar Conexión a BD:**
```
¿Está funcionando mi conexión a la base de datos?
```

#### **Hacer Deploy Seguro:**
```
¿Puedes hacer un deployment seguro de mi proyecto?
```

## 🔍 Obtención de Credenciales

### **Render API Key:**
1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Ve a Account Settings
3. Genera una nueva API Key
4. Copia la key

### **Render Service ID:**
1. Ve a tu servicio en Render Dashboard
2. El ID está en la URL: `/services/[SERVICE_ID]`
3. Copia el ID

### **Neon Database URL:**
1. Ve a [Neon Dashboard](https://console.neon.tech)
2. Selecciona tu proyecto
3. Ve a Connection Details
4. Copia la Connection String

## 🛠️ Troubleshooting

### **MCP Server no responde:**
1. Verificar que las dependencias estén instaladas
2. Verificar variables de entorno
3. Reiniciar Cursor
4. Revisar logs en la consola

### **Error de conexión a Render:**
1. Verificar RENDER_API_KEY
2. Verificar RENDER_SERVICE_ID
3. Verificar permisos de la API key

### **Error de conexión a Neon:**
1. Verificar DATABASE_URL
2. Verificar que la BD esté activa
3. Verificar credenciales

## 💡 Beneficios de los MCP Servers

### **Automatización:**
- ✅ Verificaciones automáticas de estado
- ✅ Backups automáticos
- ✅ Deployments seguros
- ✅ Monitoreo continuo

### **Eficiencia:**
- ✅ Comandos desde el chat
- ✅ Información centralizada
- ✅ Respuestas contextualizadas
- ✅ Acción directa sin salir de Cursor

### **Seguridad:**
- ✅ Validaciones antes de acciones
- ✅ Logs de todas las operaciones
- ✅ Rollbacks automáticos
- ✅ Verificaciones de estado

## 🎯 Casos de Uso Comunes

### **Antes de un Deployment:**
```
1. check_render_status
2. check_neon_connection
3. backup_neon_db
4. pre_deploy_check
5. safe_deploy
```

### **Monitoreo Diario:**
```
1. check_render_status
2. get_neon_status
3. monitor_render_health
4. check_neon_performance
```

### **Troubleshooting:**
```
1. check_render_logs
2. check_neon_connection
3. check_render_metrics
4. run_neon_query (SELECT)
```

¡Con estos MCP servers tendrás control total sobre tu infraestructura directamente desde Cursor! 🚀

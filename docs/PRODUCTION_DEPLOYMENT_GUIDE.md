# 🚀 Guía de Deploy a Producción

## 📋 **RESUMEN DE PROBLEMAS ENCONTRADOS**

### **Problemas Principales:**
1. **Configuración de entorno** - Diferencias entre desarrollo y producción
2. **Migraciones de base de datos** - Tablas faltantes en producción
3. **Tipos de datos** - PostgreSQL vs JavaScript (fechas, etc.)
4. **Configuración de email** - Credenciales diferentes por entorno
5. **Servicio suspendido** - Render suspende servicios inactivos

## 🛡️ **SOLUCIONES IMPLEMENTADAS**

### **1. Configuración Automática de Entorno**
```javascript
// src/config/environment.js
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
} else {
  require('dotenv').config({ path: './env.postgresql' });
}
```

### **2. Sistema de Migraciones**
```bash
# Ejecutar migraciones automáticamente
npm run migrate
```

### **3. Tests Pre-Deploy**
```bash
# Verificar que todo esté listo
npm run test-pre-deploy
```

### **4. Deploy Seguro**
```bash
# Deploy con verificaciones automáticas
npm run deploy-safe
```

## 🔧 **CONFIGURACIÓN REQUERIDA**

### **Variables de Entorno en Render:**
```yaml
NODE_ENV: production
DATABASE_URL: [Auto-generado por Render]
JWT_SECRET: [Generado automáticamente]
SMTP_HOST: smtp.zoho.com
SMTP_PORT: 587
SMTP_USER: soporte@reservatuscanchas.cl
SMTP_PASS: [Contraseña de aplicación]
```

### **Archivos de Configuración:**
- `render.yaml` - Configuración de Render
- `env.postgresql` - Variables de desarrollo
- `src/config/environment.js` - Gestión automática de entorno

## 📁 **ESTRUCTURA DE ARCHIVOS**

```
├── src/
│   └── config/
│       └── environment.js          # Configuración de entorno
├── scripts/
│   ├── migration/
│   │   ├── migration-manager.js    # Gestor de migraciones
│   │   └── migrations/             # Archivos de migración
│   └── testing/
│       └── pre-deploy-tests.js     # Tests pre-deploy
├── DEPLOY_CHECKLIST.md             # Checklist de deploy
└── docs/
    └── PRODUCTION_DEPLOYMENT_GUIDE.md
```

## 🚀 **PROCESO DE DEPLOY RECOMENDADO**

### **1. Preparación**
```bash
# Verificar que todo esté listo
npm run test-pre-deploy

# Si hay migraciones pendientes
npm run migrate
```

### **2. Deploy**
```bash
# Opción 1: Deploy seguro (recomendado)
npm run deploy-safe

# Opción 2: Deploy manual
git add .
git commit -m "feat: Descripción del cambio"
git push origin main
```

### **3. Verificación Post-Deploy**
```bash
# Verificar que el servicio esté activo
curl https://www.reservatuscanchas.cl/health

# Verificar funcionalidades principales
# - Login
# - Dashboard
# - Gráficos
# - Emails
```

## 🆘 **SOLUCIÓN DE PROBLEMAS**

### **Servicio Suspendido**
```bash
# Forzar redeploy
git commit --allow-empty -m "chore: Reactivar servicio"
git push origin main
```

### **Error de Base de Datos**
```bash
# Ejecutar migraciones manualmente
NODE_ENV=production npm run migrate
```

### **Error de Configuración**
1. Verificar variables en Render Dashboard
2. Actualizar `render.yaml`
3. Hacer redeploy

## 📝 **MEJORES PRÁCTICAS**

### **Antes de Cada Deploy:**
- ✅ Ejecutar tests pre-deploy
- ✅ Verificar migraciones
- ✅ Revisar configuración
- ✅ Probar localmente

### **Durante el Deploy:**
- ✅ Usar commits descriptivos
- ✅ Verificar que el servicio esté activo
- ✅ Probar funcionalidades principales

### **Después del Deploy:**
- ✅ Verificar logs de Render
- ✅ Probar funcionalidades críticas
- ✅ Monitorear por 24 horas

## 🔍 **MONITOREO**

### **Health Checks:**
- `GET /health` - Estado del servicio
- `GET /api/debug/admin-users` - Usuarios admin (temporal)

### **Logs Importantes:**
- Conexión a base de datos
- Configuración de email
- Errores de autenticación
- Errores de migración

## 📞 **CONTACTO DE SOPORTE**

En caso de problemas críticos:
1. Revisar logs de Render
2. Verificar configuración
3. Ejecutar tests de diagnóstico
4. Contactar soporte técnico

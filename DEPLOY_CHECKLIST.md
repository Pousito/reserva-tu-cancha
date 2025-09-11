# 📋 Checklist de Pre-Deploy

## ✅ **ANTES DE CADA DEPLOY**

### **🔧 Configuración**
- [ ] Variables de entorno configuradas en `render.yaml`
- [ ] Configuración de email actualizada
- [ ] Base de datos configurada correctamente
- [ ] URLs de frontend configuradas

### **🗄️ Base de Datos**
- [ ] Migraciones ejecutadas: `node scripts/migration/migration-manager.js`
- [ ] Tablas requeridas existen
- [ ] Datos de prueba eliminados (si es necesario)
- [ ] Índices creados para rendimiento

### **🧪 Testing**
- [ ] Tests pre-deploy ejecutados: `node scripts/testing/pre-deploy-tests.js`
- [ ] Funcionalidades principales probadas localmente
- [ ] Autenticación funcionando
- [ ] Emails funcionando
- [ ] Gráficos y reportes funcionando

### **📁 Archivos**
- [ ] Todos los archivos necesarios incluidos
- [ ] Archivos de configuración actualizados
- [ ] Scripts de migración incluidos
- [ ] Documentación actualizada

### **🔍 Verificación Final**
- [ ] Código revisado y sin errores
- [ ] Dependencias actualizadas
- [ ] Logs de error manejados correctamente
- [ ] Manejo de tipos de datos robusto

## 🚀 **PROCESO DE DEPLOY**

### **1. Preparación**
```bash
# Ejecutar tests pre-deploy
node scripts/testing/pre-deploy-tests.js

# Si hay migraciones pendientes
node scripts/migration/migration-manager.js
```

### **2. Commit y Push**
```bash
git add .
git commit -m "feat: Descripción del cambio"
git push origin main
```

### **3. Verificación Post-Deploy**
- [ ] Servicio activo en Render
- [ ] Health check: `curl https://www.reservatuscanchas.cl/health`
- [ ] Login funcionando
- [ ] Dashboard cargando correctamente
- [ ] Gráficos funcionando
- [ ] Emails enviándose

## 🆘 **EN CASO DE PROBLEMAS**

### **Servicio Suspendido**
```bash
# Forzar redeploy
git commit --allow-empty -m "chore: Reactivar servicio suspendido"
git push origin main
```

### **Error de Base de Datos**
```bash
# Ejecutar migraciones manualmente
NODE_ENV=production node scripts/migration/migration-manager.js
```

### **Error de Configuración**
1. Verificar variables en Render Dashboard
2. Actualizar `render.yaml` si es necesario
3. Hacer redeploy

### **Error de Email**
1. Verificar credenciales en Zoho
2. Actualizar contraseñas de aplicación
3. Verificar configuración SMTP

## 📝 **NOTAS IMPORTANTES**

- **Nunca hacer deploy sin ejecutar tests pre-deploy**
- **Siempre verificar que las migraciones se ejecuten**
- **Mantener backup de la base de datos antes de cambios importantes**
- **Documentar todos los cambios en el commit**
- **Verificar que el servicio esté activo después del deploy**

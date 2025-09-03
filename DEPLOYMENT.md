# 🚀 Guía de Despliegue - Reserva Tu Cancha

## 📋 Requisitos Previos

- ✅ Cuenta en [GitHub](https://github.com)
- ✅ Cuenta en [Render](https://render.com)
- ✅ Proyecto subido a GitHub

## 🌐 Despliegue en Render

### **Paso 1: Preparar el Repositorio**

1. **Subir código a GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Sistema de reservas"
   git branch -M main
   git remote add origin https://github.com/Pousito/reserva-tu-cancha.git
   git push -u origin main
   ```

### **Paso 2: Crear Servicio en Render**

1. **Ir a [Render Dashboard](https://dashboard.render.com)**
2. **Click en "New +" → "Web Service"**
3. **Conectar con GitHub:**
   - Seleccionar tu repositorio
   - Render detectará automáticamente que es Node.js

### **Paso 3: Configuración del Servicio**

- **Name:** `reserva-tu-cancha`
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** `Free` (para empezar)

### **Paso 4: Variables de Entorno**

Configurar en Render Dashboard:

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=tu_secret_super_seguro_aqui
CORS_ORIGIN=https://reserva-tu-cancha.onrender.com
```

### **Paso 5: Desplegar**

1. **Click en "Create Web Service"**
2. **Esperar que termine el build** (5-10 minutos)
3. **Tu app estará disponible en:** `https://reserva-tu-cancha.onrender.com`

## 🔒 Configuración de Seguridad

### **Variables de Entorno Requeridas:**

- `JWT_SECRET`: Secret único para tokens JWT
- `NODE_ENV`: Entorno de producción
- `CORS_ORIGIN`: URL permitida para CORS

### **Características de Seguridad Implementadas:**

- ✅ **Rate Limiting** para prevenir ataques
- ✅ **Helmet** para headers de seguridad
- ✅ **Validación de datos** robusta
- ✅ **Logs de seguridad** automáticos
- ✅ **CORS configurado** correctamente

## 📱 Acceso para Socios

### **URLs de Acceso:**

- **🌐 Aplicación principal:** `https://reserva-tu-cancha.onrender.com`
- **📊 Panel admin:** `https://reserva-tu-cancha.onrender.com/admin-login.html`
- **📈 Reportes:** `https://reserva-tu-cancha.onrender.com/reports.html`

### **Credenciales de Prueba:**

- **Super Admin:** `admin@reservatucancha.com` / `admin123`
- **Dueño Complejo:** `dueno@complejo.com` / `dueno123`

## 🔄 Despliegue Continuo

### **Configuración Automática:**

- ✅ **Auto-deploy** en cada push a `main`
- ✅ **Health checks** automáticos
- ✅ **Logs en tiempo real** disponibles
- ✅ **Rollback** automático si falla el build

### **Monitoreo:**

- **Status:** Disponible en dashboard de Render
- **Logs:** Accesibles desde el dashboard
- **Métricas:** Uptime y performance automáticos

## 🛠️ Solución de Problemas

### **Build Fails:**

1. **Verificar logs** en Render Dashboard
2. **Revisar dependencias** en package.json
3. **Verificar sintaxis** del código

### **App No Responde:**

1. **Verificar health check:** `/health`
2. **Revisar variables de entorno**
3. **Verificar logs** de la aplicación

### **Problemas de Base de Datos:**

1. **Verificar conexión** a SQLite
2. **Revisar permisos** de archivos
3. **Verificar logs** de base de datos

## 📞 Soporte

### **Recursos:**

- **Render Docs:** [docs.render.com](https://docs.render.com)
- **GitHub Issues:** Para problemas del código
- **Render Support:** Desde el dashboard

### **Contacto:**

- **Desarrollador:** Tu información de contacto
- **Proyecto:** Reserva Tu Cancha v1.0.0

---

## 🎯 Próximos Pasos

1. **Desplegar en Render** (este documento)
2. **Configurar dominio personalizado** (opcional)
3. **Configurar SSL** (automático en Render)
4. **Monitorear performance** y logs
5. **Escalar según necesidad**

---

**¡Tu aplicación estará disponible globalmente para que todos tus socios puedan probarla!** 🌍✨

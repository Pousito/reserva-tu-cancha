# 🌐 Gestión de URLs - Reserva Tu Cancha

## 📋 Resumen

Este documento explica cómo gestionar y actualizar las URLs del sistema de reservas de canchas deportivas.

## 🔧 Configuración Centralizada

### **Archivos de Configuración:**

1. **Backend:** `config/urls.js` - Configuración para el servidor
2. **Frontend:** `public/js/url-config.js` - Configuración para el navegador

### **URLs Actuales:**

- **Desarrollo:** `http://localhost:3000`
- **Producción:** `https://www.reservatuscanchas.cl`

## 🚀 Cómo Actualizar URLs

### **Para Cambiar la URL de Producción:**

1. **Actualizar configuración del backend:**
   ```javascript
   // En config/urls.js
   production: {
     base: 'https://nueva-url.com',
     api: 'https://nueva-url.com/api',
     payment: 'https://nueva-url.com/payment.html',
     success: 'https://nueva-url.com/?payment=success'
   }
   ```

2. **Actualizar configuración del frontend:**
   ```javascript
   // En public/js/url-config.js
   production: {
     base: 'https://nueva-url.com',
     api: 'https://nueva-url.com/api',
     payment: 'https://nueva-url.com/payment.html',
     success: 'https://nueva-url.com/?payment=success',
     admin: 'https://nueva-url.com/admin-login.html',
     reports: 'https://nueva-url.com/admin-reports.html'
   }
   ```

3. **Actualizar archivos de configuración:**
   - `env.example` - Variables de entorno
   - `scripts/setup-transbank.js` - URLs de Transbank
   - `DEPLOYMENT.md` - Documentación

4. **Actualizar variables de entorno en producción:**
   ```env
   CORS_ORIGIN=https://nueva-url.com
   TRANSBANK_RETURN_URL=https://nueva-url.com/payment.html
   TRANSBANK_FINAL_URL=https://nueva-url.com/?payment=success
   ```

## 📁 Archivos que Contienen URLs

### **Archivos Principales:**
- `config/urls.js` - Configuración centralizada del backend
- `public/js/url-config.js` - Configuración centralizada del frontend
- `public/script.js` - Script principal (usa configuración centralizada)
- `public/js/admin-utils.js` - Utilidades de administración
- `public/admin-login.js` - Login de administración

### **Archivos de Configuración:**
- `env.example` - Variables de entorno de ejemplo
- `scripts/setup-transbank.js` - Configuración de Transbank
- `DEPLOYMENT.md` - Documentación de despliegue

### **Archivos HTML:**
- `public/index.html` - Página principal
- `public/payment.html` - Página de pago
- `public/admin-*.html` - Páginas de administración

## 🔄 Proceso de Actualización

### **1. Cambio de Dominio:**
```bash
# 1. Actualizar archivos de configuración
# 2. Actualizar variables de entorno en producción
# 3. Hacer commit y push
git add .
git commit -m "🌐 Update: Cambiar URL de producción a nueva-url.com"
git push origin main

# 4. Verificar que el deploy automático funcione
# 5. Probar todas las funcionalidades
```

### **2. Cambio de Subdominio:**
```bash
# Solo actualizar la parte del subdominio en los archivos de configuración
# El resto del proceso es igual
```

## 🧪 Verificación

### **Después de Actualizar URLs:**

1. **Verificar desarrollo local:**
   - Abrir `http://localhost:3000`
   - Probar reservas, pagos, administración

2. **Verificar producción:**
   - Abrir `https://www.reservatuscanchas.cl`
   - Probar todas las funcionalidades
   - Verificar emails
   - Probar panel de administración

3. **Verificar Transbank:**
   - Probar flujo de pago completo
   - Verificar URLs de retorno

## 📝 Notas Importantes

- **Cache del navegador:** Después de cambios, limpiar cache del navegador
- **Variables de entorno:** Asegurarse de actualizar en Render/Heroku
- **DNS:** Verificar que el nuevo dominio apunte correctamente
- **SSL:** Asegurarse de que el certificado SSL esté configurado

## 🆘 Solución de Problemas

### **URLs no actualizadas:**
- Verificar que todos los archivos HTML incluyan `url-config.js`
- Verificar que el cache del navegador esté limpio
- Verificar que las variables de entorno estén actualizadas

### **Errores de CORS:**
- Verificar `CORS_ORIGIN` en variables de entorno
- Verificar que la URL coincida exactamente

### **Errores de Transbank:**
- Verificar `TRANSBANK_RETURN_URL` y `TRANSBANK_FINAL_URL`
- Verificar que las URLs sean HTTPS en producción

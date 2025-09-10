# 📧 Guía Completa de Configuración de Zoho - Reserva Tu Cancha

## 🎯 Configuración Paso a Paso

### **Paso 1: Acceder a Zoho Mail**

1. **Abrir navegador** y ir a: https://mail.zoho.com
2. **Iniciar sesión** con:
   - **Email**: `reservas@reservatuscanchas.cl`
   - **Contraseña**: [Tu contraseña actual de Zoho]

### **Paso 2: Generar Contraseña de Aplicación**

1. **Ir a Configuración**:
   - Hacer clic en el ícono de configuración (⚙️) en la esquina superior derecha
   - Seleccionar **"Configuración"**

2. **Navegar a Seguridad**:
   - En el menú lateral, buscar **"Seguridad"**
   - Hacer clic en **"Seguridad"**

3. **Generar Contraseña de Aplicación**:
   - Buscar la sección **"Contraseñas de Aplicación"**
   - Hacer clic en **"Generar Nueva Contraseña"**
   - **Nombre de la aplicación**: `Reserva Tu Cancha`
   - Hacer clic en **"Generar"**
   - **IMPORTANTE**: Copiar la contraseña generada (se muestra solo una vez)

### **Paso 3: Configurar Variables de Entorno**

1. **Abrir el archivo `.env`** en el proyecto
2. **Reemplazar la línea**:
   ```bash
   SMTP_PASS=TU_CONTRASEÑA_DE_APLICACION_ZOHO_AQUI
   ```
   Con:
   ```bash
   SMTP_PASS=tu_contraseña_generada_aqui
   ```

### **Paso 4: Reiniciar el Servidor**

```bash
# Detener el servidor actual
lsof -ti:3000 | xargs kill -9

# Reiniciar el servidor
npm start
```

### **Paso 5: Probar el Sistema**

1. **Hacer una reserva de prueba** en la aplicación
2. **Verificar logs** del servidor para confirmar envío
3. **Revisar bandeja de entrada** de los emails configurados

## 📋 Checklist de Verificación

### **✅ Configuración SMTP**
- [ ] Contraseña de aplicación generada en Zoho
- [ ] Variables de entorno configuradas en `.env`
- [ ] Servidor reiniciado

### **✅ Pruebas de Envío**
- [ ] Email de confirmación al cliente
- [ ] Notificación al admin del complejo
- [ ] Notificación al super admin

### **✅ Verificación de Destinatarios**
- [ ] Cliente recibe confirmación
- [ ] `naxiin320@gmail.com` recibe notificación (MagnaSports)
- [ ] `admin@reservatuscanchas.cl` recibe notificación (Super Admin)

## 🔧 Configuración de Producción (Render)

### **Variables de Entorno en Render:**

1. **Ir al dashboard de Render**
2. **Seleccionar tu servicio**
3. **Ir a "Environment"**
4. **Agregar las siguientes variables**:

```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=reservas@reservatuscanchas.cl
SMTP_PASS=tu_contraseña_de_aplicacion_zoho
```

5. **Redeploy** el servicio

## 🚨 Troubleshooting

### **Error: "Authentication failed"**
- Verificar que la contraseña de aplicación sea correcta
- Asegurarse de que la contraseña no tenga espacios extra
- Verificar que el usuario SMTP tenga permisos

### **Error: "Connection timeout"**
- Verificar que el puerto 587 esté abierto
- Comprobar configuración de firewall
- Verificar conectividad a smtp.zoho.com

### **Emails van a spam**
- Configurar SPF en Zoho
- Configurar DKIM en Zoho
- Usar plantillas HTML profesionales
- Evitar palabras spam en asunto

### **Error: "Invalid credentials"**
- Regenerar contraseña de aplicación
- Verificar que el email SMTP_USER sea correcto
- Comprobar que la cuenta no esté bloqueada

## 📊 Flujo de Emails Configurado

### **Email 1: Confirmación al Cliente**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: Email del cliente
- **Asunto**: `✅ Confirmación de Reserva - [CÓDIGO]`

### **Email 2: Notificación al Admin del Complejo**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: 
  - MagnaSports → `naxiin320@gmail.com`
  - Otros complejos → `naxiin_320@hotmail.com`
- **Asunto**: `🔔 Nueva Reserva en [COMPLEJO] - [CÓDIGO]`

### **Email 3: Notificación al Super Admin**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: `admin@reservatuscanchas.cl`
- **Asunto**: `📊 Nueva Reserva - [CÓDIGO]`

## 🔍 Verificación de Logs

### **Logs Exitosos:**
```
✅ Email de confirmación enviado al cliente: [messageId]
✅ Notificación enviada al admin del complejo: [messageId]
✅ Notificación enviada al super admin: [messageId]
```

### **Logs de Error:**
```
❌ Error enviando email de confirmación: [error]
❌ Error enviando notificación al admin: [error]
```

## 📞 Soporte

Si tienes problemas con la configuración:

1. **Revisar logs del servidor**
2. **Verificar configuración SMTP**
3. **Probar con datos de prueba**
4. **Contactar soporte de Zoho** si es necesario

## 🎉 ¡Listo para Producción!

Una vez configurado correctamente, el sistema enviará emails reales automáticamente después de cada reserva, notificando a todos los stakeholders relevantes.

# 📧 Configuración de Emails con Zoho - Reserva Tu Cancha

## 🎯 Flujo Profesional de Emails Implementado

### **📋 Destinatarios de Emails:**

#### **📧 Email 1: Confirmación al Cliente**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: Email del cliente que hizo la reserva
- **Propósito**: Confirmar reserva con código y detalles
- **Contenido**: Código de reserva, detalles, instrucciones

#### **📧 Email 2: Notificación al Administrador del Complejo**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: Email del admin del complejo específico
  - MagnaSports → `admin@magnasports.cl`
  - Complejo Deportivo Central → `admin@complejocentral.cl`
  - Otros complejos → `admin@complejocentral.cl`
- **Propósito**: Notificar nueva reserva en su complejo
- **Contenido**: Detalles de reserva, acciones recomendadas

#### **📧 Email 3: Notificación al Super Admin (Dueño)**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: `admin@reservatucancha.com`
- **Propósito**: Control y seguimiento general
- **Contenido**: Métricas, control de comisiones, seguimiento

## 🔧 Configuración de Zoho

### **Paso 1: Configurar Credenciales SMTP**

1. **Acceder a Zoho Mail**:
   - Ir a: https://mail.zoho.com
   - Iniciar sesión con `reservas@reservatuscanchas.cl`

2. **Configurar Contraseña de Aplicación**:
   - Ir a: Configuración → Seguridad → Contraseñas de Aplicación
   - Generar nueva contraseña para "Reserva Tu Cancha"
   - Copiar la contraseña generada

3. **Actualizar archivo `.env`**:
```bash
# Email Configuration - Zoho
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=reservas@reservatuscanchas.cl
SMTP_PASS=tu_contraseña_de_aplicacion_generada
```

### **Paso 2: Verificar Configuración**

1. **Reiniciar el servidor**:
```bash
npm start
```

2. **Probar el sistema**:
```bash
curl -X POST http://localhost:3000/api/send-confirmation-email \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_reserva": "TEST123456789",
    "email_cliente": "test@ejemplo.com",
    "nombre_cliente": "Usuario de Prueba",
    "complejo": "MagnaSports",
    "cancha": "Cancha Techada 1",
    "fecha": "2025-09-15",
    "hora_inicio": "18:00",
    "hora_fin": "19:00",
    "precio_total": 28000
  }'
```

### **Paso 3: Configuración en Producción (Render)**

1. **Agregar variables de entorno en Render**:
   - `SMTP_HOST=smtp.zoho.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=reservas@reservatuscanchas.cl`
   - `SMTP_PASS=tu_contraseña_de_aplicacion`

2. **Redeploy automático**:
   - El sistema se actualizará automáticamente

## 📊 Flujo de Emails en Acción

### **Cuando un cliente hace una reserva:**

1. **Cliente completa formulario** → Presiona "CONFIRMAR Y PAGAR"
2. **Sistema procesa pago** → Simulado con WebPay
3. **Se crea reserva** → Estado "confirmada" en BD
4. **Se envían 3 emails automáticamente**:
   - ✅ Confirmación al cliente
   - 🔔 Notificación al admin del complejo
   - 📊 Notificación al super admin

### **Logs del Sistema:**
```
📧 Enviando emails de confirmación para reserva: RES123456789
📧 Email no configurado - simulando envío de confirmación al cliente
📧 Email no configurado - simulando notificaciones a administradores
✅ Emails de confirmación procesados: {
  cliente: true,
  admin_complejo: true,
  super_admin: true,
  codigo: 'RES123456789'
}
```

## 🚀 Beneficios del Sistema Implementado

### **✅ Profesionalismo:**
- Emails desde dominio corporativo (`reservas@reservatuscanchas.cl`)
- Plantillas HTML profesionales
- Comunicación estructurada

### **✅ Automatización:**
- Envío automático después del pago
- Notificaciones a todos los stakeholders
- No requiere intervención manual

### **✅ Escalabilidad:**
- Fácil agregar nuevos complejos
- Sistema de roles bien definido
- Configuración centralizada

### **✅ Control:**
- Super admin recibe todas las notificaciones
- Administradores de complejos reciben solo sus reservas
- Clientes reciben confirmación inmediata

## 🔍 Troubleshooting

### **Problema: Emails no se envían**
- Verificar credenciales SMTP en `.env`
- Comprobar contraseña de aplicación de Zoho
- Revisar logs del servidor

### **Problema: Emails van a spam**
- Configurar SPF, DKIM en Zoho
- Usar plantillas HTML profesionales
- Evitar palabras spam en asunto

### **Problema: Error de autenticación**
- Verificar que la contraseña de aplicación sea correcta
- Comprobar que el usuario SMTP tenga permisos
- Revisar configuración de puerto (587 para TLS)

## 📞 Soporte

Para problemas con la configuración de emails:
1. Revisar logs del servidor
2. Verificar configuración SMTP
3. Probar con datos de prueba
4. Contactar soporte de Zoho si es necesario

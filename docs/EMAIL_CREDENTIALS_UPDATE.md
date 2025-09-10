# 📧 Actualización de Credenciales de Email - Reserva Tu Cancha

## 🎯 Cambios Realizados

### **📋 Nuevas Credenciales de Administradores:**

#### **👑 Super Administrador (Dueño de la Plataforma)**
- **Email**: `admin@reservatuscanchas.cl`
- **Rol**: `super_admin`
- **Función**: Control general de la plataforma

#### **🏢 Administrador de MagnaSports**
- **Email**: `naxiin320@gmail.com`
- **Rol**: `admin`
- **Función**: Administración del complejo MagnaSports

#### **👨‍💼 Dueño de MagnaSports**
- **Email**: `naxiin_320@hotmail.com`
- **Rol**: `admin`
- **Función**: Dueño del complejo MagnaSports

### **📧 Flujo de Emails Actualizado:**

#### **Email 1: Confirmación al Cliente**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: Email del cliente que hizo la reserva
- **Contenido**: Código de reserva, detalles, instrucciones

#### **Email 2: Notificación al Administrador del Complejo**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: 
  - MagnaSports → `naxiin320@gmail.com`
  - Otros complejos → `naxiin_320@hotmail.com`
- **Contenido**: Detalles de reserva, acciones recomendadas

#### **Email 3: Notificación al Super Admin**
- **De**: `reservas@reservatuscanchas.cl`
- **Para**: `admin@reservatuscanchas.cl`
- **Contenido**: Control general, métricas, seguimiento

## 🔧 Archivos Modificados

### **1. Base de Datos (`database.sqlite`)**
```sql
-- Usuarios actualizados
UPDATE usuarios SET email = 'naxiin320@gmail.com' WHERE email = 'admin@magnasports.cl';
UPDATE usuarios SET email = 'admin@reservatuscanchas.cl' WHERE email = 'admin@reservatucancha.com';
UPDATE usuarios SET email = 'naxiin_320@hotmail.com' WHERE email = 'admin@complejocentral.cl';
```

### **2. Servicio de Emails (`src/services/emailService.js`)**
```javascript
// Mapeo de emails actualizado
const adminEmails = {
  'MagnaSports': 'naxiin320@gmail.com',
  'Complejo Deportivo Central': 'naxiin_320@hotmail.com',
  'Padel Club Premium': 'naxiin_320@hotmail.com',
  'Centro Deportivo Costero': 'naxiin_320@hotmail.com',
  'Club Deportivo Norte': 'naxiin_320@hotmail.com'
};

// Super admin actualizado
to: 'admin@reservatuscanchas.cl'
```

### **3. Servidor (`server.js`)**
```javascript
// Usuarios administradores actualizados
const usuariosData = [
  { email: 'admin@reservatuscanchas.cl', password: 'admin123', nombre: 'Super Administrador', rol: 'super_admin' },
  { email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Administrador MagnaSports', rol: 'admin' },
  { email: 'naxiin_320@hotmail.com', password: 'complejo2024', nombre: 'Dueño MagnaSports', rol: 'admin' }
];
```

## ✅ Verificación del Sistema

### **Pruebas Realizadas:**
1. ✅ **Reserva en MagnaSports** → Notificación a `naxiin320@gmail.com`
2. ✅ **Reserva en Complejo Central** → Notificación a `naxiin_320@hotmail.com`
3. ✅ **Todas las reservas** → Notificación a `admin@reservatuscanchas.cl`
4. ✅ **Confirmación al cliente** → Desde `reservas@reservatuscanchas.cl`

### **Estado Actual:**
- ✅ Base de datos actualizada
- ✅ Servicio de emails configurado
- ✅ Servidor actualizado
- ✅ Sistema funcionando correctamente
- ✅ Modo simulación activo (perfecto para desarrollo)

## 🚀 Próximos Pasos

### **Para Producción:**
1. **Configurar credenciales SMTP de Zoho**:
   ```bash
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=587
   SMTP_USER=reservas@reservatuscanchas.cl
   SMTP_PASS=tu_contraseña_de_aplicacion_zoho
   ```

2. **Probar envío real de emails**:
   - Verificar que lleguen a los emails correctos
   - Confirmar que no vayan a spam
   - Revisar formato de emails

3. **Configurar SPF/DKIM en Zoho**:
   - Para evitar que emails vayan a spam
   - Mejorar deliverabilidad

## 📊 Resumen de Cambios

| Componente | Antes | Después |
|------------|-------|---------|
| Super Admin | `admin@reservatucancha.com` | `admin@reservatuscanchas.cl` |
| Admin MagnaSports | `admin@magnasports.cl` | `naxiin320@gmail.com` |
| Dueño MagnaSports | `admin@complejocentral.cl` | `naxiin_320@hotmail.com` |
| Email Corporativo | - | `reservas@reservatuscanchas.cl` |

## 🔍 Troubleshooting

### **Si los emails no llegan:**
1. Verificar credenciales SMTP en `.env`
2. Comprobar contraseña de aplicación de Zoho
3. Revisar logs del servidor
4. Verificar configuración de SPF/DKIM

### **Si hay errores de autenticación:**
1. Verificar que la contraseña de aplicación sea correcta
2. Comprobar que el usuario SMTP tenga permisos
3. Revisar configuración de puerto (587 para TLS)

## 📞 Contacto

Para problemas con la configuración de emails:
- Revisar logs del servidor
- Verificar configuración SMTP
- Probar con datos de prueba
- Contactar soporte de Zoho si es necesario

# 🔧 Problemas y Soluciones - Sesión de Desarrollo

## 📅 Fecha: 2025-01-30

---

## 🚨 **PROBLEMAS ENCONTRADOS Y SOLUCIONADOS:**

### **1. PROBLEMA DE LOGIN - Redirección Incorrecta**
**🔍 Problema:** 
- Login exitoso pero redirección de vuelta al login
- Error: "Bienvenido al panel de administración" seguido de redirección

**🔧 Causa:** 
- Ruta incorrecta en `admin-login.js`
- Redirigía a `admin-dashboard.html` en lugar de `pages/admin/admin-dashboard.html`

**✅ Solución:**
```javascript
// ANTES (incorrecto)
window.location.href = 'admin-dashboard.html';

// DESPUÉS (correcto)
window.location.href = 'pages/admin/admin-dashboard.html';
```

**📁 Archivos Modificados:**
- `public/admin-login.js` (líneas 10 y 55)

---

### **2. PROBLEMA DE SCRIPTS - Errores 404**
**🔍 Problema:**
```
[Error] Failed to load resource: 404 (Not Found) (url-config.js, line 0)
[Error] Failed to load resource: 404 (Not Found) (admin-utils.js, line 0)
[Error] Failed to load resource: 404 (Not Found) (admin-dashboard.js, line 0)
```

**🔧 Causa:**
- Rutas incorrectas en páginas de admin
- Desde `pages/admin/` necesitaba `../../js/` no `../js/`

**✅ Solución:**
```html
<!-- ANTES (incorrecto) -->
<script src="../js/url-config.js"></script>
<script src="../js/admin-utils.js"></script>
<script src="admin-dashboard.js?v=1.5"></script>

<!-- DESPUÉS (correcto) -->
<script src="../../js/url-config.js"></script>
<script src="../../js/admin-utils.js"></script>
<script src="../../admin-dashboard.js?v=1.6"></script>
```

**📁 Archivos Modificados:**
- `public/pages/admin/admin-dashboard.html`
- `public/pages/admin/admin-reports.html`
- `public/pages/admin/admin-reservations.html`
- `public/pages/admin/admin-courts.html`
- `public/pages/admin/admin-complexes.html`

---

### **3. PROBLEMA DE PERMISOS - Admin Veía Reportes**
**🔍 Problema:**
- Usuario con rol `admin` podía ver sección de reportes
- Según configuración, `admin` no debería ver reportes

**🔧 Causa:**
- Falta de lógica para rol `admin` en `aplicarPermisosPorRol()`
- Solo había lógica para `manager`, `owner` y `super_admin`

**✅ Solución:**
```javascript
} else if (userRole === 'manager') {
    // Managers no pueden ver reportes ni información financiera
    console.log('🔐 Aplicando permisos para manager - ocultando reportes');
    
    // Ocultar enlaces de reportes
    const reportElements = document.querySelectorAll('a[href="admin-reports.html"]');
    reportElements.forEach((element, index) => {
        element.style.display = 'none';
    });
    
    // Ocultar elementos con clase hide-for-manager
    const managerElements = document.querySelectorAll('.hide-for-manager');
    managerElements.forEach(element => {
        element.style.display = 'none';
    });
}
```

**📁 Archivos Modificados:**
- `public/admin-dashboard.js` (función `aplicarPermisosPorRol`)

---

### **4. PROBLEMA DE CONSISTENCIA - Rol Admin vs Manager**
**🔍 Problema:**
- Inconsistencia entre rol `admin` y `manager`
- Mezcla de terminología en el código

**🔧 Causa:**
- Uso inconsistente de roles en diferentes partes del sistema

**✅ Solución:**
- Cambiar rol `admin` a `manager` para mantener consistencia
- Actualizar base de datos y código

**📁 Archivos Modificados:**
- `server.js` (usuariosData)
- `public/admin-dashboard.js` (lógica de permisos)
- `.cursor/notepads/configuracion-permisos-complejos.md`

---

### **5. PROBLEMA DE CONTRASEÑAS - Inconsistencia de Bcrypt**
**🔍 Problema:**
- Usuarios no podían hacer login con contraseñas correctas
- Error: "Contraseña incorrecta"

**🔧 Causa:**
- Inconsistencia entre librerías `bcrypt` y `bcryptjs`
- Algunas funciones usaban `bcrypt`, otras `bcryptjs`

**✅ Solución:**
```javascript
// Unificar uso de bcryptjs
const bcrypt = require('bcryptjs');

// Endpoint para arreglar contraseñas
app.post('/api/debug/fix-passwords', async (req, res) => {
    // Hashear todas las contraseñas correctamente
});
```

**📁 Archivos Modificados:**
- `server.js` (imports y función de login)

---

### **6. PROBLEMA DE ROLES - Redirección Infinita al Login**
**🔍 Problema:**
- Login exitoso pero redirección inmediata al login
- Error: "Rol no válido para esta operación"
- Loop infinito de redirección

**🔧 Causa:**
- Usuario tenía rol `admin` en la base de datos
- Endpoints de admin solo permiten roles `['super_admin', 'owner', 'manager']`
- `authenticatedFetch()` detecta error 401/403 y redirige automáticamente

**✅ Solución:**
```javascript
// 1. Crear endpoint para actualizar roles
app.post('/api/debug/fix-roles', async (req, res) => {
    const roleUpdates = [
        { email: 'naxiin_320@hotmail.com', rol: 'manager' }
    ];
    // Actualizar roles en la base de datos
});

// 2. Ejecutar actualización
curl -X POST http://localhost:3000/api/debug/fix-roles

// 3. Verificar que funciona
curl -H "Authorization: Bearer TOKEN" /api/admin/estadisticas
```

**📁 Archivos Modificados:**
- `server.js` (endpoint fix-roles)
- Base de datos (actualización de rol de usuario)

**🔍 Diagnóstico:**
```bash
# Verificar rol del usuario
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# Probar endpoint que falla
curl -H "Authorization: Bearer TOKEN" /api/admin/estadisticas
# Si devuelve "Rol no válido" = problema de roles
```

---

## 📋 **CONFIGURACIÓN ACTUAL DE USUARIOS:**

### **SUPER ADMIN**
- **Email:** `admin@reservatuscanchas.cl`
- **Contraseña:** `admin123`
- **Rol:** `super_admin`
- **Permisos:** Acceso completo a todo

### **MAGNA SPORTS**
- **Dueño:** `naxiin320@gmail.com` / `magnasports2024` (rol: `owner`)
- **Manager:** `admin@magnasports.cl` / `magnasports2024` (rol: `manager`) - PENDIENTE CREAR

### **FUNDACIÓN GUNNEN**
- **Dueño:** `ignacio.araya.lillito@hotmail.com` / `gunnen2024` (rol: `owner`) ✅
- **Manager:** `naxiin_320@hotmail.com` / `gunnen2024` (rol: `manager`) ✅ **CORREGIDO**

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS:**

### **URLs de Fundación Gunnen**
- ✅ `http://localhost:3000/?ciudad=Los%20Ángeles&complejo=Fundación%20Gunnen`
- ✅ `http://localhost:3000/gunnen.html` (redirección automática)

### **Sistema de Permisos**
- ✅ **Super Admin:** Acceso completo
- ✅ **Owner:** Acceso completo a su complejo (incluyendo reportes e ingresos)
- ✅ **Manager:** Acceso limitado (sin reportes ni ingresos)

### **Login y Autenticación**
- ✅ Login funcional para todos los usuarios
- ✅ Redirección correcta al dashboard
- ✅ Verificación de permisos por rol

---

## 🔄 **PRÓXIMOS PASOS:**

1. **Crear usuario manager para MagnaSports**
2. **Probar funcionalidades en producción**
3. **Verificar permisos en todas las páginas de admin**
4. **Documentar URLs específicas para clientes**

---

## 📝 **NOTAS IMPORTANTES:**

- **Base de datos:** PostgreSQL unificado para desarrollo y producción
- **Servidor:** Funciona en puerto 3000 (localhost)
- **Auto-deploy:** Habilitado en Render
- **Scripts:** Todos los scripts de admin ahora cargan correctamente
- **Permisos:** Sistema de roles funcionando correctamente

---

**✅ SESIÓN COMPLETADA EXITOSAMENTE**

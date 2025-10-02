# 🔐 Permisos y Roles del Sistema Admin

## 📋 **JERARQUÍA DE ROLES:**

### **1. SUPER ADMIN** 🔑
**Acceso completo a todo el sistema**
- ✅ Dashboard completo
- ✅ Todas las reservas de todos los complejos
- ✅ Gestión de todos los complejos
- ✅ Gestión de todas las canchas
- ✅ Todos los reportes e ingresos
- ✅ Gestión de usuarios
- ✅ Configuraciones del sistema

**Visibilidad en sidebar:**
- ✅ Dashboard
- ✅ Reservas
- ✅ Complejos
- ✅ Canchas
- ✅ Reportes

---

### **2. OWNER** 👑
**Acceso completo a SU complejo únicamente**
- ✅ Dashboard de su complejo
- ✅ Reservas de su complejo
- ✅ Gestión de canchas de su complejo
- ✅ Reportes e ingresos de su complejo
- ✅ Editar reservas de su complejo
- ❌ No puede ver otros complejos
- ❌ No puede gestionar otros usuarios

**Visibilidad en sidebar:**
- ✅ Dashboard
- ✅ Reservas
- ❌ Complejos (solo ve su propio complejo)
- ✅ Canchas (de su complejo)
- ✅ Reportes (de su complejo)

---

### **3. MANAGER** 👤
**Acceso limitado a su complejo**
- ✅ Dashboard básico de su complejo
- ✅ Ver reservas de su complejo
- ✅ Ver canchas de su complejo
- ❌ No puede ver reportes ni ingresos
- ❌ No puede gestionar complejos
- ❌ No puede editar reservas
- ❌ Solo vista de lectura

**Visibilidad en sidebar:**
- ✅ Dashboard
- ✅ Reservas
- ❌ Complejos
- ✅ Canchas (solo vista)
- ❌ Reportes

---

## 🔧 **IMPLEMENTACIÓN TÉCNICA:**

### **Control de Visibilidad del Sidebar:**
```javascript
function aplicarPermisosPorRol() {
    const user = AdminUtils.getCurrentUser();
    if (!user) return;
    
    const userRole = user.rol;
    const complejosLink = document.querySelector('a[href="admin-complexes.html"]');
    const reportesLink = document.querySelector('a[href="admin-reports.html"]');
    
    if (userRole === 'manager') {
        // Managers no pueden ver complejos ni reportes
        if (complejosLink) complejosLink.style.display = 'none';
        if (reportesLink) reportesLink.style.display = 'none';
    } else if (userRole === 'owner') {
        // Owners pueden ver reportes pero no complejos
        if (complejosLink) complejosLink.style.display = 'none';
        if (reportesLink) reportesLink.style.display = 'block';
    } else if (userRole === 'super_admin') {
        // Super admin puede ver todo
        if (complejosLink) complejosLink.style.display = 'block';
        if (reportesLink) reportesLink.style.display = 'block';
    }
}
```

### **Middleware de Backend:**
```javascript
// middleware/role-permissions.js
const requireRolePermission = (allowedRoles, options = {}) => {
    return (req, res, next) => {
        // Verificar autenticación
        if (!req.user) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        
        const userRole = req.user.rol;
        const userComplexId = req.user.complejo_id;
        
        // Configurar permisos según rol
        if (userRole === 'super_admin') {
            req.userPermissions = {
                canViewFinancials: true,
                canManageComplexes: true,
                canManageCourts: true,
                canViewReports: true,
                canEditReservations: true,
                complexFilter: null // Ve todos los complejos
            };
            return next();
        }
        
        if (userRole === 'owner') {
            req.userPermissions = {
                canViewFinancials: true,
                canManageComplexes: false,
                canManageCourts: true,
                canViewReports: true,
                canEditReservations: true,
                complexFilter: userComplexId
            };
            return next();
        }
        
        if (userRole === 'manager') {
            req.userPermissions = {
                canViewFinancials: false,
                canManageComplexes: false,
                canManageCourts: false,
                canViewReports: false,
                canEditReservations: true,
                complexFilter: userComplexId
            };
            return next();
        }
        
        return res.status(403).json({ error: 'Rol no válido para esta operación' });
    };
};
```

---

## 📊 **TABLA DE PERMISOS:**

| Funcionalidad | Super Admin | Owner | Manager |
|---------------|-------------|-------|---------|
| **Dashboard** | ✅ Completo | ✅ Su complejo | ✅ Básico |
| **Reservas** | ✅ Todas | ✅ Su complejo | ✅ Solo vista |
| **Complejos** | ✅ Gestión completa | ❌ No acceso | ❌ No acceso |
| **Canchas** | ✅ Todas | ✅ Su complejo | ✅ Solo vista |
| **Reportes** | ✅ Todos | ✅ Su complejo | ❌ No acceso |
| **Ingresos** | ✅ Todos | ✅ Su complejo | ❌ No acceso |
| **Editar Reservas** | ✅ Sí | ✅ Sí | ❌ No |
| **Gestión Usuarios** | ✅ Sí | ❌ No | ❌ No |

---

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES:**

### **1. Manager ve secciones no permitidas**
**Síntomas:**
- Manager puede ver enlaces "Complejos" o "Reportes" en sidebar
- Al hacer click, redirección automática al login

**Solución:**
```javascript
// Aplicar visibilidad dinámicamente por JavaScript
// NO usar CSS estático hide-for-manager
```

### **2. Owner no puede ver reportes**
**Síntomas:**
- Owner ve reportes en dashboard pero no en otras páginas
- CSS oculta elementos para todos los usuarios

**Solución:**
```javascript
// Usar JavaScript para controlar visibilidad específica por rol
// Owner: ocultar complejos, mostrar reportes
```

### **3. Usuario con rol incorrecto en base de datos**
**Síntomas:**
- Login exitoso pero redirección inmediata al login
- Error: "Rol no válido para esta operación"

**Solución:**
```bash
# Verificar rol del usuario
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# Actualizar rol si es necesario
curl -X POST http://localhost:3000/api/debug/fix-roles
```

---

## 🔄 **FLUJO DE VERIFICACIÓN:**

### **Al crear un nuevo complejo:**
1. ✅ Crear complejo en base de datos
2. ✅ Crear canchas para el complejo
3. ✅ Crear usuario OWNER para el complejo
4. ✅ Crear usuario MANAGER para el complejo (opcional)
5. ✅ Verificar permisos funcionan correctamente

### **Al crear nuevos usuarios:**
1. ✅ Asignar rol correcto (`owner`, `manager`, `super_admin`)
2. ✅ Asociar usuario a complejo si aplica (`complejo_id`)
3. ✅ Verificar login funciona
4. ✅ Verificar permisos se aplican correctamente

---

## 📝 **NOTAS IMPORTANTES:**

### **Principios de Seguridad:**
- **Principio de menor privilegio**: Cada usuario tiene solo los permisos mínimos necesarios
- **Separación por complejo**: Owners y managers solo ven su propio complejo
- **Validación en backend**: Todos los permisos se validan en el servidor
- **Filtrado automático**: Las consultas se filtran automáticamente por complejo

### **Mantenimiento:**
- Revisar permisos cuando se agreguen nuevas funcionalidades
- Actualizar esta documentación cuando cambien los roles
- Probar permisos después de cambios importantes
- Mantener consistencia entre frontend y backend

---

## 🎯 **CASOS DE USO:**

### **Fundación Gunnen:**
- **Owner**: `ignacio.araya.lillito@hotmail.com` - Acceso completo a su complejo
- **Manager**: `naxiin_320@hotmail.com` - Acceso limitado, solo vista

### **MagnaSports:**
- **Owner**: `naxiin320@gmail.com` - Acceso completo a su complejo
- **Manager**: (Por definir) - Acceso limitado, solo vista

### **Super Admin:**
- Acceso completo a todos los complejos y funcionalidades
- Puede gestionar usuarios y configuraciones del sistema


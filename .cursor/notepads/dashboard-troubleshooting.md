# 🔧 Dashboard Troubleshooting - Reserva Tu Cancha

## 📅 Fecha: 2025-01-30

---

## 🚨 **PROBLEMAS COMUNES DEL DASHBOARD:**

### **1. ERROR: Elementos null en dashboard**
**🔍 Síntomas:**
```
[Error] TypeError: null is not an object (evaluating 'document.getElementById('totalReservas').textContent = data.totalReservas || '0'')
[Error] TypeError: null is not an object (evaluating 'container.innerHTML = ...')
```

**🔧 Causa:**
- IDs incorrectos entre HTML y JavaScript
- Elementos no existen en el DOM
- Timing de carga del DOM

**✅ Solución:**
```javascript
// ANTES (causa errores)
document.getElementById('totalReservas').textContent = data.totalReservas;

// DESPUÉS (con verificación)
const element = document.getElementById('totalReservations');
if (element) {
    element.textContent = data.totalReservas || '0';
}
```

**📋 IDs Correctos:**
- `totalReservas` → `totalReservations`
- `totalCanchas` → `totalCourts`
- `totalComplejos` → `totalComplexes`
- `ingresosTotales` → `totalRevenue`
- `recentReservations` → `recentReservationsList`
- `todayReservations` → `todayReservationsList`

---

### **2. ERROR: Manager ve sección de reportes**
**🔍 Síntomas:**
- Usuario manager puede ver enlace "Reportes" en sidebar
- Al hacer click, redirección automática al login

**🔧 Causa:**
- Permisos no se aplican correctamente
- Timing de aplicación de permisos
- Elementos no se ocultan

**✅ Solución:**
```javascript
// Aplicar permisos con delay para asegurar DOM cargado
setTimeout(() => {
    aplicarPermisosPorRol();
}, 500);

// Verificar elementos antes de ocultar
const reportElements = document.querySelectorAll('a[href="admin-reports.html"]');
reportElements.forEach((element, index) => {
    if (element) {
        element.style.display = 'none';
        element.style.visibility = 'hidden';
    }
});
```

---

### **3. ERROR: Redirección automática al login desde reportes**
**🔍 Síntomas:**
- Click en "Reportes" → redirección inmediata al login
- Error: "Rol no válido para esta operación"

**🔧 Causa:**
- Endpoint de reportes no permite rol `manager`
- `authenticatedFetch()` detecta error 401/403 y redirige

**✅ Solución:**
```bash
# Verificar rol del usuario
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# Actualizar rol si es necesario
curl -X POST http://localhost:3000/api/debug/fix-roles
```

---

## 🔍 **COMANDOS DE DIAGNÓSTICO:**

### **Verificar elementos del dashboard:**
```javascript
// En consola del navegador
console.log('Elementos del dashboard:');
console.log('totalReservations:', document.getElementById('totalReservations'));
console.log('totalCourts:', document.getElementById('totalCourts'));
console.log('totalComplexes:', document.getElementById('totalComplexes'));
console.log('totalRevenue:', document.getElementById('totalRevenue'));
console.log('recentReservationsList:', document.getElementById('recentReservationsList'));
console.log('todayReservationsList:', document.getElementById('todayReservationsList'));
```

### **Verificar permisos aplicados:**
```javascript
// En consola del navegador
console.log('Elementos de reportes:');
console.log('Enlaces de reportes:', document.querySelectorAll('a[href="admin-reports.html"]'));
console.log('Usuario actual:', AdminUtils.getCurrentUser());
console.log('Rol:', AdminUtils.getCurrentUser()?.rol);
```

### **Verificar endpoints:**
```bash
# Probar endpoint de estadísticas
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/estadisticas

# Probar endpoint de reportes
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reports
```

---

## 📋 **CHECKLIST DE VERIFICACIÓN:**

### **Al cargar el dashboard:**
- [ ] No hay errores de JavaScript en consola
- [ ] Elementos de estadísticas se actualizan correctamente
- [ ] Usuario manager NO ve enlace de reportes
- [ ] Usuario owner SÍ ve enlace de reportes
- [ ] Usuario super_admin ve todos los enlaces

### **Al hacer click en reportes (manager):**
- [ ] NO debería poder acceder
- [ ] Debería ver mensaje de permisos insuficientes
- [ ] NO debería redirigir al login

### **Al hacer click en reportes (owner/super_admin):**
- [ ] SÍ debería poder acceder
- [ ] Debería cargar la página de reportes
- [ ] NO debería redirigir al login

---

## 🛠️ **SOLUCIONES RÁPIDAS:**

### **Si hay errores de elementos null:**
1. Verificar IDs en HTML vs JavaScript
2. Agregar verificaciones de null
3. Aumentar delay de carga de datos

### **Si manager ve reportes:**
1. Verificar timing de aplicación de permisos
2. Aumentar delay de `aplicarPermisosPorRol()`
3. Verificar selectores CSS

### **Si hay redirección al login:**
1. Verificar rol del usuario en base de datos
2. Verificar permisos del endpoint
3. Actualizar rol si es necesario

---

## 📝 **NOTAS IMPORTANTES:**

- **Timing es crítico:** El DOM debe estar completamente cargado antes de aplicar permisos
- **IDs deben coincidir:** HTML y JavaScript deben usar los mismos IDs
- **Verificaciones de null:** Siempre verificar que elementos existan antes de usarlos
- **Logs de debug:** Usar console.log para debuggear problemas de permisos

---

**✅ DASHBOARD TROUBLESHOOTING COMPLETADO**

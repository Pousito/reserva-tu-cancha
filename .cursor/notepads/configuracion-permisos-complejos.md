# 🏢 Configuración de Permisos por Complejo

## 📋 **JERARQUÍA DE ROLES DEFINIDA:**

### 🔑 **SUPER ADMIN**
- **Acceso:** TODO el sistema
- **Permisos:**
  - ✅ Ver todos los complejos
  - ✅ Ver reportes globales
  - ✅ Ver ingresos globales
  - ✅ Gestionar todos los usuarios
  - ✅ Acceso completo a todas las funcionalidades

### 👑 **OWNER (Dueño del Complejo)**
- **Acceso:** TODO pero SOLO de su complejo
- **Permisos:**
  - ✅ Dashboard completo de su complejo
  - ✅ Ver reservas de su complejo
  - ✅ Gestionar canchas de su complejo
  - ✅ **VER REPORTES de su complejo**
  - ✅ **VER INGRESOS de su complejo**
  - ✅ Gestionar usuarios de su complejo
  - ❌ No puede ver otros complejos
  - ❌ No puede ver reportes globales

### 👤 **MANAGER (Administrador del Complejo)**
- **Acceso:** LIMITADO - solo operaciones básicas
- **Permisos:**
  - ✅ Dashboard básico
  - ✅ Ver reservas de su complejo
  - ✅ Gestionar canchas de su complejo
  - ❌ **NO puede ver reportes**
  - ❌ **NO puede ver ingresos**
  - ❌ No puede gestionar usuarios
  - ❌ No puede ver otros complejos

### 👷 **MANAGER (Gestor del Complejo)**
- **Acceso:** MÍNIMO - solo consultas
- **Permisos:**
  - ✅ Ver reservas de su complejo
  - ❌ No puede modificar nada
  - ❌ No puede ver reportes
  - ❌ No puede ver ingresos

---

## 🏢 **CONFIGURACIÓN ACTUAL POR COMPLEJO:**

### **MAGNA SPORTS**
- **Dueño:** `naxiin320@gmail.com` - Rol: `owner` ✅
- **Administrador:** `admin@magnasports.cl` - Rol: `admin` (PENDIENTE CREAR)
- **Estado:** DUEÑO CORRECTO

### **FUNDACIÓN GUNNEN**
- **Dueño:** `ignacio.araya.lillito@hotmail.com` - Rol: `owner` ✅
- **Manager:** `naxiin_320@hotmail.com` - Rol: `manager` ✅ **CORREGIDO**
- **Estado:** CORRECTO (rol actualizado de admin a manager)

---

## 🔧 **TROUBLESHOOTING - PROBLEMAS COMUNES:**

### **Problema: "Rol no válido para esta operación"**
**🔍 Síntomas:**
- Login exitoso pero redirección inmediata al login
- Error en consola: "Rol no válido para esta operación"
- Loop infinito de redirección

**🔧 Diagnóstico:**
```bash
# 1. Verificar rol del usuario en la base de datos
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# 2. Probar endpoint que falla
curl -H "Authorization: Bearer TOKEN" /api/admin/estadisticas
# Si devuelve "Rol no válido" = problema de roles
```

**✅ Solución:**
```bash
# 1. Actualizar rol en la base de datos
curl -X POST http://localhost:3000/api/debug/fix-roles

# 2. Verificar que se actualizó
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# 3. Hacer nuevo login para obtener token con rol correcto
curl -X POST http://localhost:3000/api/admin/login -H "Content-Type: application/json" -d '{"email":"EMAIL","password":"PASSWORD"}'
```

### **Problema: "Contraseña incorrecta"**
**🔍 Síntomas:**
- Login falla con contraseña correcta
- Error: "Credenciales inválidas"

**✅ Solución:**
```bash
# Arreglar contraseñas en la base de datos
curl -X POST http://localhost:3000/api/debug/fix-passwords
```

---

## ⚠️ **CORRECCIONES NECESARIAS:**

### 1. **CORREGIR MAGNA SPORTS:**
```javascript
// Cambiar de 'admin' a 'owner'
{ email: 'naxiin320@gmail.com', password: 'magnasports2024', nombre: 'Dueño MagnaSports', rol: 'owner' }
```

### 2. **ACTUALIZAR PERMISOS EN MIDDLEWARE:**
```javascript
// En middleware/role-permissions.js
owner: {
  canViewReports: true,    // ✅ SÍ puede ver reportes
  canViewFinancials: true, // ✅ SÍ puede ver ingresos
  canManageComplexes: false, // ❌ Solo su complejo
  canManageCourts: true,   // ✅ Puede gestionar canchas
  canEditReservations: true // ✅ Puede gestionar reservas
},
admin: {
  canViewReports: false,   // ❌ NO puede ver reportes
  canViewFinancials: false, // ❌ NO puede ver ingresos
  canManageComplexes: false, // ❌ Solo su complejo
  canManageCourts: true,   // ✅ Puede gestionar canchas
  canEditReservations: true // ✅ Puede gestionar reservas
}
```

---

## 📝 **PLANTILLA PARA NUEVOS COMPLEJOS:**

```javascript
// Usuario Dueño (Owner)
{
  email: 'dueño@complejo.com',
  password: 'password2024',
  nombre: 'Dueño Complejo',
  rol: 'owner',
  complejo_id: [ID_DEL_COMPLEJO]
}

// Usuario Administrador (Admin) - OPCIONAL
{
  email: 'admin@complejo.com',
  password: 'admin2024',
  nombre: 'Administrador Complejo',
  rol: 'admin',
  complejo_id: [ID_DEL_COMPLEJO]
}
```

---

## 🎯 **CHECKLIST PARA NUEVOS COMPLEJOS:**

- [ ] Crear complejo en base de datos
- [ ] Crear usuario **owner** (dueño)
- [ ] Asignar `complejo_id` al usuario
- [ ] Verificar permisos de reportes
- [ ] Verificar permisos de ingresos
- [ ] Probar acceso al dashboard
- [ ] Probar gestión de canchas
- [ ] Probar gestión de reservas
- [ ] Documentar credenciales

---

## 🔧 **COMANDOS ÚTILES:**

```bash
# Crear usuario owner para nuevo complejo
node scripts/create-complex-owner.js --complejo="Nombre Complejo" --email="dueño@email.com"

# Verificar permisos de usuario
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/estadisticas

# Listar usuarios por complejo
psql -d reserva_tu_cancha_local -c "SELECT u.email, u.rol, c.nombre FROM usuarios u JOIN complejos c ON u.complejo_id = c.id;"
```

---

**📅 Última actualización:** $(date)
**👤 Creado por:** Asistente IA
**🎯 Propósito:** Guía para configuración correcta de permisos por complejo

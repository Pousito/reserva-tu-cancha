# 🏢 Análisis Completo: Complejos, Canchas y Usuarios

## 📊 **ESTADO ACTUAL DEL SISTEMA (Localhost)**

### 🏢 **COMPLEJOS DISPONIBLES (2 complejos):**

#### **1. MagnaSports**
- **ID**: 1
- **Dirección**: Monte Perdido 1685
- **Teléfono**: +56987654321
- **Email**: reservas@magnasports.cl
- **Ciudad**: Los Ángeles (ID: 1)

#### **2. Fundación Gunnen** 
- **ID**: 3
- **Dirección**: Calle Don Victor 1310
- **Teléfono**: +56972815810
- **Email**: naxiin_320@hotmail.com
- **Ciudad**: Los Ángeles (ID: 1)

---

### ⚽ **CANCHAS DISPONIBLES (4 canchas):**

#### **MagnaSports (2 canchas):**
- **Cancha Techada 1** (ID: 1)
  - Tipo: Fútbol
  - Precio: $5,000/hora
- **Cancha Techada 2** (ID: 2)
  - Tipo: Fútbol
  - Precio: $5,000/hora

#### **Fundación Gunnen (2 canchas):**
- **Cancha 1** (ID: 6)
  - Tipo: Fútbol
  - Precio: $8,000/hora
  - Número: 1
- **Cancha 2** (ID: 7)
  - Tipo: Fútbol
  - Precio: $8,000/hora
  - Número: 2

---

### 👥 **USUARIOS ADMINISTRATIVOS:**

#### **🏢 FUNDACIÓN GUNNEN:**
- **Owner Principal**: 
  - Email: `ignacio.araya.lillito@hotmail.com`
  - Nombre: "Dueño Fundación Gunnen"
  - Rol: `owner`
  - Complejo_id: `3` ✅

- **Owner Alternativo**:
  - Email: `admin@fundaciongunnen.cl`
  - Nombre: "Administrador Fundación Gunnen"
  - Rol: `owner`
  - Complejo_id: `3` ✅

- **Manager**:
  - Email: `naxiin_320@hotmail.com`
  - Nombre: "Administrador Fundación Gunnen"
  - Rol: `manager` ✅
  - Complejo_id: `3` ✅

#### **🏢 MAGNA SPORTS:**
- **Owner**:
  - Email: `naxiin320@gmail.com`
  - Nombre: "Dueño MagnaSports"
  - Rol: `owner`
  - Complejo_id: `1` ✅

#### **🌐 SUPER ADMIN:**
- **Super Administrador**:
  - Email: `admin@reservatuscanchas.cl`
  - Nombre: "Super Administrador"
  - Rol: `super_admin`
  - Complejo_id: `null` (correcto para super admin)

---

## 🔧 **CORRECCIONES IMPLEMENTADAS:**

### **Problema Identificado:**
- Todos los usuarios tenían `complejo_id: null`
- Esto afectaba el sistema de permisos por complejo
- Filtrado automático no funcionaba correctamente

### **Solución Implementada:**
1. **Nuevo Endpoint**: `/api/debug/fix-complejo-ids`
2. **Asignaciones Automáticas**:
   - Fundación Gunnen (ID: 3) → Todos los usuarios relacionados
   - MagnaSports (ID: 1) → Usuario owner correspondiente
3. **Deploy Automático**: Cambios pusheados a producción

---

## 🛠️ **COMANDOS ÚTILES PARA MANTENIMIENTO:**

### **Verificar Estado de Usuarios:**
```bash
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | {email, nombre, rol, complejo_id}'
```

### **Corregir Complejo_ID (si es necesario):**
```bash
curl -X POST http://localhost:3000/api/debug/fix-complejo-ids -H "Content-Type: application/json" -d '{}'
```

### **Verificar Complejos:**
```bash
curl -s http://localhost:3000/api/complejos/1 | jq '.'
```

### **Verificar Canchas:**
```bash
curl -s http://localhost:3000/api/debug/canchas | jq '.canchas[] | {id, nombre, complejo_nombre, precio_hora}'
```

---

## 📋 **CHECKLIST PARA NUEVOS COMPLEJOS:**

- [ ] Crear complejo en base de datos
- [ ] Crear canchas para el complejo
- [ ] Crear usuario **owner** (dueño)
- [ ] Asignar `complejo_id` correcto al usuario
- [ ] Crear usuario **manager** (opcional)
- [ ] Verificar permisos de reportes funcionan
- [ ] Verificar permisos de ingresos funcionan
- [ ] Probar acceso al dashboard
- [ ] Probar gestión de canchas
- [ ] Probar gestión de reservas
- [ ] Documentar credenciales

---

## 🎯 **CONFIGURACIÓN DE PRECIOS ACTUAL:**

- **MagnaSports**: $5,000/hora (canchas techadas)
- **Fundación Gunnen**: $8,000/hora (canchas al aire libre)

---

## 🚨 **TROUBLESHOOTING COMÚN:**

### **Problema: "complexFilter: null"**
**Síntomas:**
- Usuario owner/manager no ve datos de su complejo
- Estadísticas muestran 0 reservas/canchas

**Solución:**
```bash
# Ejecutar corrección de complejo_id
curl -X POST http://localhost:3000/api/debug/fix-complejo-ids -H "Content-Type: application/json" -d '{}'
```

### **Problema: Usuario no puede ver reportes**
**Síntomas:**
- Manager intenta acceder a reportes
- Owner no ve ingresos de su complejo

**Verificación:**
```bash
# Verificar rol del usuario
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol, complejo_id}'
```

---

## 📊 **ESTADÍSTICAS DEL SISTEMA:**

- **Total Complejos**: 2
- **Total Canchas**: 4 (2 por complejo)
- **Total Usuarios Admin**: 5
  - 1 Super Admin
  - 3 Owners (2 Fundación Gunnen, 1 MagnaSports)
  - 1 Manager (Fundación Gunnen)

---

## 🔄 **FLUJO DE VERIFICACIÓN POST-DEPLOY:**

1. ✅ Verificar que usuarios tengan complejo_id correcto
2. ✅ Probar login de cada tipo de usuario
3. ✅ Verificar filtrado por complejo funciona
4. ✅ Probar acceso a reportes según rol
5. ✅ Verificar gestión de canchas por complejo
6. ✅ Probar creación de reservas

---

**📅 Última actualización:** $(date)
**👤 Creado por:** Asistente IA
**🎯 Propósito:** Documentación completa del análisis y correcciones del sistema de complejos, canchas y usuarios

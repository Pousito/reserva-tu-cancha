# 🏟️ Canchas - Troubleshooting

## 📋 **PROBLEMAS RESUELTOS:**

### **1. ERROR: "No se encontraron canchas" para Fundación Gunnen** ✅ **RESUELTO**
**🔍 Síntomas:**
- Usuario manager de Fundación Gunnen ve "No se encontraron canchas"
- Debería ver 2 canchas del complejo

**🔧 Causa:**
- Las canchas existían solo para MagnaSports (complejo_id: 1)
- Fundación Gunnen (complejo_id: 3) no tenía canchas creadas
- Usuario manager solo puede ver canchas de su complejo asignado

**✅ Solución:**
```bash
# 1. Verificar canchas existentes
curl -s http://localhost:3000/api/debug/canchas

# 2. Crear canchas para Fundación Gunnen
curl -X POST http://localhost:3000/api/debug/create-courts

# 3. Verificar que se crearon
curl -s http://localhost:3000/api/debug/canchas | jq '.canchas[] | {id, nombre, complejo_nombre}'
```

**📊 Resultado:**
- **MagnaSports**: 2 canchas techadas a $5,000/hora
- **Fundación Gunnen**: 2 canchas a $8,000/hora

---

## 🔍 **COMANDOS DE DIAGNÓSTICO:**

### **Verificar canchas en la base de datos:**
```bash
# Ver todas las canchas
curl -s http://localhost:3000/api/debug/canchas | jq '.canchas[] | {id, nombre, complejo_nombre, precio_hora}'

# Ver canchas de un complejo específico
curl -s http://localhost:3000/api/debug/canchas | jq '.canchas[] | select(.complejo_nombre == "FUNDACIÓN")'
```

### **Verificar canchas desde el frontend:**
```bash
# Login y obtener token
TOKEN=$(curl -X POST http://localhost:3000/api/admin/login -H "Content-Type: application/json" -d '{"email":"EMAIL","password":"PASSWORD"}' | jq -r '.token')

# Ver canchas del usuario logueado
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/canchas
```

### **Crear canchas para nuevos complejos:**
```bash
# Endpoint para crear canchas de prueba
curl -X POST http://localhost:3000/api/debug/create-courts
```

---

## 📋 **CHECKLIST DE VERIFICACIÓN:**

### **Al cargar la página de canchas:**
- [ ] Usuario puede ver canchas de su complejo asignado
- [ ] No hay errores de JavaScript en la consola
- [ ] Elementos `data-user` se actualizan correctamente
- [ ] Filtros y funcionalidad funcionan correctamente

### **Para nuevos complejos:**
- [ ] Crear canchas en la base de datos
- [ ] Asociar canchas al complejo correcto
- [ ] Verificar que usuarios del complejo pueden ver sus canchas
- [ ] Probar permisos de owner vs manager

---

## 🚨 **PROBLEMAS CONOCIDOS:**

### **Pendientes de resolución:**
- Ninguno identificado actualmente

---

## 📝 **NOTAS IMPORTANTES:**

### **Estructura de canchas:**
- Cada complejo debe tener sus propias canchas
- Canchas están asociadas por `complejo_id`
- Usuarios solo ven canchas de su complejo asignado
- Precios pueden variar por complejo

### **Permisos por rol:**
- **Super Admin**: Ve todas las canchas
- **Owner**: Ve canchas de su complejo, puede editarlas
- **Manager**: Ve canchas de su complejo, solo lectura

---

## 🔧 **ENDPOINTS DE DEBUG:**

### **Ver canchas:**
- `GET /api/debug/canchas` - Ver todas las canchas

### **Crear canchas:**
- `POST /api/debug/create-courts` - Crear canchas para Fundación Gunnen

### **Verificar usuarios:**
- `GET /api/debug/passwords` - Ver usuarios y sus complejos asignados

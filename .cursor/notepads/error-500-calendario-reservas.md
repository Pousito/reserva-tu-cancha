# 🚨 Error 500 en Calendario de Reservas - Producción

## 📋 **PROBLEMA IDENTIFICADO**

**Fecha:** $(date)  
**Error:** HTTP 500 en endpoint `/admin/calendar/week`  
**Ubicación:** Sección de reservas en producción  
**Síntomas:**
```
[Error] Failed to load resource: the server responded with a status of 500 () (week, line 0)
[Error] Error al cargar calendario: – ""
	(función anónima) (admin-reservations.js:1040)
```

---

## 🔍 **ANÁLISIS DEL PROBLEMA**

### **Endpoint Afectado:**
- **URL:** `GET /api/admin/calendar/week`
- **Archivo:** `src/routes/admin-calendar.js` (líneas 58-383)
- **Función:** `router.get('/week', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {`

### **Flujo del Error:**
1. **Frontend:** `admin-reservations.js:1014` hace fetch al endpoint
2. **Backend:** Endpoint `/admin/calendar/week` procesa la petición
3. **Error:** Se produce un error 500 en el backend
4. **Frontend:** Recibe error y muestra "Error al cargar calendario"

### **Posibles Causas:**
1. **Error en consulta SQL** - Problema con la base de datos
2. **Error de permisos** - Usuario no tiene permisos correctos
3. **Error de autenticación** - Token JWT inválido
4. **Error en procesamiento de datos** - Error en lógica del calendario
5. **Error de conexión a BD** - Problema de conectividad

---

## 🔧 **DIAGNÓSTICO NECESARIO**

### **1. Verificar Logs del Servidor:**
```bash
# Verificar logs en Render Dashboard
# Buscar errores relacionados con:
# - admin-calendar
# - calendar/week
# - Error 500
```

### **2. Verificar Endpoint en Producción:**
```bash
# Probar endpoint directamente
curl -H "Authorization: Bearer TOKEN" \
  "https://www.reservatuscanchas.cl/api/admin/calendar/week?fechaInicio=2025-10-03&fechaFin=2025-10-09&complejoId="
```

### **3. Verificar Base de Datos:**
```bash
# Verificar que las tablas existen
# - reservas
# - canchas  
# - complejos
# - bloqueos_temporales
```

### **4. Verificar Permisos de Usuario:**
```bash
# Verificar que el usuario tiene rol correcto
# - super_admin, owner, o manager
# - complejo_id asignado correctamente
```

---

## 🛠️ **SOLUCIONES BASADAS EN NOTEPADS**

### **Solución 1: Error de Elementos Null (del notepad reservas-troubleshooting.md)**
**Problema:** Elementos HTML no existen en la página de reservas  
**Solución:** Agregar verificaciones de null en JavaScript

```javascript
// ANTES (causa errores)
document.querySelector('[data-user="name"]').textContent = adminUser.nombre;

// DESPUÉS (con verificación)
const nameElement = document.querySelector('[data-user="name"]');
if (nameElement) {
    nameElement.textContent = adminUser.nombre || 'Admin';
}
```

### **Solución 2: Error de Permisos (del notepad dashboard-troubleshooting.md)**
**Problema:** Usuario no tiene permisos para acceder al endpoint  
**Solución:** Verificar y corregir rol del usuario

```bash
# Verificar rol del usuario
curl -s http://localhost:3000/api/debug/passwords | jq '.usuarios[] | select(.email == "EMAIL") | {email, rol}'

# Actualizar rol si es necesario
curl -X POST http://localhost:3000/api/debug/fix-roles
```

### **Solución 3: Error de Base de Datos**
**Problema:** Tablas o datos faltantes en la base de datos  
**Solución:** Verificar estructura de BD y datos

```bash
# Verificar reservas en la base de datos
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reservas

# Verificar canchas
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/canchas
```

---

## 🔍 **CÓDIGO DEL ENDPOINT PROBLEMÁTICO**

### **Líneas Críticas (admin-calendar.js:58-383):**
```javascript
router.get('/week', authenticateToken, requireRolePermission(['super_admin', 'owner', 'manager']), async (req, res) => {
    try {
        const { fechaInicio, fechaFin, complejoId } = req.query;
        const user = req.user;
        
        // ... lógica del calendario ...
        
        // Consulta SQL compleja (líneas 97-144)
        let query = `
            SELECT 
                r.id, r.codigo_reserva as codigo, r.fecha, r.hora_inicio, r.hora_fin,
                r.precio_total, r.estado, r.tipo_reserva, r.creada_por_admin,
                r.metodo_contacto, r.comision_aplicada, r.nombre_cliente,
                r.email_cliente, r.telefono_cliente, c.id as cancha_id,
                c.nombre as cancha_numero, c.tipo as cancha_tipo, c.precio_hora,
                comp.id as complejo_id, comp.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos comp ON c.complejo_id = comp.id
            WHERE r.fecha >= $1 AND r.fecha <= $2 AND r.estado != 'cancelada'
        `;
        
        const reservations = await db.query(query, queryParams);
        
        // ... procesamiento de datos ...
        
    } catch (error) {
        console.error('❌ Error obteniendo datos del calendario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message,
            stack: error.stack
        });
    }
});
```

---

## 🎯 **PLAN DE ACCIÓN**

### **Paso 1: Verificar Logs de Producción**
- [ ] Revisar logs en Render Dashboard
- [ ] Buscar errores específicos del endpoint
- [ ] Identificar la causa exacta del error 500

### **Paso 2: Probar Endpoint Directamente**
- [ ] Obtener token de autenticación válido
- [ ] Probar endpoint con diferentes parámetros
- [ ] Verificar respuesta del servidor

### **Paso 3: Verificar Base de Datos**
- [ ] Confirmar que las tablas existen
- [ ] Verificar que hay datos en las tablas
- [ ] Probar consultas SQL manualmente

### **Paso 4: Implementar Solución**
- [ ] Aplicar fix basado en la causa identificada
- [ ] Probar solución en localhost
- [ ] Deploy a producción
- [ ] Verificar que el error se resuelve

---

## 📝 **NOTAS TÉCNICAS**

### **Dependencias del Endpoint:**
- **Autenticación:** JWT token válido
- **Permisos:** Rol super_admin, owner, o manager
- **Base de Datos:** Tablas reservas, canchas, complejos, bloqueos_temporales
- **Parámetros:** fechaInicio, fechaFin, complejoId (opcional)

### **Datos que Retorna:**
- **semana:** Rango de fechas y días
- **canchas:** Lista de canchas disponibles
- **horarios:** Horarios por día de la semana
- **reservas:** Reservas en el rango de fechas
- **bloqueos:** Bloqueos temporales
- **calendario:** Datos formateados para el calendario

---

## 🚨 **URGENCIA**

**Nivel:** ALTO  
**Impacto:** Usuarios no pueden ver el calendario de reservas  
**Prioridad:** Resolver inmediatamente  

---

**📅 Fecha:** $(date)  
**👤 Reportado por:** Usuario  
**🎯 Estado:** 🔍 EN INVESTIGACIÓN

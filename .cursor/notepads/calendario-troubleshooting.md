# 📅 Calendario Troubleshooting - Reserva Tu Cancha

## 📅 Fecha: 2025-10-03

---

## 🚨 **PROBLEMAS CRÍTICOS RESUELTOS EN EL CALENDARIO:**

### **1. ERROR 502 PERSISTENTE EN CALENDARIO** ✅ **RESUELTO**
**🔍 Síntomas:**
```
[Error] Failed to load resource: the server responded with a status of 502 () (week, line 0)
[Error] Error al cargar calendario: – 502 – ""
```

**🔧 Causa Real:**
- **NO era problema de caché del navegador**
- **NO era problema de autenticación**
- **SÍ era problema de base de datos**: Columnas inexistentes en la consulta SQL
- **SÍ era problema de JavaScript**: Variables no definidas en catch blocks

**✅ Solución Implementada:**
```javascript
// ANTES (causaba errores)
let query = `
    SELECT 
        r.id,
        r.codigo_reserva as codigo,
        r.fecha,
        r.hora_inicio,
        r.hora_fin,
        r.precio_total,
        r.estado,
        r.tipo_reserva,                    // ❌ No existe
        r.creada_por_admin,                // ❌ No existe
        r.metodo_contacto,                 // ❌ No existe
        r.comision_aplicada,               // ❌ No existe
        r.nombre_cliente,
        r.email_cliente,
        r.telefono_cliente,
        c.id as cancha_id,
        c.nombre as cancha_numero,
        c.tipo as cancha_tipo,
        c.precio_hora,
        comp.id as complejo_id,
        comp.nombre as complejo_nombre
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    WHERE r.fecha >= $1 AND r.fecha <= $2 AND r.estado != 'cancelada'
`;

// DESPUÉS (corregido)
let query = `
    SELECT 
        r.id,
        r.codigo_reserva as codigo,
        r.fecha,
        r.hora_inicio,
        r.hora_fin,
        r.precio_total,
        r.estado,
        r.nombre_cliente,
        r.email_cliente,
        r.telefono_cliente,
        c.id as cancha_id,
        c.nombre as cancha_numero,
        c.tipo as cancha_tipo,
        c.precio_hora,
        comp.id as complejo_id,
        comp.nombre as complejo_nombre
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos comp ON c.complejo_id = comp.id
    WHERE r.fecha >= $1 AND r.fecha <= $2 AND r.estado != 'cancelada'
`;
```

---

### **2. ERROR: ReferenceError: fechaInicio is not defined** ✅ **RESUELTO**
**🔍 Síntomas:**
```
ReferenceError: fechaInicio is not defined
    at /opt/render/project/src/src/routes/admin-calendar.js:412:13
```

**🔧 Causa:**
- Variables no definidas en el scope del catch block
- Uso de `user` en lugar de `req.user`

**✅ Solución Implementada:**
```javascript
// ANTES (causaba errores)
} catch (error) {
    console.error('❌ Debug info:', {
        fechaInicio,           // ❌ No definida
        fechaFin,             // ❌ No definida
        userEmail: user?.email, // ❌ user no definido
        userRole: user?.rol
    });
}

// DESPUÉS (corregido)
} catch (error) {
    console.error('❌ Debug info:', {
        fechaInicio: req.query.fechaInicio || 'no definida',
        fechaFin: req.query.fechaFin || 'no definida',
        userEmail: req.user?.email || 'no definido',
        userRole: req.user?.rol || 'no definido'
    });
}
```

---

### **3. MODO OFFLINE COMO RESPALDO** ✅ **IMPLEMENTADO**
**🔍 Problema:**
- Cuando el servidor fallaba, no había respaldo
- Usuarios no podían ver el calendario en absoluto

**✅ Solución Implementada:**
```javascript
// Sistema de respaldo en cascada:
// 1. Intentar endpoint principal /admin/calendar/week
// 2. Si falla, intentar endpoint de respaldo /admin/reservas
// 3. Si falla, usar modo offline con datos ya cargados
// 4. Si no hay datos, mostrar calendario vacío

async function cargarCalendario() {
    try {
        // Nivel 1: Endpoint principal
        const response = await fetch(`${API_BASE}/admin/calendar/week`);
        if (response.ok) {
            // ✅ Calendario normal
            return;
        }
        
        // Nivel 2: Endpoint de respaldo
        await cargarCalendarioRespaldo();
        
    } catch (error) {
        // Nivel 3: Modo offline
        await cargarCalendarioOffline();
    }
}
```

---

### **4. FORMATO VISUAL MEJORADO** ✅ **IMPLEMENTADO**
**🔍 Problema:**
- El calendario offline se veía "raro" o poco profesional
- Falta de información detallada en las reservas

**✅ Solución Implementada:**
```css
/* Estilos CSS profesionales para calendario offline */
.calendar-grid-offline {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    overflow: hidden;
    margin: 20px 0;
}

.calendar-grid-offline .calendar-header {
    display: grid;
    grid-template-columns: 80px repeat(7, 1fr);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: bold;
    text-align: center;
    padding: 15px 0;
}

.calendar-grid-offline .calendar-slot.occupied {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: white;
    font-weight: 600;
    position: relative;
    overflow: hidden;
}
```

---

## 🛠️ **HERRAMIENTAS DE DIAGNÓSTICO IMPLEMENTADAS:**

### **1. Verificación de Estado del Servidor**
```javascript
async function verificarEstadoServidor() {
    // Verificar endpoint de salud
    const healthResponse = await fetch(`${API_BASE.replace('/api', '')}/health`);
    const healthStatus = healthResponse.ok ? '✅ Funcionando' : '❌ Con problemas';
    
    // Verificar endpoint de autenticación
    const authResponse = await fetch(`${API_BASE}/admin/calendar/week`);
    const authStatus = authResponse.status === 401 ? '✅ Requiere autenticación (normal)' : 
                      authResponse.status === 502 ? '❌ Error 502 (problema interno)' :
                      authResponse.status === 200 ? '✅ Funcionando' : `⚠️ Estado ${authResponse.status}`;
    
    alert(`Estado del Servidor:
    
🏥 Salud del servidor: ${healthStatus}
🔐 Endpoint calendario: ${authStatus}
📅 Estado actual: Modo offline activado`);
}
```

### **2. Limpieza de Caché**
```javascript
function limpiarCacheYRecargar() {
    // Limpiar localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('reservasData');
    
    // Limpiar sessionStorage
    sessionStorage.clear();
    
    // Limpiar caché del navegador
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }
    
    // Recargar la página
    window.location.reload();
}
```

### **3. Script de Diagnóstico del Servidor**
```javascript
// scripts/diagnose-render-502.js
async function diagnoseRender() {
    const baseUrl = 'https://www.reservatuscanchas.cl';
    
    // Verificar página principal
    const mainPage = await makeRequest(baseUrl);
    console.log(`Status: ${mainPage.statusCode}`);
    
    // Verificar endpoint de salud
    const health = await makeRequest(`${baseUrl}/health`);
    console.log(`Health Status: ${health.statusCode}`);
    
    // Verificar endpoint de API
    const api = await makeRequest(`${baseUrl}/api`);
    console.log(`API Status: ${api.statusCode}`);
}
```

---

## 📋 **CHECKLIST PARA FUTUROS PROBLEMAS:**

### **Cuando el calendario no funciona:**

1. **Verificar logs del servidor:**
   - Buscar errores SQL: `column does not exist`
   - Buscar errores JS: `ReferenceError`
   - Verificar si el servidor se reinicia constantemente

2. **Verificar estructura de base de datos:**
   - Confirmar que las columnas en la consulta SQL existen
   - Verificar que los JOINs son correctos
   - Probar la consulta SQL directamente

3. **Verificar manejo de errores:**
   - Usar `req.user` en lugar de `user` en catch blocks
   - Usar `req.query` para parámetros de URL
   - Agregar validaciones de variables no definidas

4. **Verificar respaldo offline:**
   - Confirmar que `window.reservasData` está disponible
   - Verificar que las funciones de respaldo funcionan
   - Probar el modo offline manualmente

5. **Verificar autenticación:**
   - Confirmar que el token es válido
   - Verificar que el usuario tiene permisos
   - Probar con diferentes roles de usuario

---

## 🎯 **LECCIONES APRENDIDAS:**

### **1. El Error 502 NO siempre es problema del servidor:**
- Puede ser problema de consultas SQL mal formadas
- Puede ser problema de variables no definidas
- Puede ser problema de columnas inexistentes en la BD

### **2. El modo offline es esencial:**
- Proporciona respaldo cuando el servidor falla
- Mejora la experiencia del usuario
- Permite funcionalidad básica sin conexión

### **3. El diagnóstico es clave:**
- Los logs del servidor revelan la causa real
- Las herramientas de diagnóstico ayudan a identificar problemas
- La verificación de estado del servidor es crucial

### **4. La estructura de BD puede variar:**
- No asumir que todas las columnas existen
- Verificar la estructura real de la BD
- Usar consultas SQL simples y robustas

---

## 🔧 **COMANDOS ÚTILES:**

### **Verificar estado del servidor:**
```bash
curl -s -I "https://www.reservatuscanchas.cl/health"
curl -s "https://www.reservatuscanchas.cl/api/admin/calendar/week"
```

### **Diagnosticar problemas:**
```bash
node scripts/diagnose-render-502.js
```

### **Verificar logs en tiempo real:**
```bash
# En Render Dashboard, verificar logs del servicio
# Buscar errores SQL y JavaScript
```

---

## 📝 **NOTAS IMPORTANTES:**

- **El calendario offline usa datos ya cargados** en `window.reservasData`
- **Solo muestra horarios relevantes** (8:00-22:00) para mejor UX
- **El modo offline se activa automáticamente** cuando hay errores 502
- **Los botones de diagnóstico** ayudan a identificar problemas rápidamente
- **La limpieza de caché** puede resolver problemas de autenticación

---

## 🚀 **ESTADO ACTUAL:**

✅ **Calendario funcionando correctamente**
✅ **Modo offline implementado como respaldo**
✅ **Herramientas de diagnóstico disponibles**
✅ **Manejo robusto de errores**
✅ **Formato visual profesional**

**Última actualización:** 2025-10-03
**Problemas resueltos:** 4 críticos
**Estado:** ✅ FUNCIONANDO

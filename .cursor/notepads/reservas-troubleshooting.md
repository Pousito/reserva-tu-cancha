# 🔧 Reservas Troubleshooting - Reserva Tu Cancha

## 📅 Fecha: 2025-01-30

---

## 🚨 **PROBLEMAS COMUNES EN RESERVAS:**

### **1. ERROR: Elementos null en página de reservas** ✅ **RESUELTO**
**🔍 Síntomas:**
```
[Error] TypeError: null is not an object (evaluating 'document.querySelector('[data-user="name"]').textContent = adminUser.nombre || 'Admin'')
[Error] TypeError: null is not an object (evaluating 'document.getElementById('modalComplejo').addEventListener')
[Error] TypeError: null is not an object (evaluating 'document.getElementById('tipoReservaFilter').addEventListener')
```

**🔧 Causa:**
- Elementos HTML no existen en la página de reservas
- JavaScript intenta acceder a elementos que no están presentes
- Filtros y elementos de interfaz faltantes

**✅ Solución:**
```javascript
// ANTES (causa errores)
document.querySelector('[data-user="name"]').textContent = adminUser.nombre;
document.getElementById('modalComplejo').addEventListener('change', cargarCanchasModal);
document.getElementById('tipoReservaFilter').addEventListener('change', aplicarFiltros);

// DESPUÉS (con verificación)
const nameElement = document.querySelector('[data-user="name"]');
if (nameElement) {
    nameElement.textContent = adminUser.nombre || 'Admin';
}

const modalComplejoElement = document.getElementById('modalComplejo');
if (modalComplejoElement) {
    modalComplejoElement.addEventListener('change', cargarCanchasModal);
}

const tipoReservaFilter = document.getElementById('tipoReservaFilter');
if (tipoReservaFilter) {
    tipoReservaFilter.addEventListener('change', aplicarFiltros);
}
```

---

### **2. ERROR: "No se encontraron reservas"**
**🔍 Síntomas:**
- Mensaje "No se encontraron reservas" aparece
- No hay reservas en la base de datos
- Filtros aplicados incorrectamente

**🔧 Causa:**
- Base de datos vacía (sin reservas creadas)
- Filtros muy restrictivos
- Problemas de permisos de usuario

**✅ Solución:**
```bash
# Verificar reservas en la base de datos
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reservas

# Crear reservas de prueba si es necesario
# Usar la interfaz de reservas para crear reservas de prueba
```

---

### **3. ERROR: Filtros no funcionan**
**🔍 Síntomas:**
- Filtros no se aplican correctamente
- Error al cambiar filtros
- Elementos de filtro no existen

**🔧 Causa:**
- Elementos de filtro no existen en HTML
- JavaScript no puede acceder a elementos de filtro
- Event listeners no se configuran correctamente

**✅ Solución:**
```javascript
// Configurar event listeners con verificación
function configurarEventListeners() {
    const elementosFiltro = [
        'complejoFilter',
        'estadoFilter', 
        'tipoReservaFilter',
        'fechaDesde',
        'fechaHasta',
        'ordenamientoFilter'
    ];
    
    elementosFiltro.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', aplicarFiltros);
        }
    });
}
```

### **2. ERROR: Calendario faltante en página de reservas** ✅ **RESUELTO**
**🔍 Síntomas:**
- Página de reservas no muestra opción de calendario
- Solo se ve la vista de lista
- JavaScript tiene código del calendario pero HTML no tiene elementos

**🔧 Causa:**
- HTML de `admin-reservations.html` no tenía los elementos del calendario
- Faltaban botones de vista (Lista/Calendario)
- Faltaba la sección `vistaCalendario` y `calendarGrid`
- Faltaban estilos CSS para el calendario

**✅ Solución:**
```html
<!-- Botones de Vista -->
<div class="filter-card">
    <div class="d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
            <i class="fas fa-eye me-2"></i>Vista de Reservas
        </h6>
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-primary" id="btnLista" onclick="mostrarVista('lista')">
                <i class="fas fa-list me-2"></i>Lista
            </button>
            <button type="button" class="btn btn-outline-primary" id="btnCalendario" onclick="mostrarVista('calendario')">
                <i class="fas fa-calendar-week me-2"></i>Calendario
            </button>
        </div>
    </div>
</div>

<!-- Vista Calendario -->
<div class="reservations-table" id="vistaCalendario" style="display: none;">
    <div class="p-3 border-bottom">
        <div class="d-flex justify-content-between align-items-center">
            <h6 class="mb-0" id="tituloCalendario">
                <i class="fas fa-calendar-week me-2"></i>Calendario Semanal
            </h6>
            <div class="d-flex align-items-center gap-3">
                <select class="form-select form-select-sm" id="complejoCalendario" style="width: auto;">
                    <option value="">Todos los complejos</option>
                </select>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-secondary" onclick="navegarSemana(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="irAHoy()">
                        Hoy
                    </button>
                    <button type="button" class="btn btn-outline-secondary" onclick="navegarSemana(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="p-3">
        <div id="calendarGrid" class="calendar-grid">
            <div class="text-center p-4">
                <i class="fas fa-spinner fa-spin me-2"></i>Cargando calendario...
            </div>
        </div>
    </div>
</div>
```

**🎨 Estilos CSS agregados:**
- `.calendar-grid` - Grid principal del calendario
- `.calendar-header` - Encabezados de días
- `.calendar-slot` - Casillas de tiempo (disponible, ocupado, parcial)
- `.calendar-time-slot` - Columna de horas

### **3. ERROR: Elemento rangoSemana no encontrado** ✅ **RESUELTO**
**🔍 Síntomas:**
```
[Error] TypeError: null is not an object (evaluating 'document.getElementById('rangoSemana').textContent = rangoTexto')
```

**🔧 Causa:**
- JavaScript busca elemento `rangoSemana` para mostrar el rango de fechas
- Elemento no existe en el HTML del calendario
- Función `actualizarRangoSemana()` falla al intentar actualizar el texto

**✅ Solución:**
```html
<!-- Agregar elemento rangoSemana en la sección del calendario -->
<div class="d-flex justify-content-between align-items-center">
    <div>
        <h6 class="mb-0" id="tituloCalendario">
            <i class="fas fa-calendar-week me-2"></i>Calendario Semanal
        </h6>
        <small class="text-muted" id="rangoSemana">Cargando...</small>
    </div>
    <!-- ... resto de controles ... -->
</div>
```

---

## 🔍 **COMANDOS DE DIAGNÓSTICO:**

### **Verificar elementos de la página de reservas:**
```javascript
// En consola del navegador
console.log('Elementos de filtros:');
console.log('complejoFilter:', document.getElementById('complejoFilter'));
console.log('estadoFilter:', document.getElementById('estadoFilter'));
console.log('tipoReservaFilter:', document.getElementById('tipoReservaFilter'));
console.log('fechaDesde:', document.getElementById('fechaDesde'));
console.log('fechaHasta:', document.getElementById('fechaHasta'));
console.log('ordenamientoFilter:', document.getElementById('ordenamientoFilter'));
```

### **Verificar elementos de usuario:**
```javascript
// En consola del navegador
console.log('Elementos de usuario:');
console.log('[data-user="name"]:', document.querySelector('[data-user="name"]'));
console.log('[data-user="role"]:', document.querySelector('[data-user="role"]'));
console.log('[data-user="complex"]:', document.querySelector('[data-user="complex"]'));
```

### **Verificar reservas en API:**
```bash
# Obtener todas las reservas
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reservas

# Obtener reservas de hoy
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reservas-hoy

# Obtener reservas recientes
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/reservas-recientes
```

---

## 📋 **CHECKLIST DE VERIFICACIÓN:**

### **Al cargar la página de reservas:**
- [ ] No hay errores de JavaScript en consola
- [ ] Mensaje "No se encontraron reservas" si no hay reservas
- [ ] Filtros funcionan correctamente (si existen)
- [ ] Información de usuario se muestra correctamente

### **Al crear una nueva reserva:**
- [ ] Modal se abre correctamente
- [ ] Campos se llenan correctamente
- [ ] Validación funciona
- [ ] Reserva se crea exitosamente

### **Al filtrar reservas:**
- [ ] Filtros se aplican correctamente
- [ ] Resultados se actualizan
- [ ] No hay errores en consola

---

## 🛠️ **SOLUCIONES RÁPIDAS:**

### **Si hay errores de elementos null:**
1. Verificar que elementos existan en HTML
2. Agregar verificaciones de null en JavaScript
3. Usar patrón de verificación de elementos

### **Si no hay reservas:**
1. Verificar base de datos
2. Crear reservas de prueba
3. Verificar permisos de usuario

### **Si filtros no funcionan:**
1. Verificar elementos de filtro en HTML
2. Agregar verificaciones de null
3. Configurar event listeners correctamente

---

## 📝 **PATRÓN DE VERIFICACIÓN DE ELEMENTOS:**

```javascript
// Patrón estándar para verificar elementos
function configurarElemento(id, callback) {
    const elemento = document.getElementById(id);
    if (elemento) {
        callback(elemento);
    } else {
        console.warn(`Elemento ${id} no encontrado`);
    }
}

// Uso del patrón
configurarElemento('tipoReservaFilter', (elemento) => {
    elemento.addEventListener('change', aplicarFiltros);
});

configurarElemento('modalComplejo', (elemento) => {
    elemento.addEventListener('change', cargarCanchasModal);
});
```

### **4. ERROR: Owner no puede ver reportes en sidebar de reservas/canchas** ✅ **RESUELTO**
**🔍 Síntomas:**
- Usuario owner ve reportes en dashboard pero no en páginas de reservas/canchas
- Al navegar a reservas o canchas, se oculta la sección de reportes
- CSS `hide-for-manager` oculta elementos para todos los usuarios

**🔧 Causa:**
- CSS `hide-for-manager` oculta elementos para todos los usuarios
- No hay lógica JavaScript para mostrar/ocultar según el rol específico
- Owner debería ver reportes pero no complejos

**✅ Solución:**
```javascript
// Modificar función aplicarPermisosPorRol() en admin-reservations.js y admin-courts.js
function aplicarPermisosPorRol() {
    const user = AdminUtils.getCurrentUser();
    if (!user) return;
    
    const userRole = user.rol;
    
    // Aplicar visibilidad del sidebar según el rol
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

**📋 Cambios realizados:**
1. Removido `hide-for-manager` de enlaces HTML en todas las páginas admin
2. Agregada lógica JavaScript para controlar visibilidad por rol
3. Owner: ve reportes pero no complejos
4. Manager: no ve reportes ni complejos
5. Super Admin: ve todo

---

## 🔄 **FLUJO DE RESERVAS:**

### **1. Cargar página de reservas:**
- Verificar autenticación
- Cargar información de usuario
- Configurar event listeners
- Cargar reservas iniciales

### **2. Aplicar filtros:**
- Verificar elementos de filtro
- Aplicar filtros a datos
- Actualizar tabla de reservas

### **3. Crear nueva reserva:**
- Abrir modal
- Cargar datos necesarios
- Validar formulario
- Enviar a API

---

## 📊 **ESTADOS DE RESERVA:**

- **Pendiente** - Reserva creada, pendiente de confirmación
- **Confirmada** - Reserva confirmada por admin
- **Cancelada** - Reserva cancelada
- **Completada** - Reserva completada

---

## 🎯 **PERMISOS POR ROL:**

### **MANAGER:**
- ✅ Ver reservas de su complejo
- ✅ Crear reservas
- ✅ Editar reservas
- ✅ Cancelar reservas

### **OWNER:**
- ✅ Ver reservas de su complejo
- ✅ Crear reservas
- ✅ Editar reservas
- ✅ Cancelar reservas
- ✅ Ver reportes de reservas

### **SUPER ADMIN:**
- ✅ Ver todas las reservas
- ✅ Gestionar reservas de todos los complejos
- ✅ Ver reportes globales

---

**✅ RESERVAS TROUBLESHOOTING COMPLETADO**

// Variables globales
let currentUser = null;
let courts = [];
let complexes = [];

// Función para formatear moneda chilena (punto como separador de miles)
function formatCurrencyChile(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0';
    }
    return amount.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN COURTS INICIALIZADO ===');
    
    // Verificar autenticación
    if (!AdminUtils.isAuthenticated()) {
        window.location.href = '../../admin-login.html';
        return;
    }
    
    // Mostrar información del usuario
    currentUser = AdminUtils.getCurrentUser();
    if (currentUser) {
        document.getElementById('adminWelcome').textContent = `Bienvenido, ${currentUser.nombre || 'Admin'}`;
        
        // Actualizar información del usuario en el sidebar (si los elementos existen)
        const nameElement = document.querySelector('[data-user="name"]');
        const roleElement = document.querySelector('[data-user="role"]');
        const complexElement = document.querySelector('[data-user="complex"]');
        
        if (nameElement) {
            nameElement.textContent = currentUser.nombre || 'Admin';
        }
        if (roleElement) {
            roleElement.textContent = AdminUtils.getRoleDisplayName(currentUser.rol);
        }
        if (complexElement) {
            complexElement.textContent = currentUser.complejo_nombre || 'Todos los complejos';
        }
    }
    
    // Aplicar permisos según el rol
    aplicarPermisosPorRol();
    
    // Aplicar sistema centralizado de roles de AdminUtils
    AdminUtils.hideElementsByRole();
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    loadComplexes();
    loadCourts();
    loadFilterTypes();
    setupEventListeners();
});

function aplicarPermisosPorRol() {
    const user = AdminUtils.getCurrentUser();
    if (!user) return;
    
    const userRole = user.rol;
    console.log('🔐 Aplicando permisos para rol:', userRole);
    
    // Aplicar visibilidad del sidebar según el rol
    const complejosLink = document.querySelector('a[href="admin-complexes.html"]');
    const reportesLink = document.querySelector('a[href="admin-reports.html"]');
    const gastosLink = document.querySelector('a[href="admin-gastos.html"]');
    
    if (userRole === 'manager') {
        // Managers no pueden ver complejos ni reportes ni gastos
        if (complejosLink) complejosLink.style.display = 'none';
        if (reportesLink) reportesLink.style.display = 'none';
        if (gastosLink) gastosLink.style.display = 'none';
        console.log('✅ Ocultados complejos, reportes y gastos para manager');
    } else if (userRole === 'owner') {
        // Owners pueden ver reportes y gastos pero no complejos (solo ven su propio complejo)
        if (complejosLink) complejosLink.style.display = 'none';
        if (reportesLink) {
            reportesLink.style.display = 'block';
            reportesLink.style.visibility = 'visible';
            reportesLink.classList.add('owner-visible');
            reportesLink.classList.remove('hide-for-manager');
        }
        if (gastosLink) {
            gastosLink.style.display = 'block';
            gastosLink.style.visibility = 'visible';
            gastosLink.classList.add('owner-visible');
            gastosLink.classList.remove('hide-for-manager');
            console.log('✅ Control Financiero configurado como visible para owner');
        }
        console.log('✅ Ocultados complejos, mostrados reportes y gastos para owner');
    } else if (userRole === 'super_admin') {
        // Super admin puede ver todo
        if (complejosLink) {
            complejosLink.style.display = 'block';
            complejosLink.style.visibility = 'visible';
        }
        if (reportesLink) {
            reportesLink.style.display = 'block';
            reportesLink.style.visibility = 'visible';
            reportesLink.classList.remove('hide-for-manager');
        }
        if (gastosLink) {
            gastosLink.style.display = 'block';
            gastosLink.style.visibility = 'visible';
            gastosLink.classList.remove('hide-for-manager');
        }
        console.log('✅ Mostrados todos los enlaces para super_admin');
    }
    
    // Ocultar elementos según el rol
    if (userRole === 'manager') {
        // Managers no pueden ver información financiera ni gestionar complejos/reportes
        document.querySelectorAll('[data-role="reports"]').forEach(element => {
            element.style.display = 'none';
        });
        document.querySelectorAll('[data-role="all-complexes"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar filtro de complejo para managers (solo ven su complejo)
        document.querySelectorAll('#filterComplex').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar botón de agregar cancha para managers
        const addButton = document.querySelector('button[data-bs-target="#courtModal"]');
        if (addButton) {
            addButton.style.display = 'none';
        }
        
        console.log('✅ Elementos ocultados para manager');
    } else if (userRole === 'owner') {
        // Owners no pueden gestionar complejos (solo ver su complejo)
        document.querySelectorAll('[data-role="all-complexes"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar filtro de complejo para owners (solo ven su complejo)
        document.querySelectorAll('#filterComplex').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar elementos específicos para owners (como gestión de depósitos)
        const ownerHiddenElements = document.querySelectorAll('.hide-for-owner');
        console.log(`🔍 Encontrados ${ownerHiddenElements.length} elementos para ocultar para owner`);
        ownerHiddenElements.forEach(element => {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
        });
        
        console.log('✅ Elementos ocultados para owner');
    } else if (userRole === 'super_admin') {
        // Super admins pueden ver todo - asegurar que todos los elementos estén visibles
        console.log('✅ Super admin - acceso completo');
        
        // Asegurar que todos los elementos estén visibles
        const allHiddenElements = document.querySelectorAll('.hide-for-manager, .hide-for-owner');
        console.log(`🔍 Asegurando visibilidad de ${allHiddenElements.length} elementos para super admin`);
        
        allHiddenElements.forEach((element, index) => {
            // Remover todas las clases de ocultación
            element.classList.remove('hide-for-manager');
            element.classList.remove('hide-for-owner');
            // Forzar visibilidad
            element.style.display = '';
            element.style.visibility = '';
            console.log(`✅ Elemento ${index + 1} configurado como visible para super admin`);
        });
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('searchCourt').addEventListener('input', function() {
        filterCourts();
    });
    
    // Filtro por tipo
    document.getElementById('filterType').addEventListener('change', function() {
        filterCourts();
    });
    
    // Filtro por complejo
    document.getElementById('filterComplex').addEventListener('change', function() {
        filterCourts();
    });
}

// Cargar complejos
async function loadComplexes() {
    try {
        // Solo cargar complejos si el usuario tiene permisos
        if (!AdminUtils.canViewAllComplexes() && currentUser.rol !== 'owner') {
            console.log('Usuario no tiene permisos para ver todos los complejos');
            return;
        }
        
        const token = localStorage.getItem('adminToken');
        console.log('🔍 Cargando complejos en admin-courts... VERSIÓN 3.8');
        const response = await AdminUtils.authenticatedFetch('/admin/complejos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Complejos cargados en admin-courts:', data);
            console.log('🔍 Tipo de datos:', typeof data);
            console.log('🔍 Es array?', Array.isArray(data));
            
            // Verificar si es un array o un objeto con array
            if (Array.isArray(data)) {
                complexes = data;
            } else if (data && Array.isArray(data.complejos)) {
                complexes = data.complejos;
            } else if (data && Array.isArray(data.data)) {
                complexes = data.data;
            } else {
                console.error('❌ Formato de datos inesperado:', data);
                complexes = [];
            }
            
            console.log('🔍 Complejos finales:', complexes);
            populateComplexSelect();
        } else {
            console.error('Error cargando complejos:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Poblar select de complejos
function populateComplexSelect() {
    const select = document.getElementById('courtComplex');
    select.innerHTML = '<option value="">Seleccionar complejo...</option>';
    
    // Verificar que complexes sea un array
    if (!Array.isArray(complexes)) {
        console.error('❌ complexes no es un array en populateComplexSelect:', complexes);
        return;
    }
    
    complexes.forEach(complex => {
        const option = document.createElement('option');
        option.value = complex.id;
        option.textContent = complex.nombre;
        select.appendChild(option);
    });
    
    // Agregar event listener para cambiar tipos cuando se selecciona un complejo
    select.addEventListener('change', function() {
        loadCourtTypesForComplex(this.value);
    });
    
    // También poblar el filtro de complejos
    populateComplexFilter();
}

// Poblar filtro de complejos
function populateComplexFilter() {
    const filterSelect = document.getElementById('filterComplex');
    filterSelect.innerHTML = '<option value="">Todos los complejos</option>';
    
    // Verificar que complexes sea un array
    if (!Array.isArray(complexes)) {
        console.error('❌ complexes no es un array en populateComplexFilter:', complexes);
        return;
    }
    
    // Filtrar complejos según el rol del usuario
    let availableComplexes = complexes;
    if (currentUser && currentUser.rol !== 'super_admin') {
        availableComplexes = complexes.filter(complex => complex.id == currentUser.complejo_id);
    }
    
    availableComplexes.forEach(complex => {
        const option = document.createElement('option');
        option.value = complex.id;
        option.textContent = complex.nombre;
        filterSelect.appendChild(option);
    });
}

// Cargar tipos disponibles para el filtro
async function loadFilterTypes() {
    try {
        const response = await AdminUtils.authenticatedFetch('/admin/canchas');
        if (response && response.ok) {
            const responseText = await response.text();
            console.log('📄 Respuesta raw para tipos:', responseText);
            try {
                const allCourts = JSON.parse(responseText);
                
                // Filtrar canchas según el rol del usuario
            let filteredCourts = allCourts;
            if (currentUser && currentUser.rol !== 'super_admin') {
                filteredCourts = allCourts.filter(court => court.complejo_id == currentUser.complejo_id);
            }
            
            // Obtener tipos únicos de canchas disponibles
            const availableTypes = [...new Set(filteredCourts.map(court => court.tipo))];
            
            // Actualizar el select de filtro
            const filterTypeSelect = document.getElementById('filterType');
            filterTypeSelect.innerHTML = '<option value="">Todos los tipos</option>';
            
            availableTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = capitalizeCourtType(type);
                filterTypeSelect.appendChild(option);
            });
            
                console.log('✅ Tipos de filtro cargados:', availableTypes);
            } catch (parseError) {
                console.error('❌ Error parseando JSON para tipos:', parseError);
                console.error('📄 Texto recibido:', responseText);
            }
        }
    } catch (error) {
        console.error('Error cargando tipos para filtro:', error);
    }
}

// Cargar tipos de cancha disponibles para un complejo específico
async function loadCourtTypesForComplex(complexId) {
    const typeSelect = document.getElementById('courtType');
    
    if (!complexId) {
        // Si no hay complejo seleccionado, mostrar opciones por defecto
        typeSelect.innerHTML = `
            <option value="">Seleccionar tipo...</option>
            <option value="padel">${capitalizeCourtType('padel')}</option>
            <option value="futbol">${capitalizeCourtType('futbol')}</option>
        `;
        return;
    }
    
    try {
        // Obtener canchas del complejo para determinar tipos disponibles
        const response = await AdminUtils.authenticatedFetch('/admin/canchas');
        if (response && response.ok) {
            const allCourts = await response.json();
            const complexCourts = allCourts.filter(court => court.complejo_id == complexId);
            
            // Obtener tipos únicos de canchas existentes en el complejo
            const existingTypes = [...new Set(complexCourts.map(court => court.tipo))];
            
            // Crear opciones basadas en tipos existentes
            typeSelect.innerHTML = '<option value="">Seleccionar tipo...</option>';
            
            // Si el complejo ya tiene canchas, mostrar solo esos tipos
            if (existingTypes.length > 0) {
                existingTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = capitalizeCourtType(type);
                    typeSelect.appendChild(option);
                });
            } else {
                // Si el complejo no tiene canchas, permitir cualquier tipo
                const option1 = document.createElement('option');
                option1.value = 'padel';
                option1.textContent = capitalizeCourtType('padel');
                typeSelect.appendChild(option1);
                
                const option2 = document.createElement('option');
                option2.value = 'futbol';
                option2.textContent = capitalizeCourtType('futbol');
                typeSelect.appendChild(option2);
            }
        }
    } catch (error) {
        console.error('Error cargando tipos de cancha:', error);
        // En caso de error, mostrar opciones por defecto
        typeSelect.innerHTML = `
            <option value="">Seleccionar tipo...</option>
            <option value="padel">${capitalizeCourtType('padel')}</option>
            <option value="futbol">${capitalizeCourtType('futbol')}</option>
        `;
    }
}

// Cargar canchas
async function loadCourts() {
    try {
        console.log('🔍 Cargando canchas...');
        const response = await AdminUtils.authenticatedFetch('/admin/canchas');
        console.log('📡 Respuesta recibida:', response);
        
        if (!response) {
            console.error('❌ No se recibió respuesta');
            return;
        }
        
        if (response.ok) {
            const responseText = await response.text();
            console.log('📄 Respuesta raw:', responseText);
            try {
                courts = JSON.parse(responseText);
                console.log('✅ Canchas cargadas:', courts);
                displayCourts(courts);
            } catch (parseError) {
                console.error('❌ Error parseando JSON:', parseError);
                console.error('📄 Texto recibido:', responseText);
            }
        } else {
            console.error('❌ Error cargando canchas:', response.statusText);
            document.getElementById('courtsList').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando canchas: ${response.statusText}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('courtsList').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error de conexión
            </div>
        `;
    }
}

// Mostrar canchas
function displayCourts(courtsToShow) {
    const container = document.getElementById('courtsList');
    
    if (courtsToShow.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No se encontraron canchas
            </div>
        `;
        return;
    }
    
    container.innerHTML = courtsToShow.map(court => `
        <div class="court-card">
            <div class="row">
                <div class="col-md-8">
                    <h5 class="mb-2">
                        <i class="fas fa-futbol me-2"></i>
                        ${court.nombre}
                    </h5>
                    <p class="text-muted mb-2">
                        <i class="fas fa-building me-2"></i>
                        ${getComplexName(court.complejo_id)}
                    </p>
                    <p class="mb-2">
                        <i class="fas fa-tag me-2"></i>
                        ${capitalizeCourtType(court.tipo)}
                    </p>
                    <p class="mb-0">
                        <i class="fas fa-dollar-sign me-2"></i>
                        ${court.precio_hora ? `$${formatCurrencyChile(court.precio_hora)} por hora` : 'Precio no disponible'}
                    </p>
                </div>
                <div class="col-md-4 text-end">
                    ${currentUser && currentUser.rol !== 'manager' ? `
                    <div class="btn-group-vertical" role="group">
                        <button class="btn btn-outline-primary btn-sm mb-2" onclick="openPromocionesModal(${court.id}, '${court.nombre.replace(/'/g, "\\'")}', ${court.precio_hora})">
                            <i class="fas fa-percent me-1"></i>
                            Promociones
                        </button>
                        <button class="btn btn-outline-warning btn-sm mb-2" onclick="editCourt(${court.id})">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteCourt(${court.id})">
                            <i class="fas fa-trash me-1"></i>
                            Eliminar
                        </button>
                    </div>
                    ` : `
                    <div class="text-muted">
                        <small>Solo lectura</small>
                    </div>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

// Capitalizar tipo de cancha
function capitalizeCourtType(type) {
    if (!type) return '';
    return type === 'padel' ? 'Padel' : 'Fútbol';
}

// Obtener nombre de complejo
function getComplexName(complexId) {
    // Si el usuario es manager o owner y no tiene acceso a complejos, usar su complejo_nombre
    if (currentUser && (currentUser.rol === 'manager' || currentUser.rol === 'owner') && currentUser.complejo_nombre) {
        return currentUser.complejo_nombre;
    }
    
    // Verificar que complexes sea un array
    if (!Array.isArray(complexes)) {
        console.error('❌ complexes no es un array en getComplexName:', complexes);
        return 'Complejo no encontrado';
    }
    
    const complex = complexes.find(c => c.id === complexId);
    return complex ? complex.nombre : 'Complejo no encontrado';
}

// Filtrar canchas
function filterCourts() {
    const searchTerm = document.getElementById('searchCourt').value.toLowerCase();
    const typeFilter = document.getElementById('filterType').value;
    const complexFilter = document.getElementById('filterComplex').value;
    
    let filtered = courts.filter(court => {
        // Filtro por búsqueda de texto
        const matchesSearch = !searchTerm || 
            court.nombre.toLowerCase().includes(searchTerm) ||
            getComplexName(court.complejo_id).toLowerCase().includes(searchTerm) ||
            court.tipo.toLowerCase().includes(searchTerm);
        
        // Filtro por tipo
        const matchesType = !typeFilter || court.tipo === typeFilter;
        
        // Filtro por complejo
        const matchesComplex = !complexFilter || court.complejo_id == complexFilter;
        
        return matchesSearch && matchesType && matchesComplex;
    });
    
    displayCourts(filtered);
}

// Abrir modal para agregar cancha
function openCourtModal(courtId = null) {
    const modal = document.getElementById('courtModal');
    const modalTitle = document.getElementById('courtModalTitle');
    const form = document.getElementById('courtForm');
    
    if (courtId) {
        modalTitle.textContent = 'Editar Cancha';
        loadCourtData(courtId);
    } else {
        modalTitle.textContent = 'Agregar Nueva Cancha';
        form.reset();
        
        // Limpiar el dataset del modal para nueva cancha
        modal.dataset.courtId = '';
        
        // Si es un manager, preseleccionar su complejo y cargar tipos
        if (currentUser && currentUser.rol === 'manager') {
            const complexSelect = document.getElementById('courtComplex');
            complexSelect.value = currentUser.complejo_id;
            loadCourtTypesForComplex(currentUser.complejo_id);
        }
    }
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Cargar datos de la cancha para editar
async function loadCourtData(courtId) {
    try {
        const court = courts.find(c => c.id === courtId);
        if (court) {
            // Configurar el dataset del modal con el ID de la cancha
            document.getElementById('courtModal').dataset.courtId = courtId;
            
            document.getElementById('courtName').value = court.nombre;
            document.getElementById('courtComplex').value = court.complejo_id;
            document.getElementById('courtPrice').value = court.precio_hora;
            document.getElementById('courtDescription').value = court.descripcion || '';
            
            // Cargar tipos disponibles para el complejo y seleccionar el tipo actual
            await loadCourtTypesForComplex(court.complejo_id);
            document.getElementById('courtType').value = court.tipo;
        }
    } catch (error) {
        console.error('Error cargando datos de la cancha:', error);
    }
}

// Guardar cancha
async function saveCourt() {
    // Validar formulario
    const form = document.getElementById('courtForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const courtData = {
        nombre: document.getElementById('courtName').value,
        complejo_id: parseInt(document.getElementById('courtComplex').value),
        tipo: document.getElementById('courtType').value,
        precio_hora: parseFloat(document.getElementById('courtPrice').value),
        descripcion: document.getElementById('courtDescription').value
    };
    
    const courtId = document.getElementById('courtModal').dataset.courtId;
    const isEdit = !!courtId;
    
    console.log('🔍 Guardando cancha:', { courtId, isEdit, courtData });
    
    try {
        // Verificar token
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showNotification('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
            window.location.href = '../../admin-login.html';
            return;
        }
        
        const url = isEdit ? `/admin/canchas/${courtId}` : `/admin/canchas`;
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log('Enviando solicitud:', { url, method, courtData });
        
        const response = await AdminUtils.authenticatedFetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(courtData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(
                isEdit ? 'Cancha actualizada exitosamente' : 'Cancha creada exitosamente',
                'success'
            );
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('courtModal'));
            modal.hide();
            
            // Recargar lista
            loadCourts();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error al guardar la cancha', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Editar cancha
function editCourt(courtId) {
    openCourtModal(courtId);
}

// Eliminar cancha
async function deleteCourt(courtId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cancha?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await AdminUtils.authenticatedFetch(`/admin/canchas/${courtId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Cancha eliminada exitosamente', 'success');
            loadCourts();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error al eliminar la cancha', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Mostrar notificación
function showNotification(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        <i class="fas ${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '../../admin-login.html';
}

// Función para forzar la visibilidad de elementos críticos (se ejecuta periódicamente)
function forzarVisibilidadElementos() {
    const user = AdminUtils.getCurrentUser();
    if (user && (user.rol === 'owner' || user.rol === 'super_admin')) {
        // Forzar visibilidad de enlaces críticos
        const elementosCriticos = [
            'a[href="admin-reports.html"]',
            'a[href="admin-gastos.html"]'
        ];
        
        elementosCriticos.forEach(selector => {
            const elementos = document.querySelectorAll(selector);
            elementos.forEach(elemento => {
                elemento.classList.add('owner-visible');
                elemento.classList.remove('hide-for-owner');
                elemento.style.display = 'block';
                elemento.style.visibility = 'visible';
                elemento.style.opacity = '1';
            });
        });
    }
}

// Ejecutar la función de visibilidad cada 2 segundos para asegurar que los elementos estén visibles
setInterval(forzarVisibilidadElementos, 2000);

// ============================================
// SISTEMA DE PROMOCIONES Y PRECIOS DINÁMICOS
// ============================================

let currentCanchaPromocion = null;
let currentCanchaNombre = '';
let currentCanchaPrecio = 0;
let currentPromocionEdit = null;

/**
 * Abrir modal de gestión de promociones para una cancha
 */
async function openPromocionesModal(canchaId, canchaNombre, canchaPrecio) {
    currentCanchaPromocion = canchaId;
    currentCanchaNombre = canchaNombre;
    currentCanchaPrecio = canchaPrecio;
    currentPromocionEdit = null;
    
    // Verificar que los elementos existan
    const modalElement = document.getElementById('promocionesModal');
    const subtitleElement = document.getElementById('promocionesModalSubtitle');
    const listContainer = document.getElementById('promocionesListContainer');
    const formContainer = document.getElementById('promocionFormContainer');
    
    if (!modalElement || !subtitleElement || !listContainer || !formContainer) {
        console.error('❌ Elementos del modal de promociones no encontrados. Recarga la página.');
        showNotification('Error: Elementos del modal no encontrados. Por favor, recarga la página.', 'error');
        return;
    }
    
    // Actualizar título del modal
    subtitleElement.textContent = `Cancha: ${canchaNombre} - Precio normal: $${formatCurrencyChile(canchaPrecio)}`;
    
    // Poblar selectores de hora con horarios del complejo
    poblarHorariosComplejo();
    
    // Configurar auto-cierre de calendarios
    configurarAutoCloseDatePickers();
    
    // Inicializar estado de campos (required, visibility)
    setTimeout(() => {
        if (typeof updatePromocionFields === 'function') {
            updatePromocionFields();
        }
    }, 100);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Ocultar formulario y mostrar lista
    formContainer.style.display = 'none';
    listContainer.style.display = 'block';
    
    // Cargar promociones
    await loadPromociones();
}

/**
 * Poblar selectores de hora con los horarios disponibles del complejo
 */
function poblarHorariosComplejo() {
    // Obtener usuario para saber el complejo
    const user = AdminUtils.getCurrentUser();
    const complejoId = user?.complejo_id;
    
    // Determinar horario según complejo
    let horaInicio = 12;
    let horaFin = 23;

    if (complejoId === 6 || complejoId === 7) {
        // Espacio Deportivo Borde Río: 10:00 - 00:00 (medianoche)
        // ID 6 en desarrollo, ID 7 en producción
        horaInicio = 10;
        horaFin = 24;
    } else if (complejoId === 8) {
        // Complejo Demo 3: 16:00 - 23:00
        horaInicio = 16;
        horaFin = 23;
    }
    
    // Generar opciones de horario
    const horariosOptions = [];
    for (let hora = horaInicio; hora <= horaFin; hora++) {
        const horaFormateada = hora.toString().padStart(2, '0') + ':00';
        horariosOptions.push(`<option value="${horaFormateada}">${horaFormateada}</option>`);
    }
    
    // Poblar selectores
    const selectores = ['horaEspecifica', 'horaInicio', 'horaFin'];
    selectores.forEach(id => {
        const selector = document.getElementById(id);
        if (selector) {
            const valorActual = selector.value;
            selector.innerHTML = '<option value="">Selecciona una hora...</option>' + horariosOptions.join('');
            if (valorActual) selector.value = valorActual;
        }
    });
}

/**
 * Configurar auto-cierre de date pickers al seleccionar fecha
 */
function configurarAutoCloseDatePickers() {
    const dateInputs = document.querySelectorAll('.date-auto-close');
    dateInputs.forEach(input => {
        // Remover listeners previos
        input.removeEventListener('change', cerrarDatePicker);
        // Agregar nuevo listener
        input.addEventListener('change', cerrarDatePicker);
    });
}

/**
 * Cerrar date picker al seleccionar fecha
 */
function cerrarDatePicker(event) {
    event.target.blur(); // Quitar foco del input para cerrar el calendario
}

/**
 * Cargar promociones de la cancha actual
 */
async function loadPromociones() {
    const container = document.getElementById('promocionesListContainer');
    container.innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
            <p>Cargando promociones...</p>
        </div>
    `;
    
    try {
        const response = await AdminUtils.authenticatedFetch(`/promociones/cancha/${currentCanchaPromocion}`);
        
        if (!response.ok) {
            // Si el endpoint no existe o retorna error, mostrar lista vacía
            console.log('⚠️ Endpoint de promociones no disponible (código:', response.status, ')');
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay promociones configuradas para esta cancha. Haz clic en "Nueva Promoción" para crear una.
                </div>
            `;
            return;
        }
        
        // Intentar parsear respuesta como JSON
        let promociones;
        try {
            promociones = await response.json();
        } catch (jsonError) {
            console.log('⚠️ Respuesta no es JSON válido, asumiendo lista vacía');
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay promociones configuradas para esta cancha. Haz clic en "Nueva Promoción" para crear una.
                </div>
            `;
            return;
        }
        
        if (promociones.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay promociones configuradas para esta cancha. Haz clic en "Nueva Promoción" para crear una.
                </div>
            `;
            return;
        }
        
        // Renderizar lista de promociones
        container.innerHTML = promociones.map(promo => {
            const descuento = currentCanchaPrecio - promo.precio_promocional;
            const porcentaje = Math.round((descuento / currentCanchaPrecio) * 100);
            
            return `
                <div class="card mb-3 ${!promo.activo ? 'border-secondary' : 'border-success'}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-2">
                                    ${promo.nombre || 'Promoción sin nombre'}
                                    ${!promo.activo ? '<span class="badge bg-secondary ms-2">Inactiva</span>' : '<span class="badge bg-success ms-2">Activa</span>'}
                                </h6>
                                <p class="mb-2">
                                    <strong class="text-success">$${formatCurrencyChile(promo.precio_promocional)}</strong>
                                    <span class="text-muted ms-2">(${porcentaje}% desc.)</span>
                                </p>
                                <div class="text-muted small">
                                    <div><i class="fas fa-calendar me-1"></i>${formatPromocionFechas(promo)}</div>
                                    <div><i class="fas fa-clock me-1"></i>${formatPromocionHorarios(promo)}</div>
                                    ${promo.descripcion ? `<div class="mt-1"><i class="fas fa-info-circle me-1"></i>${promo.descripcion}</div>` : ''}
                                </div>
                            </div>
                            <div class="btn-group-vertical ms-3">
                                <button class="btn btn-sm btn-outline-${promo.activo ? 'warning' : 'success'}" onclick="togglePromocionActiva(${promo.id}, ${!promo.activo})">
                                    <i class="fas fa-${promo.activo ? 'pause' : 'play'} me-1"></i>${promo.activo ? 'Desactivar' : 'Activar'}
                                </button>
                                <button class="btn btn-sm btn-outline-primary" onclick="editPromocion(${promo.id})">
                                    <i class="fas fa-edit me-1"></i>Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="deletePromocion(${promo.id}, '${(promo.nombre || 'esta promoción').replace(/'/g, "\\'")}')">
                                    <i class="fas fa-trash me-1"></i>Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando promociones:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error cargando promociones. Por favor, intenta nuevamente.
            </div>
        `;
    }
}

/**
 * Formatear información de fechas para mostrar
 */
function formatPromocionFechas(promo) {
    if (promo.tipo_fecha === 'especifico' && promo.fecha_especifica) {
        // Manejar tanto string YYYY-MM-DD como objeto Date de PostgreSQL
        let fechaStr = promo.fecha_especifica;
        if (typeof fechaStr === 'object') {
            fechaStr = fechaStr.toISOString().split('T')[0];
        } else if (fechaStr.includes('T')) {
            fechaStr = fechaStr.split('T')[0];
        }
        return `Fecha específica: ${fechaStr}`;
    } else if (promo.tipo_fecha === 'rango' && promo.fecha_inicio && promo.fecha_fin) {
        let inicioStr = promo.fecha_inicio;
        let finStr = promo.fecha_fin;
        if (typeof inicioStr === 'object') inicioStr = inicioStr.toISOString().split('T')[0];
        else if (inicioStr.includes('T')) inicioStr = inicioStr.split('T')[0];
        if (typeof finStr === 'object') finStr = finStr.toISOString().split('T')[0];
        else if (finStr.includes('T')) finStr = finStr.split('T')[0];
        return `Del ${inicioStr} al ${finStr}`;
    } else if (promo.tipo_fecha === 'recurrente_semanal' && promo.dias_semana) {
        let dias;
        try {
            dias = Array.isArray(promo.dias_semana) ? promo.dias_semana : JSON.parse(promo.dias_semana || '[]');
        } catch (e) {
            console.error('Error parseando dias_semana:', promo.dias_semana, e);
            dias = [];
        }
        return `Recurrente: ${dias.join(', ')}`;
    }
    return 'Fechas no especificadas';
}

/**
 * Formatear información de horarios para mostrar
 */
function formatPromocionHorarios(promo) {
    if (promo.tipo_horario === 'especifico') {
        return `Hora: ${promo.hora_especifica.substring(0, 5)}`;
    } else if (promo.tipo_horario === 'rango') {
        return `De ${promo.hora_inicio.substring(0, 5)} a ${promo.hora_fin.substring(0, 5)}`;
    }
    return 'Horarios no especificados';
}

/**
 * Abrir formulario para crear nueva promoción
 */
function openPromocionForm() {
    currentPromocionEdit = null;
    
    // Limpiar formulario
    document.getElementById('promocionForm').reset();
    document.getElementById('promocionId').value = '';
    document.getElementById('promocionCanchaId').value = currentCanchaPromocion;
    
    // Actualizar título
    document.getElementById('promocionFormTitle').innerHTML = 
        '<i class="fas fa-plus-circle me-2"></i>Nueva Promoción';
    
    // Mostrar precio normal
    document.getElementById('precioNormalLabel').textContent = 
        `(Normal: $${formatCurrencyChile(currentCanchaPrecio)})`;
    
    // Configurar fecha mínima (7 días de anticipación)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    const minDateStr = minDate.toISOString().split('T')[0];
    document.getElementById('fechaEspecifica').min = minDateStr;
    document.getElementById('fechaInicio').min = minDateStr;
    document.getElementById('fechaFin').min = minDateStr;
    
    // Mostrar formulario, ocultar lista
    document.getElementById('promocionesListContainer').style.display = 'none';
    document.getElementById('promocionFormContainer').style.display = 'block';
    
    // Configurar campos condicionales iniciales
    updatePromocionFields();
}

/**
 * Cancelar edición/creación de promoción
 */
function cancelPromocionForm() {
    document.getElementById('promocionFormContainer').style.display = 'none';
    document.getElementById('promocionesListContainer').style.display = 'block';
}

/**
 * Actualizar campos del formulario según tipo seleccionado
 */
function updatePromocionFields() {
    const tipoFecha = document.querySelector('input[name="tipoFecha"]:checked').value;
    const tipoHorario = document.querySelector('input[name="tipoHorario"]:checked').value;
    
    // Mostrar/ocultar campos de fecha
    document.getElementById('fechaEspecificoContainer').style.display = 
        tipoFecha === 'especifico' ? 'block' : 'none';
    document.getElementById('fechaRangoContainer').style.display = 
        tipoFecha === 'rango' ? 'block' : 'none';
    document.getElementById('fechaRecurrenteContainer').style.display = 
        tipoFecha === 'recurrente_semanal' ? 'block' : 'none';
    
    // Mostrar/ocultar campos de horario y manejar required
    const horaEspecifica = document.getElementById('horaEspecifica');
    const horaInicio = document.getElementById('horaInicio');
    const horaFin = document.getElementById('horaFin');
    
    if (tipoHorario === 'especifico') {
        document.getElementById('horarioEspecificoContainer').style.display = 'block';
        document.getElementById('horarioRangoContainer').style.display = 'none';
        // Manejar required
        if (horaEspecifica) horaEspecifica.required = true;
        if (horaInicio) horaInicio.required = false;
        if (horaFin) horaFin.required = false;
    } else {
        document.getElementById('horarioEspecificoContainer').style.display = 'none';
        document.getElementById('horarioRangoContainer').style.display = 'block';
        // Manejar required
        if (horaEspecifica) horaEspecifica.required = false;
        if (horaInicio) horaInicio.required = true;
        if (horaFin) horaFin.required = true;
    }
}

// Event listeners para cambios en tipo de fecha/horario
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que los radio buttons estén disponibles
    setTimeout(() => {
        const tipoFechaRadios = document.querySelectorAll('input[name="tipoFecha"]');
        const tipoHorarioRadios = document.querySelectorAll('input[name="tipoHorario"]');
        
        tipoFechaRadios.forEach(radio => {
            radio.addEventListener('change', updatePromocionFields);
        });
        
        tipoHorarioRadios.forEach(radio => {
            radio.addEventListener('change', updatePromocionFields);
        });
        
        // Manejar submit del formulario
        const form = document.getElementById('promocionForm');
        if (form) {
            form.addEventListener('submit', savePromocion);
        }
    }, 1000);
});

/**
 * Guardar promoción (crear o editar)
 */
async function savePromocion(e) {
    e.preventDefault();
    
    const tipoFecha = document.querySelector('input[name="tipoFecha"]:checked').value;
    const tipoHorario = document.querySelector('input[name="tipoHorario"]:checked').value;
    
    // Recopilar datos del formulario
    const data = {
        cancha_id: currentCanchaPromocion,
        nombre: document.getElementById('promocionNombre').value.trim(),
        precio_promocional: parseFloat(document.getElementById('promocionPrecio').value),
        tipo_fecha: tipoFecha,
        tipo_horario: tipoHorario,
        descripcion: document.getElementById('promocionDescripcion').value.trim() || null
    };
    
    // Validar precio
    if (data.precio_promocional >= currentCanchaPrecio) {
        showNotification('El precio promocional debe ser menor que el precio normal de la cancha', 'error');
        return;
    }
    
    // Agregar campos según tipo de fecha
    if (tipoFecha === 'especifico') {
        data.fecha_especifica = document.getElementById('fechaEspecifica').value;
        if (!data.fecha_especifica) {
            showNotification('Por favor, selecciona una fecha específica', 'error');
            return;
        }
    } else if (tipoFecha === 'rango') {
        data.fecha_inicio = document.getElementById('fechaInicio').value;
        data.fecha_fin = document.getElementById('fechaFin').value;
        if (!data.fecha_inicio || !data.fecha_fin) {
            showNotification('Por favor, selecciona las fechas de inicio y fin', 'error');
            return;
        }
        if (data.fecha_inicio > data.fecha_fin) {
            showNotification('La fecha de inicio debe ser anterior a la fecha de fin', 'error');
            return;
        }
    } else if (tipoFecha === 'recurrente_semanal') {
        // Recopilar días seleccionados
        const dias = [];
        ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].forEach(dia => {
            const checkbox = document.getElementById(`dia${dia.charAt(0).toUpperCase() + dia.slice(1)}`);
            if (checkbox && checkbox.checked) {
                dias.push(dia);
            }
        });
        
        if (dias.length === 0) {
            showNotification('Por favor, selecciona al menos un día de la semana', 'error');
            return;
        }
        
        data.dias_semana = dias;
    }
    
    // Agregar campos según tipo de horario
    if (tipoHorario === 'especifico') {
        data.hora_especifica = document.getElementById('horaEspecifica').value;
        if (!data.hora_especifica) {
            showNotification('Por favor, selecciona una hora específica', 'error');
            return;
        }
    } else if (tipoHorario === 'rango') {
        data.hora_inicio = document.getElementById('horaInicio').value;
        data.hora_fin = document.getElementById('horaFin').value;
        if (!data.hora_inicio || !data.hora_fin) {
            showNotification('Por favor, selecciona las horas de inicio y fin', 'error');
            return;
        }
        if (data.hora_inicio >= data.hora_fin) {
            showNotification('La hora de inicio debe ser anterior a la hora de fin', 'error');
            return;
        }
    }
    
    // Determinar si es creación o edición
    const promocionId = document.getElementById('promocionId').value;
    const isEdit = promocionId !== '';
    const url = isEdit ? `/promociones/${promocionId}` : '/promociones';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await AdminUtils.authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            console.log('⚠️ Error del servidor (código:', response.status, ')');
            if (response.status === 404) {
                showNotification('El sistema de promociones aún no está disponible. Próximamente.', 'info');
            } else {
                showNotification('Error al guardar promoción. Código: ' + response.status, 'error');
            }
            return;
        }
        
        // Intentar parsear respuesta
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            console.log('⚠️ Respuesta no es JSON válido');
            showNotification('Error en la respuesta del servidor', 'error');
            return;
        }
        
        showNotification(result.mensaje || `Promoción ${isEdit ? 'actualizada' : 'creada'} exitosamente`, 'success');
        
        // Recargar lista
        cancelPromocionForm();
        await loadPromociones();
        
    } catch (error) {
        console.error('Error guardando promoción:', error);
        showNotification('Error de conexión al guardar promoción', 'error');
    }
}

/**
 * Editar una promoción existente
 */
async function editPromocion(promocionId) {
    try {
        // Cargar datos de la promoción
        const response = await AdminUtils.authenticatedFetch(`/promociones/cancha/${currentCanchaPromocion}`);
        const promociones = await response.json();
        const promo = promociones.find(p => p.id === promocionId);
        
        if (!promo) {
            showNotification('Promoción no encontrada', 'error');
            return;
        }
        
        currentPromocionEdit = promo;
        
        // Llenar formulario
        document.getElementById('promocionId').value = promo.id;
        document.getElementById('promocionCanchaId').value = currentCanchaPromocion;
        document.getElementById('promocionNombre').value = promo.nombre || '';
        document.getElementById('promocionPrecio').value = promo.precio_promocional;
        document.getElementById('promocionDescripcion').value = promo.descripcion || '';
        
        // Seleccionar tipo de fecha
        document.getElementById(`tipoFecha${promo.tipo_fecha.charAt(0).toUpperCase() + promo.tipo_fecha.slice(1).replace('_semanal', '').replace('recurrente', 'Recurrente')}`).checked = true;
        
        // Llenar campos de fecha
        if (promo.tipo_fecha === 'especifico') {
            document.getElementById('fechaEspecifica').value = promo.fecha_especifica;
        } else if (promo.tipo_fecha === 'rango') {
            document.getElementById('fechaInicio').value = promo.fecha_inicio;
            document.getElementById('fechaFin').value = promo.fecha_fin;
        } else if (promo.tipo_fecha === 'recurrente_semanal') {
            // Parsear dias_semana correctamente
            let diasSemana = [];
            try {
                if (Array.isArray(promo.dias_semana)) {
                    diasSemana = promo.dias_semana;
                } else if (typeof promo.dias_semana === 'string') {
                    diasSemana = JSON.parse(promo.dias_semana || '[]');
                }
            } catch (e) {
                console.error('Error parseando dias_semana:', promo.dias_semana, e);
                diasSemana = [];
            }
            
            diasSemana.forEach(dia => {
                const checkbox = document.getElementById(`dia${dia.charAt(0).toUpperCase() + dia.slice(1)}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Seleccionar tipo de horario
        document.getElementById(`tipoHorario${promo.tipo_horario.charAt(0).toUpperCase() + promo.tipo_horario.slice(1)}`).checked = true;
        
        // Llenar campos de horario
        if (promo.tipo_horario === 'especifico') {
            document.getElementById('horaEspecifica').value = promo.hora_especifica.substring(0, 5);
        } else if (promo.tipo_horario === 'rango') {
            document.getElementById('horaInicio').value = promo.hora_inicio.substring(0, 5);
            document.getElementById('horaFin').value = promo.hora_fin.substring(0, 5);
        }
        
        // Actualizar campos visibles
        updatePromocionFields();
        
        // Actualizar título
        document.getElementById('promocionFormTitle').innerHTML = 
            '<i class="fas fa-edit me-2"></i>Editar Promoción';
        
        // Mostrar precio normal
        document.getElementById('precioNormalLabel').textContent = 
            `(Normal: $${formatCurrencyChile(currentCanchaPrecio)})`;
        
        // Mostrar formulario
        document.getElementById('promocionesListContainer').style.display = 'none';
        document.getElementById('promocionFormContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error cargando promoción para editar:', error);
        showNotification('Error cargando datos de la promoción', 'error');
    }
}

/**
 * Eliminar una promoción
 */
async function deletePromocion(promocionId, nombrePromocion) {
    const confirmar = confirm(`¿Estás seguro de eliminar la promoción "${nombrePromocion}"?`);
    
    if (!confirmar) return;
    
    try {
        const response = await AdminUtils.authenticatedFetch(`/promociones/${promocionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Promoción eliminada exitosamente', 'success');
            await loadPromociones();
        } else {
            showNotification(result.error || 'Error al eliminar promoción', 'error');
        }
    } catch (error) {
        console.error('Error eliminando promoción:', error);
        showNotification('Error de conexión al eliminar promoción', 'error');
    }
}

/**
 * Activar/Desactivar una promoción
 */
async function togglePromocionActiva(promocionId, nuevoEstado) {
    try {
        const response = await AdminUtils.authenticatedFetch(`/promociones/${promocionId}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`Promoción ${nuevoEstado ? 'activada' : 'desactivada'} exitosamente`, 'success');
            await loadPromociones();
        } else {
            showNotification(result.error || 'Error al cambiar estado de promoción', 'error');
        }
    } catch (error) {
        console.error('Error cambiando estado de promoción:', error);
        showNotification('Error de conexión al cambiar estado', 'error');
    }
}
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
        console.log('🔍 Cargando complejos en admin-courts... VERSIÓN 3.12');
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
                    ${currentUser && (currentUser.rol === 'owner' || currentUser.rol === 'manager') ? `
                    <div class="btn-group-vertical" role="group">
                        <button class="btn btn-outline-primary btn-sm mb-2" onclick="openPromocionesModal(${court.id}, '${court.nombre.replace(/'/g, "\\'")}', ${court.precio_hora})">
                            <i class="fas fa-percent me-1"></i>
                            Promociones
                        </button>
                        <button class="btn btn-outline-secondary btn-sm mb-2" onclick="openBloqueosModal(${court.id}, '${court.nombre.replace(/'/g, "\\'")}')">
                            <i class="fas fa-ban me-1"></i>
                            Bloqueos
                        </button>
                        ${currentUser.rol === 'owner' ? `
                        <button class="btn btn-outline-warning btn-sm mb-2" onclick="editCourt(${court.id})">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteCourt(${court.id})">
                            <i class="fas fa-trash me-1"></i>
                            Eliminar
                        </button>
                        ` : ''}
                    </div>
                    ` : currentUser && currentUser.rol === 'super_admin' ? `
                    <div class="btn-group-vertical" role="group">
                        <button class="btn btn-outline-primary btn-sm mb-2" onclick="openPromocionesModal(${court.id}, '${court.nombre.replace(/'/g, "\\'")}', ${court.precio_hora})">
                            <i class="fas fa-percent me-1"></i>
                            Promociones
                        </button>
                        <button class="btn btn-outline-secondary btn-sm mb-2" onclick="openBloqueosModal(${court.id}, '${court.nombre.replace(/'/g, "\\'")}')">
                            <i class="fas fa-ban me-1"></i>
                            Bloqueos
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
 * Parsear dias_semana desde formato PostgreSQL TEXT[] o JSON
 * PostgreSQL devuelve arrays como: {"lunes","martes"} que NO es JSON válido
 */
function parsearDiasSemana(dias_semana) {
    if (Array.isArray(dias_semana)) {
        return dias_semana;
    }
    
    if (typeof dias_semana !== 'string') {
        return [];
    }
    
    // Intentar parsear como formato PostgreSQL TEXT[]: {"lunes","martes"}
    if (dias_semana.startsWith('{') && dias_semana.endsWith('}')) {
        try {
            // Remover llaves externas y dividir por comas
            const contenido = dias_semana.slice(1, -1);
            if (!contenido.trim()) {
                return [];
            }
            
            // Dividir por comas y limpiar comillas
            const dias = contenido
                .split(',')
                .map(dia => dia.trim().replace(/^["']|["']$/g, ''))
                .filter(dia => dia.length > 0);
            
            return dias;
        } catch (e) {
            console.error('Error parseando formato PostgreSQL:', dias_semana, e);
        }
    }
    
    // Intentar parsear como JSON válido
    try {
        return JSON.parse(dias_semana || '[]');
    } catch (e) {
        console.error('Error parseando dias_semana como JSON:', dias_semana, e);
        return [];
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
        const dias = parsearDiasSemana(promo.dias_semana);
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
            // Normalizar el nombre del día (remover acentos) para buscar el ID del checkbox
            const diaNormalizado = dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const checkboxId = `dia${diaNormalizado.charAt(0).toUpperCase() + diaNormalizado.slice(1)}`;
            const checkbox = document.getElementById(checkboxId);
            
            console.log('🔍 DEBUG savePromocion - Verificando checkbox:', {
                diaOriginal: dia,
                diaNormalizado: diaNormalizado,
                checkboxId: checkboxId,
                encontrado: !!checkbox,
                checked: checkbox?.checked
            });
            
            if (checkbox && checkbox.checked) {
                // Guardar el nombre original del día (con acento) para consistencia con la base de datos
                dias.push(dia);
                console.log('✅ Día agregado a la lista:', dia);
            }
        });
        
        console.log('📋 DEBUG savePromocion - Días seleccionados finales:', dias);
        
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
            // Parsear dias_semana correctamente usando la función auxiliar
            const diasSemana = parsearDiasSemana(promo.dias_semana);
            console.log('🔍 DEBUG editPromocion - dias_semana parseado:', diasSemana);
            
            diasSemana.forEach(dia => {
                // Normalizar el nombre del día (remover acentos para los IDs)
                const diaNormalizado = dia.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const checkboxId = `dia${diaNormalizado.charAt(0).toUpperCase() + diaNormalizado.slice(1)}`;
                console.log('🔍 DEBUG editPromocion - Buscando checkbox:', {
                    diaOriginal: dia,
                    diaNormalizado: diaNormalizado,
                    checkboxId: checkboxId
                });
                
                const checkbox = document.getElementById(checkboxId);
                if (checkbox) {
                    checkbox.checked = true;
                    console.log('✅ Checkbox marcado:', checkboxId);
                } else {
                    console.warn('⚠️ Checkbox no encontrado:', checkboxId);
                    // Intentar con el ID original (con acentos)
                    const checkboxIdOriginal = `dia${dia.charAt(0).toUpperCase() + dia.slice(1)}`;
                    const checkboxOriginal = document.getElementById(checkboxIdOriginal);
                    if (checkboxOriginal) {
                        checkboxOriginal.checked = true;
                        console.log('✅ Checkbox marcado con ID original:', checkboxIdOriginal);
                    } else {
                        console.error('❌ Checkbox no encontrado ni con ID normalizado ni con ID original');
                    }
                }
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

// ============================================
// SISTEMA DE BLOQUEOS DE CANCHAS
// ============================================

let currentCanchaBloqueo = null;
let currentCanchaBloqueoNombre = '';
let currentBloqueoEdit = null;

/**
 * Abrir modal de gestión de bloqueos para una cancha
 */
async function openBloqueosModal(canchaId, canchaNombre) {
    currentCanchaBloqueo = canchaId;
    currentCanchaBloqueoNombre = canchaNombre;
    currentBloqueoEdit = null;
    
    // Verificar que los elementos existan
    const modalElement = document.getElementById('bloqueosModal');
    const subtitleElement = document.getElementById('bloqueosModalSubtitle');
    const listContainer = document.getElementById('bloqueosListContainer');
    const formContainer = document.getElementById('bloqueoFormContainer');
    
    if (!modalElement || !subtitleElement || !listContainer || !formContainer) {
        console.error('❌ Elementos del modal de bloqueos no encontrados. Recarga la página.');
        showNotification('Error: Elementos del modal no encontrados. Por favor, recarga la página.', 'error');
        return;
    }
    
    // Actualizar título del modal
    subtitleElement.textContent = `Cancha: ${canchaNombre}`;
    
    // Poblar selectores de hora con horarios del complejo
    poblarHorariosBloqueos();
    
    // Configurar eventos de formulario
    configurarBloqueoFormEvents();
    
    // Mostrar modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Ocultar formulario y mostrar lista
    formContainer.style.display = 'none';
    listContainer.style.display = 'block';
    
    // Cargar bloqueos
    await loadBloqueos();
}

/**
 * Poblar selectores de hora para bloqueos
 */
function poblarHorariosBloqueos() {
    // Obtener usuario para saber el complejo
    const user = AdminUtils.getCurrentUser();
    const complejoId = user?.complejo_id;
    
    // Determinar horario según complejo
    let horaInicio = 12;
    let horaFin = 23;

    if (complejoId === 6 || complejoId === 7) {
        horaInicio = 10;
        horaFin = 24;
    } else if (complejoId === 8) {
        horaInicio = 16;
        horaFin = 23;
    }
    
    // Poblar todos los selectores de hora
    const selectors = ['bloqueoHoraEspecifica', 'bloqueoHoraInicio', 'bloqueoHoraFin'];
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.innerHTML = '<option value="">Selecciona una hora...</option>';
            
            for (let hora = horaInicio; hora <= horaFin; hora++) {
                const horaStr = hora === 24 ? '00:00' : `${String(hora).padStart(2, '0')}:00`;
                const option = document.createElement('option');
                option.value = horaStr;
                option.textContent = horaStr;
                selector.appendChild(option);
            }
        }
    });
}

/**
 * Configurar eventos del formulario de bloqueos
 */
function configurarBloqueoFormEvents() {
    // Event listeners para tipo de fecha
    const tipoFechaRadios = document.querySelectorAll('input[name="bloqueoTipoFecha"]');
    tipoFechaRadios.forEach(radio => {
        radio.addEventListener('change', updateBloqueoFechaFields);
    });
    
    // Event listeners para tipo de horario
    const tipoHorarioRadios = document.querySelectorAll('input[name="bloqueoTipoHorario"]');
    tipoHorarioRadios.forEach(radio => {
        radio.addEventListener('change', updateBloqueoHorarioFields);
    });
    
    // Event listener para el formulario
    const form = document.getElementById('bloqueoForm');
    if (form && !form.dataset.eventsConfigured) {
        form.addEventListener('submit', handleBloqueoFormSubmit);
        form.dataset.eventsConfigured = 'true';
    }
}

/**
 * Actualizar campos de fecha según el tipo seleccionado
 */
function updateBloqueoFechaFields() {
    const tipoFecha = document.querySelector('input[name="bloqueoTipoFecha"]:checked')?.value;
    
    // Ocultar todos los contenedores
    document.getElementById('bloqueoFechaEspecificoContainer').style.display = 'none';
    document.getElementById('bloqueoFechaRangoContainer').style.display = 'none';
    document.getElementById('bloqueoFechaRecurrenteContainer').style.display = 'none';
    
    // Mostrar el contenedor correspondiente
    if (tipoFecha === 'especifico') {
        document.getElementById('bloqueoFechaEspecificoContainer').style.display = 'block';
        document.getElementById('bloqueoFechaEspecifica').required = true;
        document.getElementById('bloqueoFechaInicio').required = false;
        document.getElementById('bloqueoFechaFin').required = false;
    } else if (tipoFecha === 'rango') {
        document.getElementById('bloqueoFechaRangoContainer').style.display = 'block';
        document.getElementById('bloqueoFechaEspecifica').required = false;
        document.getElementById('bloqueoFechaInicio').required = true;
        document.getElementById('bloqueoFechaFin').required = true;
    } else if (tipoFecha === 'recurrente_semanal') {
        document.getElementById('bloqueoFechaRecurrenteContainer').style.display = 'block';
        document.getElementById('bloqueoFechaEspecifica').required = false;
        document.getElementById('bloqueoFechaInicio').required = false;
        document.getElementById('bloqueoFechaFin').required = false;
    }
}

/**
 * Actualizar campos de horario según el tipo seleccionado
 */
function updateBloqueoHorarioFields() {
    const tipoHorario = document.querySelector('input[name="bloqueoTipoHorario"]:checked')?.value;
    
    // Ocultar todos los contenedores
    document.getElementById('bloqueoHorarioEspecificoContainer').style.display = 'none';
    document.getElementById('bloqueoHorarioRangoContainer').style.display = 'none';
    
    // Mostrar el contenedor correspondiente
    if (tipoHorario === 'especifico') {
        document.getElementById('bloqueoHorarioEspecificoContainer').style.display = 'block';
        document.getElementById('bloqueoHoraEspecifica').required = true;
        document.getElementById('bloqueoHoraInicio').required = false;
        document.getElementById('bloqueoHoraFin').required = false;
    } else if (tipoHorario === 'rango') {
        document.getElementById('bloqueoHorarioRangoContainer').style.display = 'block';
        document.getElementById('bloqueoHoraEspecifica').required = false;
        document.getElementById('bloqueoHoraInicio').required = true;
        document.getElementById('bloqueoHoraFin').required = true;
    } else if (tipoHorario === 'todo_el_dia') {
        // Todo el día - no requiere campos de horario
        document.getElementById('bloqueoHoraEspecifica').required = false;
        document.getElementById('bloqueoHoraInicio').required = false;
        document.getElementById('bloqueoHoraFin').required = false;
    }
}

/**
 * Cargar bloqueos de la cancha
 */
async function loadBloqueos() {
    try {
        const listContainer = document.getElementById('bloqueosListContainer');
        listContainer.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><p>Cargando bloqueos...</p></div>';
        
        const response = await AdminUtils.authenticatedFetch(`/bloqueos-canchas?cancha_id=${currentCanchaBloqueo}`);
        
        if (!response) {
            throw new Error('No se recibió respuesta del servidor');
        }
        
        if (response.ok) {
            const data = await response.json();
            const bloqueos = data.bloqueos || [];
            displayBloqueos(bloqueos);
        } else {
            throw new Error('Error al cargar bloqueos');
        }
    } catch (error) {
        console.error('Error cargando bloqueos:', error);
        const listContainer = document.getElementById('bloqueosListContainer');
        listContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error al cargar bloqueos. Por favor, recarga la página.
            </div>
        `;
    }
}

/**
 * Mostrar lista de bloqueos
 */
function displayBloqueos(bloqueos) {
    const listContainer = document.getElementById('bloqueosListContainer');
    
    if (bloqueos.length === 0) {
        listContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay bloqueos configurados para esta cancha.
            </div>
            <button class="btn btn-primary" onclick="showNewBloqueoForm()">
                <i class="fas fa-plus me-2"></i>Nuevo Bloqueo
            </button>
        `;
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">Bloqueos Configurados (${bloqueos.length})</h6>
            <button class="btn btn-primary btn-sm" onclick="showNewBloqueoForm()">
                <i class="fas fa-plus me-1"></i>Nuevo Bloqueo
            </button>
        </div>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Motivo</th>
                        <th>Fecha/Horario</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    bloqueos.forEach(bloqueo => {
        const fechaTexto = formatBloqueoFecha(bloqueo);
        const horarioTexto = formatBloqueoHorario(bloqueo);
        const estadoBadge = bloqueo.activo 
            ? '<span class="badge bg-danger">Activo</span>'
            : '<span class="badge bg-secondary">Inactivo</span>';
        
        html += `
            <tr>
                <td><strong>${bloqueo.motivo}</strong></td>
                <td>
                    <div>${fechaTexto}</div>
                    <small class="text-muted">${horarioTexto}</small>
                </td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editBloqueo(${bloqueo.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="toggleBloqueoActivo(${bloqueo.id}, ${!bloqueo.activo})" title="${bloqueo.activo ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${bloqueo.activo ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteBloqueo(${bloqueo.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    listContainer.innerHTML = html;
}

/**
 * Formatear fecha del bloqueo para mostrar
 */
function formatBloqueoFecha(bloqueo) {
    if (bloqueo.tipo_fecha === 'especifico') {
        return `Día: ${formatearFecha(bloqueo.fecha_especifica)}`;
    } else if (bloqueo.tipo_fecha === 'rango') {
        return `${formatearFecha(bloqueo.fecha_inicio)} - ${formatearFecha(bloqueo.fecha_fin)}`;
    } else if (bloqueo.tipo_fecha === 'recurrente_semanal') {
        const dias = bloqueo.dias_semana || [];
        return `Recurrente: ${dias.map(d => capitalize(d)).join(', ')}`;
    }
    return 'Sin fecha';
}

/**
 * Formatear horario del bloqueo para mostrar
 */
function formatBloqueoHorario(bloqueo) {
    if (bloqueo.tipo_horario === 'todo_el_dia') {
        return 'Todo el día';
    } else if (bloqueo.tipo_horario === 'especifico') {
        return `Hora: ${bloqueo.hora_especifica}`;
    } else if (bloqueo.tipo_horario === 'rango') {
        return `${bloqueo.hora_inicio} - ${bloqueo.hora_fin}`;
    }
    return 'Sin horario';
}

/**
 * Capitalizar primera letra
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    
    try {
        let fechaLimpia = fecha;
        
        // Si viene en formato ISO (2025-12-31T03:00:00.000Z), extraer solo la parte de fecha
        if (typeof fecha === 'string' && fecha.includes('T')) {
            fechaLimpia = fecha.split('T')[0];
        }
        
        // Validar formato YYYY-MM-DD
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fechaRegex.test(fechaLimpia)) {
            console.warn('⚠️ formatearFecha: formato de fecha inválido', { fecha, fechaLimpia });
            return fechaLimpia || fecha;
        }
        
        // Crear fecha local desde componentes para evitar problemas de zona horaria
        const [año, mes, dia] = fechaLimpia.split('-').map(Number);
        
        if (isNaN(año) || isNaN(mes) || isNaN(dia)) {
            console.warn('⚠️ formatearFecha: valores de fecha inválidos', { año, mes, dia, fecha, fechaLimpia });
            return fechaLimpia || fecha;
        }
        
        const date = new Date(año, mes - 1, dia);
        
        // Validar que la fecha creada sea válida
        if (isNaN(date.getTime())) {
            console.warn('⚠️ formatearFecha: fecha creada es inválida', { año, mes, dia, fecha, fechaLimpia });
            return fechaLimpia || fecha;
        }
        
        return date.toLocaleDateString('es-CL', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        console.error('❌ Error formateando fecha:', error, { fecha });
        return fecha || 'Sin fecha';
    }
}

/**
 * Mostrar formulario para nuevo bloqueo
 */
function showNewBloqueoForm() {
    currentBloqueoEdit = null;
    const formContainer = document.getElementById('bloqueoFormContainer');
    const listContainer = document.getElementById('bloqueosListContainer');
    const formTitle = document.getElementById('bloqueoFormTitle');
    
    formTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Nuevo Bloqueo';
    document.getElementById('bloqueoForm').reset();
    document.getElementById('bloqueoId').value = '';
    document.getElementById('bloqueoCanchaId').value = currentCanchaBloqueo;
    document.getElementById('bloqueoActivo').checked = true;
    
    // Resetear a valores por defecto
    document.getElementById('bloqueoTipoFechaEspecifico').checked = true;
    document.getElementById('bloqueoTipoHorarioEspecifico').checked = true;
    updateBloqueoFechaFields();
    updateBloqueoHorarioFields();
    
    formContainer.style.display = 'block';
    listContainer.style.display = 'none';
}

/**
 * Cancelar formulario de bloqueo
 */
function cancelBloqueoForm() {
    const formContainer = document.getElementById('bloqueoFormContainer');
    const listContainer = document.getElementById('bloqueosListContainer');
    
    formContainer.style.display = 'none';
    listContainer.style.display = 'block';
    loadBloqueos();
}

/**
 * Manejar submit del formulario de bloqueo
 */
async function handleBloqueoFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const tipoFecha = document.querySelector('input[name="bloqueoTipoFecha"]:checked').value;
    const tipoHorario = document.querySelector('input[name="bloqueoTipoHorario"]:checked').value;
    
    // Recopilar datos según el tipo
    const bloqueoData = {
        cancha_id: parseInt(document.getElementById('bloqueoCanchaId').value),
        motivo: document.getElementById('bloqueoMotivo').value,
        descripcion: document.getElementById('bloqueoDescripcion').value,
        tipo_fecha: tipoFecha,
        tipo_horario: tipoHorario,
        activo: document.getElementById('bloqueoActivo').checked
    };
    
    // Agregar campos de fecha según tipo
    if (tipoFecha === 'especifico') {
        bloqueoData.fecha_especifica = document.getElementById('bloqueoFechaEspecifica').value;
    } else if (tipoFecha === 'rango') {
        bloqueoData.fecha_inicio = document.getElementById('bloqueoFechaInicio').value;
        bloqueoData.fecha_fin = document.getElementById('bloqueoFechaFin').value;
    } else if (tipoFecha === 'recurrente_semanal') {
        const diasSeleccionados = [];
        const diasIds = ['bloqueoDiaLunes', 'bloqueoDiaMartes', 'bloqueoDiaMiercoles', 'bloqueoDiaJueves', 'bloqueoDiaViernes', 'bloqueoDiaSabado', 'bloqueoDiaDomingo'];
        diasIds.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox && checkbox.checked) {
                diasSeleccionados.push(checkbox.value);
            }
        });
        bloqueoData.dias_semana = diasSeleccionados;
    }
    
    // Agregar campos de horario según tipo
    if (tipoHorario === 'especifico') {
        bloqueoData.hora_especifica = document.getElementById('bloqueoHoraEspecifica').value;
    } else if (tipoHorario === 'rango') {
        bloqueoData.hora_inicio = document.getElementById('bloqueoHoraInicio').value;
        bloqueoData.hora_fin = document.getElementById('bloqueoHoraFin').value;
    }
    
    const bloqueoId = document.getElementById('bloqueoId').value;
    const isEdit = !!bloqueoId;
    
    try {
        const url = isEdit ? `/bloqueos-canchas/${bloqueoId}` : '/bloqueos-canchas';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await AdminUtils.authenticatedFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bloqueoData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`Bloqueo ${isEdit ? 'actualizado' : 'creado'} exitosamente`, 'success');
            cancelBloqueoForm();
        } else {
            showNotification(result.error || `Error al ${isEdit ? 'actualizar' : 'crear'} bloqueo`, 'error');
        }
    } catch (error) {
        console.error('Error guardando bloqueo:', error);
        showNotification('Error de conexión', 'error');
    }
}

/**
 * Editar bloqueo
 */
async function editBloqueo(bloqueoId) {
    try {
        const response = await AdminUtils.authenticatedFetch(`/bloqueos-canchas/${bloqueoId}`);
        
        if (!response || !response.ok) {
            throw new Error('Error al cargar bloqueo');
        }
        
        const bloqueo = await response.json();
        currentBloqueoEdit = bloqueo;
        
        const formContainer = document.getElementById('bloqueoFormContainer');
        const listContainer = document.getElementById('bloqueosListContainer');
        const formTitle = document.getElementById('bloqueoFormTitle');
        
        formTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Bloqueo';
        
        // Llenar formulario
        document.getElementById('bloqueoId').value = bloqueo.id;
        document.getElementById('bloqueoCanchaId').value = bloqueo.cancha_id;
        document.getElementById('bloqueoMotivo').value = bloqueo.motivo;
        document.getElementById('bloqueoDescripcion').value = bloqueo.descripcion || '';
        document.getElementById('bloqueoActivo').checked = bloqueo.activo;
        
        // Configurar tipo de fecha
        document.querySelector(`input[name="bloqueoTipoFecha"][value="${bloqueo.tipo_fecha}"]`).checked = true;
        if (bloqueo.tipo_fecha === 'especifico') {
            document.getElementById('bloqueoFechaEspecifica').value = bloqueo.fecha_especifica;
        } else if (bloqueo.tipo_fecha === 'rango') {
            document.getElementById('bloqueoFechaInicio').value = bloqueo.fecha_inicio;
            document.getElementById('bloqueoFechaFin').value = bloqueo.fecha_fin;
        } else if (bloqueo.tipo_fecha === 'recurrente_semanal') {
            const mapeoDias = {
                'lunes': 'bloqueoDiaLunes',
                'martes': 'bloqueoDiaMartes',
                'miércoles': 'bloqueoDiaMiercoles',
                'miercoles': 'bloqueoDiaMiercoles',
                'jueves': 'bloqueoDiaJueves',
                'viernes': 'bloqueoDiaViernes',
                'sábado': 'bloqueoDiaSabado',
                'sabado': 'bloqueoDiaSabado',
                'domingo': 'bloqueoDiaDomingo'
            };
            (bloqueo.dias_semana || []).forEach(dia => {
                const id = mapeoDias[dia.toLowerCase()];
                const checkbox = id ? document.getElementById(id) : null;
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // Configurar tipo de horario
        document.querySelector(`input[name="bloqueoTipoHorario"][value="${bloqueo.tipo_horario}"]`).checked = true;
        if (bloqueo.tipo_horario === 'especifico') {
            document.getElementById('bloqueoHoraEspecifica').value = bloqueo.hora_especifica;
        } else if (bloqueo.tipo_horario === 'rango') {
            document.getElementById('bloqueoHoraInicio').value = bloqueo.hora_inicio;
            document.getElementById('bloqueoHoraFin').value = bloqueo.hora_fin;
        }
        
        updateBloqueoFechaFields();
        updateBloqueoHorarioFields();
        
        formContainer.style.display = 'block';
        listContainer.style.display = 'none';
    } catch (error) {
        console.error('Error editando bloqueo:', error);
        showNotification('Error al cargar bloqueo', 'error');
    }
}

/**
 * Eliminar bloqueo
 */
async function deleteBloqueo(bloqueoId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este bloqueo?')) {
        return;
    }
    
    try {
        const response = await AdminUtils.authenticatedFetch(`/bloqueos-canchas/${bloqueoId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Bloqueo eliminado exitosamente', 'success');
            await loadBloqueos();
        } else {
            showNotification(result.error || 'Error al eliminar bloqueo', 'error');
        }
    } catch (error) {
        console.error('Error eliminando bloqueo:', error);
        showNotification('Error de conexión al eliminar bloqueo', 'error');
    }
}

/**
 * Activar/Desactivar un bloqueo
 */
async function toggleBloqueoActivo(bloqueoId, nuevoEstado) {
    try {
        const response = await AdminUtils.authenticatedFetch(`/bloqueos-canchas/${bloqueoId}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`Bloqueo ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`, 'success');
            await loadBloqueos();
        } else {
            showNotification(result.error || 'Error al cambiar estado de bloqueo', 'error');
        }
    } catch (error) {
        console.error('Error cambiando estado de bloqueo:', error);
        showNotification('Error de conexión al cambiar estado', 'error');
    }
}
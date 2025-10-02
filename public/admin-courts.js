// Variables globales
let currentUser = null;
let courts = [];
let complexes = [];

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
        const response = await AdminUtils.authenticatedFetch('/admin/complejos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            complexes = await response.json();
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
            const allCourts = await response.json();
            
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
            courts = await response.json();
            console.log('✅ Canchas cargadas:', courts);
            displayCourts(courts);
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
                        ${court.precio_hora ? `$${court.precio_hora.toLocaleString()} por hora` : 'Precio no disponible'}
                    </p>
                </div>
                <div class="col-md-4 text-end">
                    ${currentUser && currentUser.rol !== 'manager' ? `
                    <div class="btn-group-vertical" role="group">
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
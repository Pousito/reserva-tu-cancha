// Configuración de la API - Dinámico para desarrollo y producción
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api';

// Variables globales
let currentUser = null;
let courts = [];
let complexes = [];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadComplexes();
    loadCourts();
    setupEventListeners();
});

// Verificar autenticación
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (!token || !user) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    currentUser = JSON.parse(user);
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${currentUser.nombre}`;
    
    // Configurar interfaz según el rol
    configurarInterfazPorRol();
}

// Configurar interfaz según el rol del usuario
function configurarInterfazPorRol() {
    if (currentUser.rol === 'complex_owner') {
        // Los dueños de complejo solo ven canchas de su complejo
        document.querySelector('h4').innerHTML = '<i class="fas fa-futbol me-2"></i>Mis Canchas';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('searchCourt').addEventListener('input', function() {
        filterCourts();
    });
    
    // Filtros
    document.getElementById('filterComplex').addEventListener('change', filterCourts);
    document.getElementById('filterType').addEventListener('change', filterCourts);
    
    // Limpiar overlay del modal cuando se cierra
    const courtModal = document.getElementById('courtModal');
    courtModal.addEventListener('hidden.bs.modal', function() {
        // Remover cualquier overlay persistente
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Remover clase modal-open del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    });
}

// Cargar complejos
async function loadComplexes() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/complejos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            complexes = await response.json();
            populateComplexSelects();
        } else {
            console.error('Error cargando complejos:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Poblar selects de complejos
function populateComplexSelects() {
    const filterSelect = document.getElementById('filterComplex');
    const modalSelect = document.getElementById('courtComplex');
    
    // Limpiar selects
    filterSelect.innerHTML = '<option value="">Todos los complejos</option>';
    modalSelect.innerHTML = '<option value="">Seleccionar complejo...</option>';
    
    // Filtrar complejos según el rol
    let complexesToShow = complexes;
    if (currentUser.rol === 'complex_owner') {
        complexesToShow = complexes.filter(c => c.id === currentUser.complejo_id);
    }
    
    complexesToShow.forEach(complex => {
        // Para el filtro
        const filterOption = document.createElement('option');
        filterOption.value = complex.id;
        filterOption.textContent = complex.nombre;
        filterSelect.appendChild(filterOption);
        
        // Para el modal
        const modalOption = document.createElement('option');
        modalOption.value = complex.id;
        modalOption.textContent = complex.nombre;
        modalSelect.appendChild(modalOption);
    });
}

// Cargar canchas
async function loadCourts() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/canchas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            courts = await response.json();
            displayCourts(courts);
        } else {
            console.error('Error cargando canchas:', response.statusText);
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
            <div class="text-center text-muted py-4">
                <i class="fas fa-futbol fa-3x mb-3"></i>
                <p>No se encontraron canchas</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courtsToShow.map(court => `
        <div class="court-card">
            <div class="court-header">
                <div>
                    <h6 class="mb-1">${court.nombre}</h6>
                    <small class="text-muted">
                        <i class="fas fa-building me-1"></i>
                        ${getComplexName(court.complejo_id)}
                    </small>
                </div>
                <div class="court-actions">
                    <span class="type-badge ${court.tipo}">${court.tipo.toUpperCase()}</span>
                    ${currentUser.rol === 'super_admin' || (currentUser.rol === 'complex_owner' && court.complejo_id === currentUser.complejo_id) ? `
                        <button class="btn btn-sm btn-outline-primary btn-action" onclick="editCourt(${court.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCourt(${court.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-outline-info btn-action" onclick="viewCourtDetails(${court.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <small class="text-muted">
                        <i class="fas fa-dollar-sign me-1"></i> $${court.precio_hora?.toLocaleString() || 'No especificado'} por hora
                    </small>
                </div>
                <div class="col-md-6">
                    <small class="text-muted">
                        <i class="fas fa-circle me-1 ${court.activa ? 'text-success' : 'text-danger'}"></i>
                        ${court.activa ? 'Activa' : 'Inactiva'}
                    </small>
                </div>
            </div>
            ${court.descripcion ? `
                <div class="mt-2">
                    <small class="text-muted">${court.descripcion}</small>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Obtener nombre del complejo
function getComplexName(complexId) {
    const complex = complexes.find(c => c.id === complexId);
    return complex ? complex.nombre : 'Complejo no encontrado';
}

// Filtrar canchas
function filterCourts() {
    const searchTerm = document.getElementById('searchCourt').value.toLowerCase();
    const complexFilter = document.getElementById('filterComplex').value;
    const typeFilter = document.getElementById('filterType').value;
    
    let filtered = courts;
    
    // Filtro por texto
    if (searchTerm) {
        filtered = filtered.filter(court => 
            court.nombre.toLowerCase().includes(searchTerm) ||
            getComplexName(court.complejo_id).toLowerCase().includes(searchTerm)
        );
    }
    
    // Filtro por complejo
    if (complexFilter) {
        filtered = filtered.filter(court => court.complejo_id == complexFilter);
    }
    
    // Filtro por tipo
    if (typeFilter) {
        filtered = filtered.filter(court => court.tipo === typeFilter);
    }
    
    displayCourts(filtered);
}

// Abrir modal para agregar cancha
function openCourtModal(courtId = null) {
    const modal = document.getElementById('courtModal');
    const modalTitle = document.getElementById('courtModalTitle');
    const form = document.getElementById('courtForm');
    
    form.reset();
    
    if (courtId) {
        modalTitle.textContent = 'Editar Cancha';
        loadCourtData(courtId);
    } else {
        modalTitle.textContent = 'Agregar Cancha';
    }
    
    new bootstrap.Modal(modal).show();
}

// Cargar datos de la cancha para editar
async function loadCourtData(courtId) {
    try {
        const court = courts.find(c => c.id === courtId);
        if (court) {
            document.getElementById('courtId').value = court.id;
            document.getElementById('courtName').value = court.nombre;
            document.getElementById('courtComplex').value = court.complejo_id;
            document.getElementById('courtType').value = court.tipo;
            document.getElementById('courtPrice').value = court.precio_hora || '';
            document.getElementById('courtDescription').value = court.descripcion || '';
            document.getElementById('courtActive').checked = court.activa !== 0;
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
        nombre: document.getElementById('courtName').value.trim(),
        complejo_id: parseInt(document.getElementById('courtComplex').value),
        tipo: document.getElementById('courtType').value,
        precio_hora: parseInt(document.getElementById('courtPrice').value),
        descripcion: document.getElementById('courtDescription').value.trim(),
        activa: document.getElementById('courtActive').checked ? 1 : 0
    };
    
    // Validaciones adicionales
    if (!courtData.nombre) {
        showNotification('El nombre de la cancha es requerido', 'error');
        return;
    }
    
    if (!courtData.complejo_id) {
        showNotification('Debe seleccionar un complejo', 'error');
        return;
    }
    
    if (!courtData.tipo) {
        showNotification('Debe seleccionar un tipo de cancha', 'error');
        return;
    }
    
    if (!courtData.precio_hora || courtData.precio_hora <= 0) {
        showNotification('El precio por hora debe ser mayor a 0', 'error');
        return;
    }
    
    const courtId = document.getElementById('courtId').value;
    const isEdit = courtId !== '';
    
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showNotification('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
            window.location.href = 'admin-login.html';
            return;
        }
        
        const url = isEdit ? `${API_BASE}/admin/canchas/${courtId}` : `${API_BASE}/admin/canchas`;
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log('Enviando solicitud:', { url, method, courtData });
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(courtData)
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Resultado exitoso:', result);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('courtModal'));
            modal.hide();
            loadCourts();
            showNotification(isEdit ? 'Cancha actualizada exitosamente' : 'Cancha creada exitosamente', 'success');
        } else {
            let errorMessage = 'Error desconocido';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`;
            } catch (e) {
                errorMessage = `Error ${response.status}: ${response.statusText}`;
            }
            console.error('Error en respuesta:', errorMessage);
            showNotification(`Error: ${errorMessage}`, 'error');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        showNotification(`Error de conexión: ${error.message}`, 'error');
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
        const response = await fetch(`${API_BASE}/admin/canchas/${courtId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadCourts();
            showNotification('Cancha eliminada exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification(`Error: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Ver detalles de la cancha
function viewCourtDetails(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (court) {
        // Actualizar el título del modal
        document.getElementById('courtDetailsModalLabel').textContent = court.nombre;
        
        // Llenar los datos en el modal
        document.getElementById('detailCourtName').textContent = court.nombre;
        document.getElementById('detailCourtComplex').textContent = getComplexName(court.complejo_id);
        document.getElementById('detailCourtType').textContent = court.tipo.toUpperCase();
        document.getElementById('detailCourtPrice').textContent = court.precio_hora ? `$${court.precio_hora.toLocaleString()} por hora` : 'No especificado';
        document.getElementById('detailCourtStatus').textContent = court.activa ? 'Activa' : 'Inactiva';
        document.getElementById('detailCourtDescription').textContent = court.descripcion || '';
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('courtDetailsModal'));
        modal.show();
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
        <i class="fas ${icon} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
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
    window.location.href = 'admin-login.html';
}

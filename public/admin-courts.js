// Variables globales
let currentUser = null;
let courts = [];
let complexes = [];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sistema de roles
    if (!AdminUtils.initializeRoleSystem()) {
        return;
    }
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    currentUser = AdminUtils.getCurrentUser();
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${currentUser.nombre}`;
    
    loadComplexes();
    loadCourts();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('searchCourt').addEventListener('input', function() {
        filterCourts(this.value);
    });
}

// Cargar complejos
async function loadComplexes() {
    try {
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
                        ${court.tipo}
                    </p>
                    <p class="mb-0">
                        <i class="fas fa-dollar-sign me-2"></i>
                        $${court.precio_hora.toLocaleString()} por hora
                    </p>
                </div>
                <div class="col-md-4 text-end">
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
                </div>
            </div>
        </div>
    `).join('');
}

// Obtener nombre de complejo
function getComplexName(complexId) {
    const complex = complexes.find(c => c.id === complexId);
    return complex ? complex.nombre : 'Complejo no encontrado';
}

// Filtrar canchas
function filterCourts(searchTerm) {
    const filtered = courts.filter(court => 
        court.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getComplexName(court.complejo_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        court.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
            document.getElementById('courtType').value = court.tipo;
            document.getElementById('courtPrice').value = court.precio_hora;
            document.getElementById('courtDescription').value = court.descripcion || '';
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
            window.location.href = 'admin-login.html';
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
    window.location.href = 'admin-login.html';
}
// Variables globales
let currentUser = null;
let complexes = [];
let cities = [];

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
    
    loadCities();
    loadComplexes();
    setupEventListeners();
    
    // Configurar interfaz según el rol
    configurarInterfazPorRol();
}

// Configurar interfaz según el rol del usuario
function configurarInterfazPorRol() {
    if (currentUser.rol === 'complex_owner') {
        // Los dueños de complejo no pueden gestionar otros complejos
        document.querySelector('.btn-primary').style.display = 'none';
        document.querySelector('h4').innerHTML = '<i class="fas fa-building me-2"></i>Mi Complejo';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Búsqueda en tiempo real
    document.getElementById('searchComplex').addEventListener('input', function() {
        filterComplexes(this.value);
    });
}

// Cargar ciudades
async function loadCities() {
    try {
        const response = await fetch(`${API_BASE}/ciudades`);
        if (response.ok) {
            cities = await response.json();
            populateCitySelect();
        } else {
            console.error('Error cargando ciudades:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Poblar select de ciudades
function populateCitySelect() {
    const select = document.getElementById('complexCity');
    select.innerHTML = '<option value="">Seleccionar ciudad...</option>';
    
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.nombre;
        select.appendChild(option);
    });
}

// Cargar complejos
async function loadComplexes() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/complejos`);
        if (!response) return;
        
        if (response.ok) {
            complexes = await response.json();
            displayComplexes(complexes);
        } else {
            console.error('Error cargando complejos:', response.statusText);
            document.getElementById('complexesList').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando complejos: ${response.statusText}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('complexesList').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error de conexión
            </div>
        `;
    }
}

// Mostrar complejos
function displayComplexes(complexesToShow) {
    const container = document.getElementById('complexesList');
    
    if (complexesToShow.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-building fa-3x mb-3"></i>
                <p>No se encontraron complejos</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = complexesToShow.map(complex => `
        <div class="complex-card">
            <div class="complex-header">
                <div class="complex-info">
                    <div class="complex-title">
                        <i class="fas fa-building"></i>
                        ${complex.nombre}
                    </div>
                    <div class="complex-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${getCityName(complex.ciudad_id)}
                    </div>
                </div>
                <div class="complex-actions">
                    ${currentUser.rol === 'super_admin' ? `
                        <button class="btn-action btn-edit" onclick="editComplex(${complex.id})" title="Editar complejo">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteComplex(${complex.id})" title="Eliminar complejo">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action btn-view" onclick="viewComplexDetails(${complex.id})" title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
            <div class="complex-details">
                <div class="detail-item email">
                    <i class="fas fa-envelope"></i>
                    <span>${complex.email || 'No especificado'}</span>
                </div>
                <div class="detail-item phone">
                    <i class="fas fa-phone"></i>
                    <span>${complex.telefono || 'No especificado'}</span>
                </div>
                ${complex.direccion ? `
                    <div class="detail-item address">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${complex.direccion}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Obtener nombre de ciudad
function getCityName(cityId) {
    const city = cities.find(c => c.id === cityId);
    return city ? city.nombre : 'Ciudad no encontrada';
}

// Filtrar complejos
function filterComplexes(searchTerm) {
    const filtered = complexes.filter(complex => 
        complex.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCityName(complex.ciudad_id).toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayComplexes(filtered);
}

// Abrir modal para agregar complejo
function openComplexModal(complexId = null) {
    const modal = document.getElementById('complexModal');
    const modalTitle = document.getElementById('complexModalTitle');
    const form = document.getElementById('complexForm');
    
    form.reset();
    
    if (complexId) {
        modalTitle.textContent = 'Editar Complejo';
        loadComplexData(complexId);
    } else {
        modalTitle.textContent = 'Agregar Complejo';
    }
    
    new bootstrap.Modal(modal).show();
}

// Cargar datos del complejo para editar
async function loadComplexData(complexId) {
    try {
        const complex = complexes.find(c => c.id === complexId);
        if (complex) {
            document.getElementById('complexId').value = complex.id;
            document.getElementById('complexName').value = complex.nombre;
            document.getElementById('complexCity').value = complex.ciudad_id;
            document.getElementById('complexEmail').value = complex.email || '';
            document.getElementById('complexPhone').value = complex.telefono || '';
            document.getElementById('complexAddress').value = complex.direccion || '';
            document.getElementById('complexDescription').value = complex.descripcion || '';
        }
    } catch (error) {
        console.error('Error cargando datos del complejo:', error);
    }
}

// Guardar complejo
async function saveComplex() {
    // Validar formulario
    const form = document.getElementById('complexForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const complexData = {
        nombre: document.getElementById('complexName').value.trim(),
        ciudad_id: parseInt(document.getElementById('complexCity').value),
        email: document.getElementById('complexEmail').value.trim(),
        telefono: document.getElementById('complexPhone').value.trim(),
        direccion: document.getElementById('complexAddress').value.trim(),
        descripcion: document.getElementById('complexDescription').value.trim()
    };
    
    // Validaciones adicionales
    if (!complexData.nombre) {
        showNotification('El nombre del complejo es requerido', 'error');
        return;
    }
    
    if (!complexData.ciudad_id) {
        showNotification('Debe seleccionar una ciudad', 'error');
        return;
    }
    
    const complexId = document.getElementById('complexId').value;
    const isEdit = complexId !== '';
    
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showNotification('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
            window.location.href = 'admin-login.html';
            return;
        }
        
        const url = isEdit ? `${API_BASE}/admin/complejos/${complexId}` : `${API_BASE}/admin/complejos`;
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log('Enviando solicitud:', { url, method, complexData });
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(complexData)
        });
        
        console.log('Respuesta recibida:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Resultado exitoso:', result);
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('complexModal'));
            modal.hide();
            loadComplexes();
            showNotification(isEdit ? 'Complejo actualizado exitosamente' : 'Complejo creado exitosamente', 'success');
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

// Editar complejo
function editComplex(complexId) {
    openComplexModal(complexId);
}

// Eliminar complejo
async function deleteComplex(complexId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este complejo?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/complejos/${complexId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadComplexes();
            showNotification('Complejo eliminado exitosamente', 'success');
        } else {
            const error = await response.json();
            showNotification(`Error: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

// Ver detalles del complejo
function viewComplexDetails(complexId) {
    const complex = complexes.find(c => c.id === complexId);
    if (complex) {
        // Actualizar el título del modal
        document.getElementById('complexDetailsModalLabel').textContent = complex.nombre;
        
        // Llenar los datos en el modal
        document.getElementById('detailName').textContent = complex.nombre;
        document.getElementById('detailCity').textContent = getCityName(complex.ciudad_id);
        document.getElementById('detailEmail').textContent = complex.email || '';
        document.getElementById('detailPhone').textContent = complex.telefono || '';
        document.getElementById('detailAddress').textContent = complex.direccion || '';
        document.getElementById('detailDescription').textContent = complex.descripcion || '';
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('complexDetailsModal'));
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

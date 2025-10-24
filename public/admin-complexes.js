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
    
    // Aplicar sistema centralizado de roles de AdminUtils
    AdminUtils.hideElementsByRole();
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    currentUser = AdminUtils.getCurrentUser();
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${currentUser.nombre}`;
    
    loadCities();
    loadComplexes();
    loadEstadisticas(); // Cargar estadísticas
    setupEventListeners();
});

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
        const response = await AdminUtils.authenticatedFetch('/ciudades');
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

// Cargar estadísticas
async function loadEstadisticas() {
    try {
        console.log('📊 Cargando estadísticas...');
        
        // Limpiar cache del navegador si es necesario
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
            }
        }
        
        // Construir URL con parámetros de cache-busting
        const url = new URL(`${API_BASE}/admin/estadisticas`);
        url.searchParams.append('_t', Date.now());
        url.searchParams.append('_v', Math.random().toString(36).substr(2, 9));
        
        console.log('📊 URL estadísticas:', url.toString());
        
        const response = await AdminUtils.authenticatedFetch(url.toString(), {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (response && response.ok) {
            const data = await response.json();
            console.log('✅ Estadísticas cargadas:', data);
            
            // Actualizar tarjetas de estadísticas
            const totalReservasElement = document.getElementById('totalReservas');
            const totalCanchasElement = document.getElementById('totalCanchas');
            const totalComplejosElement = document.getElementById('totalComplejos');
            const ingresosTotalesElement = document.getElementById('ingresosTotales');
            
            if (totalReservasElement) {
                totalReservasElement.textContent = data.totalReservas || '0';
            }
            
            if (totalCanchasElement) {
                totalCanchasElement.textContent = data.totalCanchas || '0';
            }
            
            if (totalComplejosElement) {
                totalComplejosElement.textContent = data.totalComplejos || '0';
            }
            
            if (ingresosTotalesElement) {
                ingresosTotalesElement.textContent = `$${formatCurrencyChile(data.ingresosTotales) || '0'}`;
            }
            
            console.log('✅ Estadísticas actualizadas en la interfaz');
        } else {
            console.error('❌ Error cargando estadísticas:', response?.status);
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

// Función para formatear moneda chilena
function formatCurrencyChile(amount) {
    if (!amount) return '0';
    return new Intl.NumberFormat('es-CL').format(amount);
}

// Cargar complejos
async function loadComplexes() {
    try {
        console.log('🔍 Cargando complejos...');
        const response = await AdminUtils.authenticatedFetch('/admin/complejos');
        console.log('📡 Respuesta recibida:', response);
        
        if (!response) {
            console.error('❌ No se recibió respuesta');
            return;
        }
        
        if (response.ok) {
            complexes = await response.json();
            console.log('✅ Complejos cargados:', complexes);
            displayComplexes(complexes);
        } else {
            console.error('❌ Error cargando complejos:', response.statusText);
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
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No se encontraron complejos
            </div>
        `;
        return;
    }
    
    container.innerHTML = complexesToShow.map(complex => `
        <div class="complex-card">
            <div class="row">
                <div class="col-md-8">
                    <h5 class="mb-2">
                        <i class="fas fa-building me-2"></i>
                        ${complex.nombre}
                    </h5>
                    <p class="text-muted mb-2">
                        <i class="fas fa-map-marker-alt me-2"></i>
                        ${getCityName(complex.ciudad_id)}
                    </p>
                    <p class="mb-2">${complex.direccion}</p>
                    <p class="mb-0">
                        <i class="fas fa-phone me-2"></i>
                        ${complex.telefono}
                    </p>
                </div>
                <div class="col-md-4 text-end">
                    <div class="btn-group-vertical" role="group">
                        <button class="btn btn-outline-primary btn-sm mb-2" onclick="viewComplexDetails(${complex.id})">
                            <i class="fas fa-eye me-1"></i>
                            Ver Detalles
                        </button>
                        <button class="btn btn-outline-warning btn-sm mb-2" onclick="editComplex(${complex.id})">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button class="btn ${complex.visible !== false ? 'btn-outline-secondary' : 'btn-outline-success'} btn-sm mb-2" onclick="toggleComplexVisibility(${complex.id}, ${complex.visible !== false})">
                            <i class="fas ${complex.visible !== false ? 'fa-eye-slash' : 'fa-eye'} me-1"></i>
                            ${complex.visible !== false ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteComplex(${complex.id})">
                            <i class="fas fa-trash me-1"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
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
    
    if (complexId) {
        modalTitle.textContent = 'Editar Complejo';
        loadComplexData(complexId);
    } else {
        modalTitle.textContent = 'Agregar Nuevo Complejo';
        form.reset();
    }
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Cargar datos del complejo para editar
async function loadComplexData(complexId) {
    try {
        const complex = complexes.find(c => c.id === complexId);
        if (complex) {
            document.getElementById('complexName').value = complex.nombre;
            document.getElementById('complexCity').value = complex.ciudad_id;
            document.getElementById('complexAddress').value = complex.direccion;
            document.getElementById('complexPhone').value = complex.telefono;
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
        nombre: document.getElementById('complexName').value,
        ciudad_id: parseInt(document.getElementById('complexCity').value),
        direccion: document.getElementById('complexAddress').value,
        telefono: document.getElementById('complexPhone').value,
        descripcion: document.getElementById('complexDescription').value
    };
    
    const complexId = document.getElementById('complexModal').dataset.complexId;
    const isEdit = !!complexId;
    
    try {
        // Verificar token
        const token = localStorage.getItem('adminToken');
        if (!token) {
            showNotification('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
            window.location.href = '../../admin-login.html';
            return;
        }
        
        const url = isEdit ? `/admin/complejos/${complexId}` : `/admin/complejos`;
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log('Enviando solicitud:', { url, method, complexData });
        
        const response = await AdminUtils.authenticatedFetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(complexData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(
                isEdit ? 'Complejo actualizado exitosamente' : 'Complejo creado exitosamente',
                'success'
            );
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('complexModal'));
            modal.hide();
            
            // Recargar lista
            loadComplexes();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error al guardar el complejo', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
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
        const response = await AdminUtils.authenticatedFetch(`/admin/complejos/${complexId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showNotification('Complejo eliminado exitosamente', 'success');
            loadComplexes();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Error al eliminar el complejo', 'error');
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
        const cityName = getCityName(complex.ciudad_id);
        alert(`Detalles del Complejo:\n\nNombre: ${complex.nombre}\nCiudad: ${cityName}\nDirección: ${complex.direccion}\nTeléfono: ${complex.telefono}\nDescripción: ${complex.descripcion || 'Sin descripción'}`);
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

// Cambiar visibilidad de un complejo
async function toggleComplexVisibility(complexId, currentVisibility) {
    try {
        const newVisibility = !currentVisibility;
        
        const response = await AdminUtils.authenticatedFetch(`/admin/complejos/${complexId}/visibilidad`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ visible: newVisibility })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(result.message, 'success');
            loadComplexes(); // Recargar la lista
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error cambiando visibilidad', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'danger');
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '../../admin-login.html';
}
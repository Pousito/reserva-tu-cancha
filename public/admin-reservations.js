// API Base URL - Dinámico para desarrollo y producción
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://reserva-tu-cancha.onrender.com/api';

// Variables globales
let reservas = [];
let complejos = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN RESERVATIONS INICIALIZADO ===');
    
    // Verificar autenticación
    if (!localStorage.getItem('adminToken')) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Mostrar información del usuario
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${adminUser.nombre || 'Admin'}`;
    
    // Configurar interfaz según el rol
    configurarInterfazPorRol(adminUser.rol);
    
    // Cargar datos iniciales
    cargarComplejos();
    cargarReservas();
    configurarEventListeners();
});

function configurarInterfazPorRol(rol) {
    const sidebar = document.querySelector('.sidebar .nav');
    
    if (rol === 'complex_owner') {
        // Ocultar opciones que solo puede ver el super admin
        const opcionesSuperAdmin = [
            'admin-complexes.html',
            'admin-courts.html',
            'admin-reports.html'
        ];
        
        opcionesSuperAdmin.forEach(opcion => {
            const link = sidebar.querySelector(`a[href="${opcion}"]`);
            if (link) {
                link.style.display = 'none';
            }
        });
        
        // Cambiar el título
        document.querySelector('.main-content h5').textContent = 'Mis Reservas';
        
        // Ocultar el filtro de complejo para dueños de complejo
        const complejoFilter = document.querySelector('#complejoFilter').closest('.col-md-3');
        if (complejoFilter) {
            complejoFilter.style.display = 'none';
        }
    } else if (rol === 'super_admin') {
        // Mostrar todas las opciones
        document.querySelector('.main-content h5').textContent = 'Gestión de Reservas - Super Administrador';
    }
}

function configurarEventListeners() {
    // Event listeners para filtros
    document.getElementById('fechaFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('complejoFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('estadoFilter').addEventListener('change', aplicarFiltros);
}

async function cargarComplejos() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/complejos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            complejos = await response.json();
            llenarSelectComplejos();
        } else {
            console.error('Error al cargar complejos');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function llenarSelectComplejos() {
    const select = document.getElementById('complejoFilter');
    select.innerHTML = '<option value="">Todos los complejos</option>';
    
    complejos.forEach(complejo => {
        const option = document.createElement('option');
        option.value = complejo.id;
        option.textContent = complejo.nombre;
        select.appendChild(option);
    });
}

async function cargarReservas() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            reservas = await response.json();
            mostrarReservas(reservas);
        } else {
            mostrarError('Error al cargar las reservas');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión');
    }
}

function aplicarFiltros() {
    const fecha = document.getElementById('fechaFilter').value;
    const complejoId = document.getElementById('complejoFilter').value;
    const estado = document.getElementById('estadoFilter').value;
    
    let reservasFiltradas = [...reservas];
    
    if (fecha) {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha === fecha);
    }
    
    if (complejoId) {
        reservasFiltradas = reservasFiltradas.filter(r => r.complejo_id == complejoId);
    }
    
    if (estado) {
        reservasFiltradas = reservasFiltradas.filter(r => r.estado === estado);
    }
    
    mostrarReservas(reservasFiltradas);
}

function limpiarFiltros() {
    document.getElementById('fechaFilter').value = '';
    document.getElementById('complejoFilter').value = '';
    document.getElementById('estadoFilter').value = '';
    mostrarReservas(reservas);
}

function mostrarReservas(reservasAMostrar) {
    const tbody = document.getElementById('reservationsTableBody');
    const totalElement = document.getElementById('totalReservas');
    
    totalElement.textContent = reservasAMostrar.length;
    
    if (reservasAMostrar.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-inbox"></i> No se encontraron reservas
                </td>
            </tr>
        `;
        return;
    }
    
    const html = reservasAMostrar.map(reserva => `
        <tr>
            <td>
                <code>${reserva.codigo_reserva}</code>
            </td>
            <td>
                <div>
                    <strong>${reserva.nombre_cliente || 'Sin nombre'}</strong>
                    <br>
                    <small class="text-muted">${reserva.email_cliente || 'Sin email'}</small>
                </div>
            </td>
            <td>${reserva.complejo_nombre}</td>
            <td>${reserva.cancha_nombre}</td>
            <td>${formatearFecha(reserva.fecha)}</td>
            <td>
                <span class="badge bg-light text-dark">
                    ${reserva.hora_inicio} - ${reserva.hora_fin}
                </span>
            </td>
            <td>
                <strong>$${reserva.precio_total.toLocaleString()}</strong>
            </td>
            <td>
                <span class="badge badge-status badge-${reserva.estado}">
                    ${reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                </span>
            </td>
            <td class="reservation-actions">
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="verDetalles('${reserva.codigo_reserva}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success btn-action" onclick="confirmarReserva('${reserva.codigo_reserva}')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="cancelarReserva('${reserva.codigo_reserva}')">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.innerHTML = html;
}

function verDetalles(codigoReserva) {
    const reserva = reservas.find(r => r.codigo_reserva === codigoReserva);
    if (!reserva) return;
    
    const modalBody = document.getElementById('reservationModalBody');
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Información del Cliente</h6>
                <p><strong>Nombre:</strong> ${reserva.cliente_nombre}</p>
                <p><strong>Email:</strong> ${reserva.cliente_email}</p>
                <p><strong>RUT:</strong> ${reserva.cliente_rut}</p>
            </div>
            <div class="col-md-6">
                <h6>Detalles de la Reserva</h6>
                <p><strong>Código:</strong> <code>${reserva.codigo_reserva}</code></p>
                <p><strong>Complejo:</strong> ${reserva.complejo_nombre}</p>
                <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(reserva.fecha)}</p>
                <p><strong>Hora:</strong> ${reserva.hora_inicio} - ${reserva.hora_fin}</p>
                <p><strong>Precio:</strong> $${reserva.precio_total.toLocaleString()}</p>
                <p><strong>Estado:</strong> 
                    <span class="badge badge-status badge-${reserva.estado}">
                        ${reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                    </span>
                </p>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6>Información Adicional</h6>
                <p><strong>Fecha de Creación:</strong> ${formatearFechaHora(reserva.fecha_creacion)}</p>
                <p><strong>ID de Transacción:</strong> ${reserva.transaction_id || 'N/A'}</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
    modal.show();
}

async function confirmarReserva(codigoReserva) {
    if (!confirm('¿Estás seguro de que quieres confirmar esta reserva?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas/${codigoReserva}/confirmar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            mostrarNotificacion('Reserva confirmada exitosamente', 'success');
            cargarReservas(); // Recargar la lista
        } else {
            mostrarNotificacion('Error al confirmar la reserva', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
    }
}

async function cancelarReserva(codigoReserva) {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas/${codigoReserva}/cancelar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            mostrarNotificacion('Reserva cancelada exitosamente', 'success');
            cargarReservas(); // Recargar la lista
        } else {
            mostrarNotificacion('Error al cancelar la reserva', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    
    try {
        // Manejar fechas ISO (2025-09-08T00:00:00.000Z)
        let fechaObj;
        if (fecha.includes('T')) {
            // Fecha ISO - extraer solo la parte de fecha
            const fechaParte = fecha.split('T')[0];
            const [año, mes, dia] = fechaParte.split('-').map(Number);
            fechaObj = new Date(año, mes - 1, dia);
        } else {
            // Fecha simple (YYYY-MM-DD)
            const [año, mes, dia] = fecha.split('-').map(Number);
            fechaObj = new Date(año, mes - 1, dia);
        }
        
        return fechaObj.toLocaleDateString('es-CL', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error, 'Fecha original:', fecha);
        return 'Fecha inválida';
    }
}

function formatearFechaHora(fechaHora) {
    const fechaObj = new Date(fechaHora);
    return fechaObj.toLocaleString('es-CL');
}

function mostrarError(mensaje) {
    const tbody = document.getElementById('reservationsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle"></i> ${mensaje}
            </td>
        </tr>
    `;
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

function mostrarNotificacion(mensaje, tipo) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

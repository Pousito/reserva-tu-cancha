// API Base URL - Dinámico para desarrollo y producción
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://reserva-tu-cancha.onrender.com/api';

// Variables globales
let reservationsChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN DASHBOARD INICIALIZADO ===');
    
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
    
    // Cargar datos del dashboard
    cargarEstadisticas();
    cargarReservasRecientes();
    cargarReservasHoy();
    inicializarGrafico();
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
        
        // Cambiar el título del dashboard
        document.querySelector('.main-content h5').textContent = 'Mi Complejo - Dashboard';
    } else if (rol === 'super_admin') {
        // Mostrar todas las opciones
        document.querySelector('.main-content h5').textContent = 'Dashboard - Super Administrador';
    }
}

async function cargarEstadisticas() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Actualizar estadísticas
            document.getElementById('totalReservations').textContent = stats.totalReservas || 0;
            document.getElementById('totalRevenue').textContent = `$${(stats.ingresosTotales || 0).toLocaleString()}`;
            document.getElementById('totalCourts').textContent = stats.totalCanchas || 0;
            document.getElementById('totalComplexes').textContent = stats.totalComplejos || 0;
            
            // Actualizar gráfico si hay datos
            if (stats.reservasPorDia && reservationsChart) {
                actualizarGrafico(stats.reservasPorDia);
            }
        } else {
            console.error('Error al cargar estadísticas');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarReservasRecientes() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas-recientes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const reservas = await response.json();
            mostrarReservasRecientes(reservas);
        } else {
            document.getElementById('recentReservationsList').innerHTML = 
                '<div class="text-center text-muted">No se pudieron cargar las reservas recientes</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('recentReservationsList').innerHTML = 
            '<div class="text-center text-muted">Error al cargar las reservas</div>';
    }
}

async function cargarReservasHoy() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas-hoy`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const reservas = await response.json();
            mostrarReservasHoy(reservas);
        } else {
            document.getElementById('todayReservationsList').innerHTML = 
                '<div class="text-center text-muted">No se pudieron cargar las reservas de hoy</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('todayReservationsList').innerHTML = 
            '<div class="text-center text-muted">Error al cargar las reservas</div>';
    }
}

function mostrarReservasRecientes(reservas) {
    const container = document.getElementById('recentReservationsList');
    
    if (!reservas || reservas.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No hay reservas recientes</div>';
        return;
    }
    
    const html = reservas.map(reserva => `
        <div class="reservation-item">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${reserva.nombre_cliente || 'Sin nombre'}</h6>
                    <p class="text-muted mb-1 small">${reserva.complejo_nombre || 'Sin complejo'}</p>
                    <p class="text-muted mb-0 small">${formatearFecha(reserva.fecha)} - ${reserva.hora_inicio}</p>
                </div>
                <span class="badge bg-primary">$${reserva.precio_total}</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function mostrarReservasHoy(reservas) {
    const container = document.getElementById('todayReservationsList');
    
    if (!reservas || reservas.length === 0) {
        container.innerHTML = '<div class="text-center text-muted">No hay reservas para hoy</div>';
        return;
    }
    
    const html = reservas.map(reserva => `
        <div class="reservation-item">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${reserva.nombre_cliente || 'Sin nombre'}</h6>
                    <p class="text-muted mb-1 small">${reserva.complejo_nombre || 'Sin complejo'} - ${reserva.cancha_nombre || 'Sin cancha'}</p>
                    <p class="text-muted mb-0 small">${reserva.hora_inicio} - ${reserva.hora_fin}</p>
                </div>
                <div class="text-end">
                    <span class="badge bg-success">$${reserva.precio_total}</span>
                    <br>
                    <small class="text-muted">Código: ${reserva.codigo_reserva}</small>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function inicializarGrafico() {
    const ctx = document.getElementById('reservationsChart').getContext('2d');
    
    reservationsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Reservas',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function actualizarGrafico(datos) {
    if (!reservationsChart) return;
    
    const labels = datos.map(item => formatearFechaCorta(item.dia));
    const values = datos.map(item => item.cantidad);
    
    reservationsChart.data.labels = labels;
    reservationsChart.data.datasets[0].data = values;
    reservationsChart.update();
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

function formatearFechaCorta(fecha) {
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
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha corta:', error, 'Fecha original:', fecha);
        return 'Fecha inválida';
    }
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

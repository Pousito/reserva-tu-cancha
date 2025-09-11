// Variables globales
let reservationsChart = null;
let typeChart = null;
let hoursChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN DASHBOARD INICIALIZADO ===');
    
    // Inicializar sistema de roles
    if (!AdminUtils.initializeRoleSystem()) {
        return;
    }
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    // Mostrar información del usuario
    const adminUser = AdminUtils.getCurrentUser();
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${adminUser.nombre || 'Admin'}`;
    
    // Cargar datos del dashboard
    cargarEstadisticas();
    cargarReservasRecientes();
    cargarReservasHoy();
    inicializarGraficos();
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
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/estadisticas`);
        if (!response) return;
        
        if (response.ok) {
            const stats = await response.json();
            
            // Actualizar estadísticas
            document.getElementById('totalReservations').textContent = stats.totalReservas || 0;
            document.getElementById('totalRevenue').textContent = `$${(stats.ingresosTotales || 0).toLocaleString()}`;
            document.getElementById('totalCourts').textContent = stats.totalCanchas || 0;
            document.getElementById('totalComplexes').textContent = stats.totalComplejos || 0;
            
            // Actualizar gráficos si hay datos
            if (stats.reservasPorDia && reservationsChart) {
                actualizarGraficoReservas(stats.reservasPorDia);
            }
            
            // Cargar datos adicionales para los otros gráficos
            cargarDatosGraficos();
        } else {
            console.error('Error al cargar estadísticas');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarReservasRecientes() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reservas-recientes`);
        if (!response) return;
        
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

function inicializarGraficos() {
    // Inicializar gráfico de reservas por día
    inicializarGraficoReservas();
    
    // Inicializar gráfico de tipos de cancha
    inicializarGraficoTipos();
    
    // Inicializar gráfico de horarios
    inicializarGraficoHorarios();
}

function inicializarGraficoReservas() {
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
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(102, 126, 234, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280',
                        stepSize: 1,
                        callback: function(value) {
                            return Number.isInteger(value) ? value : null;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function inicializarGraficoTipos() {
    const ctx = document.getElementById('typeChart').getContext('2d');
    
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#667eea',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b',
                    '#fa709a',
                    '#ffecd2'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            cutout: '60%'
        }
    });
}

function inicializarGraficoHorarios() {
    const ctx = document.getElementById('hoursChart').getContext('2d');
    
    hoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Reservas',
                data: [],
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: '#667eea',
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(102, 126, 234, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function actualizarGraficoReservas(datos) {
    if (!reservationsChart) return;
    
    const labels = datos.map(item => formatearFechaCorta(item.dia));
    const values = datos.map(item => item.cantidad);
    
    reservationsChart.data.labels = labels;
    reservationsChart.data.datasets[0].data = values;
    reservationsChart.update();
}

// Cargar datos adicionales para los gráficos
async function cargarDatosGraficos() {
    try {
        // Cargar datos de tipos de cancha
        await cargarDatosTiposCancha();
        
        // Cargar datos de horarios populares
        await cargarDatosHorarios();
    } catch (error) {
        console.error('Error cargando datos de gráficos:', error);
    }
}

// Cargar datos de tipos de cancha
async function cargarDatosTiposCancha() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            })
        });
        
        if (response && response.ok) {
            const data = await response.json();
            if (data.charts && data.charts.reservasPorTipo && typeChart) {
                actualizarGraficoTipos(data.charts.reservasPorTipo);
            }
        }
    } catch (error) {
        console.error('Error cargando tipos de cancha:', error);
    }
}

// Cargar datos de horarios populares
async function cargarDatosHorarios() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0]
            })
        });
        
        if (response && response.ok) {
            const data = await response.json();
            if (data.charts && data.charts.horariosPopulares && hoursChart) {
                actualizarGraficoHorarios(data.charts.horariosPopulares);
            }
        }
    } catch (error) {
        console.error('Error cargando horarios:', error);
    }
}

// Actualizar gráfico de tipos
function actualizarGraficoTipos(datos) {
    if (!typeChart || !datos) return;
    
    const labels = datos.map(item => item.tipo);
    const values = datos.map(item => parseInt(item.cantidad));
    
    typeChart.data.labels = labels;
    typeChart.data.datasets[0].data = values;
    typeChart.update();
}

// Actualizar gráfico de horarios
function actualizarGraficoHorarios(datos) {
    if (!hoursChart || !datos) return;
    
    const labels = datos.map(item => item.hora);
    const values = datos.map(item => parseInt(item.cantidad));
    
    hoursChart.data.labels = labels;
    hoursChart.data.datasets[0].data = values;
    hoursChart.update();
}

// Función para cambiar tipo de gráfico
function toggleChartType(chartId) {
    if (chartId === 'reservationsChart' && reservationsChart) {
        const currentType = reservationsChart.config.type;
        const newType = currentType === 'line' ? 'bar' : 'line';
        
        reservationsChart.config.type = newType;
        reservationsChart.update();
        
        // Actualizar el ícono del botón
        const button = document.querySelector(`[onclick="toggleChartType('${chartId}')"]`);
        if (button) {
            const icon = button.querySelector('i');
            if (newType === 'bar') {
                icon.className = 'fas fa-chart-line';
            } else {
                icon.className = 'fas fa-chart-bar';
            }
        }
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

// Configuración de la API - Dinámico para desarrollo y producción
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://reserva-tu-cancha.onrender.com/api';

// Variables globales
let currentUser = null;
let complexes = [];
let reportsData = {};
let charts = {};

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadComplexes();
    setupEventListeners();
    setDefaultDates();
    generateReports();
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
        // Los dueños de complejo solo ven reportes de su complejo
        document.querySelector('h5').textContent = 'Mis Reportes';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Cambio de período
    document.getElementById('periodFilter').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('dateFrom').style.display = 'block';
            document.getElementById('dateTo').style.display = 'block';
        } else {
            setDefaultDates();
        }
    });
    
    // Cambio de fechas personalizadas
    document.getElementById('dateFrom').addEventListener('change', updatePeriodFilter);
    document.getElementById('dateTo').addEventListener('change', updatePeriodFilter);
}

// Establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
    document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

// Actualizar filtro de período
function updatePeriodFilter() {
    document.getElementById('periodFilter').value = 'custom';
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
            populateComplexFilter();
        } else {
            console.error('Error cargando complejos:', response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Poblar filtro de complejos
function populateComplexFilter() {
    const filterSelect = document.getElementById('complexFilter');
    
    // Limpiar select
    filterSelect.innerHTML = '<option value="">Todos los complejos</option>';
    
    // Filtrar complejos según el rol
    let complexesToShow = complexes;
    if (currentUser.rol === 'complex_owner') {
        complexesToShow = complexes.filter(c => c.id === currentUser.complejo_id);
    }
    
    complexesToShow.forEach(complex => {
        const option = document.createElement('option');
        option.value = complex.id;
        option.textContent = complex.nombre;
        filterSelect.appendChild(option);
    });
}

// Generar reportes
async function generateReports() {
    try {
        showLoadingState();
        
        const filters = getFilters();
        const token = localStorage.getItem('adminToken');
        
        // Obtener datos de reportes
        const response = await fetch(`${API_BASE}/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(filters)
        });
        
        if (response.ok) {
            reportsData = await response.json();
            updateMetrics();
            updateCharts();
            updateTables();
        } else {
            console.error('Error generando reportes:', response.statusText);
            showErrorState();
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorState();
    }
}

// Obtener filtros
function getFilters() {
    const period = document.getElementById('periodFilter').value;
    let dateFrom = document.getElementById('dateFrom').value;
    let dateTo = document.getElementById('dateTo').value;
    
    // Si no es período personalizado, calcular fechas
    if (period !== 'custom') {
        const dates = getPeriodDates(period);
        dateFrom = dates.from;
        dateTo = dates.to;
    }
    
    return {
        dateFrom,
        dateTo,
        complexId: document.getElementById('complexFilter').value || null
    };
}

// Obtener fechas según el período
function getPeriodDates(period) {
    const today = new Date();
    let from, to;
    
    switch (period) {
        case 'today':
            from = to = today.toISOString().split('T')[0];
            break;
        case 'week':
            from = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
            to = new Date().toISOString().split('T')[0];
            break;
        case 'month':
            from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            to = new Date().toISOString().split('T')[0];
            break;
        case 'quarter':
            const quarter = Math.floor(today.getMonth() / 3);
            from = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
            to = new Date().toISOString().split('T')[0];
            break;
        case 'year':
            from = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
            to = new Date().toISOString().split('T')[0];
            break;
        default:
            from = document.getElementById('dateFrom').value;
            to = document.getElementById('dateTo').value;
    }
    
    return { from, to };
}

// Mostrar estado de carga
function showLoadingState() {
    // Métricas
    document.getElementById('totalRevenue').textContent = 'Cargando...';
    document.getElementById('totalReservations').textContent = 'Cargando...';
    document.getElementById('occupancyRate').textContent = 'Cargando...';
    document.getElementById('uniqueCustomers').textContent = 'Cargando...';
    
    // Tablas
    document.getElementById('topComplexesTable').innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted">
                <i class="fas fa-spinner fa-spin"></i> Cargando datos...
            </td>
        </tr>
    `;
    
    document.getElementById('topCourtsTable').innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted">
                <i class="fas fa-spinner fa-spin"></i> Cargando datos...
            </td>
        </tr>
    `;
    
    document.getElementById('customersTable').innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted">
                <i class="fas fa-spinner fa-spin"></i> Cargando datos...
            </td>
        </tr>
    `;
}

// Mostrar estado de error
function showErrorState() {
    // Métricas
    document.getElementById('totalRevenue').textContent = 'Error';
    document.getElementById('totalReservations').textContent = 'Error';
    document.getElementById('occupancyRate').textContent = 'Error';
    document.getElementById('uniqueCustomers').textContent = 'Error';
    
    // Tablas
    document.getElementById('topComplexesTable').innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>Error cargando datos
            </td>
        </tr>
    `;
    
    document.getElementById('topCourtsTable').innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>Error cargando datos
            </td>
        </tr>
    `;
    
    document.getElementById('customersTable').innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>Error cargando datos
            </td>
        </tr>
    `;
}

// Actualizar métricas
function updateMetrics() {
    const data = reportsData.metrics || {};
    
    // Ingresos
    document.getElementById('totalRevenue').textContent = formatCurrency(data.totalRevenue || 0);
    updateMetricChange('revenueChange', data.revenueChange || 0);
    
    // Reservas
    document.getElementById('totalReservations').textContent = (data.totalReservations || 0).toLocaleString();
    updateMetricChange('reservationsChange', data.reservationsChange || 0);
    
    // Ocupación
    document.getElementById('occupancyRate').textContent = `${(data.occupancyRate || 0).toFixed(1)}%`;
    updateMetricChange('occupancyChange', data.occupancyChange || 0);
    
    // Clientes únicos
    document.getElementById('uniqueCustomers').textContent = (data.uniqueCustomers || 0).toLocaleString();
    updateMetricChange('customersChange', data.customersChange || 0);
}

// Actualizar cambio de métrica
function updateMetricChange(elementId, change) {
    const element = document.getElementById(elementId);
    const isPositive = change >= 0;
    
    element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
    element.innerHTML = `
        <i class="fas fa-arrow-${isPositive ? 'up' : 'down'} me-1"></i>
        ${isPositive ? '+' : ''}${change.toFixed(1)}%
    `;
}

// Actualizar gráficos
function updateCharts() {
    updateRevenueChart();
    updateTypeChart();
    updateOccupancyChart();
    updateHoursChart();
}

// Gráfico de ingresos
function updateRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const data = reportsData.revenueChart || { labels: [], data: [] };
    
    if (charts.revenue) {
        charts.revenue.destroy();
    }
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ingresos',
                data: data.data,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
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
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de tipos
function updateTypeChart() {
    const ctx = document.getElementById('typeChart').getContext('2d');
    const data = reportsData.typeChart || { labels: [], data: [] };
    
    if (charts.type) {
        charts.type.destroy();
    }
    
    charts.type = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#ffc107',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Gráfico de ocupación
function updateOccupancyChart() {
    const ctx = document.getElementById('occupancyChart').getContext('2d');
    const data = reportsData.occupancyChart || { labels: [], data: [] };
    
    if (charts.occupancy) {
        charts.occupancy.destroy();
    }
    
    charts.occupancy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Ocupación (%)',
                data: data.data,
                backgroundColor: '#667eea',
                borderColor: '#764ba2',
                borderWidth: 1
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
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Gráfico de horarios
function updateHoursChart() {
    const ctx = document.getElementById('hoursChart').getContext('2d');
    const data = reportsData.hoursChart || { labels: [], data: [] };
    
    if (charts.hours) {
        charts.hours.destroy();
    }
    
    charts.hours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Reservas',
                data: data.data,
                backgroundColor: '#ffc107',
                borderColor: '#fd7e14',
                borderWidth: 1
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
                    beginAtZero: true
                }
            }
        }
    });
}

// Actualizar tablas
function updateTables() {
    updateTopComplexesTable();
    updateTopCourtsTable();
    updateCustomersTable();
}

// Tabla de top complejos
function updateTopComplexesTable() {
    const data = reportsData.topComplexes || [];
    const tbody = document.getElementById('topComplexesTable');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No hay datos disponibles</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(complex => `
        <tr>
            <td>${complex.nombre}</td>
            <td>${complex.reservas}</td>
            <td>${formatCurrency(complex.ingresos)}</td>
            <td>${complex.ocupacion.toFixed(1)}%</td>
        </tr>
    `).join('');
}

// Tabla de top canchas
function updateTopCourtsTable() {
    const data = reportsData.topCourts || [];
    const tbody = document.getElementById('topCourtsTable');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No hay datos disponibles</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(court => `
        <tr>
            <td>${court.nombre}</td>
            <td>${court.complejo}</td>
            <td>${court.reservas}</td>
            <td>${formatCurrency(court.ingresos)}</td>
        </tr>
    `).join('');
}

// Tabla de clientes
function updateCustomersTable() {
    const data = reportsData.customers || [];
    const tbody = document.getElementById('customersTable');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No hay datos disponibles</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(customer => `
        <tr>
            <td>${customer.nombre}</td>
            <td>${customer.email}</td>
            <td>${customer.reservas}</td>
            <td>${formatCurrency(customer.totalGastado)}</td>
            <td>${formatDate(customer.ultimaReserva)}</td>
            <td>
                <span class="badge ${customer.activo ? 'bg-success' : 'bg-secondary'}">
                    ${customer.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Funciones de utilidad
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL');
}

// Exportar a PDF
function exportToPDF(type) {
    showNotification('Función de exportación a PDF en desarrollo', 'info');
}

// Exportar a Excel
function exportToExcel(type) {
    showNotification('Función de exportación a Excel en desarrollo', 'info');
}

// Mostrar notificación
function showNotification(message, type) {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 'alert-info';
    const icon = type === 'success' ? 'fa-check-circle' : 
                type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
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




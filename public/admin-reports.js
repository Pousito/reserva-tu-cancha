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
    // Usar un rango más amplio para incluir todas las reservas existentes
    const firstDay = new Date(2024, 0, 1); // 1 de enero de 2024
    
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
        const response = await fetch(`${API_BASE}/admin/complejos`);
        
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
        
        // Obtener datos de reportes (sin autenticación ya que el backend no la requiere)
        const response = await fetch(`${API_BASE}/admin/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        
        if (response.ok) {
            reportsData = await response.json();
            console.log('📊 Datos de reportes recibidos:', reportsData);
            updateMetrics();
            updateCharts();
            updateTables();
        } else {
            console.error('Error generando reportes:', response.statusText);
            console.error('Response status:', response.status);
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
            // Usar un rango más amplio para incluir todas las reservas
            from = new Date(2024, 0, 1).toISOString().split('T')[0];
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
    console.log('📊 Actualizando métricas con datos:', data);
    
    // Ingresos
    const ingresosElement = document.getElementById('totalRevenue');
    if (ingresosElement) {
        ingresosElement.textContent = formatCurrency(data.ingresosTotales || 0);
        console.log('💰 Ingresos actualizados:', data.ingresosTotales);
    }
    updateMetricChange('revenueChange', data.revenueChange || 0);
    
    // Reservas
    const reservasElement = document.getElementById('totalReservations');
    if (reservasElement) {
        reservasElement.textContent = (data.totalReservas || 0).toLocaleString();
        console.log('📋 Reservas actualizadas:', data.totalReservas);
    }
    updateMetricChange('reservationsChange', data.reservationsChange || 0);
    
    // Tasa de confirmación
    const ocupacionElement = document.getElementById('occupancyRate');
    if (ocupacionElement) {
        ocupacionElement.textContent = `${data.tasaConfirmacion || 0}%`;
        console.log('📈 Tasa de confirmación actualizada:', data.tasaConfirmacion);
    }
    updateMetricChange('occupancyChange', data.occupancyChange || 0);
    
    // Reservas confirmadas
    const clientesElement = document.getElementById('uniqueCustomers');
    if (clientesElement) {
        clientesElement.textContent = (data.reservasConfirmadas || 0).toLocaleString();
        console.log('👥 Clientes únicos actualizados:', data.reservasConfirmadas);
    }
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
    const data = reportsData.charts?.reservasPorDia || [];
    
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
    const data = reportsData.charts?.reservasPorComplejo || [];
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
            <td>${complex.complejo}</td>
            <td>${complex.cantidad}</td>
            <td>${formatCurrency(complex.ingresos)}</td>
            <td>${((complex.cantidad / data.reduce((sum, c) => sum + parseInt(c.cantidad), 0)) * 100).toFixed(1)}%</td>
        </tr>
    `).join('');
}

// Tabla de top canchas
function updateTopCourtsTable() {
    const data = reportsData.tables?.topCanchas || [];
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
            <td>${court.cancha}</td>
            <td>${court.complejo}</td>
            <td>${court.reservas}</td>
            <td>${formatCurrency(court.ingresos)}</td>
        </tr>
    `).join('');
}

// Tabla de clientes
function updateCustomersTable() {
    const tbody = document.getElementById('customersTable');
    
    // Por ahora, mostrar un mensaje ya que el backend no envía datos de clientes
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Análisis de clientes próximamente
            </td>
        </tr>
    `;
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




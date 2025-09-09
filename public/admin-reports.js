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
            await updateTables();
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
    
    // Procesar datos del backend
    const labels = data.map(item => formatDate(item.fecha));
    const ingresos = data.map(item => parseInt(item.ingresos));
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos',
                data: ingresos,
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
    const data = reportsData.charts?.reservasPorTipo || [];
    
    if (charts.type) {
        charts.type.destroy();
    }
    
    // Procesar datos del backend
    const labels = data.map(item => item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1));
    const cantidades = data.map(item => parseInt(item.cantidad));
    
    charts.type = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: cantidades,
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#ffc107',
                    '#dc3545',
                    '#6f42c1',
                    '#fd7e14'
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
    const data = reportsData.charts?.reservasPorComplejo || [];
    
    if (charts.occupancy) {
        charts.occupancy.destroy();
    }
    
    // Procesar datos del backend
    const labels = data.map(item => item.complejo);
    const cantidades = data.map(item => parseInt(item.cantidad));
    
    charts.occupancy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reservas',
                data: cantidades,
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
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Gráfico de horarios
function updateHoursChart() {
    const ctx = document.getElementById('hoursChart').getContext('2d');
    const data = reportsData.charts?.horariosPopulares || [];
    
    if (charts.hours) {
        charts.hours.destroy();
    }
    
    // Procesar datos del backend
    const labels = data.map(item => item.hora);
    const cantidades = data.map(item => parseInt(item.cantidad));
    
    charts.hours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Reservas',
                data: cantidades,
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
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Actualizar tablas
async function updateTables() {
    updateTopComplexesTable();
    updateTopCourtsTable();
    await updateCustomersTable();
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
async function updateCustomersTable() {
    const tbody = document.getElementById('customersTable');
    
    try {
        console.log('👥 Iniciando análisis de clientes...');
        
        // Obtener datos de análisis de clientes
        const { dateFrom, dateTo } = getPeriodDates();
        const complexId = document.getElementById('complexFilter').value;
        
        console.log('📅 Fechas:', { dateFrom, dateTo, complexId });
        
        const url = new URL(`${API_BASE}/admin/customers-analysis`);
        url.searchParams.append('dateFrom', dateFrom);
        url.searchParams.append('dateTo', dateTo);
        if (complexId) url.searchParams.append('complexId', complexId);
        
        console.log('🔗 URL:', url.toString());
        
        const response = await fetch(url);
        console.log('📡 Response status:', response.status);
        
        const result = await response.json();
        console.log('📊 Result:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Error al cargar análisis de clientes');
        }
        
        const data = result.data;
        console.log('📈 Data recibida:', data);
        
        // Mostrar estadísticas generales
        updateCustomersStats(data.estadisticas);
        
        // Mostrar tabla de clientes más frecuentes
        if (data.clientesFrecuentes && data.clientesFrecuentes.length > 0) {
            tbody.innerHTML = data.clientesFrecuentes.map((cliente, index) => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
                                ${cliente.nombre_cliente.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="fw-bold">${cliente.nombre_cliente}</div>
                                <small class="text-muted">${cliente.email_cliente}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-primary">${cliente.total_reservas}</span>
                    </td>
                    <td>${formatCurrency(cliente.total_gastado)}</td>
                    <td>${formatCurrency(cliente.promedio_por_reserva)}</td>
                    <td>
                        <small class="text-muted">
                            ${formatDate(cliente.primera_reserva)} - ${formatDate(cliente.ultima_reserva)}
                        </small>
                    </td>
                    <td>
                        <span class="badge ${cliente.total_reservas > 1 ? 'bg-success' : 'bg-warning'}">
                            ${cliente.total_reservas > 1 ? 'Recurrente' : 'Nuevo'}
                        </span>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-users me-2"></i>
                        No hay datos de clientes para el período seleccionado
                    </td>
                </tr>
            `;
        }
        
        // Actualizar gráficos de clientes si existen
        updateCustomersCharts(data);
        
    } catch (error) {
        console.error('Error cargando análisis de clientes:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error cargando análisis de clientes
                </td>
            </tr>
        `;
    }
}

// Actualizar estadísticas de clientes
function updateCustomersStats(stats) {
    // Actualizar métricas de clientes únicos
    const clientesUnicosElement = document.getElementById('uniqueCustomers');
    if (clientesUnicosElement) {
        clientesUnicosElement.textContent = (stats.clientes_unicos || 0).toLocaleString();
    }
    
    // Mostrar estadísticas adicionales si hay elementos para ellas
    const clientesActivosElement = document.getElementById('activeCustomers');
    if (clientesActivosElement) {
        clientesActivosElement.textContent = (stats.clientes_activos_30_dias || 0).toLocaleString();
    }
    
    const clientesNuevosElement = document.getElementById('newCustomers');
    if (clientesNuevosElement) {
        const clientesNuevos = (stats.clientes_unicos || 0) - (stats.clientes_activos_30_dias || 0);
        clientesNuevosElement.textContent = Math.max(0, clientesNuevos).toLocaleString();
    }
}

// Actualizar gráficos de clientes
function updateCustomersCharts(data) {
    // Crear gráfico de distribución de clientes por complejo si hay datos
    if (data.distribucionComplejos && data.distribucionComplejos.length > 0) {
        createCustomersByComplexChart(data.distribucionComplejos);
    }
    
    // Crear gráfico de clientes nuevos vs recurrentes
    if (data.clientesNuevos && data.clientesRecurrentes) {
        createNewVsRecurringCustomersChart(data.clientesNuevos, data.clientesRecurrentes);
    }
}

// Crear gráfico de clientes por complejo
function createCustomersByComplexChart(data) {
    const ctx = document.getElementById('customersByComplexChart');
    if (!ctx) return;
    
    // Destruir gráfico existente si existe
    if (charts.customersByComplex) {
        charts.customersByComplex.destroy();
    }
    
    charts.customersByComplex = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.complejo),
            datasets: [{
                data: data.map(item => item.clientes_unicos),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#f5576c',
                    '#4facfe',
                    '#00f2fe'
                ],
                borderWidth: 2,
                borderColor: '#fff'
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
                title: {
                    display: true,
                    text: 'Distribución de Clientes por Complejo',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

// Crear gráfico de clientes nuevos vs recurrentes
function createNewVsRecurringCustomersChart(clientesNuevos, clientesRecurrentes) {
    const ctx = document.getElementById('newVsRecurringChart');
    if (!ctx) return;
    
    // Destruir gráfico existente si existe
    if (charts.newVsRecurring) {
        charts.newVsRecurring.destroy();
    }
    
    charts.newVsRecurring = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Clientes Nuevos', 'Clientes Recurrentes'],
            datasets: [{
                label: 'Número de Clientes',
                data: [clientesNuevos.length, clientesRecurrentes.length],
                backgroundColor: ['#f5576c', '#4facfe'],
                borderColor: ['#f5576c', '#4facfe'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Clientes Nuevos vs Recurrentes',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
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




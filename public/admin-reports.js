// Variables globales
let currentUser = null;
let reportsData = null;
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
    setupEventListeners();
    setDefaultDates();
    generateReports();
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros de fecha
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const complexFilter = document.getElementById('complexFilter');
    
    if (dateFrom) {
        dateFrom.addEventListener('change', function() {
            this.blur();
            generateReports();
        });
    }
    
    if (dateTo) {
        dateTo.addEventListener('change', function() {
            this.blur();
            generateReports();
        });
    }
    
    // Filtro de complejo
    if (complexFilter) {
        complexFilter.addEventListener('change', function() {
            generateReports();
        });
    }
}

// Cargar complejos
async function loadComplexes() {
    try {
        const response = await AdminUtils.authenticatedFetch('/admin/complejos');
        if (!response) return;
        
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
    const select = document.getElementById('complexFilter');
    select.innerHTML = '<option value="">Todos los complejos</option>';
    complexes.forEach(complex => {
        const option = document.createElement('option');
        option.value = complex.id;
        option.textContent = complex.nombre;
        select.appendChild(option);
    });
}

// Establecer fechas por defecto
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(2025, 8, 1); // 1 de septiembre de 2025
    
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    if (dateFrom) {
        dateFrom.value = firstDay.toISOString().split('T')[0];
    }
    if (dateTo) {
        dateTo.value = today.toISOString().split('T')[0];
    }
}

// Obtener filtros
function getFilters() {
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const complexFilter = document.getElementById('complexFilter');
    
    return {
        dateFrom: dateFrom ? dateFrom.value : '',
        dateTo: dateTo ? dateTo.value : '',
        complexId: complexFilter ? complexFilter.value || null : null,
        sport: null
    };
}

// Generar reportes
async function generateReports() {
    try {
        showLoadingState();
        
        const filters = getFilters();
        
        // Obtener datos de reportes (sin autenticación ya que el backend no la requiere)
        console.log('🔍 Generando reportes...');
        const response = await AdminUtils.authenticatedFetch('/admin/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(filters)
        });
        console.log('📡 Respuesta recibida:', response);
        
        if (!response) {
            console.error('❌ No se recibió respuesta');
            return;
        }
        
        if (response.ok) {
            reportsData = await response.json();
            console.log('📊 Datos de reportes recibidos:', reportsData);
            updateMetrics();
            updateCharts();
            await updateTables();
        } else {
            console.error('Error generando reportes:', response.statusText);
            showErrorState('Error generando reportes: ' + response.statusText);
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorState('Error de conexión');
    }
}

// Mostrar estado de carga
function showLoadingState() {
    // Actualizar métricas individuales
    const totalRevenue = document.getElementById('totalRevenue');
    const totalReservations = document.getElementById('totalReservations');
    const occupancyRate = document.getElementById('occupancyRate');
    const uniqueCustomers = document.getElementById('uniqueCustomers');
    
    if (totalRevenue) totalRevenue.textContent = 'Cargando...';
    if (totalReservations) totalReservations.textContent = 'Cargando...';
    if (occupancyRate) occupancyRate.textContent = 'Cargando...';
    if (uniqueCustomers) uniqueCustomers.textContent = 'Cargando...';
}

// Mostrar estado de error
function showErrorState(message) {
    // Actualizar métricas individuales con error
    const totalRevenue = document.getElementById('totalRevenue');
    const totalReservations = document.getElementById('totalReservations');
    const occupancyRate = document.getElementById('occupancyRate');
    const uniqueCustomers = document.getElementById('uniqueCustomers');
    
    if (totalRevenue) totalRevenue.textContent = 'Error';
    if (totalReservations) totalReservations.textContent = 'Error';
    if (occupancyRate) occupancyRate.textContent = 'Error';
    if (uniqueCustomers) uniqueCustomers.textContent = 'Error';
    
    console.error('Error en reportes:', message);
}

// Actualizar métricas
function updateMetrics() {
    const metrics = reportsData.metrics;
    
    // Actualizar métricas individuales
    const totalRevenue = document.getElementById('totalRevenue');
    const totalReservations = document.getElementById('totalReservations');
    const occupancyRate = document.getElementById('occupancyRate');
    const uniqueCustomers = document.getElementById('uniqueCustomers');
    
    if (totalRevenue) totalRevenue.textContent = `$${metrics.ingresosTotales.toLocaleString()}`;
    if (totalReservations) totalReservations.textContent = metrics.reservasTotales;
    if (occupancyRate) occupancyRate.textContent = `${metrics.ocupacionPromedio}%`;
    if (uniqueCustomers) uniqueCustomers.textContent = metrics.clientesUnicos;
}

// Actualizar gráficos
function updateCharts() {
    const charts = reportsData.charts;
    
    // Gráfico de ingresos por día
    updateIncomeChart(charts.ingresosPorDia);
    
    // Gráfico de reservas por tipo
    updateReservationsChart(charts.reservasPorTipo);
    
    // Gráfico de ocupación por complejo
    updateOccupancyChart(charts.ocupacionPorComplejo);
    
    // Gráfico de horarios populares
    updateHoursChart(charts.horariosPopulares);
}

// Actualizar gráfico de ingresos
function updateIncomeChart(data) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.fecha),
            datasets: [{
                label: 'Ingresos',
                data: data.map(item => item.ingresos),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ingresos por Día'
                }
            }
        }
    });
}

// Actualizar gráfico de reservas
function updateReservationsChart(data) {
    const canvas = document.getElementById('typeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.tipo),
            datasets: [{
                data: data.map(item => item.cantidad),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Reservas por Tipo'
                }
            }
        }
    });
}

// Actualizar gráfico de ocupación
function updateOccupancyChart(data) {
    const canvas = document.getElementById('occupancyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.complejo),
            datasets: [{
                label: 'Ocupación (%)',
                data: data.map(item => item.ocupacion),
                backgroundColor: 'rgba(54, 162, 235, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ocupación por Complejo'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Actualizar gráfico de horarios
function updateHoursChart(data) {
    const canvas = document.getElementById('hoursChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.hora),
            datasets: [{
                label: 'Reservas',
                data: data.map(item => item.cantidad),
                backgroundColor: 'rgba(255, 99, 132, 0.8)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Horarios Más Populares'
                }
            }
        }
    });
}

// Actualizar tablas
async function updateTables() {
    await updateCustomersTable();
}

// Actualizar tabla de clientes
async function updateCustomersTable() {
    try {
        const filters = getFilters();
        const { dateFrom, dateTo, complexId } = filters;
        
        // Verificar que las fechas no estén vacías
        if (!dateFrom || !dateTo) {
            throw new Error(`Fechas inválidas: dateFrom=${dateFrom}, dateTo=${dateTo}`);
        }
        
        const url = new URL('/admin/customers-analysis', window.location.origin);
        url.searchParams.append('dateFrom', dateFrom);
        url.searchParams.append('dateTo', dateTo);
        if (complexId) url.searchParams.append('complexId', complexId);
        
        console.log('🔗 URL:', url.toString());
        
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        console.log('📡 Respuesta customers:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const customersData = await response.json();
        console.log('👥 Datos de clientes:', customersData);
        
        // Actualizar tabla
        const tbody = document.querySelector('#customersTable tbody');
        if (tbody) {
            tbody.innerHTML = customersData.map(customer => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-3">
                                <i class="fas fa-user-circle fa-2x text-primary"></i>
                            </div>
                            <div>
                                <div class="fw-bold">${customer.nombre_cliente}</div>
                                <small class="text-muted">${customer.identificador_cliente}</small>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-primary">${customer.total_reservas}</span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-success">$${customer.total_gastado.toLocaleString()}</span>
                    </td>
                    <td class="text-center">
                        <small class="text-muted">${customer.ultima_reserva}</small>
                    </td>
                </tr>
            `).join('');
        }
        
    } catch (error) {
        console.error('❌ Error cargando análisis de clientes:', error);
        // No mostrar error en UI ya que la tabla ya existe en el HTML
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
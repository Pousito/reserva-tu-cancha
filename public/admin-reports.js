// Variables globales
let currentUser = null;
let reportsData = null;
let complexes = [];

// Variables para almacenar instancias de gráficos
let revenueChart = null;
let typeChart = null;
let occupancyChart = null;
let hoursChart = null;

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
    if (totalReservations) totalReservations.textContent = metrics.totalReservas;
    if (occupancyRate) occupancyRate.textContent = `${metrics.ocupacionPromedio || 0}%`;
    if (uniqueCustomers) uniqueCustomers.textContent = metrics.reservasConfirmadas;
}

// Destruir gráficos existentes
function destroyCharts() {
    if (revenueChart) {
        revenueChart.destroy();
        revenueChart = null;
    }
    if (typeChart) {
        typeChart.destroy();
        typeChart = null;
    }
    if (occupancyChart) {
        occupancyChart.destroy();
        occupancyChart = null;
    }
    if (hoursChart) {
        hoursChart.destroy();
        hoursChart = null;
    }
}

// Actualizar gráficos
function updateCharts() {
    const charts = reportsData.charts;
    
    // Destruir gráficos existentes antes de crear nuevos
    destroyCharts();
    
    // Gráfico de ingresos por día
    updateIncomeChart(charts.reservasPorDia);
    
    // Gráfico de reservas por tipo
    updateReservationsChart(charts.reservasPorTipo);
    
    // Gráfico de ocupación por complejo
    updateOccupancyChart(charts.reservasPorComplejo);
    
    // Gráfico de horarios populares
    updateHoursChart(charts.horariosPopulares);
}

// Actualizar gráfico de ingresos
function updateIncomeChart(data) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    
    // Crear gradiente para el área
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.1)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.02)');
    
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => {
                // Usar la fecha tal como viene del servidor (ya convertida a zona horaria de Chile)
                const [año, mes, dia] = item.fecha.split('-');
                return new Date(año, mes - 1, dia).toLocaleDateString('es-CL');
            }),
            datasets: [{
                label: 'Ingresos',
                data: data.map(item => parseInt(item.ingresos)),
                borderColor: '#22c55e',
                backgroundColor: gradient,
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#22c55e',
                pointBorderWidth: 3,
                pointRadius: 8,
                pointHoverRadius: 12,
                pointHoverBackgroundColor: '#22c55e',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(34, 197, 94, 0.3)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    borderColor: '#22c55e',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    caretSize: 8,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(0, 0, 0, 0.2)',
                    callbacks: {
                        label: function(context) {
                            return `Ingresos: $${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 12,
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    },
                    border: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                line: {
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(34, 197, 94, 0.2)'
                }
            }
        }
    });
}

// Actualizar gráfico de reservas
function updateReservationsChart(data) {
    const canvas = document.getElementById('typeChart');
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => item.tipo),
            datasets: [{
                data: data.map(item => parseInt(item.cantidad)),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.9)',
                    'rgba(236, 72, 153, 0.9)',
                    'rgba(14, 165, 233, 0.9)',
                    'rgba(34, 197, 94, 0.9)',
                    'rgba(245, 158, 11, 0.9)',
                    'rgba(168, 85, 247, 0.9)',
                    'rgba(239, 68, 68, 0.9)',
                    'rgba(6, 182, 212, 0.9)'
                ],
                borderColor: [
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                    '#ffffff'
                ],
                borderWidth: 3,
                hoverOffset: 15,
                hoverBorderWidth: 4,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(0, 0, 0, 0.15)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart',
                animateRotate: true,
                animateScale: true
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 13,
                            weight: '500'
                        },
                        color: '#374151',
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    const total = dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        strokeStyle: dataset.borderColor[i],
                                        lineWidth: dataset.borderWidth,
                                        pointStyle: 'circle',
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: true,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    caretSize: 8,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(0, 0, 0, 0.2)',
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} reservas (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            radius: '85%'
        }
    });
}

// Actualizar gráfico de ocupación
function updateOccupancyChart(data) {
    const canvas = document.getElementById('occupancyChart');
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    
    // Crear gradiente para las barras
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.9)');
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.7)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.5)');
    
    occupancyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.complejo),
            datasets: [{
                label: 'Ocupación (%)',
                data: data.map(item => Math.round(parseFloat(item.ocupacion_real))),
                backgroundColor: gradient,
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(245, 158, 11, 0.3)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutBack'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    caretSize: 8,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(0, 0, 0, 0.2)',
                    callbacks: {
                        label: function(context) {
                            return `Ocupación: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 12,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    border: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Actualizar gráfico de horarios
function updateHoursChart(data) {
    const canvas = document.getElementById('hoursChart');
    if (!canvas || !data) return;
    
    const ctx = canvas.getContext('2d');
    
    // Crear gradiente para las barras
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
    gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.7)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.5)');
    
    hoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.hora),
            datasets: [{
                label: 'Reservas',
                data: data.map(item => parseInt(item.cantidad)),
                backgroundColor: gradient,
                borderColor: '#ec4899',
                borderWidth: 2,
                borderRadius: {
                    topLeft: 12,
                    topRight: 12,
                    bottomLeft: 0,
                    bottomRight: 0
                },
                borderSkipped: false,
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 12,
                shadowColor: 'rgba(236, 72, 153, 0.3)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeOutBack'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f1f5f9',
                    borderColor: '#ec4899',
                    borderWidth: 2,
                    cornerRadius: 12,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    caretSize: 8,
                    shadowOffsetX: 0,
                    shadowOffsetY: 4,
                    shadowBlur: 12,
                    shadowColor: 'rgba(0, 0, 0, 0.2)',
                    callbacks: {
                        label: function(context) {
                            return `Reservas: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        padding: 12,
                        stepSize: 1
                    },
                    border: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Actualizar tablas
async function updateTables() {
    console.log('🔄 Iniciando updateTables...');
    try {
        await Promise.all([
            updateTopComplexesTable(),
            updateTopCourtsTable(),
            updateCustomersTable()
        ]);
        console.log('✅ updateTables completado');
    } catch (error) {
        console.error('❌ Error en updateTables:', error);
    }
}

// Actualizar tabla de Top Complejos
async function updateTopComplexesTable() {
    try {
        console.log('🏆 Cargando Top Complejos...');
        
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const complexId = document.getElementById('complexFilter')?.value;
        
        if (!dateFrom || !dateTo) {
            console.log('⚠️ Fechas no disponibles para Top Complejos');
            return;
        }
        
        // Construir URL y body para POST
        const url = '/admin/reports';
        const body = {
            dateFrom: dateFrom,
            dateTo: dateTo
        };
        
        if (complexId && complexId !== 'all') {
            body.complexId = complexId;
        }
        
        console.log('🔗 URL Top Complejos:', url);
        console.log('📦 Body Top Complejos:', body);
        
        const response = await AdminUtils.authenticatedFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Datos Top Complejos:', data);
        
        const tbody = document.getElementById('topComplexesTable');
        if (!tbody) {
            console.log('⚠️ Elemento topComplexesTable no encontrado');
            return;
        }
        
        if (data.charts && data.charts.reservasPorComplejo && data.charts.reservasPorComplejo.length > 0) {
            tbody.innerHTML = data.charts.reservasPorComplejo.map(item => `
                <tr>
                    <td><strong>${item.complejo}</strong></td>
                    <td><span class="badge bg-primary">${item.cantidad || 0}</span></td>
                    <td><span class="text-success">$${parseInt(item.ingresos || 0).toLocaleString()}</span></td>
                    <td><span class="badge bg-info">${Math.round(parseFloat(item.ocupacion_real || 0))}%</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-info-circle me-2"></i>No hay datos disponibles
                    </td>
                </tr>
            `;
        }
        
        console.log('✅ Top Complejos actualizado');
        
    } catch (error) {
        console.error('❌ Error cargando Top Complejos:', error);
        const tbody = document.getElementById('topComplexesTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error cargando datos
                    </td>
                </tr>
            `;
        }
    }
}

// Actualizar tabla de Top Canchas
async function updateTopCourtsTable() {
    try {
        console.log('⭐ Cargando Top Canchas...');
        
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const complexId = document.getElementById('complexFilter')?.value;
        
        if (!dateFrom || !dateTo) {
            console.log('⚠️ Fechas no disponibles para Top Canchas');
            return;
        }
        
        // Construir URL y body para POST
        const url = '/admin/reports';
        const body = {
            dateFrom: dateFrom,
            dateTo: dateTo
        };
        
        if (complexId && complexId !== 'all') {
            body.complexId = complexId;
        }
        
        console.log('🔗 URL Top Canchas:', url);
        console.log('📦 Body Top Canchas:', body);
        
        const response = await AdminUtils.authenticatedFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Datos Top Canchas:', data);
        
        const tbody = document.getElementById('topCourtsTable');
        if (!tbody) {
            console.log('⚠️ Elemento topCourtsTable no encontrado');
            return;
        }
        
        // Usar datos reales de tables.topCanchas
        if (data.tables && data.tables.topCanchas && data.tables.topCanchas.length > 0) {
            tbody.innerHTML = data.tables.topCanchas.map(item => `
                <tr>
                    <td><strong>${item.cancha}</strong></td>
                    <td>${item.complejo}</td>
                    <td><span class="badge bg-primary">${item.reservas || 0}</span></td>
                    <td><span class="text-success">$${parseInt(item.ingresos || 0).toLocaleString()}</span></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">
                        <i class="fas fa-info-circle me-2"></i>No hay datos disponibles
                    </td>
                </tr>
            `;
        }
        
        console.log('✅ Top Canchas actualizado');
        
    } catch (error) {
        console.error('❌ Error cargando Top Canchas:', error);
        const tbody = document.getElementById('topCourtsTable');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>Error cargando datos
                    </td>
                </tr>
            `;
        }
    }
}

// Actualizar tabla de clientes
async function updateCustomersTable() {
    try {
        console.log('👥 Cargando Análisis de Clientes...');
        
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const complexId = document.getElementById('complexFilter')?.value;
        
        console.log('📅 Fechas obtenidas:', { dateFrom, dateTo, complexId });
        
        if (!dateFrom || !dateTo) {
            console.log('⚠️ Fechas no disponibles para Análisis de Clientes');
            return;
        }
        
        // Construir URL relativa con parámetros
        let url = '/admin/customers-analysis';
        const params = new URLSearchParams();
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);
        if (complexId) params.append('complexId', complexId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log('🔗 URL relativa:', url);
        
        const response = await AdminUtils.authenticatedFetch(url);
        
        console.log('📡 Respuesta customers:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('👥 Respuesta completa:', responseData);
        
        // Extraer datos de clientes de la respuesta
        const customersData = responseData.data?.clientesFrecuentes || [];
        console.log('👥 Datos de clientes:', customersData);
        
        // Actualizar tabla
        const tbody = document.querySelector('#customersTable');
        console.log('🔍 Elemento tbody encontrado:', tbody);
        console.log('📊 Datos de clientes a mostrar:', customersData.length);
        
        if (tbody) {
            if (customersData.length > 0) {
                tbody.innerHTML = customersData.map(customer => `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar me-3">
                                <i class="fas fa-user-circle fa-2x text-primary"></i>
                            </div>
                            <div>
                                <div class="fw-bold">${customer.nombre_cliente}</div>
                                <small class="text-muted">${customer.email_cliente}</small>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-primary">${customer.total_reservas}</span>
                    </td>
                    <td class="text-center">
                        <span class="badge bg-success">$${customer.promedio_por_reserva.toLocaleString()}</span>
                    </td>
                    <td class="text-center">
                        <small class="text-muted">${new Date(customer.ultima_reserva).toLocaleDateString()}</small>
                    </td>
                </tr>
            `).join('');
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center text-muted">
                            <i class="fas fa-info-circle me-2"></i>No hay datos disponibles
                        </td>
                    </tr>
                `;
            }
        }
        
        console.log('✅ Análisis de Clientes actualizado');
        
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
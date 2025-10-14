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
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar que Chart.js esté disponible
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no está disponible');
        showNotification('Error: Chart.js no está disponible. Recarga la página.', 'error');
        return;
    }
    
    console.log('✅ Chart.js disponible, versión:', Chart.version);
    
    // Inicializar sistema de roles
    if (!AdminUtils.initializeRoleSystem()) {
        return;
    }
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    currentUser = AdminUtils.getCurrentUser();
    document.getElementById('adminWelcome').textContent = `Bienvenido, ${currentUser.nombre}`;
    
    // Cargar complejos primero, luego aplicar permisos
    await loadComplexes();
    
    // Aplicar permisos después de cargar complejos (ahora es async)
    await aplicarPermisosPorRol();
    
    // Aplicar sistema centralizado de roles de AdminUtils
    AdminUtils.hideElementsByRole();
    
    setupEventListeners();
    setDefaultDates();
    generateReports();
    
    // Verificar que los botones de descarga estén disponibles
    setTimeout(() => {
        verifyDownloadButtons();
    }, 1000);
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

// Verificar cuántas canchas tiene el complejo del owner
async function verificarCanchasComplejo(complexId) {
    try {
        console.log('🔍 Verificando cantidad de canchas para complejo:', complexId);
        
        const response = await AdminUtils.authenticatedFetch(`/admin/canchas?complejo_id=${complexId}`);
        
        if (!response || !response.ok) {
            console.error('❌ Error obteniendo canchas del complejo');
            return null;
        }
        
        const canchas = await response.json();
        const cantidadCanchas = canchas.length;
        
        console.log(`📊 Complejo ${complexId} tiene ${cantidadCanchas} cancha(s)`);
        return cantidadCanchas;
        
    } catch (error) {
        console.error('❌ Error verificando canchas:', error);
        return null;
    }
}

// Aplicar permisos según el rol del usuario
async function aplicarPermisosPorRol() {
    console.log('🔐 Aplicando permisos en reportes...');
    
    const user = AdminUtils.getCurrentUser();
    if (!user) {
        console.log('❌ No se pudo obtener el usuario');
        return;
    }
    
    const userRole = user.rol;
    console.log('🔐 Aplicando permisos para rol:', userRole);
    
    // Aplicar visibilidad del sidebar según el rol
    const complejosLink = document.querySelector('a[href="admin-complexes.html"]');
    const gastosLink = document.querySelector('a[href="admin-gastos.html"]');
    
    if (userRole === 'manager') {
        // Managers no pueden ver complejos ni gastos
        if (complejosLink) complejosLink.style.display = 'none';
        if (gastosLink) gastosLink.style.display = 'none';
    } else if (userRole === 'owner') {
        // Owners no pueden ver complejos pero sí gastos
        if (complejosLink) complejosLink.style.display = 'none';
        if (gastosLink) {
            gastosLink.style.display = 'block';
            gastosLink.classList.add('owner-visible');
        }
    } else if (userRole === 'super_admin') {
        // Super admin puede ver todo
        if (complejosLink) complejosLink.style.display = 'block';
        if (gastosLink) gastosLink.style.display = 'block';
    }
    
    // Ocultar elementos según el rol
    if (userRole === 'manager') {
        // Managers no pueden ver reportes
        const managerElements = document.querySelectorAll('.hide-for-manager');
        console.log(`🔍 Encontrados ${managerElements.length} elementos para ocultar para manager`);
        managerElements.forEach(element => {
            element.style.display = 'none';
        });
        console.log('✅ Elementos ocultados para manager');
    } else if (userRole === 'owner') {
        // Owners no pueden ver filtro de complejos (solo ven su complejo)
        const ownerElements = document.querySelectorAll('.hide-for-owner');
        console.log(`🔍 Encontrados ${ownerElements.length} elementos para ocultar para owner`);
        ownerElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // Asegurar que el selector de complejo esté oculto específicamente
        const complexFilter = document.getElementById('complexFilter');
        const complexFilterContainer = complexFilter ? complexFilter.closest('.filter-item') : null;
        if (complexFilterContainer) {
            complexFilterContainer.style.display = 'none';
            console.log('✅ Selector de complejo ocultado específicamente para owner');
        }
        
        // Asegurar que los botones de descarga estén visibles para owners
        const downloadButtons = document.getElementById('downloadButtons');
        if (downloadButtons) {
            downloadButtons.style.display = 'block';
            downloadButtons.style.visibility = 'visible';
            console.log('✅ Botones de descarga configurados como visibles para owner');
        } else {
            console.log('⚠️ Elemento downloadButtons no encontrado');
        }
        
        // Verificar cantidad de canchas del complejo del owner
        if (user.complejo_id) {
            const cantidadCanchas = await verificarCanchasComplejo(user.complejo_id);
            
            const topCourtsColumn = document.getElementById('topCourtsColumn');
            
            if (cantidadCanchas !== null && cantidadCanchas <= 1) {
                // Si solo tiene 1 cancha o ninguna, ocultar "Top Canchas"
                if (topCourtsColumn) {
                    topCourtsColumn.style.display = 'none';
                    console.log('✅ Sección "Top Canchas" ocultada para owner (solo tiene 1 cancha)');
                }
            } else {
                // Si tiene múltiples canchas, ajustar el ancho a completo
                if (topCourtsColumn) {
                    topCourtsColumn.classList.remove('col-lg-6');
                    topCourtsColumn.classList.add('col-lg-12');
                    topCourtsColumn.style.display = '';
                    console.log('✅ Columna Top Canchas ajustada a ancho completo para owner');
                }
            }
        }
        
        console.log('✅ Elementos ocultados para owner');
    } else if (userRole === 'super_admin') {
        // Super admins pueden ver todo - asegurar que todos los elementos estén visibles
        console.log('✅ Super admin - acceso completo');
        
        // Asegurar que todos los elementos estén visibles
        const allHiddenElements = document.querySelectorAll('.hide-for-manager, .hide-for-owner');
        console.log(`🔍 Asegurando visibilidad de ${allHiddenElements.length} elementos para super admin`);
        
        allHiddenElements.forEach((element, index) => {
            // Remover todas las clases de ocultación
            element.classList.remove('hide-for-manager');
            element.classList.remove('hide-for-owner');
            // Forzar visibilidad
            element.style.display = '';
            element.style.visibility = '';
            console.log(`✅ Elemento ${index + 1} configurado como visible para super admin`);
        });
        
        // Asegurar que la columna "Top Canchas" tenga el tamaño correcto para super_admin
        const topCourtsColumn = document.getElementById('topCourtsColumn');
        if (topCourtsColumn) {
            topCourtsColumn.classList.remove('col-lg-12');
            topCourtsColumn.classList.add('col-lg-6');
            console.log('✅ Columna Top Canchas configurada a col-lg-6 para super_admin');
        }
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
    if (!select) return; // Si no existe el selector, no hacer nada
    
    const user = AdminUtils.getCurrentUser();
    if (!user) return;
    
    // Solo poblar el selector si el usuario no es owner
    if (user.rol === 'owner') {
        // Para owners, no poblar el selector ya que está oculto
        return;
    }
    
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
    
    const user = AdminUtils.getCurrentUser();
    let complexId = null;
    
    // Para owners, usar automáticamente su complejo
    if (user && user.rol === 'owner' && user.complejo_id) {
        complexId = user.complejo_id;
        console.log('🏢 Owner detectado, usando complejo automático:', complexId);
    } else if (complexFilter) {
        // Para super_admin y otros roles, usar el selector
        complexId = complexFilter.value || null;
    }
    
    return {
        dateFrom: dateFrom ? dateFrom.value : '',
        dateTo: dateTo ? dateTo.value : '',
        complexId: complexId,
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
            showNotification('Reportes generados exitosamente', 'success');
        } else {
            console.error('Error generando reportes:', response.statusText);
            showErrorState('Error generando reportes: ' + response.statusText);
            showNotification('Error generando reportes: ' + response.statusText, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        // Solo mostrar error si no es un error de red temporal
        if (error.message && !error.message.includes('Failed to fetch')) {
            showErrorState('Error de conexión');
            showNotification('Error de conexión: ' + error.message, 'error');
        }
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
    if (uniqueCustomers) uniqueCustomers.textContent = metrics.clientes_unicos || 0;
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
    console.log('🎨 Actualizando gráficos...');
    console.log('📊 Datos de reportes:', reportsData);
    
    if (!reportsData || !reportsData.charts) {
        console.error('❌ No hay datos de gráficos disponibles');
        return;
    }
    
    const charts = reportsData.charts;
    console.log('📈 Datos de gráficos:', charts);
    
    // Destruir gráficos existentes antes de crear nuevos
    destroyCharts();
    
    // Gráfico de ingresos por día
    console.log('📊 Actualizando gráfico de ingresos:', charts.reservasPorDia);
    updateIncomeChart(charts.reservasPorDia);
    
    // Gráfico de reservas por tipo
    console.log('📊 Actualizando gráfico de tipos:', charts.reservasPorTipo);
    updateReservationsChart(charts.reservasPorTipo);
    
    // Gráfico de ocupación por complejo
    console.log('📊 Actualizando gráfico de ocupación:', charts.reservasPorComplejo);
    updateOccupancyChart(charts.reservasPorComplejo);
    
    // Gráfico de horarios populares
    console.log('📊 Actualizando gráfico de horarios:', charts.horariosPopulares);
    updateHoursChart(charts.horariosPopulares);
}

// Actualizar gráfico de ingresos
function updateIncomeChart(data) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas || !data) {
        console.error('❌ Canvas o datos no disponibles para gráfico de ingresos');
        return;
    }
    
    console.log('📊 Datos para gráfico de ingresos:', data);
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no está disponible para crear gráfico de ingresos');
        return;
    }
    
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
                // Manejar fechas de forma más robusta
                if (!item.fecha) return 'Sin fecha';
                
                try {
                    // Si la fecha ya está en formato YYYY-MM-DD, usarla directamente
                    if (typeof item.fecha === 'string' && item.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [año, mes, dia] = item.fecha.split('-');
                        const fechaObj = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
                        return fechaObj.toLocaleDateString('es-CL');
                    }
                    
                    // Si es una fecha ISO, convertirla
                    const fechaObj = new Date(item.fecha);
                    if (isNaN(fechaObj.getTime())) {
                        console.error('Fecha inválida:', item.fecha);
                        return 'Fecha inválida';
                    }
                    return fechaObj.toLocaleDateString('es-CL');
                } catch (error) {
                    console.error('Error procesando fecha:', error, 'Fecha original:', item.fecha);
                    return 'Error fecha';
                }
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

// Verificar que los botones de descarga estén disponibles
function verifyDownloadButtons() {
    const downloadButtons = document.getElementById('downloadButtons');
    const user = AdminUtils.getCurrentUser();
    
    console.log('🔍 Verificando botones de descarga...');
    console.log('👤 Usuario:', user ? user.rol : 'No encontrado');
    console.log('🔘 Elemento downloadButtons:', downloadButtons ? 'Encontrado' : 'No encontrado');
    
    if (downloadButtons) {
        const computedStyle = window.getComputedStyle(downloadButtons);
        console.log('📊 Estilo del elemento:');
        console.log('  - display:', computedStyle.display);
        console.log('  - visibility:', computedStyle.visibility);
        console.log('  - opacity:', computedStyle.opacity);
        
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
            console.log('⚠️ Botones de descarga están ocultos, forzando visibilidad...');
            downloadButtons.style.display = 'block';
            downloadButtons.style.visibility = 'visible';
            downloadButtons.style.opacity = '1';
        }
    } else {
        // Si no se encuentra el elemento, crearlo dinámicamente
        console.log('⚠️ Elemento downloadButtons no encontrado, creando dinámicamente...');
        createDownloadButtons();
    }
    
    // Verificar botones individuales
    const pdfButton = document.querySelector('button[onclick*="downloadIncomeReport(\'pdf\')"]');
    const excelButton = document.querySelector('button[onclick*="downloadIncomeReport(\'excel\')"]');
    
    console.log('📄 Botón PDF:', pdfButton ? 'Encontrado' : 'No encontrado');
    console.log('📊 Botón Excel:', excelButton ? 'Encontrado' : 'No encontrado');
}

// Crear botones de descarga dinámicamente
function createDownloadButtons() {
    try {
        // Buscar el contenedor de filtros
        const filtersContainer = document.querySelector('.filter-group');
        if (!filtersContainer) {
            console.log('❌ No se encontró el contenedor de filtros');
            return;
        }
        
        // Crear el contenedor de botones de descarga
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'filter-item';
        downloadContainer.id = 'downloadButtons';
        
        // Crear el label
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = 'Reportes de Ingresos';
        
        // Crear el grupo de botones
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'btn-group';
        buttonGroup.setAttribute('role', 'group');
        
        // Crear botón PDF
        const pdfButton = document.createElement('button');
        pdfButton.className = 'btn btn-success';
        pdfButton.innerHTML = '<i class="fas fa-file-pdf me-2"></i>PDF';
        pdfButton.title = 'Descargar reporte de ingresos en PDF';
        pdfButton.onclick = () => downloadIncomeReport('pdf');
        
        // Crear botón Excel
        const excelButton = document.createElement('button');
        excelButton.className = 'btn btn-success';
        excelButton.innerHTML = '<i class="fas fa-file-excel me-2"></i>Excel';
        excelButton.title = 'Descargar reporte de ingresos en Excel';
        excelButton.onclick = () => downloadIncomeReport('excel');
        
        // Ensamblar los elementos
        buttonGroup.appendChild(pdfButton);
        buttonGroup.appendChild(excelButton);
        downloadContainer.appendChild(label);
        downloadContainer.appendChild(buttonGroup);
        
        // Insertar después del botón "Generar Reportes"
        const generateButton = document.querySelector('button[onclick="generateReports()"]');
        if (generateButton) {
            const generateContainer = generateButton.closest('.filter-item');
            if (generateContainer && generateContainer.nextSibling) {
                generateContainer.parentNode.insertBefore(downloadContainer, generateContainer.nextSibling);
            } else {
                filtersContainer.appendChild(downloadContainer);
            }
        } else {
            filtersContainer.appendChild(downloadContainer);
        }
        
        console.log('✅ Botones de descarga creados dinámicamente');
        
    } catch (error) {
        console.error('❌ Error creando botones de descarga:', error);
    }
}

// Descargar reporte de ingresos
async function downloadIncomeReport(format) {
    try {
        console.log(`📥 Descargando reporte de ingresos en formato ${format.toUpperCase()}...`);
        
        // Obtener fechas actuales
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        
        if (!dateFrom || !dateTo) {
            showNotification('Por favor selecciona las fechas de inicio y fin', 'error');
            return;
        }
        
        // Obtener complejo según el rol del usuario
        const user = AdminUtils.getCurrentUser();
        let complexId = null;
        
        // Para owners, usar automáticamente su complejo
        if (user && user.rol === 'owner' && user.complejo_id) {
            complexId = user.complejo_id;
        } else {
            const complexFilter = document.getElementById('complexFilter');
            complexId = complexFilter ? complexFilter.value : null;
        }
        
        if (!complexId) {
            showNotification('Por favor selecciona un complejo', 'error');
            return;
        }
        
        console.log('🔍 Parámetros del reporte:', { format, dateFrom, dateTo, complexId });
        
        // Mostrar indicador de carga
        showNotification(`Generando reporte ${format.toUpperCase()}...`, 'info');
        
        // Construir URL
        const url = `${API_BASE}/admin/reports/income/${format}?dateFrom=${dateFrom}&dateTo=${dateTo}&complexId=${complexId}`;
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_ingresos_${dateFrom}_${dateTo}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        
        // Agregar token de autorización
        const token = AdminUtils.getAuthToken();
        if (token) {
            // Para descargas con autenticación, usar fetch
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error generando reporte');
            }
            
            // Obtener el archivo como blob
            const blob = await response.blob();
            
            // Crear URL del blob y descargar
            const blobUrl = window.URL.createObjectURL(blob);
            link.href = blobUrl;
            
            // Simular click para descargar
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar URL del blob
            window.URL.revokeObjectURL(blobUrl);
            
            showNotification(`Reporte ${format.toUpperCase()} descargado exitosamente`, 'success');
            console.log(`✅ Reporte ${format.toUpperCase()} descargado exitosamente`);
        } else {
            throw new Error('No se encontró token de autorización');
        }
        
    } catch (error) {
        console.error('❌ Error descargando reporte:', error);
        showNotification(`Error descargando reporte: ${error.message}`, 'error');
    }
}

// Actualizar tabla de Top Complejos
async function updateTopComplexesTable() {
    try {
        console.log('🏆 Cargando Top Complejos...');
        
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        
        // Usar la misma lógica que getFilters() para obtener complexId
        const user = AdminUtils.getCurrentUser();
        let complexId = null;
        
        // Para owners, usar automáticamente su complejo
        if (user && user.rol === 'owner' && user.complejo_id) {
            complexId = user.complejo_id;
        } else {
            const complexFilter = document.getElementById('complexFilter');
            complexId = complexFilter ? complexFilter.value : null;
        }
        
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
        
        // Usar la misma lógica que getFilters() para obtener complexId
        const user = AdminUtils.getCurrentUser();
        let complexId = null;
        
        // Para owners, usar automáticamente su complejo
        if (user && user.rol === 'owner' && user.complejo_id) {
            complexId = user.complejo_id;
        } else {
            const complexFilter = document.getElementById('complexFilter');
            complexId = complexFilter ? complexFilter.value : null;
        }
        
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
        
        // Usar la misma lógica que getFilters() para obtener complexId
        const user = AdminUtils.getCurrentUser();
        let complexId = null;
        
        // Para owners, usar automáticamente su complejo
        if (user && user.rol === 'owner' && user.complejo_id) {
            complexId = user.complejo_id;
            console.log('🏢 Owner detectado en customers, usando complejo automático:', complexId);
        } else {
            const complexFilter = document.getElementById('complexFilter');
            complexId = complexFilter ? complexFilter.value : null;
        }
        
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
                                ${customer.rut_cliente ? `<br><small class="text-info"><i class="fas fa-id-card me-1"></i>${customer.rut_cliente}</small>` : ''}
                                ${customer.telefono_cliente ? `<br><small class="text-success"><i class="fas fa-phone me-1"></i>${customer.telefono_cliente}</small>` : ''}
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

// Exportar tabla a PDF
async function exportToPDF(tableType) {
    try {
        console.log(`📄 Exportando ${tableType} a PDF...`);
        showNotification(`Generando PDF de ${tableType}...`, 'info');
        
        let tableData = [];
        let headers = [];
        let title = '';
        let filePrefix = '';
        
        switch(tableType) {
            case 'topComplexes':
                title = 'Top Complejos';
                filePrefix = 'Top_Complejos';
                headers = ['Complejo', 'Reservas', 'Ingresos', 'Ocupación'];
                const complexesRows = document.querySelectorAll('#topComplexesTable tr');
                complexesRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const rowData = [
                            cells[0].textContent.trim(),
                            cells[1].textContent.trim(),
                            cells[2].textContent.trim(),
                            cells[3].textContent.trim()
                        ];
                        tableData.push(rowData);
                    }
                });
                break;
                
            case 'topCourts':
                title = 'Top Canchas';
                filePrefix = 'Top_Canchas';
                headers = ['Cancha', 'Complejo', 'Reservas', 'Ingresos'];
                const courtsRows = document.querySelectorAll('#topCourtsTable tr');
                courtsRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const rowData = [
                            cells[0].textContent.trim(),
                            cells[1].textContent.trim(),
                            cells[2].textContent.trim(),
                            cells[3].textContent.trim()
                        ];
                        tableData.push(rowData);
                    }
                });
                break;
                
            case 'customers':
                title = 'Análisis de Clientes';
                filePrefix = 'Analisis_de_Clientes';
                headers = ['Cliente', 'Email', 'RUT', 'Teléfono', 'Reservas', 'Promedio', 'Última Reserva'];
                const customersRows = document.querySelectorAll('#customersTable tr');
                customersRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const nombre = cells[0].querySelector('.fw-bold')?.textContent.trim() || '';
                        const email = cells[0].querySelector('.text-muted')?.textContent.trim() || '';
                        const rut = cells[0].querySelector('.text-info')?.textContent.replace(/.*fa-id-card.*?/, '').trim() || '';
                        const telefono = cells[0].querySelector('.text-success')?.textContent.replace(/.*fa-phone.*?/, '').trim() || '';
                        const reservas = cells[1].textContent.trim();
                        const promedio = cells[2].textContent.trim();
                        const ultimaReserva = cells[3].textContent.trim();
                        
                        tableData.push([nombre, email, rut, telefono, reservas, promedio, ultimaReserva]);
                    }
                });
                break;
        }
        
        if (tableData.length === 0) {
            showNotification('No hay datos para exportar', 'error');
            return;
        }
        
        // Importar jsPDF dinámicamente si no está disponible
        if (typeof jspdf === 'undefined') {
            showNotification('Cargando librería PDF...', 'info');
            await loadJsPDF();
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Obtener nombre del complejo del usuario
        const user = AdminUtils.getCurrentUser();
        let complexName = '';
        if (user && user.complejo_id && complexes && complexes.length > 0) {
            const userComplex = complexes.find(c => c.id === user.complejo_id);
            if (userComplex) {
                complexName = userComplex.nombre.replace(/\s+/g, '_');
            }
        }
        
        // Intentar cargar el logo del complejo
        if (user && user.complejo_id) {
            try {
                // Mapeo de logos (inline para no depender de script externo)
                // ID 6: Borde Río (desarrollo), ID 7: Borde Río (producción)
                const logosMap = {
                    1: '/images/logos/magnasports.png',
                    2: '/images/logos/fundacion-gunnen.png',
                    6: '/images/logos/borde-rio.png',
                    7: '/images/logos/borde-rio.png'
                };
                
                const logoPath = logosMap[user.complejo_id];
                
                if (logoPath) {
                    // Intentar cargar el logo
                    const response = await fetch(logoPath);
                    if (response.ok) {
                        const blob = await response.blob();
                        const reader = new FileReader();
                        
                        await new Promise((resolve) => {
                            reader.onloadend = () => {
                                try {
                                    // Agregar logo en la esquina superior derecha
                                    doc.addImage(reader.result, 'PNG', 170, 5, 30, 30);
                                    console.log('✅ Logo del complejo agregado al PDF de reportes');
                                } catch (imgError) {
                                    console.log('⚠️ Error agregando imagen:', imgError.message);
                                }
                                resolve();
                            };
                            reader.onerror = () => resolve();
                            reader.readAsDataURL(blob);
                        });
                    }
                }
            } catch (error) {
                console.log('⚠️ No se pudo cargar el logo, continuando sin logo:', error.message);
            }
        }
        
        // Título
        doc.setFontSize(18);
        doc.text(title, 14, 20);
        
        // Subtítulo con nombre del complejo si existe
        if (complexName) {
            doc.setFontSize(12);
            doc.text(complexName.replace(/_/g, ' '), 14, 28);
        }
        
        // Fecha del reporte
        doc.setFontSize(10);
        const dateFrom = document.getElementById('dateFrom')?.value || '';
        const dateTo = document.getElementById('dateTo')?.value || '';
        const yPosition = complexName ? 35 : 28;
        doc.text(`Período: ${dateFrom} - ${dateTo}`, 14, yPosition);
        
        // Tabla
        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: yPosition + 7,
            theme: 'grid',
            headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3
            }
        });
        
        // Construir nombre de archivo descriptivo
        let fileName = filePrefix;
        if (complexName) {
            fileName += `_${complexName}`;
        }
        fileName += `_${dateFrom}_${dateTo}.pdf`;
        
        // Guardar PDF
        doc.save(fileName);
        
        showNotification(`PDF descargado: ${fileName}`, 'success');
        console.log(`✅ PDF exportado exitosamente: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error exportando PDF:', error);
        showNotification(`Error exportando PDF: ${error.message}`, 'error');
    }
}

// Exportar tabla a Excel
async function exportToExcel(tableType) {
    try {
        console.log(`📊 Exportando ${tableType} a Excel...`);
        showNotification(`Generando Excel de ${tableType}...`, 'info');
        
        let tableData = [];
        let headers = [];
        let title = '';
        let filePrefix = '';
        
        switch(tableType) {
            case 'topComplexes':
                title = 'Top Complejos';
                filePrefix = 'Top_Complejos';
                headers = ['Complejo', 'Reservas', 'Ingresos', 'Ocupación'];
                const complexesRows = document.querySelectorAll('#topComplexesTable tr');
                complexesRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const rowData = [
                            cells[0].textContent.trim(),
                            cells[1].textContent.trim(),
                            cells[2].textContent.trim().replace('$', ''),
                            cells[3].textContent.trim()
                        ];
                        tableData.push(rowData);
                    }
                });
                break;
                
            case 'topCourts':
                title = 'Top Canchas';
                filePrefix = 'Top_Canchas';
                headers = ['Cancha', 'Complejo', 'Reservas', 'Ingresos'];
                const courtsRows = document.querySelectorAll('#topCourtsTable tr');
                courtsRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const rowData = [
                            cells[0].textContent.trim(),
                            cells[1].textContent.trim(),
                            cells[2].textContent.trim(),
                            cells[3].textContent.trim().replace('$', '')
                        ];
                        tableData.push(rowData);
                    }
                });
                break;
                
            case 'customers':
                title = 'Análisis de Clientes';
                filePrefix = 'Analisis_de_Clientes';
                headers = ['Cliente', 'Email', 'RUT', 'Teléfono', 'Reservas', 'Promedio', 'Última Reserva'];
                const customersRows = document.querySelectorAll('#customersTable tr');
                customersRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 0 && !cells[0].getAttribute('colspan')) {
                        const nombre = cells[0].querySelector('.fw-bold')?.textContent.trim() || '';
                        const email = cells[0].querySelector('.text-muted')?.textContent.trim() || '';
                        const rut = cells[0].querySelector('.text-info')?.textContent.replace(/.*fa-id-card.*?/, '').trim() || '';
                        const telefono = cells[0].querySelector('.text-success')?.textContent.replace(/.*fa-phone.*?/, '').trim() || '';
                        const reservas = cells[1].textContent.trim();
                        const promedio = cells[2].textContent.trim().replace('$', '');
                        const ultimaReserva = cells[3].textContent.trim();
                        
                        tableData.push([nombre, email, rut, telefono, reservas, promedio, ultimaReserva]);
                    }
                });
                break;
        }
        
        if (tableData.length === 0) {
            showNotification('No hay datos para exportar', 'error');
            return;
        }
        
        // Obtener nombre del complejo del usuario
        const user = AdminUtils.getCurrentUser();
        let complexName = '';
        if (user && user.complejo_id && complexes && complexes.length > 0) {
            const userComplex = complexes.find(c => c.id === user.complejo_id);
            if (userComplex) {
                complexName = userComplex.nombre.replace(/\s+/g, '_');
            }
        }
        
        // Crear Excel con SheetJS (XLSX)
        const dateFrom = document.getElementById('dateFrom')?.value || '';
        const dateTo = document.getElementById('dateTo')?.value || '';
        
        // Preparar datos para Excel
        const excelData = [];
        
        // Fila 1: Título
        const titleText = complexName ? `${title} - ${complexName.replace(/_/g, ' ')}` : title;
        excelData.push([titleText]);
        excelData.push([]); // Fila vacía
        
        // Fila 3: Período
        excelData.push([`Período: ${dateFrom} - ${dateTo}`]);
        excelData.push([]); // Fila vacía
        
        // Fila 5: Encabezados
        excelData.push(headers);
        
        // Filas 6+: Datos
        tableData.forEach(row => {
            excelData.push(row);
        });
        
        // Crear hoja de cálculo
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        
        console.log('📊 Aplicando estilos al Excel de', tableType);
        console.log('📊 Rango de celdas:', ws['!ref']);
        
        // Estilo para el título (fila 1) - Más vibrante y moderno
        if (!ws['A1']) ws['A1'] = {};
        ws['A1'].s = {
            font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "E67E22" } }, // Naranja moderno
            alignment: { horizontal: "center", vertical: "center" }
        };
        
        console.log('✅ Estilo título aplicado');
        
        // Estilo para el período (fila 3)
        const periodCell = XLSX.utils.encode_cell({ r: 2, c: 0 });
        if (ws[periodCell]) {
            ws[periodCell].s = {
                font: { bold: true, sz: 11, color: { rgb: "34495E" } },
                fill: { fgColor: { rgb: "ECF0F1" } },
                alignment: { horizontal: "left", vertical: "center" }
            };
        }
        
        // Estilo para encabezados (fila 5) - Degradado de azul a morado
        const headerRow = 5;
        const headerColors = {
            'topComplexes': "3498DB",    // Azul
            'topCourts': "9B59B6",       // Púrpura
            'customers': "1ABC9C"         // Verde azulado
        };
        const headerColor = headerColors[tableType] || "5DADE2";
        
        headers.forEach((header, index) => {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: index });
            if (ws[cellAddress]) {
                ws[cellAddress].s = {
                    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: headerColor } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "medium", color: { rgb: "2C3E50" } },
                        bottom: { style: "medium", color: { rgb: "2C3E50" } },
                        left: { style: "thin", color: { rgb: "2C3E50" } },
                        right: { style: "thin", color: { rgb: "2C3E50" } }
                    }
                };
            }
        });
        
        // Bordes y alternancia de colores para todas las celdas de datos
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = headerRow; R <= range.e.r; ++R) {
            const isEvenRow = (R - headerRow) % 2 === 0;
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (ws[cellAddress]) {
                    if (!ws[cellAddress].s) ws[cellAddress].s = {};
                    
                    // Alternancia de colores (filas pares más claras)
                    ws[cellAddress].s.fill = {
                        fgColor: { rgb: isEvenRow ? "F7F9FB" : "FFFFFF" }
                    };
                    
                    // Bordes más sutiles
                    ws[cellAddress].s.border = {
                        top: { style: "thin", color: { rgb: "D5DBDB" } },
                        bottom: { style: "thin", color: { rgb: "D5DBDB" } },
                        left: { style: "thin", color: { rgb: "D5DBDB" } },
                        right: { style: "thin", color: { rgb: "D5DBDB" } }
                    };
                    
                    // Alineación según el tipo de columna
                    if (tableType === 'customers') {
                        if (C === 4 || C === 5) { // Reservas y Promedio
                            ws[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
                        } else if (C === 6) { // Última Reserva
                            ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
                        } else {
                            ws[cellAddress].s.alignment = { horizontal: "left", vertical: "center" };
                        }
                    } else {
                        ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
                    }
                }
            }
        }
        
        // Anchos de columna optimizados
        if (tableType === 'customers') {
            ws['!cols'] = [
                { wch: 28 }, // Cliente (más ancho)
                { wch: 32 }, // Email (más ancho)
                { wch: 16 }, // RUT
                { wch: 14 }, // Teléfono
                { wch: 12 }, // Reservas
                { wch: 14 }, // Promedio
                { wch: 16 }  // Última Reserva
            ];
        } else {
            ws['!cols'] = headers.map(() => ({ wch: 20 }));
        }
        
        // Fusionar celdas del título y período
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Título
            { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } }  // Período
        ];
        
        // Ajustar altura de filas para que los emojis se vean perfectos
        ws['!rows'] = [];
        ws['!rows'][0] = { hpt: 28 }; // Título principal - más alto
        ws['!rows'][2] = { hpt: 20 }; // Período
        ws['!rows'][4] = { hpt: 24 }; // Encabezados de tabla
        
        // Altura para todas las filas de datos (desde fila 6)
        for (let i = 5; i <= range.e.r; i++) {
            ws['!rows'][i] = { hpt: 21 }; // Filas de datos - altura perfecta para emojis
        }
        
        console.log('✅ Estilos aplicados completamente');
        console.log('📊 Total de filas con estilo:', range.e.r + 1);
        console.log('📊 Alturas de filas configuradas:', ws['!rows'].length);
        
        // Crear libro y agregar hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
        
        // Construir nombre de archivo descriptivo
        let fileName = filePrefix;
        if (complexName) {
            fileName += `_${complexName}`;
        }
        fileName += `_${dateFrom}_${dateTo}.xlsx`;
        
        // Descargar archivo
        XLSX.writeFile(wb, fileName);
        
        showNotification(`Excel descargado: ${fileName}`, 'success');
        console.log(`✅ Excel exportado exitosamente: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error exportando Excel:', error);
        showNotification(`Error exportando Excel: ${error.message}`, 'error');
    }
}

// Cargar jsPDF dinámicamente
async function loadJsPDF() {
    return new Promise((resolve, reject) => {
        if (typeof window.jspdf !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
            autoTableScript.onload = resolve;
            autoTableScript.onerror = reject;
            document.head.appendChild(autoTableScript);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '../../admin-login.html';
}

// Función para forzar la visibilidad de elementos críticos (se ejecuta periódicamente)
function forzarVisibilidadElementos() {
    const user = AdminUtils.getCurrentUser();
    if (user && (user.rol === 'owner' || user.rol === 'super_admin')) {
        // Forzar visibilidad de enlaces críticos
        const elementosCriticos = [
            'a[href="admin-gastos.html"]'
        ];
        
        elementosCriticos.forEach(selector => {
            const elementos = document.querySelectorAll(selector);
            elementos.forEach(elemento => {
                elemento.classList.add('owner-visible');
                elemento.classList.remove('hide-for-owner');
                elemento.style.display = 'block';
                elemento.style.visibility = 'visible';
                elemento.style.opacity = '1';
            });
        });
    }
}

// Ejecutar la función de visibilidad cada 2 segundos para asegurar que los elementos estén visibles
setInterval(forzarVisibilidadElementos, 2000);
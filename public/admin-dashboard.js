// Variables globales
let reservationsChart;
let currentPeriod = '7d'; // Período actual seleccionado

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN DASHBOARD SIMPLE INICIALIZADO ===');
    
    // Verificar que las dependencias estén cargadas
    if (typeof AdminUtils === 'undefined') {
        console.error('❌ AdminUtils no está cargado');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js no está cargado');
        return;
    }
    
    console.log('✅ Dependencias cargadas correctamente');
    console.log('🔧 API_BASE:', API_BASE);
    
    // Verificar autenticación
    if (!AdminUtils.isAuthenticated()) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Mostrar información del usuario (con delay para asegurar que el usuario esté cargado)
    setTimeout(() => {
        mostrarInfoUsuario();
    }, 100);
    
    // Aplicar permisos según el rol (con delay para asegurar que el usuario esté cargado)
    setTimeout(() => {
        aplicarPermisosPorRol();
    }, 100);
    
    // Actualizar hora actual
    actualizarHoraActual();
    setInterval(actualizarHoraActual, 1000);
    
    // Cargar datos del dashboard
    cargarEstadisticas();
    cargarReservasRecientes();
    cargarReservasHoy();
    
    // Inicializar gráficos
    inicializarGraficos();
    
    // Aplicar permisos y actualizar info del usuario después de cargar datos (por si acaso)
    setTimeout(() => {
        mostrarInfoUsuario();
        aplicarPermisosPorRol();
        asegurarVisibilidadReportes();
    }, 1000);
    
    // Agregar event listener para cuando se hace clic en el dashboard
    document.addEventListener('click', function(event) {
        if (event.target.closest('a[href="admin-dashboard.html"]')) {
            setTimeout(() => {
                mostrarInfoUsuario();
                aplicarPermisosPorRol();
                asegurarVisibilidadReportes();
            }, 100);
        }
    });
});

function mostrarInfoUsuario() {
    const user = AdminUtils.getCurrentUser();
    if (user) {
        // Actualizar nombre en el header
        document.getElementById('adminName').textContent = user.nombre || user.email;
        
        // Actualizar información del usuario en el sidebar
        const nameElement = document.querySelector('[data-user="name"]');
        const roleElement = document.querySelector('[data-user="role"]');
        const complexElement = document.querySelector('[data-user="complex"]');
        
        if (nameElement) {
            nameElement.textContent = user.nombre || 'Admin';
        }
        if (roleElement) {
            roleElement.textContent = AdminUtils.getRoleDisplayName(user.rol);
        }
        if (complexElement) {
            complexElement.textContent = user.complejo_nombre || 'Todos los complejos';
        }
        
        console.log('✅ Información del usuario actualizada:', {
            nombre: user.nombre,
            rol: user.rol,
            complejo: user.complejo_nombre
        });
    }
}

function asegurarVisibilidadReportes() {
    const user = AdminUtils.getCurrentUser();
    if (user && (user.rol === 'owner' || user.rol === 'super_admin')) {
        const reportElements = document.querySelectorAll('a[href="admin-reports.html"]');
        console.log(`🔧 Asegurando visibilidad de ${reportElements.length} enlaces de reportes para ${user.rol}`);
        
        reportElements.forEach((element, index) => {
            // Remover clases de ocultación
            element.classList.remove('hide-for-manager');
            element.classList.remove('hide-for-owner');
            // Forzar visibilidad
            element.style.display = 'block';
            element.style.visibility = 'visible';
            console.log(`✅ Enlace de reportes ${index + 1} configurado como visible para ${user.rol}`);
        });
    }
}

function aplicarPermisosPorRol() {
    console.log('🔐 Iniciando aplicación de permisos...');
    
    const user = AdminUtils.getCurrentUser();
    console.log('👤 Usuario obtenido:', user);
    
    if (!user) {
        console.log('❌ No se pudo obtener el usuario, reintentando en 500ms...');
        setTimeout(aplicarPermisosPorRol, 500);
        return;
    }
    
    const userRole = user.rol;
    console.log('🔐 Aplicando permisos para rol:', userRole);
    console.log('📧 Email del usuario:', user.email);
    
    // Ocultar elementos según el rol
    if (userRole === 'manager') {
        // Managers no pueden ver información financiera ni gestionar complejos/reportes
        const managerElements = document.querySelectorAll('.hide-for-manager');
        console.log(`🔍 Encontrados ${managerElements.length} elementos para ocultar para manager`);
        managerElements.forEach(element => {
            element.style.display = 'none';
        });
        console.log('✅ Elementos ocultados para manager');
    } else if (userRole === 'owner') {
        // Owners no pueden gestionar complejos (solo ver su complejo)
        const ownerElements = document.querySelectorAll('.hide-for-owner');
        console.log(`🔍 Encontrados ${ownerElements.length} elementos para ocultar para owner`);
        ownerElements.forEach(element => {
            element.style.display = 'none';
        });
        console.log('✅ Elementos ocultados para owner');
        
        // Asegurar que los elementos de reportes estén visibles para owners
        const reportElements = document.querySelectorAll('a[href="admin-reports.html"]');
        console.log(`📊 Enlaces de reportes encontrados: ${reportElements.length}`);
        reportElements.forEach((element, index) => {
            console.log(`📊 Enlace ${index + 1} antes:`, {
                display: element.style.display,
                visibility: element.style.visibility,
                classes: element.className,
                computedDisplay: window.getComputedStyle(element).display,
                computedVisibility: window.getComputedStyle(element).visibility
            });
            
            // Remover clase hide-for-manager y forzar visibilidad
            element.classList.remove('hide-for-manager');
            element.style.display = 'block';
            element.style.visibility = 'visible';
            
            console.log(`📊 Enlace ${index + 1} después:`, {
                display: element.style.display,
                visibility: element.style.visibility,
                classes: element.className,
                computedDisplay: window.getComputedStyle(element).display,
                computedVisibility: window.getComputedStyle(element).visibility
            });
        });
        
        // Asegurar visibilidad de reportes después de aplicar permisos
        asegurarVisibilidadReportes();
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
        
        // Asegurar visibilidad de reportes
        asegurarVisibilidadReportes();
    }
}

function actualizarHoraActual() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeString;
}

async function cargarEstadisticas() {
    try {
        // Construir URL con parámetros de período
        const url = new URL(`${API_BASE}/admin/estadisticas`);
        
        // Agregar parámetros según el período seleccionado
        const now = new Date();
        let dateFrom, dateTo;
        
        switch (currentPeriod) {
            case '7d':
                dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'all':
                // No agregar parámetros de fecha para "todos los tiempos"
                break;
            default:
                dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        
        if (dateFrom) {
            url.searchParams.append('dateFrom', dateFrom.toISOString().split('T')[0]);
        }
        if (dateTo) {
            url.searchParams.append('dateTo', dateTo.toISOString().split('T')[0]);
        }
        
        console.log('📊 Cargando estadísticas para período:', currentPeriod, 'URL:', url.toString());
        
        const response = await AdminUtils.authenticatedFetch(url.toString());
        
        if (response && response.ok) {
            const data = await response.json();
            
            // Actualizar tarjetas de estadísticas
            document.getElementById('totalReservas').textContent = data.totalReservas || '0';
            document.getElementById('totalCanchas').textContent = data.totalCanchas || '0';
            document.getElementById('totalComplejos').textContent = data.totalComplejos || '0';
            document.getElementById('ingresosTotales').textContent = `$${data.ingresosTotales?.toLocaleString() || '0'}`;
            
            // Actualizar gráfico de reservas por día
            if (data.reservasPorDia && data.reservasPorDia.length > 0) {
                actualizarGraficoReservas(data.reservasPorDia);
            }
            
            console.log('✅ Estadísticas cargadas para período', currentPeriod, ':', data);
        } else {
            console.error('Error cargando estadísticas:', response?.status);
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

async function cargarReservasRecientes() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reservas-recientes`);
        
        if (response && response.ok) {
            const reservas = await response.json();
            mostrarReservasRecientes(reservas);
            console.log('✅ Reservas recientes cargadas:', reservas.length);
        } else {
            console.error('Error cargando reservas recientes:', response?.status);
        }
    } catch (error) {
        console.error('Error cargando reservas recientes:', error);
    }
}

async function cargarReservasHoy() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reservas-hoy`);
        
        if (response && response.ok) {
            const reservas = await response.json();
            mostrarReservasHoy(reservas);
            console.log('✅ Reservas de hoy cargadas:', reservas.length);
        } else {
            console.error('Error cargando reservas de hoy:', response?.status);
        }
    } catch (error) {
        console.error('Error cargando reservas de hoy:', error);
    }
}

function mostrarReservasRecientes(reservas) {
    const container = document.getElementById('recentReservations');
    
    if (!reservas || reservas.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-calendar-times fa-2x mb-3"></i>
                <p>No hay reservas recientes</p>
            </div>
        `;
        return;
    }
    
    // Mostrar solo las primeras 10 reservas
    const reservasLimitadas = reservas.slice(0, 10);
    
    container.innerHTML = reservasLimitadas.map((reserva, index) => `
        <div class="reservation-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <span class="badge bg-light text-dark me-2">#${index + 1}</span>
                        <h6 class="mb-0">${reserva.nombre_cliente || 'Sin nombre'}</h6>
                    </div>
                    <p class="text-muted mb-1 small">
                        <i class="fas fa-building me-1"></i>${reserva.complejo_nombre || 'Sin complejo'}
                    </p>
                    <p class="text-muted mb-0 small">
                        <i class="fas fa-calendar me-1"></i>${formatearFechaCorta(reserva.fecha)} - ${formatearHora(reserva.hora_inicio)}
                    </p>
                </div>
                <div class="text-end">
                    ${reserva.precio_total ? `<span class="badge bg-primary fs-6">$${reserva.precio_total}</span><br>` : ''}
                    <small class="text-muted">${reserva.codigo_reserva || 'Sin código'}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function mostrarReservasHoy(reservas) {
    const container = document.getElementById('todayReservations');
    
    if (!reservas || reservas.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-calendar-day fa-2x mb-3"></i>
                <p>No hay reservas programadas para hoy</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reservas.map(reserva => `
        <div class="reservation-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-1">
                        <span class="badge bg-success me-2">HOY</span>
                        <h6 class="mb-0">${reserva.nombre_cliente || 'Sin nombre'}</h6>
                    </div>
                    <p class="text-muted mb-1 small">
                        <i class="fas fa-building me-1"></i>${reserva.complejo_nombre || 'Sin complejo'}
                    </p>
                    <p class="text-muted mb-1 small">
                        <i class="fas fa-futbol me-1"></i>${reserva.cancha_nombre || 'Cancha N/A'}
                    </p>
                    <p class="text-muted mb-0 small">
                        <i class="fas fa-clock me-1"></i>${formatearRangoHoras(reserva.hora_inicio, reserva.hora_fin)}
                    </p>
                </div>
                <div class="text-end">
                    ${reserva.precio_total ? `<span class="badge bg-success fs-6">$${reserva.precio_total}</span><br>` : ''}
                    <small class="text-muted">${reserva.codigo_reserva || 'Sin código'}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function inicializarGraficos() {
    // Solo inicializar gráfico de reservas (el único que existe en el HTML)
    inicializarGraficoReservas();
    
    console.log('✅ Gráfico de reservas inicializado');
}

function inicializarGraficoReservas() {
    const canvas = document.getElementById('reservationsChart');
    const loading = document.getElementById('chartLoading');
    
    const ctx = canvas.getContext('2d');
    
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
                pointHoverRadius: 8,
                pointHoverBackgroundColor: '#667eea',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    callbacks: {
                        title: function(context) {
                            return `📅 ${context[0].label}`;
                        },
                        label: function(context) {
                            return `📊 ${context.parsed.y} reserva${context.parsed.y !== 1 ? 's' : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(102, 126, 234, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6b7280',
                        stepSize: 1,
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return Number.isInteger(value) ? value : null;
                        }
                    }
                }
            },
            animation: {
                duration: 1200,
                easing: 'easeInOutQuart'
            },
            elements: {
                line: {
                    borderJoinStyle: 'round',
                    borderCapStyle: 'round'
                }
            }
        }
    });
}

// Funciones de gráficos adicionales removidas - solo mantenemos el gráfico de reservas

function actualizarGraficoReservas(datos) {
    if (!reservationsChart) return;
    
    if (!datos || datos.length === 0) {
        // Mostrar mensaje cuando no hay datos
        reservationsChart.data.labels = ['Sin datos'];
        reservationsChart.data.datasets[0].data = [0];
        reservationsChart.update();
        return;
    }
    
    const labels = datos.map(item => formatearFechaCorta(item.dia));
    const values = datos.map(item => parseInt(item.cantidad));
    
    reservationsChart.data.labels = labels;
    reservationsChart.data.datasets[0].data = values;
    reservationsChart.update();
    
    console.log('📊 Gráfico actualizado con', datos.length, 'puntos de datos');
}

function actualizarGrafico() {
    console.log('🔄 Actualizando gráfico...');
    
    const canvas = document.getElementById('reservationsChart');
    const loading = document.getElementById('chartLoading');
    const button = event.target.closest('button');
    const icon = button.querySelector('i');
    
    // Mostrar indicadores de carga
    icon.classList.add('fa-spin');
    loading.classList.add('show');
    canvas.style.display = 'none';
    
    // Recargar estadísticas
    cargarEstadisticas().then(() => {
        // Ocultar indicadores de carga
        icon.classList.remove('fa-spin');
        loading.classList.remove('show');
        canvas.style.display = 'block';
        console.log('✅ Gráfico actualizado');
    }).catch(error => {
        console.error('❌ Error actualizando gráfico:', error);
        icon.classList.remove('fa-spin');
        loading.classList.remove('show');
        canvas.style.display = 'block';
    });
}

function cambiarPeriodo(periodo) {
    console.log('📅 Cambiando período a:', periodo);
    
    currentPeriod = periodo;
    
    // Actualizar texto del botón
    const periodText = document.getElementById('periodText');
    const periodNames = {
        '7d': 'Últimos 7 días',
        '30d': 'Últimos 30 días',
        'month': 'Este mes',
        'all': 'Todos los tiempos'
    };
    periodText.textContent = periodNames[periodo];
    
    // Actualizar título del gráfico
    const chartTitle = document.querySelector('.chart-header h5');
    const periodIcons = {
        '7d': 'fa-calendar-week',
        '30d': 'fa-calendar-alt',
        'month': 'fa-calendar',
        'all': 'fa-infinity'
    };
    
    // Actualizar ícono en el título
    const titleIcon = chartTitle.querySelector('i');
    titleIcon.className = `fas ${periodIcons[periodo]} me-2 text-primary`;
    
    // Mostrar indicador de carga
    const canvas = document.getElementById('reservationsChart');
    const loading = document.getElementById('chartLoading');
    
    loading.classList.add('show');
    canvas.style.display = 'none';
    
    // Recargar estadísticas con el nuevo período
    cargarEstadisticas().then(() => {
        loading.classList.remove('show');
        canvas.style.display = 'block';
        console.log('✅ Gráfico actualizado con período:', periodo);
    }).catch(error => {
        console.error('❌ Error actualizando gráfico:', error);
        loading.classList.remove('show');
        canvas.style.display = 'block';
    });
}

function formatearFechaCorta(fecha) {
    if (!fecha) return 'Sin fecha';
    
    try {
        let fechaStr = fecha;
        
        // Si tiene timestamp, extraer solo la fecha
        if (typeof fecha === 'string' && fecha.includes('T')) {
            fechaStr = fecha.split('T')[0];
        }
        
        // Parsear fecha YYYY-MM-DD sin convertir a Date (evita problemas de zona horaria)
        if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
            const [año, mes, dia] = fechaStr.split('-').map(Number);
            
            // Crear Date al mediodía para evitar problemas de zona horaria
            const fechaObj = new Date(año, mes - 1, dia, 12, 0, 0);
            
            return fechaObj.toLocaleDateString('es-CL', {
                month: 'short',
                day: 'numeric'
            });
        }
        
        // Fallback para otros formatos
        const fechaObj = new Date(fechaStr);
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

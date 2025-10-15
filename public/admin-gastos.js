// ============================================
// CONTROL FINANCIERO - FRONTEND
// ============================================

// API Base URL (cargado desde url-config.js)
const API_BASE = window.API_BASE || window.URL_CONFIG?.API_URL || '/api';

let userData = null;
let categorias = [];
let movimientos = [];
let modal = null;
let gastosChart = null;
let evolucionChart = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Inicializando Control Financiero... v2.0');
    
    // Verificar autenticación
    await checkAuth();
    
    // Inicializar modal
    const modalElement = document.getElementById('movimientoModal');
    modal = new bootstrap.Modal(modalElement);
    
    // Establecer fecha de hoy por defecto
    document.getElementById('movimientoFecha').valueAsDate = new Date();
    
    // Establecer filtro de fecha del mes actual
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('filterFechaDesde').valueAsDate = firstDay;
    document.getElementById('filterFechaHasta').valueAsDate = today;
    
    // Cargar datos
    await cargarCategorias();
    await cargarMovimientos();
    await actualizarEstadisticas();
    
    console.log('✅ Control Financiero inicializado');
});

// ============================================
// AUTENTICACIÓN
// ============================================

async function checkAuth() {
    try {
        // Usar adminToken en lugar de token
        const token = localStorage.getItem('adminToken');
        const userStr = localStorage.getItem('adminUser');
        
        if (!token || !userStr) {
            console.log('❌ No hay token o usuario, redirigiendo al login...');
            window.location.href = '/admin-login.html';
            return;
        }

        // Obtener datos del usuario desde localStorage
        userData = JSON.parse(userStr);
        
        console.log('👤 Usuario cargado:', userData);
        
        // Verificar que sea owner o super_admin
        if (!['owner', 'super_admin'].includes(userData.rol)) {
            console.log('❌ Rol no autorizado:', userData.rol);
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'No tienes permisos para acceder a esta sección. Solo owners y super admins pueden ver Control Financiero.',
                confirmButtonText: 'Volver'
            }).then(() => {
                window.location.href = '/admin-reservations.html';
            });
            return;
        }

        // Mostrar info del usuario
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = `${userData.nombre} (${getRoleDisplayName(userData.rol)})`;
        }
        
        console.log('✅ Usuario autenticado:', userData.nombre, 'Rol:', userData.rol);
    } catch (error) {
        console.error('❌ Error de autenticación:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin-login.html';
    }
}

function getRoleDisplayName(role) {
    const roleNames = {
        'super_admin': 'Super Administrador',
        'owner': 'Dueño de Complejo',
        'manager': 'Administrador de Complejo'
    };
    return roleNames[role] || role;
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/admin-login.html';
}

// Función helper para hacer peticiones autenticadas
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        console.error('❌ No hay token de autenticación');
        window.location.href = '/admin-login.html';
        throw new Error('No hay token de autenticación');
    }
    
    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    
    const fetchOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, fetchOptions);
        
        // Si es 401 (no autorizado), redirigir al login
        if (response.status === 401) {
            console.error('❌ Token inválido o expirado');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin-login.html';
            throw new Error('Token inválido o expirado');
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error en petición autenticada:', error);
        throw error;
    }
}

// ============================================
// CARGAR CATEGORÍAS
// ============================================

async function cargarCategorias() {
    try {
        showLoading(true);
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`${API_BASE}/gastos/categorias`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar categorías');

        categorias = await response.json();
        
        // Poblar select de filtro de categorías
        const filterCategoria = document.getElementById('filterCategoria');
        filterCategoria.innerHTML = '<option value="">Todas</option>';
        
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            // Solo mostrar el nombre, sin el código del ícono
            option.textContent = cat.nombre;
            filterCategoria.appendChild(option);
        });
        
        console.log('✅ Categorías cargadas:', categorias.length);
    } catch (error) {
        console.error('❌ Error al cargar categorías:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las categorías'
        });
    } finally {
        showLoading(false);
    }
}

// ============================================
// CARGAR MOVIMIENTOS
// ============================================

async function cargarMovimientos() {
    try {
        showLoading(true);
        const token = localStorage.getItem('adminToken');
        
        // Obtener filtros
        const params = new URLSearchParams();
        const tipo = document.getElementById('filterTipo').value;
        const categoria = document.getElementById('filterCategoria').value;
        const fechaDesde = document.getElementById('filterFechaDesde').value;
        const fechaHasta = document.getElementById('filterFechaHasta').value;
        
        if (tipo) params.append('tipo', tipo);
        if (categoria) params.append('categoria_id', categoria);
        if (fechaDesde) params.append('fecha_desde', fechaDesde);
        if (fechaHasta) params.append('fecha_hasta', fechaHasta);
        
        const response = await fetch(`${API_BASE}/gastos/movimientos?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar movimientos');

        movimientos = await response.json();
        
        renderizarTabla();
        actualizarEstadisticas();
        actualizarGraficos();
        
        console.log('✅ Movimientos cargados:', movimientos.length);
    } catch (error) {
        console.error('❌ Error al cargar movimientos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los movimientos'
        });
    } finally {
        showLoading(false);
    }
}

// ============================================
// RENDERIZAR TABLA
// ============================================

function renderizarTabla() {
    const tbody = document.getElementById('movimientosTableBody');
    
    if (movimientos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-5">
                    <i class="fas fa-inbox fa-3x mb-3 d-block" style="opacity: 0.3;"></i>
                    No hay movimientos registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = movimientos.map(mov => `
        <tr>
            <td>${formatDate(mov.fecha)}</td>
            <td>
                <span class="badge-modern badge-${mov.tipo}">
                    <i class="fas fa-${mov.tipo === 'ingreso' ? 'arrow-up' : 'arrow-down'}"></i>
                    ${mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                </span>
            </td>
            <td>
                <span class="category-badge" style="background: ${mov.categoria_color}20; color: ${mov.categoria_color};">
                    <i class="fas ${mov.categoria_icono}"></i>
                    ${mov.categoria_nombre}
                </span>
            </td>
            <td>${mov.descripcion || '<span class="text-muted">Sin descripción</span>'}</td>
            <td><strong>$${Number(mov.monto).toLocaleString('es-CL')}</strong></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editarMovimiento(${mov.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarMovimiento(${mov.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// ESTADÍSTICAS
// ============================================

function actualizarEstadisticas() {
    const ingresos = movimientos
        .filter(m => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto), 0);
    
    const egresos = movimientos
        .filter(m => m.tipo === 'gasto')
        .reduce((sum, m) => sum + Number(m.monto), 0);
    
    const balance = ingresos - egresos;
    
    document.getElementById('totalIngresos').textContent = `$${ingresos.toLocaleString('es-CL')}`;
    document.getElementById('totalEgresos').textContent = `$${egresos.toLocaleString('es-CL')}`;
    document.getElementById('balance').textContent = `$${balance.toLocaleString('es-CL')}`;
    
    // Actualizar clase del balance
    const balanceChange = document.getElementById('changeBalance');
    if (balance > 0) {
        balanceChange.className = 'stat-card-change positive';
        balanceChange.innerHTML = '<i class="fas fa-arrow-up"></i> Balance positivo';
    } else if (balance < 0) {
        balanceChange.className = 'stat-card-change negative';
        balanceChange.innerHTML = '<i class="fas fa-arrow-down"></i> Balance negativo';
    } else {
        balanceChange.className = 'stat-card-change';
        balanceChange.innerHTML = 'Balance neutro';
    }
}

// ============================================
// GRÁFICOS
// ============================================

function actualizarGraficos() {
    actualizarGraficoEgresos();
    actualizarGraficoEvolucion();
}

function actualizarGraficoEgresos() {
    const ctx = document.getElementById('gastosChart');
    
    // Agrupar egresos por categoría
    const egresosPorCategoria = {};
    movimientos
        .filter(m => m.tipo === 'gasto')
        .forEach(m => {
            if (!egresosPorCategoria[m.categoria_nombre]) {
                egresosPorCategoria[m.categoria_nombre] = {
                    monto: 0,
                    color: m.categoria_color
                };
            }
            egresosPorCategoria[m.categoria_nombre].monto += Number(m.monto);
        });
    
    const labels = Object.keys(egresosPorCategoria);
    const data = labels.map(label => egresosPorCategoria[label].monto);
    const colors = labels.map(label => egresosPorCategoria[label].color);
    
    if (gastosChart) gastosChart.destroy();
    
    gastosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: $${value.toLocaleString('es-CL')}`;
                        }
                    }
                }
            }
        }
    });
}

function actualizarGraficoEvolucion() {
    const ctx = document.getElementById('evolucionChart');
    
    // Agrupar por mes
    const porMes = {};
    movimientos.forEach(m => {
        const mes = m.fecha.substring(0, 7); // YYYY-MM
        if (!porMes[mes]) {
            porMes[mes] = { ingresos: 0, egresos: 0 };
        }
        if (m.tipo === 'ingreso') {
            porMes[mes].ingresos += Number(m.monto);
        } else {
            porMes[mes].egresos += Number(m.monto);
        }
    });
    
    const meses = Object.keys(porMes).sort();
    const ingresosData = meses.map(mes => porMes[mes].ingresos);
    const egresosData = meses.map(mes => porMes[mes].egresos);
    
    if (evolucionChart) evolucionChart.destroy();
    
    // Crear gradientes para el gráfico moderno
    const ctxGradient = ctx.getContext('2d');
    
    const gradientIngresos = ctxGradient.createLinearGradient(0, 0, 0, 400);
    gradientIngresos.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradientIngresos.addColorStop(0.5, 'rgba(16, 185, 129, 0.2)');
    gradientIngresos.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    
    const gradientEgresos = ctxGradient.createLinearGradient(0, 0, 0, 400);
    gradientEgresos.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    gradientEgresos.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
    gradientEgresos.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    
    evolucionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses.map(mes => {
                const [year, month] = mes.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
            }),
            datasets: [
                {
                    label: 'Ingresos',
                    data: ingresosData,
                    borderColor: '#10b981',
                    backgroundColor: gradientIngresos,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointHoverBackgroundColor: '#10b981',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4
                },
                {
                    label: 'Egresos',
                    data: egresosData,
                    borderColor: '#ef4444',
                    backgroundColor: gradientEgresos,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointHoverBackgroundColor: '#ef4444',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#ffffff',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: $${value.toLocaleString('es-CL')}`;
                        },
                        footer: function(tooltipItems) {
                            let ingresos = 0;
                            let egresos = 0;
                            tooltipItems.forEach(item => {
                                if (item.dataset.label === 'Ingresos') {
                                    ingresos = item.parsed.y;
                                } else if (item.dataset.label === 'Egresos') {
                                    egresos = item.parsed.y;
                                }
                            });
                            const balance = ingresos - egresos;
                            const balanceText = balance >= 0 ? 
                                `Balance: +$${balance.toLocaleString('es-CL')}` : 
                                `Balance: -$${Math.abs(balance).toLocaleString('es-CL')}`;
                            return balanceText;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('es-CL');
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// MODAL
// ============================================

function openModal(tipo) {
    // Resetear formulario
    document.getElementById('movimientoForm').reset();
    document.getElementById('movimientoId').value = '';
    document.getElementById('movimientoTipo').value = tipo;
    document.getElementById('movimientoFecha').valueAsDate = new Date();
    
    // Cambiar título y estilo según tipo
    const title = document.getElementById('movimientoModalTitle');
    if (tipo === 'ingreso') {
        title.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Registrar Ingreso';
        title.closest('.modal-header').style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else {
        title.innerHTML = '<i class="fas fa-minus-circle me-2"></i>Registrar Egreso';
        title.closest('.modal-header').style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    }
    
    // Filtrar categorías por tipo
    const selectCategoria = document.getElementById('movimientoCategoria');
    selectCategoria.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    categorias
        .filter(cat => cat.tipo === tipo)
        .forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            // Solo mostrar el nombre, sin el código del ícono
            option.textContent = cat.nombre;
            selectCategoria.appendChild(option);
        });
    
    modal.show();
}

async function editarMovimiento(id) {
    const movimiento = movimientos.find(m => m.id === id);
    if (!movimiento) return;
    
    // Llenar formulario
    document.getElementById('movimientoId').value = movimiento.id;
    document.getElementById('movimientoTipo').value = movimiento.tipo;
    document.getElementById('movimientoCategoria').value = movimiento.categoria_id;
    document.getElementById('movimientoMonto').value = movimiento.monto;
    document.getElementById('movimientoFecha').value = movimiento.fecha;
    document.getElementById('movimientoDescripcion').value = movimiento.descripcion || '';
    document.getElementById('movimientoMetodo').value = movimiento.metodo_pago || '';
    document.getElementById('movimientoDocumento').value = movimiento.numero_documento || '';
    
    // Cambiar título
    const title = document.getElementById('movimientoModalTitle');
    title.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Movimiento';
    
    // Filtrar categorías
    const selectCategoria = document.getElementById('movimientoCategoria');
    selectCategoria.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    categorias
        .filter(cat => cat.tipo === movimiento.tipo)
        .forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            // Solo mostrar el nombre, sin el código del ícono
            option.textContent = cat.nombre;
            if (cat.id === movimiento.categoria_id) option.selected = true;
            selectCategoria.appendChild(option);
        });
    
    modal.show();
}

// ============================================
// GUARDAR MOVIMIENTO
// ============================================

async function guardarMovimiento() {
    try {
        // Validar formulario
        const form = document.getElementById('movimientoForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        showLoading(true);
        const token = localStorage.getItem('adminToken');
        
        const id = document.getElementById('movimientoId').value;
        const tipo = document.getElementById('movimientoTipo').value;
        const categoria_id = document.getElementById('movimientoCategoria').value;
        const monto = document.getElementById('movimientoMonto').value;
        const fecha = document.getElementById('movimientoFecha').value;
        const descripcion = document.getElementById('movimientoDescripcion').value;
        const metodo_pago = document.getElementById('movimientoMetodo').value;
        const numero_documento = document.getElementById('movimientoDocumento').value;
        
        const data = {
            tipo,
            categoria_id: parseInt(categoria_id),
            monto: parseFloat(monto),
            fecha,
            descripcion,
            metodo_pago,
            numero_documento
        };
        
        const url = id 
            ? `${API_BASE}/gastos/movimientos/${id}`
            : `${API_BASE}/gastos/movimientos`;
        
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar');
        }
        
        await Swal.fire({
            icon: 'success',
            title: '¡Guardado!',
            text: id ? 'Movimiento actualizado correctamente' : 'Movimiento registrado correctamente',
            timer: 2000,
            showConfirmButton: false
        });
        
        modal.hide();
        await cargarMovimientos();
        
    } catch (error) {
        console.error('❌ Error al guardar movimiento:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo guardar el movimiento'
        });
    } finally {
        showLoading(false);
    }
}

// ============================================
// ELIMINAR MOVIMIENTO
// ============================================

async function eliminarMovimiento(id) {
    const result = await Swal.fire({
        title: '¿Eliminar movimiento?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (!result.isConfirmed) return;
    
    try {
        showLoading(true);
        const token = localStorage.getItem('adminToken');
        
        const response = await fetch(`${API_BASE}/gastos/movimientos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Error al eliminar');
        
        await Swal.fire({
            icon: 'success',
            title: '¡Eliminado!',
            text: 'Movimiento eliminado correctamente',
            timer: 2000,
            showConfirmButton: false
        });
        
        await cargarMovimientos();
        
    } catch (error) {
        console.error('❌ Error al eliminar movimiento:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el movimiento'
        });
    } finally {
        showLoading(false);
    }
}

// ============================================
// FILTROS
// ============================================

// Actualizar categorías según tipo seleccionado
function updateCategoriasFilter() {
    const tipoSeleccionado = document.getElementById('filterTipo').value;
    const filterCategoria = document.getElementById('filterCategoria');
    
    // Limpiar y agregar opción "Todas"
    filterCategoria.innerHTML = '<option value="">Todas</option>';
    
    // Filtrar categorías según el tipo
    let categoriasFiltradas = categorias;
    
    if (tipoSeleccionado) {
        categoriasFiltradas = categorias.filter(cat => cat.tipo === tipoSeleccionado);
    }
    
    // Agregar opciones filtradas
    categoriasFiltradas.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        filterCategoria.appendChild(option);
    });
    
    // Aplicar filtros después de actualizar categorías
    applyFilters();
}

function applyFilters() {
    cargarMovimientos();
}

// ============================================
// EXPORTAR A EXCEL
// ============================================

function exportToExcel() {
    if (movimientos.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin datos',
            text: 'No hay movimientos para exportar'
        });
        return;
    }
    
    // Calcular totales
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0);
    const egresos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Number(m.monto), 0);
    const balance = ingresos - egresos;
    
    const fechaDesde = formatDate(document.getElementById('filterFechaDesde').value);
    const fechaHasta = formatDate(document.getElementById('filterFechaHasta').value);
    
    // Crear array de datos con encabezados personalizados
    const excelData = [];
    
    // Título y metadatos
    excelData.push(['CONTROL FINANCIERO']);
    excelData.push([]);
    excelData.push(['Complejo:', userData.complejo_nombre || 'Todos']);
    excelData.push(['Período:', `${fechaDesde} - ${fechaHasta}`]);
    excelData.push([]);
    
    // Resumen de totales
    excelData.push(['RESUMEN']);
    excelData.push(['Total Ingresos:', ingresos]);
    excelData.push(['Total Egresos:', egresos]);
    excelData.push(['Balance:', balance]);
    excelData.push([]);
    
    // Encabezados de tabla
    excelData.push(['DETALLE DE MOVIMIENTOS']);
    excelData.push(['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Método de Pago', 'Documento']);
    
    // Datos de movimientos
    movimientos.forEach(m => {
        excelData.push([
            formatDate(m.fecha),
            m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
            m.categoria_nombre,
            m.descripcion || '',
            Number(m.monto),
            m.metodo_pago || '',
            m.numero_documento || ''
        ]);
    });
    
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Aplicar estilos y anchos de columna
    ws['!cols'] = [
        { wch: 18 }, // Fecha/Label
        { wch: 12 }, // Tipo/Valor
        { wch: 30 }, // Categoría
        { wch: 45 }, // Descripción
        { wch: 15 }, // Monto
        { wch: 18 }, // Método
        { wch: 20 }  // Documento
    ];
    
    // Estilo para el título (fila 1) - Gradiente moderno
    ws['A1'] = { 
        v: '💰 CONTROL FINANCIERO', 
        t: 's',
        s: {
            font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "8E44AD" } }, // Morado moderno
            alignment: { horizontal: "center", vertical: "center" }
        }
    };
    
    // Estilos para información del complejo (filas 3-4)
    if (ws['A3']) {
        ws['A3'].s = {
            font: { bold: true, color: { rgb: "8E44AD" } },
            fill: { fgColor: { rgb: "F4ECF7" } },
            alignment: { horizontal: "left", vertical: "center" }
        };
    }
    if (ws['B3']) {
        ws['B3'].s = {
            font: { sz: 11 },
            fill: { fgColor: { rgb: "F4ECF7" } },
            alignment: { horizontal: "left", vertical: "center" }
        };
    }
    if (ws['A4']) {
        ws['A4'].s = {
            font: { bold: true, color: { rgb: "8E44AD" } },
            fill: { fgColor: { rgb: "F4ECF7" } },
            alignment: { horizontal: "left", vertical: "center" }
        };
    }
    if (ws['B4']) {
        ws['B4'].s = {
            font: { sz: 11 },
            fill: { fgColor: { rgb: "F4ECF7" } },
            alignment: { horizontal: "left", vertical: "center" }
        };
    }
    
    // Estilo para subtítulo RESUMEN (fila 6)
    ws['A6'] = {
        v: '📊 RESUMEN FINANCIERO',
        t: 's',
        s: {
            font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "27AE60" } }, // Verde para resumen
            alignment: { horizontal: "center", vertical: "center" }
        }
    };
    
    // Estilos para las filas del resumen (7-9) - Tarjetas con color
    const resumenColors = {
        7: { label: "16A085", value: "D5F4E6", textValue: "117A65" }, // Ingresos: verde
        8: { label: "C0392B", value: "FADBD8", textValue: "922B21" }, // Egresos: rojo
        9: { label: "F39C12", value: "FCF3CF", textValue: "B9770E" }  // Balance: naranja
    };
    
    [7, 8, 9].forEach(row => {
        const colors = resumenColors[row];
        const labelCell = XLSX.utils.encode_cell({ r: row - 1, c: 0 });
        const valueCell = XLSX.utils.encode_cell({ r: row - 1, c: 1 });
        
        if (ws[labelCell]) {
            ws[labelCell].s = {
                font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: colors.label } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "medium", color: { rgb: colors.label } },
                    bottom: { style: "medium", color: { rgb: colors.label } },
                    left: { style: "medium", color: { rgb: colors.label } },
                    right: { style: "thin", color: { rgb: colors.label } }
                }
            };
        }
        if (ws[valueCell]) {
            ws[valueCell].s = {
                font: { bold: true, sz: 12, color: { rgb: colors.textValue } },
                fill: { fgColor: { rgb: colors.value } },
                alignment: { horizontal: "right", vertical: "center" },
                border: {
                    top: { style: "medium", color: { rgb: colors.label } },
                    bottom: { style: "medium", color: { rgb: colors.label } },
                    left: { style: "thin", color: { rgb: colors.label } },
                    right: { style: "medium", color: { rgb: colors.label } }
                }
            };
        }
    });
    
    // Estilo para subtítulo DETALLE (fila 11)
    ws['A11'] = {
        v: '📋 DETALLE DE MOVIMIENTOS',
        t: 's',
        s: {
            font: { bold: true, sz: 13, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3498DB" } }, // Azul para detalle
            alignment: { horizontal: "center", vertical: "center" }
        }
    };
    
    // Estilo para encabezados de tabla (fila 12) - Gradiente azul
    const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2980B9" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "medium", color: { rgb: "1A5276" } },
            bottom: { style: "medium", color: { rgb: "1A5276" } },
            left: { style: "thin", color: { rgb: "1A5276" } },
            right: { style: "thin", color: { rgb: "1A5276" } }
        }
    };
    
    ['A12', 'B12', 'C12', 'D12', 'E12', 'F12', 'G12'].forEach(cell => {
        if (ws[cell]) ws[cell].s = headerStyle;
    });
    
    // Bordes, alternancia y colores para celdas de datos (desde fila 13)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 12; R <= range.e.r; ++R) {
        const isEvenRow = (R - 12) % 2 === 0;
        const rowData = excelData[R]; // Obtener datos de la fila actual
        const tipoMovimiento = rowData && rowData[1] ? rowData[1].toLowerCase() : '';
        
        // Color base según tipo de movimiento
        let baseColor = isEvenRow ? "FFFFFF" : "F8F9FA"; // Blanco/Gris claro por defecto
        if (tipoMovimiento === 'ingreso') {
            baseColor = isEvenRow ? "E8F8F5" : "D1F2EB"; // Verde claro
        } else if (tipoMovimiento === 'gasto') {
            baseColor = isEvenRow ? "FADBD8" : "F5B7B1"; // Rojo claro
        }
        
        for (let C = 0; C < 7; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cellAddress]) {
                if (!ws[cellAddress].s) ws[cellAddress].s = {};
                
                // Aplicar color de fondo
                ws[cellAddress].s.fill = {
                    fgColor: { rgb: baseColor }
                };
                
                // Bordes sutiles
                ws[cellAddress].s.border = {
                    top: { style: "thin", color: { rgb: "D5DBDB" } },
                    bottom: { style: "thin", color: { rgb: "D5DBDB" } },
                    left: { style: "thin", color: { rgb: "D5DBDB" } },
                    right: { style: "thin", color: { rgb: "D5DBDB" } }
                };
                
                // Alineación según columna
                if (C === 4) { // Monto
                    ws[cellAddress].s.alignment = { horizontal: "right", vertical: "center" };
                    // Negrita para montos
                    if (ws[cellAddress].v) {
                        ws[cellAddress].s.font = { bold: true };
                    }
                } else if (C === 0) { // Fecha
                    ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
                } else if (C === 1) { // Tipo
                    ws[cellAddress].s.alignment = { horizontal: "center", vertical: "center" };
                    // Color del texto según tipo
                    if (tipoMovimiento === 'ingreso') {
                        ws[cellAddress].s.font = { bold: true, color: { rgb: "117A65" } };
                    } else if (tipoMovimiento === 'gasto') {
                        ws[cellAddress].s.font = { bold: true, color: { rgb: "922B21" } };
                    }
                } else {
                    ws[cellAddress].s.alignment = { horizontal: "left", vertical: "center" };
                }
            }
        }
    }
    
    // Merge cells para el título y subtítulos
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Título
        { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } }, // RESUMEN
        { s: { r: 10, c: 0 }, e: { r: 10, c: 6 } }  // DETALLE
    ];
    
    // Ajustar altura de filas para que los emojis se vean bien
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 28 }; // Título principal - más alto
    ws['!rows'][2] = { hpt: 20 }; // Complejo
    ws['!rows'][3] = { hpt: 20 }; // Período
    ws['!rows'][5] = { hpt: 24 }; // Subtítulo RESUMEN
    ws['!rows'][6] = { hpt: 22 }; // Total Ingresos
    ws['!rows'][7] = { hpt: 22 }; // Total Egresos
    ws['!rows'][8] = { hpt: 22 }; // Balance
    ws['!rows'][10] = { hpt: 24 }; // Subtítulo DETALLE
    ws['!rows'][11] = { hpt: 22 }; // Encabezados de tabla
    
    // Altura para todas las filas de datos (desde fila 13)
    for (let i = 12; i <= range.e.r; i++) {
        ws['!rows'][i] = { hpt: 20 }; // Filas de datos
    }
    
    // Crear workbook y agregar worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    
    // Descargar (xlsx-js-style soporta estilos automáticamente)
    const filename = `Control_Financiero_${fechaDesde.replace(/\//g, '-')}_${fechaHasta.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    Swal.fire({
        icon: 'success',
        title: '¡Exportado!',
        text: 'Archivo Excel descargado correctamente',
        timer: 2000,
        showConfirmButton: false
    });
}

// ============================================
// EXPORTAR A PDF
// ============================================

async function exportToPDF() {
    if (movimientos.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Sin datos',
            text: 'No hay movimientos para exportar'
        });
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Calcular totales
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0);
    const egresos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Number(m.monto), 0);
    const balance = ingresos - egresos;
    
    const fechaDesde = formatDate(document.getElementById('filterFechaDesde').value);
    const fechaHasta = formatDate(document.getElementById('filterFechaHasta').value);
    
    // Encabezado con fondo de color
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, 210, 35, 'F');
    
    // Intentar cargar el logo del complejo
    if (userData.complejo_id) {
        try {
            // Mapeo de logos (inline para no depender de script externo)
            // ID 6: Borde Río (desarrollo), ID 7: Borde Río (producción)
            const logosMap = {
                1: '/images/logos/magnasports.png',
                2: '/images/logos/fundacion-gunnen.png',
                6: '/images/logos/borde-rio.png',
                7: '/images/logos/borde-rio.png'
            };
            
            const logoPath = logosMap[userData.complejo_id];
            
            if (logoPath) {
                // Intentar cargar el logo
                const response = await fetch(logoPath);
                if (response.ok) {
                    const blob = await response.blob();
                    const reader = new FileReader();
                    
                        await new Promise((resolve) => {
                            reader.onloadend = () => {
                                try {
                                    // Agregar logo en la esquina superior derecha (tamaño reducido)
                                    doc.addImage(reader.result, 'PNG', 175, 7, 20, 20);
                                    console.log('✅ Logo del complejo agregado al PDF');
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
    
    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Control Financiero', 105, 15, { align: 'center' });
    
    // Información del complejo y período
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`${userData.complejo_nombre || 'Todos los complejos'}`, 105, 23, { align: 'center' });
    doc.text(`Período: ${fechaDesde} - ${fechaHasta}`, 105, 30, { align: 'center' });
    
    // Resumen con tarjetas de colores
    const yStart = 45;
    
    // Tarjetas más compactas para dejar espacio a la tabla
    
    // Tarjeta de Ingresos (verde)
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(14, yStart, 55, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Total Ingresos', 41.5, yStart + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`$${ingresos.toLocaleString('es-CL')}`, 41.5, yStart + 14, { align: 'center' });
    
    // Tarjeta de Egresos (rojo)
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(74, yStart, 55, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Total Egresos', 101.5, yStart + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`$${egresos.toLocaleString('es-CL')}`, 101.5, yStart + 14, { align: 'center' });
    
    // Tarjeta de Balance (azul o rojo según balance)
    const balanceColor = balance >= 0 ? [59, 130, 246] : [239, 68, 68];
    doc.setFillColor(...balanceColor);
    doc.roundedRect(134, yStart, 55, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Balance', 161.5, yStart + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    const balanceText = balance >= 0 ? `+$${balance.toLocaleString('es-CL')}` : `-$${Math.abs(balance).toLocaleString('es-CL')}`;
    doc.text(balanceText, 161.5, yStart + 14, { align: 'center' });
    
    // Título de la tabla (ajustado para tarjetas más pequeñas)
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Detalle de Movimientos', 14, yStart + 28);
    
    // Tabla de movimientos
    const tableData = movimientos.map(m => [
        formatDate(m.fecha),
        m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        m.categoria_nombre,
        m.descripcion || '-',
        `$${Number(m.monto).toLocaleString('es-CL')}`
    ]);
    
    doc.autoTable({
        startY: yStart + 33,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body: tableData,
        theme: 'grid',
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        headStyles: {
            fillColor: [102, 126, 234],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 2
        },
        styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: [220, 220, 220],
            lineWidth: 0.1,
            overflow: 'linebreak',
            cellWidth: 'wrap'
        },
        columnStyles: {
            0: { cellWidth: 'auto', halign: 'center', minCellWidth: 18 },
            1: { cellWidth: 'auto', halign: 'center', minCellWidth: 15 },
            2: { cellWidth: 'auto', minCellWidth: 25 },
            3: { cellWidth: 'auto', overflow: 'linebreak', minCellWidth: 40 },
            4: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold', minCellWidth: 20 }
        },
        alternateRowStyles: {
            fillColor: [248, 248, 248]
        },
        // Colorear según tipo
        didParseCell: function(data) {
            if (data.column.index === 1 && data.section === 'body') {
                if (data.cell.raw === 'Ingreso') {
                    data.cell.styles.textColor = [16, 185, 129];
                    data.cell.styles.fontStyle = 'bold';
                } else if (data.cell.raw === 'Egreso') {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });
    
    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont(undefined, 'normal');
        doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
        doc.text(`Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}`, 105, 290, { align: 'center' });
    }
    
    // Guardar
    const filename = `Control_Financiero_${fechaDesde.replace(/\//g, '-')}_${fechaHasta.replace(/\//g, '-')}.pdf`;
    doc.save(filename);
    
    Swal.fire({
        icon: 'success',
        title: '¡Exportado!',
        text: 'Archivo PDF descargado correctamente',
        timer: 2000,
        showConfirmButton: false
    });
}

// ============================================
// UTILIDADES
// ============================================

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// ============================================
// GESTIÓN DE CATEGORÍAS
// ============================================

let categoriaModal = null;

// Inicializar modal de categoría
document.addEventListener('DOMContentLoaded', () => {
    const categoriaModalElement = document.getElementById('categoriaModal');
    if (categoriaModalElement) {
        categoriaModal = new bootstrap.Modal(categoriaModalElement);
    }
});

// Toggle visibilidad de gestión de categorías
function toggleGestionCategorias() {
    const section = document.getElementById('gestionCategorias');
    const isVisible = section.style.display !== 'none';
    
    if (isVisible) {
        section.style.display = 'none';
    } else {
        section.style.display = 'block';
        cargarListaCategorias();
    }
}

// Cargar lista de categorías en las tablas
async function cargarListaCategorias() {
    try {
        console.log('📋 Cargando lista de categorías...');
        
        const response = await authenticatedFetch(`${API_BASE}/gastos/categorias`);
        
        if (!response.ok) throw new Error('Error al cargar categorías');
        
        const data = await response.json();
        console.log('✅ Categorías cargadas:', data);
        
        // Separar por tipo
        const egresosItems = data.filter(cat => cat.tipo === 'gasto');
        const ingresosItems = data.filter(cat => cat.tipo === 'ingreso');
        
        // Renderizar tablas
        renderizarTablaCategorias('listaCategoriasEgresos', egresosItems);
        renderizarTablaCategorias('listaCategoriasIngresos', ingresosItems);
        
    } catch (error) {
        console.error('❌ Error al cargar lista de categorías:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la lista de categorías'
        });
    }
}

// Renderizar tabla de categorías
function renderizarTablaCategorias(tbodyId, categorias) {
    const tbody = document.getElementById(tbodyId);
    
    if (categorias.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: white;">
                    <i class="fas fa-inbox"></i> No hay categorías de este tipo
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = categorias.map(cat => {
        // Botones de edición y eliminación para todas las categorías
        const botonesAccion = `
            <button class="btn btn-sm btn-primary" onclick="abrirModalCategoria(${cat.id}, '${cat.tipo}')" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger ms-1" onclick="eliminarCategoria(${cat.id})" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        return `
            <tr style="color: white;">
                <td><i class="${cat.icono}" style="color: ${cat.color}; font-size: 1.2rem;"></i></td>
                <td><strong>${cat.nombre}</strong></td>
                <td>${cat.descripcion || '-'}</td>
                <td>
                    <span class="badge" style="background-color: ${cat.color};">${cat.color}</span>
                </td>
                <td>${botonesAccion}</td>
            </tr>
        `;
    }).join('');
}

// Abrir modal para crear/editar categoría
async function abrirModalCategoria(categoriaId, tipo) {
    try {
        // Limpiar formulario
        document.getElementById('categoriaForm').reset();
        document.getElementById('categoriaId').value = '';
        document.getElementById('categoriaTipo').value = tipo;
        
        if (categoriaId) {
            // Modo edición
            console.log('✏️ Editando categoría:', categoriaId);
            
            const response = await authenticatedFetch(`${API_BASE}/gastos/categorias`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            
            const categorias = await response.json();
            const categoria = categorias.find(c => c.id === categoriaId);
            
            if (!categoria) {
                throw new Error('Categoría no encontrada');
            }
            
            // Llenar formulario
            document.getElementById('categoriaId').value = categoria.id;
            document.getElementById('categoriaTipo').value = categoria.tipo;
            document.getElementById('categoriaNombre').value = categoria.nombre;
            document.getElementById('categoriaDescripcion').value = categoria.descripcion || '';
            document.getElementById('categoriaIcono').value = categoria.icono;
            document.getElementById('categoriaColor').value = categoria.color;
            
            document.getElementById('categoriaModalTitle').innerHTML = 
                `<i class="fas fa-edit me-2"></i>Editar Categoría de ${tipo === 'gasto' ? 'Egreso' : 'Ingreso'}`;
        } else {
            // Modo creación
            console.log('➕ Nueva categoría de tipo:', tipo);
            document.getElementById('categoriaColor').value = tipo === 'gasto' ? '#e74c3c' : '#27ae60';
            document.getElementById('categoriaModalTitle').innerHTML = 
                `<i class="fas fa-plus me-2"></i>Nueva Categoría de ${tipo === 'gasto' ? 'Egreso' : 'Ingreso'}`;
        }
        
        categoriaModal.show();
        
    } catch (error) {
        console.error('❌ Error al abrir modal de categoría:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo abrir el formulario de categoría'
        });
    }
}

// Guardar categoría (crear o actualizar)
async function guardarCategoria() {
    try {
        const categoriaId = document.getElementById('categoriaId').value;
        const tipo = document.getElementById('categoriaTipo').value;
        const nombre = document.getElementById('categoriaNombre').value.trim();
        const descripcion = document.getElementById('categoriaDescripcion').value.trim();
        const icono = document.getElementById('categoriaIcono').value;
        const color = document.getElementById('categoriaColor').value;
        
        // Validaciones
        if (!nombre) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos Incompletos',
                text: 'El nombre de la categoría es obligatorio'
            });
            return;
        }
        
        const data = {
            nombre,
            descripcion,
            icono,
            color,
            tipo
        };
        
        let response;
        
        if (categoriaId) {
            // Actualizar
            console.log('🔄 Actualizando categoría:', categoriaId, data);
            response = await authenticatedFetch(`${API_BASE}/gastos/categorias/${categoriaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            // Crear
            console.log('➕ Creando nueva categoría:', data);
            response = await authenticatedFetch(`${API_BASE}/gastos/categorias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar categoría');
        }
        
        const result = await response.json();
        console.log('✅ Categoría guardada:', result);
        
        // Cerrar modal
        categoriaModal.hide();
        
        // Recargar datos
        await cargarCategorias();
        await cargarListaCategorias();
        
        Swal.fire({
            icon: 'success',
            title: '¡Guardado!',
            text: `Categoría ${categoriaId ? 'actualizada' : 'creada'} correctamente`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('❌ Error al guardar categoría:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'No se pudo guardar la categoría'
        });
    }
}

// Eliminar categoría
async function eliminarCategoria(categoriaId) {
    try {
        const result = await Swal.fire({
            icon: 'warning',
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer. La categoría será eliminada permanentemente.',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        
        if (!result.isConfirmed) return;
        
        console.log('🗑️ Eliminando categoría:', categoriaId);
        
        const response = await authenticatedFetch(`${API_BASE}/gastos/categorias/${categoriaId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar categoría');
        }
        
        console.log('✅ Categoría eliminada');
        
        // Recargar datos
        await cargarCategorias();
        await cargarListaCategorias();
        
        Swal.fire({
            icon: 'success',
            title: '¡Eliminada!',
            text: 'La categoría ha sido eliminada correctamente',
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar categoría:', error);
        Swal.fire({
            icon: 'error',
            title: 'No se puede eliminar',
            text: error.message || 'Esta categoría no se puede eliminar porque tiene movimientos asociados o es una categoría del sistema'
        });
    }
}


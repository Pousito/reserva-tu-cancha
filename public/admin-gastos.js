// ============================================
// CONTROL DE GASTOS E INGRESOS - FRONTEND
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
    console.log('🎯 Inicializando Control de Gastos...');
    
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
    
    console.log('✅ Control de Gastos inicializado');
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
                text: 'No tienes permisos para acceder a esta sección. Solo owners y super admins pueden ver Control de Gastos.',
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
                    ${mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
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
    
    const gastos = movimientos
        .filter(m => m.tipo === 'gasto')
        .reduce((sum, m) => sum + Number(m.monto), 0);
    
    const balance = ingresos - gastos;
    
    document.getElementById('totalIngresos').textContent = `$${ingresos.toLocaleString('es-CL')}`;
    document.getElementById('totalGastos').textContent = `$${gastos.toLocaleString('es-CL')}`;
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
    actualizarGraficoGastos();
    actualizarGraficoEvolucion();
}

function actualizarGraficoGastos() {
    const ctx = document.getElementById('gastosChart');
    
    // Agrupar gastos por categoría
    const gastosPorCategoria = {};
    movimientos
        .filter(m => m.tipo === 'gasto')
        .forEach(m => {
            if (!gastosPorCategoria[m.categoria_nombre]) {
                gastosPorCategoria[m.categoria_nombre] = {
                    monto: 0,
                    color: m.categoria_color
                };
            }
            gastosPorCategoria[m.categoria_nombre].monto += Number(m.monto);
        });
    
    const labels = Object.keys(gastosPorCategoria);
    const data = labels.map(label => gastosPorCategoria[label].monto);
    const colors = labels.map(label => gastosPorCategoria[label].color);
    
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
            porMes[mes] = { ingresos: 0, gastos: 0 };
        }
        if (m.tipo === 'ingreso') {
            porMes[mes].ingresos += Number(m.monto);
        } else {
            porMes[mes].gastos += Number(m.monto);
        }
    });
    
    const meses = Object.keys(porMes).sort();
    const ingresosData = meses.map(mes => porMes[mes].ingresos);
    const gastosData = meses.map(mes => porMes[mes].gastos);
    
    if (evolucionChart) evolucionChart.destroy();
    
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
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Gastos',
                    data: gastosData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
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
                            const label = context.dataset.label || '';
                            const value = context.parsed.y || 0;
                            return `${label}: $${value.toLocaleString('es-CL')}`;
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
        title.innerHTML = '<i class="fas fa-minus-circle me-2"></i>Registrar Gasto';
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
    
    // Preparar datos
    const data = movimientos.map(m => ({
        'Fecha': formatDate(m.fecha),
        'Tipo': m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        'Categoría': m.categoria_nombre,
        'Descripción': m.descripcion || '',
        'Monto': Number(m.monto),
        'Método de Pago': m.metodo_pago || '',
        'Documento': m.numero_documento || ''
    }));
    
    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar anchos de columna
    ws['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Tipo
        { wch: 25 }, // Categoría
        { wch: 40 }, // Descripción
        { wch: 15 }, // Monto
        { wch: 15 }, // Método
        { wch: 20 }  // Documento
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    
    // Descargar
    const fechaDesde = document.getElementById('filterFechaDesde').value;
    const fechaHasta = document.getElementById('filterFechaHasta').value;
    const filename = `Gastos_${fechaDesde}_${fechaHasta}.xlsx`;
    
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

function exportToPDF() {
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
    
    // Título
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Control de Gastos e Ingresos', 14, 22);
    
    // Información
    doc.setFontSize(11);
    doc.setTextColor(100);
    const fechaDesde = formatDate(document.getElementById('filterFechaDesde').value);
    const fechaHasta = formatDate(document.getElementById('filterFechaHasta').value);
    doc.text(`Período: ${fechaDesde} - ${fechaHasta}`, 14, 30);
    doc.text(`Complejo: ${userData.complejo_nombre || 'N/A'}`, 14, 36);
    
    // Resumen
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + Number(m.monto), 0);
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + Number(m.monto), 0);
    const balance = ingresos - gastos;
    
    doc.setFontSize(10);
    doc.text(`Total Ingresos: $${ingresos.toLocaleString('es-CL')}`, 14, 44);
    doc.text(`Total Gastos: $${gastos.toLocaleString('es-CL')}`, 14, 50);
    doc.text(`Balance: $${balance.toLocaleString('es-CL')}`, 14, 56);
    
    // Tabla
    const tableData = movimientos.map(m => [
        formatDate(m.fecha),
        m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        m.categoria_nombre,
        m.descripcion || '-',
        `$${Number(m.monto).toLocaleString('es-CL')}`
    ]);
    
    doc.autoTable({
        startY: 64,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [102, 126, 234],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 22 },
            2: { cellWidth: 40 },
            3: { cellWidth: 60 },
            4: { cellWidth: 30, halign: 'right' }
        }
    });
    
    // Guardar
    const filename = `Gastos_${fechaDesde.replace(/\//g, '-')}_${fechaHasta.replace(/\//g, '-')}.pdf`;
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
        const gastosItems = data.filter(cat => cat.tipo === 'gasto');
        const ingresosItems = data.filter(cat => cat.tipo === 'ingreso');
        
        // Renderizar tablas
        renderizarTablaCategorias('listaCategoriasGastos', gastosItems);
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
                `<i class="fas fa-edit me-2"></i>Editar Categoría de ${tipo === 'gasto' ? 'Gasto' : 'Ingreso'}`;
        } else {
            // Modo creación
            console.log('➕ Nueva categoría de tipo:', tipo);
            document.getElementById('categoriaColor').value = tipo === 'gasto' ? '#e74c3c' : '#27ae60';
            document.getElementById('categoriaModalTitle').innerHTML = 
                `<i class="fas fa-plus me-2"></i>Nueva Categoría de ${tipo === 'gasto' ? 'Gasto' : 'Ingreso'}`;
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


// Variables globales
let reservas = [];
let reservasFiltradas = [];
let complejos = [];
let busquedaActual = '';
let filtrosActivos = {};

// Variables para el calendario
let vistaActual = 'lista';
let semanaActual = new Date();
let calendarioData = {};
let canchas = [];

// Variable para el bloqueo temporal administrativo
let bloqueoTemporalAdmin = null;


// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN RESERVATIONS INICIALIZADO ===');
    
    // Verificar autenticación
    if (!AdminUtils.isAuthenticated()) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Mostrar información del usuario
    const adminUser = AdminUtils.getCurrentUser();
    if (adminUser) {
        document.getElementById('adminWelcome').textContent = `Bienvenido, ${adminUser.nombre || 'Admin'}`;
        
        // Actualizar información del usuario en el sidebar
        document.querySelector('[data-user="name"]').textContent = adminUser.nombre || 'Admin';
        document.querySelector('[data-user="role"]').textContent = AdminUtils.getRoleDisplayName(adminUser.rol);
        document.querySelector('[data-user="complex"]').textContent = adminUser.complejo_nombre || 'Todos los complejos';
    }
    
    // Aplicar permisos según el rol
    aplicarPermisosPorRol();
    
    // Configurar logout
    AdminUtils.setupLogout();
    
    // Cargar datos iniciales
    cargarComplejos();
    cargarReservas();
    configurarEventListeners();
});

function aplicarPermisosPorRol() {
    const user = AdminUtils.getCurrentUser();
    if (!user) return;
    
    const userRole = user.rol;
    console.log('🔐 Aplicando permisos para rol:', userRole);
    
    // Ocultar elementos según el rol
    if (userRole === 'manager') {
        // Managers no pueden ver información financiera ni gestionar complejos/reportes
        document.querySelectorAll('[data-role="reports"]').forEach(element => {
            element.style.display = 'none';
        });
        document.querySelectorAll('[data-role="all-complexes"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar filtro de complejo para managers (solo ven su complejo)
        document.querySelectorAll('[data-role="complex-filter"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar selector de complejo en el calendario para managers
        const selectorComplejoCalendario = document.getElementById('selectorComplejoCalendario');
        if (selectorComplejoCalendario) {
            selectorComplejoCalendario.style.display = 'none';
        }
        
        console.log('✅ Elementos ocultados para manager');
    } else if (userRole === 'owner') {
        // Owners no pueden gestionar complejos (solo ver su complejo)
        document.querySelectorAll('[data-role="all-complexes"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar filtro de complejo para owners (solo ven su complejo)
        document.querySelectorAll('[data-role="complex-filter"]').forEach(element => {
            element.style.display = 'none';
        });
        
        // Ocultar selector de complejo en el calendario para owners
        const selectorComplejoCalendario = document.getElementById('selectorComplejoCalendario');
        if (selectorComplejoCalendario) {
            selectorComplejoCalendario.style.display = 'none';
        }
        
        console.log('✅ Elementos ocultados para owner');
    } else if (userRole === 'super_admin') {
        // Super admins pueden ver todo - asegurar que todos los elementos estén visibles
        console.log('✅ Super admin - acceso completo');
        
        // Mostrar selector de complejo en el calendario para super admin
        const selectorComplejoCalendario = document.getElementById('selectorComplejoCalendario');
        if (selectorComplejoCalendario) {
            selectorComplejoCalendario.style.display = 'block';
        }
        
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
    }
    
    // Actualizar título del calendario según el rol y complejo del usuario
    actualizarTituloCalendarioPorRol();
}

function configurarEventListeners() {
    // Event listeners para filtros
    document.getElementById('complejoFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('estadoFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('tipoReservaFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('fechaDesde').addEventListener('change', aplicarFiltros);
    document.getElementById('fechaHasta').addEventListener('change', aplicarFiltros);
    
    // Event listeners para cerrar calendarios automáticamente
    document.getElementById('fechaDesde').addEventListener('change', function() {
        // Cerrar el calendario después de seleccionar fecha
        this.blur();
    });
    
    document.getElementById('fechaHasta').addEventListener('change', function() {
        // Cerrar el calendario después de seleccionar fecha
        this.blur();
    });
}

async function cargarComplejos() {
    try {
        // Solo cargar complejos si el usuario tiene permisos
        if (!AdminUtils.canViewAllComplexes()) {
            console.log('Usuario no tiene permisos para ver todos los complejos');
            return;
        }
        
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/complejos`);
        if (!response) return;
        
        if (response.ok) {
            complejos = await response.json();
            llenarSelectComplejos();
        } else {
            console.error('Error al cargar complejos');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function llenarSelectComplejos() {
    const user = AdminUtils.getCurrentUser();
    const select = document.getElementById('complejoFilter');
    const selectCalendario = document.getElementById('complejoCalendario');
    
    select.innerHTML = '<option value="">Todos los complejos</option>';
    selectCalendario.innerHTML = '<option value="">Todos los complejos</option>';
    
    complejos.forEach(complejo => {
        const option = document.createElement('option');
        option.value = complejo.id;
        option.textContent = complejo.nombre;
        select.appendChild(option);
        
        const optionCalendario = document.createElement('option');
        optionCalendario.value = complejo.id;
        optionCalendario.textContent = complejo.nombre;
        selectCalendario.appendChild(optionCalendario);
    });
    
    // Para managers y owners, establecer su complejo por defecto en el calendario
    if (user && (user.rol === 'manager' || user.rol === 'owner') && user.complejo_id) {
        if (selectCalendario) {
            selectCalendario.value = user.complejo_id;
        }
    }
    
    // Actualizar título del calendario después de cargar los complejos
    actualizarTituloCalendarioPorRol();
}

/**
 * Actualizar título del calendario según el rol del usuario
 */
function actualizarTituloCalendarioPorRol() {
    const user = AdminUtils.getCurrentUser();
    const tituloCalendario = document.getElementById('tituloCalendario');
    
    if (!user || !tituloCalendario) return;
    
    const userRole = user.rol;
    const complejoNombre = user.complejo_nombre || 'Complejo';
    
    if (userRole === 'super_admin') {
        // Para super admin, usar la función original que permite seleccionar complejo
        actualizarTituloCalendario();
    } else if (userRole === 'owner' || userRole === 'manager') {
        // Para owner y manager, mostrar el nombre específico de su complejo
        tituloCalendario.innerHTML = `<i class="fas fa-calendar-week me-2"></i>Calendario Semanal ${complejoNombre}`;
        console.log(`📅 Título del calendario actualizado para ${userRole}: ${complejoNombre}`);
    }
}

/**
 * Actualizar título del calendario según el complejo seleccionado (solo para super_admin)
 */
function actualizarTituloCalendario() {
    const user = AdminUtils.getCurrentUser();
    const selectCalendario = document.getElementById('complejoCalendario');
    const tituloCalendario = document.getElementById('tituloCalendario');
    
    if (!selectCalendario || !tituloCalendario) return;
    
    // Solo aplicar esta lógica para super_admin
    if (user && user.rol !== 'super_admin') {
        return;
    }
    
    const complejoSeleccionado = selectCalendario.value;
    
    if (complejoSeleccionado) {
        const complejo = complejos.find(c => c.id == complejoSeleccionado);
        if (complejo) {
            tituloCalendario.innerHTML = `<i class="fas fa-calendar-week me-2"></i>Calendario Semanal ${complejo.nombre}`;
        }
    } else {
        tituloCalendario.innerHTML = `<i class="fas fa-calendar-week me-2"></i>Calendario Semanal - Todos los Complejos`;
    }
}

async function cargarReservas() {
    try {
        const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reservas`);
        if (!response) return;
        
        if (response.ok) {
            const data = await response.json();
            console.log('📋 Datos de reservas recibidos:', data);
            
            // Verificar si la respuesta es un array o tiene una propiedad reservas
            if (Array.isArray(data)) {
                reservas = data;
            } else if (data.reservas && Array.isArray(data.reservas)) {
                reservas = data.reservas;
            } else {
                console.error('❌ Formato de datos inesperado:', data);
                mostrarError('Formato de datos inesperado');
                return;
            }
            
            reservasFiltradas = [...reservas]; // Inicializar reservas filtradas
            console.log('✅ Reservas cargadas:', reservas.length);
            mostrarReservas(reservasFiltradas);
            actualizarContador();
        } else {
            console.error('❌ Error en respuesta:', response.status, response.statusText);
            mostrarError('Error al cargar las reservas');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión');
    }
}

function aplicarFiltros() {
    aplicarFiltrosAvanzados();
}

// Esta función se reemplaza por la nueva versión más abajo

function mostrarReservas(reservasAMostrar) {
    const tbody = document.getElementById('reservationsTableBody');
    
    if (reservasAMostrar.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted">
                    <i class="fas fa-inbox"></i> No se encontraron reservas
                </td>
            </tr>
        `;
        return;
    }
    
    const html = reservasAMostrar.map(reserva => {
        // Debug: Verificar datos de la reserva (solo si hay problema)
        // if (reserva.codigo_reserva === 'K07GYE' || reserva.codigo_reserva === '6BNY23') {
        //     console.log(`🔍 Debug reserva ${reserva.codigo_reserva}:`, {
        //         codigo: reserva.codigo_reserva,
        //         nombre: reserva.nombre_cliente,
        //         email: reserva.email_cliente,
        //         telefono: reserva.telefono_cliente,
        //         tieneTelefono: !!reserva.telefono_cliente,
        //         telefonoTipo: typeof reserva.telefono_cliente,
        //         todosLosCampos: Object.keys(reserva)
        //     });
        // }
        
        // Resaltar texto de búsqueda si hay término activo
        const codigoResaltado = busquedaActual ? resaltarTexto(reserva.codigo_reserva, busquedaActual) : reserva.codigo_reserva;
        const nombreResaltado = busquedaActual ? resaltarTexto(reserva.nombre_cliente || 'Sin nombre', busquedaActual) : (reserva.nombre_cliente || 'Sin nombre');
        
        // Determinar tipo de reserva
        const tipoReserva = reserva.tipo_reserva || 'directa';
        
        // Calcular comisión correcta según el tipo de reserva
        let comision = 0;
        let porcentajeComision = 0;
        
        if (tipoReserva === 'directa') {
            // Reserva web: 3.5%
            porcentajeComision = 3.5;
            comision = Math.round(reserva.precio_total * 0.035);
        } else {
            // Reserva administrativa: 1.75%
            porcentajeComision = 1.75;
            comision = Math.round(reserva.precio_total * 0.0175);
        }
        
        return `
        <tr>
            <td>
                <code>${codigoResaltado}</code>
            </td>
            <td>
                <div>
                    <strong>${nombreResaltado}</strong>
                    <br>
                    <small class="text-muted">${reserva.email_cliente || 'Sin email'}</small>
                    ${reserva.telefono_cliente ? `<br><small class="text-muted"><i class="fas fa-phone me-1"></i>${reserva.telefono_cliente}</small>` : ''}
                </div>
            </td>
            <td>${reserva.complejo_nombre}</td>
            <td>${reserva.cancha_nombre}</td>
            <td>${reserva.fecha ? formatearFecha(reserva.fecha) : 'Sin fecha'}</td>
            <td>
                <span class="badge bg-light text-dark">
                    ${formatearHora(reserva.hora_inicio)} - ${formatearHora(reserva.hora_fin)}
                </span>
            </td>
            <td>
                ${reserva.precio_total ? `<strong>$${reserva.precio_total.toLocaleString()}</strong>` : '<span class="text-muted">-</span>'}
            </td>
            <td>
                <span class="badge badge-tipo badge-${tipoReserva}">
                    ${tipoReserva === 'directa' ? 'Web' : 'Admin'}
                </span>
            </td>
            <td>
                <div class="comision-info">
                    <strong>$${comision.toLocaleString()}</strong>
                    <br>
                    <small>${porcentajeComision}%</small>
                </div>
            </td>
            <td>
                <span class="badge badge-status badge-${reserva.estado}">
                    ${reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                </span>
            </td>
            <td class="reservation-actions">
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="verDetalles('${reserva.codigo_reserva}')" title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                ${reserva.estado === 'pendiente' ? `
                    <button class="btn btn-sm btn-outline-success btn-action" onclick="confirmarReserva('${reserva.codigo_reserva}')" title="Confirmar">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                ${reserva.estado !== 'cancelada' ? `
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="cancelarReserva('${reserva.codigo_reserva}')" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
    }).join('');
    
    tbody.innerHTML = html;
}

function verDetalles(codigoReserva) {
    const reserva = reservas.find(r => r.codigo_reserva === codigoReserva);
    if (!reserva) return;
    
    const modalBody = document.getElementById('reservationModalBody');
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Información del Cliente</h6>
                <p><strong>Nombre:</strong> ${reserva.nombre_cliente}</p>
                <p><strong>Email:</strong> ${reserva.email_cliente}</p>
                <p><strong>RUT:</strong> ${reserva.rut_cliente}</p>
                ${reserva.telefono_cliente ? `<p><strong>Teléfono:</strong> ${reserva.telefono_cliente}</p>` : ''}
            </div>
            <div class="col-md-6">
                <h6>Detalles de la Reserva</h6>
                <p><strong>Código:</strong> <code>${reserva.codigo_reserva}</code></p>
                <p><strong>Complejo:</strong> ${reserva.complejo_nombre}</p>
                <p><strong>Cancha:</strong> ${reserva.cancha_nombre}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(reserva.fecha)}</p>
                <p><strong>Hora:</strong> ${formatearHora(reserva.hora_inicio)} - ${formatearHora(reserva.hora_fin)}</p>
                <p><strong>Precio:</strong> ${reserva.precio_total ? `$${reserva.precio_total.toLocaleString()}` : 'No disponible'}</p>
                <p><strong>Estado:</strong> 
                    <span class="badge badge-status badge-${reserva.estado}">
                        ${reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)}
                    </span>
                </p>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6>Información Adicional</h6>
                <p><strong>Fecha de Creación:</strong> ${formatearFechaHora(reserva.created_at)}</p>
                <p><strong>ID de Transacción:</strong> ${reserva.transaction_id || 'N/A'}</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('reservationModal'));
    modal.show();
}

async function confirmarReserva(codigoReserva) {
    if (!confirm('¿Estás seguro de que quieres confirmar esta reserva?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas/${codigoReserva}/confirmar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            mostrarNotificacion('Reserva confirmada exitosamente', 'success');
            cargarReservas(); // Recargar la lista
            
            // También recargar el calendario si estamos en vista de calendario
            if (vistaActual === 'calendario') {
                cargarCalendario();
            }
        } else {
            mostrarNotificacion('Error al confirmar la reserva', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
    }
}

async function cancelarReserva(codigoReserva) {
    if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin/reservas/${codigoReserva}/cancelar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            mostrarNotificacion('Reserva cancelada exitosamente', 'success');
            cargarReservas(); // Recargar la lista
            
            // También recargar el calendario si estamos en vista de calendario
            if (vistaActual === 'calendario') {
                cargarCalendario();
            }
        } else {
            mostrarNotificacion('Error al cancelar la reserva', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión', 'danger');
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    
    try {
        // Manejar fechas ISO (2025-09-08T00:00:00.000Z) y fechas simples (YYYY-MM-DD)
        let fechaObj;
        if (fecha.includes('T')) {
            // CORRECCIÓN: Fecha ISO UTC del servidor - extraer solo la parte de fecha para evitar problemas de zona horaria
            const fechaParte = fecha.split('T')[0]; // "2025-12-25"
            const [año, mes, dia] = fechaParte.split('-').map(Number);
            fechaObj = new Date(año, mes - 1, dia); // Crear fecha local
        } else {
            // Fecha simple (YYYY-MM-DD) - crear fecha local
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

function formatearFechaHora(fechaHora) {
    const fechaObj = new Date(fechaHora);
    return fechaObj.toLocaleString('es-CL', {
        timeZone: 'America/Santiago' // Forzar zona horaria de Chile
    });
}

function mostrarError(mensaje) {
    const tbody = document.getElementById('reservationsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center text-danger">
                <i class="fas fa-exclamation-triangle"></i> ${mensaje}
            </td>
        </tr>
    `;
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

function mostrarNotificacion(mensaje, tipo, duracion = 5000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 350px; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-start">
            <div class="flex-grow-1">
                ${mensaje}
            </div>
            <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, duracion);
}

// ===== NUEVAS FUNCIONES DE BÚSQUEDA Y FILTROS =====

/**
 * Búsqueda rápida por código o nombre
 */
function buscarReservas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    busquedaActual = searchTerm;
    
    // Aplicar filtros avanzados (que incluyen la búsqueda)
    aplicarFiltrosAvanzados();
}

/**
 * Limpiar búsqueda
 */
function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    busquedaActual = '';
    aplicarFiltrosAvanzados();
}

/**
 * Toggle de filtros avanzados
 */
function toggleFiltrosAvanzados() {
    const filtrosDiv = document.getElementById('filtrosAvanzados');
    const boton = event.target;
    
    if (filtrosDiv.style.display === 'none') {
        filtrosDiv.style.display = 'block';
        boton.innerHTML = '<i class="fas fa-filter me-2"></i>Ocultar Filtros';
        boton.classList.remove('btn-primary');
        boton.classList.add('btn-outline-primary');
    } else {
        filtrosDiv.style.display = 'none';
        boton.innerHTML = '<i class="fas fa-filter me-2"></i>Filtros Avanzados';
        boton.classList.remove('btn-outline-primary');
        boton.classList.add('btn-primary');
    }
}

/**
 * Aplicar filtros avanzados
 */
function aplicarFiltrosAvanzados() {
    const complejoFilter = document.getElementById('complejoFilter').value;
    const estadoFilter = document.getElementById('estadoFilter').value;
    const tipoReservaFilter = document.getElementById('tipoReservaFilter').value;
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    
    // Guardar filtros activos
    filtrosActivos = {
        complejo: complejoFilter,
        estado: estadoFilter,
        tipoReserva: tipoReservaFilter,
        fechaDesde: fechaDesde,
        fechaHasta: fechaHasta
    };
    
    // Empezar siempre con todas las reservas originales
    let reservasFiltradasTemp = [...reservas];
    
    // Aplicar filtros sobre todas las reservas
    if (complejoFilter) {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(r => r.complejo_id == complejoFilter);
    }
    
    if (estadoFilter) {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(r => r.estado === estadoFilter);
    }
    
    if (tipoReservaFilter) {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(r => r.tipo_reserva === tipoReservaFilter);
    }
    
    if (fechaDesde) {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(r => r.fecha >= fechaDesde);
    }
    
    if (fechaHasta) {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(r => r.fecha <= fechaHasta);
    }
    
    // Aplicar búsqueda si hay término activo
    if (busquedaActual && busquedaActual.trim() !== '') {
        reservasFiltradasTemp = reservasFiltradasTemp.filter(reserva => {
            const codigo = (reserva.codigo_reserva || '').toLowerCase();
            const nombre = (reserva.nombre_cliente || '').toLowerCase();
            const email = (reserva.email_cliente || '').toLowerCase();
            
            return codigo.includes(busquedaActual) || 
                   nombre.includes(busquedaActual) || 
                   email.includes(busquedaActual);
        });
    }
    
    reservasFiltradas = reservasFiltradasTemp;
    mostrarReservas(reservasFiltradas);
    actualizarContador();
}

/**
 * Limpiar todos los filtros
 */
function limpiarFiltros() {
    // Limpiar búsqueda
    document.getElementById('searchInput').value = '';
    busquedaActual = '';
    
    // Limpiar filtros avanzados
    document.getElementById('complejoFilter').value = '';
    document.getElementById('estadoFilter').value = '';
    document.getElementById('tipoReservaFilter').value = '';
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    
    // Resetear variables
    filtrosActivos = {};
    reservasFiltradas = [...reservas];
    
    // Mostrar todas las reservas
    mostrarReservas(reservasFiltradas);
    actualizarContador();
}

/**
 * Actualizar contador de reservas
 */
function actualizarContador() {
    const total = reservasFiltradas.length;
    const totalElement = document.getElementById('totalReservas');
    
    if (total === 0) {
        totalElement.textContent = '0';
        totalElement.className = 'badge bg-secondary ms-2';
    } else if (total === reservas.length) {
        totalElement.textContent = total;
        totalElement.className = 'badge bg-primary ms-2';
    } else {
        totalElement.textContent = `${total} de ${reservas.length}`;
        totalElement.className = 'badge bg-info ms-2';
    }
}

/**
 * Resaltar texto de búsqueda
 */
function resaltarTexto(texto, termino) {
    if (!termino || termino === '') return texto;
    
    const regex = new RegExp(`(${termino})`, 'gi');
    return texto.replace(regex, '<span class="search-highlight">$1</span>');
}

// ===== FUNCIONES DEL CALENDARIO SEMANAL =====

/**
 * Mostrar vista (lista o calendario)
 */
function mostrarVista(vista) {
    vistaActual = vista;
    
    const btnLista = document.getElementById('btnLista');
    const btnCalendario = document.getElementById('btnCalendario');
    const vistaLista = document.getElementById('vistaLista');
    const vistaCalendario = document.getElementById('vistaCalendario');
    
    if (vista === 'lista') {
        btnLista.className = 'btn btn-primary';
        btnCalendario.className = 'btn btn-outline-primary';
        vistaLista.style.display = 'block';
        vistaCalendario.style.display = 'none';
    } else {
        btnLista.className = 'btn btn-outline-primary';
        btnCalendario.className = 'btn btn-primary';
        vistaLista.style.display = 'none';
        vistaCalendario.style.display = 'block';
        
        // Cargar calendario si no está cargado
        if (Object.keys(calendarioData).length === 0) {
            cargarCalendario();
        }
    }
}

/**
 * Cargar datos del calendario
 */
async function cargarCalendario() {
    try {
        const user = AdminUtils.getCurrentUser();
        let complejoId = '';
        
        // Determinar el complejo según el rol del usuario
        if (user && (user.rol === 'manager' || user.rol === 'owner')) {
            // Para managers y owners, usar su complejo asignado
            complejoId = user.complejo_id || '';
        } else if (user && user.rol === 'super_admin') {
            // Para super admin, usar el selector
            complejoId = document.getElementById('complejoCalendario').value;
        }
        
        const fechaInicio = obtenerInicioSemana(semanaActual);
        const fechaFin = obtenerFinSemana(semanaActual);
        
        console.log(`📅 Cargando calendario para complejo: ${complejoId}, usuario: ${user.rol}`);
        
        const response = await fetch(`${API_BASE}/admin/calendar/week?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&complejoId=${complejoId}`, {
            headers: {
                'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            calendarioData = data.calendario || {};
            canchas = data.canchas || [];
            
            // Debug: Mostrar datos del calendario
            console.log('📅 Datos del calendario recibidos:', calendarioData);
            console.log('🏟️ Canchas disponibles:', canchas);
            console.log('🕐 Horarios recibidos del backend:', data.horarios);
            
            // Debug específico para 12/09/2025
            if (calendarioData['2025-09-12']) {
                console.log('🔍 Datos específicos para 12/09/2025:', calendarioData['2025-09-12']);
            } else {
                console.log('❌ No hay datos para 12/09/2025 en calendarioData');
            }
            
            renderizarCalendario(data);
            actualizarRangoSemana();
        } else {
            console.error('Error al cargar calendario:', response.statusText);
        }
    } catch (error) {
        console.error('Error al cargar calendario:', error);
    }
}

/**
 * Renderizar calendario semanal
 */
function renderizarCalendario(data = null) {
    const grid = document.getElementById('calendarGrid');
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    console.log('📅 Renderizando calendario para semanaActual:', semanaActual.toDateString());
    
    let html = '';
    
    // Header con horas
    html += '<div class="calendar-header">Hora</div>';
    
    // Headers de días
    for (let i = 0; i < 7; i++) {
        const fecha = new Date(semanaActual);
        fecha.setDate(semanaActual.getDate() - semanaActual.getDay() + 1 + i);
        const esHoy = esMismoDia(fecha, new Date());
        const esOtroMes = fecha.getMonth() !== semanaActual.getMonth();
        
        console.log(`📅 Día ${i}: ${fecha.toDateString()} (número: ${fecha.getDate()})`);
        
        html += `<div class="calendar-day-header ${esHoy ? 'today' : ''} ${esOtroMes ? 'other-month' : ''}">
            ${dias[i]}<br>
            <small>${fecha.getDate()}</small>
        </div>`;
    }
    
    // Obtener todas las horas únicas de todos los días
    const todasLasHoras = new Set();
    if (data && data.horarios) {
        data.horarios.forEach(dia => {
            dia.horarios.forEach(horario => {
                todasLasHoras.add(horario.label);
            });
        });
    }
    
    // Si no hay horarios del backend, generar horarios por defecto
    if (todasLasHoras.size === 0) {
        // Generar horarios para todos los días de la semana
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(semanaActual);
            fecha.setDate(semanaActual.getDate() - semanaActual.getDay() + 1 + i);
            const horas = generarHoras(formatearFecha(fecha));
            horas.forEach(hora => todasLasHoras.add(hora));
        }
    }
    
    // Convertir a array y ordenar
    const horasOrdenadas = Array.from(todasLasHoras).sort();
    
    // Filas de horas
    horasOrdenadas.forEach(hora => {
        // Columna de hora
        html += `<div class="calendar-time-slot">${hora}</div>`;
        
        // Columnas de días
        for (let i = 0; i < 7; i++) {
            const fecha = new Date(semanaActual);
            fecha.setDate(semanaActual.getDate() - semanaActual.getDay() + 1 + i);
            const fechaStr = formatearFecha(fecha);
            
            // Verificar si esta hora está disponible para este día
            const fechaObj = new Date(semanaActual);
            fechaObj.setDate(semanaActual.getDate() - semanaActual.getDay() + 1 + i);
            const diaSemana = fechaObj.getDay();
            
            // Determinar si la hora está disponible según el día de la semana
            let horaDisponible = false;
            const horaNum = parseInt(hora.split(':')[0]);
            
            if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a Viernes: 16:00 a 23:00
                horaDisponible = horaNum >= 16 && horaNum <= 23;
            } else { // Sábado y Domingo: 12:00 a 23:00
                horaDisponible = horaNum >= 12 && horaNum <= 23;
            }
            
            if (!horaDisponible) {
                // Hora no disponible para este día
                html += `<div class="calendar-slot unavailable">
                    <div class="slot-time">-</div>
                </div>`;
            } else {
                // Obtener todas las reservas para esta fecha y hora
                const reservasEnSlot = [];
                if (calendarioData[fechaStr] && calendarioData[fechaStr][hora]) {
                    const slotData = calendarioData[fechaStr][hora];
                    if (Array.isArray(slotData)) {
                        reservasEnSlot.push(...slotData);
                    } else {
                        reservasEnSlot.push(slotData);
                    }
                }
                
                // Debug para fecha específica
                if (fechaStr === '2025-09-12' && hora === '16:00') {
                    console.log('🔍 Debug para 12/09/2025 16:00:');
                    console.log('  - fechaStr:', fechaStr);
                    console.log('  - hora:', hora);
                    console.log('  - calendarioData[fechaStr]:', calendarioData[fechaStr]);
                    console.log('  - reservasEnSlot:', reservasEnSlot);
                    console.log('  - totalCanchas:', canchas.length);
                }
                
                // Determinar estado de disponibilidad
                const totalCanchas = canchas.length;
                const canchasOcupadas = reservasEnSlot.length;
                const canchasDisponibles = totalCanchas - canchasOcupadas;
                
                let estadoSlot = '';
                let claseSlot = '';
                let onclick = '';
                let title = '';
                
                if (canchasOcupadas === 0) {
                    // Todas las canchas disponibles
                    estadoSlot = 'available';
                    claseSlot = 'calendar-slot available';
                    onclick = `onclick="seleccionarSlot('${fechaStr}', '${hora}')"`;
                    title = `Todas las canchas disponibles (${totalCanchas}/${totalCanchas}) - Click para reservar`;
                } else if (canchasOcupadas < totalCanchas) {
                    // Algunas canchas ocupadas
                    estadoSlot = 'partial';
                    claseSlot = 'calendar-slot partial';
                    onclick = `onclick="seleccionarSlot('${fechaStr}', '${hora}')"`;
                    title = `${canchasDisponibles} cancha${canchasDisponibles > 1 ? 's' : ''} disponible${canchasDisponibles > 1 ? 's' : ''} (${canchasDisponibles}/${totalCanchas}) - Click para reservar`;
                } else {
                    // Todas las canchas ocupadas
                    estadoSlot = 'occupied';
                    claseSlot = 'calendar-slot occupied';
                    onclick = '';
                    title = `Todas las canchas ocupadas (${canchasOcupadas}/${totalCanchas}) - Click en icono para ver reservas`;
                }
                
                // Generar HTML del slot
                html += `<div class="${claseSlot}" ${onclick} title="${title}">`;
                
                if (estadoSlot === 'occupied') {
                    // Ambas ocupadas - mostrar info de reservas
                    html += `<div class="slot-content">
                        <div class="slot-time">${hora}</div>
                        <div class="slot-info-icon" onclick="mostrarInfoReservas('${fechaStr}', '${hora}', event)">
                            <i class="fas fa-info-circle"></i>
                        </div>
                    </div>`;
                } else if (estadoSlot === 'partial') {
                    // Parcialmente ocupado - mostrar info y permitir reserva
                    html += `<div class="slot-content">
                        <div class="slot-time">${hora}</div>
                        <div class="slot-info-icon" onclick="mostrarInfoReservas('${fechaStr}', '${hora}', event)">
                            <i class="fas fa-info-circle"></i>
                        </div>
                    </div>`;
                } else {
                    // Disponible - solo mostrar hora
                    html += `<div class="slot-content">
                        <div class="slot-time">${hora}</div>
                    </div>`;
                }
                
                html += `</div>`;
            }
        }
    });
    
    grid.innerHTML = html;
}

/**
 * Generar array de horas
 */
function generarHoras(fecha = null) {
    const horas = [];
    
    // Si no se proporciona fecha, usar horarios por defecto (Lunes a Viernes)
    let horaInicio = 16;
    let horaFin = 22;
    
    if (fecha) {
        const fechaObj = new Date(fecha);
        const diaSemana = fechaObj.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
        
        if (diaSemana >= 1 && diaSemana <= 5) { // Lunes a Viernes: 16:00 a 23:00
            horaInicio = 16;
            horaFin = 22;
        } else { // Sábado y Domingo: 12:00 a 23:00
            horaInicio = 12;
            horaFin = 22;
        }
    }
    
    // Generar solo horas completas (sin minutos)
    for (let h = horaInicio; h <= horaFin; h++) {
        const hora = `${h.toString().padStart(2, '0')}:00`;
        horas.push(hora);
    }
    
    return horas;
}

/**
 * Obtener inicio de semana (lunes)
 */
function obtenerInicioSemana(fecha) {
    const inicio = new Date(fecha);
    const dia = inicio.getDay();
    // Lunes = 1, Martes = 2, ..., Domingo = 0
    // Si es domingo (0), necesitamos ir al lunes anterior (-6)
    // Si es lunes (1), no necesitamos mover la fecha (0)
    // Si es martes (2), necesitamos ir al lunes anterior (-1)
    const diff = dia === 0 ? -6 : 1 - dia;
    inicio.setDate(inicio.getDate() + diff);
    return formatearFecha(inicio);
}

/**
 * Obtener fin de semana (domingo)
 */
function obtenerFinSemana(fecha) {
    const fin = new Date(fecha);
    const dia = fin.getDay();
    // Domingo = 0, Lunes = 1, ..., Sábado = 6
    // Si es domingo (0), no necesitamos mover la fecha (0)
    // Si es lunes (1), necesitamos ir al domingo siguiente (+6)
    // Si es sábado (6), necesitamos ir al domingo siguiente (+1)
    const diff = dia === 0 ? 0 : 7 - dia;
    fin.setDate(fin.getDate() + diff);
    return formatearFecha(fin);
}

/**
 * Verificar si dos fechas son el mismo día
 */
function esMismoDia(fecha1, fecha2) {
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
}

/**
 * Formatear fecha para API
 */
function formatearFecha(fecha) {
    if (!fecha) return '';
    
    // Si ya es un string en formato YYYY-MM-DD, devolverlo tal como está
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    
    // Si es un objeto Date, convertirlo usando zona horaria local
    if (fecha instanceof Date) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Si es un string que puede ser parseado como fecha
    if (typeof fecha === 'string') {
        const dateObj = new Date(fecha);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    
    return '';
}

/**
 * Actualizar rango de semana mostrado
 */
function actualizarRangoSemana() {
    // Usar exactamente el mismo cálculo que el calendario
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Calcular el primer día (lunes) usando la misma lógica que renderizarCalendario
    const primerDia = new Date(semanaActual);
    primerDia.setDate(semanaActual.getDate() - semanaActual.getDay() + 1);
    
    // Calcular el último día (domingo)
    const ultimoDia = new Date(primerDia);
    ultimoDia.setDate(primerDia.getDate() + 6);
    
    const inicioStr = primerDia.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const finStr = ultimoDia.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const rangoTexto = `${inicioStr} - ${finStr}`;
    console.log('📅 Actualizando rango de semana:', rangoTexto);
    console.log('📅 Primer día (lunes):', primerDia.toDateString());
    console.log('📅 Último día (domingo):', ultimoDia.toDateString());
    console.log('📅 semanaActual:', semanaActual.toDateString());
    
    document.getElementById('rangoSemana').textContent = rangoTexto;
}

/**
 * Navegación de semanas
 */
function semanaAnterior() {
    // Crear una nueva fecha para evitar problemas de mutación
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    semanaActual = nuevaFecha;
    console.log('📅 Navegando a semana anterior:', semanaActual.toDateString());
    cargarCalendario();
}

function semanaSiguiente() {
    // Crear una nueva fecha para evitar problemas de mutación
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    semanaActual = nuevaFecha;
    console.log('📅 Navegando a semana siguiente:', semanaActual.toDateString());
    cargarCalendario();
}

function irAHoy() {
    semanaActual = new Date();
    console.log('📅 Navegando a hoy:', semanaActual.toDateString());
    cargarCalendario();
}

/**
 * Forzar actualización completa del calendario
 */
function forzarActualizacionCalendario() {
    console.log('🔄 Forzando actualización completa del calendario...');
    
    // Limpiar datos del calendario
    calendarioData = {};
    
    // Limpiar el grid del calendario
    const grid = document.getElementById('calendarGrid');
    if (grid) {
        grid.innerHTML = '';
    }
    
    // Recargar el calendario
    cargarCalendario();
}

/**
 * Seleccionar slot del calendario
 */
async function seleccionarSlot(fecha, hora) {
    console.log('📅 Slot seleccionado:', { fecha, hora });
    
    // Formatear fecha para mostrar (usando zona horaria de Chile)
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(Date.UTC(año, mes - 1, dia));
    const fechaFormateada = fechaObj.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Santiago' // Forzar zona horaria de Chile
    });
    
    // Calcular hora fin (1 hora después)
    const [h, m] = hora.split(':').map(Number);
    const horaFin = new Date();
    horaFin.setHours(h + 1, m, 0, 0);
    const horaFinStr = `${horaFin.getHours().toString().padStart(2, '0')}:${horaFin.getMinutes().toString().padStart(2, '0')}`;
    
    // Verificar si hay bloqueos temporales activos en este horario
    const bloqueosActivos = await verificarBloqueosTemporales(fecha, hora, horaFinStr);
    
    if (bloqueosActivos.length > 0) {
        console.log('🔒 Bloqueos temporales encontrados:', bloqueosActivos);
        
        // Contar bloqueos por tipo
        const bloqueosClientes = bloqueosActivos.filter(b => {
            try {
                const datos = JSON.parse(b.datos_cliente || '{}');
                return !datos.tipo_bloqueo || datos.tipo_bloqueo === 'cliente';
            } catch {
                return true; // Si no se puede parsear, asumir que es de cliente
            }
        });
        
        const bloqueosAdmins = bloqueosActivos.filter(b => {
            try {
                const datos = JSON.parse(b.datos_cliente || '{}');
                return datos.tipo_bloqueo === 'administrativo';
            } catch {
                return false;
            }
        });
        
        let mensaje = '';
        if (bloqueosClientes.length > 0) {
            mensaje = `🚫 <strong>Horario temporalmente ocupado</strong><br><br>
                      Hay ${bloqueosClientes.length} cliente(s) reservando en este momento.<br>
                      Por favor, intenta nuevamente en unos minutos.`;
        } else if (bloqueosAdmins.length > 0) {
            mensaje = `⚠️ <strong>Horario en uso</strong><br><br>
                      Otro administrador está procesando una reserva en este horario.<br>
                      Por favor, intenta nuevamente en unos minutos.`;
        } else {
            mensaje = `🔒 <strong>Horario temporalmente bloqueado</strong><br><br>
                      Este horario está siendo procesado por otro usuario.<br>
                      Por favor, intenta nuevamente en unos minutos.`;
        }
        
        mostrarNotificacion(mensaje, 'warning', 8000);
        return;
    }
    
    // Crear bloqueo temporal administrativo
    const bloqueoAdmin = await crearBloqueoTemporalAdmin(fecha, hora, horaFinStr);
    
    if (!bloqueoAdmin.success) {
        console.error('❌ Error creando bloqueo temporal administrativo:', bloqueoAdmin.error);
        
        // Mensaje amigable según el tipo de error
        let mensajeError = '';
        if (bloqueoAdmin.error.includes('AdminUtils.getToken is not a function')) {
            mensajeError = '🔧 <strong>Error de configuración</strong><br><br>Hay un problema técnico temporal. Por favor, recarga la página e intenta nuevamente.';
        } else if (bloqueoAdmin.error.includes('Unauthorized') || bloqueoAdmin.error.includes('401')) {
            mensajeError = '🔐 <strong>Sesión expirada</strong><br><br>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (bloqueoAdmin.error.includes('Network') || bloqueoAdmin.error.includes('fetch')) {
            mensajeError = '🌐 <strong>Error de conexión</strong><br><br>No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else {
            mensajeError = '⚠️ <strong>Error inesperado</strong><br><br>Ocurrió un problema al procesar tu solicitud. Por favor, intenta nuevamente.';
        }
        
        mostrarNotificacion(mensajeError, 'danger', 8000);
        return;
    }
    
    console.log('✅ Bloqueo temporal administrativo creado:', bloqueoAdmin.bloqueo);
    
    // Actualizar información en el modal
    const infoElement = document.getElementById('modalInfoFechaHora');
    if (infoElement) {
        infoElement.innerHTML = `${fechaFormateada} de ${hora} a ${horaFinStr}`;
    }
    
    // Guardar datos para el envío del formulario
    window.reservaSeleccionada = {
        fecha: fecha,
        horaInicio: hora,
        horaFin: horaFinStr,
        bloqueoId: bloqueoAdmin.bloqueo.id
    };
    
    abrirModalReserva(true); // Ocultar selector de complejo cuando se abre desde calendario
}

/**
 * Mostrar información de reservas en un slot
 */
function mostrarInfoReservas(fecha, hora, event) {
    event.stopPropagation(); // Evitar que se active el click del slot
    
    const reservasEnSlot = [];
    if (calendarioData[fecha] && calendarioData[fecha][hora]) {
        const slotData = calendarioData[fecha][hora];
        if (Array.isArray(slotData)) {
            reservasEnSlot.push(...slotData);
        } else {
            reservasEnSlot.push(slotData);
        }
    }
    
    if (reservasEnSlot.length === 0) {
        return;
    }
    
    // Crear modal de información
    let modalHtml = `
        <div class="modal fade" id="modalInfoReservas" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Reservas - ${fecha} ${hora}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
    `;
    
    reservasEnSlot.forEach((reserva, index) => {
        modalHtml += `
            <div class="reservation-detail mb-3">
                <div class="row">
                    <div class="col-md-6">
                        <strong>Cliente:</strong> ${reserva.cliente || 'N/A'}<br>
                        <strong>Cancha:</strong> ${reserva.cancha || 'N/A'}<br>
                        <strong>Estado:</strong> <span class="badge bg-${reserva.estado === 'confirmada' ? 'success' : 'warning'}">${reserva.estado || 'N/A'}</span>
                        ${reserva.telefono ? `<br><strong>Teléfono:</strong> ${reserva.telefono}` : ''}
                    </div>
                    <div class="col-md-6">
                        <strong>Precio:</strong> $${(reserva.precio || 0).toLocaleString()}<br>
                        <strong>Tipo:</strong> ${reserva.tipo || 'reserva'}
                    </div>
                </div>
            </div>
        `;
    });
    
    modalHtml += `
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente si existe
    const existingModal = document.getElementById('modalInfoReservas');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Agregar nuevo modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modalInfoReservas'));
    modal.show();
    
    // Limpiar modal cuando se cierre
    document.getElementById('modalInfoReservas').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// ===== FUNCIONES DEL MODAL DE NUEVA RESERVA =====

/**
 * Abrir modal de nueva reserva
 */
function abrirModalReserva(ocultarComplejo = false) {
    document.getElementById('modalNuevaReserva').style.display = 'block';
    
    // Mostrar u ocultar selector de complejo según el contexto
    const seccionComplejo = document.getElementById('seccionComplejoModal');
    const seccionCancha = document.getElementById('seccionCanchaModal');
    
    if (seccionComplejo) {
        seccionComplejo.style.display = ocultarComplejo ? 'none' : 'block';
    }
    
    // La sección de cancha siempre debe estar visible
    if (seccionCancha) {
        seccionCancha.style.display = 'block';
    }
    
    // Si no se oculta el complejo, cargar la lista de complejos
    if (!ocultarComplejo) {
        cargarComplejosModal();
    } else {
        // Si se oculta el complejo, cargar directamente las canchas del complejo correspondiente
        const selectCalendario = document.getElementById('complejoCalendario');
        const modalComplejo = document.getElementById('modalComplejo');
        
        // Para super_admin, usar el complejo seleccionado en el calendario
        if (selectCalendario && modalComplejo && selectCalendario.value) {
            modalComplejo.value = selectCalendario.value;
            cargarCanchasModal(selectCalendario.value);
        } else {
            // Para managers y owners, usar su complejo asignado
            const user = AdminUtils.getCurrentUser();
            console.log('🔍 abrirModalReserva - user:', user);
            if (user && user.complejo_id) {
                console.log('🔍 abrirModalReserva - estableciendo complejo_id:', user.complejo_id);
                // Asegurar que el elemento esté visible antes de establecer el valor
                if (modalComplejo) {
                    modalComplejo.value = user.complejo_id;
                    console.log('🔍 abrirModalReserva - valor establecido:', modalComplejo.value);
                }
                // Pasar el complejoId directamente a la función
                cargarCanchasModal(user.complejo_id);
            } else if (user && user.rol === 'super_admin') {
                // Para super_admin sin complejo seleccionado, usar el primer complejo disponible
                console.log('🔍 abrirModalReserva - super_admin sin complejo seleccionado, usando primer complejo disponible');
                if (complejos && complejos.length > 0) {
                    const primerComplejo = complejos[0];
                    console.log('🔍 abrirModalReserva - usando primer complejo:', primerComplejo);
                    if (modalComplejo) {
                        modalComplejo.value = primerComplejo.id;
                    }
                    cargarCanchasModal(primerComplejo.id);
                } else {
                    console.log('❌ abrirModalReserva - no hay complejos disponibles');
                }
            } else {
                console.log('❌ abrirModalReserva - no se pudo obtener complejo_id del usuario');
            }
        }
    }
    
}

/**
 * Cerrar modal de nueva reserva
 */
function cerrarModalReserva() {
    document.getElementById('modalNuevaReserva').style.display = 'none';
    document.getElementById('formNuevaReserva').reset();
    
    // Limpiar validaciones visuales
    limpiarValidacionesModal();
    
    // Limpiar datos de reserva seleccionada
    window.reservaSeleccionada = null;
    
    // Restaurar mensaje por defecto
    const infoElement = document.getElementById('modalInfoFechaHora');
    if (infoElement) {
        infoElement.textContent = 'Selecciona una hora en el calendario';
    }
    
    // Restaurar visibilidad de ambos selectores
    const seccionComplejo = document.getElementById('seccionComplejoModal');
    const seccionCancha = document.getElementById('seccionCanchaModal');
    
    if (seccionComplejo) {
        seccionComplejo.style.display = 'block';
    }
    
    if (seccionCancha) {
        seccionCancha.style.display = 'block';
    }
}

/**
 * Limpiar validaciones visuales del modal
 */
function limpiarValidacionesModal() {
    const campos = [
        'modalNombreCliente',
        'modalEmailCliente', 
        'modalRutCliente',
        'modalTelefonoCliente'
    ];
    
    campos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.classList.remove('is-valid', 'is-invalid');
            const feedback = campo.parentNode.querySelector('.valid-feedback, .invalid-feedback');
            if (feedback) {
                feedback.classList.add('d-none');
            }
        }
    });
}

/**
 * Cargar complejos en el modal
 */
async function cargarComplejosModal() {
    const select = document.getElementById('modalComplejo');
    select.innerHTML = '<option value="">Seleccionar complejo</option>';
    
    complejos.forEach(complejo => {
        const option = document.createElement('option');
        option.value = complejo.id;
        option.textContent = complejo.nombre;
        select.appendChild(option);
    });
}

/**
 * Cargar canchas cuando se selecciona complejo
 */
async function cargarCanchasModal(complejoIdParam = null) {
    const modalComplejoElement = document.getElementById('modalComplejo');
    const complejoId = complejoIdParam || (modalComplejoElement ? modalComplejoElement.value : '');
    const select = document.getElementById('modalCancha');
    
    console.log('🔍 cargarCanchasModal - modalComplejoElement:', modalComplejoElement);
    console.log('🔍 cargarCanchasModal - complejoIdParam:', complejoIdParam);
    console.log('🔍 cargarCanchasModal - complejoId final:', complejoId);
    console.log('🔍 cargarCanchasModal - modalComplejoElement.value:', modalComplejoElement ? modalComplejoElement.value : 'elemento no encontrado');
    
    select.innerHTML = '<option value="">Seleccionar cancha</option>';
    
    if (complejoId) {
        try {
            console.log('🔍 cargarCanchasModal - haciendo fetch a:', `${API_BASE}/admin/canchas?complejoId=${complejoId}`);
            const response = await fetch(`${API_BASE}/admin/canchas?complejoId=${complejoId}`, {
                headers: {
                    'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
                }
            });
            
            console.log('🔍 cargarCanchasModal - response status:', response.status);
            console.log('🔍 cargarCanchasModal - response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            if (response.ok) {
                const canchasData = await response.json();
                console.log('🔍 cargarCanchasModal - canchasData recibidas:', canchasData);
                console.log('🔍 cargarCanchasModal - cantidad de canchas:', canchasData.length);
                
                if (canchasData.length === 0) {
                    console.log('⚠️ cargarCanchasModal - No se encontraron canchas para el complejo:', complejoId);
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No hay canchas disponibles';
                    option.disabled = true;
                    select.appendChild(option);
                } else {
                    // Si hay datos de reserva seleccionada, filtrar solo canchas disponibles
                    if (window.reservaSeleccionada) {
                        console.log('🔍 cargarCanchasModal - Verificando disponibilidad para horario:', window.reservaSeleccionada);
                        await cargarCanchasDisponiblesModal(canchasData, select, complejoId);
                    } else {
                        // Si no hay reserva seleccionada, mostrar todas las canchas
                        canchasData.forEach(cancha => {
                            console.log('🔍 cargarCanchasModal - procesando cancha:', cancha);
                            const precio = cancha.precio_hora || cancha.precio || 0;
                            console.log('🔍 cargarCanchasModal - precio calculado:', precio, 'precio_hora:', cancha.precio_hora, 'precio:', cancha.precio);
                            const option = document.createElement('option');
                            option.value = cancha.id;
                            option.textContent = `${cancha.nombre} - ${cancha.tipo}`;
                            option.dataset.precio = precio;
                            select.appendChild(option);
                        });
                    }
                }
                
                console.log('🔍 cargarCanchasModal - opciones agregadas al select:', select.innerHTML);
            } else {
                console.error('❌ cargarCanchasModal - Error en respuesta:', response.status, response.statusText);
                const responseText = await response.text();
                console.error('❌ cargarCanchasModal - Respuesta completa:', responseText);
            }
        } catch (error) {
            console.error('Error al cargar canchas:', error);
        }
    }
}

/**
 * Cargar solo las canchas disponibles para el horario seleccionado
 */
async function cargarCanchasDisponiblesModal(canchasData, select, complejoId) {
    const { fecha, horaInicio, horaFin } = window.reservaSeleccionada;
    console.log('🔍 cargarCanchasDisponiblesModal - Verificando disponibilidad para:', { fecha, horaInicio, horaFin });
    
    let canchasDisponibles = [];
    
    for (const cancha of canchasData) {
        try {
            // Verificar disponibilidad de cada cancha
            const timestamp = Date.now();
            const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}?t=${timestamp}`, {
                headers: {
                    'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const disponibilidadData = await response.json();
                console.log('🔍 cargarCanchasDisponiblesModal - Disponibilidad para cancha', cancha.id, ':', disponibilidadData);
                
                // Verificar si la cancha está disponible en el horario seleccionado
                const estaDisponible = verificarDisponibilidadCanchaAdmin(horaInicio, horaFin, disponibilidadData);
                
                if (estaDisponible) {
                    console.log('✅ Cancha', cancha.id, 'disponible para', horaInicio, '-', horaFin);
                    canchasDisponibles.push(cancha);
                } else {
                    console.log('❌ Cancha', cancha.id, 'ocupada para', horaInicio, '-', horaFin);
                }
            } else {
                console.error('❌ Error verificando disponibilidad de cancha', cancha.id, ':', response.status);
                // En caso de error, incluir la cancha por seguridad
                canchasDisponibles.push(cancha);
            }
        } catch (error) {
            console.error('❌ Error verificando disponibilidad de cancha', cancha.id, ':', error);
            // En caso de error, incluir la cancha por seguridad
            canchasDisponibles.push(cancha);
        }
    }
    
    console.log('🔍 cargarCanchasDisponiblesModal - Canchas disponibles encontradas:', canchasDisponibles.length, 'de', canchasData.length);
    
    if (canchasDisponibles.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay canchas disponibles para este horario';
        option.disabled = true;
        select.appendChild(option);
    } else {
        canchasDisponibles.forEach(cancha => {
            const precio = cancha.precio_hora || cancha.precio || 0;
            const option = document.createElement('option');
            option.value = cancha.id;
            option.textContent = `${cancha.nombre} - ${cancha.tipo}`;
            option.dataset.precio = precio;
            select.appendChild(option);
        });
    }
}

/**
 * Verificar si una cancha está disponible para un horario específico
 */
function verificarDisponibilidadCanchaAdmin(horaInicio, horaFin, disponibilidadData) {
    console.log('🔍 verificarDisponibilidadCanchaAdmin - Verificando disponibilidad:', {
        horaInicio, 
        horaFin, 
        reservas: disponibilidadData.reservas?.length || 0,
        bloqueos: disponibilidadData.bloqueos?.length || 0
    });
    
    // Verificar conflictos con reservas existentes
    for (const reserva of disponibilidadData.reservas || []) {
        if (haySuperposicionHorariosAdmin(horaInicio, horaFin, reserva.hora_inicio, reserva.hora_fin)) {
            console.log('❌ Cancha ocupada por reserva:', reserva);
            return false;
        }
    }
    
    // Verificar conflictos con bloqueos temporales (excluyendo bloqueos administrativos del mismo admin)
    const user = AdminUtils.getCurrentUser();
    for (const bloqueo of disponibilidadData.bloqueos || []) {
        // Verificar si el bloqueo es del admin actual por session_id o por admin_id
        const esBloqueoDelAdminActual = 
            (bloqueo.session_id && bloqueo.session_id.includes(user?.email || '')) ||
            (bloqueo.admin_id && bloqueo.admin_id === user?.id) ||
            (bloqueo.session_id && bloqueo.session_id.includes(user?.id?.toString() || ''));
            
        if (!esBloqueoDelAdminActual) {
            if (haySuperposicionHorariosAdmin(horaInicio, horaFin, bloqueo.hora_inicio, bloqueo.hora_fin)) {
                console.log('❌ Cancha bloqueada temporalmente por otro admin:', bloqueo);
                return false;
            }
        } else {
            console.log('✅ Ignorando bloqueo temporal del admin actual:', {
                session_id: bloqueo.session_id,
                admin_id: bloqueo.admin_id,
                user_email: user?.email,
                user_id: user?.id
            });
        }
    }
    
    console.log('✅ Cancha disponible');
    return true;
}

/**
 * Verificar superposición de horarios para el panel de administradores
 */
function haySuperposicionHorariosAdmin(inicio1, fin1, inicio2, fin2) {
    const inicio1Min = timeToMinutesAdmin(inicio1);
    const fin1Min = timeToMinutesAdmin(fin1);
    const inicio2Min = timeToMinutesAdmin(inicio2);
    const fin2Min = timeToMinutesAdmin(fin2);
    
    return inicio1Min < fin2Min && fin1Min > inicio2Min;
}

/**
 * Convertir tiempo a minutos para el panel de administradores
 */
function timeToMinutesAdmin(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const m = parseInt(minutes);
    
    if (h === 0 && timeStr.includes('00:00')) {
        return 24 * 60 + m;
    }
    
    return h * 60 + m;
}

// ===== FUNCIONES DE VALIDACIÓN =====

/**
 * Validar RUT chileno
 */
function validarRUT(rut) {
    // Limpiar el RUT (quitar puntos, guiones y espacios)
    rut = rut.replace(/[^0-9kK]/g, '');
    
    // Verificar longitud mínima
    if (rut.length < 8) {
        return false;
    }
    
    // Separar número y dígito verificador
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Validar que el número sea válido (solo dígitos)
    if (!/^\d+$/.test(numero)) {
        return false;
    }
    
    // Validar que el dígito verificador sea válido
    if (!/^[0-9kK]$/.test(dv)) {
        return false;
    }
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;
    
    // Recorrer el número de derecha a izquierda
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    
    return dv === dvCalculado;
}

/**
 * Validar nombre completo
 */
function validarNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') {
        return false;
    }
    
    // Limpiar espacios al inicio y final
    nombre = nombre.trim();
    
    // Verificar que no esté vacío
    if (nombre.length === 0) {
        return false;
    }
    
    // Verificar longitud mínima (al menos 2 caracteres)
    if (nombre.length < 2) {
        return false;
    }
    
    // Verificar que contenga al menos un espacio (nombre y apellido)
    if (!nombre.includes(' ')) {
        return false;
    }
    
    // Verificar que no contenga caracteres especiales o números
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return regex.test(nombre);
}

/**
 * Validar email
 */
function validarEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    // Limpiar espacios al inicio y final
    email = email.trim();
    
    // Verificar que no esté vacío
    if (email.length === 0) {
        return false;
    }
    
    // Expresión regular para validar email
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Formatear RUT con puntos y guión
 */
function formatearRUT(rut) {
    // Limpiar el RUT
    rut = rut.replace(/[^0-9kK]/g, '');
    
    // Solo formatear si tiene al menos 2 caracteres
    if (rut.length < 2) {
        return rut;
    }
    
    // Si tiene menos de 8 caracteres, solo agregar puntos
    if (rut.length < 8) {
        return rut.replace(/(\d{1,3})(\d{1,3})/, '$1.$2');
    }
    
    // Formatear RUT completo
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Agregar puntos cada 3 dígitos desde la derecha
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${numeroFormateado}-${dv}`;
}

/**
 * Crear reserva administrativa con validaciones completas
 */
async function crearReservaAdmin() {
    // Obtener referencias a los campos
    const nombreInput = document.getElementById('modalNombreCliente');
    const emailInput = document.getElementById('modalEmailCliente');
    const rutInput = document.getElementById('modalRutCliente');
    const telefonoInput = document.getElementById('modalTelefonoCliente');
    const canchaSelect = document.getElementById('modalCancha');
    
    // Obtener valores
    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();
    const rut = rutInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const canchaId = canchaSelect.value;
    
    // Verificar que se haya seleccionado una hora del calendario
    if (!window.reservaSeleccionada) {
        mostrarNotificacion('Por favor, selecciona una hora en el calendario', 'warning');
        return;
    }
    
    // Verificar que se haya seleccionado una cancha
    if (!canchaId) {
        mostrarNotificacion('Por favor, selecciona una cancha', 'warning');
        canchaSelect.focus();
        return;
    }
    
    // Validar campos obligatorios
    if (!nombre) {
        mostrarNotificacion('Por favor completa el campo "Nombre del Cliente"', 'danger');
        nombreInput.focus();
        return;
    }
    
    if (!email) {
        mostrarNotificacion('Por favor completa el campo "Email del Cliente"', 'danger');
        emailInput.focus();
        return;
    }
    
    if (!rut) {
        mostrarNotificacion('Por favor completa el campo "RUT del Cliente"', 'danger');
        rutInput.focus();
        return;
    }
    
    // Validar formato de los campos
    if (!validarNombre(nombre)) {
        mostrarNotificacion('Por favor ingresa un nombre completo válido (nombre y apellido)', 'danger');
        nombreInput.focus();
        return;
    }
    
    if (!validarEmail(email)) {
        mostrarNotificacion('Por favor ingresa un email válido', 'danger');
        emailInput.focus();
        return;
    }
    
    if (!validarRUT(rut)) {
        mostrarNotificacion('Por favor ingresa un RUT válido', 'danger');
        rutInput.focus();
        return;
    }
    
    // Validar teléfono si se proporciona
    if (telefono && !validarTelefono(telefono)) {
        mostrarNotificacion('Por favor ingresa un teléfono válido', 'danger');
        telefonoInput.focus();
        return;
    }
    
    // Preparar datos para envío
    const datos = {
        cancha_id: canchaId,
        fecha: window.reservaSeleccionada.fecha,
        hora_inicio: window.reservaSeleccionada.horaInicio,
        hora_fin: window.reservaSeleccionada.horaFin,
        nombre_cliente: nombre,
        email_cliente: email,
        telefono_cliente: telefono || null,
        rut_cliente: formatearRUT(rut),
        tipo_reserva: 'administrativa',
        creada_por_admin: true,
        precio_total: 28000, // Precio fijo según el modal
        bloqueo_id: window.reservaSeleccionada.bloqueoId // ID del bloqueo temporal del admin actual
    };
    
    // Mostrar indicador de procesamiento
    const btnCrear = document.querySelector('#modalNuevaReserva .btn-success');
    const originalText = btnCrear.innerHTML;
    btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creando reserva...';
    btnCrear.disabled = true;
    
    try {
        console.log('📝 Enviando datos de reserva administrativa:', datos);
        
        const response = await fetch(`${API_BASE}/admin/calendar/reservation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
            },
            body: JSON.stringify(datos)
        });
        
        const resultado = await response.json();
        
        if (response.ok) {
            console.log('✅ Reserva creada exitosamente:', resultado);
            
            // Liberar bloqueo temporal administrativo
            await liberarBloqueoTemporalAdmin();
            
            mostrarNotificacion(
                `✅ Reserva creada exitosamente<br>Código: <strong>${resultado.reserva?.codigo_reserva || 'N/A'}</strong>`, 
                'success',
                6000
            );
            
            // Cerrar modal y limpiar formulario
            cerrarModalReserva();
            
            // Recargar datos
            cargarReservas();
            if (vistaActual === 'calendario') {
                cargarCalendario();
            }
            
        } else {
            console.error('❌ Error al crear reserva:', resultado);
            mostrarNotificacion(
                `❌ Error al crear la reserva: ${resultado.error || 'Error desconocido'}`, 
                'danger',
                8000
            );
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        mostrarNotificacion('❌ Error de conexión al crear la reserva', 'danger');
    } finally {
        // Restaurar botón
        btnCrear.innerHTML = originalText;
        btnCrear.disabled = false;
    }
}

/**
 * Nueva reserva administrativa (botón principal)
 * Cambia a vista calendario y muestra notificación
 */
function nuevaReservaAdmin() {
    // Cambiar a vista calendario
    mostrarVista('calendario');
    
    // Scroll suave hacia el calendario
    setTimeout(() => {
        const calendarioContainer = document.getElementById('vistaCalendario');
        if (calendarioContainer) {
            calendarioContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 100);
    
    // Mostrar notificación más específica y duradera
    mostrarNotificacion(
        '💡 <strong>Instrucciones para nueva reserva:</strong><br>' +
        '1. Busca una hora disponible en el calendario (casillas en <span style="color: #28a745; font-weight: bold;">verde</span>)<br>' +
        '2. Haz clic en la hora deseada<br>' +
        '3. Completa el formulario que aparecerá', 
        'info',
        8000 // 8 segundos para que el usuario tenga tiempo de leer
    );
    
    // Resaltar temporalmente las horas disponibles
    setTimeout(() => {
        resaltarHorasDisponibles();
    }, 500);
}

/**
 * Resaltar temporalmente las horas disponibles en el calendario
 */
function resaltarHorasDisponibles() {
    const horasDisponibles = document.querySelectorAll('.calendar-slot.available');
    
    horasDisponibles.forEach((slot, index) => {
        // Agregar clase de resaltado
        slot.classList.add('highlight-available');
        
        // Remover el resaltado después de 3 segundos
        setTimeout(() => {
            slot.classList.remove('highlight-available');
        }, 3000 + (index * 100)); // Efecto escalonado
    });
    
    console.log(`✨ Resaltando ${horasDisponibles.length} horas disponibles`);
}

// ===== VALIDACIÓN EN TIEMPO REAL =====

/**
 * Configurar validación en tiempo real para los campos del modal
 */
function configurarValidacionTiempoReal() {
    // Validación de nombre
    const nombreInput = document.getElementById('modalNombreCliente');
    if (nombreInput) {
        nombreInput.addEventListener('input', function() {
            validarCampoTiempoReal(this, validarNombre, 'Nombre completo válido');
        });
    }
    
    // Validación de email
    const emailInput = document.getElementById('modalEmailCliente');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            validarCampoTiempoReal(this, validarEmail, 'Email válido');
        });
    }
    
    // Validación de RUT
    const rutInput = document.getElementById('modalRutCliente');
    if (rutInput) {
        rutInput.addEventListener('input', function() {
            // Formatear RUT mientras se escribe
            const valor = this.value;
            const valorLimpio = valor.replace(/[^0-9kK]/g, '');
            
            if (valorLimpio.length > 1) {
                const formateado = formatearRUT(valorLimpio);
                if (formateado !== valor) {
                    this.value = formateado;
                }
            }
            
            validarCampoTiempoReal(this, validarRUT, 'RUT válido');
        });
    }
    
    // Validación de teléfono (opcional)
    const telefonoInput = document.getElementById('modalTelefonoCliente');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function() {
            // Solo validar si tiene contenido
            if (this.value.trim()) {
                validarCampoTiempoReal(this, validarTelefono, 'Teléfono válido');
            } else {
                // Limpiar validación si está vacío
                this.classList.remove('is-valid', 'is-invalid');
                const feedback = this.parentNode.querySelector('.valid-feedback, .invalid-feedback');
                if (feedback) feedback.classList.add('d-none');
            }
        });
    }
}

/**
 * Validar teléfono chileno
 */
function validarTelefono(telefono) {
    if (!telefono || typeof telefono !== 'string') {
        return false;
    }
    
    telefono = telefono.trim();
    
    // Patrones válidos para teléfonos chilenos
    const patrones = [
        /^\+569\d{8}$/, // +56912345678
        /^569\d{8}$/,   // 56912345678
        /^9\d{8}$/,     // 912345678
        /^2\d{8}$/,     // 212345678 (fijo)
        /^3\d{8}$/      // 312345678 (fijo)
    ];
    
    return patrones.some(patron => patron.test(telefono));
}

/**
 * Validar campo en tiempo real
 */
function validarCampoTiempoReal(input, funcionValidacion, mensajeValido) {
    const valor = input.value.trim();
    
    // Solo validar si el usuario ha interactuado con el campo
    if (valor.length === 0) {
        input.classList.remove('is-valid', 'is-invalid');
        const feedback = input.parentNode.querySelector('.valid-feedback, .invalid-feedback');
        if (feedback) feedback.classList.add('d-none');
        return;
    }
    
    const esValido = funcionValidacion(valor);
    const validFeedback = input.parentNode.querySelector('.valid-feedback');
    const invalidFeedback = input.parentNode.querySelector('.invalid-feedback');
    
    if (esValido) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        if (validFeedback) {
            validFeedback.textContent = mensajeValido;
            validFeedback.classList.remove('d-none');
        }
        if (invalidFeedback) {
            invalidFeedback.classList.add('d-none');
        }
    } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        if (validFeedback) {
            validFeedback.classList.add('d-none');
        }
        if (invalidFeedback) {
            invalidFeedback.classList.remove('d-none');
        }
    }
}

// Event listeners para el modal
document.addEventListener('DOMContentLoaded', function() {
    // Cargar canchas cuando cambia el complejo
    document.getElementById('modalComplejo').addEventListener('change', cargarCanchasModal);
    
    // Calcular precio cuando cambian los campos
    // document.getElementById('modalCancha').addEventListener('change', calcularPrecioModal);
    
    // Cargar horas cuando cambia la fecha
    // document.getElementById('modalFecha').addEventListener('change', cargarHorasModal);
    
    // Cargar calendario cuando cambia el complejo (solo para super_admin)
    const complejoCalendarioSelect = document.getElementById('complejoCalendario');
    if (complejoCalendarioSelect) {
        complejoCalendarioSelect.addEventListener('change', function() {
            const user = AdminUtils.getCurrentUser();
            if (user && user.rol === 'super_admin') {
                actualizarTituloCalendario();
                cargarCalendario();
            }
        });
    }
    
    // Configurar validación en tiempo real
    configurarValidacionTiempoReal();
    
    // Configurar limpieza de bloqueo temporal al cerrar el modal
    const modalNuevaReserva = document.getElementById('modalNuevaReserva');
    if (modalNuevaReserva) {
        modalNuevaReserva.addEventListener('hidden.bs.modal', function() {
            liberarBloqueoTemporalAdmin();
        });
    }
    
    // Limpiar bloqueo temporal al cerrar la página
    window.addEventListener('beforeunload', liberarBloqueoTemporalAdmin);
});

// ===== FUNCIONES DE BLOQUEO TEMPORAL ADMINISTRATIVO =====

/**
 * Verificar si hay bloqueos temporales activos en un horario específico
 */
async function verificarBloqueosTemporales(fecha, horaInicio, horaFin) {
    try {
        console.log('🔍 Verificando bloqueos temporales para:', { fecha, horaInicio, horaFin });
        
        const response = await fetch(`${API_BASE}/admin/calendar/check-blocking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
            },
            body: JSON.stringify({
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error verificando bloqueos: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 Resultado verificación bloqueos:', result);
        
        return result.bloqueos || [];
        
    } catch (error) {
        console.error('❌ Error verificando bloqueos temporales:', error);
        
        // Si hay un error, mostrar mensaje amigable y retornar array vacío para continuar
        if (error.message.includes('AdminUtils.getToken is not a function')) {
            mostrarNotificacion(
                '🔧 <strong>Error de configuración</strong><br><br>Hay un problema técnico temporal. Por favor, recarga la página.',
                'warning',
                6000
            );
        } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
            mostrarNotificacion(
                '🔐 <strong>Sesión expirada</strong><br><br>Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                'danger',
                6000
            );
        }
        
        return [];
    }
}

/**
 * Crear bloqueo temporal administrativo
 */
async function crearBloqueoTemporalAdmin(fecha, horaInicio, horaFin) {
    try {
        console.log('🔒 Creando bloqueo temporal administrativo:', { fecha, horaInicio, horaFin });
        
        const user = AdminUtils.getCurrentUser();
        const sessionId = `admin_${user.id}_${Date.now()}`;
        
        const response = await fetch(`${API_BASE}/admin/calendar/create-blocking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
            },
            body: JSON.stringify({
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                session_id: sessionId,
                tipo: 'administrativo'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error creando bloqueo: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Bloqueo temporal administrativo creado:', result);
        
        // Guardar referencia del bloqueo
        bloqueoTemporalAdmin = {
            id: result.bloqueoId,
            sessionId: sessionId,
            fecha: fecha,
            horaInicio: horaInicio,
            horaFin: horaFin
        };
        
        // Configurar limpieza automática después de 2 minutos
        setTimeout(() => {
            if (bloqueoTemporalAdmin) {
                console.log('⏰ Limpieza automática del bloqueo temporal administrativo');
                liberarBloqueoTemporalAdmin();
            }
        }, 2 * 60 * 1000); // 2 minutos
        
        return { success: true, bloqueo: bloqueoTemporalAdmin };
        
    } catch (error) {
        console.error('❌ Error creando bloqueo temporal administrativo:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Liberar bloqueo temporal administrativo
 */
async function liberarBloqueoTemporalAdmin() {
    if (!bloqueoTemporalAdmin) return;
    
    try {
        console.log('🔓 Liberando bloqueo temporal administrativo:', bloqueoTemporalAdmin.id);
        
        const response = await fetch(`${API_BASE}/admin/calendar/liberate-blocking/${bloqueoTemporalAdmin.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AdminUtils.getAuthToken()}`
            }
        });
        
        if (response.ok) {
            console.log('✅ Bloqueo temporal administrativo liberado exitosamente');
        } else {
            console.error('⚠️ Error liberando bloqueo temporal administrativo');
        }
        
    } catch (error) {
        console.error('❌ Error liberando bloqueo temporal administrativo:', error);
    } finally {
        bloqueoTemporalAdmin = null;
    }
}

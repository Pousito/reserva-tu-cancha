/**
 * Sistema de Gestión de Depósitos a Complejos
 * Panel de Super Admin para controlar depósitos diarios con comisiones + IVA
 */

// Variables globales
let depositosData = [];
let complejosData = [];
let usuarioActual = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando Gestión de Depósitos v2.0...');
    verificarAutenticacion();
    cargarInformacionUsuario();
    cargarComplejos();
    cargarDepositos();
    actualizarHora();
    aplicarPermisosPorRol();
    
    // Configurar fecha por defecto (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtroFechaDesde').value = hoy;
    document.getElementById('filtroFechaHasta').value = hoy;
});

/**
 * Verificar autenticación del usuario
 */
async function verificarAutenticacion() {
    try {
        // Usar adminToken en lugar de endpoint de verificación
        const token = localStorage.getItem('adminToken');
        const userStr = localStorage.getItem('adminUser');
        
        if (!token || !userStr) {
            console.log('❌ No hay token o usuario, redirigiendo al login...');
            window.location.href = '/admin-login.html';
            return;
        }

        // Obtener datos del usuario desde localStorage
        usuarioActual = JSON.parse(userStr);
        
        console.log('👤 Usuario cargado:', usuarioActual);
        
        // Verificar que sea super admin
        if (usuarioActual.rol !== 'super_admin') {
            console.log('❌ Rol no autorizado:', usuarioActual.rol);
            Swal.fire({
                icon: 'error',
                title: 'Acceso Denegado',
                text: 'Solo los super administradores pueden acceder a esta sección.',
                confirmButtonText: 'Volver'
            }).then(() => {
                window.location.href = '/admin-dashboard.html';
            });
            return;
        }
        
        console.log('✅ Usuario autenticado:', usuarioActual.nombre, 'Rol:', usuarioActual.rol);
        
    } catch (error) {
        console.error('❌ Error de autenticación:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin-login.html';
    }
}

/**
 * Cargar información del usuario en el sidebar
 */
function cargarInformacionUsuario() {
    if (usuarioActual) {
        document.querySelector('[data-user="name"]').textContent = usuarioActual.nombre || usuarioActual.email;
        document.querySelector('[data-user="role"]').textContent = usuarioActual.rol.toUpperCase();
        document.querySelector('[data-user="complex"]').textContent = usuarioActual.complejo_nombre || 'Todos los complejos';
        document.getElementById('adminName').textContent = usuarioActual.nombre || usuarioActual.email;
    }
}

/**
 * Aplicar permisos según el rol del usuario
 */
function aplicarPermisosPorRol() {
    if (!usuarioActual) return;
    
    const elementosManager = document.querySelectorAll('.hide-for-manager');
    const elementosOwner = document.querySelectorAll('.hide-for-owner');
    const elementosSuperAdmin = document.querySelectorAll('.hide-for-super-admin');
    
    if (usuarioActual.rol === 'manager') {
        elementosManager.forEach(el => el.style.display = 'none');
    } else if (usuarioActual.rol === 'owner') {
        elementosOwner.forEach(el => el.style.display = 'none');
    } else if (usuarioActual.rol === 'super_admin') {
        elementosSuperAdmin.forEach(el => el.style.display = 'none');
    }
}

/**
 * Función helper para hacer peticiones autenticadas
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
        console.error('❌ No hay token de autenticación');
        window.location.href = '/admin-login.html';
        throw new Error('No hay token de autenticación');
    }
    
    console.log('🔑 Token encontrado:', token.substring(0, 50) + '...');
    
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
    
    console.log('📡 Haciendo petición a:', url);
    console.log('📡 Headers:', defaultHeaders);
    
    try {
        const response = await fetch(url, fetchOptions);
        
        console.log('📡 Respuesta recibida:', response.status, response.statusText);
        
        // Si es 401 (no autorizado), redirigir al login
        if (response.status === 401) {
            console.error('❌ Token inválido o expirado');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin-login.html';
            throw new Error('Token inválido o expirado');
        }
        
        // Si es 403 (forbidden), mostrar error específico
        if (response.status === 403) {
            const errorData = await response.json();
            console.error('❌ Acceso denegado:', errorData);
            throw new Error(`Acceso denegado: ${errorData.error || 'Permisos insuficientes'}`);
        }
        
        return response;
    } catch (error) {
        console.error('❌ Error en petición autenticada:', error);
        throw error;
    }
}

/**
 * Cargar lista de complejos para filtros
 */
async function cargarComplejos() {
    try {
        console.log('🏢 Cargando complejos...');
        
        const response = await authenticatedFetch('/api/admin/complejos-simple', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            complejosData = data.complejos || [];
            
            console.log(`✅ ${complejosData.length} complejos cargados`);
            
            const selectComplejo = document.getElementById('filtroComplejo');
            selectComplejo.innerHTML = '<option value="">Todos los complejos</option>';
            
            complejosData.forEach(complejo => {
                const option = document.createElement('option');
                option.value = complejo.id;
                option.textContent = complejo.nombre;
                selectComplejo.appendChild(option);
            });
        } else {
            console.error('❌ Error cargando complejos:', response.status);
        }
    } catch (error) {
        console.error('❌ Error cargando complejos:', error);
    }
}

/**
 * Cargar depósitos desde la API
 */
async function cargarDepositos() {
    try {
        console.log('💰 Cargando depósitos...');
        document.getElementById('loadingDepositos').style.display = 'block';
        document.getElementById('listaDepositos').innerHTML = '';
        
        const response = await authenticatedFetch('/api/admin/depositos', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            depositosData = data.depositos || [];
            console.log(`✅ ${depositosData.length} depósitos cargados`);
            mostrarDepositos(depositosData);
            actualizarEstadisticas();
        } else {
            console.error('❌ Error cargando depósitos:', response.status);
            throw new Error('Error cargando depósitos');
        }
        
    } catch (error) {
        console.error('❌ Error cargando depósitos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los depósitos. Inténtalo de nuevo.',
            confirmButtonText: 'OK'
        });
    } finally {
        document.getElementById('loadingDepositos').style.display = 'none';
    }
}

/**
 * Mostrar depósitos en la interfaz
 */
function mostrarDepositos(depositos) {
    const container = document.getElementById('listaDepositos');
    
    if (depositos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay depósitos</h5>
                <p class="text-muted">No se encontraron depósitos con los filtros aplicados.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = depositos.map(deposito => `
        <div class="deposito-item">
            <div class="deposito-header">
                <div>
                    <div class="deposito-complejo">${deposito.complejo_nombre}</div>
                    <div class="deposito-fecha">
                        <i class="fas fa-calendar me-1"></i>
                        ${new Date(deposito.fecha_deposito).toLocaleDateString('es-CL')}
                    </div>
                </div>
                <div>
                    <span class="badge badge-${deposito.estado}">${deposito.estado.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="deposito-montos">
                <div class="monto-item">
                    <div class="monto-label">Total Reservas</div>
                    <div class="monto-valor">$${deposito.monto_total_reservas.toLocaleString()}</div>
                </div>
                <div class="monto-item">
                    <div class="monto-label">Comisión (${(deposito.comision_porcentaje * 100).toFixed(2)}%)</div>
                    <div class="monto-valor monto-comision">$${deposito.comision_total.toLocaleString()}</div>
                </div>
                <div class="monto-item">
                    <div class="monto-label">A Depositar</div>
                    <div class="monto-valor monto-deposito">$${deposito.monto_a_depositar.toLocaleString()}</div>
                </div>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
                <div class="text-muted small">
                    <i class="fas fa-info-circle me-1"></i>
                    Comisión sin IVA: $${deposito.comision_sin_iva.toLocaleString()} | 
                    IVA: $${deposito.iva_comision.toLocaleString()}
                </div>
                <div>
                    ${deposito.estado === 'pendiente' ? `
                        <button class="btn btn-success btn-sm" onclick="marcarComoPagado(${deposito.id})">
                            <i class="fas fa-check me-1"></i>Marcar como Pagado
                        </button>
                    ` : `
                        <div class="text-muted small">
                            ${deposito.metodo_pago ? `Pagado por ${deposito.metodo_pago}` : ''}
                            ${deposito.fecha_procesado ? `el ${new Date(deposito.fecha_procesado).toLocaleDateString('es-CL')}` : ''}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Actualizar estadísticas en las tarjetas
 */
function actualizarEstadisticas() {
    const pendientes = depositosData.filter(d => d.estado === 'pendiente');
    const pagados = depositosData.filter(d => d.estado === 'pagado');
    
    const totalPendiente = pendientes.reduce((sum, d) => sum + d.monto_a_depositar, 0);
    const totalComision = depositosData.reduce((sum, d) => sum + d.comision_total, 0);
    
    document.getElementById('totalPendientes').textContent = pendientes.length;
    document.getElementById('totalPagados').textContent = pagados.length;
    document.getElementById('montoTotalPendiente').textContent = `$${totalPendiente.toLocaleString()}`;
    document.getElementById('comisionTotal').textContent = `$${totalComision.toLocaleString()}`;
}

/**
 * Aplicar filtros a los depósitos
 */
function aplicarFiltros() {
    const complejoId = document.getElementById('filtroComplejo').value;
    const estado = document.getElementById('filtroEstado').value;
    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;
    
    let depositosFiltrados = [...depositosData];
    
    if (complejoId) {
        depositosFiltrados = depositosFiltrados.filter(d => d.complejo_id == complejoId);
    }
    
    if (estado) {
        depositosFiltrados = depositosFiltrados.filter(d => d.estado === estado);
    }
    
    if (fechaDesde) {
        depositosFiltrados = depositosFiltrados.filter(d => d.fecha_deposito >= fechaDesde);
    }
    
    if (fechaHasta) {
        depositosFiltrados = depositosFiltrados.filter(d => d.fecha_deposito <= fechaHasta);
    }
    
    mostrarDepositos(depositosFiltrados);
}

/**
 * Limpiar filtros
 */
function limpiarFiltros() {
    document.getElementById('filtroComplejo').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    
    mostrarDepositos(depositosData);
}

/**
 * Generar depósitos para el día actual
 */
async function generarDepositosHoy() {
    try {
        const result = await Swal.fire({
            title: 'Generar Depósitos',
            text: '¿Deseas generar los depósitos para el día de hoy?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, generar',
            cancelButtonText: 'Cancelar'
        });
        
        if (result.isConfirmed) {
            const response = await fetch('/api/admin/depositos/generar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    fecha: new Date().toISOString().split('T')[0]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                Swal.fire({
                    icon: 'success',
                    title: 'Depósitos Generados',
                    text: `Se generaron ${data.depositosGenerados} depósitos para el día de hoy.`,
                    confirmButtonText: 'OK'
                });
                cargarDepositos(); // Recargar la lista
            } else {
                throw new Error('Error generando depósitos');
            }
        }
        
    } catch (error) {
        console.error('Error generando depósitos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron generar los depósitos. Inténtalo de nuevo.',
            confirmButtonText: 'OK'
        });
    }
}

/**
 * Marcar depósito como pagado
 */
function marcarComoPagado(depositoId) {
    const deposito = depositosData.find(d => d.id === depositoId);
    if (!deposito) return;
    
    // Llenar el modal con los datos del depósito
    document.getElementById('depositoId').value = depositoId;
    document.getElementById('modalComplejo').value = deposito.complejo_nombre;
    document.getElementById('modalFecha').value = new Date(deposito.fecha_deposito).toLocaleDateString('es-CL');
    document.getElementById('modalMonto').value = `$${deposito.monto_a_depositar.toLocaleString()}`;
    
    // Limpiar campos del formulario
    document.getElementById('modalMetodoPago').value = '';
    document.getElementById('modalNumeroTransaccion').value = '';
    document.getElementById('modalBancoDestino').value = '';
    document.getElementById('modalObservaciones').value = '';
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalPagar'));
    modal.show();
}

/**
 * Confirmar pago del depósito
 */
async function confirmarPago() {
    try {
        const depositoId = document.getElementById('depositoId').value;
        const metodoPago = document.getElementById('modalMetodoPago').value;
        const numeroTransaccion = document.getElementById('modalNumeroTransaccion').value;
        const bancoDestino = document.getElementById('modalBancoDestino').value;
        const observaciones = document.getElementById('modalObservaciones').value;
        
        if (!metodoPago) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Debes seleccionar un método de pago.',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        const response = await fetch(`/api/admin/depositos/${depositoId}/pagar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                metodo_pago: metodoPago,
                numero_transaccion: numeroTransaccion,
                banco_destino: bancoDestino,
                observaciones: observaciones
            })
        });
        
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Pago Confirmado',
                text: 'El depósito ha sido marcado como pagado exitosamente.',
                confirmButtonText: 'OK'
            });
            
            // Cerrar modal y recargar datos
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalPagar'));
            modal.hide();
            cargarDepositos();
        } else {
            throw new Error('Error confirmando pago');
        }
        
    } catch (error) {
        console.error('Error confirmando pago:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo confirmar el pago. Inténtalo de nuevo.',
            confirmButtonText: 'OK'
        });
    }
}

/**
 * Exportar depósitos a Excel
 */
async function exportarDepositos() {
    try {
        const response = await fetch('/api/admin/depositos/exportar', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `depositos_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Error exportando depósitos');
        }
        
    } catch (error) {
        console.error('Error exportando depósitos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron exportar los depósitos. Inténtalo de nuevo.',
            confirmButtonText: 'OK'
        });
    }
}

/**
 * Actualizar hora actual
 */
function actualizarHora() {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const fecha = ahora.toLocaleDateString('es-CL');
    
    document.getElementById('currentTime').textContent = `${fecha} - ${hora}`;
    
    // Actualizar cada minuto
    setTimeout(actualizarHora, 60000);
}

/**
 * Cerrar sesión
 */
function logout() {
    Swal.fire({
        title: 'Cerrar Sesión',
        text: '¿Estás seguro de que deseas cerrar sesión?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Limpiar localStorage
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin-login.html';
        }
    });
}

// ===== UTILIDADES PARA SISTEMA DE ROLES =====

// API Base URL - Dinámico para desarrollo y producción
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://reserva-tu-cancha.onrender.com/api';

// ===== FUNCIONES DE AUTENTICACIÓN =====

/**
 * Obtiene el token del usuario autenticado
 */
function getAuthToken() {
    return localStorage.getItem('adminToken');
}

/**
 * Obtiene la información del usuario autenticado
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Verifica si el usuario está autenticado
 */
function isAuthenticated() {
    return !!getAuthToken();
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

/**
 * Verifica si el usuario tiene un rol específico
 */
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.rol === role;
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
function hasAnyRole(roles) {
    const user = getCurrentUser();
    return user && roles.includes(user.rol);
}

/**
 * Obtiene el rol del usuario actual
 */
function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.rol : null;
}

/**
 * Obtiene el nombre del complejo del usuario actual
 */
function getCurrentUserComplex() {
    const user = getCurrentUser();
    return user ? user.complejo_nombre : null;
}

// ===== FUNCIONES DE PERMISOS =====

/**
 * Verifica si el usuario puede ver ingresos
 */
function canViewIncome() {
    return hasAnyRole(['super_admin', 'owner']);
}

/**
 * Verifica si el usuario puede ver ocupación
 */
function canViewOccupancy() {
    return hasAnyRole(['super_admin', 'owner']);
}

/**
 * Verifica si el usuario puede ver reportes
 */
function canViewReports() {
    return hasAnyRole(['super_admin', 'owner']);
}

/**
 * Verifica si el usuario puede ver todos los complejos
 */
function canViewAllComplexes() {
    return hasRole('super_admin');
}

/**
 * Verifica si el usuario puede gestionar reservas
 */
function canManageReservations() {
    return hasAnyRole(['super_admin', 'owner', 'manager']);
}

// ===== FUNCIONES DE UI =====

/**
 * Oculta elementos según el rol del usuario
 */
function hideElementsByRole() {
    const user = getCurrentUser();
    if (!user) return;

    // Ocultar ingresos para managers
    if (!canViewIncome()) {
        const incomeElements = document.querySelectorAll('[data-role="income"]');
        incomeElements.forEach(el => el.style.display = 'none');
    }

    // Ocultar ocupación para managers
    if (!canViewOccupancy()) {
        const occupancyElements = document.querySelectorAll('[data-role="occupancy"]');
        occupancyElements.forEach(el => el.style.display = 'none');
    }

    // Ocultar reportes para managers
    if (!canViewReports()) {
        const reportsElements = document.querySelectorAll('[data-role="reports"]');
        reportsElements.forEach(el => el.style.display = 'none');
    }

    // Ocultar filtro de complejo para dueños y managers (solo ven su complejo)
    if (!canViewAllComplexes()) {
        const complexFilterElements = document.querySelectorAll('[data-role="complex-filter"]');
        complexFilterElements.forEach(el => el.style.display = 'none');
    }
}

/**
 * Actualiza la información del usuario en la UI
 */
function updateUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    // Actualizar nombre del usuario
    const userNameElements = document.querySelectorAll('[data-user="name"]');
    userNameElements.forEach(el => el.textContent = user.nombre);

    // Actualizar rol del usuario
    const userRoleElements = document.querySelectorAll('[data-user="role"]');
    userRoleElements.forEach(el => {
        const roleText = getRoleDisplayName(user.rol);
        el.textContent = roleText;
    });

    // Actualizar complejo del usuario
    const userComplexElements = document.querySelectorAll('[data-user="complex"]');
    userComplexElements.forEach(el => {
        el.textContent = user.complejo_nombre || 'Todos los complejos';
    });
}

/**
 * Obtiene el nombre de display para un rol
 */
function getRoleDisplayName(role) {
    const roleNames = {
        'super_admin': 'Super Administrador',
        'owner': 'Dueño de Complejo',
        'manager': 'Administrador de Complejo'
    };
    return roleNames[role] || role;
}

/**
 * Configura los headers de autenticación para las peticiones
 */
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Realiza una petición autenticada
 */
async function authenticatedFetch(url, options = {}) {
    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };

    // Construir URL completa
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    // Si la respuesta es 401 o 403, redirigir al login
    if (response.status === 401 || response.status === 403) {
        logout();
        return null;
    }

    return response;
}

// ===== FUNCIONES DE INICIALIZACIÓN =====

/**
 * Inicializa el sistema de roles en la página
 */
function initializeRoleSystem() {
    // Verificar autenticación
    if (!isAuthenticated()) {
        window.location.href = 'admin-login.html';
        return false;
    }

    // Actualizar información del usuario
    updateUserInfo();

    // Ocultar elementos según el rol
    hideElementsByRole();

    return true;
}

/**
 * Configura el evento de logout
 */
function setupLogout() {
    const logoutButtons = document.querySelectorAll('[data-action="logout"]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logout);
    });
}

// ===== EXPORTAR FUNCIONES PARA USO GLOBAL =====
window.AdminUtils = {
    getAuthToken,
    getCurrentUser,
    isAuthenticated,
    logout,
    hasRole,
    hasAnyRole,
    getCurrentUserRole,
    getCurrentUserComplex,
    canViewIncome,
    canViewOccupancy,
    canViewReports,
    canViewAllComplexes,
    canManageReservations,
    hideElementsByRole,
    updateUserInfo,
    getRoleDisplayName,
    getAuthHeaders,
    authenticatedFetch,
    initializeRoleSystem,
    setupLogout
};

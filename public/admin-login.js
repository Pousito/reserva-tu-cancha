// Usar la variable API_BASE global definida en url-config.js
// No definir aquí para evitar conflictos

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ADMIN LOGIN INICIALIZADO ===');
    
    // Verificar si ya está logueado
    if (localStorage.getItem('adminToken')) {
        window.location.href = 'admin-dashboard.html';
        return;
    }
    
    configurarEventListeners();
});

function configurarEventListeners() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        mostrarNotificacion('Por favor completa todos los campos', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        console.log('🔍 DEBUG - Respuesta del servidor:', result);
        console.log('🔍 DEBUG - result.user:', result.user);
        console.log('🔍 DEBUG - result.user.complejo_id:', result.user?.complejo_id, 'tipo:', typeof result.user?.complejo_id);
        
        if (response.ok) {
            // Guardar token en localStorage
            localStorage.setItem('adminToken', result.token);
            localStorage.setItem('adminUser', JSON.stringify(result.user));
            
            console.log('💾 DEBUG - Guardado en localStorage:');
            console.log('   Token:', localStorage.getItem('adminToken')?.substring(0, 50) + '...');
            console.log('   User:', localStorage.getItem('adminUser'));
            
            mostrarNotificacion('¡Bienvenido al panel de administración!', 'success');
            
            // Redirigir al dashboard después de un breve delay
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
        } else {
            mostrarNotificacion(result.error || 'Credenciales inválidas', 'danger');
        }
    } catch (error) {
        console.error('Error en login:', error);
        mostrarNotificacion('Error de conexión. Intenta nuevamente.', 'danger');
    }
}

function mostrarNotificacion(mensaje, tipo) {
    // Remover notificaciones existentes
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

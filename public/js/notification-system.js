// Sistema de Notificaciones en Tiempo Real para Dashboard
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 50;
        this.autoHideDelay = 5000; // 5 segundos
        this.init();
    }

    init() {
        this.createNotificationContainer();
        this.createNotificationPanel();
        this.setupEventListeners();
        this.initializeNotificationState();
        this.startAutoRefresh();
    }

    initializeNotificationState() {
        // Inicializar el estado de notificaciones para evitar spam
        const now = new Date().toISOString();
        
        // Si es la primera vez, establecer el estado inicial
        if (!localStorage.getItem('notificationSystemInitialized')) {
            localStorage.setItem('lastReservationId', '');
            localStorage.setItem('lastReservationTimestamp', now);
            localStorage.setItem('lastLowAvailabilityAlerts', JSON.stringify([]));
            localStorage.setItem('notificationSystemInitialized', 'true');
        }
    }

    createNotificationContainer() {
        // Crear contenedor de notificaciones toast
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    createNotificationPanel() {
        // Crear panel de notificaciones en el sidebar
        const sidebar = document.querySelector('.sidebar .nav');
        if (sidebar) {
            const notificationHTML = `
                <div class="notification-panel mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">
                            <i class="fas fa-bell me-2"></i>Notificaciones
                        </h6>
                        <span class="badge bg-primary" id="notificationCount">0</span>
                    </div>
                    <div class="notification-list" id="notificationList">
                        <div class="text-center text-muted small">
                            <i class="fas fa-bell-slash"></i><br>
                            No hay notificaciones
                        </div>
                    </div>
                </div>
            `;
            sidebar.insertAdjacentHTML('beforeend', notificationHTML);
        }
    }

    setupEventListeners() {
        // Escuchar eventos de notificaciones
        document.addEventListener('newReservation', (e) => {
            this.notifyNewReservation(e.detail);
        });

        document.addEventListener('reservationCancelled', (e) => {
            this.notifyReservationCancelled(e.detail);
        });

        document.addEventListener('lowAvailability', (e) => {
            this.notifyLowAvailability(e.detail);
        });

        document.addEventListener('systemAlert', (e) => {
            this.notifySystemAlert(e.detail);
        });
    }

    startAutoRefresh() {
        // Simular notificaciones automáticas cada 30 segundos
        setInterval(() => {
            this.checkForNotifications();
        }, 30000);
    }

    async checkForNotifications() {
        try {
            // Verificar nuevas reservas
            await this.checkNewReservations();
            
            // Verificar disponibilidad baja
            await this.checkLowAvailability();
            
            // Verificar alertas del sistema
            await this.checkSystemAlerts();
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    async checkNewReservations() {
        try {
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reservas-recientes`);
            if (response && response.ok) {
                const reservas = await response.json();
                const ultimaReserva = reservas[0];
                
                if (ultimaReserva) {
                    const lastReservationId = localStorage.getItem('lastReservationId');
                    const lastReservationTimestamp = localStorage.getItem('lastReservationTimestamp');
                    
                    // Solo notificar si es una reserva realmente nueva
                    if (!lastReservationId || ultimaReserva.id !== lastReservationId) {
                        // Verificar que la reserva sea reciente (últimos 5 minutos)
                        const reservaDate = new Date(ultimaReserva.fecha_creacion || ultimaReserva.fecha);
                        const now = new Date();
                        const timeDiff = now - reservaDate;
                        
                        if (timeDiff < 5 * 60 * 1000) { // 5 minutos en milisegundos
                            this.notifyNewReservation(ultimaReserva);
                            localStorage.setItem('lastReservationId', ultimaReserva.id);
                            localStorage.setItem('lastReservationTimestamp', now.toISOString());
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking new reservations:', error);
        }
    }

    async checkLowAvailability() {
        try {
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/disponibilidad-baja`);
            if (response && response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    // Solo notificar si hay alertas nuevas
                    const lastAlerts = JSON.parse(localStorage.getItem('lastLowAvailabilityAlerts') || '[]');
                    const currentAlerts = data.map(item => `${item.complejo}-${item.fecha}-${item.hora}`);
                    
                    // Encontrar alertas nuevas
                    const newAlerts = currentAlerts.filter(alert => !lastAlerts.includes(alert));
                    
                    if (newAlerts.length > 0) {
                        // Notificar solo las alertas nuevas
                        data.forEach(item => {
                            const alertKey = `${item.complejo}-${item.fecha}-${item.hora}`;
                            if (newAlerts.includes(alertKey)) {
                                this.notifyLowAvailability(item);
                            }
                        });
                        
                        // Actualizar las alertas conocidas
                        localStorage.setItem('lastLowAvailabilityAlerts', JSON.stringify(currentAlerts));
                    }
                }
            }
        } catch (error) {
            console.error('Error checking low availability:', error);
        }
    }

    async checkSystemAlerts() {
        // Verificar alertas del sistema solo si hay problemas reales
        // Por ahora, no generamos alertas automáticas del sistema
        // Esto se puede expandir en el futuro para verificar:
        // - Estado de la base de datos
        // - Estado del servicio de email
        // - Uso de memoria/CPU
        // - Errores en logs
    }

    shouldShowAlert(alert) {
        const lastAlert = localStorage.getItem(`lastAlert_${alert.type}_${alert.message}`);
        const now = new Date().getTime();
        const lastTime = lastAlert ? new Date(lastAlert).getTime() : 0;
        
        // Mostrar alerta solo si han pasado más de 5 minutos
        return (now - lastTime) > 300000;
    }

    // Métodos de notificación específicos
    notifyNewReservation(reservation) {
        const notification = {
            id: Date.now(),
            type: 'success',
            title: 'Nueva Reserva',
            message: `${reservation.nombre_cliente || 'Cliente'} reservó en ${reservation.complejo_nombre || 'Complejo'}`,
            data: reservation,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-calendar-plus'
        };

        this.addNotification(notification);
        this.showToast(notification);
    }

    notifyReservationCancelled(reservation) {
        const notification = {
            id: Date.now(),
            type: 'warning',
            title: 'Reserva Cancelada',
            message: `${reservation.nombre_cliente || 'Cliente'} canceló su reserva`,
            data: reservation,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-calendar-times'
        };

        this.addNotification(notification);
        this.showToast(notification);
    }

    notifyLowAvailability(data) {
        const notification = {
            id: Date.now(),
            type: 'warning',
            title: 'Poca Disponibilidad',
            message: `Solo quedan ${data.disponibles} canchas disponibles en ${data.complejo} a las ${data.hora}`,
            data: data,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-exclamation-triangle'
        };

        this.addNotification(notification);
        this.showToast(notification);
    }

    notifySystemAlert(alert) {
        const notification = {
            id: Date.now(),
            type: alert.type || 'info',
            title: 'Alerta del Sistema',
            message: alert.message,
            data: alert,
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-info-circle'
        };

        this.addNotification(notification);
        this.showToast(notification);
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        
        // Limitar número de notificaciones
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }

        this.updateNotificationPanel();
        this.updateNotificationCount();
    }

    showToast(notification) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastId = `toast-${notification.id}`;
        const toastHTML = `
            <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${notification.type} text-white">
                    <i class="${notification.icon} me-2"></i>
                    <strong class="me-auto">${notification.title}</strong>
                    <small class="text-white">${this.formatTime(notification.timestamp)}</small>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${notification.message}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="notificationSystem.markAsRead(${notification.id})">
                            Marcar como leída
                        </button>
                    </div>
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHTML);

        // Mostrar toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: this.autoHideDelay
        });
        toast.show();

        // Remover del DOM después de ocultarse
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    updateNotificationPanel() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="text-center text-muted small">
                    <i class="fas fa-bell-slash"></i><br>
                    No hay notificaciones
                </div>
            `;
            return;
        }

        const html = this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                 onclick="notificationSystem.markAsRead(${notification.id})">
                <div class="d-flex align-items-start">
                    <div class="notification-icon me-2">
                        <i class="${notification.icon} text-${notification.type}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message small">${notification.message}</div>
                        <div class="notification-time small text-muted">
                            ${this.formatTime(notification.timestamp)}
                        </div>
                    </div>
                    ${!notification.read ? '<div class="notification-dot"></div>' : ''}
                </div>
            </div>
        `).join('');

        notificationList.innerHTML = html;
    }

    updateNotificationCount() {
        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            const unreadCount = this.notifications.filter(n => !n.read).length;
            countElement.textContent = unreadCount;
            countElement.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.updateNotificationPanel();
            this.updateNotificationCount();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });
        this.updateNotificationPanel();
        this.updateNotificationCount();
    }

    clearAllNotifications() {
        this.notifications = [];
        this.updateNotificationPanel();
        this.updateNotificationCount();
    }

    formatTime(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;

        if (diff < 60000) { // Menos de 1 minuto
            return 'Hace un momento';
        } else if (diff < 3600000) { // Menos de 1 hora
            const minutes = Math.floor(diff / 60000);
            return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else if (diff < 86400000) { // Menos de 1 día
            const hours = Math.floor(diff / 3600000);
            return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else {
            return time.toLocaleDateString('es-CL');
        }
    }

    // Método para simular notificaciones (para testing)
    simulateNotification(type = 'success') {
        const messages = {
            success: 'Nueva reserva realizada exitosamente',
            warning: 'Poca disponibilidad en el complejo principal',
            info: 'Sistema actualizado correctamente',
            error: 'Error en el sistema de pagos'
        };

        const notification = {
            id: Date.now(),
            type: type,
            title: 'Notificación de Prueba',
            message: messages[type],
            data: { test: true },
            timestamp: new Date(),
            read: false,
            icon: 'fas fa-bell'
        };

        this.addNotification(notification);
        this.showToast(notification);
    }
}

// Inicializar sistema de notificaciones
let notificationSystem;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof AdminUtils !== 'undefined') {
        notificationSystem = new NotificationSystem();
        
        // Agregar botón de prueba en el dashboard (solo para desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const testButton = document.createElement('button');
            testButton.className = 'btn btn-sm btn-outline-secondary position-fixed';
            testButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 9999;';
            testButton.innerHTML = '<i class="fas fa-bell"></i> Test';
            testButton.onclick = () => {
                const types = ['success', 'warning', 'info', 'error'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                notificationSystem.simulateNotification(randomType);
            };
            document.body.appendChild(testButton);
        }
    }
});

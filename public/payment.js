// Simulador de WebPay para procesamiento de pagos
window.webPaySimulator = {
    // Procesar pago (simulación)
    async processPayment(paymentData) {
        // Simular delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simular éxito del pago
        return {
            success: true,
            transactionId: 'WEBPAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            amount: paymentData.precio_total,
            status: 'approved',
            timestamp: new Date().toISOString()
        };
    },

    // Generar ticket de pago
    generatePaymentTicket(paymentResult, paymentData) {
        const ticket = `
=== TICKET DE PAGO WEBPAY ===
Fecha: ${new Date().toLocaleDateString('es-CL')}
Hora: ${new Date().toLocaleTimeString('es-CL')}

ID Transacción: ${paymentResult.transactionId}
Estado: ${paymentResult.status === 'approved' ? 'APROBADO' : 'RECHAZADO'}

=== CÓDIGO DE RESERVA ===
Código: ${paymentData.codigo_reserva || 'PENDIENTE'}
⚠️  IMPORTANTE: Guarda este código para consultar tu reserva

=== DETALLES DE LA RESERVA ===
Complejo: ${paymentData.complejo}
Cancha: ${paymentData.cancha}
Fecha: ${paymentData.fecha}
Hora: ${paymentData.hora_inicio} - ${paymentData.hora_fin}

=== DATOS DEL CLIENTE ===
Nombre: ${paymentData.nombre_cliente}
RUT: ${paymentData.rut_cliente}
Email: ${paymentData.email_cliente}

=== MONTO ===
Total: $${paymentData.precio_total.toLocaleString()}

=== INSTRUCCIONES ===
1. Guarda este ticket como comprobante de pago
2. Presenta el código de reserva al llegar al complejo
3. Para consultas, usa el código de reserva en "Mis Reservas"
4. El código de reserva es tu identificación principal

¡Gracias por tu reserva!
        `;
        
        return ticket;
    },

    // Descargar ticket
    downloadTicket(ticket, paymentData) {
        const blob = new Blob([ticket], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket_${paymentData.fecha}_${paymentData.hora_inicio.replace(':', '')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}



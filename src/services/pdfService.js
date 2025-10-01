const { jsPDF } = require('jspdf');

/**
 * Servicio para generar comprobantes de reserva en PDF
 */
class PDFService {
    
    /**
     * Genera un PDF moderno con los datos de la reserva
     * @param {Object} reservaData - Datos de la reserva
     * @returns {Buffer} - Buffer del PDF generado
     */
    static generateReservationReceipt(reservaData) {
        try {
            // Crear nuevo documento PDF
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Configuración de colores (hex a RGB)
            const primaryColor = [44, 62, 80];    // #2c3e50
            const secondaryColor = [52, 152, 219]; // #3498db
            const accentColor = [39, 174, 96];     // #27ae60
            const lightGray = [236, 240, 241];     // #ecf0f1
            const textColor = [44, 62, 80];        // #2c3e50
            
            // Variables para posicionamiento
            let y = 15;
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            
            // Header con fondo
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 25, 'F');
            
            // Título principal
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Reserva Tu Cancha', margin, 17);
            
            // Subtítulo
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Comprobante de Reserva', margin, 23);
            
            y = 40;
            
            // Código de reserva destacado
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
            doc.rect(margin, y - 3, contentWidth, 12, 'F');
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Código de Reserva: ${reservaData.codigo_reserva}`, margin + 5, y + 5);
            
            y += 20;
            
            // Sección de información del cliente
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('INFORMACION DEL CLIENTE', margin, y);
            
            y += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nombre: ${reservaData.nombre_cliente}`, margin, y);
            y += 5;
            doc.text(`Email: ${reservaData.email_cliente}`, margin, y);
            y += 5;
            doc.text(`Teléfono: ${reservaData.telefono_cliente}`, margin, y);
            
            y += 15;
            
            // Sección de detalles de la reserva
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('DETALLES DE LA RESERVA', margin, y);
            
            y += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Complejo: ${reservaData.complejo_nombre || 'Complejo Deportivo'}`, margin, y);
            y += 5;
            doc.text(`Cancha: ${reservaData.cancha_nombre || 'Cancha'}`, margin, y);
            y += 5;
            
            // Formatear fecha
            const fechaFormateada = this.formatDate(reservaData.fecha);
            doc.text(`Fecha: ${fechaFormateada}`, margin, y);
            y += 5;
            
            // Formatear horario
            const horarioFormateado = this.formatTimeRange(reservaData.hora_inicio, reservaData.hora_fin);
            doc.text(`Horario: ${horarioFormateado}`, margin, y);
            
            y += 15;
            
            // Sección de precio destacada
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(margin, y - 3, contentWidth, 12, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            
            // Precio formateado
            const precioFormateado = this.formatPrice(reservaData.precio_total);
            doc.text(`Total Pagado: ${precioFormateado}`, margin + 5, y + 5);
            
            y += 20;
            
            // Resetear color de texto
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
            
            // Sección de estado
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('ESTADO: CONFIRMADA', margin, y);
            
            y += 20;
            
            // Información adicional
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(127, 140, 141); // #7f8c8d
            
            const fechaActual = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
            const horaActual = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago' });
            
            doc.text(`Comprobante generado el: ${fechaActual} a las ${horaActual}`, margin, y);
            doc.text('Este comprobante es válido como confirmación de su reserva.', margin, y + 4);
            
            y += 15;
            
            // Footer
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.line(margin, y, pageWidth - margin, y);
            
            y += 8;
            
            doc.setFontSize(8);
            doc.setTextColor(149, 165, 166); // #95a5a6
            doc.text('Reserva Tu Cancha - Sistema de Reservas Deportivas', margin, y);
            doc.text('www.reservatuscanchas.cl', margin, y + 3);
            doc.text('Soporte: soporte@reservatuscanchas.cl', margin, y + 6);
            
            // Convertir a buffer
            const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
            
            console.log('📄 PDF generado exitosamente para reserva:', reservaData.codigo_reserva);
            return pdfBuffer;
            
        } catch (error) {
            console.error('❌ Error generando PDF:', error.message);
            throw error;
        }
    }
    
    /**
     * Formatea la fecha para mostrar en el PDF
     * @param {string} fecha - Fecha en formato ISO o string
     * @returns {string} - Fecha formateada
     */
    static formatDate(fecha) {
        try {
            let fechaStr = fecha;
            
            // Si tiene timestamp, extraer solo la fecha
            if (typeof fecha === 'string' && fecha.includes('T')) {
                fechaStr = fecha.split('T')[0];
            }
            
            // Si es formato YYYY-MM-DD, agregar mediodía para evitar desfase
            if (typeof fechaStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
                const date = new Date(fechaStr + 'T12:00:00');
                return date.toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'America/Santiago'
                });
            }
            
            const date = new Date(fechaStr);
            return date.toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'America/Santiago'
            });
        } catch (error) {
            return fecha;
        }
    }
    
    /**
     * Formatea el precio para mostrar en el PDF
     * @param {number} precio - Precio numérico
     * @returns {string} - Precio formateado con símbolo de peso
     */
    static formatPrice(precio) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(precio);
    }
    
    /**
     * Formatea el rango de horarios para mostrar en el PDF
     * @param {string} horaInicio - Hora de inicio
     * @param {string} horaFin - Hora de fin
     * @returns {string} - Rango de horarios formateado
     */
    static formatTimeRange(horaInicio, horaFin) {
        try {
            // Limpiar formato de horas (remover segundos si existen)
            const inicio = horaInicio.includes(':') ? horaInicio.substring(0, 5) : horaInicio;
            const fin = horaFin.includes(':') ? horaFin.substring(0, 5) : horaFin;
            return `${inicio} - ${fin}`;
        } catch (error) {
            return `${horaInicio} - ${horaFin}`;
        }
    }
}

module.exports = PDFService;

const { jsPDF } = require('jspdf');

// Crear PDF para Instagram con mockups de dispositivos
function generarImagenInstagram() {
    try {
        const doc = new jsPDF('landscape', 'mm', [210, 148]);

        // Fondo de césped deportivo (verde sólido)
        doc.setFillColor(74, 124, 89); // Verde medio
        doc.rect(0, 0, 210, 148, 'F');

        // Título principal
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas.cl', 105, 20, { align: 'center' });

        // Subtítulo
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text('Sistema de Reservas Deportivas', 105, 28, { align: 'center' });

        // Mockup iPhone (izquierda) - Versión móvil
        const iphoneX = 25;
        const iphoneY = 45;
        const iphoneWidth = 60;
        const iphoneHeight = 90;

        // Cuerpo del iPhone
        doc.setFillColor(26, 26, 26);
        doc.roundedRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 8, 8, 'F');

        // Pantalla del iPhone
        doc.setFillColor(0, 0, 0);
        doc.roundedRect(iphoneX + 3, iphoneY + 8, iphoneWidth - 6, iphoneHeight - 16, 5, 5, 'F');

        // Contenido de la pantalla móvil
        doc.setFillColor(107, 70, 193); // Morado
        doc.rect(iphoneX + 5, iphoneY + 10, iphoneWidth - 10, 15, 'F');

        // Logo móvil
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 12, iphoneY + 17, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas', iphoneX + 20, iphoneY + 19);

        // Contenido principal móvil
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Reserva tu cancha', iphoneX + 10, iphoneY + 35);
        doc.text('deportiva de forma', iphoneX + 10, iphoneY + 42);
        doc.text('rapida y facil', iphoneX + 10, iphoneY + 49);

        // Botón móvil
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(iphoneX + 8, iphoneY + 55, iphoneWidth - 16, 8, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text('RESERVAR AHORA', iphoneX + 30, iphoneY + 60, { align: 'center' });

        // Mockup MacBook (derecha) - Versión web
        const macbookX = 125;
        const macbookY = 40;
        const macbookWidth = 70;
        const macbookHeight = 45;

        // Base del MacBook
        doc.setFillColor(209, 213, 219);
        doc.roundedRect(macbookX, macbookY + 35, macbookWidth, 8, 2, 2, 'F');

        // Pantalla del MacBook
        doc.setFillColor(31, 41, 55);
        doc.roundedRect(macbookX + 2, macbookY, macbookWidth - 4, macbookHeight, 3, 3, 'F');

        // Sidebar del admin
        doc.setFillColor(76, 29, 149); // Morado oscuro
        doc.rect(macbookX + 4, macbookY + 2, 18, macbookHeight - 4, 'F');

        // Contenido principal del admin
        doc.setFillColor(255, 255, 255);
        doc.rect(macbookX + 22, macbookY + 2, macbookWidth - 26, macbookHeight - 4, 'F');

        // Elementos del admin panel
        doc.setFontSize(6);
        doc.setTextColor(255, 255, 255);
        doc.text('Admin Panel', macbookX + 8, macbookY + 8);

        doc.setFontSize(5);
        doc.text('Administrador', macbookX + 8, macbookY + 15);
        doc.text('Borde Rio', macbookX + 8, macbookY + 19);

        // Navegación
        doc.text('Dashboard', macbookX + 8, macbookY + 28);
        doc.text('Reservas', macbookX + 8, macbookY + 32);
        doc.text('Canchas', macbookX + 8, macbookY + 36);

        // Contenido principal
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.text('Gestion de Reservas', macbookX + 25, macbookY + 8);

        // Calendario simplificado
        doc.setFontSize(5);
        doc.text('Calendario Semanal', macbookX + 25, macbookY + 15);
        
        // Grid del calendario
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        for (let i = 0; i < 5; i++) {
            doc.line(macbookX + 25 + i * 8, macbookY + 20, macbookX + 25 + i * 8, macbookY + 35);
        }
        for (let i = 0; i < 4; i++) {
            doc.line(macbookX + 25, macbookY + 20 + i * 4, macbookX + 57, macbookY + 20 + i * 4);
        }

        // Celdas del calendario
        doc.setFillColor(220, 252, 231); // Verde claro
        doc.rect(macbookX + 33, macbookY + 24, 8, 4, 'F');
        doc.rect(macbookX + 41, macbookY + 24, 8, 4, 'F');
        doc.rect(macbookX + 49, macbookY + 24, 8, 4, 'F');

        // Botón Nueva Reserva
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(macbookX + 45, macbookY + 38, 12, 4, 1, 1, 'F');
        doc.setFontSize(4);
        doc.setTextColor(255, 255, 255);
        doc.text('+ Nueva Reserva', macbookX + 51, macbookY + 40, { align: 'center' });

        // Etiquetas de dispositivos
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('VERSION MOVIL', 55, 140);
        doc.text('VERSION WEB', 160, 140);

        // Línea divisoria sutil
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(105, 35, 105, 130);

        // Footer con información
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Disponible en todas las plataformas', 105, 135, { align: 'center' });

        // Guardar el archivo
        const filename = 'Instagram_ReservaTusCanchas_Mockup.pdf';
        doc.save(filename);
        console.log(`✅ Imagen de Instagram generada: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error generando imagen:', error.message);
    }
}

// Ejecutar la función
generarImagenInstagram();

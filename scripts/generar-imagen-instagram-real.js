const { jsPDF } = require('jspdf');

// Crear PDF para Instagram usando las capturas reales del usuario
function generarImagenInstagram() {
    try {
        const doc = new jsPDF('landscape', 'mm', [210, 148]);

        // Fondo degradado sofisticado
        doc.setFillColor(26, 56, 33);
        doc.rect(0, 0, 210, 148, 'F');
        
        doc.setFillColor(45, 95, 58);
        doc.rect(0, 0, 210, 100, 'F');
        
        doc.setFillColor(64, 124, 89);
        doc.rect(0, 0, 210, 60, 'F');

        // Textura de césped sutil
        doc.setDrawColor(30, 70, 40);
        doc.setLineWidth(0.1);
        for (let i = 0; i < 210; i += 4) {
            for (let j = 0; j < 148; j += 3) {
                if (Math.random() > 0.8) {
                    doc.line(i, j, i + 1, j + 1);
                }
            }
        }

        // Título principal
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas.cl', 105, 18, { align: 'center' });

        // Subtítulo
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 255, 220);
        doc.text('Sistema de Reservas Deportivas', 105, 25, { align: 'center' });

        // Mockup iPhone con captura REAL (izquierda)
        const iphoneX = 15;
        const iphoneY = 40;
        const iphoneWidth = 70;
        const iphoneHeight = 105;

        // Sombra del iPhone
        doc.setFillColor(0, 0, 0, 0.3);
        doc.ellipse(iphoneX + 20, iphoneY + 105, 30, 10, 'F');

        // Cuerpo del iPhone
        doc.setFillColor(20, 20, 20);
        doc.roundedRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 12, 12, 'F');

        // Pantalla del iPhone (negro)
        doc.setFillColor(0, 0, 0);
        doc.roundedRect(iphoneX + 4, iphoneY + 15, iphoneWidth - 8, iphoneHeight - 25, 8, 8, 'F');

        // CAPTURA REAL MÓVIL - Header azul
        doc.setFillColor(59, 130, 246); // Azul exacto del header
        doc.rect(iphoneX + 6, iphoneY + 17, iphoneWidth - 12, 20, 'F');

        // Logo de pelota de fútbol (blanco)
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 15, iphoneY + 26, 5, 'F');
        
        // Patrón hexagonal en la pelota
        doc.setFillColor(240, 240, 240);
        doc.circle(iphoneX + 15, iphoneY + 26, 3.5, 'F');
        doc.setFillColor(220, 220, 220);
        doc.circle(iphoneX + 15, iphoneY + 26, 2.5, 'F');

        // Texto "ReservaTusCanchas" en header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas', iphoneX + 25, iphoneY + 29);

        // Hamburger menu (3 líneas)
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.line(iphoneX + 55, iphoneY + 24, iphoneX + 61, iphoneY + 24);
        doc.line(iphoneX + 55, iphoneY + 27, iphoneX + 61, iphoneY + 27);
        doc.line(iphoneX + 55, iphoneY + 30, iphoneX + 61, iphoneY + 30);

        // CAPTURA REAL MÓVIL - Contenido principal con gradiente morado
        // Gradiente morado (simulado con múltiples rectángulos)
        doc.setFillColor(107, 70, 193); // Morado base
        doc.rect(iphoneX + 6, iphoneY + 37, iphoneWidth - 12, 60, 'F');
        
        doc.setFillColor(124, 85, 210); // Morado medio
        doc.rect(iphoneX + 6, iphoneY + 37, iphoneWidth - 12, 30, 'F');
        
        doc.setFillColor(139, 92, 246); // Morado claro
        doc.rect(iphoneX + 6, iphoneY + 37, iphoneWidth - 12, 15, 'F');

        // Título principal móvil
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Reserva tu cancha', iphoneX + 10, iphoneY + 55);
        doc.text('deportiva de forma', iphoneX + 10, iphoneY + 65);
        doc.text('rapida y facil', iphoneX + 10, iphoneY + 75);

        // Texto descriptivo
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        doc.text('Encuentra y reserva canchas', iphoneX + 10, iphoneY + 85);
        doc.text('de padel y futbol en tu', iphoneX + 10, iphoneY + 92);
        doc.text('ciudad. Sin llamadas, sin', iphoneX + 10, iphoneY + 99);
        doc.text('esperas, todo online.', iphoneX + 10, iphoneY + 106);

        // Botón "RESERVAR AHORA"
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(iphoneX + 8, iphoneY + 110, iphoneWidth - 16, 12, 6, 6, 'F');
        
        // Icono de calendario en el botón
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(iphoneX + 12, iphoneY + 113, 6, 6, 1, 1, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 15, iphoneY + 116, 1, 'F');
        
        // Texto del botón
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('RESERVAR AHORA', iphoneX + 25, iphoneY + 118);

        // Logo grande desvanecido en el fondo
        doc.setFillColor(255, 255, 255, 0.1);
        doc.circle(iphoneX + 35, iphoneY + 90, 15, 'F');

        // Botón de chat flotante
        doc.setFillColor(59, 130, 246);
        doc.circle(iphoneX + 55, iphoneY + 125, 6, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 55, iphoneY + 125, 4, 'F');
        // Icono de chat (3 puntos)
        doc.setFillColor(59, 130, 246);
        doc.circle(iphoneX + 53.5, iphoneY + 124, 0.5, 'F');
        doc.circle(iphoneX + 55, iphoneY + 124, 0.5, 'F');
        doc.circle(iphoneX + 56.5, iphoneY + 124, 0.5, 'F');

        // Mockup MacBook con captura REAL (derecha)
        const macbookX = 115;
        const macbookY = 30;
        const macbookWidth = 80;
        const macbookHeight = 55;

        // Sombra del MacBook
        doc.setFillColor(0, 0, 0, 0.4);
        doc.ellipse(macbookX + 25, macbookY + 60, 35, 15, 'F');

        // Base del MacBook
        doc.setFillColor(180, 180, 180);
        doc.roundedRect(macbookX, macbookY + 45, macbookWidth, 12, 3, 3, 'F');

        // Pantalla del MacBook
        doc.setFillColor(25, 25, 25);
        doc.roundedRect(macbookX + 3, macbookY, macbookWidth - 6, macbookHeight, 4, 4, 'F');

        // CAPTURA REAL WEB - Sidebar morado con gradiente
        doc.setFillColor(76, 29, 149); // Morado oscuro
        doc.rect(macbookX + 6, macbookY + 3, 22, macbookHeight - 6, 'F');
        
        // Gradiente en el sidebar
        doc.setFillColor(91, 33, 182);
        doc.rect(macbookX + 6, macbookY + 3, 22, 12, 'F');

        // Header "Admin Panel"
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Admin Panel', macbookX + 10, macbookY + 10);

        // Usuario "Administrador Borde Rio"
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Administrador Borde Rio', macbookX + 10, macbookY + 16);
        doc.text('Dueño de Complejo', macbookX + 10, macbookY + 20);
        doc.text('Espacio Deportivo Borde Río', macbookX + 10, macbookY + 24);

        // Navegación del sidebar
        doc.setFontSize(5);
        doc.text('Dashboard', macbookX + 10, macbookY + 32);
        doc.text('Reservas', macbookX + 10, macbookY + 36);
        doc.text('Canchas', macbookX + 10, macbookY + 40);
        doc.text('Reportes', macbookX + 10, macbookY + 44);
        doc.text('Control Financiero', macbookX + 10, macbookY + 48);
        doc.text('Sitio Principal', macbookX + 10, macbookY + 52);

        // CAPTURA REAL WEB - Contenido principal
        doc.setFillColor(255, 255, 255);
        doc.rect(macbookX + 28, macbookY + 3, macbookWidth - 34, macbookHeight - 6, 'F');

        // Header "Gestión de Reservas"
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Gestión de Reservas', macbookX + 32, macbookY + 10);

        // Saludo "Bienvenido, Administrador Borde Rio"
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Bienvenido, Administrador Borde Rio', macbookX + 32, macbookY + 16);

        // Sección de búsqueda
        doc.setFontSize(6);
        doc.text('Búsqueda Rápida', macbookX + 32, macbookY + 22);
        
        // Campo de búsqueda
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(macbookX + 32, macbookY + 25, 35, 4, 'S');
        doc.setFontSize(4);
        doc.setTextColor(150, 150, 150);
        doc.text('Ej: ABC123 o Juan Pérez', macbookX + 33, macbookY + 27);

        // Botones de vista
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(macbookX + 32, macbookY + 32, 8, 4, 1, 1, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(macbookX + 32, macbookY + 32, 8, 4, 1, 1, 'S');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(4);
        doc.text('Lista', macbookX + 36, macbookY + 34, { align: 'center' });
        
        doc.setFillColor(59, 130, 246);
        doc.roundedRect(macbookX + 42, macbookY + 32, 10, 4, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('Calendario', macbookX + 47, macbookY + 34, { align: 'center' });

        // Botón "Nueva Reserva"
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(macbookX + 55, macbookY + 32, 12, 4, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('+ Nueva Reserva', macbookX + 61, macbookY + 34, { align: 'center' });

        // Título del calendario
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text('Calendario Semanal Espacio Deportivo Borde Río', macbookX + 32, macbookY + 40);

        // Navegación de fechas
        doc.setFontSize(4);
        doc.text('13 de octubre de 2025 - 19 de octubre de 2025', macbookX + 32, macbookY + 44);

        // Leyenda del calendario
        doc.setFillColor(34, 197, 94); // Verde
        doc.rect(macbookX + 32, macbookY + 47, 3, 1, 'F');
        doc.text('Todas disponibles', macbookX + 36, macbookY + 48);
        
        doc.setFillColor(251, 191, 36); // Amarillo
        doc.rect(macbookX + 45, macbookY + 47, 3, 1, 'F');
        doc.text('Parcialmente ocupado', macbookX + 49, macbookY + 48);
        
        doc.setFillColor(239, 68, 68); // Rojo
        doc.rect(macbookX + 62, macbookY + 47, 3, 1, 'F');
        doc.text('Todas ocupadas', macbookX + 66, macbookY + 48);

        // Grid del calendario simplificado
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        // Columnas
        for (let i = 0; i < 8; i++) {
            doc.line(macbookX + 32 + i * 6, macbookY + 50, macbookX + 32 + i * 6, macbookY + 52);
        }
        // Filas
        for (let i = 0; i < 4; i++) {
            doc.line(macbookX + 32, macbookY + 50 + i * 1, macbookX + 74, macbookY + 50 + i * 1);
        }

        // Etiquetas de dispositivos
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('VERSIÓN MÓVIL', 50, 145);
        doc.text('VERSIÓN WEB', 160, 145);

        // Línea divisoria
        doc.setDrawColor(255, 255, 255, 0.6);
        doc.setLineWidth(1);
        doc.line(105, 35, 105, 130);

        // Footer
        doc.setFillColor(0, 0, 0, 0.2);
        doc.rect(0, 140, 210, 8, 'F');
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text('Disponible en todas las plataformas', 105, 147, { align: 'center' });

        // Guardar el archivo
        const filename = 'Instagram_ReservaTusCanchas_Real.pdf';
        doc.save(filename);
        console.log(`✅ Imagen de Instagram con capturas reales generada: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error generando imagen:', error.message);
    }
}

// Ejecutar la función
generarImagenInstagram();

const { jsPDF } = require('jspdf');

// Crear PDF para Instagram con diseño avanzado y profesional
function generarImagenInstagram() {
    try {
        const doc = new jsPDF('landscape', 'mm', [210, 148]);

        // Fondo degradado sofisticado (simulado con múltiples capas)
        // Capa base verde oscuro
        doc.setFillColor(26, 56, 33);
        doc.rect(0, 0, 210, 148, 'F');
        
        // Capa intermedia verde medio
        doc.setFillColor(45, 95, 58);
        doc.rect(0, 0, 210, 100, 'F');
        
        // Capa superior verde claro
        doc.setFillColor(64, 124, 89);
        doc.rect(0, 0, 210, 60, 'F');

        // Agregar textura de césped más realista
        doc.setDrawColor(30, 70, 40);
        doc.setLineWidth(0.2);
        for (let i = 0; i < 210; i += 3) {
            for (let j = 0; j < 148; j += 4) {
                if (Math.random() > 0.7) {
                    doc.line(i + Math.random() * 2, j, i + Math.random() * 2, j + 2);
                }
            }
        }

        // Efectos de luz y sombra en el fondo
        doc.setFillColor(255, 255, 255, 0.1);
        doc.circle(50, 30, 40, 'F');
        doc.circle(160, 120, 35, 'F');

        // Título principal con efecto de sombra
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        
        // Sombra del título
        doc.setTextColor(0, 0, 0, 0.3);
        doc.text('ReservaTusCanchas.cl', 106, 21, { align: 'center' });
        
        // Título principal
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas.cl', 105, 20, { align: 'center' });

        // Subtítulo con efecto
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 255, 220);
        doc.text('Sistema de Reservas Deportivas', 105, 28, { align: 'center' });

        // Línea decorativa bajo el título
        doc.setDrawColor(255, 255, 255, 0.8);
        doc.setLineWidth(1);
        doc.line(60, 32, 150, 32);

        // Mockup iPhone avanzado (izquierda)
        const iphoneX = 20;
        const iphoneY = 50;
        const iphoneWidth = 65;
        const iphoneHeight = 95;

        // Sombra del iPhone
        doc.setFillColor(0, 0, 0, 0.3);
        doc.ellipse(iphoneX + 15, iphoneY + 95, 25, 8, 'F');

        // Cuerpo del iPhone con gradiente simulado
        doc.setFillColor(20, 20, 20);
        doc.roundedRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 10, 10, 'F');
        
        // Borde brillante del iPhone
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.5);
        doc.roundedRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 10, 10, 'S');

        // Pantalla del iPhone
        doc.setFillColor(0, 0, 0);
        doc.roundedRect(iphoneX + 4, iphoneY + 12, iphoneWidth - 8, iphoneHeight - 20, 6, 6, 'F');

        // Contenido de la pantalla móvil con gradiente
        doc.setFillColor(107, 70, 193); // Morado base
        doc.rect(iphoneX + 6, iphoneY + 14, iphoneWidth - 12, 18, 'F');
        
        // Efecto de gradiente en el header
        doc.setFillColor(140, 100, 220);
        doc.rect(iphoneX + 6, iphoneY + 14, iphoneWidth - 12, 9, 'F');

        // Logo móvil con efecto 3D
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 15, iphoneY + 22, 4, 'F');
        
        // Sombra del logo
        doc.setFillColor(200, 200, 200);
        doc.circle(iphoneX + 14.5, iphoneY + 21.5, 4, 'F');
        
        // Logo principal
        doc.setFillColor(255, 255, 255);
        doc.circle(iphoneX + 15, iphoneY + 22, 4, 'F');
        
        // Texto del logo
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text('ReservaTusCanchas', iphoneX + 23, iphoneY + 24);

        // Contenido principal móvil con efectos
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Reserva tu cancha', iphoneX + 8, iphoneY + 40);
        doc.text('deportiva de forma', iphoneX + 8, iphoneY + 48);
        doc.text('rapida y facil', iphoneX + 8, iphoneY + 56);

        // Botón móvil con efecto 3D
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(iphoneX + 8, iphoneY + 65, iphoneWidth - 16, 12, 6, 6, 'F');
        
        // Sombra del botón
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(iphoneX + 7.5, iphoneY + 64.5, iphoneWidth - 16, 12, 6, 6, 'F');
        
        // Botón principal
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(iphoneX + 8, iphoneY + 65, iphoneWidth - 16, 12, 6, 6, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.text('RESERVAR AHORA', iphoneX + 32, iphoneY + 73, { align: 'center' });

        // Mockup MacBook avanzado (derecha)
        const macbookX = 120;
        const macbookY = 35;
        const macbookWidth = 75;
        const macbookHeight = 50;

        // Sombra del MacBook
        doc.setFillColor(0, 0, 0, 0.4);
        doc.ellipse(macbookX + 20, macbookY + 55, 30, 12, 'F');

        // Base del MacBook con gradiente
        doc.setFillColor(180, 180, 180);
        doc.roundedRect(macbookX, macbookY + 40, macbookWidth, 10, 3, 3, 'F');
        
        // Sombra de la base
        doc.setFillColor(120, 120, 120);
        doc.roundedRect(macbookX - 1, macbookY + 39, macbookWidth + 2, 10, 3, 3, 'F');
        
        // Base principal
        doc.setFillColor(200, 200, 200);
        doc.roundedRect(macbookX, macbookY + 40, macbookWidth, 10, 3, 3, 'F');

        // Pantalla del MacBook
        doc.setFillColor(25, 25, 25);
        doc.roundedRect(macbookX + 3, macbookY, macbookWidth - 6, macbookHeight, 4, 4, 'F');

        // Sidebar del admin con gradiente
        doc.setFillColor(76, 29, 149); // Morado base
        doc.rect(macbookX + 6, macbookY + 3, 20, macbookHeight - 6, 'F');
        
        // Efecto de gradiente en sidebar
        doc.setFillColor(100, 50, 180);
        doc.rect(macbookX + 6, macbookY + 3, 20, 10, 'F');

        // Contenido principal del admin
        doc.setFillColor(248, 250, 252);
        doc.rect(macbookX + 26, macbookY + 3, macbookWidth - 32, macbookHeight - 6, 'F');

        // Elementos del admin panel con efectos
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Admin Panel', macbookX + 10, macbookY + 10);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Administrador', macbookX + 10, macbookY + 18);
        doc.text('Borde Rio', macbookX + 10, macbookY + 22);

        // Navegación con iconos simulados
        doc.setFillColor(255, 255, 255, 0.2);
        doc.rect(macbookX + 8, macbookY + 28, 16, 3, 'F');
        doc.text('Dashboard', macbookX + 10, macbookY + 30);
        
        doc.setFillColor(255, 255, 255, 0.4);
        doc.rect(macbookX + 8, macbookY + 33, 16, 3, 'F');
        doc.text('Reservas', macbookX + 10, macbookY + 35);
        
        doc.text('Canchas', macbookX + 10, macbookY + 40);

        // Contenido principal con header
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Gestion de Reservas', macbookX + 30, macbookY + 10);

        // Calendario avanzado
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('Calendario Semanal', macbookX + 30, macbookY + 18);
        
        // Grid del calendario con bordes
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        for (let i = 0; i < 6; i++) {
            doc.line(macbookX + 30 + i * 7, macbookY + 22, macbookX + 30 + i * 7, macbookY + 38);
        }
        for (let i = 0; i < 4; i++) {
            doc.line(macbookX + 30, macbookY + 22 + i * 4, macbookX + 72, macbookY + 22 + i * 4);
        }

        // Celdas del calendario con gradientes
        doc.setFillColor(220, 252, 231); // Verde claro
        doc.rect(macbookX + 37, macbookY + 26, 7, 4, 'F');
        doc.rect(macbookX + 44, macbookY + 26, 7, 4, 'F');
        doc.rect(macbookX + 51, macbookY + 26, 7, 4, 'F');
        
        // Celdas ocupadas
        doc.setFillColor(254, 226, 226); // Rojo claro
        doc.rect(macbookX + 58, macbookY + 26, 7, 4, 'F');

        // Botón Nueva Reserva con efecto 3D
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(macbookX + 50, macbookY + 42, 15, 6, 2, 2, 'F');
        
        // Sombra del botón
        doc.setFillColor(5, 150, 105);
        doc.roundedRect(macbookX + 49.5, macbookY + 41.5, 15, 6, 2, 2, 'F');
        
        // Botón principal
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(macbookX + 50, macbookY + 42, 15, 6, 2, 2, 'F');
        
        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.text('+ Nueva Reserva', macbookX + 57, macbookY + 45, { align: 'center' });

        // Etiquetas de dispositivos con efectos
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        
        // Sombra de las etiquetas
        doc.setTextColor(0, 0, 0, 0.3);
        doc.text('VERSION MOVIL', 52, 146);
        doc.text('VERSION WEB', 157, 146);
        
        // Etiquetas principales
        doc.setTextColor(255, 255, 255);
        doc.text('VERSION MOVIL', 51, 145);
        doc.text('VERSION WEB', 156, 145);

        // Línea divisoria con efecto
        doc.setDrawColor(255, 255, 255, 0.6);
        doc.setLineWidth(1);
        doc.line(105, 40, 105, 125);
        
        // Puntos decorativos en la línea
        doc.setFillColor(255, 255, 255, 0.8);
        doc.circle(105, 60, 2, 'F');
        doc.circle(105, 80, 2, 'F');
        doc.circle(105, 100, 2, 'F');

        // Footer con efecto de degradado
        doc.setFillColor(0, 0, 0, 0.2);
        doc.rect(0, 140, 210, 8, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text('Disponible en todas las plataformas', 105, 147, { align: 'center' });

        // Efectos de partículas decorativas
        doc.setFillColor(255, 255, 255, 0.3);
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 210;
            const y = Math.random() * 148;
            const size = Math.random() * 2 + 0.5;
            doc.circle(x, y, size, 'F');
        }

        // Guardar el archivo
        const filename = 'Instagram_ReservaTusCanchas_Avanzado.pdf';
        doc.save(filename);
        console.log(`✅ Imagen de Instagram avanzada generada: ${filename}`);
        
    } catch (error) {
        console.error('❌ Error generando imagen:', error.message);
    }
}

// Ejecutar la función
generarImagenInstagram();

const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');

// Crear imagen para Instagram con Canvas (mejor calidad)
async function generarImagenInstagram() {
    try {
        // Crear canvas de 1080x1080 (formato Instagram cuadrado)
        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext('2d');

        // Fondo degradado verde (césped deportivo)
        const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
        gradient.addColorStop(0, '#2d5a27');
        gradient.addColorStop(0.5, '#4a7c59');
        gradient.addColorStop(1, '#6b8e6b');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);

        // Agregar textura de césped
        ctx.fillStyle = 'rgba(30, 70, 40, 0.1)';
        for (let i = 0; i < 1080; i += 4) {
            for (let j = 0; j < 1080; j += 3) {
                if (Math.random() > 0.8) {
                    ctx.fillRect(i + Math.random() * 2, j, 1, 2);
                }
            }
        }

        // Título principal
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ReservaTusCanchas.cl', 540, 80);

        // Subtítulo
        ctx.font = '28px Arial';
        ctx.fillStyle = '#e0ffe0';
        ctx.fillText('Sistema de Reservas Deportivas', 540, 120);

        // Mockup iPhone (izquierda) - MÁS PEQUEÑO
        const iphoneX = 80;
        const iphoneY = 200;
        const iphoneWidth = 280;
        const iphoneHeight = 560;

        // Sombra del iPhone
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(iphoneX + 140, iphoneY + 560, 120, 40, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Cuerpo del iPhone
        ctx.fillStyle = '#1a1a1a';
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 40);
        ctx.fill();

        // Borde brillante
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 3;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 40);
        ctx.stroke();

        // Pantalla del iPhone
        ctx.fillStyle = '#000000';
        ctx.roundRect(iphoneX + 15, iphoneY + 50, iphoneWidth - 30, iphoneHeight - 80, 20);
        ctx.fill();

        // Header azul (captura real)
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(iphoneX + 20, iphoneY + 60, iphoneWidth - 40, 80);

        // Logo pelota de fútbol
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(iphoneX + 60, iphoneY + 100, 20, 0, 2 * Math.PI);
        ctx.fill();

        // Patrón de la pelota
        ctx.fillStyle = '#f0f0f0';
        ctx.beginPath();
        ctx.arc(iphoneX + 60, iphoneY + 100, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Texto del header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('ReservaTusCanchas', iphoneX + 90, iphoneY + 105);

        // Hamburger menu
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(iphoneX + 220, iphoneY + 85);
        ctx.lineTo(iphoneX + 240, iphoneY + 85);
        ctx.moveTo(iphoneX + 220, iphoneY + 100);
        ctx.lineTo(iphoneX + 240, iphoneY + 100);
        ctx.moveTo(iphoneX + 220, iphoneY + 115);
        ctx.lineTo(iphoneX + 240, iphoneY + 115);
        ctx.stroke();

        // Contenido principal (fondo morado)
        const purpleGradient = ctx.createLinearGradient(iphoneX + 20, iphoneY + 140, iphoneX + 20, iphoneY + 500);
        purpleGradient.addColorStop(0, '#8b5cf6');
        purpleGradient.addColorStop(0.5, '#7c3aed');
        purpleGradient.addColorStop(1, '#6b46c1');
        
        ctx.fillStyle = purpleGradient;
        ctx.fillRect(iphoneX + 20, iphoneY + 140, iphoneWidth - 40, 360);

        // Título principal
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Reserva tu cancha', iphoneX + 40, iphoneY + 200);
        ctx.fillText('deportiva de forma', iphoneX + 40, iphoneY + 240);
        ctx.fillText('rapida y facil', iphoneX + 40, iphoneY + 280);

        // Descripción
        ctx.font = '20px Arial';
        ctx.fillStyle = '#f0f0f0';
        ctx.fillText('Encuentra y reserva canchas', iphoneX + 40, iphoneY + 330);
        ctx.fillText('de padel y futbol en tu', iphoneX + 40, iphoneY + 360);
        ctx.fillText('ciudad. Sin llamadas, sin', iphoneX + 40, iphoneY + 390);
        ctx.fillText('esperas, todo online.', iphoneX + 40, iphoneY + 420);

        // Botón RESERVAR AHORA
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(iphoneX + 40, iphoneY + 450, iphoneWidth - 80, 50, 25);
        ctx.fill();

        // Icono del botón
        ctx.fillStyle = '#3b82f6';
        ctx.roundRect(iphoneX + 60, iphoneY + 465, 30, 20, 5);
        ctx.fill();

        // Texto del botón
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RESERVAR AHORA', iphoneX + 140, iphoneY + 480);

        // Logo grande desvanecido
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(iphoneX + 140, iphoneY + 350, 60, 0, 2 * Math.PI);
        ctx.fill();

        // Mockup MacBook (derecha) - MÁS GRANDE
        const macbookX = 580;
        const macbookY = 150;
        const macbookWidth = 420;
        const macbookHeight = 280;

        // Sombra del MacBook
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(macbookX + 150, macbookY + 280, 180, 60, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Base del MacBook
        ctx.fillStyle = '#b4b4b4';
        ctx.roundRect(macbookX, macbookY + 220, macbookWidth, 40, 15);
        ctx.fill();

        // Pantalla del MacBook
        ctx.fillStyle = '#191919';
        ctx.roundRect(macbookX + 15, macbookY, macbookWidth - 30, macbookHeight, 20);
        ctx.fill();

        // Sidebar morado (captura real)
        const sidebarGradient = ctx.createLinearGradient(macbookX + 25, macbookY + 15, macbookX + 25, macbookY + 265);
        sidebarGradient.addColorStop(0, '#5b21b6');
        sidebarGradient.addColorStop(1, '#4c1d95');
        
        ctx.fillStyle = sidebarGradient;
        ctx.fillRect(macbookX + 25, macbookY + 15, 100, macbookHeight - 30);

        // Header del sidebar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Admin Panel', macbookX + 35, macbookY + 35);

        // Usuario
        ctx.font = '12px Arial';
        ctx.fillText('Administrador Borde Rio', macbookX + 35, macbookY + 55);
        ctx.fillText('Dueño de Complejo', macbookX + 35, macbookY + 75);
        ctx.fillText('Espacio Deportivo Borde Río', macbookX + 35, macbookY + 95);

        // Navegación
        ctx.font = '10px Arial';
        ctx.fillText('Dashboard', macbookX + 35, macbookY + 125);
        ctx.fillText('Reservas', macbookX + 35, macbookY + 145);
        ctx.fillText('Canchas', macbookX + 35, macbookY + 165);
        ctx.fillText('Reportes', macbookX + 35, macbookY + 185);
        ctx.fillText('Control Financiero', macbookX + 35, macbookY + 205);
        ctx.fillText('Sitio Principal', macbookX + 35, macbookY + 225);

        // Contenido principal
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(macbookX + 125, macbookY + 15, macbookWidth - 140, macbookHeight - 30);

        // Header del contenido
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Gestión de Reservas', macbookX + 135, macbookY + 40);

        // Saludo
        ctx.font = '14px Arial';
        ctx.fillText('Bienvenido, Administrador Borde Rio', macbookX + 135, macbookY + 65);

        // Búsqueda
        ctx.font = '12px Arial';
        ctx.fillText('Búsqueda Rápida', macbookX + 135, macbookY + 90);

        // Campo de búsqueda
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        ctx.strokeRect(macbookX + 135, macbookY + 100, 200, 20);
        ctx.fillStyle = '#969696';
        ctx.font = '10px Arial';
        ctx.fillText('Ej: ABC123 o Juan Pérez', macbookX + 140, macbookY + 113);

        // Botones de vista
        ctx.fillStyle = '#3b82f6';
        ctx.roundRect(macbookX + 135, macbookY + 130, 60, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Lista', macbookX + 165, macbookY + 143);

        ctx.fillStyle = '#3b82f6';
        ctx.roundRect(macbookX + 205, macbookY + 130, 80, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Calendario', macbookX + 245, macbookY + 143);

        // Botón Nueva Reserva
        ctx.fillStyle = '#10b981';
        ctx.roundRect(macbookX + 295, macbookY + 130, 80, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('+ Nueva Reserva', macbookX + 335, macbookY + 143);

        // Título del calendario
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Calendario Semanal Espacio Deportivo Borde Río', macbookX + 135, macbookY + 170);

        // Fechas
        ctx.font = '10px Arial';
        ctx.fillText('13 de octubre de 2025 - 19 de octubre de 2025', macbookX + 135, macbookY + 190);

        // Leyenda
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(macbookX + 135, macbookY + 200, 10, 5);
        ctx.fillStyle = '#000000';
        ctx.font = '8px Arial';
        ctx.fillText('Todas disponibles', macbookX + 150, macbookY + 205);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(macbookX + 220, macbookY + 200, 10, 5);
        ctx.fillStyle = '#000000';
        ctx.fillText('Parcialmente ocupado', macbookX + 235, macbookY + 205);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(macbookX + 320, macbookY + 200, 10, 5);
        ctx.fillStyle = '#000000';
        ctx.fillText('Todas ocupadas', macbookX + 335, macbookY + 205);

        // Grid del calendario
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        
        // Columnas
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(macbookX + 135 + i * 30, macbookY + 210);
            ctx.lineTo(macbookX + 135 + i * 30, macbookY + 250);
            ctx.stroke();
        }
        
        // Filas
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(macbookX + 135, macbookY + 210 + i * 8);
            ctx.lineTo(macbookX + 375, macbookY + 210 + i * 8);
            ctx.stroke();
        }

        // Celdas del calendario
        ctx.fillStyle = '#dcfce7';
        ctx.fillRect(macbookX + 165, macbookY + 218, 30, 8);
        ctx.fillRect(macbookX + 195, macbookY + 218, 30, 8);
        ctx.fillRect(macbookX + 225, macbookY + 218, 30, 8);
        
        ctx.fillStyle = '#fecaca';
        ctx.fillRect(macbookX + 255, macbookY + 218, 30, 8);

        // Etiquetas de dispositivos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VERSIÓN MÓVIL', 240, 820);
        ctx.fillText('VERSIÓN WEB', 780, 820);

        // Línea divisoria
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(540, 150);
        ctx.lineTo(540, 850);
        ctx.stroke();

        // Footer
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 1000, 1080, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('Disponible en todas las plataformas', 540, 1040);

        // Guardar como PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('Instagram_ReservaTusCanchas_Canvas.png', buffer);
        
        console.log('✅ Imagen de Instagram generada con Canvas: Instagram_ReservaTusCanchas_Canvas.png');
        
    } catch (error) {
        console.error('❌ Error generando imagen:', error.message);
    }
}

// Ejecutar la función
generarImagenInstagram();

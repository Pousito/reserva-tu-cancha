const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function crearMockupConImagenesReales() {
    try {
        console.log('🚀 Creando mockup con imágenes reales...');
        
        // Crear canvas de 1080x1080
        const canvas = createCanvas(1080, 1080);
        const ctx = canvas.getContext('2d');

        // Fondo de cancha de fútbol realista
        const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
        gradient.addColorStop(0, '#4caf50');
        gradient.addColorStop(0.5, '#2e7d32');
        gradient.addColorStop(1, '#1b5e20');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);

        // Líneas de cancha
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        
        // Líneas horizontales
        ctx.beginPath();
        ctx.moveTo(0, 216);
        ctx.lineTo(1080, 216);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 432);
        ctx.lineTo(1080, 432);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 648);
        ctx.lineTo(1080, 648);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 864);
        ctx.lineTo(1080, 864);
        ctx.stroke();

        // Líneas verticales
        ctx.beginPath();
        ctx.moveTo(216, 0);
        ctx.lineTo(216, 1080);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(432, 0);
        ctx.lineTo(432, 1080);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(648, 0);
        ctx.lineTo(648, 1080);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(864, 0);
        ctx.lineTo(864, 1080);
        ctx.stroke();

        // Círculo central
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(540, 540, 100, 0, 2 * Math.PI);
        ctx.stroke();

        // Título principal
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ReservaTusCanchas.cl', 540, 60);

        // Subtítulo
        ctx.font = '20px Arial';
        ctx.fillStyle = '#e8f5e8';
        ctx.fillText('Sistema de Reservas Deportivas', 540, 90);

        // NOTA: Aquí deberías cargar tus imágenes reales
        // Por ahora voy a crear placeholders más realistas

        // iPhone Mockup (izquierda) - MÁS PEQUEÑO
        const iphoneX = 80;
        const iphoneY = 150;
        const iphoneWidth = 200;
        const iphoneHeight = 400;

        // Sombra del iPhone
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(iphoneX + 100, iphoneY + 400, 80, 20, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Cuerpo del iPhone
        ctx.fillStyle = '#1a1a1a';
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 30);
        ctx.fill();

        // Pantalla del iPhone - AQUÍ IRÍA TU CAPTURA REAL
        ctx.fillStyle = '#000000';
        ctx.roundRect(iphoneX + 8, iphoneY + 20, iphoneWidth - 16, iphoneHeight - 35, 20);
        ctx.fill();

        // Placeholder para tu imagen móvil real
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(iphoneX + 12, iphoneY + 24, iphoneWidth - 24, 40);
        
        // Logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(iphoneX + 30, iphoneY + 44, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Texto
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ReservaTusCanchas', iphoneX + 50, iphoneY + 48);

        // Contenido morado (tu captura real)
        const purpleGradient = ctx.createLinearGradient(iphoneX + 12, iphoneY + 64, iphoneX + 12, iphoneY + 360);
        purpleGradient.addColorStop(0, '#8b5cf6');
        purpleGradient.addColorStop(1, '#6b46c1');
        
        ctx.fillStyle = purpleGradient;
        ctx.fillRect(iphoneX + 12, iphoneY + 64, iphoneWidth - 24, 296);

        // Texto de tu captura
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Reserva tu cancha', iphoneX + 20, iphoneY + 120);
        ctx.fillText('deportiva de forma', iphoneX + 20, iphoneY + 150);
        ctx.fillText('rápida y fácil', iphoneX + 20, iphoneY + 180);

        ctx.font = '12px Arial';
        ctx.fillText('Encuentra y reserva canchas', iphoneX + 20, iphoneY + 220);
        ctx.fillText('de padel y fútbol en tu', iphoneX + 20, iphoneY + 240);
        ctx.fillText('ciudad. Sin llamadas, sin', iphoneX + 20, iphoneY + 260);
        ctx.fillText('esperas, todo online.', iphoneX + 20, iphoneY + 280);

        // Botón
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(iphoneX + 20, iphoneY + 320, iphoneWidth - 40, 25, 12);
        ctx.fill();
        
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RESERVAR AHORA', iphoneX + 100, iphoneY + 335);

        // MacBook Mockup (derecha) - MUCHO MÁS GRANDE
        const macbookX = 400;
        const macbookY = 120;
        const macbookWidth = 600;
        const macbookHeight = 400;

        // Sombra del MacBook
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(macbookX + 200, macbookY + 400, 250, 40, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Base del MacBook
        ctx.fillStyle = '#d0d0d0';
        ctx.roundRect(macbookX, macbookY + 350, macbookWidth, 30, 15);
        ctx.fill();

        // Pantalla del MacBook
        ctx.fillStyle = '#191919';
        ctx.roundRect(macbookX + 15, macbookY, macbookWidth - 30, 370, 20);
        ctx.fill();

        // Sidebar morado (tu captura real)
        const sidebarGradient = ctx.createLinearGradient(macbookX + 25, macbookY + 15, macbookX + 25, macbookY + 355);
        sidebarGradient.addColorStop(0, '#5b21b6');
        sidebarGradient.addColorStop(1, '#4c1d95');
        
        ctx.fillStyle = sidebarGradient;
        ctx.fillRect(macbookX + 25, macbookY + 15, 150, 340);

        // Header del sidebar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Admin Panel', macbookX + 35, macbookY + 40);

        // Usuario
        ctx.font = '10px Arial';
        ctx.fillText('Administrador Borde Rio', macbookX + 35, macbookY + 65);
        ctx.fillText('Dueño de Complejo', macbookX + 35, macbookY + 80);
        ctx.fillText('Espacio Deportivo Borde Río', macbookX + 35, macbookY + 95);

        // Navegación
        ctx.font = '9px Arial';
        ctx.fillText('Dashboard', macbookX + 35, macbookY + 125);
        ctx.fillText('Reservas', macbookX + 35, macbookY + 145);
        ctx.fillText('Canchas', macbookX + 35, macbookY + 165);
        ctx.fillText('Reportes', macbookX + 35, macbookY + 185);
        ctx.fillText('Control Financiero', macbookX + 35, macbookY + 205);
        ctx.fillText('Sitio Principal', macbookX + 35, macbookY + 225);

        // Contenido principal (tu captura real)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(macbookX + 175, macbookY + 15, 410, 340);

        // Header del contenido
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Gestión de Reservas', macbookX + 185, macbookY + 40);

        // Saludo
        ctx.font = '12px Arial';
        ctx.fillText('Bienvenido, Administrador Borde Rio', macbookX + 185, macbookY + 65);

        // Búsqueda
        ctx.font = '10px Arial';
        ctx.fillText('Búsqueda Rápida', macbookX + 185, macbookY + 90);

        // Campo de búsqueda
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        ctx.strokeRect(macbookX + 185, macbookY + 100, 250, 20);
        
        ctx.fillStyle = '#969696';
        ctx.font = '8px Arial';
        ctx.fillText('Ej: ABC123 o Juan Pérez', macbookX + 190, macbookY + 113);

        // Botones
        ctx.fillStyle = '#3b82f6';
        ctx.roundRect(macbookX + 185, macbookY + 130, 60, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Lista', macbookX + 215, macbookY + 141);

        ctx.fillStyle = '#3b82f6';
        ctx.roundRect(macbookX + 255, macbookY + 130, 70, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Calendario', macbookX + 290, macbookY + 141);

        ctx.fillStyle = '#10b981';
        ctx.roundRect(macbookX + 335, macbookY + 130, 80, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('+ Nueva Reserva', macbookX + 375, macbookY + 141);

        // Título del calendario
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Calendario Semanal Espacio Deportivo Borde Río', macbookX + 185, macbookY + 170);

        // Fechas
        ctx.font = '8px Arial';
        ctx.fillText('13 de octubre de 2025 - 19 de octubre de 2025', macbookX + 185, macbookY + 185);

        // Leyenda
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(macbookX + 185, macbookY + 200, 12, 4);
        ctx.fillStyle = '#000000';
        ctx.font = '7px Arial';
        ctx.fillText('Todas disponibles', macbookX + 205, macbookY + 204);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(macbookX + 280, macbookY + 200, 12, 4);
        ctx.fillStyle = '#000000';
        ctx.fillText('Parcialmente ocupado', macbookX + 300, macbookY + 204);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(macbookX + 420, macbookY + 200, 12, 4);
        ctx.fillStyle = '#000000';
        ctx.fillText('Todas ocupadas', macbookX + 440, macbookY + 204);

        // Grid del calendario más grande
        ctx.strokeStyle = '#c8c8c8';
        ctx.lineWidth = 1;
        
        // Dibujar grid
        for (let i = 0; i <= 8; i++) {
            ctx.beginPath();
            ctx.moveTo(macbookX + 185 + i * 40, macbookY + 220);
            ctx.lineTo(macbookX + 185 + i * 40, macbookY + 340);
            ctx.stroke();
        }
        
        for (let i = 0; i <= 6; i++) {
            ctx.beginPath();
            ctx.moveTo(macbookX + 185, macbookY + 220 + i * 20);
            ctx.lineTo(macbookX + 505, macbookY + 220 + i * 20);
            ctx.stroke();
        }

        // Llenar celdas del calendario
        const cellWidth = 40;
        const cellHeight = 20;
        
        // Headers
        const headers = ['Hora', 'Lun 13', 'Mar 14', 'Mié 15', 'Jue 16', 'Vie 17', 'Sáb 18', 'Dom 19'];
        ctx.fillStyle = '#000000';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        
        for (let i = 0; i < headers.length; i++) {
            ctx.fillText(headers[i], macbookX + 205 + i * 40, macbookY + 232);
        }

        // Horas y estados
        const hours = ['10:00', '12:00', '15:00', '18:00', '20:00'];
        
        for (let row = 0; row < hours.length; row++) {
            // Hora
            ctx.fillStyle = '#000000';
            ctx.fillText(hours[row], macbookX + 205, macbookY + 252 + row * 20);
            
            // Estados de las celdas (basado en tu captura real)
            for (let col = 1; col < 8; col++) {
                let color = '#dcfce7'; // Verde por defecto (disponible)
                
                // Algunas celdas ocupadas según tu captura
                if ((row === 2 && col === 4) || (row === 3 && col === 4) || 
                    (row === 3 && col === 6) || (row === 4 && col === 6) || 
                    (row === 4 && col === 7)) {
                    color = '#fecaca'; // Rojo (ocupado)
                } else if (row === 2 && col === 4) {
                    color = '#fef3c7'; // Amarillo (parcial)
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(macbookX + 185 + col * 40 + 1, macbookY + 220 + (row + 1) * 20 + 1, 38, 18);
            }
        }

        // Etiquetas de dispositivos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VERSIÓN MÓVIL', 180, 620);
        ctx.fillText('VERSIÓN WEB', 700, 620);

        // Footer
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 1000, 1080, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '22px Arial';
        ctx.fillText('Disponible en todas las plataformas', 540, 1040);

        // Guardar imagen
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('Instagram_ReservaTusCanchas_Con_Imagenes_Reales.png', buffer);
        
        console.log('✅ Mockup creado con imágenes reales: Instagram_ReservaTusCanchas_Con_Imagenes_Reales.png');
        
    } catch (error) {
        console.error('❌ Error creando mockup:', error.message);
    }
}

// Ejecutar la función
crearMockupConImagenesReales();

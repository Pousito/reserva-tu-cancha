const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function crearMockupFinal() {
    try {
        console.log('🚀 Creando mockup final con tus imágenes reales...');
        
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

        // Cargar tus imágenes reales
        console.log('📱 Cargando imagen móvil...');
        const imagenMovil = await loadImage(path.join(__dirname, '../tu-imagen-movil.png'));
        
        console.log('💻 Cargando imagen web...');
        const imagenWeb = await loadImage(path.join(__dirname, '../tu-imagen-web.png'));

        // iPhone Mockup (izquierda) - PEQUEÑO
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

        // Pantalla del iPhone con tu imagen real
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(iphoneX + 8, iphoneY + 20, iphoneWidth - 16, iphoneHeight - 35, 20);
        ctx.clip();
        
        // Dibujar tu imagen móvil real
        ctx.drawImage(imagenMovil, iphoneX + 8, iphoneY + 20, iphoneWidth - 16, iphoneHeight - 35);
        ctx.restore();

        // MacBook Mockup (derecha) - MUY GRANDE
        const macbookX = 350;
        const macbookY = 100;
        const macbookWidth = 650;
        const macbookHeight = 450;

        // Sombra del MacBook
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(macbookX + 250, macbookY + 450, 300, 50, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Base del MacBook
        ctx.fillStyle = '#d0d0d0';
        ctx.roundRect(macbookX, macbookY + 410, macbookWidth, 40, 20);
        ctx.fill();

        // Pantalla del MacBook
        ctx.fillStyle = '#191919';
        ctx.roundRect(macbookX + 15, macbookY, macbookWidth - 30, 430, 25);
        ctx.fill();

        // Tu imagen web real en el MacBook
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(macbookX + 25, macbookY + 15, macbookWidth - 50, 400, 20);
        ctx.clip();
        
        // Dibujar tu imagen web real
        ctx.drawImage(imagenWeb, macbookX + 25, macbookY + 15, macbookWidth - 50, 400);
        ctx.restore();

        // Etiquetas de dispositivos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VERSIÓN MÓVIL', 180, 620);
        ctx.fillText('VERSIÓN WEB', 675, 620);

        // Línea divisoria sutil
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(540, 120);
        ctx.lineTo(540, 950);
        ctx.stroke();

        // Footer
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 1000, 1080, 80);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText('Disponible en todas las plataformas', 540, 1040);

        // Guardar imagen final
        const buffer = canvas.toBuffer('image/png');
        const filename = 'Instagram_ReservaTusCanchas_FINAL_CON_IMAGENES_REALES.png';
        fs.writeFileSync(filename, buffer);
        
        console.log(`✅ Mockup final creado: ${filename}`);
        console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('❌ Error creando mockup final:', error.message);
    }
}

// Ejecutar la función
crearMockupFinal();

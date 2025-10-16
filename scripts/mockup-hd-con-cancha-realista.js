const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function crearMockupHD() {
    try {
        console.log('🚀 Creando mockup HD con cancha realista...');
        
        // Crear canvas de 2160x2160 (4K para Instagram HD)
        const canvas = createCanvas(2160, 2160);
        const ctx = canvas.getContext('2d');

        // Crear fondo de cancha de fútbol más realista
        console.log('🏟️ Creando fondo de cancha realista...');
        
        // Gradiente base verde césped
        const grassGradient = ctx.createLinearGradient(0, 0, 0, 2160);
        grassGradient.addColorStop(0, '#4caf50');
        grassGradient.addColorStop(0.3, '#388e3c');
        grassGradient.addColorStop(0.7, '#2e7d32');
        grassGradient.addColorStop(1, '#1b5e20');
        
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, 0, 2160, 2160);

        // Agregar textura de césped con patrones
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        for (let i = 0; i < 2000; i++) {
            const x = Math.random() * 2160;
            const y = Math.random() * 2160;
            const size = Math.random() * 3 + 1;
            ctx.fillRect(x, y, size, size);
        }

        // Líneas de cancha más realistas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // Líneas horizontales principales
        ctx.beginPath();
        ctx.moveTo(0, 432);
        ctx.lineTo(2160, 432);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 864);
        ctx.lineTo(2160, 864);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 1296);
        ctx.lineTo(2160, 1296);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, 1728);
        ctx.lineTo(2160, 1728);
        ctx.stroke();

        // Líneas verticales principales
        ctx.beginPath();
        ctx.moveTo(432, 0);
        ctx.lineTo(432, 2160);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(864, 0);
        ctx.lineTo(864, 2160);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(1296, 0);
        ctx.lineTo(1296, 2160);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(1728, 0);
        ctx.lineTo(1728, 2160);
        ctx.stroke();

        // Círculo central más grande y realista
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(1080, 1080, 200, 0, 2 * Math.PI);
        ctx.stroke();

        // Línea central
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(1080, 0);
        ctx.lineTo(1080, 2160);
        ctx.stroke();

        // Áreas de penal (simplificadas)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 4;
        
        // Área superior
        ctx.strokeRect(864, 200, 432, 200);
        // Área inferior
        ctx.strokeRect(864, 1760, 432, 200);

        // Título principal con mejor tipografía
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillText('ReservaTusCanchas.cl', 1080, 120);

        // Subtítulo
        ctx.font = '40px Arial';
        ctx.fillStyle = '#e8f5e8';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText('Sistema de Reservas Deportivas', 1080, 180);

        // Cargar tus imágenes reales en alta resolución
        console.log('📱 Cargando imagen móvil HD...');
        const imagenMovil = await loadImage(path.join(__dirname, '../tu-imagen-movil.png'));
        
        console.log('💻 Cargando imagen web HD...');
        const imagenWeb = await loadImage(path.join(__dirname, '../tu-imagen-web.png'));

        // iPhone Mockup HD (izquierda) - Más grande para HD
        const iphoneX = 160;
        const iphoneY = 300;
        const iphoneWidth = 400;
        const iphoneHeight = 800;

        // Sombra del iPhone más realista
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        ctx.ellipse(iphoneX + 200, iphoneY + 800, 160, 40, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Cuerpo del iPhone con gradiente
        ctx.shadowColor = 'transparent';
        const phoneGradient = ctx.createLinearGradient(iphoneX, iphoneY, iphoneX, iphoneY + iphoneHeight);
        phoneGradient.addColorStop(0, '#2a2a2a');
        phoneGradient.addColorStop(0.5, '#1a1a1a');
        phoneGradient.addColorStop(1, '#0a0a0a');
        
        ctx.fillStyle = phoneGradient;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 60);
        ctx.fill();

        // Borde brillante del iPhone
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 4;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 60);
        ctx.stroke();

        // Pantalla del iPhone con tu imagen real HD
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(iphoneX + 16, iphoneY + 40, iphoneWidth - 32, iphoneHeight - 70, 40);
        ctx.clip();
        
        // Dibujar tu imagen móvil real en alta resolución
        ctx.drawImage(imagenMovil, iphoneX + 16, iphoneY + 40, iphoneWidth - 32, iphoneHeight - 70);
        ctx.restore();

        // MacBook Mockup HD (derecha) - MUCHO MÁS GRANDE
        const macbookX = 700;
        const macbookY = 200;
        const macbookWidth = 1300;
        const macbookHeight = 900;

        // Sombra del MacBook más dramática
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.ellipse(macbookX + 500, macbookY + 900, 600, 100, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Base del MacBook con gradiente
        ctx.shadowColor = 'transparent';
        const baseGradient = ctx.createLinearGradient(macbookX, macbookY + 820, macbookX, macbookY + 900);
        baseGradient.addColorStop(0, '#e0e0e0');
        baseGradient.addColorStop(1, '#a0a0a0');
        
        ctx.fillStyle = baseGradient;
        ctx.roundRect(macbookX, macbookY + 820, macbookWidth, 80, 40);
        ctx.fill();

        // Pantalla del MacBook
        const screenGradient = ctx.createLinearGradient(macbookX + 30, macbookY, macbookX + 30, macbookY + 860);
        screenGradient.addColorStop(0, '#2a2a2a');
        screenGradient.addColorStop(1, '#1a1a1a');
        
        ctx.fillStyle = screenGradient;
        ctx.roundRect(macbookX + 30, macbookY, macbookWidth - 60, 860, 50);
        ctx.fill();

        // Tu imagen web real en el MacBook HD
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(macbookX + 50, macbookY + 30, macbookWidth - 100, 800, 40);
        ctx.clip();
        
        // Dibujar tu imagen web real en alta resolución
        ctx.drawImage(imagenWeb, macbookX + 50, macbookY + 30, macbookWidth - 100, 800);
        ctx.restore();

        // Etiquetas de dispositivos HD
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VERSIÓN MÓVIL', 360, 1240);
        ctx.fillText('VERSIÓN WEB', 1350, 1240);

        // Línea divisoria más elegante
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(1080, 240);
        ctx.lineTo(1080, 1900);
        ctx.stroke();

        // Footer HD
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 2000, 2160, 160);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText('Disponible en todas las plataformas', 1080, 2080);

        // Guardar imagen HD final
        const buffer = canvas.toBuffer('image/png');
        const filename = 'Instagram_ReservaTusCanchas_HD_FINAL.png';
        fs.writeFileSync(filename, buffer);
        
        console.log(`✅ Mockup HD final creado: ${filename}`);
        console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📐 Resolución: 2160x2160px (4K HD)`);
        
    } catch (error) {
        console.error('❌ Error creando mockup HD:', error.message);
    }
}

// Ejecutar la función
crearMockupHD();

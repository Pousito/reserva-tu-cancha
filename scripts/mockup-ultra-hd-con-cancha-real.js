const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function crearMockupUltraHD() {
    try {
        console.log('🚀 Creando mockup ULTRA HD con cancha real...');
        
        // Crear canvas de 2160x2160 (4K para Instagram HD)
        const canvas = createCanvas(2160, 2160);
        const ctx = canvas.getContext('2d');

        // Cargar imagen real de cancha de fútbol
        console.log('🏟️ Cargando imagen real de cancha de fútbol...');
        const canchaReal = await loadImage(path.join(__dirname, '../cancha-futbol.jpg'));
        
        // Dibujar la cancha real como fondo
        ctx.drawImage(canchaReal, 0, 0, 2160, 2160);

        // Overlay sutil para mejorar el contraste
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, 2160, 2160);

        // Título principal con mejor tipografía y efectos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 6;
        ctx.shadowOffsetY = 6;
        ctx.fillText('ReservaTusCanchas.cl', 1080, 120);

        // Subtítulo
        ctx.font = '40px Arial';
        ctx.fillStyle = '#e8f5e8';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 10;
        ctx.fillText('Sistema de Reservas Deportivas', 1080, 180);

        // Cargar tus imágenes reales en alta resolución
        console.log('📱 Cargando imagen móvil ULTRA HD...');
        const imagenMovil = await loadImage(path.join(__dirname, '../tu-imagen-movil.png'));
        
        console.log('💻 Cargando imagen web ULTRA HD...');
        const imagenWeb = await loadImage(path.join(__dirname, '../tu-imagen-web.png'));

        // iPhone Mockup ULTRA HD (izquierda) - Más grande y detallado
        const iphoneX = 160;
        const iphoneY = 300;
        const iphoneWidth = 400;
        const iphoneHeight = 800;

        // Sombra del iPhone ultra realista
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        ctx.ellipse(iphoneX + 200, iphoneY + 800, 180, 50, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Cuerpo del iPhone con gradiente más realista
        ctx.shadowColor = 'transparent';
        const phoneGradient = ctx.createLinearGradient(iphoneX, iphoneY, iphoneX, iphoneY + iphoneHeight);
        phoneGradient.addColorStop(0, '#2a2a2a');
        phoneGradient.addColorStop(0.3, '#1a1a1a');
        phoneGradient.addColorStop(0.7, '#0a0a0a');
        phoneGradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = phoneGradient;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 60);
        ctx.fill();

        // Borde brillante del iPhone más realista
        ctx.strokeStyle = '#606060';
        ctx.lineWidth = 6;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 60);
        ctx.stroke();

        // Borde interior más sutil
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 2;
        ctx.roundRect(iphoneX + 8, iphoneY + 8, iphoneWidth - 16, iphoneHeight - 16, 52);
        ctx.stroke();

        // Pantalla del iPhone con tu imagen real ULTRA HD
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(iphoneX + 16, iphoneY + 40, iphoneWidth - 32, iphoneHeight - 70, 40);
        ctx.clip();
        
        // Dibujar tu imagen móvil real en ultra alta resolución
        ctx.drawImage(imagenMovil, iphoneX + 16, iphoneY + 40, iphoneWidth - 32, iphoneHeight - 70);
        ctx.restore();

        // MacBook Mockup ULTRA HD (derecha) - ENORME Y DETALLADO
        const macbookX = 700;
        const macbookY = 200;
        const macbookWidth = 1300;
        const macbookHeight = 900;

        // Sombra del MacBook ultra dramática
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.ellipse(macbookX + 500, macbookY + 900, 700, 120, 0, 0, 2 * Math.PI);
        ctx.fill();

        // Base del MacBook con gradiente más realista
        ctx.shadowColor = 'transparent';
        const baseGradient = ctx.createLinearGradient(macbookX, macbookY + 820, macbookX, macbookY + 900);
        baseGradient.addColorStop(0, '#e8e8e8');
        baseGradient.addColorStop(0.5, '#d0d0d0');
        baseGradient.addColorStop(1, '#a0a0a0');
        
        ctx.fillStyle = baseGradient;
        ctx.roundRect(macbookX, macbookY + 820, macbookWidth, 80, 40);
        ctx.fill();

        // Borde de la base
        ctx.strokeStyle = '#909090';
        ctx.lineWidth = 2;
        ctx.roundRect(macbookX, macbookY + 820, macbookWidth, 80, 40);
        ctx.stroke();

        // Pantalla del MacBook con gradiente más realista
        const screenGradient = ctx.createLinearGradient(macbookX + 30, macbookY, macbookX + 30, macbookY + 860);
        screenGradient.addColorStop(0, '#2a2a2a');
        screenGradient.addColorStop(0.3, '#1f1f1f');
        screenGradient.addColorStop(1, '#0a0a0a');
        
        ctx.fillStyle = screenGradient;
        ctx.roundRect(macbookX + 30, macbookY, macbookWidth - 60, 860, 50);
        ctx.fill();

        // Borde de la pantalla
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 3;
        ctx.roundRect(macbookX + 30, macbookY, macbookWidth - 60, 860, 50);
        ctx.stroke();

        // Tu imagen web real en el MacBook ULTRA HD
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(macbookX + 50, macbookY + 30, macbookWidth - 100, 800, 40);
        ctx.clip();
        
        // Dibujar tu imagen web real en ultra alta resolución
        ctx.drawImage(imagenWeb, macbookX + 50, macbookY + 30, macbookWidth - 100, 800);
        ctx.restore();

        // Etiquetas de dispositivos ULTRA HD con efectos
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VERSIÓN MÓVIL', 360, 1240);
        ctx.fillText('VERSIÓN WEB', 1350, 1240);

        // Línea divisoria más elegante y sutil
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(1080, 240);
        ctx.lineTo(1080, 1900);
        ctx.stroke();

        // Puntos decorativos en la línea
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(1080, 600, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1080, 1080, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1080, 1560, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Footer ULTRA HD con efectos
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 2000, 2160, 160);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText('Disponible en todas las plataformas', 1080, 2080);

        // Guardar imagen ULTRA HD final
        const buffer = canvas.toBuffer('image/png');
        const filename = 'Instagram_ReservaTusCanchas_ULTRA_HD_FINAL.png';
        fs.writeFileSync(filename, buffer);
        
        console.log(`✅ Mockup ULTRA HD final creado: ${filename}`);
        console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📐 Resolución: 2160x2160px (4K ULTRA HD)`);
        console.log(`🏟️ Cancha real de fútbol integrada`);
        
    } catch (error) {
        console.error('❌ Error creando mockup ULTRA HD:', error.message);
    }
}

// Ejecutar la función
crearMockupUltraHD();

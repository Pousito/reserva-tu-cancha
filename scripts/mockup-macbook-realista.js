const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function crearMockupMacBookRealista() {
    try {
        console.log('🚀 Creando mockup con MacBook realista y cancha real...');
        
        // Crear canvas de 2160x2160 (4K para Instagram HD)
        const canvas = createCanvas(2160, 2160);
        const ctx = canvas.getContext('2d');

        // Cargar imagen real de cancha de fútbol (la que me proporcionaste)
        console.log('🏟️ Cargando imagen real de cancha de fútbol...');
        const canchaReal = await loadImage(path.join(__dirname, '../Cancha-futbolito.png'));
        
        // Dibujar la cancha real como fondo
        ctx.drawImage(canchaReal, 0, 0, 2160, 2160);

        // Overlay sutil para mejorar el contraste
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, 2160, 2160);

        // Título principal con tipografía moderna y profesional
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 10;
        ctx.fillText('ReservaTusCanchas.cl', 1080, 110);

        // Subtítulo con tipografía más elegante
        ctx.font = '300 38px "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#f5f5f5';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 18;
        ctx.fillText('Sistema de Reservas Deportivas', 1080, 160);

        // Cargar tus imágenes reales
        console.log('📱 Cargando imagen móvil...');
        const imagenMovil = await loadImage(path.join(__dirname, '../tu-imagen-movil.png'));
        console.log('✅ Imagen móvil cargada:', imagenMovil.width, 'x', imagenMovil.height);
        
        console.log('💻 Cargando imagen web...');
        const imagenWeb = await loadImage(path.join(__dirname, '../tu-imagen-web.png'));
        console.log('✅ Imagen web cargada:', imagenWeb.width, 'x', imagenWeb.height);

        // iPhone Mockup ULTRA REALISTA (izquierda) - Diseño auténtico
        const iphoneX = 180;
        const iphoneY = 260;
        const iphoneWidth = 400;
        const iphoneHeight = 800;

        // Sin sombra ovalada del iPhone (eliminada por solicitud)

        // Marco exterior del iPhone (color grafito realista)
        ctx.shadowColor = 'transparent';
        const frameGradient = ctx.createLinearGradient(iphoneX, iphoneY, iphoneX, iphoneY + iphoneHeight);
        frameGradient.addColorStop(0, '#3c3c3c');
        frameGradient.addColorStop(0.2, '#2a2a2a');
        frameGradient.addColorStop(0.5, '#1f1f1f');
        frameGradient.addColorStop(0.8, '#1a1a1a');
        frameGradient.addColorStop(1, '#0f0f0f');
        
        ctx.fillStyle = frameGradient;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 70);
        ctx.fill();

        // Borde brillante metálico del iPhone
        const borderGradient = ctx.createLinearGradient(iphoneX, iphoneY, iphoneX + iphoneWidth, iphoneY);
        borderGradient.addColorStop(0, '#606060');
        borderGradient.addColorStop(0.5, '#a0a0a0');
        borderGradient.addColorStop(1, '#606060');
        
        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 8;
        ctx.roundRect(iphoneX, iphoneY, iphoneWidth, iphoneHeight, 70);
        ctx.stroke();

        // Notch del iPhone (más realista)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(iphoneX + 120, iphoneY + 20, 160, 35, 18);
        ctx.fill();

        // Botón home simulado
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(iphoneX + 200, iphoneY + 760, 35, 0, 2 * Math.PI);
        ctx.stroke();

        // Pantalla del iPhone con tu imagen real (AL FINAL, después de todos los elementos)
        console.log('🎨 Dibujando imagen móvil en iPhone...');
        console.log('📍 Posición iPhone:', iphoneX + 20, iphoneY + 60);
        console.log('📐 Tamaño área:', iphoneWidth - 40, iphoneHeight - 100);
        
        // Dibujar imagen móvil al final para que no se cubra
        ctx.drawImage(imagenMovil, iphoneX + 20, iphoneY + 60, iphoneWidth - 40, iphoneHeight - 100);

        // MacBook Mockup ULTRA REALISTA (derecha) - DISEÑO AUTÉNTICO APPLE
        const macbookX = 720;
        const macbookY = 180;
        const macbookWidth = 1400;
        const macbookHeight = 950;

        // Sin sombra ovalada del MacBook (eliminada por solicitud)

        // Base del MacBook con gradiente de plata realista
        ctx.shadowColor = 'transparent';
        const baseGradient = ctx.createLinearGradient(macbookX, macbookY + 880, macbookX, macbookY + 950);
        baseGradient.addColorStop(0, '#f5f5f5');
        baseGradient.addColorStop(0.2, '#e8e8e8');
        baseGradient.addColorStop(0.5, '#d8d8d8');
        baseGradient.addColorStop(0.8, '#c8c8c8');
        baseGradient.addColorStop(1, '#b8b8b8');
        
        ctx.fillStyle = baseGradient;
        ctx.roundRect(macbookX, macbookY + 880, macbookWidth, 70, 50);
        ctx.fill();

        // Borde de la base con brillo metálico
        const baseBorderGradient = ctx.createLinearGradient(macbookX, macbookY + 880, macbookX + macbookWidth, macbookY + 880);
        baseBorderGradient.addColorStop(0, '#a0a0a0');
        baseBorderGradient.addColorStop(0.5, '#d0d0d0');
        baseBorderGradient.addColorStop(1, '#a0a0a0');
        
        ctx.strokeStyle = baseBorderGradient;
        ctx.lineWidth = 4;
        ctx.roundRect(macbookX, macbookY + 880, macbookWidth, 70, 50);
        ctx.stroke();

        // Detalles de la base del MacBook (rejillas de ventilación realistas)
        ctx.fillStyle = '#b0b0b0';
        for (let i = 0; i < 15; i++) {
            const x = macbookX + 50 + (i * 85);
            ctx.roundRect(x, macbookY + 890, 60, 8, 4);
            ctx.fill();
        }

        // Pantalla del MacBook con bisel ultra realista
        const screenGradient = ctx.createLinearGradient(macbookX + 50, macbookY, macbookX + 50, macbookY + 920);
        screenGradient.addColorStop(0, '#2c2c2c');
        screenGradient.addColorStop(0.1, '#1f1f1f');
        screenGradient.addColorStop(0.5, '#0f0f0f');
        screenGradient.addColorStop(0.9, '#050505');
        screenGradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = screenGradient;
        ctx.roundRect(macbookX + 50, macbookY, macbookWidth - 100, 920, 60);
        ctx.fill();

        // Borde exterior de la pantalla (bisel metálico)
        const bezelGradient = ctx.createLinearGradient(macbookX + 50, macbookY, macbookX + macbookWidth - 50, macbookY);
        bezelGradient.addColorStop(0, '#404040');
        bezelGradient.addColorStop(0.5, '#606060');
        bezelGradient.addColorStop(1, '#404040');
        
        ctx.strokeStyle = bezelGradient;
        ctx.lineWidth = 10;
        ctx.roundRect(macbookX + 50, macbookY, macbookWidth - 100, 920, 60);
        ctx.stroke();

        // Borde interior de la pantalla (bisel interior)
        ctx.strokeStyle = '#202020';
        ctx.lineWidth = 4;
        ctx.roundRect(macbookX + 70, macbookY + 25, macbookWidth - 140, 870, 50);
        ctx.stroke();

        // Logo de Apple realista
        ctx.fillStyle = '#909090';
        ctx.beginPath();
        ctx.arc(macbookX + 700, macbookY + 930, 12, 0, 2 * Math.PI);
        ctx.fill();

        // Tu imagen web real en el MacBook ULTRA REALISTA (coordenadas corregidas)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(macbookX + 80, macbookY + 35, macbookWidth - 160, 850, 45);
        ctx.clip();
        
        ctx.drawImage(imagenWeb, macbookX + 80, macbookY + 35, macbookWidth - 160, 850);
        ctx.restore();

        // Reflexión en la pantalla del MacBook (efecto realista)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(macbookX + 80, macbookY + 35, macbookWidth - 160, 850, 45);
        ctx.clip();
        
        const reflectionGradient = ctx.createLinearGradient(macbookX + 80, macbookY + 35, macbookX + 80, macbookY + 220);
        reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        reflectionGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
        reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(macbookX + 80, macbookY + 35, macbookWidth - 160, 185);
        ctx.restore();

        // Etiquetas de dispositivos con tipografía moderna y elegante
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 62px "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VISUALIZACIÓN MÓVIL', 380, 1180);
        ctx.fillText('VISUALIZACIÓN WEB', 1420, 1180);

        // Descripciones con viñetas para móvil - SIN SUPERPOSICIÓN
        ctx.font = 'bold 38px "Helvetica Neue", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 20;
        ctx.textAlign = 'left';
        
        // Viñetas móvil
        const mobileFeatures = [
            '• Interfaz optimizada para pantallas táctiles.',
            '• Navegación intuitiva y rápida.',
            '• Reservas en tiempo real desde cualquier lugar.',
            '• Compatible con todos los navegadores móviles.'
        ];
        
        let yMobile = 1450;
        mobileFeatures.forEach(feature => {
            ctx.fillText(feature, 80, yMobile);
            yMobile += 65;
        });

        // Descripciones con viñetas para web - SIN SUPERPOSICIÓN
        ctx.textAlign = 'left';
        
        // Viñetas web
        const webFeatures = [
            '• Panel administrativo completo y detallado.',
            '• Gestión avanzada de reservas y canchas.',
            '• Reportes financieros y estadísticas en tiempo real.',
            '• Control total del complejo deportivo.'
        ];
        
        let yWeb = 1450;
        webFeatures.forEach(feature => {
            ctx.fillText(feature, 1150, yWeb);
            yWeb += 65;
        });

        // Línea divisoria elegante y simétrica - EXTENDIDA
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(1080, 200);
        ctx.lineTo(1080, 1700);
        ctx.stroke();

        // Puntos decorativos en la línea - mejor posicionados
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(1080, 550, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1080, 1050, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1080, 1550, 10, 0, 2 * Math.PI);
        ctx.fill();

        // Footer con efectos mejorados y tipografía moderna
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 2000, 2160, 160);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 46px "Helvetica Neue", Arial, sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 18;
        ctx.textAlign = 'center';
        ctx.fillText('Disponible en todas las plataformas web', 1080, 2080);

        // Guardar imagen final
        const buffer = canvas.toBuffer('image/png');
        const filename = 'Instagram_ReservaTusCanchas_MACBOOK_REALISTA.png';
        fs.writeFileSync(filename, buffer);
        
        console.log(`✅ Mockup MacBook realista creado: ${filename}`);
        console.log(`📊 Tamaño del archivo: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📐 Resolución: 2160x2160px (4K HD)`);
        console.log(`💻 MacBook ultra realista con detalles auténticos`);
        console.log(`🏟️ Cancha real de fútbol como fondo`);
        
    } catch (error) {
        console.error('❌ Error creando mockup MacBook realista:', error.message);
    }
}

// Ejecutar la función
crearMockupMacBookRealista();

const { jsPDF } = require('jspdf');

class InstagramImageGeneratorV2 {
    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [108, 108] // Formato cuadrado para Instagram
        });
        
        this.width = 108;
        this.height = 108;
        this.margin = 6;
    }

    generateInstagramPost() {
        console.log('🎨 Generando imagen V2 para Instagram...');
        
        // Fondo moderno
        this.addModernBackground();
        
        // Logo/título principal
        this.addMainTitleV2();
        
        // Características en cards
        this.addFeatureCards();
        
        // Información de complejos compacta
        this.addComplexesInfoV2();
        
        // URL prominente
        this.addProminentURL();
        
        console.log('✅ Imagen V2 para Instagram generada exitosamente');
        return this.doc;
    }

    addModernBackground() {
        // Fondo principal (gradiente moderno)
        this.doc.setFillColor(25, 25, 112); // Azul marino
        this.doc.rect(0, 0, this.width, this.height, 'F');
        
        // Patrón geométrico
        this.doc.setFillColor(255, 255, 255, 0.1);
        
        // Triángulos decorativos
        const trianglePoints = [
            [0, 0], [30, 0], [0, 30],
            [this.width, 0], [this.width - 30, 0], [this.width, 30],
            [0, this.height], [0, this.height - 30], [30, this.height],
            [this.width, this.height], [this.width, this.height - 30], [this.width - 30, this.height]
        ];
        
        // Dibujar triángulos en las esquinas
        this.drawTriangle([0, 0], [25, 0], [0, 25]);
        this.drawTriangle([this.width, 0], [this.width - 25, 0], [this.width, 25]);
        this.drawTriangle([0, this.height], [0, this.height - 25], [25, this.height]);
        this.drawTriangle([this.width, this.height], [this.width, this.height - 25], [this.width - 25, this.height]);
    }

    drawTriangle(point1, point2, point3) {
        this.doc.setFillColor(255, 255, 255, 0.15);
        this.doc.triangle(point1[0], point1[1], point2[0], point2[1], point3[0], point3[1], 'F');
    }

    addMainTitleV2() {
        // Fondo para el título
        this.doc.setFillColor(255, 255, 255, 0.95);
        this.doc.roundedRect(15, 8, this.width - 30, 18, 8, 8, 'F');
        
        // Título principal
        this.doc.setTextColor(25, 25, 112);
        this.doc.setFontSize(18);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('🏟️ RESERVA TUS CANCHAS', this.width / 2, 18, { align: 'center' });
        
        // Subtítulo
        this.doc.setFontSize(9);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('Sistema de Reservas Deportivas 24/7', this.width / 2, 23, { align: 'center' });
    }

    addFeatureCards() {
        const features = [
            { icon: '📱', text: 'Sin llamadas', desc: 'Reserva online' },
            { icon: '⏰', text: 'Tiempo real', desc: 'Disponibilidad' },
            { icon: '💳', text: 'Pago seguro', desc: 'Webpay Plus' },
            { icon: '✅', text: 'Confirmación', desc: 'Inmediata' }
        ];
        
        const cardWidth = 22;
        const cardHeight = 15;
        const spacing = 4;
        const startX = this.margin;
        const startY = 32;
        
        features.forEach((feature, index) => {
            const x = startX + (index % 2) * (cardWidth + spacing);
            const y = startY + Math.floor(index / 2) * (cardHeight + spacing);
            
            // Card background
            this.doc.setFillColor(255, 255, 255, 0.9);
            this.doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'F');
            
            // Icon
            this.doc.setTextColor(25, 25, 112);
            this.doc.setFontSize(12);
            this.doc.text(feature.icon, x + 3, y + 6);
            
            // Text
            this.doc.setFontSize(8);
            this.doc.setFont(undefined, 'bold');
            this.doc.text(feature.text, x + 8, y + 6);
            
            // Description
            this.doc.setFontSize(6);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(feature.desc, x + 8, y + 9);
        });
    }

    addComplexesInfoV2() {
        // Fondo para información de complejos
        this.doc.setFillColor(255, 255, 255, 0.9);
        this.doc.roundedRect(this.margin, 70, this.width - (this.margin * 2), 20, 6, 6, 'F');
        
        // Título
        this.doc.setTextColor(25, 25, 112);
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('🏟️ COMPLEJOS DISPONIBLES', this.width / 2, 76, { align: 'center' });
        
        // Información compacta
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'normal');
        
        const info = [
            '📍 Los Ángeles: Complejo En Desarrollo ($5.000/h) • Fundación Gunnen ($8.000/h)',
            '📍 Quilleco: Espacio Deportivo Borde Río ($50/h)'
        ];
        
        this.doc.text(info[0], this.margin + 3, 82);
        this.doc.text(info[1], this.margin + 3, 87);
    }

    addProminentURL() {
        // Botón principal
        this.doc.setFillColor(255, 193, 7); // Amarillo dorado
        this.doc.roundedRect(this.margin + 5, 95, this.width - (this.margin * 2) - 10, 8, 5, 5, 'F');
        
        // URL
        this.doc.setTextColor(25, 25, 112);
        this.doc.setFontSize(11);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('www.reservatuscanchas.cl', this.width / 2, 100.5, { align: 'center' });
        
        // Hashtags pequeños
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(6);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('#ReservaTusCanchas #CanchasDeportivas #24x7', this.width / 2, 105, { align: 'center' });
    }
}

// Función principal para generar la imagen V2
function generarImagenInstagramV2() {
    try {
        console.log('🚀 Iniciando generación de imagen V2 para Instagram...');
        
        const generator = new InstagramImageGeneratorV2();
        const pdf = generator.generateInstagramPost();
        
        // Guardar el PDF
        const filename = 'Instagram_ReservaTusCanchas_V2.pdf';
        pdf.save(filename);
        
        console.log(`✅ Imagen V2 guardada como: ${filename}`);
        console.log('📐 Dimensiones: 108x108mm (formato cuadrado Instagram)');
        console.log('🎨 Diseño: Fondo azul marino, elementos geométricos, cards blancas');
        
        return filename;
        
    } catch (error) {
        console.error('❌ Error generando imagen V2 para Instagram:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generarImagenInstagramV2();
}

module.exports = generarImagenInstagramV2;

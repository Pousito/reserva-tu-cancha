const { jsPDF } = require('jspdf');

class InstagramImageGenerator {
    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [108, 108] // Formato cuadrado para Instagram
        });
        
        this.width = 108;
        this.height = 108;
        this.margin = 8;
    }

    generateInstagramPost() {
        console.log('🎨 Generando imagen para Instagram...');
        
        // Fondo degradado (simulado con rectángulos)
        this.addGradientBackground();
        
        // Logo/título principal
        this.addMainTitle();
        
        // Características principales
        this.addFeatures();
        
        // Información de complejos
        this.addComplexesInfo();
        
        // URL y call to action
        this.addCallToAction();
        
        // Elementos decorativos
        this.addDecorations();
        
        console.log('✅ Imagen para Instagram generada exitosamente');
        return this.doc;
    }

    addGradientBackground() {
        // Fondo principal (azul deportivo)
        this.doc.setFillColor(30, 144, 255); // Azul deportivo
        this.doc.rect(0, 0, this.width, this.height, 'F');
        
        // Degradado simulado con rectángulos
        this.doc.setFillColor(0, 123, 255);
        this.doc.rect(0, 0, this.width, this.height * 0.3, 'F');
        
        this.doc.setFillColor(40, 154, 255);
        this.doc.rect(0, this.height * 0.3, this.width, this.height * 0.4, 'F');
        
        this.doc.setFillColor(60, 164, 255);
        this.doc.rect(0, this.height * 0.7, this.width, this.height * 0.3, 'F');
    }

    addMainTitle() {
        // Círculo de fondo para el título
        this.doc.setFillColor(255, 255, 255, 0.9);
        this.doc.circle(this.width / 2, 25, 15, 'F');
        
        // Título principal
        this.doc.setTextColor(30, 144, 255);
        this.doc.setFontSize(16);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('RESERVA', this.width / 2, 20, { align: 'center' });
        
        this.doc.setFontSize(14);
        this.doc.text('TUS CANCHAS', this.width / 2, 26, { align: 'center' });
        
        // Subtítulo
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('🏟️ Sistema de Reservas 24/7', this.width / 2, 35, { align: 'center' });
    }

    addFeatures() {
        const features = [
            '✅ Sin llamadas ni esperas',
            '✅ Disponibilidad en tiempo real',
            '✅ Pago seguro Webpay Plus',
            '✅ Confirmación inmediata'
        ];
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'normal');
        
        let yPos = 45;
        features.forEach((feature, index) => {
            this.doc.text(feature, this.margin + 2, yPos);
            yPos += 4;
        });
    }

    addComplexesInfo() {
        // Fondo semitransparente para información
        this.doc.setFillColor(255, 255, 255, 0.2);
        this.doc.roundedRect(this.margin, 65, this.width - (this.margin * 2), 25, 3, 3, 'F');
        
        // Título de sección
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(9);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('🏟️ COMPLEJOS DISPONIBLES', this.width / 2, 72, { align: 'center' });
        
        // Información de complejos
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'normal');
        
        const complexes = [
            'Los Ángeles: Complejo En Desarrollo ($5.000/h)',
            'Los Ángeles: Fundación Gunnen ($8.000/h)',
            'Quilleco: Borde Río ($50/h)'
        ];
        
        let yPos = 78;
        complexes.forEach(complex => {
            this.doc.text(complex, this.margin + 3, yPos);
            yPos += 3.5;
        });
    }

    addCallToAction() {
        // Botón de call to action
        this.doc.setFillColor(255, 193, 7); // Amarillo dorado
        this.doc.roundedRect(this.margin + 10, 92, this.width - (this.margin * 2) - 20, 8, 4, 4, 'F');
        
        // Texto del botón
        this.doc.setTextColor(30, 144, 255);
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('www.reservatuscanchas.cl', this.width / 2, 97.5, { align: 'center' });
        
        // Texto adicional
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('¡Reserva tu cancha ahora!', this.width / 2, 103, { align: 'center' });
    }

    addDecorations() {
        // Elementos decorativos - círculos pequeños
        this.doc.setFillColor(255, 255, 255, 0.3);
        
        // Círculos decorativos
        this.doc.circle(15, 15, 2, 'F');
        this.doc.circle(this.width - 15, 20, 1.5, 'F');
        this.doc.circle(20, this.height - 15, 2.5, 'F');
        this.doc.circle(this.width - 20, this.height - 20, 1, 'F');
        
        // Líneas decorativas
        this.doc.setDrawColor(255, 255, 255, 0.5);
        this.doc.setLineWidth(0.5);
        
        // Líneas en las esquinas
        this.doc.line(5, 5, 15, 5);
        this.doc.line(5, 5, 5, 15);
        
        this.doc.line(this.width - 5, 5, this.width - 15, 5);
        this.doc.line(this.width - 5, 5, this.width - 5, 15);
        
        this.doc.line(5, this.height - 5, 15, this.height - 5);
        this.doc.line(5, this.height - 5, 5, this.height - 15);
        
        this.doc.line(this.width - 5, this.height - 5, this.width - 15, this.height - 5);
        this.doc.line(this.width - 5, this.height - 5, this.width - 5, this.height - 15);
    }
}

// Función principal para generar la imagen
function generarImagenInstagram() {
    try {
        console.log('🚀 Iniciando generación de imagen para Instagram...');
        
        const generator = new InstagramImageGenerator();
        const pdf = generator.generateInstagramPost();
        
        // Guardar el PDF
        const filename = 'Instagram_ReservaTusCanchas.pdf';
        pdf.save(filename);
        
        console.log(`✅ Imagen guardada como: ${filename}`);
        console.log('📐 Dimensiones: 108x108mm (formato cuadrado Instagram)');
        console.log('🎨 Diseño: Fondo degradado azul, elementos blancos, call-to-action dorado');
        
        return filename;
        
    } catch (error) {
        console.error('❌ Error generando imagen para Instagram:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generarImagenInstagram();
}

module.exports = generarImagenInstagram;

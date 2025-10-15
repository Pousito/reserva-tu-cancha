const { jsPDF } = require('jspdf');

class InstagramImageGeneratorPremium {
    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [108, 108] // Formato cuadrado para Instagram
        });
        
        this.width = 108;
        this.height = 108;
        this.margin = 3;
    }

    generateInstagramPost() {
        console.log('🎨 Generando imagen PREMIUM para Instagram...');
        
        // Fondo con textura de césped
        this.addGrassBackground();
        
        // Header profesional
        this.addPremiumHeader();
        
        // Sección de bienvenida
        this.addPremiumWelcome();
        
        // Botones de acción prominentes
        this.addPremiumButtons();
        
        // Tabla de disponibilidad moderna
        this.addPremiumTable();
        
        // Footer elegante
        this.addPremiumFooter();
        
        console.log('✅ Imagen PREMIUM generada exitosamente');
        return this.doc;
    }

    addGrassBackground() {
        // Fondo verde césped con textura
        this.doc.setFillColor(34, 139, 34);
        this.doc.rect(0, 0, this.width, this.height, 'F');
        
        // Efecto de césped con líneas
        this.doc.setDrawColor(50, 155, 50);
        this.doc.setLineWidth(0.2);
        
        for (let i = 0; i < this.width; i += 2) {
            this.doc.line(i, 0, i, this.height);
        }
        
        for (let i = 0; i < this.height; i += 3) {
            this.doc.line(0, i, this.width, i);
        }
    }

    addPremiumHeader() {
        // Fondo del header
        this.doc.setFillColor(0, 80, 0);
        this.doc.rect(0, 0, this.width, 16, 'F');
        
        // Logo profesional
        this.doc.setFillColor(255, 255, 255);
        this.doc.circle(10, 8, 5, 'F');
        
        // Pelota de fútbol
        this.doc.setFillColor(0, 80, 0);
        this.doc.circle(10, 8, 4, 'F');
        this.doc.setFillColor(255, 255, 255);
        this.doc.circle(10, 8, 2.5, 'F');
        this.doc.setFillColor(0, 80, 0);
        this.doc.circle(10, 8, 1.5, 'F');
        
        // Nombre del proyecto
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(11);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('RESERVA TUS CANCHAS', 22, 7);
        
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('Sistema Profesional de Reservas', 22, 11);
        
        this.doc.setFontSize(6);
        this.doc.text('Los Angeles • Quilleco • 24/7', 22, 13.5);
    }

    addPremiumWelcome() {
        // Fondo principal
        this.doc.setFillColor(255, 255, 255, 0.98);
        this.doc.roundedRect(this.margin, 20, this.width - (this.margin * 2), 22, 8, 8, 'F');
        
        // Sombra sutil
        this.doc.setFillColor(200, 200, 200, 0.3);
        this.doc.roundedRect(this.margin + 1, 21, this.width - (this.margin * 2), 22, 8, 8, 'F');
        
        // Título principal
        this.doc.setTextColor(0, 80, 0);
        this.doc.setFontSize(14);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Bienvenido al Complejo', this.width / 2, 28, { align: 'center' });
        
        this.doc.setFontSize(12);
        this.doc.text('Deportivo Digital!', this.width / 2, 32, { align: 'center' });
        
        // Descripción
        this.doc.setFontSize(7);
        this.doc.setTextColor(60, 60, 60);
        this.doc.text('Para ver todas las canchas y horarios', this.width / 2, 36, { align: 'center' });
        this.doc.text('disponibles. Para hacer una reserva:', this.width / 2, 39, { align: 'center' });
    }

    addPremiumButtons() {
        // Botón Iniciar Sesión
        this.doc.setFillColor(0, 123, 255);
        this.doc.roundedRect(this.margin + 8, 46, 32, 10, 5, 5, 'F');
        
        // Sombra del botón
        this.doc.setFillColor(0, 100, 200, 0.5);
        this.doc.roundedRect(this.margin + 9, 47, 32, 10, 5, 5, 'F');
        
        // Contenido del botón
        this.doc.setFillColor(0, 123, 255);
        this.doc.roundedRect(this.margin + 8, 46, 32, 10, 5, 5, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Iniciar Sesion', this.margin + 24, 52, { align: 'center' });
        
        // Botón Registrarse
        this.doc.setFillColor(40, 167, 69);
        this.doc.roundedRect(this.margin + 48, 46, 32, 10, 5, 5, 'F');
        
        // Sombra del botón
        this.doc.setFillColor(30, 140, 50, 0.5);
        this.doc.roundedRect(this.margin + 49, 47, 32, 10, 5, 5, 'F');
        
        // Contenido del botón
        this.doc.setFillColor(40, 167, 69);
        this.doc.roundedRect(this.margin + 48, 46, 32, 10, 5, 5, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Registrarse', this.margin + 64, 52, { align: 'center' });
    }

    addPremiumTable() {
        // Fondo de la tabla
        this.doc.setFillColor(255, 255, 255, 0.98);
        this.doc.roundedRect(this.margin, 60, this.width - (this.margin * 2), 35, 6, 6, 'F');
        
        // Sombra
        this.doc.setFillColor(200, 200, 200, 0.2);
        this.doc.roundedRect(this.margin + 1, 61, this.width - (this.margin * 2), 35, 6, 6, 'F');
        
        // Fondo principal
        this.doc.setFillColor(255, 255, 255, 0.98);
        this.doc.roundedRect(this.margin, 60, this.width - (this.margin * 2), 35, 6, 6, 'F');
        
        // Título de la tabla
        this.doc.setTextColor(0, 80, 0);
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Horarios Disponibles', this.width / 2, 66, { align: 'center' });
        
        // Headers
        this.doc.setFillColor(240, 248, 255);
        this.doc.rect(this.margin + 2, 68, this.width - (this.margin * 2) - 4, 7, 'F');
        
        this.doc.setTextColor(0, 80, 0);
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Horario', this.margin + 6, 72);
        this.doc.text('Cancha 1', this.margin + 28, 72);
        this.doc.text('Cancha 2', this.margin + 50, 72);
        this.doc.text('Cancha 3', this.margin + 72, 72);
        
        // Filas de horarios
        const horarios = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
        
        horarios.forEach((hora, index) => {
            const y = 78 + (index * 2.8);
            
            // Fondo alternado
            if (index % 2 === 0) {
                this.doc.setFillColor(248, 249, 250);
                this.doc.rect(this.margin + 2, y - 1, this.width - (this.margin * 2) - 4, 2.8, 'F');
            }
            
            // Hora
            this.doc.setTextColor(60, 60, 60);
            this.doc.setFontSize(6);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(hora, this.margin + 6, y + 0.8);
            
            // Estados de canchas
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 25, y - 0.5, 18, 1.8, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 34, y + 0.5, { align: 'center' });
            
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 47, y - 0.5, 18, 1.8, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 56, y + 0.5, { align: 'center' });
            
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 69, y - 0.5, 18, 1.8, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 78, y + 0.5, { align: 'center' });
        });
    }

    addPremiumFooter() {
        // Fondo del footer
        this.doc.setFillColor(0, 80, 0);
        this.doc.rect(0, this.height - 10, this.width, 10, 'F');
        
        // URL principal
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(9);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('www.reservatuscanchas.cl', this.width / 2, this.height - 5.5, { align: 'center' });
        
        // Subtítulo
        this.doc.setFontSize(6);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('Reserva tu cancha ahora!', this.width / 2, this.height - 2, { align: 'center' });
    }
}

// Función principal para generar la imagen premium
function generarImagenInstagramPremium() {
    try {
        console.log('🚀 Iniciando generación de imagen PREMIUM para Instagram...');
        
        const generator = new InstagramImageGeneratorPremium();
        const pdf = generator.generateInstagramPost();
        
        // Guardar el PDF
        const filename = 'Instagram_ReservaTusCanchas_Premium.pdf';
        pdf.save(filename);
        
        console.log(`✅ Imagen PREMIUM guardada como: ${filename}`);
        console.log('📐 Dimensiones: 108x108mm (formato cuadrado Instagram)');
        console.log('🎨 Diseño: Estilo premium verde/blanco, inspirado en referencia profesional');
        
        return filename;
        
    } catch (error) {
        console.error('❌ Error generando imagen PREMIUM para Instagram:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generarImagenInstagramPremium();
}

module.exports = generarImagenInstagramPremium;

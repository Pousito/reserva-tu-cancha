const { jsPDF } = require('jspdf');

class InstagramImageGeneratorProfesional {
    constructor() {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [108, 108] // Formato cuadrado para Instagram
        });
        
        this.width = 108;
        this.height = 108;
        this.margin = 4;
    }

    generateInstagramPost() {
        console.log('🎨 Generando imagen profesional para Instagram...');
        
        // Fondo moderno con gradiente
        this.addModernBackground();
        
        // Header con logo y nombre
        this.addHeader();
        
        // Sección principal de bienvenida
        this.addWelcomeSection();
        
        // Botones de acción
        this.addActionButtons();
        
        // Tabla de disponibilidad
        this.addAvailabilityTable();
        
        // Footer con URL
        this.addFooter();
        
        console.log('✅ Imagen profesional generada exitosamente');
        return this.doc;
    }

    addModernBackground() {
        // Fondo con gradiente verde (como en la referencia)
        this.doc.setFillColor(34, 139, 34); // Verde forestal
        this.doc.rect(0, 0, this.width, this.height, 'F');
        
        // Degradado simulado
        this.doc.setFillColor(50, 155, 50);
        this.doc.rect(0, 0, this.width, this.height * 0.4, 'F');
        
        this.doc.setFillColor(70, 170, 70);
        this.doc.rect(0, this.height * 0.4, this.width, this.height * 0.3, 'F');
        
        this.doc.setFillColor(90, 180, 90);
        this.doc.rect(0, this.height * 0.7, this.width, this.height * 0.3, 'F');
    }

    addHeader() {
        // Fondo del header
        this.doc.setFillColor(0, 100, 0); // Verde oscuro
        this.doc.rect(0, 0, this.width, 18, 'F');
        
        // Logo (círculo con pelota)
        this.doc.setFillColor(255, 255, 255);
        this.doc.circle(12, 9, 6, 'F');
        
        // Pelota de fútbol (simplificada)
        this.doc.setFillColor(0, 100, 0);
        this.doc.circle(12, 9, 5, 'F');
        this.doc.setFillColor(255, 255, 255);
        this.doc.circle(12, 9, 3, 'F');
        
        // Nombre del complejo
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(10);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('RESERVA TUS CANCHAS', 25, 7);
        
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('Sistema de Reservas 24/7', 25, 11);
        
        this.doc.setFontSize(7);
        this.doc.text('Los Angeles y Quilleco', 25, 14.5);
    }

    addWelcomeSection() {
        // Fondo para la sección de bienvenida
        this.doc.setFillColor(255, 255, 255, 0.95);
        this.doc.roundedRect(this.margin, 22, this.width - (this.margin * 2), 20, 5, 5, 'F');
        
        // Título principal
        this.doc.setTextColor(0, 100, 0);
        this.doc.setFontSize(12);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Bienvenido al Sistema', this.width / 2, 28, { align: 'center' });
        
        // Subtítulo
        this.doc.setFontSize(9);
        this.doc.setFont(undefined, 'normal');
        this.doc.text('de Reservas Deportivas!', this.width / 2, 32, { align: 'center' });
        
        // Descripción
        this.doc.setFontSize(7);
        this.doc.setTextColor(60, 60, 60);
        this.doc.text('Para ver canchas disponibles y hacer', this.width / 2, 36, { align: 'center' });
        this.doc.text('reservas, necesitas una cuenta:', this.width / 2, 39, { align: 'center' });
    }

    addActionButtons() {
        // Botón Iniciar Sesión
        this.doc.setFillColor(0, 123, 255); // Azul
        this.doc.roundedRect(this.margin + 5, 46, 35, 8, 4, 4, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Iniciar Sesion', this.margin + 22, 51.5, { align: 'center' });
        
        // Botón Registrarse
        this.doc.setFillColor(40, 167, 69); // Verde
        this.doc.roundedRect(this.margin + 45, 46, 35, 8, 4, 4, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Registrarse', this.margin + 62, 51.5, { align: 'center' });
    }

    addAvailabilityTable() {
        // Fondo de la tabla
        this.doc.setFillColor(255, 255, 255, 0.95);
        this.doc.roundedRect(this.margin, 58, this.width - (this.margin * 2), 30, 5, 5, 'F');
        
        // Título de la tabla
        this.doc.setTextColor(0, 100, 0);
        this.doc.setFontSize(9);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Horarios Disponibles', this.width / 2, 64, { align: 'center' });
        
        // Headers de la tabla
        this.doc.setFillColor(240, 248, 255);
        this.doc.rect(this.margin + 2, 66, this.width - (this.margin * 2) - 4, 6, 'F');
        
        this.doc.setTextColor(0, 100, 0);
        this.doc.setFontSize(7);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('Horario', this.margin + 5, 70);
        this.doc.text('Cancha 1', this.margin + 25, 70);
        this.doc.text('Cancha 2', this.margin + 45, 70);
        this.doc.text('Cancha 3', this.margin + 65, 70);
        
        // Filas de la tabla
        const horarios = ['08:00', '10:00', '12:00', '14:00', '16:00'];
        
        horarios.forEach((hora, index) => {
            const y = 76 + (index * 3.5);
            
            // Fondo alternado
            if (index % 2 === 0) {
                this.doc.setFillColor(248, 249, 250);
                this.doc.rect(this.margin + 2, y - 1, this.width - (this.margin * 2) - 4, 3.5, 'F');
            }
            
            // Hora
            this.doc.setTextColor(60, 60, 60);
            this.doc.setFontSize(6);
            this.doc.setFont(undefined, 'normal');
            this.doc.text(hora, this.margin + 5, y + 1);
            
            // Estado de canchas
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 20, y - 0.5, 15, 2.5, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 27, y + 0.8, { align: 'center' });
            
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 40, y - 0.5, 15, 2.5, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 47, y + 0.8, { align: 'center' });
            
            this.doc.setFillColor(40, 167, 69);
            this.doc.roundedRect(this.margin + 60, y - 0.5, 15, 2.5, 1, 1, 'F');
            this.doc.setTextColor(255, 255, 255);
            this.doc.setFontSize(5);
            this.doc.text('DISPONIBLE', this.margin + 67, y + 0.8, { align: 'center' });
        });
    }

    addFooter() {
        // Fondo del footer
        this.doc.setFillColor(0, 100, 0);
        this.doc.rect(0, this.height - 8, this.width, 8, 'F');
        
        // URL
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(8);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('www.reservatuscanchas.cl', this.width / 2, this.height - 4, { align: 'center' });
    }
}

// Función principal para generar la imagen profesional
function generarImagenInstagramProfesional() {
    try {
        console.log('🚀 Iniciando generación de imagen profesional para Instagram...');
        
        const generator = new InstagramImageGeneratorProfesional();
        const pdf = generator.generateInstagramPost();
        
        // Guardar el PDF
        const filename = 'Instagram_ReservaTusCanchas_Profesional.pdf';
        pdf.save(filename);
        
        console.log(`✅ Imagen profesional guardada como: ${filename}`);
        console.log('📐 Dimensiones: 108x108mm (formato cuadrado Instagram)');
        console.log('🎨 Diseño: Estilo profesional verde/blanco, sin caracteres especiales');
        
        return filename;
        
    } catch (error) {
        console.error('❌ Error generando imagen profesional para Instagram:', error);
        throw error;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    generarImagenInstagramProfesional();
}

module.exports = generarImagenInstagramProfesional;

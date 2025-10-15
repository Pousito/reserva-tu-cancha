const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

// Configuración de colores
const colors = {
  primary: [102, 126, 234],      // #667eea
  secondary: [118, 75, 162],     // #764ba2
  success: [86, 171, 47],        // #56ab2f
  info: [79, 172, 254],          // #4facfe
  warning: [245, 87, 108],       // #f5576c
  dark: [52, 58, 64],            // #343a40
  light: [248, 249, 250],        // #f8f9fa
  text: [33, 37, 41],            // #212529
  textLight: [108, 117, 125]     // #6c757d
};

class ManualUsuarioPDF {
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  // Agregar encabezado con gradiente visual
  addHeader(title, subtitle = '') {
    // Fondo degradado
    this.doc.setFillColor(...colors.primary);
    this.doc.rect(0, 0, this.pageWidth, 60, 'F');
    
    this.doc.setFillColor(...colors.secondary);
    this.doc.setGState(new this.doc.GState({ opacity: 0.7 }));
    this.doc.rect(0, 40, this.pageWidth, 20, 'F');
    this.doc.setGState(new this.doc.GState({ opacity: 1 }));

    // Título
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, 30, { align: 'center' });

    if (subtitle) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.pageWidth / 2, 45, { align: 'center' });
    }

    this.currentY = 70;
  }

  // Agregar pie de página
  addFooter(pageNumber) {
    this.doc.setFontSize(9);
    this.doc.setTextColor(...colors.textLight);
    this.doc.setFont('helvetica', 'normal');
    
    const footerText = `Manual de Usuario - ReservaTusCanchas.cl`;
    const pageText = `Página ${pageNumber}`;
    
    this.doc.text(footerText, this.margin, this.pageHeight - 10);
    this.doc.text(pageText, this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
    
    // Línea decorativa
    this.doc.setDrawColor(...colors.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
  }

  // Agregar título de sección
  addSectionTitle(title, icon = '') {
    this.checkPageBreak(20);
    
    // Fondo de la sección
    this.doc.setFillColor(...colors.light);
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 12, 2, 2, 'F');
    
    // Texto del título
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...colors.primary);
    
    const titleText = icon ? `${icon} ${title}` : title;
    this.doc.text(titleText, this.margin + 5, this.currentY + 8);
    
    this.currentY += 18;
  }

  // Agregar subtítulo
  addSubtitle(text) {
    this.checkPageBreak(15);
    
    this.doc.setFontSize(13);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...colors.dark);
    this.doc.text(text, this.margin, this.currentY);
    
    this.currentY += 10;
  }

  // Agregar párrafo
  addParagraph(text, indent = 0) {
    this.checkPageBreak(15);
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...colors.text);
    
    const maxWidth = this.pageWidth - 2 * this.margin - indent;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach(line => {
      this.checkPageBreak(7);
      this.doc.text(line, this.margin + indent, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 2;
  }

  // Agregar lista con viñetas
  addBulletList(items, icon = '•') {
    items.forEach(item => {
      this.checkPageBreak(10);
      
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...colors.text);
      
      // Icono/viñeta
      this.doc.setTextColor(...colors.primary);
      this.doc.text(icon, this.margin + 5, this.currentY);
      
      // Texto del item
      this.doc.setTextColor(...colors.text);
      const maxWidth = this.pageWidth - 2 * this.margin - 15;
      const lines = this.doc.splitTextToSize(item, maxWidth);
      
      lines.forEach((line, index) => {
        this.checkPageBreak(7);
        this.doc.text(line, this.margin + 12, this.currentY + (index * 6));
      });
      
      this.currentY += (lines.length * 6) + 3;
    });
  }

  // Agregar cuadro de información destacada
  addInfoBox(title, content, type = 'info') {
    this.checkPageBreak(30);
    
    const boxColors = {
      info: colors.info,
      success: colors.success,
      warning: colors.warning,
      primary: colors.primary
    };
    
    const boxColor = boxColors[type] || colors.info;
    
    const startY = this.currentY;
    
    // Calcular altura del contenido
    const maxWidth = this.pageWidth - 2 * this.margin - 15;
    const lines = this.doc.splitTextToSize(content, maxWidth);
    const contentHeight = (lines.length * 5) + 20; // 5 por línea + espaciado
    
    // Borde coloreado
    this.doc.setDrawColor(...boxColor);
    this.doc.setLineWidth(1);
    this.doc.setFillColor(255, 255, 255);
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, contentHeight, 3, 3, 'FD');
    
    // Barra lateral de color
    this.doc.setFillColor(...boxColor);
    this.doc.roundedRect(this.margin, this.currentY, 4, contentHeight, 2, 2, 'F');
    
    this.currentY += 8;
    
    // Título del cuadro
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...boxColor);
    this.doc.text(title, this.margin + 10, this.currentY);
    
    this.currentY += 8;
    
    // Contenido
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...colors.text);
    
    lines.forEach(line => {
      this.doc.text(line, this.margin + 10, this.currentY);
      this.currentY += 5;
    });
    
    this.currentY += 8;
  }

  // Agregar tabla simple
  addTable(headers, rows, title = '') {
    this.checkPageBreak(30);
    
    if (title) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...colors.dark);
      this.doc.text(title, this.margin, this.currentY);
      this.currentY += 8;
    }
    
    const colWidth = (this.pageWidth - 2 * this.margin) / headers.length;
    const rowHeight = 8;
    const startY = this.currentY;
    
    // Encabezados
    this.doc.setFillColor(...colors.primary);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, rowHeight, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    
    headers.forEach((header, i) => {
      const x = this.margin + (i * colWidth) + (colWidth / 2);
      this.doc.text(header, x, this.currentY + 5.5, { align: 'center' });
    });
    
    this.currentY += rowHeight;
    
    // Filas
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight + 5);
      
      // Alternar colores
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(...colors.light);
        this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      }
      
      this.doc.setTextColor(...colors.text);
      
      row.forEach((cell, colIndex) => {
        const x = this.margin + (colIndex * colWidth) + 2;
        const maxCellWidth = colWidth - 4;
        const lines = this.doc.splitTextToSize(cell, maxCellWidth);
        
        if (lines.length === 1) {
          this.doc.text(cell, x, this.currentY + 5.5);
        } else {
          lines.forEach((line, lineIndex) => {
            this.doc.text(line, x, this.currentY + 3.5 + (lineIndex * 4));
          });
        }
      });
      
      // Línea divisoria
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.1);
      this.doc.line(this.margin, this.currentY + rowHeight, this.pageWidth - this.margin, this.currentY + rowHeight);
      
      this.currentY += rowHeight;
    });
    
    this.currentY += 5;
  }

  // Agregar espacio
  addSpace(height = 10) {
    this.currentY += height;
  }

  // Verificar salto de página
  checkPageBreak(requiredSpace) {
    if (this.currentY + requiredSpace > this.pageHeight - 25) {
      this.newPage();
    }
  }

  // Nueva página
  newPage() {
    const currentPage = this.doc.internal.getCurrentPageInfo().pageNumber;
    this.addFooter(currentPage);
    this.doc.addPage();
    this.currentY = this.margin;
  }

  // Generar portada
  generarPortada() {
    // Fondo degradado completo
    this.doc.setFillColor(...colors.primary);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    
    this.doc.setFillColor(...colors.secondary);
    this.doc.setGState(new this.doc.GState({ opacity: 0.6 }));
    this.doc.circle(this.pageWidth / 2, 100, 80, 'F');
    this.doc.setGState(new this.doc.GState({ opacity: 1 }));

    // Título principal
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(42);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('MANUAL DE USUARIO', this.pageWidth / 2, 80, { align: 'center' });

    // Línea decorativa
    this.doc.setDrawColor(255, 255, 255);
    this.doc.setLineWidth(1);
    this.doc.line(40, 90, this.pageWidth - 40, 90);

    // Subtítulo
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('ReservaTusCanchas.cl', this.pageWidth / 2, 110, { align: 'center' });

    // Sistema de Reservas
    this.doc.setFontSize(16);
    this.doc.text('Sistema de Reservas Deportivas', this.pageWidth / 2, 125, { align: 'center' });

    // Información del complejo
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Complejo Deportivo', this.pageWidth / 2, 170, { align: 'center' });
    
    this.doc.setFontSize(28);
    this.doc.text('BORDE RIO', this.pageWidth / 2, 190, { align: 'center' });
    
    // Ubicación
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Quilleco, Chile', this.pageWidth / 2, 210, { align: 'center' });

    // Línea decorativa inferior
    this.doc.setLineWidth(0.5);
    this.doc.line(40, 235, this.pageWidth - 40, 235);

    // Fecha
    const fecha = new Date().toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.doc.setFontSize(12);
    this.doc.text(fecha, this.pageWidth / 2, 255, { align: 'center' });

    this.doc.addPage();
    this.currentY = this.margin;
  }

  // Generar índice
  generarIndice() {
    // Encabezado personalizado para índice
    this.doc.setFillColor(...colors.primary);
    this.doc.rect(0, 0, this.pageWidth, 50, 'F');
    
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(26);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INDICE DE CONTENIDOS', this.pageWidth / 2, 30, { align: 'center' });
    
    this.currentY = 70;
    
    const indice = [
      { titulo: '1. Introduccion al Sistema', pagina: '3' },
      { titulo: '2. Pagina Principal - Hacer Reservas', pagina: '4' },
      { titulo: '3. Consultar Reservas Existentes', pagina: '6' },
      { titulo: '4. Panel de Administracion - Owner', pagina: '7' },
      { titulo: '5. Panel de Administracion - Manager', pagina: '12' },
      { titulo: '6. Preguntas Frecuentes', pagina: '15' },
      { titulo: '7. Soporte y Contacto', pagina: '16' }
    ];

    indice.forEach((item, index) => {
      // Número
      this.doc.setFillColor(...colors.primary);
      this.doc.circle(this.margin + 5, this.currentY - 3, 5, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text((index + 1).toString(), this.margin + 5, this.currentY, { align: 'center' });
      
      // Título
      this.doc.setFontSize(13);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...colors.text);
      this.doc.text(item.titulo, this.margin + 15, this.currentY);
      
      // Página
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...colors.primary);
      this.doc.text('Pag. ' + item.pagina, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' });
      
      // Línea divisoria
      if (index < indice.length - 1) {
        this.doc.setDrawColor(220, 220, 220);
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin + 15, this.currentY + 4, this.pageWidth - this.margin - 5, this.currentY + 4);
      }
      
      this.currentY += 12;
    });

    this.doc.addPage();
    this.currentY = this.margin;
  }

  // Generar contenido completo
  generarContenido() {
    // 1. INTRODUCCION
    this.addSectionTitle('1. INTRODUCCION AL SISTEMA', '');
    
    this.addParagraph(
      'Bienvenida al sistema ReservaTusCanchas.cl, una plataforma moderna y completa para la gestión de su complejo deportivo. Este manual le guiará a través de todas las funcionalidades disponibles tanto para usuarios que desean hacer reservas como para la administración del complejo.'
    );

    this.addInfoBox(
      'Que es ReservaTusCanchas',
      'Es un sistema de reservas online que permite a sus clientes reservar canchas de forma rapida y sencilla, mientras usted puede administrar todo desde un panel moderno con estadisticas, reportes financieros y control total de su negocio.',
      'info'
    );

    this.addSubtitle('Beneficios del Sistema:');
    this.addBulletList([
      'Reservas 24/7 sin necesidad de llamadas telefonicas',
      'Pago online integrado con WebPay (Transbank)',
      'Gestion centralizada de reservas, canchas y reportes',
      'Control financiero con ingresos y gastos',
      'Reportes y estadisticas en tiempo real',
      'Sistema de permisos para diferentes roles de usuario'
    ], '>');

    this.doc.addPage();
    this.currentY = this.margin;

    // 2. PÁGINA PRINCIPAL - RESERVAS
    this.addSectionTitle('2. PAGINA PRINCIPAL - HACER RESERVAS', '');
    
    this.addSubtitle('Acceso:');
    this.addInfoBox(
      'URL Principal',
      'https://www.reservatuscanchas.cl',
      'primary'
    );

    this.addSubtitle('Proceso de Reserva (Paso a Paso):');
    
    this.addParagraph('El sistema guía al usuario a través de 6 pasos simples:');
    
    const pasosReserva = [
      {
        paso: 'Paso 1: Seleccionar Ciudad',
        descripcion: 'El usuario elige la ciudad donde desea reservar (ej: Quilleco, Los Ángeles, Santiago).'
      },
      {
        paso: 'Paso 2: Seleccionar Complejo',
        descripcion: 'Se muestran los complejos disponibles en la ciudad seleccionada. Para Quilleco aparecerá "Borde Rio".'
      },
      {
        paso: 'Paso 3: Tipo de Cancha',
        descripcion: 'El usuario selecciona el tipo de cancha (Fútbol, Pádel, etc.) según lo disponible en su complejo.'
      },
      {
        paso: 'Paso 4: Fecha y Hora',
        descripcion: 'Se muestra un calendario para seleccionar la fecha y horarios disponibles. Las horas ocupadas aparecen en rojo, las disponibles en verde.'
      },
      {
        paso: 'Paso 5: Datos Personales',
        descripcion: 'El usuario ingresa su nombre, email y teléfono para la confirmación.'
      },
      {
        paso: 'Paso 6: Confirmación y Pago',
        descripcion: 'Se muestra un resumen de la reserva con el precio total. El usuario procede al pago con WebPay.'
      }
    ];

    pasosReserva.forEach((item, index) => {
      this.checkPageBreak(25);
      
      // Número del paso en círculo
      this.doc.setFillColor(...colors.primary);
      this.doc.circle(this.margin + 5, this.currentY - 2, 4, 'F');
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text((index + 1).toString(), this.margin + 5, this.currentY + 1, { align: 'center' });
      
      // Título del paso
      this.doc.setTextColor(...colors.dark);
      this.doc.setFontSize(12);
      this.doc.text(item.paso, this.margin + 12, this.currentY);
      
      this.currentY += 6;
      
      // Descripción
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...colors.text);
      const lines = this.doc.splitTextToSize(item.descripcion, this.pageWidth - 2 * this.margin - 12);
      lines.forEach(line => {
        this.checkPageBreak(7);
        this.doc.text(line, this.margin + 12, this.currentY);
        this.currentY += 5;
      });
      
      this.currentY += 5;
    });

    this.addInfoBox(
      'Sistema de Pago',
      'Después de confirmar la reserva, el usuario es redirigido a WebPay (Transbank) para realizar el pago de forma segura. Una vez completado, recibe un email de confirmación con su código de reserva único.',
      'success'
    );

    this.doc.addPage();
    this.currentY = this.margin;

    // 3. CONSULTAR RESERVAS
    this.addSectionTitle('3. CONSULTAR RESERVAS EXISTENTES', '');
    
    this.addParagraph(
      'Los usuarios pueden consultar sus reservas existentes ingresando su código de reserva en la sección "Mis Reservas" de la página principal.'
    );

    this.addSubtitle('Información Visible:');
    this.addBulletList([
      'Código único de reserva (ejemplo: ABC123)',
      'Fecha y hora de la reserva',
      'Complejo y tipo de cancha',
      'Precio pagado',
      'Estado de la reserva (Confirmada/Pagada)',
      'Datos de contacto ingresados'
    ], '•');

    this.doc.addPage();
    this.currentY = this.margin;

    // 4. PANEL OWNER
    this.addSectionTitle('4. PANEL DE ADMINISTRACION - OWNER', '');
    
    this.addInfoBox(
      'Acceso Owner',
      'Email: admin@borderio.cl\nURL: https://www.reservatuscanchas.cl/admin-dashboard.html',
      'primary'
    );

    this.addParagraph(
      'Como dueña (Owner) del complejo, usted tiene acceso completo a todas las funcionalidades administrativas de SU complejo, incluyendo información financiera y reportes detallados.'
    );

    this.addSubtitle('Funcionalidades Disponibles:');

    // Dashboard
    this.addParagraph('📊 DASHBOARD', 0);
    this.addBulletList([
      'Vista general con estadísticas en tiempo real',
      'Total de reservas del día, semana y mes',
      'Ingresos totales generados',
      'Gráficos de ocupación de canchas',
      'Lista de reservas recientes',
      'Indicadores de rendimiento'
    ], '•');

    this.addSpace(5);

    // Reservas
    this.addParagraph('📅 GESTIÓN DE RESERVAS', 0);
    this.addBulletList([
      'Ver todas las reservas de su complejo',
      'Filtrar por fecha, cancha o estado',
      'Ver información completa incluyendo precios',
      'Editar o cancelar reservas',
      'Buscar por código de reserva',
      'Exportar listado a Excel o PDF'
    ], '•');

    this.addSpace(5);

    // Canchas
    this.addParagraph('⚽ GESTIÓN DE CANCHAS', 0);
    this.addBulletList([
      'Ver todas las canchas de su complejo',
      'Editar información: nombre, tipo, capacidad',
      'Modificar precios por hora',
      'Activar/desactivar canchas temporalmente',
      'Configurar horarios de disponibilidad',
      'Ver estadísticas de uso por cancha'
    ], '•');

    this.checkPageBreak(40);
    this.addSpace(5);

    // Reportes
    this.addParagraph('📈 REPORTES FINANCIEROS', 0);
    this.addBulletList([
      'Reporte de ingresos por período (día, semana, mes)',
      'Estadísticas de ocupación por cancha',
      'Horarios más solicitados',
      'Análisis de tendencias',
      'Gráficos comparativos',
      'Exportación de reportes a Excel/PDF'
    ], '•');

    this.addSpace(5);

    // Control de Gastos
    this.addParagraph('💰 CONTROL DE GASTOS E INGRESOS', 0);
    this.addParagraph(
      'Sistema completo de gestión financiera para llevar un control detallado de las finanzas del complejo:'
    );

    this.addSpace(3);

    this.addSubtitle('Registro de Movimientos:');
    this.addBulletList([
      'Registrar gastos con categorías predefinidas (Sueldos, Luz, Agua, Internet, Mantención, etc.)',
      'Registrar ingresos adicionales (Reservas presenciales, arriendo de equipos, venta de bebidas, torneos)',
      'Asignar fecha, monto y descripción a cada movimiento',
      'Sistema automático de comisiones de plataforma'
    ], '•');

    this.addSpace(3);

    this.addSubtitle('Categorías Disponibles:');
    
    const categoriasGastos = [
      ['Sueldos', 'Pago de sueldos a trabajadores'],
      ['Luz', 'Cuenta de electricidad'],
      ['Agua', 'Cuenta de agua'],
      ['Internet', 'Internet y teléfono'],
      ['Mantención Cancha', 'Arreglos y mantención'],
      ['Aseo', 'Productos de limpieza'],
      ['Balones y Redes', 'Equipamiento deportivo'],
      ['Arriendo', 'Arriendo del local'],
      ['Publicidad', 'Marketing y promociones'],
      ['Otros Gastos', 'Gastos varios']
    ];

    this.checkPageBreak(60);
    this.addTable(
      ['Categoría de Gasto', 'Descripción'],
      categoriasGastos,
      'Categorías de Gastos:'
    );

    this.addSpace(5);

    const categoriasIngresos = [
      ['Reservas Web', 'Reservas online'],
      ['Reservas en Cancha', 'Reservas presenciales'],
      ['Arriendo Balones', 'Arriendo de equipamiento'],
      ['Venta Bebidas', 'Venta de bebidas y snacks'],
      ['Torneos', 'Organización de torneos'],
      ['Otros Ingresos', 'Ingresos adicionales']
    ];

    this.addTable(
      ['Categoría de Ingreso', 'Descripción'],
      categoriasIngresos,
      'Categorías de Ingresos:'
    );

    this.addSpace(5);

    this.addSubtitle('Dashboard Financiero:');
    this.addBulletList([
      'Total de Ingresos del período seleccionado',
      'Total de Gastos del período',
      'Balance (Ingresos - Gastos) con indicador visual',
      'Gráfico de dona: distribución de gastos por categoría',
      'Gráfico de líneas: evolución mensual ingresos vs gastos',
      'Filtros por tipo, categoría y rango de fechas',
      'Exportación a Excel y PDF con todos los detalles'
    ], '•');

    this.addSpace(3);

    this.addInfoBox(
      'Gestión de Categorías',
      'Puede crear categorías personalizadas, editarlas y eliminarlas. Las categorías del sistema están protegidas pero siempre puede agregar las suyas propias según las necesidades específicas de su complejo.',
      'info'
    );

    this.doc.addPage();
    this.currentY = this.margin;

    // Tabla comparativa de permisos Owner
    this.addSubtitle('Resumen de Permisos - Owner:');
    
    const permisosOwner = [
      ['Dashboard', '✓ Acceso completo con estadísticas e ingresos'],
      ['Reservas', '✓ Ver, editar y gestionar (solo de su complejo)'],
      ['Complejos', '✗ No puede gestionar otros complejos'],
      ['Canchas', '✓ Gestión completa de sus canchas'],
      ['Reportes', '✓ Reportes completos de su complejo'],
      ['Control de Gastos', '✓ Acceso completo con información financiera'],
      ['Información Financiera', '✓ Ve precios, ingresos y balance']
    ];

    this.addTable(
      ['Funcionalidad', 'Permiso'],
      permisosOwner
    );

    this.doc.addPage();
    this.currentY = this.margin;

    // 5. PANEL MANAGER
    this.addSectionTitle('5. PANEL DE ADMINISTRACION - MANAGER', '');
    
    this.addInfoBox(
      'Acceso Manager',
      'Email: manager@borderio.cl\nURL: https://www.reservatuscanchas.cl/admin-dashboard.html',
      'primary'
    );

    this.addParagraph(
      'El rol de Manager (Administrador) está diseñado para personal operativo que necesita gestionar reservas y canchas, pero sin acceso a información financiera sensible.'
    );

    this.addSubtitle('Funcionalidades Disponibles:');

    // Dashboard Manager
    this.addParagraph('📊 DASHBOARD (Limitado)', 0);
    this.addBulletList([
      'Estadísticas básicas del complejo',
      'Número de reservas del día/semana/mes',
      'Ocupación de canchas',
      '✗ NO puede ver ingresos totales',
      '✗ NO puede ver información financiera'
    ], '•');

    this.addSpace(5);

    // Reservas Manager
    this.addParagraph('📅 GESTIÓN DE RESERVAS', 0);
    this.addBulletList([
      'Ver todas las reservas del complejo',
      'Filtrar por fecha, cancha o estado',
      '✗ NO puede ver precios de las reservas',
      'Editar información de contacto',
      'Ver códigos y datos de reserva',
      'Buscar por código'
    ], '•');

    this.addSpace(5);

    // Canchas Manager
    this.addParagraph('⚽ CANCHAS (Solo lectura)', 0);
    this.addBulletList([
      'Ver listado de canchas',
      'Consultar información de canchas',
      '✗ NO puede editar canchas',
      '✗ NO puede modificar precios',
      '✗ NO puede activar/desactivar'
    ], '•');

    this.addSpace(5);

    this.addInfoBox(
      'Restricciones del Manager',
      'Los managers NO tienen acceso a: Reportes financieros, Control de gastos, Gestión de complejos, ni información de precios e ingresos. Su rol es operativo, enfocado en la gestión diaria de reservas.',
      'warning'
    );

    // Tabla comparativa Manager
    this.addSubtitle('Resumen de Permisos - Manager:');
    
    const permisosManager = [
      ['Dashboard', '✓ Estadísticas básicas (sin ingresos)'],
      ['Reservas', '✓ Ver y editar (sin ver precios)'],
      ['Complejos', '✗ Sin acceso'],
      ['Canchas', '✓ Solo lectura (no puede editar)'],
      ['Reportes', '✗ Sin acceso'],
      ['Control de Gastos', '✗ Sin acceso'],
      ['Información Financiera', '✗ No ve precios ni ingresos']
    ];

    this.addTable(
      ['Funcionalidad', 'Permiso'],
      permisosManager
    );

    this.doc.addPage();
    this.currentY = this.margin;

    // 6. PREGUNTAS FRECUENTES
    this.addSectionTitle('6. PREGUNTAS FRECUENTES', '');

    const faqs = [
      {
        pregunta: '¿Cómo cambio la contraseña de mi cuenta?',
        respuesta: 'Debe contactar al administrador del sistema para solicitar un cambio de contraseña. Por seguridad, los cambios de contraseña deben ser gestionados centralmente.'
      },
      {
        pregunta: '¿Puedo crear más usuarios para mi complejo?',
        respuesta: 'Sí, puede solicitar la creación de usuarios Manager adicionales para su equipo de trabajo. Contacte al soporte técnico con los datos del nuevo usuario.'
      },
      {
        pregunta: '¿Cómo cancelo una reserva?',
        respuesta: 'Desde el panel de Reservas, busque la reserva que desea cancelar, haga clic en el botón de editar y seleccione la opción de cancelar. Se enviará automáticamente un email de notificación al cliente.'
      },
      {
        pregunta: '¿Los reportes se actualizan en tiempo real?',
        respuesta: 'Sí, todos los reportes, estadísticas y gráficos se actualizan automáticamente con cada nueva reserva o cambio en el sistema.'
      },
      {
        pregunta: '¿Puedo modificar los precios de las canchas?',
        respuesta: 'Sí, como Owner puede modificar los precios en cualquier momento desde la sección de Canchas. Los cambios aplicarán para nuevas reservas.'
      },
      {
        pregunta: '¿Cómo exporto los reportes?',
        respuesta: 'En las secciones de Reportes y Control de Gastos encontrará botones para exportar a Excel (.xlsx) o PDF. Los archivos incluyen todos los datos filtrados actualmente visibles.'
      }
    ];

    faqs.forEach(faq => {
      this.checkPageBreak(25);
      
      // Pregunta
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...colors.primary);
      const preguntaLines = this.doc.splitTextToSize('P: ' + faq.pregunta, this.pageWidth - 2 * this.margin);
      preguntaLines.forEach(line => {
        this.checkPageBreak(7);
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 6;
      });
      
      this.currentY += 2;
      
      // Respuesta
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...colors.text);
      const respuestaLines = this.doc.splitTextToSize('R: ' + faq.respuesta, this.pageWidth - 2 * this.margin - 5);
      respuestaLines.forEach(line => {
        this.checkPageBreak(7);
        this.doc.text(line, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
      
      this.currentY += 8;
    });

    this.doc.addPage();
    this.currentY = this.margin;

    // 7. SOPORTE Y CONTACTO
    this.addSectionTitle('7. SOPORTE Y CONTACTO', '');

    this.addParagraph(
      'Para cualquier consulta, problema técnico o solicitud de soporte, puede contactarnos a través de los siguientes canales:'
    );

    this.addSpace(5);

    this.addInfoBox(
      'Información de Contacto',
      'Email: soporte@reservatuscanchas.cl\nTeléfono: +56 9 XXXX XXXX\nHorario de atención: Lunes a Viernes, 9:00 - 18:00 hrs',
      'info'
    );

    this.addSpace(5);

    this.addSubtitle('Tipos de Soporte Disponibles:');
    this.addBulletList([
      '🔧 Soporte Técnico: Problemas con el sistema, errores o funcionalidades',
      '💡 Consultas de Uso: Dudas sobre cómo usar alguna funcionalidad',
      '👥 Gestión de Usuarios: Crear, modificar o eliminar usuarios',
      '⚙️ Configuración: Cambios en configuración de canchas, precios u horarios',
      '📊 Reportes Personalizados: Solicitud de reportes específicos'
    ], '');

    this.addSpace(5);

    this.addInfoBox(
      'Actualizaciones del Sistema',
      'El sistema se actualiza regularmente con nuevas funcionalidades y mejoras. Todos los cambios importantes serán notificados por email a los usuarios administradores.',
      'success'
    );

    this.addSpace(10);

    // Cierre
    this.doc.setFillColor(...colors.light);
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 40, 3, 3, 'F');
    
    this.currentY += 12;
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...colors.primary);
    this.doc.text('¡Gracias por usar ReservaTusCanchas!', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 10;
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...colors.text);
    this.doc.text('Estamos comprometidos con el éxito de su complejo deportivo', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.currentY += 8;
    
    this.doc.setFontSize(10);
    this.doc.setTextColor(...colors.textLight);
    this.doc.text('www.reservatuscanchas.cl', this.pageWidth / 2, this.currentY, { align: 'center' });
  }

  // Agregar números de página a todas las páginas
  agregarNumerosPagina() {
    const totalPages = this.doc.internal.getNumberOfPages();
    
    for (let i = 2; i <= totalPages; i++) { // Empezar desde página 2 (después de portada)
      this.doc.setPage(i);
      this.addFooter(i - 1); // Restar 1 porque la portada no cuenta
    }
  }

  // Generar PDF completo
  generar() {
    console.log('🔄 Generando PDF del manual de usuario...');
    
    // Generar todas las secciones
    this.generarPortada();
    this.generarIndice();
    this.generarContenido();
    
    // Agregar números de página
    this.agregarNumerosPagina();
    
    // Guardar PDF
    const outputPath = path.join(__dirname, '..', 'Manual_Usuario_ReservaTusCanchas.pdf');
    this.doc.save(outputPath);
    
    console.log('✅ PDF generado exitosamente:');
    console.log(`📄 ${outputPath}`);
    
    return outputPath;
  }
}

// Ejecutar generación
try {
  const manual = new ManualUsuarioPDF();
  manual.generar();
} catch (error) {
  console.error('❌ Error al generar PDF:', error);
  process.exit(1);
}


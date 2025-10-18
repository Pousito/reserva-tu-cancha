const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const { autoTable } = require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

class ReportService {
    constructor(database) {
        this.db = database;
    }

    /**
     * Generar reporte de ingresos para un complejo
     * @param {number} complexId - ID del complejo
     * @param {string} dateFrom - Fecha inicio (YYYY-MM-DD)
     * @param {string} dateTo - Fecha fin (YYYY-MM-DD)
     * @param {string} format - 'pdf' o 'excel'
     * @returns {Promise<Buffer>} - Archivo generado
     */
    async generateIncomeReport(complexId, dateFrom, dateTo, format = 'pdf') {
        try {
            console.log(`📊 Generando reporte de ingresos ${format.toUpperCase()} para complejo ${complexId}`);
            
            // Obtener datos del complejo
            const complex = await this.getComplexInfo(complexId);
            if (!complex) {
                throw new Error('Complejo no encontrado');
            }

            // Obtener datos de ingresos
            const incomeData = await this.getIncomeData(complexId, dateFrom, dateTo);
            
            // Obtener resumen por día
            const dailySummary = await this.getDailySummary(complexId, dateFrom, dateTo);
            
            // Obtener detalles de reservas
            const reservationDetails = await this.getReservationDetails(complexId, dateFrom, dateTo);

            if (format === 'pdf') {
                return await this.generatePDFReport(complex, incomeData, dailySummary, reservationDetails, dateFrom, dateTo);
            } else if (format === 'excel') {
                return await this.generateExcelReport(complex, incomeData, dailySummary, reservationDetails, dateFrom, dateTo);
            } else {
                throw new Error('Formato no soportado');
            }

        } catch (error) {
            console.error('❌ Error generando reporte de ingresos:', error);
            throw error;
        }
    }

    /**
     * Obtener información del complejo
     */
    async getComplexInfo(complexId) {
        const complex = await this.db.get(`
            SELECT c.id, c.nombre, c.direccion, c.telefono, c.email,
                   ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            WHERE c.id = $1
        `, [complexId]);

        return complex;
    }

    /**
     * Obtener datos de ingresos agregados
     */
    async getIncomeData(complexId, dateFrom, dateTo) {
        const data = await this.db.get(`
            SELECT 
                COUNT(*) as total_reservas,
                COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
                COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as reservas_canceladas,
                COALESCE(SUM(CASE WHEN estado = 'confirmada' THEN precio_total ELSE 0 END), 0) as ingresos_brutos,
                COALESCE(SUM(CASE 
                    WHEN estado = 'confirmada' AND tipo_reserva = 'directa' THEN (precio_total * 0.035)
                    WHEN estado = 'confirmada' AND tipo_reserva = 'administrativa' THEN (precio_total * 0.0175)
                    WHEN estado = 'confirmada' AND tipo_reserva IS NULL THEN (precio_total * 0.035)
                    ELSE 0 
                END), 0) as comision_plataforma,
                COALESCE(SUM(CASE 
                    WHEN estado = 'confirmada' AND tipo_reserva = 'directa' THEN (precio_total * 0.965)
                    WHEN estado = 'confirmada' AND tipo_reserva = 'administrativa' THEN (precio_total * 0.9825)
                    WHEN estado = 'confirmada' AND tipo_reserva IS NULL THEN (precio_total * 0.965)
                    ELSE 0 
                END), 0) as ingresos_netos,
                COALESCE(AVG(CASE WHEN estado = 'confirmada' THEN precio_total END), 0) as ticket_promedio
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1 
            AND r.fecha::date BETWEEN $2 AND $3
        `, [complexId, dateFrom, dateTo]);

        return data;
    }

    /**
     * Obtener resumen por día
     */
    async getDailySummary(complexId, dateFrom, dateTo) {
        const data = await this.db.query(`
            SELECT 
                r.fecha::date as fecha,
                COUNT(*) as total_reservas,
                COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
                COALESCE(SUM(CASE WHEN r.estado = 'confirmada' THEN r.precio_total ELSE 0 END), 0) as ingresos_brutos,
                COALESCE(SUM(CASE 
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva = 'directa' THEN (r.precio_total * 0.035)
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva = 'administrativa' THEN (r.precio_total * 0.0175)
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva IS NULL THEN (r.precio_total * 0.035)
                    ELSE 0 
                END), 0) as comision_plataforma,
                COALESCE(SUM(CASE 
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva = 'directa' THEN (r.precio_total * 0.965)
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva = 'administrativa' THEN (r.precio_total * 0.9825)
                    WHEN r.estado = 'confirmada' AND r.tipo_reserva IS NULL THEN (r.precio_total * 0.965)
                    ELSE 0 
                END), 0) as ingresos_netos
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1 
            AND r.fecha::date BETWEEN $2 AND $3
            GROUP BY r.fecha::date
            ORDER BY r.fecha::date
        `, [complexId, dateFrom, dateTo]);

        return data;
    }

    /**
     * Obtener detalles de reservas
     */
    async getReservationDetails(complexId, dateFrom, dateTo) {
        const data = await this.db.query(`
            SELECT 
                r.codigo_reserva,
                r.fecha::date as fecha,
                r.hora_inicio,
                r.hora_fin,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                c.nombre as cancha_nombre,
                r.precio_total,
                r.estado,
                r.estado_pago,
                r.created_at,
                CASE WHEN r.estado = 'confirmada' THEN (r.precio_total * 0.05) ELSE 0 END as comision_plataforma,
                CASE WHEN r.estado = 'confirmada' THEN (r.precio_total * 0.95) ELSE 0 END as ingreso_neto
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            WHERE c.complejo_id = $1 
            AND r.fecha::date BETWEEN $2 AND $3
            ORDER BY r.fecha::date, r.hora_inicio
        `, [complexId, dateFrom, dateTo]);

        return data;
    }

    /**
     * Generar reporte en PDF
     */
    async generatePDFReport(complex, incomeData, dailySummary, reservationDetails, dateFrom, dateTo) {
        try {
            console.log('📄 Iniciando generación de PDF...');
            const doc = new jsPDF();
        
        // Configuración de colores
        const primaryColor = [41, 128, 185]; // Azul
        const secondaryColor = [52, 73, 94]; // Gris oscuro
        const successColor = [39, 174, 96]; // Verde
        const dangerColor = [231, 76, 60]; // Rojo

        // Intentar cargar logo del complejo
        let logoAdded = false;
        try {
            // Mapeo de complejos a logos (por nombre para evitar problemas de ID entre desarrollo/producción)
            let logoFilename = null;
            
            if (complex.nombre && complex.nombre.toLowerCase().includes('demo 3')) {
                logoFilename = 'demo3-new-life-galilea.png';
                console.log(`🔍 Complejo Demo 3 detectado por nombre: ${complex.nombre}`);
            } else {
                // Mapeo por ID para otros complejos
                const logoMap = {
                    1: 'borde-rio.png',  // Complejo En Desarrollo
                    2: 'borde-rio.png',  // Complejo Demo 1
                    7: 'borde-rio.png',  // Espacio Deportivo Borde Río (producción)
                    8: 'demo3-new-life-galilea.png'  // Complejo Demo 3 (producción)
                };
                logoFilename = logoMap[complex.id];
                console.log(`🔍 Buscando logo para complejo ID: ${complex.id}, nombre: ${complex.nombre}`);
            }
            
            console.log(`🔍 Nombre de archivo del logo: ${logoFilename}`);
            
            if (logoFilename) {
                const logoPath = path.join(__dirname, '../../public/images/logos', logoFilename);
                console.log(`🔍 Ruta completa del logo: ${logoPath}`);
                console.log(`🔍 ¿Existe el archivo?: ${fs.existsSync(logoPath)}`);
                
                if (fs.existsSync(logoPath)) {
                    const logoData = fs.readFileSync(logoPath);
                    console.log(`🔍 Tamaño del logo: ${logoData.length} bytes`);
                    const logoBase64 = logoData.toString('base64');
                    const logoDataUri = `data:image/png;base64,${logoBase64}`;
                    
                    // Agregar logo en esquina superior derecha (20x20mm)
                    // Posición ajustada para asegurar que esté dentro de los márgenes
                    doc.addImage(logoDataUri, 'PNG', 170, 10, 20, 20);
                    logoAdded = true;
                    console.log(`✅ Logo del complejo agregado al PDF: ${logoFilename} en posición (170, 10)`);
                } else {
                    console.log(`⚠️  Archivo de logo no encontrado en: ${logoPath}`);
                }
            } else {
                console.log(`⚠️  No hay logo configurado para complejo ID: ${complex.id}`);
            }
        } catch (logoError) {
            console.log('⚠️  Error cargando el logo:', logoError.message);
            console.log('⚠️  Stack:', logoError.stack);
        }

        // Título principal (ajustar posición si hay logo)
        const titleY = logoAdded ? 30 : 20;
        doc.setFontSize(20);
        doc.setTextColor(...primaryColor);
        doc.text('REPORTE DE INGRESOS', 20, titleY);
        
        // Información del complejo (ajustar posición si hay logo)
        const infoY = logoAdded ? 45 : 40;
        doc.setFontSize(12);
        doc.setTextColor(...secondaryColor);
        doc.text(`${complex.nombre}`, 20, infoY);
        doc.text(`${complex.direccion}`, 20, infoY + 7);
        doc.text(`${complex.ciudad_nombre}`, 20, infoY + 14);
        if (complex.telefono) doc.text(`Tel: ${complex.telefono}`, 20, infoY + 21);
        if (complex.email) doc.text(`Email: ${complex.email}`, 20, infoY + 28);

        // Período del reporte
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const periodoY = infoY + (complex.email ? 40 : 35);
        doc.text(`Período: ${this.formatDate(dateFrom)} al ${this.formatDate(dateTo)}`, 20, periodoY);
        doc.text(`Generado el: ${this.formatDate(new Date().toISOString().split('T')[0])}`, 20, periodoY + 7);

        let yPosition = periodoY + 20;

        // Resumen general
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('RESUMEN GENERAL', 20, yPosition);
        yPosition += 15;

        // Calcular porcentaje de comisión real
        const porcentajeComision = incomeData.ingresos_brutos > 0 ? 
            ((incomeData.comision_plataforma / incomeData.ingresos_brutos) * 100).toFixed(2) : '0.00';

        // Tabla de resumen
        const summaryData = [
            ['Total de Reservas', incomeData.total_reservas.toString()],
            ['Reservas Confirmadas', incomeData.reservas_confirmadas.toString()],
            ['Reservas Canceladas', incomeData.reservas_canceladas.toString()],
            ['Ingresos Brutos', `$${this.formatNumber(incomeData.ingresos_brutos)}`],
            [`Comisión Plataforma (${porcentajeComision}%)`, `$${this.formatNumber(incomeData.comision_plataforma)}`],
            ['Ingresos Netos', `$${this.formatNumber(incomeData.ingresos_netos)}`],
            ['Ticket Promedio', `$${this.formatNumber(incomeData.ticket_promedio)}`]
        ];

        autoTable(doc, {
            startY: yPosition,
            head: [['Concepto', 'Valor']],
            body: summaryData,
            theme: 'grid',
            headStyles: { 
                fillColor: primaryColor, 
                textColor: [255, 255, 255],
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8
            },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 14 },
            tableWidth: 'auto',
            columnStyles: {
                0: { cellWidth: 'auto', minCellWidth: 70 },
                1: { cellWidth: 'auto', minCellWidth: 30, halign: 'right' }
            }
        });

        yPosition = doc.lastAutoTable.finalY + 20;

        // Resumen por día
        if (dailySummary.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('RESUMEN POR DÍA', 20, yPosition);
            yPosition += 15;

            const dailyData = dailySummary.map(day => [
                this.formatDate(day.fecha),
                day.total_reservas.toString(),
                day.reservas_confirmadas.toString(),
                `$${this.formatNumber(day.ingresos_brutos)}`,
                `$${this.formatNumber(day.comision_plataforma)}`,
                `$${this.formatNumber(day.ingresos_netos)}`
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['Fecha', 'Total', 'Conf.', 'Ing. Brutos', 'Com.', 'Ing. Netos']],
                body: dailyData,
                theme: 'grid',
                headStyles: { 
                    fillColor: primaryColor, 
                    textColor: [255, 255, 255],
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 7
                },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 14 },
                tableWidth: 'auto',
                columnStyles: {
                    0: { cellWidth: 'auto', minCellWidth: 22 },
                    1: { cellWidth: 'auto', minCellWidth: 18, halign: 'center' },
                    2: { cellWidth: 'auto', minCellWidth: 18, halign: 'center' },
                    3: { cellWidth: 'auto', minCellWidth: 28, halign: 'right' },
                    4: { cellWidth: 'auto', minCellWidth: 22, halign: 'right' },
                    5: { cellWidth: 'auto', minCellWidth: 28, halign: 'right' }
                }
            });

            yPosition = doc.lastAutoTable.finalY + 20;
        }

        // Detalles de reservas (solo si hay espacio)
        if (reservationDetails.length > 0 && yPosition < 250) {
            doc.setFontSize(14);
            doc.setTextColor(...primaryColor);
            doc.text('DETALLES DE RESERVAS', 20, yPosition);
            yPosition += 15;

            // Limitar a las primeras 20 reservas para evitar que el PDF sea muy largo
            const limitedDetails = reservationDetails.slice(0, 20);
            const detailsData = limitedDetails.map(res => [
                res.codigo_reserva,
                this.formatDate(res.fecha),
                res.hora_inicio,
                res.cancha_nombre,
                res.nombre_cliente,
                `$${this.formatNumber(res.precio_total)}`,
                res.estado
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['Código', 'Fecha', 'Hora', 'Cancha', 'Cliente', 'Monto', 'Estado']],
                body: detailsData,
                theme: 'grid',
                headStyles: { 
                    fillColor: primaryColor, 
                    textColor: [255, 255, 255],
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 7
                },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 14, right: 14 },
                tableWidth: 'auto',
                columnStyles: {
                    0: { cellWidth: 'auto', minCellWidth: 18 },
                    1: { cellWidth: 'auto', minCellWidth: 22 },
                    2: { cellWidth: 'auto', minCellWidth: 15, halign: 'center' },
                    3: { cellWidth: 'auto', minCellWidth: 22 },
                    4: { cellWidth: 'auto', minCellWidth: 30 },
                    5: { cellWidth: 'auto', minCellWidth: 20, halign: 'right' },
                    6: { cellWidth: 'auto', minCellWidth: 20, halign: 'center' }
                }
            });

            if (reservationDetails.length > 20) {
                yPosition = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`* Mostrando las primeras 20 reservas de ${reservationDetails.length} totales`, 20, yPosition);
            }
        }

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Página ${i} de ${pageCount}`, 20, doc.internal.pageSize.height - 10);
            doc.text('ReservaTusCanchas.cl', doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 10);
        }

            console.log('📄 PDF generado exitosamente');
            
            // Usar datauristring y extraer el buffer correctamente
            const dataUri = doc.output('datauristring');
            const base64Data = dataUri.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            
            console.log('📄 Tamaño del PDF:', buffer.length, 'bytes');
            console.log('📄 Primeros bytes del PDF:', buffer.slice(0, 10).toString('hex'));
            
            return buffer;
        } catch (error) {
            console.error('❌ Error generando PDF:', error);
            throw error;
        }
    }

    /**
     * Generar reporte en Excel
     */
    async generateExcelReport(complex, incomeData, dailySummary, reservationDetails, dateFrom, dateTo) {
        try {
            console.log('📊 Iniciando generación de Excel...');
            const workbook = new ExcelJS.Workbook();
        
        // Configuración del workbook
        workbook.creator = 'Reserva Tu Cancha';
        workbook.lastModifiedBy = 'Sistema de Reportes';
        workbook.created = new Date();
        workbook.modified = new Date();

        // Hoja 1: Resumen General
        const summarySheet = workbook.addWorksheet('Resumen General');
        
        // Título con fondo degradado
        summarySheet.mergeCells('A1:H1');
        summarySheet.getCell('A1').value = '📊 REPORTE DE INGRESOS';
        summarySheet.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getCell('A1').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4A90E2' }
        };
        summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(1).height = 30;

        // Información del complejo con estilo
        summarySheet.getCell('A3').value = '🏢 Complejo:';
        summarySheet.getCell('A3').font = { bold: true, color: { argb: 'FF4A90E2' } };
        summarySheet.getCell('B3').value = complex.nombre;
        summarySheet.getCell('B3').font = { size: 12, bold: true };
        
        summarySheet.getCell('A4').value = '📍 Dirección:';
        summarySheet.getCell('A4').font = { bold: true, color: { argb: 'FF7F8C8D' } };
        summarySheet.getCell('B4').value = complex.direccion;
        
        summarySheet.getCell('A5').value = '🌆 Ciudad:';
        summarySheet.getCell('A5').font = { bold: true, color: { argb: 'FF7F8C8D' } };
        summarySheet.getCell('B5').value = complex.ciudad_nombre;
        
        if (complex.telefono) {
            summarySheet.getCell('A6').value = '📞 Teléfono:';
            summarySheet.getCell('A6').font = { bold: true, color: { argb: 'FF7F8C8D' } };
            summarySheet.getCell('B6').value = complex.telefono;
        }
        if (complex.email) {
            summarySheet.getCell('A7').value = '📧 Email:';
            summarySheet.getCell('A7').font = { bold: true, color: { argb: 'FF7F8C8D' } };
            summarySheet.getCell('B7').value = complex.email;
        }

        // Período con fondo
        summarySheet.getCell('A9').value = '📅 Período:';
        summarySheet.getCell('A9').font = { bold: true, color: { argb: 'FF4A90E2' } };
        summarySheet.getCell('B9').value = `${this.formatDate(dateFrom)} al ${this.formatDate(dateTo)}`;
        summarySheet.getCell('B9').font = { bold: true };
        
        summarySheet.getCell('A10').value = '🕐 Generado:';
        summarySheet.getCell('A10').font = { bold: true, color: { argb: 'FF7F8C8D' } };
        summarySheet.getCell('B10').value = this.formatDate(new Date().toISOString().split('T')[0]);

        // Resumen general con encabezado destacado
        summarySheet.mergeCells('A12:B12');
        summarySheet.getCell('A12').value = '💰 RESUMEN GENERAL';
        summarySheet.getCell('A12').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        summarySheet.getCell('A12').fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF27AE60' }
        };
        summarySheet.getCell('A12').alignment = { horizontal: 'center', vertical: 'middle' };
        summarySheet.getRow(12).height = 25;

        // Calcular porcentaje de comisión real
        const porcentajeComision = incomeData.ingresos_brutos > 0 ? 
            ((incomeData.comision_plataforma / incomeData.ingresos_brutos) * 100).toFixed(2) : '0.00';

        // Encabezados de tabla
        const headerRow = summarySheet.getRow(13);
        headerRow.values = ['Concepto', 'Valor'];
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5DADE2' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 20;

        const summaryData = [
            ['📊 Total de Reservas', Math.round(incomeData.total_reservas)],
            ['✅ Reservas Confirmadas', Math.round(incomeData.reservas_confirmadas)],
            ['❌ Reservas Canceladas', Math.round(incomeData.reservas_canceladas)],
            ['💵 Ingresos Brutos', Math.round(incomeData.ingresos_brutos)],
            [`🏦 Comisión Plataforma (${porcentajeComision}%)`, Math.round(incomeData.comision_plataforma)],
            ['💰 Ingresos Netos', Math.round(incomeData.ingresos_netos)],
            ['🎯 Ticket Promedio', Math.round(incomeData.ticket_promedio)]
        ];

        summarySheet.addRows(summaryData);

        // Aplicar alternancia de colores y bordes
        for (let i = 14; i <= 20; i++) {
            const row = summarySheet.getRow(i);
            const cellA = summarySheet.getCell(`A${i}`);
            const cellB = summarySheet.getCell(`B${i}`);
            
            // Alternancia de filas
            if (i % 2 === 0) {
                cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F8' } };
                cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4F8' } };
            }
            
            // Bordes
            const borderStyle = { style: 'thin', color: { argb: 'FFB0BEC5' } };
            cellA.border = {
                top: borderStyle,
                left: borderStyle,
                bottom: borderStyle,
                right: borderStyle
            };
            cellB.border = {
                top: borderStyle,
                left: borderStyle,
                bottom: borderStyle,
                right: borderStyle
            };
            
            // Alineación
            cellB.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Ajustar ancho de columnas
        summarySheet.getColumn('A').width = 35;
        summarySheet.getColumn('B').width = 20;
        
        // Ajustar altura de filas para que los emojis se vean bien
        summarySheet.getRow(3).height = 22; // Info complejo
        summarySheet.getRow(4).height = 22;
        summarySheet.getRow(5).height = 22;
        summarySheet.getRow(6).height = 22;
        summarySheet.getRow(7).height = 22;
        summarySheet.getRow(9).height = 22; // Período
        summarySheet.getRow(10).height = 22;
        summarySheet.getRow(13).height = 24; // Encabezados
        
        // Altura para filas de datos (con emojis)
        for (let i = 14; i <= 20; i++) {
            summarySheet.getRow(i).height = 22;
        }

        // Formatear números como enteros (sin decimales)
        summarySheet.getCell('B14').numFmt = '0';
        summarySheet.getCell('B15').numFmt = '0';
        summarySheet.getCell('B16').numFmt = '0';
        summarySheet.getCell('B17').numFmt = '"$"#,##0';
        summarySheet.getCell('B18').numFmt = '"$"#,##0';
        summarySheet.getCell('B19').numFmt = '"$"#,##0';
        summarySheet.getCell('B20').numFmt = '"$"#,##0';
        
        // Resaltar ingresos netos
        summarySheet.getCell('A19').font = { bold: true, size: 11 };
        summarySheet.getCell('B19').font = { bold: true, size: 11, color: { argb: 'FF27AE60' } };

        // Hoja 2: Resumen por Día
        if (dailySummary.length > 0) {
            const dailySheet = workbook.addWorksheet('📅 Resumen por Día');
            
            // Título
            dailySheet.mergeCells('A1:F1');
            dailySheet.getCell('A1').value = '📅 RESUMEN DIARIO DE INGRESOS';
            dailySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            dailySheet.getCell('A1').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF9B59B6' }
            };
            dailySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
            dailySheet.getRow(1).height = 28;

            const dailyHeaders = ['📆 Fecha', '📊 Total', '✅ Confirmadas', '💵 Ing. Brutos', '🏦 Comisión', '💰 Ing. Netos'];
            const headerRow = dailySheet.addRow(dailyHeaders);

            // Formatear encabezados
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF8E44AD' }
            };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            headerRow.height = 22;

            let rowIndex = 3;
            dailySummary.forEach((day, index) => {
                const dataRow = dailySheet.addRow([
                    day.fecha,
                    Math.round(day.total_reservas),
                    Math.round(day.reservas_confirmadas),
                    Math.round(day.ingresos_brutos),
                    Math.round(day.comision_plataforma),
                    Math.round(day.ingresos_netos)
                ]);
                
                // Alternancia de colores
                if (index % 2 === 0) {
                    for (let col = 1; col <= 6; col++) {
                        const cell = dailySheet.getCell(rowIndex, col);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4ECF7' } };
                    }
                }
                
                // Bordes y alineación
                for (let col = 1; col <= 6; col++) {
                    const cell = dailySheet.getCell(rowIndex, col);
                    const borderStyle = { style: 'thin', color: { argb: 'FFB0BEC5' } };
                    cell.border = {
                        top: borderStyle,
                        left: borderStyle,
                        bottom: borderStyle,
                        right: borderStyle
                    };
                    if (col > 1) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                }
                rowIndex++;
            });

            // Ajustar ancho de columnas
            dailySheet.getColumn('A').width = 14;
            dailySheet.getColumn('B').width = 12;
            dailySheet.getColumn('C').width = 14;
            dailySheet.getColumn('D').width = 16;
            dailySheet.getColumn('E').width = 14;
            dailySheet.getColumn('F').width = 16;
            
            // Ajustar altura de filas para emojis
            dailySheet.getRow(2).height = 24; // Encabezados
            for (let i = 3; i < rowIndex; i++) {
                dailySheet.getRow(i).height = 21; // Datos
            }

            // Formatear columnas de moneda (sin decimales)
            for (let i = 3; i < rowIndex; i++) {
                dailySheet.getCell(`B${i}`).numFmt = '0';
                dailySheet.getCell(`C${i}`).numFmt = '0';
                dailySheet.getCell(`D${i}`).numFmt = '"$"#,##0';
                dailySheet.getCell(`E${i}`).numFmt = '"$"#,##0';
                dailySheet.getCell(`F${i}`).numFmt = '"$"#,##0';
            }

        }

        // Hoja 3: Detalles de Reservas
        if (reservationDetails.length > 0) {
            const detailsSheet = workbook.addWorksheet('📝 Detalles Reservas');
            
            // Título
            detailsSheet.mergeCells('A1:M1');
            detailsSheet.getCell('A1').value = '📝 DETALLE COMPLETO DE RESERVAS';
            detailsSheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            detailsSheet.getCell('A1').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE67E22' }
            };
            detailsSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
            detailsSheet.getRow(1).height = 28;

            const detailHeaders = ['🔖 Código', '📆 Fecha', '⏰ Hora Inicio', '⏱️ Hora Fin', '⚽ Cancha', '👤 Cliente', '📧 Email', '📞 Teléfono', '💵 Monto', '🏦 Comisión', '💰 Ing. Neto', '📊 Estado', '💳 Pago'];
            const headerRow = detailsSheet.addRow(detailHeaders);

            // Formatear encabezados
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD35400' }
            };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            headerRow.height = 22;

            let rowIndex = 3;
            reservationDetails.forEach((res, index) => {
                const dataRow = detailsSheet.addRow([
                    res.codigo_reserva,
                    res.fecha,
                    res.hora_inicio,
                    res.hora_fin,
                    res.cancha_nombre,
                    res.nombre_cliente,
                    res.email_cliente,
                    res.telefono_cliente,
                    res.precio_total,
                    res.comision_plataforma,
                    res.ingreso_neto,
                    res.estado,
                    res.estado_pago
                ]);
                
                // Alternancia de colores
                if (index % 2 === 0) {
                    for (let col = 1; col <= 13; col++) {
                        const cell = detailsSheet.getCell(rowIndex, col);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF5E7' } };
                    }
                }
                
                // Bordes y alineación
                for (let col = 1; col <= 13; col++) {
                    const cell = detailsSheet.getCell(rowIndex, col);
                    const borderStyle = { style: 'thin', color: { argb: 'FFB0BEC5' } };
                    cell.border = {
                        top: borderStyle,
                        left: borderStyle,
                        bottom: borderStyle,
                        right: borderStyle
                    };
                    
                    // Alineación según tipo de dato
                    if (col >= 9 && col <= 11) { // Montos
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                    } else if (col >= 2 && col <= 4) { // Fechas y horas
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                }
                
                // Color estado
                const estadoCell = detailsSheet.getCell(rowIndex, 12);
                if (res.estado === 'confirmada') {
                    estadoCell.font = { color: { argb: 'FF27AE60' }, bold: true };
                } else if (res.estado === 'cancelada') {
                    estadoCell.font = { color: { argb: 'FFE74C3C' }, bold: true };
                }
                
                // Color estado pago
                const pagoCell = detailsSheet.getCell(rowIndex, 13);
                if (res.estado_pago === 'completado') {
                    pagoCell.font = { color: { argb: 'FF27AE60' }, bold: true };
                } else if (res.estado_pago === 'pendiente') {
                    pagoCell.font = { color: { argb: 'FFF39C12' }, bold: true };
                }
                
                rowIndex++;
            });

            // Formatear columnas de moneda
            for (let i = 3; i < rowIndex; i++) {
                detailsSheet.getCell(`I${i}`).numFmt = '"$"#,##0';
                detailsSheet.getCell(`J${i}`).numFmt = '"$"#,##0';
                detailsSheet.getCell(`K${i}`).numFmt = '"$"#,##0';
            }

            // Ajustar ancho de columnas
            detailsSheet.columns = [
                { width: 14 }, // Código
                { width: 12 }, // Fecha
                { width: 12 }, // Hora Inicio
                { width: 12 }, // Hora Fin
                { width: 20 }, // Cancha
                { width: 25 }, // Cliente
                { width: 30 }, // Email
                { width: 15 }, // Teléfono
                { width: 14 }, // Monto
                { width: 14 }, // Comisión
                { width: 14 }, // Ingreso Neto
                { width: 13 }, // Estado
                { width: 13 }  // Estado Pago
            ];
            
            // Ajustar altura de filas para emojis
            detailsSheet.getRow(2).height = 24; // Encabezados
            for (let i = 3; i < rowIndex; i++) {
                detailsSheet.getRow(i).height = 21; // Datos
            }
        }

            console.log('📊 Excel generado exitosamente');
            return await workbook.xlsx.writeBuffer();
        } catch (error) {
            console.error('❌ Error generando Excel:', error);
            throw error;
        }
    }

    /**
     * Formatear fecha para mostrar
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Formatear número con separadores de miles
     */
    formatNumber(number) {
        return new Intl.NumberFormat('es-CL').format(Math.round(number));
    }
}

module.exports = ReportService;

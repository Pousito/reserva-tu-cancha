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
     * Generar reporte de ingresos diarios para un complejo
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
            // Mapeo de complejos a logos (usando IDs de producción y desarrollo)
            const logoMap = {
                6: 'borde-rio.png',  // Desarrollo
                7: 'borde-rio.png'   // Producción
            };
            
            const logoFilename = logoMap[complex.id];
            if (logoFilename) {
                const logoPath = path.join(__dirname, '../../public/images/logos', logoFilename);
                if (fs.existsSync(logoPath)) {
                    const logoData = fs.readFileSync(logoPath);
                    const logoBase64 = logoData.toString('base64');
                    const logoDataUri = `data:image/png;base64,${logoBase64}`;
                    
                    // Agregar logo en esquina superior derecha (20x20mm)
                    doc.addImage(logoDataUri, 'PNG', 175, 7, 20, 20);
                    logoAdded = true;
                    console.log(`✅ Logo del complejo agregado al PDF: ${logoFilename}`);
                }
            }
        } catch (logoError) {
            console.log('⚠️  No se pudo cargar el logo:', logoError.message);
        }

        // Título principal (ajustar posición si hay logo)
        const titleY = logoAdded ? 30 : 20;
        doc.setFontSize(20);
        doc.setTextColor(...primaryColor);
        doc.text('REPORTE DE INGRESOS DIARIOS', 20, titleY);
        
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
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 20, right: 20 },
            columnStyles: {
                0: { cellWidth: 100 }, // Concepto - más ancho para "Comisión Plataforma (5%)"
                1: { cellWidth: 50 }   // Valor
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
                head: [['Fecha', 'Total Reservas', 'Confirmadas', 'Ingresos Brutos', 'Comisión', 'Ingresos Netos']],
                body: dailyData,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 25 }
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
                headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { left: 20, right: 20 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 15 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 20 },
                    6: { cellWidth: 20 }
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
            doc.text('Generado por Reserva Tu Cancha', doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 10);
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
        
        // Título
        summarySheet.mergeCells('A1:H1');
        summarySheet.getCell('A1').value = 'REPORTE DE INGRESOS DIARIOS';
        summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2980B9' } };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        // Información del complejo
        summarySheet.getCell('A3').value = 'Complejo:';
        summarySheet.getCell('B3').value = complex.nombre;
        summarySheet.getCell('A4').value = 'Dirección:';
        summarySheet.getCell('B4').value = complex.direccion;
        summarySheet.getCell('A5').value = 'Ciudad:';
        summarySheet.getCell('B5').value = complex.ciudad_nombre;
        if (complex.telefono) {
            summarySheet.getCell('A6').value = 'Teléfono:';
            summarySheet.getCell('B6').value = complex.telefono;
        }
        if (complex.email) {
            summarySheet.getCell('A7').value = 'Email:';
            summarySheet.getCell('B7').value = complex.email;
        }

        // Período
        summarySheet.getCell('A9').value = 'Período:';
        summarySheet.getCell('B9').value = `${this.formatDate(dateFrom)} al ${this.formatDate(dateTo)}`;
        summarySheet.getCell('A10').value = 'Generado:';
        summarySheet.getCell('B10').value = this.formatDate(new Date().toISOString().split('T')[0]);

        // Resumen general
        summarySheet.getCell('A12').value = 'RESUMEN GENERAL';
        summarySheet.getCell('A12').font = { size: 14, bold: true, color: { argb: 'FF2980B9' } };

        // Calcular porcentaje de comisión real
        const porcentajeComision = incomeData.ingresos_brutos > 0 ? 
            ((incomeData.comision_plataforma / incomeData.ingresos_brutos) * 100).toFixed(2) : '0.00';

        const summaryData = [
            ['Concepto', 'Valor'],
            ['Total de Reservas', Math.round(incomeData.total_reservas)],
            ['Reservas Confirmadas', Math.round(incomeData.reservas_confirmadas)],
            ['Reservas Canceladas', Math.round(incomeData.reservas_canceladas)],
            ['Ingresos Brutos', Math.round(incomeData.ingresos_brutos)],
            [`Comisión Plataforma (${porcentajeComision}%)`, Math.round(incomeData.comision_plataforma)],
            ['Ingresos Netos', Math.round(incomeData.ingresos_netos)],
            ['Ticket Promedio', Math.round(incomeData.ticket_promedio)]
        ];

        summarySheet.addRows(summaryData);

        // Ajustar ancho de columnas
        summarySheet.getColumn('A').width = 25; // Concepto - más ancho para "Comisión Plataforma (5%)"
        summarySheet.getColumn('B').width = 15; // Valor

        // Formatear números como enteros (sin decimales)
        summarySheet.getCell('B14').numFmt = '0'; // Total de Reservas
        summarySheet.getCell('B15').numFmt = '0'; // Reservas Confirmadas
        summarySheet.getCell('B16').numFmt = '0'; // Reservas Canceladas
        summarySheet.getCell('B17').numFmt = '"$"#,##0'; // Ingresos Brutos
        summarySheet.getCell('B18').numFmt = '"$"#,##0'; // Comisión Plataforma
        summarySheet.getCell('B19').numFmt = '"$"#,##0'; // Ingresos Netos
        summarySheet.getCell('B20').numFmt = '"$"#,##0'; // Ticket Promedio

        // Hoja 2: Resumen por Día
        if (dailySummary.length > 0) {
            const dailySheet = workbook.addWorksheet('Resumen por Día');
            
            dailySheet.getCell('A1').value = 'RESUMEN POR DÍA';
            dailySheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF2980B9' } };

            const dailyHeaders = ['Fecha', 'Total Reservas', 'Confirmadas', 'Ingresos Brutos', 'Comisión', 'Ingresos Netos'];
            dailySheet.addRow(dailyHeaders);

            // Formatear encabezados
            const headerRow = dailySheet.getRow(2);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2980B9' }
            };
            headerRow.font = { color: { argb: 'FFFFFFFF' } };

            dailySummary.forEach(day => {
                dailySheet.addRow([
                    day.fecha,
                    Math.round(day.total_reservas),
                    Math.round(day.reservas_confirmadas),
                    Math.round(day.ingresos_brutos),
                    Math.round(day.comision_plataforma),
                    Math.round(day.ingresos_netos)
                ]);
            });

            // Ajustar ancho de columnas
            dailySheet.getColumn('A').width = 12; // Fecha
            dailySheet.getColumn('B').width = 15; // Total Reservas
            dailySheet.getColumn('C').width = 12; // Confirmadas
            dailySheet.getColumn('D').width = 15; // Ingresos Brutos
            dailySheet.getColumn('E').width = 12; // Comisión
            dailySheet.getColumn('F').width = 15; // Ingresos Netos

            // Formatear columnas de moneda (sin decimales)
            dailySheet.getColumn('B').numFmt = '0'; // Total Reservas
            dailySheet.getColumn('C').numFmt = '0'; // Confirmadas
            dailySheet.getColumn('D').numFmt = '"$"#,##0'; // Ingresos Brutos
            dailySheet.getColumn('E').numFmt = '"$"#,##0'; // Comisión
            dailySheet.getColumn('F').numFmt = '"$"#,##0'; // Ingresos Netos

        }

        // Hoja 3: Detalles de Reservas
        if (reservationDetails.length > 0) {
            const detailsSheet = workbook.addWorksheet('Detalles de Reservas');
            
            detailsSheet.getCell('A1').value = 'DETALLES DE RESERVAS';
            detailsSheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF2980B9' } };

            const detailHeaders = ['Código', 'Fecha', 'Hora Inicio', 'Hora Fin', 'Cancha', 'Cliente', 'Email', 'Teléfono', 'Monto', 'Comisión', 'Ingreso Neto', 'Estado', 'Estado Pago'];
            detailsSheet.addRow(detailHeaders);

            // Formatear encabezados
            const detailHeaderRow = detailsSheet.getRow(2);
            detailHeaderRow.font = { bold: true };
            detailHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2980B9' }
            };
            detailHeaderRow.font = { color: { argb: 'FFFFFFFF' } };

            reservationDetails.forEach(res => {
                detailsSheet.addRow([
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
            });

            // Formatear columnas de moneda
            detailsSheet.getColumn('I').numFmt = '"$"#,##0.00';
            detailsSheet.getColumn('J').numFmt = '"$"#,##0.00';
            detailsSheet.getColumn('K').numFmt = '"$"#,##0.00';

            // Ajustar ancho de columnas
            detailsSheet.columns = [
                { width: 15 }, // Código
                { width: 12 }, // Fecha
                { width: 12 }, // Hora Inicio
                { width: 12 }, // Hora Fin
                { width: 20 }, // Cancha
                { width: 25 }, // Cliente
                { width: 30 }, // Email
                { width: 15 }, // Teléfono
                { width: 15 }, // Monto
                { width: 15 }, // Comisión
                { width: 15 }, // Ingreso Neto
                { width: 12 }, // Estado
                { width: 12 }  // Estado Pago
            ];
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

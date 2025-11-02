const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function convertirHTMLaPDF() {
  console.log('🚀 Iniciando conversión HTML a PDF para Espacio Deportivo Borde Río...');
  
  try {
    // Iniciar navegador
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Cargar el archivo HTML
    const htmlPath = path.join(__dirname, '..', 'Manual_Usuario_EspacioDeportivoBordeRio.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // Configurar el PDF
    const pdfPath = path.join(__dirname, '..', 'Manual_Usuario_EspacioDeportivoBordeRio.pdf');
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `
    });
    
    await browser.close();
    
    console.log('✅ PDF generado exitosamente!');
    console.log(`📄 Archivo creado: ${pdfPath}`);
    console.log('🎯 El manual está listo para entregar a Magdalena Espinoza');
    
    return pdfPath;
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  convertirHTMLaPDF()
    .then(() => {
      console.log('🎉 ¡Conversión completada!');
      console.log('📧 El PDF está listo para adjuntar al correo de entrega');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
}

module.exports = { convertirHTMLaPDF };



const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Iniciando conversión HTML a PDF para Espacio Deportivo Borde Río (versión 2 con logo)...');
  
  const htmlPath = path.join(__dirname, '..', 'Manual_Usuario_EspacioDeportivoBordeRio2.html');
  const pdfPath = path.join(__dirname, '..', 'Manual_Usuario_EspacioDeportivoBordeRio2.pdf');
  
  if (!fs.existsSync(htmlPath)) {
    console.error('❌ Error: No se encuentra el archivo HTML');
    process.exit(1);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, {
    waitUntil: 'networkidle0'
  });
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    }
  });
  
  await browser.close();
  
  console.log('✅ PDF generado exitosamente!');
  console.log('📄 Archivo creado:', pdfPath);
  console.log('🎯 El manual con logo está listo para entregar a Magdalena Espinoza');
  console.log('🎉 ¡Conversión completada!');
})();

const puppeteer = require('puppeteer');
const path = require('path');

async function capturarImagenInstagram() {
    try {
        console.log('🚀 Iniciando captura de imagen...');
        
        // Lanzar navegador
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Configurar viewport para Instagram (1080x1080)
        await page.setViewport({
            width: 1080,
            height: 1080,
            deviceScaleFactor: 2 // Para alta resolución
        });
        
        // Cargar el archivo HTML
        const htmlPath = path.join(__dirname, 'generar-html-instagram.html');
        const fileUrl = `file://${htmlPath}`;
        
        console.log('📄 Cargando HTML:', fileUrl);
        await page.goto(fileUrl, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Esperar a que se carguen todos los elementos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Capturar screenshot
        console.log('📸 Capturando imagen...');
        await page.screenshot({
            path: 'Instagram_ReservaTusCanchas_Profesional.png',
            type: 'png',
            fullPage: false,
            clip: {
                x: 0,
                y: 0,
                width: 1080,
                height: 1080
            }
        });
        
        await browser.close();
        
        console.log('✅ Imagen profesional generada: Instagram_ReservaTusCanchas_Profesional.png');
        
    } catch (error) {
        console.error('❌ Error capturando imagen:', error.message);
    }
}

// Ejecutar la función
capturarImagenInstagram();

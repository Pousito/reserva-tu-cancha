const fs = require('fs');
const path = require('path');
const { obtenerLogosBase64 } = require('./convertir-logos-base64');

function actualizarLogosEnManual() {
    console.log('🎨 Actualizando logos en el manual...');
    
    // Obtener los logos en base64
    const logos = obtenerLogosBase64();
    
    if (!logos.reservatuscanchas || !logos.bordeRio) {
        console.error('❌ Error: No se pudieron obtener los logos');
        return;
    }
    
    // Leer el archivo HTML actual
    const htmlPath = path.join(__dirname, '..', 'Manual_Usuario_EspacioDeportivoBordeRio.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Reemplazar los placeholders con los logos reales
    htmlContent = htmlContent.replace(
        'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="ReservaTusCanchas"',
        `src="${logos.reservatuscanchas}" alt="ReservaTusCanchas"`
    );
    
    htmlContent = htmlContent.replace(
        'src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" alt="Espacio Deportivo Borde Río"',
        `src="${logos.bordeRio}" alt="Espacio Deportivo Borde Río"`
    );
    
    // Guardar el archivo actualizado
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log('✅ Logos actualizados en el manual HTML');
    console.log('📄 Archivo actualizado:', htmlPath);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    actualizarLogosEnManual();
}

module.exports = { actualizarLogosEnManual };

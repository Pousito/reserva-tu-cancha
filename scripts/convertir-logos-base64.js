const fs = require('fs');
const path = require('path');

function convertirLogoABase64(rutaLogo) {
    try {
        const logoBuffer = fs.readFileSync(rutaLogo);
        const base64 = logoBuffer.toString('base64');
        // Detectar el tipo de imagen por extensión
        const ext = path.extname(rutaLogo).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error(`Error leyendo logo ${rutaLogo}:`, error);
        return null;
    }
}

function obtenerLogosBase64() {
    // Usar el logo correcto de ReservaTusCanchas desde Downloads
    const reservatuscanchasLogo = '/Users/pousito/Downloads/Logo Reservatuscanchas.jpeg';
    
    // Logo de Borde Río desde el directorio de logos
    const logosDir = path.join(__dirname, '..', 'public', 'images', 'logos');
    const bordeRioLogo = path.join(logosDir, 'borde-rio.png');
    
    const reservatuscanchasBase64 = convertirLogoABase64(reservatuscanchasLogo);
    const bordeRioBase64 = convertirLogoABase64(bordeRioLogo);
    
    console.log('🎨 Logos convertidos a Base64:');
    console.log('\n📄 ReservaTusCanchas Logo (desde Downloads):');
    console.log(reservatuscanchasBase64 ? '✅ Convertido exitosamente' : '❌ Error en conversión');
    console.log('\n🏟️ Borde Río Logo:');
    console.log(bordeRioBase64 ? '✅ Convertido exitosamente' : '❌ Error en conversión');
    
    return {
        reservatuscanchas: reservatuscanchasBase64,
        bordeRio: bordeRioBase64
    };
}

// Ejecutar si se llama directamente
if (require.main === module) {
    obtenerLogosBase64();
}

module.exports = { obtenerLogosBase64, convertirLogoABase64 };

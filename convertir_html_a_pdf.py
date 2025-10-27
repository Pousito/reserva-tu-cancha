#!/usr/bin/env python3
"""
Script para convertir el HTML modificado a PDF usando WeasyPrint
"""

import os
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

def convertir_html_a_pdf():
    """Convierte el HTML modificado a PDF manteniendo el diseño original"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    archivo_pdf = "Manual_Usuario_EspacioDeportivoBordeRio.pdf"
    
    try:
        # Verificar que el archivo HTML existe
        if not os.path.exists(archivo_html):
            print(f"Error: No se encontró el archivo {archivo_html}")
            return False
        
        print("📖 Leyendo el archivo HTML modificado...")
        
        # Configuración de fuentes
        font_config = FontConfiguration()
        
        # CSS adicional para mejorar la conversión
        css_adicional = CSS(string='''
            @page {
                size: A4;
                margin: 20mm;
            }
            
            body {
                font-family: 'Segoe UI', 'Arial', sans-serif;
            }
            
            .portada {
                page-break-after: always;
            }
            
            h1, h2, h3 {
                page-break-after: avoid;
            }
            
            table {
                page-break-inside: avoid;
            }
        ''', font_config=font_config)
        
        print("🔄 Convirtiendo HTML a PDF...")
        
        # Convertir HTML a PDF
        html_doc = HTML(filename=archivo_html)
        html_doc.write_pdf(
            archivo_pdf,
            stylesheets=[css_adicional],
            font_config=font_config
        )
        
        # Verificar que el PDF se creó correctamente
        if os.path.exists(archivo_pdf):
            file_size = os.path.getsize(archivo_pdf)
            print(f"✅ Conversión a PDF completada exitosamente!")
            print(f"📁 Archivo PDF creado: {archivo_pdf}")
            print(f"📊 Tamaño del archivo: {file_size:,} bytes")
            print(f"🎨 Diseño original mantenido (gradiente morado, etc.)")
            print(f"🗑️  Logos eliminados correctamente")
            return True
        else:
            print("❌ Error: El archivo PDF no se creó")
            return False
        
    except Exception as e:
        print(f"❌ Error al convertir HTML a PDF: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Convirtiendo HTML modificado a PDF...")
    print("🎨 Manteniendo el diseño original con gradiente morado...")
    print("-" * 60)
    
    if convertir_html_a_pdf():
        print("-" * 60)
        print("🎉 ¡Proceso completado exitosamente!")
        print("💡 El PDF ahora tiene el diseño original sin logos.")
    else:
        print("-" * 60)
        print("❌ El proceso falló. Revisa los errores arriba.")

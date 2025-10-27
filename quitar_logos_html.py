#!/usr/bin/env python3
"""
Script para quitar los logos del HTML manteniendo el diseño original
"""

import os
import re

def quitar_logos_del_html():
    """Quita los logos del HTML manteniendo todo el diseño original"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    archivo_backup = "Manual_Usuario_EspacioDeportivoBordeRio_backup.html"
    
    try:
        # Verificar que el archivo HTML existe
        if not os.path.exists(archivo_html):
            print(f"Error: No se encontró el archivo {archivo_html}")
            return False
        
        # Crear backup del archivo HTML
        print("📋 Creando backup del archivo HTML...")
        with open(archivo_html, 'r', encoding='utf-8') as original, open(archivo_backup, 'w', encoding='utf-8') as backup:
            backup.write(original.read())
        
        # Leer el archivo HTML
        print("📖 Leyendo el archivo HTML...")
        with open(archivo_html, 'r', encoding='utf-8') as file:
            contenido = file.read()
        
        # Contar cuántos logos hay antes de eliminarlos
        logos_encontrados = len(re.findall(r'<img src="data:image/png;base64,', contenido))
        print(f"🔍 Encontrados {logos_encontrados} logos en el HTML")
        
        # Eliminar los logos específicos
        print("🗑️  Eliminando logos...")
        
        # Eliminar el primer logo (New Life)
        contenido = re.sub(
            r'        <!-- Logo ReservaTusCanchas \(izquierda\) -->\s*\n\s*<img src="data:image/png;base64,[^"]*"[^>]*>\s*\n',
            '',
            contenido,
            flags=re.MULTILINE
        )
        
        # Eliminar el segundo logo (Espacio Borde Río)
        contenido = re.sub(
            r'        <!-- Logo Espacio Deportivo Borde Río \(derecha\) -->\s*\n\s*<img src="data:image/png;base64,[^"]*"[^>]*>\s*\n',
            '',
            contenido,
            flags=re.MULTILINE
        )
        
        # Verificar que se eliminaron los logos
        logos_restantes = len(re.findall(r'<img src="data:image/png;base64,', contenido))
        logos_eliminados = logos_encontrados - logos_restantes
        
        print(f"✅ Se eliminaron {logos_eliminados} logos")
        print(f"📊 Logos restantes: {logos_restantes}")
        
        # Guardar el HTML modificado
        print("💾 Guardando el HTML modificado...")
        with open(archivo_html, 'w', encoding='utf-8') as file:
            file.write(contenido)
        
        print(f"✅ HTML modificado exitosamente!")
        print(f"📁 Archivo HTML original respaldado en: {archivo_backup}")
        print(f"📁 Archivo HTML modificado: {archivo_html}")
        print(f"🎨 Diseño original mantenido (gradiente morado, etc.)")
        print(f"🗑️  Logos de New Life y Espacio Borde Río eliminados")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al modificar el HTML: {str(e)}")
        return False

def convertir_html_a_pdf():
    """Convierte el HTML modificado a PDF"""
    try:
        print("🔄 Convirtiendo HTML a PDF...")
        
        # Usar wkhtmltopdf si está disponible
        archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
        archivo_pdf = "Manual_Usuario_EspacioDeportivoBordeRio.pdf"
        
        # Verificar si wkhtmltopdf está disponible
        import subprocess
        try:
            subprocess.run(['wkhtmltopdf', '--version'], capture_output=True, check=True)
            print("📄 Usando wkhtmltopdf para la conversión...")
            
            # Comando para convertir HTML a PDF
            cmd = [
                'wkhtmltopdf',
                '--page-size', 'A4',
                '--margin-top', '20mm',
                '--margin-bottom', '20mm',
                '--margin-left', '20mm',
                '--margin-right', '20mm',
                '--encoding', 'UTF-8',
                archivo_html,
                archivo_pdf
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Conversión a PDF completada exitosamente!")
                return True
            else:
                print(f"❌ Error en la conversión: {result.stderr}")
                return False
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⚠️  wkhtmltopdf no está disponible")
            print("💡 El HTML ha sido modificado correctamente, pero necesitas convertir manualmente a PDF")
            print("💡 Puedes usar herramientas como:")
            print("   - wkhtmltopdf")
            print("   - Chrome/Edge: Imprimir > Guardar como PDF")
            print("   - Cualquier conversor HTML a PDF")
            return False
            
    except Exception as e:
        print(f"❌ Error en la conversión: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando modificación del Manual de Usuario...")
    print("🎨 Manteniendo el diseño original del HTML...")
    print("🗑️  Eliminando solo los logos de New Life y Espacio Borde Río...")
    print("-" * 60)
    
    if quitar_logos_del_html():
        print("-" * 60)
        print("🎉 ¡HTML modificado exitosamente!")
        print("🔄 Intentando convertir a PDF...")
        
        if convertir_html_a_pdf():
            print("🎉 ¡Proceso completado! PDF actualizado con diseño original sin logos.")
        else:
            print("💡 HTML modificado correctamente. Convierte manualmente a PDF si es necesario.")
    else:
        print("-" * 60)
        print("❌ El proceso falló. Revisa los errores arriba.")

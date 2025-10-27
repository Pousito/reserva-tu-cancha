#!/usr/bin/env python3
"""
Script para convertir HTML a PDF usando el navegador del sistema
"""

import os
import subprocess
import webbrowser
import time

def abrir_html_en_navegador():
    """Abre el HTML en el navegador para conversión manual"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    ruta_completa = os.path.abspath(archivo_html)
    
    try:
        print("🌐 Abriendo el HTML en el navegador...")
        print(f"📁 Archivo: {ruta_completa}")
        
        # Abrir en el navegador predeterminado
        webbrowser.open(f"file://{ruta_completa}")
        
        print("✅ HTML abierto en el navegador")
        print("📋 Instrucciones para convertir a PDF:")
        print("   1. En el navegador, presiona Ctrl+P (Cmd+P en Mac)")
        print("   2. Selecciona 'Guardar como PDF' como destino")
        print("   3. Ajusta la configuración si es necesario:")
        print("      - Páginas: Todas")
        print("      - Diseño: Vertical")
        print("      - Márgenes: Mínimos")
        print("   4. Haz clic en 'Guardar'")
        print("   5. Guarda como 'Manual_Usuario_EspacioDeportivoBordeRio.pdf'")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al abrir el navegador: {str(e)}")
        return False

def verificar_archivos():
    """Verifica que los archivos necesarios existan"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    archivo_backup = "Manual_Usuario_EspacioDeportivoBordeRio_backup.html"
    
    print("🔍 Verificando archivos...")
    
    if os.path.exists(archivo_html):
        print(f"✅ HTML modificado encontrado: {archivo_html}")
        size = os.path.getsize(archivo_html)
        print(f"📊 Tamaño: {size:,} bytes")
    else:
        print(f"❌ No se encontró: {archivo_html}")
        return False
    
    if os.path.exists(archivo_backup):
        print(f"✅ Backup encontrado: {archivo_backup}")
    else:
        print(f"⚠️  No se encontró backup: {archivo_backup}")
    
    return True

def mostrar_resumen():
    """Muestra un resumen del proceso"""
    
    print("\n" + "="*60)
    print("📋 RESUMEN DEL PROCESO")
    print("="*60)
    print("✅ HTML modificado correctamente")
    print("🎨 Diseño original mantenido (gradiente morado)")
    print("🗑️  Logos de New Life y Espacio Borde Río eliminados")
    print("📁 Archivo HTML listo para conversión a PDF")
    print("\n💡 Para completar el proceso:")
    print("   1. El HTML se abrirá en tu navegador")
    print("   2. Usa Ctrl+P (Cmd+P) para imprimir")
    print("   3. Selecciona 'Guardar como PDF'")
    print("   4. Guarda como 'Manual_Usuario_EspacioDeportivoBordeRio.pdf'")
    print("="*60)

if __name__ == "__main__":
    print("🚀 Preparando conversión HTML a PDF...")
    print("🎨 Usando el diseño original sin logos...")
    print("-" * 60)
    
    if verificar_archivos():
        print("-" * 60)
        if abrir_html_en_navegador():
            mostrar_resumen()
        else:
            print("❌ No se pudo abrir el navegador")
    else:
        print("❌ Archivos no encontrados")

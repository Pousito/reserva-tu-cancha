#!/usr/bin/env python3
"""
Script para facilitar la conversión manual del HTML a PDF
"""

import os
import subprocess
import platform

def abrir_archivo_en_aplicacion():
    """Abre el archivo HTML en la aplicación predeterminada"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    ruta_completa = os.path.abspath(archivo_html)
    
    try:
        sistema = platform.system()
        
        if sistema == "Darwin":  # macOS
            print("🍎 Detectado macOS")
            subprocess.run(['open', ruta_completa])
            print("✅ Archivo abierto en el navegador predeterminado")
            
        elif sistema == "Windows":
            print("🪟 Detectado Windows")
            os.startfile(ruta_completa)
            print("✅ Archivo abierto en el navegador predeterminado")
            
        elif sistema == "Linux":
            print("🐧 Detectado Linux")
            subprocess.run(['xdg-open', ruta_completa])
            print("✅ Archivo abierto en el navegador predeterminado")
            
        else:
            print("❓ Sistema operativo no reconocido")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error al abrir el archivo: {str(e)}")
        return False

def mostrar_instrucciones_detalladas():
    """Muestra instrucciones detalladas para la conversión"""
    
    print("\n" + "="*70)
    print("📋 INSTRUCCIONES DETALLADAS PARA CONVERTIR A PDF")
    print("="*70)
    
    print("\n🎯 MÉTODO 1: Usando Chrome/Edge (RECOMENDADO)")
    print("-" * 50)
    print("1. El archivo HTML ya se abrió en tu navegador")
    print("2. Presiona Cmd+P (Mac) o Ctrl+P (Windows/Linux)")
    print("3. En la ventana de impresión:")
    print("   • Destino: 'Guardar como PDF'")
    print("   • Páginas: 'Todas'")
    print("   • Diseño: 'Vertical'")
    print("   • Márgenes: 'Mínimos' o 'Sin márgenes'")
    print("   • Opciones: Marca 'Gráficos de fondo' si está disponible")
    print("4. Haz clic en 'Guardar'")
    print("5. Nombra el archivo: 'Manual_Usuario_EspacioDeportivoBordeRio.pdf'")
    print("6. Guarda en la carpeta del proyecto")
    
    print("\n🎯 MÉTODO 2: Usando Safari (Mac)")
    print("-" * 50)
    print("1. Abre el archivo en Safari")
    print("2. Archivo → Exportar como PDF...")
    print("3. Configura las opciones y guarda")
    
    print("\n🎯 MÉTODO 3: Usando Firefox")
    print("-" * 50)
    print("1. Abre el archivo en Firefox")
    print("2. Archivo → Imprimir")
    print("3. Destino: 'Guardar como PDF'")
    print("4. Configura y guarda")
    
    print("\n⚠️  IMPORTANTE:")
    print("• Asegúrate de que 'Gráficos de fondo' esté habilitado")
    print("• Usa márgenes mínimos para mejor resultado")
    print("• El gradiente morado debe verse correctamente")
    
    print("\n✅ RESULTADO ESPERADO:")
    print("• Portada con gradiente morado (sin logos)")
    print("• Círculo central con el título")
    print("• Todas las páginas del manual original")
    print("• Diseño idéntico al original pero sin logos")
    
    print("="*70)

def verificar_archivos():
    """Verifica que los archivos estén en su lugar"""
    
    archivo_html = "Manual_Usuario_EspacioDeportivoBordeRio.html"
    archivo_backup = "Manual_Usuario_EspacioDeportivoBordeRio_backup.html"
    
    print("🔍 Verificando archivos...")
    
    if os.path.exists(archivo_html):
        size = os.path.getsize(archivo_html)
        print(f"✅ HTML modificado: {archivo_html} ({size:,} bytes)")
    else:
        print(f"❌ No encontrado: {archivo_html}")
        return False
    
    if os.path.exists(archivo_backup):
        print(f"✅ Backup disponible: {archivo_backup}")
    
    return True

def mostrar_resumen_final():
    """Muestra el resumen final del proceso"""
    
    print("\n" + "🎉" * 20)
    print("📋 RESUMEN FINAL")
    print("🎉" * 20)
    print("✅ HTML modificado correctamente")
    print("🎨 Diseño original mantenido (gradiente morado)")
    print("🗑️  Logos eliminados (New Life y Espacio Borde Río)")
    print("📁 Archivo listo para conversión a PDF")
    print("\n💡 SIGUIENTE PASO:")
    print("   Sigue las instrucciones arriba para convertir a PDF")
    print("   El resultado será idéntico al original pero sin logos")
    print("🎉" * 20)

if __name__ == "__main__":
    print("🚀 Preparando conversión HTML a PDF...")
    print("🎨 Manteniendo el diseño original sin logos...")
    print("-" * 60)
    
    if verificar_archivos():
        print("-" * 60)
        if abrir_archivo_en_aplicacion():
            mostrar_instrucciones_detalladas()
            mostrar_resumen_final()
        else:
            print("❌ No se pudo abrir el archivo automáticamente")
            print("💡 Abre manualmente: Manual_Usuario_EspacioDeportivoBordeRio.html")
    else:
        print("❌ Archivos no encontrados")

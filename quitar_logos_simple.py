#!/usr/bin/env python3
"""
Script para quitar logos manteniendo el diseño original con fondo morado
"""

import os
from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import io

def crear_portada_morada_sin_logos():
    """Crea una portada con fondo morado sin logos, manteniendo el diseño original"""
    buffer = io.BytesIO()
    
    # Crear el documento
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Color morado para el fondo
    color_morado = colors.Color(0.4, 0.2, 0.6)  # Morado similar al original
    
    # Estilo personalizado para el título principal
    title_style = ParagraphStyle(
        'TituloPrincipal',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=40,
        alignment=1,  # Centrado
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )
    
    # Estilo para subtítulos
    subtitle_style = ParagraphStyle(
        'Subtitulo',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=25,
        alignment=1,  # Centrado
        textColor=colors.white,
        fontName='Helvetica'
    )
    
    # Estilo para texto descriptivo
    desc_style = ParagraphStyle(
        'Descripcion',
        parent=styles['Normal'],
        fontSize=14,
        spaceAfter=15,
        alignment=1,  # Centrado
        textColor=colors.white,
        fontName='Helvetica'
    )
    
    # Estilo para información adicional
    info_style = ParagraphStyle(
        'Info',
        parent=styles['Normal'],
        fontSize=12,
        alignment=1,
        textColor=colors.white,
        fontName='Helvetica'
    )
    
    # Contenido de la portada
    story = []
    
    # Espacio superior
    story.append(Spacer(1, 1.5*inch))
    
    # Título principal
    story.append(Paragraph("MANUAL DE USUARIO", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Subtítulo
    story.append(Paragraph("Sistema de Reservas Deportivas", subtitle_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("Espacio Deportivo Borde Río", subtitle_style))
    story.append(Spacer(1, 0.8*inch))
    
    # Descripción
    story.append(Paragraph("Guía completa para el uso del sistema", desc_style))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph("de reservas deportivas", desc_style))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph("y gestión de canchas", desc_style))
    story.append(Spacer(1, 1*inch))
    
    # Información del sistema
    story.append(Paragraph("Sistema desarrollado para facilitar", info_style))
    story.append(Spacer(1, 0.1*inch))
    story.append(Paragraph("la reserva y administración de espacios deportivos", info_style))
    story.append(Spacer(1, 0.8*inch))
    
    # Fecha
    story.append(Paragraph("2024", info_style))
    
    # Construir el PDF con fondo morado
    def add_background(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(color_morado)
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        canvas.restoreState()
    
    doc.build(story, onFirstPage=add_background, onLaterPages=add_background)
    buffer.seek(0)
    return buffer

def modificar_manual_manteniendo_diseno():
    """Modifica el manual manteniendo el diseño original pero sin logos"""
    
    # Rutas de archivos
    archivo_original = "Manual_Usuario_EspacioDeportivoBordeRio.pdf"
    archivo_backup = "Manual_Usuario_EspacioDeportivoBordeRio_backup_original.pdf"
    archivo_modificado = "Manual_Usuario_EspacioDeportivoBordeRio.pdf"
    
    try:
        # Verificar que el archivo original existe
        if not os.path.exists(archivo_original):
            print(f"Error: No se encontró el archivo {archivo_original}")
            return False
        
        # Crear backup del archivo original
        print("📋 Creando backup del archivo original...")
        with open(archivo_original, 'rb') as original, open(archivo_backup, 'wb') as backup:
            backup.write(original.read())
        
        # Leer el PDF original
        print("📖 Leyendo el PDF original...")
        reader = PdfReader(archivo_original)
        writer = PdfWriter()
        
        # Crear nueva portada con fondo morado sin logos
        print("🎨 Creando nueva portada con fondo morado (sin logos)...")
        nueva_portada_buffer = crear_portada_morada_sin_logos()
        nueva_portada_reader = PdfReader(nueva_portada_buffer)
        
        # Agregar la nueva portada
        writer.add_page(nueva_portada_reader.pages[0])
        
        # Agregar todas las páginas del original excepto la primera (portada original)
        print("📄 Copiando páginas del manual original...")
        for i in range(1, len(reader.pages)):
            writer.add_page(reader.pages[i])
        
        # Guardar el PDF modificado (sobrescribir el original)
        print("💾 Guardando el PDF modificado...")
        with open(archivo_modificado, 'wb') as output_file:
            writer.write(output_file)
        
        print(f"✅ Manual modificado exitosamente!")
        print(f"📁 Archivo original respaldado en: {archivo_backup}")
        print(f"📁 Archivo modificado: {archivo_modificado}")
        print(f"📄 Total de páginas en el manual modificado: {len(writer.pages)}")
        print(f"🎨 Fondo morado mantenido")
        print(f"🗑️  Logos de New Life y Espacio Borde Río eliminados")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al modificar el manual: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando modificación del Manual de Usuario...")
    print("🎨 Manteniendo el fondo morado original...")
    print("🗑️  Eliminando solo los logos de New Life y Espacio Borde Río...")
    print("-" * 60)
    
    if modificar_manual_manteniendo_diseno():
        print("-" * 60)
        print("🎉 ¡Proceso completado exitosamente!")
        print("💡 El manual ahora tiene fondo morado sin logos.")
        print("📋 El archivo original está respaldado por seguridad.")
    else:
        print("-" * 60)
        print("❌ El proceso falló. Revisa los errores arriba.")

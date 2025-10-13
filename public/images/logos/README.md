# 🎨 Logos de Complejos Deportivos

## 📁 Estructura de Carpeta

Esta carpeta contiene los logos de los complejos deportivos que se muestran en los reportes PDF.

## 📋 Logos Requeridos

Agrega los siguientes archivos de logo en formato **PNG** o **JPG**:

### 1. MagnaSports
- **Archivo:** `magnasports.png`
- **ID Complejo:** 1
- **Tamaño recomendado:** 500x500 px (cuadrado)
- **Fondo:** Transparente (PNG)

### 2. Fundación Gunnen
- **Archivo:** `fundacion-gunnen.png`
- **ID Complejo:** 2
- **Tamaño recomendado:** 500x500 px (cuadrado)
- **Fondo:** Transparente (PNG)

### 3. Espacio Deportivo Borde Río
- **Archivo:** `borde-rio.png`
- **ID Complejo:** 6
- **Tamaño recomendado:** 500x500 px (cuadrado)
- **Fondo:** Transparente (PNG)

## 🔧 Cómo Convertir PDF a PNG

Si tienes el logo en PDF (como "Logo Epacio Deportivo Borde Rio.pdf"), necesitas convertirlo a PNG:

### Opción 1: Usando Vista Previa (Mac)
1. Abrir el PDF con Vista Previa
2. Archivo → Exportar
3. Formato: PNG
4. Resolución: 300 DPI
5. Guardar como: `borde-rio.png`

### Opción 2: Usando Adobe Acrobat
1. Abrir el PDF
2. Archivo → Exportar a → Imagen → PNG
3. Configurar calidad alta
4. Guardar

### Opción 3: Herramienta Online
1. Ir a: https://www.ilovepdf.com/es/pdf_a_jpg
2. Subir el PDF del logo
3. Descargar como PNG
4. Renombrar según la tabla arriba

### Opción 4: Usando ImageMagick (Terminal)
```bash
convert -density 300 "Logo Epacio Deportivo Borde Rio.pdf" borde-rio.png
```

## 📐 Especificaciones Técnicas

### Formato
- ✅ **PNG** (recomendado para logos con transparencia)
- ✅ **JPG** (alternativa si no necesitas transparencia)
- ❌ **PDF** (no soportado directamente en exportaciones)

### Dimensiones
- **Mínimo:** 300x300 px
- **Recomendado:** 500x500 px
- **Máximo:** 1000x1000 px
- **Aspecto:** Cuadrado (1:1) preferiblemente

### Tamaño de Archivo
- **Ideal:** < 200 KB
- **Máximo:** < 500 KB

### Calidad
- **Resolución:** 300 DPI mínimo
- **Fondo:** Transparente (PNG con alpha channel)
- **Formato de color:** RGB

## 🎯 Uso en el Sistema

Una vez que agregues los logos en esta carpeta con los nombres correctos:

### Automático en PDFs de:
- ✅ **Control de Gastos** - Esquina superior derecha
- ✅ **Reportes** (Top Canchas, Análisis de Clientes) - Esquina superior derecha
- ✅ **Exportaciones de Ingresos** - Esquina superior derecha

### Posición en PDF:
- **Ubicación:** Esquina superior derecha
- **Tamaño:** 25-30mm de ancho
- **Coordenadas:** X: 170mm, Y: 5mm

## 🔄 Actualización

Después de agregar los logos:

1. **No requiere reiniciar** el servidor
2. **Simplemente recarga** la página (Ctrl+F5)
3. **Exporta un PDF** para verificar
4. El logo debería aparecer automáticamente

## 🐛 Solución de Problemas

### El logo no aparece en el PDF
1. Verificar que el archivo existe en esta carpeta
2. Verificar que el nombre coincida exactamente (case-sensitive)
3. Verificar que sea PNG o JPG (no PDF)
4. Ver la consola del navegador para mensajes de error

### El logo se ve borroso
1. Usar una imagen de mayor resolución (500x500 mínimo)
2. Asegurar que sea 300 DPI

### El logo está cortado
1. Verificar que la imagen sea cuadrada o casi cuadrada
2. El sistema escala automáticamente a 25-30mm

## 📝 Ejemplo de Estructura Final

```
public/images/logos/
├── README.md (este archivo)
├── borde-rio.png ← Espacio Deportivo Borde Río
├── magnasports.png ← MagnaSports
└── fundacion-gunnen.png ← Fundación Gunnen
```

## ⚙️ Configuración

La configuración de logos está en: `/public/js/logos-config.js`

Si agregas un nuevo complejo, edita ese archivo para agregar su logo.

---

**Última actualización:** Octubre 2025


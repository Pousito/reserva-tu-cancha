# 📖 Manual de Usuario - ReservaTusCanchas.cl

## 📄 Archivo Generado

Se ha creado un manual completo en PDF para la dueña del Complejo Deportivo Borde Rio.

**Ubicación del archivo:**
```
Manual_Usuario_ReservaTusCanchas.pdf
```

---

## 📋 Contenido del Manual

El manual incluye las siguientes secciones:

### 1. **Introducción al Sistema** 📖
- ¿Qué es ReservaTusCanchas?
- Beneficios del sistema
- Visión general de funcionalidades

### 2. **Página Principal - Hacer Reservas** 🏟️
- Proceso paso a paso para reservar
- Sistema de pago con WebPay
- Confirmación de reservas

### 3. **Consultar Reservas Existentes** 🔍
- Búsqueda por código de reserva
- Información visible para usuarios

### 4. **Panel de Administración - Owner** 👑
- **Dashboard:** Estadísticas en tiempo real
- **Gestión de Reservas:** Ver, editar, filtrar y exportar
- **Gestión de Canchas:** Administrar canchas, precios y horarios
- **Reportes Financieros:** Análisis de ingresos y ocupación
- **Control de Gastos e Ingresos:** Sistema completo de gestión financiera

### 5. **Panel de Administración - Manager** 👤
- Funcionalidades limitadas
- Restricciones de acceso
- Permisos operativos

### 6. **Preguntas Frecuentes** ❓
- Respuestas a consultas comunes
- Solución de problemas básicos

### 7. **Soporte y Contacto** 📞
- Información de contacto
- Tipos de soporte disponibles

---

## 🎨 Características del PDF

✅ **Diseño Moderno y Profesional**
- Colores corporativos (gradientes púrpura)
- Iconos y emojis para mejor comprensión
- Estructura clara y organizada

✅ **Contenido Completo**
- 16 páginas de información detallada
- Tablas comparativas de permisos
- Cuadros informativos destacados
- Listas con viñetas para fácil lectura

✅ **Navegación Fácil**
- Índice de contenidos
- Números de página
- Secciones claramente identificadas

---

## 🔄 Cómo Regenerar el Manual

Si necesitas regenerar el manual con información actualizada:

### Opción 1: Usando NPM Script
```bash
npm run generar-manual
```

### Opción 2: Ejecutando directamente
```bash
node scripts/generar-manual-usuario.js
```

### Opción 3: Desde cualquier ubicación
```bash
cd /Users/pousito/Desktop/Proyecto\ Reserva\ Tu\ Cancha/Programacion/ReservaTuCancha
node scripts/generar-manual-usuario.js
```

El PDF se generará automáticamente en la raíz del proyecto:
```
Manual_Usuario_ReservaTusCanchas.pdf
```

---

## 📝 Personalización del Manual

Si necesitas modificar el contenido del manual, edita el archivo:
```
scripts/generar-manual-usuario.js
```

### Secciones editables:

1. **Colores:** Líneas 6-14
2. **Portada:** Método `generarPortada()` (línea ~310)
3. **Índice:** Método `generarIndice()` (línea ~340)
4. **Contenido:** Método `generarContenido()` (línea ~390)

### Agregar nueva sección:
```javascript
// En el método generarContenido()
this.addSectionTitle('Título de Nueva Sección', '🎯');
this.addParagraph('Contenido de la sección...');
this.addBulletList([
  'Item 1',
  'Item 2',
  'Item 3'
], '•');
```

---

## 🎯 Información del Complejo

El manual está personalizado para:

**Complejo:** Borde Rio  
**Ubicación:** Quilleco, Chile  
**URL del Sistema:** https://www.reservatuscanchas.cl

### Credenciales de Acceso Mencionadas:

**Owner:**
- Email: `admin@borderio.cl`
- Panel: `/admin-dashboard.html`

**Manager:**
- Email: `manager@borderio.cl`
- Panel: `/admin-dashboard.html`

---

## 📊 Diferencias entre Roles

### 👑 Owner (Dueño)
- ✅ Dashboard completo con ingresos
- ✅ Gestión de reservas (con precios)
- ✅ Gestión de canchas
- ✅ Reportes financieros
- ✅ Control de gastos e ingresos
- ❌ No puede gestionar otros complejos

### 👤 Manager (Administrador)
- ✅ Dashboard básico (sin ingresos)
- ✅ Ver reservas (sin precios)
- ✅ Ver canchas (solo lectura)
- ❌ No puede ver reportes
- ❌ No puede ver control de gastos
- ❌ No puede editar precios

---

## 🚀 Próximos Pasos

1. ✅ Entregar el PDF a la dueña del complejo
2. ✅ Explicar cómo acceder al sistema
3. ✅ Configurar credenciales si es necesario
4. ✅ Programar sesión de capacitación si se requiere

---

## 📞 Soporte

Para soporte técnico o modificaciones al manual:
- Email: soporte@reservatuscanchas.cl
- Teléfono: +56 9 XXXX XXXX

---

## 📝 Notas Importantes

- El manual está en formato PDF para fácil distribución
- Puede imprimirse o compartirse digitalmente
- Se recomienda actualizar cuando haya cambios significativos en el sistema
- El archivo tiene 101KB de tamaño (fácil de enviar por email)

---

**Última Actualización:** 14 de Octubre, 2025  
**Versión:** 1.0  
**Generado automáticamente por:** Sistema ReservaTusCanchas

---

## 🎓 Capacitación Recomendada

Se sugiere realizar una sesión de capacitación con la dueña cubriendo:

1. **Acceso al Sistema (15 min)**
   - Login al panel de administración
   - Navegación básica

2. **Gestión de Reservas (20 min)**
   - Ver reservas del día
   - Filtrar y buscar
   - Editar o cancelar reservas

3. **Control Financiero (20 min)**
   - Dashboard de ingresos
   - Registrar gastos
   - Visualizar reportes

4. **Gestión de Canchas (15 min)**
   - Modificar precios
   - Ajustar disponibilidad
   - Activar/desactivar canchas

5. **Preguntas y Respuestas (10 min)**
   - Resolver dudas específicas
   - Casos de uso reales

**Duración Total:** ~80 minutos

---

¡El manual está listo para ser entregado! 🎉



# 💰 Sistema de Control de Gastos e Ingresos

**Fecha de Implementación:** 7 de Octubre, 2025  
**Estado:** ✅ COMPLETAMENTE FUNCIONAL

---

## 📋 Resumen Ejecutivo

Sistema completo de gestión financiera para owners de complejos deportivos, permitiendo:
- ✅ Registro de gastos e ingresos
- ✅ Categorización automática
- ✅ Estadísticas visuales en tiempo real
- ✅ Gráficos interactivos
- ✅ Exportación a Excel y PDF
- ✅ Sistema de permisos robusto
- ✅ Filtros avanzados
- ✅ Interfaz moderna y amigable

---

## 🎨 Características del Sistema

### 1. **Dashboard Interactivo**
- **Estadísticas en Tiempo Real:**
  - Total de Ingresos del período
  - Total de Gastos del período
  - Balance (Ingresos - Gastos)
  - Indicadores visuales de tendencia

- **Gráficos Visuales:**
  - **Gráfico de Dona:** Distribución de gastos por categoría
  - **Gráfico de Líneas:** Evolución mensual de ingresos vs gastos

### 2. **Sistema de Categorías**

#### Categorías de Gastos (17 predefinidas)

**Administración:**
- Sueldos y Honorarios
- Arriendos y Cánones
- Seguros
- Contabilidad y Legal

**Servicios Básicos:**
- Electricidad
- Agua
- Gas
- Internet y Telefonía

**Mantenimiento y Operación:**
- Mantenimiento Canchas
- Materiales de Limpieza
- Equipamiento Deportivo
- Iluminación

**Marketing y Publicidad:**
- Publicidad Digital
- Publicidad Física
- Marketing y Promociones

**Otros:**
- Seguridad
- Permisos y Licencias
- Impuestos
- Otros Gastos

#### Categorías de Ingresos (7 predefinidas)

- Reservas Online
- Reservas Presenciales
- Arriendo de Equipos
- Venta de Productos
- Eventos y Torneos
- Publicidad Externa
- Otros Ingresos

**Cada categoría incluye:**
- Ícono Font Awesome
- Color identificador
- Descripción
- Clasificación por tipo

### 3. **Registro de Movimientos**

**Campos Disponibles:**
- ✅ Tipo (Ingreso/Gasto) - Obligatorio
- ✅ Categoría - Obligatorio
- ✅ Monto - Obligatorio
- ✅ Fecha - Obligatorio
- ✅ Descripción - Opcional
- ✅ Método de Pago (Efectivo, Transferencia, Tarjeta, Cheque) - Opcional
- ✅ Número de Documento (Factura, Boleta, etc.) - Opcional

**Funcionalidades:**
- Crear nuevo movimiento
- Editar movimiento existente
- Eliminar movimiento
- Validación en tiempo real

### 4. **Sistema de Filtros**

**Filtros Disponibles:**
- Por Tipo (Ingresos / Gastos / Todos)
- Por Categoría (Todas las categorías disponibles)
- Por Rango de Fechas (Desde - Hasta)

**Comportamiento:**
- Actualización automática de tabla y gráficos
- Filtros combinables
- Persistencia durante la sesión

### 5. **Exportación de Datos**

#### Excel (.xlsx)
- Todas las columnas de la tabla
- Formato estructurado
- Anchos de columna optimizados
- Nombre de archivo dinámico con fechas

#### PDF (.pdf)
- Encabezado con información del complejo
- Resumen financiero (Ingresos, Gastos, Balance)
- Tabla completa de movimientos
- Diseño profesional con autoTable
- Nombre de archivo dinámico

### 6. **Sistema de Permisos**

**Roles con Acceso:**
- **Owner:** Acceso completo a su propio complejo
- **Super Admin:** Acceso completo a todos los complejos

**Roles SIN Acceso:**
- Manager: No tiene acceso por defecto (puede agregarse en futuro)

**Seguridad:**
- Verificación de token JWT
- Validación de rol en cada endpoint
- Filtrado automático por complejo según rol

---

## 🗄️ Estructura de Base de Datos

### Tabla: `categorias_gastos`

```sql
CREATE TABLE categorias_gastos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50),        -- Clase Font Awesome
    color VARCHAR(20),         -- Color hex
    tipo VARCHAR(20) NOT NULL, -- 'gasto' o 'ingreso'
    es_predefinida BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `gastos_ingresos`

```sql
CREATE TABLE gastos_ingresos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias_gastos(id),
    tipo VARCHAR(20) NOT NULL, -- 'gasto' o 'ingreso'
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50),
    numero_documento VARCHAR(100),
    archivo_adjunto VARCHAR(255),
    usuario_id INTEGER REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Vistas

**`v_gastos_por_categoria`**
- Resumen de gastos agrupados por categoría y mes

**`v_ingresos_por_categoria`**
- Resumen de ingresos agrupados por categoría y mes

**`v_balance_mensual`**
- Balance financiero mensual por complejo

---

## 🔌 API Endpoints

### Base URL: `/api/gastos`

Todos los endpoints requieren autenticación con token JWT en el header:
```
Authorization: Bearer {token}
```

### 1. **GET /categorias**
Obtener todas las categorías disponibles

**Query Parameters:**
- `tipo` (opcional): 'gasto' o 'ingreso'

**Response:**
```json
[
  {
    "id": 1,
    "nombre": "Electricidad",
    "descripcion": "Consumo eléctrico mensual",
    "icono": "fa-bolt",
    "color": "#f39c12",
    "tipo": "gasto",
    "es_predefinida": true
  }
]
```

### 2. **GET /movimientos**
Obtener movimientos del complejo

**Query Parameters:**
- `tipo` (opcional): 'gasto' o 'ingreso'
- `categoria_id` (opcional): ID de categoría
- `fecha_desde` (opcional): Formato YYYY-MM-DD
- `fecha_hasta` (opcional): Formato YYYY-MM-DD

**Permisos:**
- Owner: Solo su complejo
- Super Admin: Todos los complejos

**Response:**
```json
[
  {
    "id": 1,
    "complejo_id": 1,
    "categoria_id": 5,
    "tipo": "gasto",
    "monto": 50000,
    "fecha": "2025-10-07",
    "descripcion": "Cuenta de luz octubre",
    "metodo_pago": "transferencia",
    "numero_documento": "Factura 12345",
    "categoria_nombre": "Electricidad",
    "categoria_icono": "fa-bolt",
    "categoria_color": "#f39c12",
    "creado_en": "2025-10-07T12:00:00Z"
  }
]
```

### 3. **POST /movimientos**
Crear nuevo movimiento

**Permisos:**
- Owner o Super Admin

**Body:**
```json
{
  "tipo": "gasto",
  "categoria_id": 5,
  "monto": 50000,
  "fecha": "2025-10-07",
  "descripcion": "Cuenta de luz octubre",
  "metodo_pago": "transferencia",
  "numero_documento": "Factura 12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movimiento creado correctamente",
  "data": { ... }
}
```

### 4. **PUT /movimientos/:id**
Actualizar movimiento existente

**Permisos:**
- Owner del complejo o Super Admin

**Body:** (todos los campos opcionales)
```json
{
  "categoria_id": 6,
  "monto": 55000,
  "fecha": "2025-10-08",
  "descripcion": "Descripción actualizada",
  "metodo_pago": "efectivo",
  "numero_documento": "Factura 12346"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Movimiento actualizado correctamente",
  "data": { ... }
}
```

### 5. **DELETE /movimientos/:id**
Eliminar movimiento

**Permisos:**
- Owner del complejo o Super Admin

**Response:**
```json
{
  "success": true,
  "message": "Movimiento eliminado correctamente"
}
```

### 6. **GET /estadisticas**
Obtener estadísticas del período

**Query Parameters:**
- `fecha_desde` (opcional): Formato YYYY-MM-DD
- `fecha_hasta` (opcional): Formato YYYY-MM-DD

**Response:**
```json
{
  "success": true,
  "data": {
    "total_ingresos": 500000,
    "total_gastos": 350000,
    "balance": 150000,
    "total_movimientos": 25
  }
}
```

---

## 📁 Estructura de Archivos

### Frontend
```
/public/
├── admin-gastos.html        # Página principal (HTML + CSS)
└── admin-gastos.js           # Lógica del frontend (JavaScript)
```

### Backend
```
/src/
├── controllers/
│   └── gastosController.js  # Lógica de negocio
├── routes/
│   └── gastos.js             # Definición de rutas
├── middleware/
│   └── auth.js               # Middleware de autenticación
└── app.js                    # Registro de rutas
```

### Base de Datos
```
/scripts/sql/
└── crear-control-gastos.sql  # Script de creación de tablas
```

---

## 🎨 Diseño y UX

### Paleta de Colores
- **Primary:** `#667eea` - Botones principales
- **Success:** `#10b981` - Ingresos
- **Danger:** `#ef4444` - Gastos
- **Info:** `#3b82f6` - Balance

### Características UI/UX
- ✅ Diseño responsive (móvil y desktop)
- ✅ Animaciones suaves
- ✅ Feedback visual inmediato
- ✅ Carga asíncrona sin bloqueo
- ✅ Iconos Font Awesome
- ✅ Gradientes modernos
- ✅ Sombras y elevaciones
- ✅ Tooltips informativos

### Componentes Principales
1. **Sidebar:** Navegación fija con menú
2. **Stats Cards:** Tarjetas de estadísticas con animación hover
3. **Action Buttons:** Botones con gradientes y iconos
4. **Filters Card:** Panel de filtros colapsable
5. **Charts:** Gráficos interactivos con Chart.js
6. **Table:** Tabla moderna con hover effects
7. **Modal:** Modal Bootstrap personalizado

---

## 🔒 Seguridad

### Validaciones Backend
- ✅ Verificación de token JWT
- ✅ Validación de roles
- ✅ Filtrado por complejo según rol
- ✅ Validación de tipos de datos
- ✅ Validación de montos positivos
- ✅ Validación de categoría según tipo
- ✅ Protección contra SQL Injection (Parametrized queries)

### Validaciones Frontend
- ✅ Campos requeridos marcados
- ✅ Validación de montos positivos
- ✅ Validación de fechas
- ✅ Confirmación antes de eliminar

---

## 🧪 Testing

### Casos de Prueba

**1. Registro de Gasto:**
- ✅ Crear gasto con todos los campos
- ✅ Crear gasto solo con campos requeridos
- ✅ Validar monto positivo
- ✅ Validar categoría de tipo "gasto"

**2. Registro de Ingreso:**
- ✅ Crear ingreso con todos los campos
- ✅ Validar categoría de tipo "ingreso"

**3. Filtros:**
- ✅ Filtrar por tipo
- ✅ Filtrar por categoría
- ✅ Filtrar por rango de fechas
- ✅ Combinar múltiples filtros

**4. Edición:**
- ✅ Editar movimiento existente
- ✅ Verificar permisos

**5. Eliminación:**
- ✅ Eliminar movimiento
- ✅ Confirmar antes de eliminar
- ✅ Verificar permisos

**6. Exportación:**
- ✅ Exportar a Excel con datos
- ✅ Exportar a PDF con datos
- ✅ Validar sin datos

**7. Permisos:**
- ✅ Owner solo ve su complejo
- ✅ Super Admin ve todo
- ✅ Manager no tiene acceso

---

## 📊 Funcionalidades Futuras (Opcional)

### Sugerencias para Mejoras
1. **Subir Archivos Adjuntos:**
   - Facturas, boletas, comprobantes
   - Almacenamiento en cloud (AWS S3, Cloudinary)

2. **Categorías Personalizadas:**
   - Permitir a owners crear sus propias categorías

3. **Presupuestos:**
   - Establecer presupuestos mensuales por categoría
   - Alertas cuando se supere el presupuesto

4. **Comparación de Períodos:**
   - Comparar mes actual vs mes anterior
   - Comparar año actual vs año anterior

5. **Alertas Automáticas:**
   - Email cuando balance sea negativo
   - Recordatorios de gastos recurrentes

6. **Reportes Avanzados:**
   - Dashboard mensual por email
   - Proyecciones financieras

7. **Integración con Reservas:**
   - Auto-registrar ingresos de reservas online
   - Sincronización automática

8. **Multi-Moneda:**
   - Soporte para diferentes monedas
   - Conversión automática

---

## 🚀 Cómo Usar

### Para Owners

1. **Acceder al Sistema:**
   - Iniciar sesión en el panel de admin
   - Ir a "Control de Gastos" en el menú lateral

2. **Registrar un Gasto:**
   - Clic en "Registrar Gasto"
   - Seleccionar categoría
   - Ingresar monto y fecha
   - Opcional: agregar descripción, método de pago, documento
   - Guardar

3. **Registrar un Ingreso:**
   - Clic en "Registrar Ingreso"
   - Mismo proceso que gastos

4. **Ver Estadísticas:**
   - Las tarjetas superiores muestran resumen
   - Gráficos se actualizan automáticamente

5. **Filtrar Datos:**
   - Usar filtros para ver períodos específicos
   - Combinar tipo, categoría y fechas

6. **Exportar:**
   - Clic en "Exportar a Excel" o "Exportar a PDF"
   - Archivo se descarga automáticamente

### Para Super Admin

- Mismas funcionalidades que owner
- Puede ver datos de todos los complejos
- Puede gestionar cualquier movimiento

---

## 📝 Notas Técnicas

### Dependencias Frontend
- **Bootstrap 5.3.0:** Framework CSS
- **Font Awesome 6.4.0:** Iconos
- **Chart.js 4.4.0:** Gráficos
- **SweetAlert2 11:** Alertas modernas
- **SheetJS 0.20.1:** Exportación Excel
- **jsPDF 2.5.1:** Exportación PDF
- **jsPDF-AutoTable 3.8.2:** Tablas en PDF

### Dependencias Backend
- **express:** Framework web
- **jsonwebtoken:** Autenticación JWT
- **pg:** Cliente PostgreSQL

### Variables de Entorno
- `JWT_SECRET`: Secret para firmar tokens
- `DATABASE_URL`: Conexión PostgreSQL

---

## ✅ Checklist de Implementación

- [x] Base de datos creada
- [x] Categorías predefinidas insertadas
- [x] Controlador backend implementado
- [x] Rutas registradas
- [x] Middleware de autenticación
- [x] Frontend diseñado
- [x] JavaScript funcional
- [x] Gráficos implementados
- [x] Exportación Excel
- [x] Exportación PDF
- [x] Sistema de permisos
- [x] Filtros funcionales
- [x] Validaciones completas
- [x] Responsive design
- [x] Documentación completa

---

## 🎉 Estado Final

✅ **SISTEMA COMPLETAMENTE FUNCIONAL**

El sistema de Control de Gastos e Ingresos está listo para uso en producción. Proporciona una solución completa, moderna y profesional para la gestión financiera de complejos deportivos.

**Última Actualización:** 7 de Octubre, 2025 - 18:00 (Chile)

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar esta documentación
2. Verificar logs del servidor
3. Revisar consola del navegador
4. Contactar al equipo de desarrollo



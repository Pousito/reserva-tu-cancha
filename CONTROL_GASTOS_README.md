# 💰 Sistema de Control de Gastos e Ingresos

## 🎉 ¡Implementación Completa!

El sistema de Control de Gastos e Ingresos está **100% funcional y listo para usar**.

---

## 🚀 Acceso Rápido

### URL
```
http://localhost:3000/admin-gastos.html
```

### Credenciales de Prueba

**Owner de MagnaSports:**
- Email: `admin@magnasports.cl`
- Contraseña: (tu contraseña configurada)

**Owner de Fundación Gunnen:**
- Email: `admin@fundaciongunnen.cl`
- Contraseña: (tu contraseña configurada)

**Owner de Borde Rio:**
- Email: `admin@borderio.cl`
- Contraseña: (tu contraseña configurada)

**Super Admin:**
- Email: `admin@reservatuscanchas.cl`
- Contraseña: (tu contraseña configurada)

---

## 📋 Funcionalidades

✅ **Registro de Movimientos**
- Gastos (19 categorías predefinidas)
- Ingresos (7 categorías predefinidas)

✅ **Dashboard Visual**
- Total de Ingresos
- Total de Gastos
- Balance
- Gráficos interactivos

✅ **Filtros Avanzados**
- Por tipo (Ingreso/Gasto)
- Por categoría
- Por rango de fechas

✅ **Exportación**
- Excel (.xlsx)
- PDF (.pdf)

✅ **Sistema de Permisos**
- Owners: Solo su complejo
- Super Admin: Todos los complejos

---

## 🎨 Características Visuales

- **Diseño Moderno:** Gradientes púrpura, animaciones suaves
- **Responsive:** Funciona en móvil y desktop
- **Gráficos:** Chart.js con dona y líneas
- **Iconos:** Font Awesome para categorías
- **Alertas:** SweetAlert2 para confirmaciones

---

## 📊 Categorías Disponibles

### Gastos (19)
- Sueldos y Honorarios
- Arriendos y Cánones
- Seguros
- Contabilidad y Legal
- Electricidad
- Agua
- Gas
- Internet y Telefonía
- Mantenimiento Canchas
- Materiales de Limpieza
- Equipamiento Deportivo
- Iluminación
- Publicidad Digital
- Publicidad Física
- Marketing y Promociones
- Seguridad
- Permisos y Licencias
- Impuestos
- Otros Gastos

### Ingresos (7)
- Reservas Online
- Reservas Presenciales
- Arriendo de Equipos
- Venta de Productos
- Eventos y Torneos
- Publicidad Externa
- Otros Ingresos

---

## 🔧 Cómo Usar

### 1. Registrar un Gasto
1. Clic en **"Registrar Gasto"**
2. Seleccionar **categoría**
3. Ingresar **monto** y **fecha**
4. (Opcional) Agregar descripción, método de pago, documento
5. Clic en **"Guardar"**

### 2. Registrar un Ingreso
1. Clic en **"Registrar Ingreso"**
2. Mismo proceso que gastos

### 3. Filtrar Datos
1. Usar los **filtros** en el panel superior
2. Seleccionar tipo, categoría y/o fechas
3. Los datos se actualizan automáticamente

### 4. Exportar
1. Aplicar filtros deseados
2. Clic en **"Exportar a Excel"** o **"Exportar a PDF"**
3. El archivo se descarga automáticamente

### 5. Editar/Eliminar
1. En la tabla, clic en el botón **lápiz** para editar
2. Clic en el botón **basura** para eliminar
3. Confirmar acción

---

## 🗄️ Base de Datos

### Tablas Creadas
- `categorias_gastos`: Categorías de gastos e ingresos
- `gastos_ingresos`: Registro de movimientos

### Vistas
- `v_gastos_por_categoria`: Resumen de gastos
- `v_ingresos_por_categoria`: Resumen de ingresos
- `v_balance_mensual`: Balance mensual

---

## 🔌 API Endpoints

Base: `/api/gastos`

- **GET** `/categorias` - Obtener categorías
- **GET** `/movimientos` - Obtener movimientos (con filtros)
- **POST** `/movimientos` - Crear movimiento
- **PUT** `/movimientos/:id` - Actualizar movimiento
- **DELETE** `/movimientos/:id` - Eliminar movimiento
- **GET** `/estadisticas` - Obtener estadísticas

Todos requieren autenticación JWT.

---

## 📁 Archivos Creados

### Frontend
```
/public/
├── admin-gastos.html     # Página principal
└── admin-gastos.js       # Lógica JavaScript
```

### Backend
```
/src/
├── controllers/gastosController.js
├── routes/gastos.js
├── middleware/auth.js
└── app.js (modificado)
```

### Scripts
```
/scripts/
├── sql/crear-control-gastos.sql
└── verificar-control-gastos.js
```

### Documentación
```
/.cursor/notepads/
└── control-gastos-sistema.md
```

---

## ✅ Testing

Para verificar la instalación:
```bash
node scripts/verificar-control-gastos.js
```

Debe mostrar:
- ✅ Tablas creadas
- ✅ 19 categorías de gastos
- ✅ 7 categorías de ingresos
- ✅ 3 vistas
- ✅ 5 índices
- ✅ Operaciones CRUD funcionando

---

## 🎯 Próximos Pasos

1. **Iniciar sesión** como owner o super admin
2. **Navegar** a "Control de Gastos" en el menú
3. **Registrar** algunos gastos e ingresos de prueba
4. **Ver** las estadísticas y gráficos actualizarse
5. **Probar** los filtros y exportaciones

---

## 📚 Documentación Completa

Ver: `.cursor/notepads/control-gastos-sistema.md`

---

## 🐛 Troubleshooting

### No puedo acceder
- Verificar que estés autenticado
- Verificar que tu rol sea `owner` o `super_admin`

### No aparecen datos
- Verificar que hayas aplicado filtros correctos
- Verificar que tu complejo tenga movimientos registrados

### Error al guardar
- Verificar que todos los campos requeridos estén llenos
- Verificar que el monto sea positivo
- Verificar conexión con el servidor

---

## 🎉 ¡Listo!

El sistema está **completamente funcional** y listo para producción.

**Última actualización:** 7 de Octubre, 2025 - 18:30 (Chile)


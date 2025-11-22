# 📊 ANÁLISIS COMPLETO DEL PROYECTO - RESERVA TU CANCHA

**Fecha de Análisis:** $(date)  
**Versión del Proyecto:** 1.0.0  
**Estado:** Producción en Render

---

## 🎯 RESUMEN EJECUTIVO

**Reserva Tu Cancha** es un sistema completo de gestión de reservas de canchas deportivas desarrollado en Node.js con Express, PostgreSQL y frontend vanilla JavaScript. El sistema permite a usuarios finales reservar canchas de padel y fútbol, mientras que los administradores gestionan complejos, canchas, reservas, pagos, reportes financieros y control de gastos.

### Características Principales
- ✅ Sistema de reservas en tiempo real
- ✅ Integración con Transbank (WebPay Plus) para pagos
- ✅ Panel de administración con roles y permisos
- ✅ Sistema de control de gastos e ingresos
- ✅ Gestión de comisiones y depósitos
- ✅ Sistema de promociones y descuentos
- ✅ Notificaciones por email
- ✅ Generación de reportes y PDFs
- ✅ Sistema de bloqueos temporales y permanentes
- ✅ Códigos de descuento y códigos de un solo uso

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Stack Tecnológico

#### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 4.18.2
- **Base de Datos:** PostgreSQL (unificado para desarrollo y producción)
- **ORM/Query:** pg (PostgreSQL client) con pool de conexiones
- **Autenticación:** JWT (jsonwebtoken)
- **Seguridad:** bcryptjs, helmet, express-rate-limit, express-validator
- **Pagos:** Transbank SDK (WebPay Plus)
- **Email:** Nodemailer + SendGrid
- **PDF:** jsPDF + html2canvas

#### Frontend
- **Tecnología:** Vanilla JavaScript (sin frameworks)
- **UI Framework:** Bootstrap 5.3.0
- **Iconos:** Font Awesome 6.0.0
- **Gráficos:** Chart.js
- **PWA:** Service Worker configurado

#### Infraestructura
- **Hosting:** Render.com
- **Base de Datos:** PostgreSQL en Render (free tier)
- **Auto-deploy:** Habilitado desde GitHub (branch: main)
- **Región:** Oregon, USA

---

## 📁 ESTRUCTURA DEL PROYECTO

```
ReservaTuCancha/
├── server.js                    # Servidor principal (13,000+ líneas)
├── config.js                    # Configuración centralizada
├── package.json                 # Dependencias y scripts
├── render.yaml                  # Configuración de despliegue
│
├── src/                         # Código fuente organizado
│   ├── config/                  # Configuraciones
│   │   ├── database.js         # Gestor de base de datos PostgreSQL
│   │   ├── database-unified.js # Versión unificada
│   │   └── security.js          # Configuración de seguridad
│   │
│   ├── controllers/            # Lógica de negocio
│   │   ├── reservationController.js
│   │   ├── authController.js
│   │   ├── adminController.js
│   │   ├── availabilityController.js
│   │   ├── bloqueosController.js
│   │   ├── gastosController.js
│   │   └── promocionesController.js
│   │
│   ├── routes/                 # Definición de rutas API
│   │   ├── reservations.js
│   │   ├── payments.js
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── availability.js
│   │   ├── bloqueos.js
│   │   ├── gastos.js
│   │   ├── promociones.js
│   │   └── monitoring.js
│   │
│   ├── services/               # Servicios externos
│   │   ├── paymentService.js   # Integración Transbank
│   │   ├── emailService.js    # Envío de emails
│   │   ├── pdfService.js       # Generación de PDFs
│   │   └── reportService.js    # Generación de reportes
│   │
│   ├── middleware/             # Middlewares personalizados
│   │   ├── auth.js             # Autenticación JWT
│   │   ├── role-permissions.js # Control de acceso por roles
│   │   ├── security.js         # Seguridad avanzada
│   │   ├── cache-middleware.js # Caché de respuestas
│   │   └── metrics-middleware.js # Métricas y monitoreo
│   │
│   └── utils/                  # Utilidades
│       ├── dateUtils.js        # Manejo de fechas (zona horaria Chile)
│       ├── atomic-reservation.js # Reservas atómicas
│       ├── validation.js       # Validación de datos
│       ├── logger.js           # Sistema de logging
│       └── metrics-collector.js # Recolección de métricas
│
├── public/                      # Frontend estático
│   ├── index.html              # Página principal de reservas
│   ├── script.js               # Lógica del frontend
│   ├── styles.css              # Estilos principales
│   │
│   ├── admin-*.html            # Páginas del panel admin
│   │   ├── admin-login.html
│   │   ├── admin-dashboard.html
│   │   ├── admin-reservations.html
│   │   ├── admin-complexes.html
│   │   ├── admin-courts.html
│   │   ├── admin-reports.html
│   │   └── admin-gastos.html
│   │
│   ├── payment.html            # Página de pagos Transbank
│   ├── payment-success.html    # Confirmación de pago
│   │
│   ├── js/                     # Módulos JavaScript
│   │   ├── admin-utils.js
│   │   ├── chart-filters.js
│   │   ├── notification-system.js
│   │   └── time-utils.js
│   │
│   └── images/logos/           # Logos de complejos
│
├── middleware/                  # Middlewares adicionales
│   └── role-permissions.js     # Permisos por rol
│
├── scripts/                     # Scripts de utilidad (200+ archivos)
│   ├── database/               # Scripts de base de datos
│   ├── deployment/             # Scripts de despliegue
│   ├── maintenance/            # Mantenimiento
│   ├── testing/                # Tests automatizados
│   ├── optimization/           # Optimización
│   ├── security/               # Seguridad
│   └── backup/                 # Backups
│
└── docs/                        # Documentación
```

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tablas Principales

#### **ciudades**
- `id` (SERIAL PRIMARY KEY)
- `nombre` (VARCHAR, UNIQUE)

#### **complejos**
- `id` (SERIAL PRIMARY KEY)
- `nombre` (VARCHAR)
- `ciudad_id` (FK → ciudades)
- `direccion` (TEXT)
- `telefono` (VARCHAR)
- `email` (VARCHAR)
- `comision_inicio_fecha` (DATE) - Para exenciones de comisiones

#### **canchas**
- `id` (SERIAL PRIMARY KEY)
- `complejo_id` (FK → complejos)
- `nombre` (VARCHAR)
- `tipo` (VARCHAR) - 'futbol', 'padel', etc.
- `precio_hora` (INTEGER)

#### **usuarios**
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR) - Hasheado con bcrypt
- `nombre` (VARCHAR)
- `rol` (VARCHAR) - 'super_admin', 'owner', 'manager'
- `activo` (BOOLEAN)
- `complejo_id` (FK → complejos)
- `created_at` (TIMESTAMP)

#### **reservas**
- `id` (SERIAL PRIMARY KEY)
- `codigo_reserva` (VARCHAR, UNIQUE) - Código de 6 caracteres
- `cancha_id` (FK → canchas)
- `usuario_id` (FK → usuarios) - Opcional
- `nombre_cliente` (VARCHAR)
- `email_cliente` (VARCHAR)
- `telefono_cliente` (VARCHAR)
- `rut_cliente` (VARCHAR)
- `fecha` (DATE)
- `hora_inicio` (TIME)
- `hora_fin` (TIME)
- `estado` (VARCHAR) - 'pendiente', 'confirmada', 'cancelada'
- `estado_pago` (VARCHAR) - 'pendiente', 'pagado', 'reembolsado'
- `precio_total` (INTEGER)
- `tipo_reserva` (VARCHAR) - 'directa', 'administrativa'
- `creada_por_admin` (BOOLEAN)
- `admin_id` (FK → usuarios)
- `comision_aplicada` (DECIMAL)
- `metodo_contacto` (VARCHAR) - 'web', 'presencial', 'whatsapp'
- `created_at` (TIMESTAMP)
- `fecha_creacion` (TIMESTAMP)

#### **pagos**
- `id` (SERIAL PRIMARY KEY)
- `reserva_id` (FK → reservas)
- `transbank_token` (VARCHAR, UNIQUE)
- `order_id` (VARCHAR)
- `amount` (INTEGER)
- `status` (VARCHAR) - 'pending', 'approved', 'rejected'
- `authorization_code` (VARCHAR)
- `payment_type_code` (VARCHAR)
- `response_code` (INTEGER)
- `installments_number` (INTEGER)
- `transaction_date` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `bloqueo_id` (VARCHAR)
- `reservation_code` (VARCHAR)

#### **bloqueos_temporales**
- `id` (VARCHAR, PRIMARY KEY) - UUID
- `cancha_id` (FK → canchas)
- `fecha` (DATE)
- `hora_inicio` (TIME)
- `hora_fin` (TIME)
- `session_id` (VARCHAR)
- `expira_en` (TIMESTAMP) - 15 minutos
- `datos_cliente` (TEXT) - JSON
- `codigo_reserva` (VARCHAR)
- `creado_en` (TIMESTAMP)

#### **bloqueos_canchas** (Bloqueos permanentes)
- `id` (SERIAL PRIMARY KEY)
- `cancha_id` (FK → canchas)
- `motivo` (VARCHAR)
- `descripcion` (TEXT)
- `tipo_fecha` (VARCHAR) - 'especifico', 'rango', 'recurrente_semanal'
- `fecha_especifica` (DATE)
- `fecha_inicio` (DATE)
- `fecha_fin` (DATE)
- `dias_semana` (TEXT[])
- `tipo_horario` (VARCHAR) - 'especifico', 'rango', 'todo_el_dia'
- `hora_especifica` (TIME)
- `hora_inicio` (TIME)
- `hora_fin` (TIME)
- `activo` (BOOLEAN)
- `creado_por` (FK → usuarios)
- `creado_en` (TIMESTAMP)
- `actualizado_en` (TIMESTAMP)

#### **codigos_descuento**
- `id` (SERIAL PRIMARY KEY)
- `codigo` (VARCHAR, UNIQUE)
- `descripcion` (TEXT)
- `porcentaje_descuento` (DECIMAL)
- `monto_maximo_descuento` (INTEGER)
- `fecha_inicio` (DATE)
- `fecha_fin` (DATE)
- `usos_maximos` (INTEGER)
- `usos_actuales` (INTEGER)
- `activo` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### **codigos_unico_uso**
- `id` (SERIAL PRIMARY KEY)
- `codigo` (VARCHAR, UNIQUE)
- `email_cliente` (VARCHAR)
- `usado` (BOOLEAN)
- `expira_en` (TIMESTAMP)
- `created_at` (TIMESTAMP)

#### **promociones_canchas**
- `id` (SERIAL PRIMARY KEY)
- `cancha_id` (FK → canchas)
- `nombre` (VARCHAR)
- `precio_promocional` (INTEGER)
- `tipo_fecha` (VARCHAR) - 'especifico', 'rango', 'recurrente_semanal'
- `fecha_especifica` (DATE)
- `fecha_inicio` (DATE)
- `fecha_fin` (DATE)
- `dias_semana` (TEXT)
- `tipo_horario` (VARCHAR) - 'especifico', 'rango'
- `hora_especifica` (TIME)
- `hora_inicio` (TIME)
- `hora_fin` (TIME)
- `descripcion` (TEXT)
- `activo` (BOOLEAN)
- `creado_por` (FK → usuarios)
- `creado_en` (TIMESTAMP)
- `actualizado_en` (TIMESTAMP)

#### **gastos_ingresos** (Control Financiero)
- `id` (SERIAL PRIMARY KEY)
- `complejo_id` (FK → complejos)
- `categoria_id` (FK → categorias_gastos)
- `tipo` (VARCHAR) - 'gasto', 'ingreso'
- `monto` (DECIMAL)
- `fecha` (DATE)
- `descripcion` (TEXT)
- `metodo_pago` (VARCHAR)
- `numero_documento` (VARCHAR)
- `archivo_adjunto` (VARCHAR)
- `usuario_id` (FK → usuarios)
- `creado_en` (TIMESTAMP)
- `actualizado_en` (TIMESTAMP)

#### **categorias_gastos**
- `id` (SERIAL PRIMARY KEY)
- `complejo_id` (FK → complejos)
- `nombre` (VARCHAR)
- `descripcion` (TEXT)
- `icono` (VARCHAR) - Clase Font Awesome
- `color` (VARCHAR) - Color hex
- `tipo` (VARCHAR) - 'gasto', 'ingreso'
- `es_predefinida` (BOOLEAN)
- `creado_en` (TIMESTAMP)

#### **depositos_complejos**
- `id` (SERIAL PRIMARY KEY)
- `complejo_id` (FK → complejos)
- `fecha_deposito` (DATE)
- `monto_total_reservas` (INTEGER)
- `comision_porcentaje` (DECIMAL)
- `comision_sin_iva` (INTEGER)
- `iva_comision` (INTEGER)
- `comision_total` (INTEGER)
- `monto_a_depositar` (INTEGER)
- `estado` (VARCHAR) - 'pendiente', 'pagado', 'cancelado'
- `metodo_pago` (VARCHAR)
- `numero_transaccion` (VARCHAR)
- `banco_destino` (VARCHAR)
- `observaciones` (TEXT)
- `procesado_por` (INTEGER)
- `fecha_procesado` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE(complejo_id, fecha_deposito)

#### **password_reset_tokens**
- `id` (SERIAL PRIMARY KEY)
- `user_id` (FK → usuarios)
- `token` (VARCHAR, UNIQUE)
- `email` (VARCHAR)
- `expires_at` (TIMESTAMP)
- `used` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### **uso_codigos_descuento**
- `id` (SERIAL PRIMARY KEY)
- `codigo_id` (FK → codigos_descuento)
- `reserva_id` (FK → reservas)
- `email_cliente` (VARCHAR)
- `monto_descuento` (INTEGER)
- `monto_original` (INTEGER)
- `monto_final` (INTEGER)
- `usado_en` (TIMESTAMP)

### Índices y Optimizaciones
- Índices en claves foráneas
- Índices en fechas para consultas rápidas
- Índices en códigos de reserva
- Índices en estados de reservas y pagos
- Pool de conexiones optimizado (max: 20, min: 2)

---

## 🔐 SISTEMA DE ROLES Y PERMISOS

### Roles Definidos

#### **1. SUPER ADMIN** 🔑
- **Acceso:** TODO el sistema
- **Permisos:**
  - ✅ Ver todos los complejos
  - ✅ Ver todas las reservas
  - ✅ Gestionar todos los complejos
  - ✅ Gestionar todas las canchas
  - ✅ Ver reportes globales
  - ✅ Ver ingresos globales
  - ✅ Gestionar usuarios
  - ✅ Configuraciones del sistema

#### **2. OWNER** 👑 (Dueño del Complejo)
- **Acceso:** TODO pero SOLO de su complejo
- **Permisos:**
  - ✅ Dashboard completo de su complejo
  - ✅ Ver reservas de su complejo (con precios)
  - ✅ Gestionar canchas de su complejo
  - ✅ Ver reportes de su complejo
  - ✅ Ver ingresos de su complejo
  - ✅ Gestionar usuarios de su complejo
  - ✅ Control de gastos de su complejo
  - ❌ No puede ver otros complejos
  - ❌ No puede ver reportes globales

#### **3. MANAGER** 👤 (Administrador del Complejo)
- **Acceso:** LIMITADO - solo operaciones básicas
- **Permisos:**
  - ✅ Dashboard básico de su complejo
  - ✅ Ver reservas de su complejo (SIN precios)
  - ✅ Ver canchas de su complejo (solo lectura)
  - ✅ Editar reservas de su complejo
  - ❌ NO puede ver reportes
  - ❌ NO puede ver ingresos
  - ❌ NO puede gestionar usuarios
  - ❌ NO puede ver otros complejos

### Implementación
- Middleware `requireRolePermission` en `middleware/role-permissions.js`
- Filtrado automático por `complejo_id` según rol
- Ocultación de elementos en frontend según permisos
- Validación en cada endpoint del backend

---

## 💳 SISTEMA DE PAGOS

### Integración Transbank (WebPay Plus)

#### Configuración
- **Ambiente:** Integration (pruebas) / Production
- **Commerce Code:** Configurado en variables de entorno
- **API Key:** Configurado en variables de entorno
- **Return URL:** `/payment.html`
- **Final URL:** `/?payment=success`

#### Flujo de Pago
1. **Usuario inicia reserva:**
   - Completa formulario de reserva
   - Se crea bloqueo temporal (15 minutos)
   - Se genera código de reserva único

2. **Inicio de pago:**
   - POST `/api/payments/init`
   - Validación de bloqueo temporal
   - Validación de códigos de descuento/un solo uso
   - Creación de transacción en Transbank
   - Redirección a Transbank con formulario POST

3. **Procesamiento en Transbank:**
   - Usuario ingresa datos de tarjeta
   - Transbank procesa el pago
   - **Nota:** En producción requiere autorización manual

4. **Confirmación:**
   - Transbank redirige a `/payment.html?token_ws=TOKEN`
   - JavaScript detecta token y llama a `/api/payments/confirm`
   - Se confirma transacción con Transbank
   - Se crea reserva en base de datos
   - Se envía email de confirmación
   - Se redirige a página de éxito

#### Servicio de Pagos
- Clase `PaymentService` en `src/services/paymentService.js`
- Métodos: `createTransaction`, `confirmTransaction`, `getTransactionStatus`
- Manejo de errores y reintentos

---

## 📧 SISTEMA DE EMAILS

### Configuración
- **SMTP Host:** smtp.zoho.com
- **Puerto:** 587 (STARTTLS)
- **Usuarios:**
  - `soporte@reservatuscanchas.cl` - Emails generales
  - `reservas@reservatuscanchas.cl` - Confirmaciones de reserva

### Tipos de Emails
1. **Confirmación de Reserva:**
   - Enviado automáticamente al crear reserva
   - Incluye código de reserva, fecha, hora, cancha
   - Formato HTML con estilos

2. **Confirmación de Pago:**
   - Enviado después de pago exitoso
   - Incluye detalles de transacción

3. **Recordatorios:**
   - (Pendiente de implementar)

4. **Notificaciones Administrativas:**
   - Alertas de sistema
   - Notificaciones de errores

### Servicio de Email
- Clase `EmailService` en `src/services/emailService.js`
- Manejo de zona horaria de Chile
- Templates HTML personalizados

---

## 🎯 FUNCIONALIDADES PRINCIPALES

### 1. Sistema de Reservas

#### Proceso de Reserva (Usuario Final)
1. Selección de ciudad
2. Selección de complejo deportivo
3. Selección de tipo de cancha (fútbol/padel)
4. Visualización de disponibilidad en tiempo real
5. Selección de fecha y hora
6. Completar datos personales (nombre, email, teléfono, RUT)
7. Aplicar código de descuento (opcional)
8. Bloqueo temporal (15 minutos)
9. Redirección a pago Transbank
10. Confirmación y email

#### Tipos de Reserva
- **Directa:** Reserva desde web (comisión 15%)
- **Administrativa:** Creada por admin (comisión 8%)
  - Métodos: Web, Presencial, WhatsApp
  - Descuentos: Presencial 10%, WhatsApp 5%

#### Gestión de Disponibilidad
- Consultas en tiempo real
- Considera:
  - Reservas confirmadas
  - Bloqueos temporales activos
  - Bloqueos permanentes
  - Promociones activas
- Filtros por fecha, hora, tipo de cancha

### 2. Panel de Administración

#### Dashboard
- Estadísticas generales:
  - Reservas del día/semana/mes
  - Ingresos totales (según permisos)
  - Canchas más reservadas
  - Gráficos de tendencias
- KPIs por complejo
- Alertas y notificaciones

#### Gestión de Reservas
- Listado completo con filtros:
  - Por fecha (específica o rango)
  - Por tipo (directa/administrativa)
  - Por método de contacto
  - Por estado
  - Por complejo (super admin)
- Búsqueda rápida por código, nombre, email
- Edición de reservas
- Cancelación de reservas
- Creación manual de reservas

#### Gestión de Complejos
- CRUD completo de complejos
- Asignación de usuarios
- Configuración de comisiones
- Fechas de inicio de comisiones

#### Gestión de Canchas
- CRUD completo de canchas
- Configuración de precios
- Gestión de promociones
- Gestión de bloqueos permanentes

#### Reportes
- Reportes financieros:
  - Ingresos por período
  - Comisiones calculadas
  - Depósitos pendientes
- Reportes de reservas:
  - Reservas por período
  - Canchas más reservadas
  - Horarios más populares
- Exportación a PDF/Excel

#### Control de Gastos
- Registro de gastos e ingresos
- Categorías personalizables por complejo
- Métodos de pago
- Adjuntos de documentos
- Reportes financieros
- Cálculo automático de comisiones

### 3. Sistema de Promociones

#### Tipos de Promoción
- **Fecha Específica:** Precio promocional en fecha determinada
- **Rango de Fechas:** Precio promocional entre dos fechas
- **Recurrente Semanal:** Precio promocional en días específicos de la semana

#### Horarios
- **Hora Específica:** Precio promocional a hora determinada
- **Rango de Horas:** Precio promocional entre dos horas

### 4. Sistema de Descuentos

#### Códigos de Descuento
- Porcentaje de descuento
- Monto máximo de descuento
- Fechas de vigencia
- Límite de usos
- Activo/Inactivo

#### Códigos de Un Solo Uso
- Código único por email
- Validación de email
- Expiración configurable
- Uso único

### 5. Sistema de Bloqueos

#### Bloqueos Temporales
- Duración: 15 minutos
- Se crean al iniciar proceso de reserva
- Se eliminan automáticamente al expirar
- Previenen doble reserva

#### Bloqueos Permanentes
- Para mantenimiento, eventos, etc.
- Configuración flexible:
  - Fecha específica
  - Rango de fechas
  - Recurrente semanal
  - Hora específica o rango
  - Todo el día

### 6. Sistema de Comisiones y Depósitos

#### Cálculo de Comisiones
- **Reservas Directas:** 15% de comisión
- **Reservas Administrativas:** 8% de comisión
- **IVA:** 19% sobre comisión
- **Exenciones:** Por fecha de inicio configurable

#### Depósitos
- Cálculo automático diario
- Agrupación por complejo y fecha
- Estados: pendiente, pagado, cancelado
- Registro de método de pago y transacción

---

## 🔌 API ENDPOINTS PRINCIPALES

### Públicas (Sin Autenticación)

#### Reservas
- `GET /api/reservations/ciudades` - Listar ciudades
- `GET /api/reservations/complejos/:ciudadId` - Listar complejos
- `GET /api/reservations/canchas/:complejoId/:tipo` - Listar canchas
- `GET /api/reservations/disponibilidad/:canchaId/:fecha` - Disponibilidad
- `POST /api/reservations/reservas` - Crear reserva
- `POST /api/reservations/bloquear-y-pagar` - Bloquear y pagar
- `GET /api/reservations/reservas/:codigo` - Consultar reserva

#### Pagos
- `POST /api/payments/init` - Iniciar pago
- `POST /api/payments/confirm` - Confirmar pago
- `GET /api/payments/status/:token` - Estado de pago

### Protegidas (Con Autenticación JWT)

#### Autenticación
- `POST /api/auth/login` - Login admin

#### Admin - Reservas
- `GET /api/admin/reservas` - Listar reservas (con filtros)
- `GET /api/admin/reservas/:codigo` - Detalle de reserva
- `PUT /api/admin/reservas/:codigo` - Editar reserva
- `DELETE /api/admin/reservas/:codigo` - Cancelar reserva
- `POST /api/admin/reservas` - Crear reserva administrativa

#### Admin - Complejos
- `GET /api/admin/complejos` - Listar complejos
- `POST /api/admin/complejos` - Crear complejo
- `PUT /api/admin/complejos/:id` - Editar complejo
- `DELETE /api/admin/complejos/:id` - Eliminar complejo

#### Admin - Canchas
- `GET /api/admin/canchas/:complejoId` - Listar canchas
- `POST /api/admin/canchas` - Crear cancha
- `PUT /api/admin/canchas/:id` - Editar cancha
- `DELETE /api/admin/canchas/:id` - Eliminar cancha

#### Admin - Reportes
- `GET /api/admin/reportes/ingresos` - Reporte de ingresos
- `GET /api/admin/reportes/reservas` - Reporte de reservas
- `GET /api/admin/reportes/comisiones` - Reporte de comisiones

#### Admin - Gastos
- `GET /api/admin/gastos` - Listar gastos/ingresos
- `POST /api/admin/gastos` - Crear gasto/ingreso
- `PUT /api/admin/gastos/:id` - Editar gasto/ingreso
- `DELETE /api/admin/gastos/:id` - Eliminar gasto/ingreso
- `GET /api/admin/gastos/categorias` - Listar categorías

#### Admin - Dashboard
- `GET /api/admin/dashboard` - Estadísticas del dashboard
- `GET /api/admin/dashboard/kpis` - KPIs por complejo

#### Admin - Calendario
- `GET /api/admin/calendar/week` - Datos del calendario semanal
- `POST /api/admin/calendar/reservation` - Crear reserva desde calendario

---

## 🔒 SEGURIDAD

### Implementaciones

#### Autenticación
- JWT (JSON Web Tokens)
- Expiración de tokens: 24 horas
- Refresh tokens (pendiente)

#### Contraseñas
- Hash con bcryptjs (12 rounds)
- Validación de fortaleza
- Reset de contraseña con tokens temporales

#### Middleware de Seguridad
- Helmet.js - Headers de seguridad
- express-rate-limit - Límite de requests
- express-slow-down - Ralentización de requests
- express-mongo-sanitize - Sanitización de inputs
- xss-clean - Prevención XSS
- hpp - Prevención de parameter pollution
- CORS configurado para producción

#### Validación
- express-validator en todos los endpoints
- Validación de tipos de datos
- Sanitización de inputs
- Validación de fechas y horas

#### Base de Datos
- Prepared statements (previene SQL injection)
- Pool de conexiones con límites
- Timeout de conexiones
- Manejo de errores

---

## 📊 MONITOREO Y MÉTRICAS

### Sistema de Métricas
- Recolección de métricas de API
- Métricas de base de datos
- Métricas de autenticación
- Métricas de páginas
- Métricas de errores
- Métricas de usuarios

### Logging
- Sistema de logging avanzado (temporalmente deshabilitado)
- Logs de errores
- Logs de transacciones
- Logs de autenticación

### Alertas
- Sistema de alertas configurado
- Notificaciones de errores críticos
- Alertas de rendimiento

---

## 🚀 DESPLIEGUE Y CONFIGURACIÓN

### Render.com

#### Configuración
- **Tipo:** Web Service
- **Runtime:** Node.js
- **Plan:** Free
- **Región:** Oregon
- **Auto-deploy:** Habilitado (branch: main)
- **Health Check:** `/health`

#### Variables de Entorno
```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<from_database>
JWT_SECRET=<generated>
CORS_ORIGIN=https://www.reservatuscanchas.cl
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=soporte@reservatuscanchas.cl
SMTP_PASS=<password>
TRANSBANK_API_KEY=<key>
TRANSBANK_COMMERCE_CODE=<code>
TRANSBANK_ENVIRONMENT=integration
TRANSBANK_RETURN_URL=https://www.reservatuscanchas.cl/payment.html
TRANSBANK_FINAL_URL=https://www.reservatuscanchas.cl/?payment=success
```

#### Base de Datos
- **Tipo:** PostgreSQL
- **Plan:** Free
- **Región:** Oregon
- **Zona Horaria:** America/Santiago (configurada)

### Scripts de Despliegue
- `npm run deploy` - Deploy automático
- `npm run deploy-full` - Deploy completo con población de datos
- `npm run check-db` - Verificar estado de BD
- `npm run check-render` - Verificar estado en Render

---

## 🧪 TESTING

### Scripts de Prueba
- `npm test` - Tests con Jest
- `npm run test:watch` - Tests en modo watch
- `npm run test:coverage` - Tests con cobertura
- `npm run test:integration` - Tests de integración
- `npm run test:performance` - Tests de rendimiento

### Tests Disponibles
- Tests de reservas
- Tests de pagos
- Tests de autenticación
- Tests de API endpoints
- Tests de base de datos

---

## 📝 SCRIPTS Y HERRAMIENTAS

### Categorías de Scripts

#### Base de Datos
- Migraciones
- Backups
- Limpieza
- Sincronización
- Verificación

#### Mantenimiento
- Limpieza de duplicados
- Optimización
- Sincronización entre entornos
- Restauración de datos

#### Testing
- Tests automatizados
- Tests de flujo completo
- Tests de endpoints
- Tests de rendimiento

#### Optimización
- Optimización de assets
- Optimización de CSS/JS
- Optimización de base de datos
- Benchmarking

#### Seguridad
- Auditoría de seguridad
- Verificación de vulnerabilidades
- Optimización de seguridad

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problemas Resueltos
1. ✅ **Zona horaria:** Configurada a America/Santiago en todas las conexiones
2. ✅ **Códigos de reserva:** Generación única de 6 caracteres
3. ✅ **Bloqueos temporales:** Expiración automática a los 15 minutos
4. ✅ **Pagos Transbank:** Flujo completo implementado
5. ✅ **Emails:** Configuración SMTP corregida
6. ✅ **Roles y permisos:** Sistema completo implementado
7. ✅ **Comisiones:** Cálculo automático implementado

### Áreas de Mejora
- [ ] Implementar refresh tokens
- [ ] Mejorar sistema de logging
- [ ] Optimizar consultas de disponibilidad
- [ ] Implementar caché Redis
- [ ] Mejorar manejo de errores
- [ ] Implementar tests E2E
- [ ] Documentación de API completa

---

## 📚 DOCUMENTACIÓN ADICIONAL

### Archivos de Documentación
- `README.md` - Documentación principal
- `DEPLOYMENT.md` - Guía de despliegue
- `CONTROL_GASTOS_README.md` - Sistema de gastos
- `ROLES_IMPLEMENTATION_SUMMARY.md` - Sistema de roles
- `PAYMENT_FLOW_SUMMARY.md` - Flujo de pagos
- `MEJORAS_RESERVAS_IMPLEMENTADAS.md` - Mejoras recientes

### Notepads
- `.cursor/notepads/` - Documentación técnica adicional

---

## 🎯 PRÓXIMOS PASOS SUGERIDOS

### Mejoras Técnicas
1. Refactorizar `server.js` (13,000+ líneas) en módulos más pequeños
2. Implementar tests automatizados completos
3. Optimizar consultas de base de datos
4. Implementar caché Redis para disponibilidad
5. Mejorar manejo de errores y logging

### Nuevas Funcionalidades
1. Sistema de notificaciones push
2. Aplicación móvil (React Native)
3. Sistema de calificaciones y reseñas
4. Integración con calendarios externos
5. Sistema de membresías
6. Programa de fidelización

### Optimizaciones
1. Implementar CDN para assets estáticos
2. Optimizar imágenes
3. Implementar lazy loading
4. Mejorar SEO
5. Implementar PWA completa

---

## 📞 INFORMACIÓN DE CONTACTO

- **Email Soporte:** soporte@reservatuscanchas.cl
- **Email Reservas:** reservas@reservatuscanchas.cl
- **URL Producción:** https://www.reservatuscanchas.cl
- **URL Render:** https://reserva-tu-cancha.onrender.com

---

**Documento generado automáticamente - Análisis completo del proyecto Reserva Tu Cancha**


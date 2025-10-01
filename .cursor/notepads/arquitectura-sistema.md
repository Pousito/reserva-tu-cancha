# 🏗️ Arquitectura del Sistema - Reserva Tu Cancha

## Visión General
Sistema de reservas de canchas deportivas con arquitectura cliente-servidor, separación de entornos y auto-deployment.

## Componentes Principales

### Backend (Node.js + Express)
```
server.js                 # Servidor principal
├── src/
│   ├── app.js           # Configuración de Express
│   ├── config/          # Configuraciones
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Middlewares personalizados
│   ├── routes/          # Definición de rutas
│   ├── services/        # Servicios externos
│   └── utils/           # Utilidades
└── scripts/             # Scripts de utilidad
```

### Frontend (Vanilla JS)
```
public/
├── index.html           # Página principal
├── styles.css           # Estilos
├── script.js            # Lógica del cliente
├── js/                  # Módulos JavaScript
└── payment.html         # Página de pagos
```

### Base de Datos
- **Desarrollo**: PostgreSQL local (`reserva_tu_cancha_local`) con datos ficticios
- **Producción**: PostgreSQL en Neon con datos reales
- **Configuración**: PostgreSQL unificado para ambos entornos
- **Esquema**: ciudades → complejos → canchas → reservas

## Flujo de Datos

### Proceso de Reserva
1. Usuario selecciona ciudad y complejo
2. Sistema consulta disponibilidad en BD
3. Usuario completa datos y confirma
4. Sistema genera código de reserva único
5. Envío de email de confirmación
6. Integración con Transbank para pagos

### Gestión de Disponibilidad
- Consultas en tiempo real a la BD
- Filtros por fecha, hora, tipo de cancha
- Visualización gráfica de disponibilidad

## Entornos

### Desarrollo
- **URL**: http://localhost:3000
- **BD**: PostgreSQL local (`reserva_tu_cancha_local`)
- **Datos**: Ficticios para testing
- **Auto-reload**: Nodemon
- **Configuración**: `env.postgresql`

### Producción
- **URL**: https://www.reservatuscanchas.cl
- **BD**: PostgreSQL en Neon
- **Datos**: Reales de clientes
- **Deploy**: Automático desde Git

## Integraciones Externas

### Transbank (Pagos)
- WebPay Plus para pagos online
- Configuración de integración
- URLs de retorno configuradas

### Email (Zoho)
- SMTP para notificaciones
- Confirmaciones de reserva
- Recordatorios automáticos

### Hosting (Render)
- Auto-deploy desde Git
- Variables de entorno configuradas
- Health checks automáticos

## Seguridad
- Middleware de seguridad (Helmet, CORS)
- Rate limiting para APIs
- Validación de entradas
- Variables sensibles en entorno

## Monitoreo
- Logs de aplicación
- Health checks en Render
- Backups automáticos de BD
- Scripts de diagnóstico

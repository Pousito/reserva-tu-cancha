# Configuración de Logging y Alertas

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env`:

```env
# Sistema de Alertas por Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion
ADMIN_EMAIL=admin@reservatuscanchas.cl

# Configuración de Logging
LOG_LEVEL=info
LOG_ROTATION_SIZE=10MB
LOG_RETENTION_DAYS=7

# Umbrales de Alertas
SLOW_QUERY_THRESHOLD=1000
SLOW_REQUEST_THRESHOLD=2000
CRITICAL_ERROR_THRESHOLD=5000
ERROR_RATE_THRESHOLD=10

# Configuración de Monitoreo
MONITORING_INTERVAL=60000
HEALTH_CHECK_INTERVAL=300000
```

## Archivos de Log Generados

- `logs/app.log` - Log general de la aplicación
- `logs/errors.log` - Solo errores
- `logs/warnings.log` - Solo advertencias
- `logs/requests.log` - Requests HTTP con métricas
- `logs/database.log` - Consultas de base de datos
- `logs/reservations.log` - Operaciones de reservas
- `logs/payments.log` - Operaciones de pagos
- `logs/auth.log` - Operaciones de autenticación
- `logs/performance.log` - Métricas de rendimiento
- `logs/alerts.log` - Alertas críticas
- `logs/debug.log` - Logs de debug (solo desarrollo)

## Comandos de Monitoreo

```bash
# Generar reporte de logs
npm run logs:report

# Monitoreo en tiempo real
npm run logs:monitor

# Limpiar logs antiguos
npm run logs:cleanup
```

## Características del Sistema

1. **Logging Estructurado**: Todos los logs en formato JSON
2. **Tracking de Requests**: Cada request tiene un ID único
3. **Métricas de Rendimiento**: Tiempo de respuesta, consultas lentas
4. **Alertas Automáticas**: Email para errores críticos
5. **Rotación de Logs**: Automática por tamaño y tiempo
6. **Limpieza Automática**: Eliminación de logs antiguos

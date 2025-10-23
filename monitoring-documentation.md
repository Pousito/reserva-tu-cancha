# Sistema de Monitoreo y Analytics

## 📊 Descripción

Sistema completo de monitoreo en tiempo real para Reserva Tu Cancha que incluye:

- **Métricas de Rendimiento**: APIs, base de datos, memoria, CPU
- **Métricas de Negocio**: Reservas, pagos, usuarios
- **Sistema de Alertas**: Email, webhook, logs
- **Dashboard en Tiempo Real**: Visualización de métricas

## 🚀 Características

### 📈 Métricas de Rendimiento
- Tiempo de respuesta de APIs
- Rendimiento de consultas de base de datos
- Uso de memoria y CPU
- Tasa de errores
- Tiempo de carga de páginas

### 💼 Métricas de Negocio
- Reservas por complejo y hora
- Ingresos y conversión
- Métricas de pagos
- Actividad de usuarios

### 🚨 Sistema de Alertas
- Alertas por rendimiento lento
- Alertas por errores críticos
- Alertas de negocio
- Notificaciones por email/webhook

### 📊 Dashboard
- Métricas en tiempo real
- Gráficos interactivos
- Historial de alertas
- Estado del sistema

## 🛠️ Uso

### Acceder al Dashboard
```
http://localhost:3000/monitoring
```

### APIs de Monitoreo
```
GET /api/monitoring/summary          # Resumen general
GET /api/monitoring/performance      # Métricas de rendimiento
GET /api/monitoring/business         # Métricas de negocio
GET /api/monitoring/system           # Métricas de sistema
GET /api/monitoring/apis             # Estadísticas de APIs
GET /api/monitoring/database         # Estadísticas de DB
GET /api/monitoring/reservations     # Estadísticas de reservas
GET /api/monitoring/payments         # Estadísticas de pagos
GET /api/monitoring/alerts           # Historial de alertas
GET /api/monitoring/health           # Health check
```

### Scripts Disponibles
```
npm run monitoring:setup              # Configurar sistema
npm run monitoring:dashboard          # Ver URL del dashboard
npm run monitoring:metrics            # Ver métricas resumidas
npm run monitoring:alerts             # Ver alertas recientes
npm run monitoring:health             # Health check
npm run monitoring:cleanup            # Limpiar métricas antiguas
```

## ⚙️ Configuración

### Variables de Entorno
```
# Email para alertas
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password

# Email de destino para alertas
ALERT_EMAIL=admin@tudominio.com

# Webhook para alertas (opcional)
WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Configuración de Alertas
Las alertas se configuran automáticamente con umbrales sensatos:

- **API lenta**: > 5 segundos
- **Query DB lenta**: > 2 segundos
- **Tasa de error alta**: > 5%
- **Uso alto de memoria**: > 80%

## 📊 Métricas Disponibles

### Rendimiento
- Tiempo de respuesta de APIs
- Rendimiento de consultas DB
- Uso de memoria/CPU
- Tasa de errores

### Negocio
- Total de reservas
- Ingresos totales
- Tasa de éxito de pagos
- Reservas por complejo/hora

### Sistema
- Tiempo activo
- Uso de memoria
- Conexiones de DB
- Requests activos

## 🚨 Tipos de Alertas

### Críticas
- Errores de servidor (5xx)
- Errores de base de datos
- Errores de pagos
- Tasa alta de fallos en pagos

### Advertencias
- APIs lentas
- Queries DB lentas
- Uso alto de memoria
- Caída en reservas

### Información
- Servidor inactivo
- Métricas de uso

## 🔧 Mantenimiento

### Limpieza Automática
- Métricas antiguas: 7 días
- Alertas antiguas: 30 días
- Historial de memoria: 100 entradas

### Limpieza Manual
```
npm run monitoring:cleanup
```

## 📈 Interpretación de Métricas

### Tiempo de Respuesta
- **< 100ms**: Excelente
- **100-500ms**: Bueno
- **500-1000ms**: Aceptable
- **> 1000ms**: Requiere atención

### Uso de Memoria
- **< 50%**: Normal
- **50-80%**: Monitorear
- **> 80%**: Crítico

### Tasa de Error
- **< 1%**: Excelente
- **1-5%**: Aceptable
- **> 5%**: Requiere atención

## 🎯 Mejores Prácticas

1. **Monitorear regularmente** el dashboard
2. **Configurar alertas** por email/webhook
3. **Revisar métricas** semanalmente
4. **Limpiar métricas** antiguas mensualmente
5. **Optimizar** basándose en métricas

## 🆘 Solución de Problemas

### Dashboard no carga
- Verificar que el servidor esté corriendo
- Verificar rutas de monitoreo
- Revisar logs del servidor

### Alertas no llegan
- Verificar configuración de email
- Verificar variables de entorno
- Revisar logs de alertas

### Métricas no se actualizan
- Verificar middleware de métricas
- Revisar conexión a base de datos
- Verificar logs de métricas

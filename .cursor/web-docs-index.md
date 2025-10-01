# 📚 Índice de Documentación Web - Reserva Tu Cancha

## Documentación de Servicios Utilizados

### 🚀 Render.com
- **URL**: https://render.com/docs
- **Relevancia**: Hosting principal del proyecto
- **Temas clave**:
  - Auto-deploy desde Git
  - Variables de entorno
  - Health checks
  - Logs y monitoreo
  - Configuración de servicios web
  - Base de datos PostgreSQL

### 🗄️ Neon PostgreSQL
- **URL**: https://neon.tech/docs
- **Relevancia**: Base de datos de producción
- **Temas clave**:
  - Conexión desde Node.js
  - Migraciones de esquema
  - Backups automáticos
  - Connection pooling
  - Variables de entorno
  - Monitoreo de performance

### 💳 Transbank WebPay Plus
- **URL**: https://www.transbankdevelopers.cl/documentacion/webpay_plus
- **Relevancia**: Sistema de pagos
- **Temas clave**:
  - Integración Node.js
  - Configuración de comercio
  - URLs de retorno
  - Manejo de transacciones
  - Ambientes de prueba vs producción

### 📧 Zoho Mail SMTP
- **URL**: https://help.zoho.com/portal/en/kb/mail/articles/smtp-settings
- **Relevancia**: Sistema de emails
- **Temas clave**:
  - Configuración SMTP
  - Autenticación
  - Límites de envío
  - Troubleshooting

## Documentación Técnica

### Node.js + Express
- **URL**: https://expressjs.com/
- **Relevancia**: Backend principal
- **Temas clave**:
  - Middleware de seguridad
  - Rate limiting
  - CORS configuration
  - Error handling

### PostgreSQL
- **URL**: https://www.postgresql.org/docs/
- **Relevancia**: Base de datos unificada (desarrollo y producción)
- **Temas clave**:
  - Configuración local (`reserva_tu_cancha_local`)
  - Esquemas y tablas
  - Índices y performance
  - Queries optimizadas
  - Backup y restore
  - Zona horaria (America/Santiago)

## Mejores Prácticas

### Deployment
- Cambios incrementales
- Verificación pre-deploy
- Rollback strategies
- Monitoreo continuo

### Seguridad
- Variables de entorno
- Validación de inputs
- Rate limiting
- HTTPS enforcement

### Performance
- Connection pooling
- Query optimization
- Caching strategies
- Resource monitoring

## URLs de Referencia Rápida

### Producción
- **App**: https://www.reservatuscanchas.cl
- **Health Check**: https://www.reservatuscanchas.cl/health
- **Render Dashboard**: Para logs y métricas
- **Neon Dashboard**: Para gestión de BD

### Desarrollo
- **Local**: http://localhost:3000
- **GitHub**: Para código fuente
- **Documentación**: Este archivo

## Comandos de Referencia

### Render
```bash
# Ver logs
render logs

# Verificar deployment
curl https://www.reservatuscanchas.cl/health
```

### Neon
```bash
# Conectar a BD producción
psql $DATABASE_URL

# Conectar a BD local
psql -d reserva_tu_cancha_local

# Verificar conexión
npm run check-prod-db
```

### Transbank
```bash
# Verificar configuración
npm run check-prod-transbank
```

## Troubleshooting Común

### Deployment Issues
1. Verificar variables de entorno
2. Revisar logs de Render
3. Comprobar health checks
4. Verificar conectividad de BD

### Database Issues
1. Verificar PostgreSQL local: `psql -d reserva_tu_cancha_local`
2. Verificar conexión a Neon
3. Revisar queries lentas
4. Comprobar backups
5. Verificar índices
6. Verificar zona horaria (America/Santiago)

### Payment Issues
1. Verificar configuración Transbank
2. Comprobar URLs de retorno
3. Revisar logs de transacciones
4. Verificar ambiente (test vs prod)

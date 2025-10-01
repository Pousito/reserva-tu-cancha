# 🚀 Checklist de Deployment - Reserva Tu Cancha

## Pre-Deployment

### ✅ Verificaciones Locales
- [ ] Código funciona en localhost:3000
- [ ] Tests pasan: `npm run test-pre-deploy`
- [ ] No hay errores de linting
- [ ] Variables de entorno configuradas
- [ ] Base de datos local actualizada

### ✅ Verificaciones de Código
- [ ] Cambios son incrementales y pequeños
- [ ] No hay credenciales hardcodeadas
- [ ] Comentarios en español
- [ ] Documentación actualizada si es necesario
- [ ] Scripts de utilidad funcionan

### ✅ Verificaciones de Base de Datos
- [ ] PostgreSQL local funcionando: `psql -d reserva_tu_cancha_local`
- [ ] Migraciones aplicadas si es necesario
- [ ] Backup creado: `npm run backup-create`
- [ ] Estado de BD producción verificado: `npm run check-prod-db`
- [ ] No hay datos de prueba en producción

## Deployment

### ✅ Proceso de Deploy
- [ ] Commit con mensaje descriptivo
- [ ] Push a branch main
- [ ] Verificar que Render detecte el cambio
- [ ] Monitorear logs de deployment
- [ ] Esperar a que el deployment complete

### ✅ Post-Deployment
- [ ] Verificar que la app esté online
- [ ] Probar funcionalidad principal
- [ ] Verificar emails funcionan
- [ ] Probar proceso de pago
- [ ] Verificar base de datos

## Rollback Plan

### Si algo sale mal:
1. **Identificar el problema** en logs de Render
2. **Revertir commit** si es necesario
3. **Restaurar backup** de BD si es crítico
4. **Comunicar** a usuarios si hay downtime

### Comandos de Emergencia:
```bash
# Verificar estado
npm run check-prod-db

# Restaurar backup
npm run backup-restore

# Limpiar BD si es necesario
npm run clean-production-essential
```

## Monitoreo Continuo

### ✅ Verificaciones Diarias
- [ ] App responde correctamente
- [ ] Emails se envían
- [ ] Pagos procesan
- [ ] Base de datos accesible
- [ ] Logs sin errores críticos

### ✅ Verificaciones Semanales
- [ ] Backup de BD actualizado
- [ ] Performance de la app
- [ ] Uso de recursos en Render
- [ ] Estadísticas de uso
- [ ] Feedback de usuarios

## Contactos de Emergencia
- **Render Support**: Para problemas de hosting
- **Neon Support**: Para problemas de BD
- **Transbank Support**: Para problemas de pagos
- **Zoho Support**: Para problemas de email

## URLs de Monitoreo
- **App Principal**: https://www.reservatuscanchas.cl
- **Health Check**: https://www.reservatuscanchas.cl/health
- **Render Dashboard**: Para logs y métricas
- **Neon Dashboard**: Para estado de BD

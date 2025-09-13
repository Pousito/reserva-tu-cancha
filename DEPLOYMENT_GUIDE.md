# 🚀 GUÍA DE DESPLIEGUE - RESERVA TU CANCHA

## 📋 PROBLEMA IDENTIFICADO

Tu aplicación está desplegada correctamente en Render, pero **la base de datos de reservas está vacía**. Esto es normal porque:

- ✅ Las tablas se crean correctamente
- ✅ Las ciudades, complejos y canchas se insertan
- ❌ **No hay reservas de ejemplo** en la base de datos

## 🔧 SOLUCIÓN IMPLEMENTADA

He creado scripts automatizados que:
1. **Verifican** el estado de la base de datos
2. **Pueblan** la base de datos con reservas de ejemplo
3. **Despliegan** automáticamente a Render

## 📁 ARCHIVOS CREADOS

- `check_render_status.js` - Verifica el estado de la BD
- `populate_reservas.js` - Puebla con reservas de ejemplo
- `deploy_and_populate.js` - Script principal de despliegue
- `DEPLOYMENT_GUIDE.md` - Esta guía

## 🚀 OPCIONES DE DESPLIEGUE

### Opción 1: Despliegue Completo (RECOMENDADO)
```bash
npm run deploy-full
```
**Hace todo automáticamente:**
- Git add, commit y push
- Espera a que Render termine el despliegue
- Verifica el estado de la BD
- Puebla con reservas de ejemplo

### Opción 2: Solo Poblar Base de Datos
```bash
npm run populate-db
```
**Útil si ya está desplegado pero quieres agregar reservas**

### Opción 3: Solo Verificar Estado
```bash
npm run check-db
```
**Para ver qué hay en la base de datos**

### Opción 4: Verificar Estado de Render
```bash
npm run check-render
```
**Para ver el estado específico en Render**

## 📊 QUÉ SE INSERTA AUTOMÁTICAMENTE

### Reservas de Ejemplo:
- **15 reservas** para los próximos días
- **Horarios**: 18:00, 19:00, 20:00, 21:00
- **Días**: Solo lunes a viernes
- **Estados**: 5 confirmadas, 10 pendientes
- **Clientes**: Nombres y emails de ejemplo
- **Códigos**: Únicos generados automáticamente

### Datos Existentes (ya funcionando):
- ✅ 6 ciudades (Santiago, Valparaíso, etc.)
- ✅ 5 complejos deportivos
- ✅ 8 canchas (fútbol y pádel)
- ✅ 3 usuarios administradores

## 🔍 VERIFICACIÓN POST-DESPLIEGUE

Después del despliegue, puedes verificar que todo funcione:

1. **Accede a tu aplicación web** en Render
2. **Ve a la sección de reservas** - deberías ver las reservas de ejemplo
3. **Verifica el panel de administración** - debería mostrar datos

## ⚠️ NOTAS IMPORTANTES

### Base de Datos Persistente:
- Render usa PostgreSQL como base de datos principal
- Los datos **NO se pierden** entre reinicios
- Solo se inicializa **la primera vez** o si está vacía

### Variables de Entorno:
- `NODE_ENV=production` (ya configurado en Render)
- `DATABASE_URL` (configurado automáticamente por Render)

### Logs en Render:
- Los logs del despliegue aparecen en la consola de Render
- Puedes ver el progreso en tiempo real

## 🆘 SOLUCIÓN DE PROBLEMAS

### Si no aparecen las reservas:
1. Ejecuta `npm run check-db` para ver el estado
2. Ejecuta `npm run populate-db` para agregar reservas
3. Verifica los logs en Render

### Si hay errores de conexión:
1. Verifica que la aplicación esté corriendo en Render
2. Revisa los logs de error
3. Ejecuta `npm run check-render`

### Si la BD está corrupta:
1. En Render, ve a la configuración del servicio
2. Reinicia el servicio
3. Ejecuta `npm run deploy-full` nuevamente

## 📞 COMANDOS ÚTILES

```bash
# Ver todos los scripts disponibles
npm run

# Estado de git
git status

# Ver logs en Render
# (Desde el dashboard de Render)

# Verificar BD local (si tienes una)
node check_local_db.js
```

## 🎯 PRÓXIMOS PASOS

1. **Ejecuta** `npm run deploy-full`
2. **Espera** a que termine (aproximadamente 2-3 minutos)
3. **Verifica** que las reservas aparezcan en tu web
4. **¡Disfruta** de tu aplicación funcionando!

---

**¿Necesitas ayuda?** Los scripts están diseñados para ser autodocumentados y mostrar exactamente qué está pasando en cada paso.


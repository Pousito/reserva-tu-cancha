# Plan de Rollback - Optimización de Disponibilidad

## Estado Actual (Antes de la Optimización)
- **Fecha**: $(date)
- **Archivos respaldados**:
  - `server.js.backup.1757482331`
  - `public/script.js.backup.1757482331`

## Cambios Implementados

### 1. Nuevo Endpoint Optimizado
- **Archivo**: `server.js`
- **Líneas**: 319-371
- **Endpoint**: `/api/disponibilidad-completa/:complejoId/:fecha`
- **Función**: Consulta única para obtener disponibilidad de todas las canchas

### 2. Nuevas Funciones Frontend
- **Archivo**: `public/script.js`
- **Funciones agregadas**:
  - `verificarDisponibilidadCompleta()` (líneas 1387-1407)
  - `verificarDisponibilidadFallback()` (líneas 1409-1436)
  - `verificarDisponibilidadCanchaOptimizada()` (líneas 1438-1463)

### 3. Funciones Modificadas
- **Archivo**: `public/script.js`
- **Funciones modificadas**:
  - `actualizarHorariosConDisponibilidad()` (líneas 2373-2428)
  - `cargarHorariosComplejo()` (líneas 2467-2507)

### 4. Endpoint de Optimización
- **Archivo**: `server.js`
- **Líneas**: 1759-1836
- **Endpoint**: `/api/debug/optimize-database`
- **Función**: Crear índices en PostgreSQL

## Plan de Rollback

### Opción 1: Rollback Completo (Recomendado)
```bash
# Restaurar archivos originales
cp server.js.backup.1757482331 server.js
cp public/script.js.backup.1757482331 public/script.js

# Hacer commit y push
git add .
git commit -m "ROLLBACK: Revertir optimización de disponibilidad"
git push origin main
```

### Opción 2: Rollback Parcial
Si solo el frontend tiene problemas:
```bash
# Restaurar solo el frontend
cp public/script.js.backup.1757482331 public/script.js
git add public/script.js
git commit -m "ROLLBACK: Revertir cambios en frontend"
git push origin main
```

Si solo el backend tiene problemas:
```bash
# Restaurar solo el backend
cp server.js.backup.1757482331 server.js
git add server.js
git commit -m "ROLLBACK: Revertir cambios en backend"
git push origin main
```

### Opción 3: Deshabilitar Endpoint Optimizado
Si el nuevo endpoint causa problemas, se puede deshabilitar temporalmente:
```javascript
// Comentar las líneas 319-371 en server.js
// El sistema usará automáticamente el endpoint original
```

## Verificación Post-Rollback

1. **Verificar que el sistema funciona**:
   - Probar reservas en desarrollo
   - Verificar que las canchas se muestran correctamente
   - Confirmar que no hay errores en consola

2. **Verificar en producción**:
   - Desplegar cambios
   - Probar el flujo completo de reservas
   - Monitorear logs de errores

## Notas Importantes

- Los índices de PostgreSQL **NO** se pueden revertir automáticamente
- Si hay problemas con los índices, contactar al administrador de la base de datos
- Los índices no afectan la funcionalidad, solo el rendimiento

## Contacto de Emergencia

Si necesitas ayuda con el rollback:
- Revisar este archivo: `ROLLBACK_PLAN.md`
- Verificar logs en: `logs/app.log`
- Usar endpoint de debug: `/api/debug/test-simple`

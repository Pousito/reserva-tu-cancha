# 🚀 Optimización de Base de Datos - ReservaTuCancha

## 📋 Descripción

Este conjunto de scripts optimiza el rendimiento de la base de datos PostgreSQL mediante la creación de índices estratégicos basados en el análisis de las consultas más frecuentes del sistema.

## 🎯 Beneficios Esperados

- **Consultas de disponibilidad:** 3-5x más rápidas
- **Dashboard:** 2-3x más rápido  
- **Búsqueda de reservas:** 5-10x más rápida
- **Reportes:** 2-4x más rápidos
- **Menor uso de CPU** en Render = menos riesgo de suspensión

## 📁 Archivos Incluidos

- `benchmark-current.js` - Mide rendimiento actual
- `create-optimized-indexes.js` - Crea índices optimizados
- `compare-performance.js` - Compara antes vs después
- `rollback-indexes.js` - Rollback en caso de problemas

## 🚀 Instrucciones de Uso

### Opción 1: Optimización Completa (Recomendada)

```bash
# Ejecutar todo el proceso automáticamente
npm run optimize-full
```

Este comando ejecuta:
1. Benchmark del rendimiento actual
2. Creación de índices optimizados
3. Comparación de rendimiento

### Opción 2: Paso a Paso

```bash
# 1. Medir rendimiento actual
npm run benchmark-current

# 2. Crear índices optimizados
npm run optimize-database

# 3. Comparar rendimiento
npm run compare-performance
```

### Opción 3: Solo Benchmark

```bash
# Solo medir rendimiento sin hacer cambios
npm run benchmark-current
```

## 📊 Interpretación de Resultados

### Archivos Generados

- `performance-before.json` - Rendimiento antes de optimizar
- `optimization-report.json` - Reporte de creación de índices
- `performance-comparison.json` - Comparación detallada

### Métricas Clave

- **< 100ms:** ✅ Excelente
- **100-500ms:** ⚠️ Aceptable
- **> 500ms:** 🐌 Necesita optimización

### Mejoras Significativas

- **> 50%:** 🔥 Mejora excepcional
- **30-50%:** ⚡ Mejora muy buena
- **10-30%:** ✅ Mejora buena

## 🛡️ Seguridad

### Características de Seguridad

- **CONCURRENTLY:** Los índices se crean sin bloquear la BD
- **IF NOT EXISTS:** No falla si el índice ya existe
- **Rollback disponible:** Script para revertir cambios

### Rollback en Caso de Problemas

```bash
# Si algo sale mal, revertir cambios
npm run rollback-optimization
```

## 📈 Índices Creados

### 1. Disponibilidad (MÁS CRÍTICO)
```sql
idx_reservas_cancha_fecha_estado
-- Optimiza: getDisponibilidad, getDisponibilidadComplejo
```

### 2. Dashboard
```sql
idx_reservas_fecha_estado
-- Optimiza: getReservasHoy, getReservasPorDia

idx_reservas_estado_precio  
-- Optimiza: cálculos de ingresos
```

### 3. Búsquedas
```sql
idx_reservas_codigo
-- Optimiza: búsqueda por código de reserva

idx_reservas_created_at
-- Optimiza: reservas recientes
```

### 4. Relaciones
```sql
idx_canchas_complejo_tipo
-- Optimiza: getCanchasByComplejoAndTipo

idx_complejos_ciudad
-- Optimiza: getComplejosByCiudad
```

### 5. Autenticación
```sql
idx_usuarios_email
-- Optimiza: login de usuarios
```

### 6. Reportes
```sql
idx_gastos_fecha_tipo
-- Optimiza: consultas de gastos

idx_reservas_complejo_fecha_estado
-- Optimiza: reportes complejos
```

## 🔍 Monitoreo Post-Optimización

### Verificar Uso de Índices

```sql
-- Consultar estadísticas de uso
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;
```

### Monitorear Rendimiento

```bash
# Ejecutar benchmark periódicamente
npm run benchmark-current
```

## ⚠️ Consideraciones Importantes

### Espacio en Disco

- Los índices ocupan espacio adicional (~10-20% de las tablas)
- En tu plan básico de Render (256MB), esto es mínimo

### Mantenimiento

- Los índices se mantienen automáticamente
- No requieren intervención manual

### Compatibilidad

- Compatible con PostgreSQL 12+
- Tu BD es PostgreSQL 17 ✅

## 🆘 Solución de Problemas

### Error de Conexión

```bash
# Verificar variables de entorno
echo $DATABASE_URL
```

### Error de Permisos

```bash
# Verificar que el usuario tenga permisos de CREATE INDEX
```

### Índice Ya Existe

```bash
# Normal, el script usa IF NOT EXISTS
# No afecta la ejecución
```

## 📞 Soporte

Si encuentras problemas:

1. Revisar logs en la consola
2. Verificar archivos de reporte generados
3. Usar rollback si es necesario
4. Contactar soporte técnico

## 🎉 Resultados Esperados

Después de la optimización deberías ver:

- **Dashboard carga más rápido**
- **Consultas de disponibilidad instantáneas**
- **Búsqueda de reservas más rápida**
- **Menor uso de CPU en Render**
- **Mejor experiencia de usuario**

---

**¡La optimización está lista para ejecutar! 🚀**

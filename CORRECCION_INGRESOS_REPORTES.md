# 🔧 Corrección: Discrepancia entre Reportes y Control Financiero

## 📋 Problema Identificado

Se detectó una discrepancia entre los ingresos mostrados en:
- **Reportes**: $84,700 ❌ (INCORRECTO)
- **Control Financiero**: $30,850 ✅ (CORRECTO)

**Complejo afectado:** Espacio Deportivo Borde Río (producción)

## 🔍 Causa Raíz

Los **reportes** estaban sumando `precio_total` de todas las reservas confirmadas, pero deberían sumar `monto_abonado` (lo que realmente se ha pagado), que es lo que usa el control financiero.

### Problemas específicos:

1. **Reservas con pago parcial (50%)**: Si una reserva tiene `precio_total = $20,000` pero `monto_abonado = $10,000`, los reportes mostraban $20,000 pero el control financiero mostraba $10,000.

2. **Reservas sin monto_abonado**: Si `monto_abonado` es NULL o 0, los reportes mostraban el precio total completo, pero el control financiero no registraba ningún ingreso.

3. **Inconsistencia**: Los reportes sumaban `precio_total` mientras que el control financiero sumaba `monto_abonado` (correcto).

## ✅ Solución Implementada

### 1. Corrección del Endpoint de Reportes (`/api/admin/reports`)

Se actualizó el cálculo de `ingresosTotales` para usar `monto_abonado` en lugar de `precio_total`:

**Archivo:** `server.js` línea 5427-5433

**Cambio:**
```sql
-- ANTES (INCORRECTO):
SELECT COALESCE(SUM(precio_total), 0) as total 

-- DESPUÉS (CORRECTO):
SELECT COALESCE(SUM(COALESCE(r.monto_abonado, 0)), 0) as total
```

### 2. Corrección de Reservas por Día

Se actualizó el cálculo de ingresos por día para usar `monto_abonado`:

**Archivo:** `server.js` línea 5454-5476

**Cambio:**
```sql
-- ANTES:
SELECT r.fecha, r.precio_total
...
reservasPorDia[fechaStr].ingresos += row.precio_total;

-- DESPUÉS:
SELECT r.fecha, COALESCE(r.monto_abonado, 0) as monto_abonado
...
reservasPorDia[fechaStr].ingresos += row.monto_abonado;
```

### 3. Corrección de ReportService

Se actualizaron todos los métodos en `reportService.js` para usar `monto_abonado`:

**Archivo:** `src/services/reportService.js`

**Métodos corregidos:**
- `getIncomeData()`: Usa `monto_abonado` para ingresos_brutos, comision_plataforma, ingresos_netos y ticket_promedio
- `getDailySummary()`: Usa `monto_abonado` para todos los cálculos diarios
- `getReservationDetails()`: Usa `monto_abonado` para comision_plataforma e ingreso_neto

### 4. Corrección de Otros Cálculos en Reportes

Se corrigieron los siguientes cálculos en el endpoint de reportes:
- Ingresos por complejo
- Ingresos por tipo de cancha
- Ingresos por top canchas
- Ingresos por horarios populares

**Archivo:** `server.js` líneas 5492, 5623, 5634, 5646

## 📊 Resultado Esperado

Después de la corrección:

1. **Reportes**: Mostrarán los mismos ingresos que el control financiero ($30,850)
2. **Consistencia**: Ambos sistemas mostrarán `monto_abonado` (lo realmente pagado)
3. **Precisión**: Los reportes reflejarán los ingresos reales recibidos, no los ingresos potenciales

## ⚠️ Notas Importantes

1. **Control Financiero**: No se modificó, estaba correcto desde el principio
2. **Trigger de Sincronización**: No se modificó, sigue usando `monto_abonado` correctamente
3. **Pago Parcial**: Las reservas con pago parcial ahora se mostrarán correctamente en ambos sistemas

## 🔄 Cambios en el Comportamiento

### Antes:
- **Reportes**: Sumaban `precio_total` (puede incluir montos no pagados)
- **Control Financiero**: Sumaba `monto_abonado` (solo lo realmente pagado)
- **Resultado**: Discrepancia ($84,700 vs $30,850)

### Después:
- **Reportes**: Suman `monto_abonado` (solo lo realmente pagado)
- **Control Financiero**: Suma `monto_abonado` (solo lo realmente pagado)
- **Resultado**: Consistencia (ambos muestran $30,850)

## 📝 Archivos Modificados

1. `server.js` - Endpoint `/api/admin/reports`:
   - Línea 5427-5433: `ingresosTotales`
   - Línea 5454-5476: `reservasPorDia`
   - Línea 5492: Ingresos por complejo
   - Línea 5623: Ingresos por tipo
   - Línea 5634: Top canchas
   - Línea 5646: Horarios populares

2. `src/services/reportService.js`:
   - `getIncomeData()`: Todos los cálculos
   - `getDailySummary()`: Todos los cálculos
   - `getReservationDetails()`: Comisión e ingreso neto

## ✅ Verificación Post-Corrección

Para verificar que la corrección funcionó:

```sql
-- Comparar ingresos en reportes vs control financiero
SELECT 
    'Reportes (monto_abonado)' as fuente,
    COUNT(*) as cantidad_reservas,
    SUM(COALESCE(monto_abonado, 0)) as total
FROM reservas
WHERE estado = 'confirmada'

UNION ALL

SELECT 
    'Control Financiero' as fuente,
    COUNT(*) as cantidad_ingresos,
    SUM(monto) as total
FROM gastos_ingresos
WHERE descripcion LIKE 'Reserva #%'
AND tipo = 'ingreso';
```

Ambas fuentes deberían mostrar el mismo total.

## 🚀 Despliegue

Los cambios están listos para desplegar. No se requiere ejecutar ningún script adicional, solo desplegar el código actualizado.

# 🔍 DIAGNÓSTICO: Reserva GU4RCJ - Problema Identificado

## 📋 INFORMACIÓN CONOCIDA

- **Reserva:** GU4RCJ
- **Complejo:** Espacio Deportivo Borde Río
- **Estado:** Confirmada ✅
- **Email Cliente:** magda.espinoza.se@gmail.com ✅
- **Problema 1:** ❌ NO aparece en control financiero (solo VIZJ4P e ISLTLF están)
- **Problema 2:** ❌ NO se envió email de confirmación

---

## 🔍 ANÁLISIS DEL CÓDIGO

### **1. Flujo de Creación de Reserva Administrativa**

Según `src/routes/admin-calendar.js` (líneas 465-718):

1. Se crea la reserva con `AtomicReservationManager`
2. **Inmediatamente después** se envía email (líneas 660-697)
3. El email se envía a:
   - Cliente (`email_cliente`)
   - Owner del complejo (si está configurado)
   - Admin (`admin@reservatuscanchas.cl`)

### **2. Flujo de Registro en Control Financiero**

Según `scripts/sql/sincronizar-reservas-ingresos.sql`:

El trigger `sincronizar_reserva_ingresos()` se ejecuta cuando:
- ✅ `estado = 'confirmada'` 
- ✅ `precio_total > 0`
- ✅ Existen categorías de ingresos para el complejo
- ✅ NO existe ya un ingreso para esa reserva

**El trigger se ejecuta en:**
- `AFTER INSERT` cuando se crea una reserva con estado 'confirmada'
- `AFTER UPDATE OF estado, precio_total` cuando se actualiza el estado a 'confirmada'

---

## 🎯 POSIBLES CAUSAS

### **Causa 1: El trigger no se ejecutó al crear la reserva**

**Escenario:**
- La reserva se creó con estado diferente a 'confirmada'
- Luego se cambió manualmente a 'confirmada'
- El trigger solo se ejecuta si el cambio de estado ocurre en la misma transacción

**Verificación:**
```sql
-- Verificar si la reserva se creó directamente con estado 'confirmada'
SELECT 
  codigo_reserva,
  estado,
  created_at,
  fecha_creacion
FROM reservas
WHERE codigo_reserva = 'GU4RCJ';
```

### **Causa 2: Precio total es 0 o NULL**

**Escenario:**
- La reserva se creó sin precio o con precio 0
- El trigger no crea ingresos si `precio_total <= 0`

**Verificación:**
```sql
SELECT 
  codigo_reserva,
  precio_total,
  monto_abonado,
  porcentaje_pagado
FROM reservas
WHERE codigo_reserva = 'GU4RCJ';
```

### **Causa 3: No existen categorías de ingresos para el complejo**

**Escenario:**
- Las categorías de gastos no se crearon para el complejo Borde Río
- El trigger requiere categoría "Reservas Web" o "Reservas Administrativas"

**Verificación:**
```sql
-- Obtener complejo_id primero
SELECT c.complejo_id 
FROM reservas r
JOIN canchas c ON r.cancha_id = c.id
WHERE r.codigo_reserva = 'GU4RCJ';

-- Luego verificar categorías (usar el complejo_id obtenido)
SELECT id, nombre, tipo
FROM categorias_gastos
WHERE complejo_id = [COMPLEJO_ID]
  AND tipo = 'ingreso'
  AND (nombre = 'Reservas Web' OR nombre = 'Reservas Administrativas');
```

### **Causa 4: El trigger no existe o está deshabilitado**

**Escenario:**
- El trigger no se creó en producción
- O se deshabilitó por alguna razón

**Verificación:**
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'reservas'
  AND trigger_name LIKE '%sincronizar%';
```

### **Causa 5: Error silencioso en el trigger**

**Escenario:**
- El trigger se ejecutó pero falló silenciosamente
- PostgreSQL registra errores en logs pero no los muestra en la aplicación

**Verificación:**
- Revisar logs de PostgreSQL en Render
- Verificar si hay errores en la función del trigger

### **Causa 6: Email no se envió por error en SMTP**

**Escenario:**
- El código intentó enviar el email
- Hubo un error en la configuración SMTP
- El error fue capturado silenciosamente (línea 694-697 de admin-calendar.js)

**Verificación:**
- Revisar logs del servidor en Render
- Buscar errores relacionados con email o SMTP

---

## 🔧 QUERIES PARA EJECUTAR EN PRODUCCIÓN

He creado el archivo `QUERIES_INVESTIGACION_GU4RCJ.sql` con todas las queries necesarias.

**Pasos:**
1. Ir a Render Dashboard → Base de datos → `reserva-tu-cancha-db`
2. Abrir la consola SQL
3. Ejecutar las queries del archivo SQL

---

## 💡 SOLUCIONES PROPUESTAS

### **Solución 1: Sincronización Manual (RECOMENDADA)**

Si la reserva tiene estado 'confirmada' y precio_total > 0:

**Opción A: Usar endpoint de sincronización**
```bash
POST /api/admin/reservas/GU4RCJ/sincronizar-ingreso
```

**Opción B: Ejecutar SQL directamente**
```sql
-- Obtener datos de la reserva
SELECT 
  r.codigo_reserva,
  r.precio_total,
  r.monto_abonado,
  r.fecha,
  c.complejo_id,
  c.nombre as cancha_nombre
FROM reservas r
JOIN canchas c ON r.cancha_id = c.id
WHERE r.codigo_reserva = 'GU4RCJ';

-- Obtener categoría de ingresos
SELECT id FROM categorias_gastos
WHERE complejo_id = [COMPLEJO_ID]
  AND tipo = 'ingreso'
  AND nombre = 'Reservas Administrativas'
LIMIT 1;

-- Crear ingreso manualmente (usar valores obtenidos arriba)
INSERT INTO gastos_ingresos (
  complejo_id,
  categoria_id,
  tipo,
  monto,
  fecha,
  descripcion,
  metodo_pago,
  usuario_id
) VALUES (
  [COMPLEJO_ID],
  [CATEGORIA_ID],
  'ingreso',
  [MONTO_ABONADO o PRECIO_TOTAL],
  '[FECHA]',
  'Reserva #GU4RCJ - [CANCHA_NOMBRE]',
  'por_definir',
  NULL
);
```

### **Solución 2: Re-ejecutar el Trigger**

Si el trigger existe pero no se ejecutó:

```sql
-- Forzar actualización para que se ejecute el trigger
UPDATE reservas
SET estado = 'pendiente'
WHERE codigo_reserva = 'GU4RCJ';

-- Luego volver a confirmada para que se ejecute el trigger
UPDATE reservas
SET estado = 'confirmada'
WHERE codigo_reserva = 'GU4RCJ';
```

### **Solución 3: Verificar y Crear Categorías**

Si no existen categorías:

```sql
-- Verificar complejo_id
SELECT c.complejo_id 
FROM reservas r
JOIN canchas c ON r.cancha_id = c.id
WHERE r.codigo_reserva = 'GU4RCJ';

-- Crear categoría si no existe (usar complejo_id obtenido)
INSERT INTO categorias_gastos (
  complejo_id,
  nombre,
  tipo,
  es_predefinida
) VALUES (
  [COMPLEJO_ID],
  'Reservas Administrativas',
  'ingreso',
  true
)
ON CONFLICT DO NOTHING;
```

### **Solución 4: Enviar Email Manualmente (NO HACER AHORA)**

**⚠️ NO EJECUTAR - Solo para referencia futura**

El usuario indicó que NO quiere que se envíen emails ahora porque están trabajando con clientes reales.

Para el futuro, si se necesita enviar el email:
```javascript
// Usar el servicio de email
const EmailService = require('./src/services/emailService');
const emailService = new EmailService();

const emailData = {
  codigo_reserva: 'GU4RCJ',
  nombre_cliente: '[NOMBRE]',
  email_cliente: 'magda.espinoza.se@gmail.com',
  complejo: 'Espacio Deportivo Borde Río',
  cancha: '[CANCHA]',
  fecha: '[FECHA]',
  hora_inicio: '[HORA_INICIO]',
  hora_fin: '[HORA_FIN]',
  precio_total: [PRECIO]
};

await emailService.sendConfirmationEmails(emailData);
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

Ejecutar estas verificaciones en orden:

- [ ] **1. Verificar estado de la reserva**
  ```sql
  SELECT estado, precio_total, email_cliente FROM reservas WHERE codigo_reserva = 'GU4RCJ';
  ```

- [ ] **2. Verificar si está en control financiero**
  ```sql
  SELECT * FROM gastos_ingresos WHERE descripcion LIKE '%GU4RCJ%';
  ```

- [ ] **3. Verificar categorías del complejo**
  ```sql
  SELECT * FROM categorias_gastos WHERE complejo_id = [ID] AND tipo = 'ingreso';
  ```

- [ ] **4. Verificar trigger**
  ```sql
  SELECT * FROM information_schema.triggers WHERE event_object_table = 'reservas';
  ```

- [ ] **5. Comparar con otras reservas**
  ```sql
  SELECT codigo_reserva, estado, precio_total, 
         (SELECT COUNT(*) FROM gastos_ingresos WHERE descripcion LIKE '%' || codigo_reserva || '%') as en_financiero
  FROM reservas 
  WHERE codigo_reserva IN ('GU4RCJ', 'VIZJ4P', 'ISLTLF');
  ```

---

## 🎯 CONCLUSIÓN

Basado en el análisis del código:

1. **El email debería haberse enviado** automáticamente al crear la reserva
   - Si no se envió, probablemente hubo un error silencioso en SMTP
   - Revisar logs del servidor en Render

2. **El ingreso debería haberse registrado** automáticamente si:
   - Estado = 'confirmada' ✅ (según usuario)
   - Precio_total > 0 (verificar)
   - Existen categorías (verificar)
   - Existe trigger (verificar)

3. **Próximos pasos:**
   - Ejecutar queries de verificación en producción
   - Identificar la causa específica
   - Aplicar solución correspondiente

---

**Documento creado para investigar el problema de la reserva GU4RCJ**


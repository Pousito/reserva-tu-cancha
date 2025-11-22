# 🔍 ANÁLISIS: Reserva GU4RCJ - Espacio Borde Río

## 📋 SITUACIÓN REPORTADA

- **Reserva:** GU4RCJ
- **Complejo:** Espacio Deportivo Borde Río
- **Problema:** 
  - ✅ Aparece en el listado de reservas del owner (3 reservas totales)
  - ❌ NO aparece en el control financiero (solo aparecen VIZJ4P e ISLTLF)
  - ❌ NO se envió email de confirmación

---

## 🔍 ANÁLISIS DEL CÓDIGO

### 1. **¿Cómo se crean las reservas administrativas?**

Según el código en `src/routes/admin-calendar.js` (líneas 465-718):

1. **Endpoint:** `POST /api/admin/calendar/reservation`
2. **Permisos:** Requiere autenticación y rol `super_admin`, `owner` o `manager`
3. **Proceso:**
   - Valida datos (cancha, fecha, hora, nombre cliente)
   - Calcula precio con comisión administrativa (1.75% por defecto)
   - Crea reserva usando `AtomicReservationManager`
   - **Envía email de confirmación** (líneas 660-697)
   - Retorna la reserva creada

### 2. **¿Cuándo se envía el email?**

El código muestra que **SÍ se envía email** cuando se crea una reserva administrativa:

```javascript
// Líneas 660-697 de admin-calendar.js
// ENVIAR EMAILS INMEDIATAMENTE DESPUÉS DE CREAR LA RESERVA
try {
  const EmailService = require('../services/emailService');
  const emailService = new EmailService();
  
  const emailData = {
    codigo_reserva: nuevaReserva.codigo_reserva,
    nombre_cliente: nombre_cliente,
    email_cliente: email_cliente,  // ⚠️ IMPORTANTE: Debe existir
    // ... otros datos
  };
  
  const emailResults = await emailService.sendConfirmationEmails(emailData);
} catch (emailError) {
  console.error('❌ Error enviando emails de confirmación:', emailError);
  // ⚠️ NO falla la creación de reserva si hay error en el email
}
```

**Puntos importantes:**
- El email se envía **inmediatamente** después de crear la reserva
- Si hay error, **NO falla la creación** de la reserva (solo se registra el error)
- Requiere que `email_cliente` esté presente

### 3. **¿Cuándo se registra en el control financiero?**

Según el código en `scripts/sql/sincronizar-reservas-ingresos.sql`:

El trigger `sincronizar_reserva_ingresos()` se ejecuta cuando:
- ✅ El estado de la reserva cambia a `'confirmada'`
- ✅ Y el `precio_total > 0`
- ✅ Y existen las categorías de gastos para el complejo

```sql
-- Línea 26 del trigger
IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado != 'confirmada') THEN
    -- Solo procesar cuando el estado cambia a 'confirmada'
    
    -- Línea 72
    IF precio_total > 0 THEN
        -- Solo crear registros si hay un precio válido
        INSERT INTO gastos_ingresos (...)
    END IF;
END IF;
```

**Condiciones para que se registre:**
1. ✅ Estado debe ser `'confirmada'`
2. ✅ `precio_total` debe ser > 0
3. ✅ Debe existir categoría de ingresos para el complejo
4. ✅ No debe existir ya un ingreso para esa reserva

---

## 🎯 POSIBLES CAUSAS DEL PROBLEMA

### **Causa 1: Estado de la reserva no es 'confirmada'**

**Escenario:**
- La reserva se creó con estado `'pendiente'` o `'por_pagar'`
- El trigger solo se ejecuta cuando el estado es `'confirmada'`

**Evidencia en código:**
```javascript
// admin-calendar.js línea 630
estado_pago: estado_pago || 'pendiente', // Estado de pago por defecto
```

**Solución:**
- Verificar el estado de la reserva GU4RCJ
- Si está en `'pendiente'`, cambiarla a `'confirmada'` para que se registre en control financiero

### **Causa 2: Precio total es 0 o NULL**

**Escenario:**
- La reserva se creó sin precio o con precio 0
- El trigger no crea ingresos si `precio_total <= 0`

**Evidencia en código:**
```javascript
// admin-calendar.js línea 529
const precioFinal = parseFloat(req.body.precio_total) || parseFloat(precioCalculado.finalPrice) || 0;
```

**Solución:**
- Verificar el `precio_total` de la reserva GU4RCJ
- Si es 0, actualizar con el precio correcto

### **Causa 3: Email no se envió porque no había email_cliente**

**Escenario:**
- La reserva se creó sin `email_cliente` o con email vacío
- El servicio de email no puede enviar sin destinatario

**Evidencia en código:**
```javascript
// emailService.js línea 384-396
async sendReservationConfirmation(reservaData) {
    // Si no hay email_cliente, no se puede enviar
    if (!reservaData.email_cliente) {
        // No se envía email
    }
}
```

**Solución:**
- Verificar si la reserva GU4RCJ tiene `email_cliente`
- Si no tiene, agregar el email del cliente

### **Causa 4: Error silencioso en el envío de email**

**Escenario:**
- El email falló al enviarse (error SMTP, configuración, etc.)
- El error fue capturado y no falló la creación de la reserva
- No hay registro en BD de si se envió o no

**Evidencia en código:**
```javascript
// admin-calendar.js línea 694-697
} catch (emailError) {
  console.error('❌ Error enviando emails de confirmación:', emailError);
  // ⚠️ NO falla la creación de reserva si hay error en el email
}
```

**Solución:**
- Revisar logs del servidor en Render para ver si hubo error de email
- Verificar configuración SMTP en producción

### **Causa 5: Reserva creada antes de que existiera el trigger**

**Escenario:**
- La reserva se creó antes de que se instalara el trigger de sincronización
- El trigger solo se ejecuta en INSERT/UPDATE, no retroactivamente

**Solución:**
- Usar el endpoint de sincronización manual: `POST /api/admin/reservas/:codigo/sincronizar-ingreso`

---

## 🔧 VERIFICACIONES NECESARIAS

Para determinar la causa exacta, necesitas verificar en la base de datos de producción:

### **Query 1: Información completa de la reserva**
```sql
SELECT 
  r.*,
  c.nombre as cancha_nombre,
  comp.nombre as complejo_nombre,
  u.email as creado_por_email,
  u.rol as creado_por_rol
FROM reservas r
LEFT JOIN canchas c ON r.cancha_id = c.id
LEFT JOIN complejos comp ON c.complejo_id = comp.id
LEFT JOIN usuarios u ON r.admin_id = u.id
WHERE r.codigo_reserva = 'GU4RCJ';
```

**Verificar:**
- ✅ `estado` → ¿Es `'confirmada'`?
- ✅ `precio_total` → ¿Es > 0?
- ✅ `email_cliente` → ¿Tiene valor?
- ✅ `tipo_reserva` → ¿Es `'administrativa'`?
- ✅ `creada_por_admin` → ¿Es `true`?
- ✅ `admin_id` → ¿Quién la creó?
- ✅ `creado_por_email` → ¿Email del creador?
- ✅ `creado_por_rol` → ¿Rol del creador (owner/manager)?

### **Query 2: Verificar si existe en control financiero**
```sql
SELECT * FROM gastos_ingresos
WHERE descripcion LIKE '%GU4RCJ%'
OR descripcion LIKE '%Reserva #GU4RCJ%';
```

### **Query 3: Verificar categorías del complejo**
```sql
SELECT id, nombre, tipo FROM categorias_gastos
WHERE complejo_id = (
  SELECT complejo_id FROM canchas 
  WHERE id = (SELECT cancha_id FROM reservas WHERE codigo_reserva = 'GU4RCJ')
)
AND tipo = 'ingreso';
```

### **Query 4: Verificar trigger**
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'reservas'
AND trigger_name LIKE '%sincronizar%';
```

---

## 💡 SOLUCIONES PROPUESTAS

### **Solución 1: Sincronización Manual**

Si la reserva tiene estado `'confirmada'` y `precio_total > 0`, pero no está en control financiero:

```bash
# Usar el endpoint de sincronización
POST /api/admin/reservas/GU4RCJ/sincronizar-ingreso
```

Este endpoint:
- Verifica que la reserva esté confirmada
- Verifica que tenga precio válido
- Crea el ingreso en control financiero
- Usa el `monto_abonado` o `precio_total` según corresponda

### **Solución 2: Actualizar Estado y Precio**

Si la reserva no está en estado `'confirmada'` o no tiene precio:

```sql
-- Actualizar estado
UPDATE reservas 
SET estado = 'confirmada'
WHERE codigo_reserva = 'GU4RCJ';

-- Actualizar precio si es necesario
UPDATE reservas 
SET precio_total = [PRECIO_CORRECTO]
WHERE codigo_reserva = 'GU4RCJ' AND (precio_total IS NULL OR precio_total = 0);
```

Después de actualizar, el trigger debería ejecutarse automáticamente.

### **Solución 3: Enviar Email Manualmente**

Si la reserva tiene `email_cliente` pero no se envió el email:

```javascript
// Usar el servicio de email directamente
const EmailService = require('./src/services/emailService');
const emailService = new EmailService();

const emailData = {
  codigo_reserva: 'GU4RCJ',
  nombre_cliente: [NOMBRE],
  email_cliente: [EMAIL],
  complejo: 'Espacio Deportivo Borde Río',
  cancha: [NOMBRE_CANCHA],
  fecha: [FECHA],
  hora_inicio: [HORA_INICIO],
  hora_fin: [HORA_FIN],
  precio_total: [PRECIO]
};

await emailService.sendConfirmationEmails(emailData);
```

---

## 📊 DIAGNÓSTICO PROBABLE

Basado en el análisis del código, la causa más probable es:

### **Escenario más probable:**

1. **Reserva creada por owner/manager desde el calendario**
   - ✅ Se creó correctamente
   - ✅ Tiene código GU4RCJ
   - ❌ Estado: `'pendiente'` o `'por_pagar'` (no `'confirmada'`)
   - ❌ O `precio_total = 0` o NULL
   - ❌ O `email_cliente` estaba vacío

2. **Por qué no está en control financiero:**
   - El trigger solo se ejecuta cuando `estado = 'confirmada'` Y `precio_total > 0`
   - Si la reserva está en `'pendiente'` o tiene precio 0, el trigger no crea el ingreso

3. **Por qué no se envió email:**
   - Si `email_cliente` estaba vacío o NULL, no se puede enviar
   - O hubo un error silencioso en el envío (capturado en try-catch)

---

## ✅ RECOMENDACIONES

1. **Verificar en producción:**
   - Ejecutar las queries de verificación
   - Revisar logs del servidor en Render

2. **Si la reserva está en estado 'pendiente':**
   - Cambiar a `'confirmada'` si el cliente ya pagó
   - O dejarla en `'pendiente'` si aún no ha pagado (es correcto que no esté en control financiero)

3. **Si falta email_cliente:**
   - Agregar el email del cliente a la reserva
   - Enviar email manualmente si es necesario

4. **Mejora futura:**
   - Agregar un campo `email_enviado` en la tabla `reservas` para rastrear envíos
   - Agregar logs de envío de emails en una tabla separada

---

**Documento generado basado en análisis del código fuente del proyecto**


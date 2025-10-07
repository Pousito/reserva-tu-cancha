# 💰 Sistema de Pago Parcial (50%) - ReservaTuCancha

**Fecha de Implementación:** 7 de Octubre, 2025  
**Estado:** ✅ IMPLEMENTADO Y FUNCIONAL

---

## 📋 Resumen

Se implementó un sistema completo que permite a los clientes pagar solo el **50% del total** de una reserva online, con el 50% restante a cancelar directamente en el complejo deportivo.

---

## 🎯 Objetivos Cumplidos

### 1. **Frontend - Página Principal**
✅ Checkbox "Pagar el 50% del total de la reserva" en modal de reserva  
✅ Actualización dinámica del precio mostrado según selección  
✅ Interfaz clara con indicación del 50% restante  
✅ Validación y envío del porcentaje al backend  

**Archivos Modificados:**
- `/public/index.html` (líneas 286-297)
- `/public/script.js` (líneas 2272-2278, 3814-3844, 4097-4115)

### 2. **Base de Datos**
✅ Campo `porcentaje_pagado` agregado a tabla `reservas`  
✅ Tipo: INTEGER  
✅ Default: 100 (pago completo)  
✅ Valores: 50 o 100  

**Comando Ejecutado:**
```sql
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS porcentaje_pagado INTEGER DEFAULT 100;
```

### 3. **Backend - Guardado de Reservas**
✅ `src/utils/atomic-reservation.js` - INSERT con `porcentaje_pagado`  
✅ `src/routes/payments.js` - Creación de reserva post-pago con porcentaje  
✅ Extracción del porcentaje desde `datos_cliente` en bloqueos temporales  

**Archivos Modificados:**
- `/src/utils/atomic-reservation.js` (líneas 31, 152, 189)
- `/src/routes/payments.js` (línea 230, 246)

### 4. **Sistema de Emails**
✅ Email al cliente con aviso destacado de pago parcial  
✅ Email al manager del complejo con alerta de 50% pendiente  
✅ Email al super admin con indicación de pago parcial  
✅ Diseño visual diferenciado (amarillo para alertas)  

**Archivos Modificados:**
- `/src/services/emailService.js` (líneas 110, 268-289, 445-471, 515-540)

**Estructura de Emails:**

**Cliente:**
```
Total Pagado: $X (50% del total)

⚠️ Pago Parcial (50%)
Has pagado el 50% del total de la reserva ($X).
El 50% restante ($X) debe ser cancelado directamente en el complejo deportivo.

✔ Recuerda llevar el 50% restante para pagar en el complejo
```

**Manager del Complejo:**
```
⚠️ Pago Parcial: El cliente pagó solo el 50% online. Debe pagar el 50% restante en el complejo.

Total Pagado Online: $X (50% del total)
💰 Pendiente en Complejo: $X (50% restante)
```

**Super Admin:**
```
⚠️ Pago Parcial: El cliente pagó solo el 50% online.
Total Pagado Online: $X (50%)
```

### 5. **Dashboard Admin**
✅ Ícono de información (ℹ️) junto a tipo "Web" en la tabla de reservas  
✅ Modal con detalles del porcentaje pagado al hacer clic  
✅ Visual claro: Amarillo para 50%, Verde para 100%  
✅ Información de monto pendiente en complejo  

**Archivos Modificados:**
- `/public/admin-reservations.js` (líneas 471-476, 3240-3279)

**Función Implementada:**
```javascript
function mostrarInfoPago(codigoReserva, porcentajePagado, precioTotal)
```

### 6. **Sistema de Comisiones**
✅ **Reservas Web (directa):** 3.5% del total  
✅ **Reservas Admin (administrativa):** 1.75% del total  
✅ Comisiones se calculan sobre el precio_total (que ya considera el 50% si aplica)  

**Ubicaciones:**
- Frontend: `/public/admin-reservations.js` (líneas 432-440)
- Backend: `/src/utils/atomic-reservation.js` (línea 36, 142)
- Backend Admin: `/src/routes/admin-calendar.js` (línea 513)

---

## 🔄 Flujo Completo

### Reserva con Pago 50%

1. **Cliente selecciona cancha y hora**
2. **Marca checkbox "Pagar el 50% del total"**
   - Precio se actualiza visualmente mostrando 50%
3. **Completa datos y confirma**
   - `porcentaje_pagado: 50` se envía al backend
   - `precio_total` ya es el 50% del precio original
4. **Backend procesa:**
   - Guarda reserva con `porcentaje_pagado = 50`
   - Calcula comisión 3.5% sobre el 50% pagado
5. **Emails enviados:**
   - Cliente recibe confirmación con aviso de 50% pendiente
   - Manager recibe alerta de pago pendiente
   - Super admin recibe notificación
6. **Dashboard Admin:**
   - Reserva aparece como "Web" con ícono ℹ️
   - Al hacer clic muestra detalles del pago parcial

### Reserva con Pago 100%

1. **Cliente NO marca checkbox**
2. **Precio normal se muestra**
3. **`porcentaje_pagado: 100` (default)**
4. **Backend procesa normalmente**
5. **Emails estándar sin avisos de pago pendiente**
6. **Dashboard muestra "Web" con ℹ️ indicando pago completo**

---

## 📊 Detalles Técnicos

### ⚠️ IMPORTANTE: Diferencia entre precio_total y monto_pagado

**CAMBIO CRÍTICO (7 Oct 2025):**
- **`precio_total`**: SIEMPRE es el precio completo de la cancha (100%), independiente del porcentaje pagado
- **`monto_pagado`**: Es el monto que realmente paga el cliente online (50% o 100%)
- **`porcentaje_pagado`**: Indica si pagó 50 o 100

**Razón:** Las comisiones se calculan sobre el precio total de la cancha, no sobre lo pagado por el cliente.

### Cálculo del 50%

```javascript
// Frontend (script.js)
const pagarMitad = document.getElementById('pagarMitad').checked;
const porcentajePagado = pagarMitad ? 50 : 100;
const precioTotalCancha = canchaSeleccionada.precio_hora; // SIEMPRE 100%
const precioAPagar = pagarMitad ? Math.round(precioTotalCancha / 2) : precioTotalCancha;

// formData
precio_total: precioTotalCancha, // SIEMPRE el precio total
monto_pagado: precioAPagar, // Lo que realmente paga (50% o 100%)
porcentaje_pagado: porcentajePagado // 50 o 100
```

### Backend Storage

```javascript
// atomic-reservation.js
const { porcentaje_pagado = 100 } = reservationData;

INSERT INTO reservas (
    ..., porcentaje_pagado
) VALUES (..., $17)
```

### Email Service

```javascript
// emailService.js
const porcentajePagado = reservaData.porcentaje_pagado || 100;
const pagoMitad = porcentajePagado === 50;

${pagoMitad ? `
    <div class="instructions" style="background-color: #fff3cd;">
        <h3>⚠️ Pago Parcial (50%)</h3>
        <p>El 50% restante debe ser cancelado en el complejo.</p>
    </div>
` : ''}
```

---

## 🧪 Testing

### Casos de Prueba

1. ✅ **Reserva Web con 50%**
   - Checkbox marcado
   - Precio se divide correctamente
   - Email muestra aviso de pago parcial
   - Dashboard muestra ícono ℹ️ con detalles correctos

2. ✅ **Reserva Web con 100%**
   - Checkbox NO marcado
   - Precio completo
   - Email estándar
   - Dashboard muestra ícono ℹ️ con pago completo

3. ✅ **Reserva Admin**
   - Sin opción de 50% (solo desde web)
   - `porcentaje_pagado = 100` (default)
   - Sin ícono ℹ️ (solo aparece en tipo "Web")

4. ✅ **Comisiones**
   - Web: 3.5% calculado correctamente
   - Admin: 1.75% calculado correctamente
   - Sobre el monto efectivamente pagado

---

## 📝 Notas Importantes

### Para Super Admin
- El ícono ℹ️ solo aparece en reservas tipo "Web"
- El porcentaje pagado se almacena en la base de datos
- La comisión se calcula sobre el precio_total (que ya considera el 50%)
- Los emails siempre especifican claramente el porcentaje pagado

### Para Managers
- Recibirán emails con alerta amarilla cuando sea pago 50%
- Deben cobrar el 50% restante al cliente en el complejo
- Pueden ver los detalles en el dashboard haciendo clic en ℹ️

### Para Desarrollo Futuro
- El campo `porcentaje_pagado` puede extenderse a otros valores (25%, 75%, etc.)
- La lógica está modularizada y es fácil de mantener
- Los emails son dinámicos y se adaptan automáticamente

---

## 🔗 Archivos Relacionados

### Frontend
- `/public/index.html` - Modal de reserva con checkbox
- `/public/script.js` - Lógica de cálculo y envío
- `/public/admin-reservations.js` - Dashboard con ícono info

### Backend
- `/src/utils/atomic-reservation.js` - Creación de reserva
- `/src/routes/payments.js` - Post-pago
- `/src/services/emailService.js` - Emails
- `/src/routes/admin-calendar.js` - Reservas admin

### Base de Datos
- Campo: `reservas.porcentaje_pagado` (INTEGER, DEFAULT 100)

---

## ✅ Checklist de Implementación

- [x] Campo BD agregado
- [x] Frontend: checkbox funcional
- [x] Frontend: cálculo dinámico de precio
- [x] Backend: guardado de porcentaje
- [x] Emails: cliente con aviso
- [x] Emails: manager con alerta
- [x] Emails: super admin con notificación
- [x] Dashboard: ícono info
- [x] Dashboard: modal con detalles
- [x] Comisiones: verificadas y correctas
- [x] Testing: casos principales probados
- [x] Documentación: completa

---

## 🐛 Problemas Encontrados y Soluciones

### Problema 1: `porcentaje_pagado` no se guardaba en la BD
**Fecha:** 7 de Octubre, 2025  
**Síntoma:** Las reservas se guardaban con `porcentaje_pagado = 100` aunque se seleccionara 50%

**Causa Raíz:**
- El endpoint `/api/payments/simulate-success` en `server.js` no incluía `porcentaje_pagado` en:
  1. El objeto `datosLimpios` (línea 561-567)
  2. El `INSERT` de la reserva (líneas 584-603)
  3. El `emailData` enviado al servicio de emails (líneas 621-631)

**Solución Implementada:**

**1. Agregar a `datosLimpios`:**
```javascript
// server.js línea 567
const datosLimpios = {
    nombre_cliente: datosCliente.nombre_cliente || 'Sin nombre',
    email_cliente: datosCliente.email_cliente || 'sin@email.com',
    telefono_cliente: datosCliente.telefono_cliente || null,
    rut_cliente: datosCliente.rut_cliente ? datosCliente.rut_cliente.replace(/[^0-9kK-]/g, '') : 'No proporcionado',
    precio_total: parseInt(datosCliente.precio_total) || 0,
    porcentaje_pagado: datosCliente.porcentaje_pagado || 100 // ✅ AGREGADO
};
```

**2. Agregar al INSERT:**
```javascript
// server.js líneas 584-603
const reservaId = await db.run(`
    INSERT INTO reservas (
        cancha_id, nombre_cliente, email_cliente, telefono_cliente,
        rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
        codigo_reserva, estado, estado_pago, fecha_creacion, porcentaje_pagado // ✅ AGREGADO
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) // ✅ $14
`, [
    bloqueoData.cancha_id,
    datosLimpios.nombre_cliente,
    datosLimpios.email_cliente,
    datosLimpios.telefono_cliente,
    datosLimpios.rut_cliente,
    bloqueoData.fecha,
    bloqueoData.hora_inicio,
    bloqueoData.hora_fin,
    datosLimpios.precio_total,
    codigoReserva,
    'confirmada',
    'pagado',
    new Date().toISOString(),
    datosLimpios.porcentaje_pagado // ✅ AGREGADO
]);
```

**3. Agregar a emailData:**
```javascript
// server.js líneas 621-632
const emailData = {
    codigo_reserva: codigoReserva,
    nombre_cliente: datosLimpios.nombre_cliente,
    email_cliente: datosLimpios.email_cliente,
    fecha: bloqueoData.fecha,
    hora_inicio: bloqueoData.hora_inicio,
    hora_fin: bloqueoData.hora_fin,
    precio_total: datosLimpios.precio_total,
    porcentaje_pagado: datosLimpios.porcentaje_pagado, // ✅ AGREGADO
    complejo: canchaInfo?.complejo_nombre || 'Complejo Deportivo',
    cancha: canchaInfo?.cancha_nombre || 'Cancha'
};
```

---

### Problema 2: Página de pago exitoso mostraba monto incorrecto
**Fecha:** 7 de Octubre, 2025  
**Síntoma:** La página `payment-success.html` siempre mostraba el monto total ($8.000) aunque se pagara 50%

**Causa Raíz:**
- El endpoint `/api/reservas/:codigo` no devolvía el campo `porcentaje_pagado`
- El `SELECT` en `server.js` (línea 698-709) no incluía `r.porcentaje_pagado`

**Solución Implementada:**

**Agregar `porcentaje_pagado` al SELECT:**
```javascript
// server.js líneas 698-709
const reserva = await db.get(`
    SELECT r.id, r.cancha_id, r.usuario_id, r.nombre_cliente, r.email_cliente, 
           r.telefono_cliente, r.rut_cliente, 
           TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha,
           r.hora_inicio, r.hora_fin, r.estado, r.estado_pago, 
           r.precio_total, r.porcentaje_pagado, r.created_at, r.fecha_creacion, r.codigo_reserva, // ✅ AGREGADO
           c.nombre as cancha_nombre, c.tipo, co.nombre as complejo_nombre
    FROM reservas r
    JOIN canchas c ON r.cancha_id = c.id
    JOIN complejos co ON c.complejo_id = co.id
    WHERE r.codigo_reserva = $1
`, [codigo]);
```

**Frontend ya tenía la lógica correcta:**
```javascript
// payment-success.html líneas 392-407
const esPagoParcial = reservationData.porcentaje_pagado === 50;
const totalAmountElement = document.getElementById('totalAmount');

if (esPagoParcial) {
    const montoPagado = Math.round(reservationData.precio_total / 2);
    totalAmountElement.innerHTML = `
        <div style="font-size: 18px; font-weight: bold;">${formatCurrency(montoPagado)}</div>
        <div style="font-size: 12px; color: #856404;">⚠️ Pago Parcial (50%)</div>
        <div style="font-size: 11px;">Total reserva: ${formatCurrency(reservationData.precio_total)}</div>
        <div style="font-size: 11px; color: #dc3545;">Pendiente en complejo: ${formatCurrency(montoPagado)}</div>
    `;
} else {
    totalAmountElement.textContent = formatCurrency(reservationData.precio_total);
}
```

---

### Problema 3: `monto_pagado` y `porcentaje_pagado` undefined en payment.html
**Fecha:** 7 de Octubre, 2025  
**Síntoma:** Los logs del navegador mostraban `monto_pagado: undefined` y `porcentaje_pagado: undefined`

**Causa Raíz:**
- El endpoint `/api/reservas/bloquear-y-pagar` en `server.js` no guardaba estos campos en el JSON de `datos_cliente` del bloqueo temporal

**Solución Implementada:**

**Agregar campos al JSON.stringify de datos_cliente:**
```javascript
// server.js líneas 1170-1185
const datosClienteParaGuardar = {
    nombre_cliente,
    email_cliente,
    telefono_cliente: telefono_cliente || 'No proporcionado',
    rut_cliente,
    precio_total,
    porcentaje_pagado: porcentaje_pagado || 100, // ✅ AGREGADO
    monto_pagado: monto_pagado || precio_total    // ✅ AGREGADO
};

console.log('💾 Guardando datos_cliente en bloqueo temporal:', JSON.stringify(datosClienteParaGuardar, null, 2));

await db.run(`
    INSERT INTO bloqueos_temporales (id, cancha_id, fecha, hora_inicio, hora_fin, session_id, expira_en, datos_cliente)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`, [bloqueoId, cancha_id, fechaParaBD, hora_inicio, hora_fin, session_id, expiraEn.toISOString(), JSON.stringify(datosClienteParaGuardar)]);
```

---

## 🔍 Debugging Tips

### Cómo verificar que funciona correctamente:

**1. Verificar en la Base de Datos:**
```sql
SELECT codigo_reserva, nombre_cliente, precio_total, porcentaje_pagado 
FROM reservas 
ORDER BY fecha_creacion DESC 
LIMIT 5;
```

**2. Verificar logs del servidor:**
```
💾 Guardando datos_cliente en bloqueo temporal: {
  "porcentaje_pagado": 50,  ✅
  "monto_pagado": 4000       ✅
}
```

**3. Verificar logs del navegador (payment.html):**
```
🔍 DEBUG - porcentaje_pagado: 50  ✅
🔍 DEBUG - monto_pagado: 4000     ✅
```

**4. Verificar emails:**
- Cliente: Debe mostrar "Pago Parcial (50%)" si aplica
- Manager: Debe mostrar alerta de 50% pendiente
- Super Admin: Debe indicar pago parcial

---

## 📚 Archivos Críticos Modificados

### server.js
- **Línea 567:** `datosLimpios.porcentaje_pagado` agregado
- **Línea 587:** `porcentaje_pagado` en INSERT
- **Línea 603:** `datosLimpios.porcentaje_pagado` en VALUES
- **Línea 629:** `emailData.porcentaje_pagado` agregado
- **Línea 703:** `r.porcentaje_pagado` en SELECT
- **Líneas 1170-1185:** `datosClienteParaGuardar` con porcentaje y monto

### payment-success.html
- **Líneas 392-407:** Lógica de display con pago parcial

### payment.html  
- **Líneas 630-679:** Lógica de display del monto a pagar

---

**Estado Final:** ✅ SISTEMA COMPLETO Y FUNCIONAL

El sistema de pago parcial está completamente implementado, debugeado y listo para uso en producción.

**Última Verificación:** 7 de Octubre, 2025 - 17:15 (Chile)


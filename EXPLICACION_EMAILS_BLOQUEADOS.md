# 📧 EXPLICACIÓN: Lista de Emails Bloqueados

## 🎯 ¿Qué hace esta lista?

La lista `EMAILS_BLOQUEADOS_AUTOMATICOS` bloquea **emails automáticos** para esos correos, sin importar si son:
- **Clientes** (personas que hacen reservas)
- **Dueños/Admins** (administradores de complejos)

---

## 📋 COMPORTAMIENTO DETALLADO

### **1. Si un CLIENTE está en la lista bloqueada:**

**Ejemplo:** `magda.espinoza.se@gmail.com` hace una reserva como cliente

- ❌ **NO recibirá** el email de confirmación de su reserva
- ✅ La reserva **SÍ se crea** normalmente
- ✅ Se registra en `email_logs` como `omitido`
- ✅ El dueño/admin del complejo **SÍ recibirá** su notificación (si no está bloqueado)

**¿Por qué?** Para evitar que la dueña reciba emails automáticos cuando hace reservas de prueba o administrativas.

---

### **2. Si un DUEÑO/ADMIN está en la lista bloqueada:**

**Ejemplo:** `magda.espinoza.se@gmail.com` es dueña de "Espacio Deportivo Borde Río"

- ❌ **NO recibirá** notificaciones automáticas cuando haya nuevas reservas en su complejo
- ✅ La reserva **SÍ se crea** normalmente
- ✅ El cliente **SÍ recibe** su email de confirmación (si no está bloqueado)
- ✅ Se registra en `email_logs` como `omitido`

**¿Por qué?** Para evitar spam de notificaciones a dueños cuando están probando el sistema.

---

### **3. Excepción: `admin@reservatuscanchas.cl`**

Este email es especial:
- ❌ **NO recibe** emails de confirmación si hace una reserva como cliente
- ✅ **SÍ recibe** notificaciones de super admin (nuevas reservas en todos los complejos)

**¿Por qué?** Es el dueño de la plataforma, necesita ver todas las reservas pero no recibir confirmaciones cuando hace pruebas.

---

## 🔍 EJEMPLOS PRÁCTICOS

### **Ejemplo 1: Cliente bloqueado**

```
Reserva creada:
- Cliente: magda.espinoza.se@gmail.com (BLOQUEADO)
- Complejo: Espacio Deportivo Borde Río
- Dueño: admin@borderio.cl (NO bloqueado)

Resultado:
❌ Cliente NO recibe email de confirmación
✅ Dueño SÍ recibe notificación de nueva reserva
✅ Reserva se crea normalmente
```

### **Ejemplo 2: Dueño bloqueado**

```
Reserva creada:
- Cliente: cliente@ejemplo.com (NO bloqueado)
- Complejo: Espacio Deportivo Borde Río
- Dueño: magda.espinoza.se@gmail.com (BLOQUEADO)

Resultado:
✅ Cliente SÍ recibe email de confirmación
❌ Dueño NO recibe notificación de nueva reserva
✅ Reserva se crea normalmente
```

### **Ejemplo 3: Ambos bloqueados**

```
Reserva creada:
- Cliente: magda.espinoza.se@gmail.com (BLOQUEADO)
- Complejo: Espacio Deportivo Borde Río
- Dueño: magda.espinoza.se@gmail.com (BLOQUEADO)

Resultado:
❌ Cliente NO recibe email de confirmación
❌ Dueño NO recibe notificación
✅ Reserva se crea normalmente
✅ admin@reservatuscanchas.cl SÍ recibe notificación (super admin)
```

---

## ⚠️ IMPORTANTE

### **Lo que SÍ se bloquea:**
- ✅ Emails automáticos de confirmación de reserva (a clientes)
- ✅ Notificaciones automáticas de nuevas reservas (a dueños/admins)

### **Lo que NO se bloquea:**
- ✅ La creación de la reserva (siempre se crea)
- ✅ Notificaciones de super admin a `admin@reservatuscanchas.cl`
- ✅ Emails manuales (si los envías manualmente desde el código)
- ✅ Emails de restablecimiento de contraseña
- ✅ Otros emails del sistema (no relacionados con reservas)

---

## 🎯 RESUMEN SIMPLE

**La lista bloquea emails automáticos de reservas:**

1. **Si el email está en la lista:**
   - Como cliente → NO recibe confirmación de su reserva
   - Como dueño/admin → NO recibe notificaciones de nuevas reservas

2. **Si el email NO está en la lista:**
   - Como cliente → SÍ recibe confirmación
   - Como dueño/admin → SÍ recibe notificaciones

3. **La reserva siempre se crea**, solo se bloquean los emails automáticos.

---

## 💡 ¿Cuándo usar esta lista?

Agrega emails a esta lista cuando:
- ✅ Son dueños/admins que hacen muchas reservas de prueba
- ✅ No quieren recibir notificaciones automáticas
- ✅ Son emails de administración que no deben recibir confirmaciones de cliente

**NO agregues:**
- ❌ Emails de clientes reales (deben recibir sus confirmaciones)
- ❌ Emails que quieres que reciban notificaciones


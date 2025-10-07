# 🏟️ Complejo Borde Rio - Quilleco

## 📋 **INFORMACIÓN GENERAL**

### **Datos del Complejo:**
- **Nombre:** Borde Rio
- **Ciudad:** Quilleco, Bio Bio
- **Dirección:** Ruta Q-575
- **Teléfono:** +56 9 9982 0929
- **Email:** admin@borderio.cl
- **Instagram:** [@espaciodeportivoborderio](https://www.instagram.com/espaciodeportivoborderio/)
- **Horario:** Lunes a domingo, 10:00 AM - 00:00 AM
- **Estacionamiento:** Por confirmar

### **IDs en Base de Datos:**
- **Complejo ID:** 6
- **Ciudad ID:** 6 (Quilleco)
- **Cancha ID:** 10 (Cancha Principal)

---

## ⚽ **CARACTERÍSTICAS DE LA CANCHA**

### **Cancha Principal:**
- **Tipo:** Baby Fútbol
- **Capacidad:** 7 vs 7 jugadores
- **Superficie:** Al aire libre (no techada)
- **Ubicación:** Calle lateral derecha (Ruta Q-575)
- **Precio/hora:** $8,000
- **Características especiales:**
  - Cancha descubierta
  - Superficie natural/sintética
  - Iluminación para juegos nocturnos
  - Vista a la Ruta Q-575

---

## 🔑 **CREDENCIALES DE ACCESO**

### **Owner (Dueño):**
- **Email:** `admin@borderio.cl`
- **Password:** `borderio2024`
- **Rol:** `owner`
- **Permisos:**
  - ✅ Dashboard completo del complejo
  - ✅ Ver y gestionar reservas
  - ✅ Gestionar canchas
  - ✅ **VER REPORTES** de su complejo
  - ✅ **VER INGRESOS** de su complejo
  - ❌ No puede ver otros complejos

### **Manager (Gestor):**
- **Email:** `manager@borderio.cl`
- **Password:** `manager2024`
- **Rol:** `manager`
- **Permisos:**
  - ✅ Dashboard básico
  - ✅ Ver reservas del complejo
  - ✅ Ver canchas (solo lectura)
  - ❌ **NO puede ver reportes**
  - ❌ **NO puede ver ingresos**
  - ❌ No puede modificar configuraciones

---

## 🗺️ **UBICACIÓN Y CONTEXTO**

### **Ciudad: Quilleco**
- **Región:** Bio Bio
- **Nueva ciudad agregada al sistema**
- Primera y única ciudad en esta comuna

### **Ubicación del Complejo:**
- **Calle principal:** Ruta Q-575
- **Posición:** Lateral derecha
- **Características:**
  - Ruta de acceso principal
  - Visible desde la carretera
  - Fácil acceso vehicular

---

## 📊 **DATOS EN BASE DE DATOS**

### **Tabla `ciudades`:**
```sql
INSERT INTO ciudades (id, nombre) 
VALUES (6, 'Quilleco');
```

### **Tabla `complejos`:**
```sql
INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
VALUES (
    6,
    'Borde Rio',
    6,
    'Ruta Q-575, Quilleco, Bio Bio',
    '+56999820929',
    'admin@borderio.cl'
);
```

### **Tabla `canchas`:**
```sql
INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
VALUES (
    10,
    6,
    'Cancha Principal',
    'baby futbol',
    8000
);
```

### **Tabla `usuarios`:**
```sql
-- Owner
INSERT INTO usuarios (id, email, password, nombre, rol, complejo_id, activo) 
VALUES (
    35,
    'admin@borderio.cl',
    '[HASH]',
    'Administrador Borde Rio',
    'owner',
    6,
    true
);

-- Manager
INSERT INTO usuarios (id, email, password, nombre, rol, complejo_id, activo) 
VALUES (
    36,
    'manager@borderio.cl',
    '[HASH]',
    'Manager Borde Rio',
    'manager',
    6,
    true
);
```

---

## 🚀 **CÓMO PROBAR EL COMPLEJO**

### **1. Acceso al Panel Admin:**
```
http://localhost:3000/admin-login.html
```

### **2. Login como Owner:**
- Email: `admin@borderio.cl`
- Password: `borderio2024`

### **3. Verificaciones:**
- ✅ Dashboard muestra solo Borde Rio
- ✅ Puede ver la cancha creada
- ✅ Puede crear reservas administrativas
- ✅ Puede ver reportes del complejo
- ✅ Puede ver ingresos del complejo

### **4. Login como Manager:**
- Email: `manager@borderio.cl`
- Password: `manager2024`

### **5. Verificaciones Manager:**
- ✅ Dashboard básico visible
- ✅ Puede ver reservas (solo lectura)
- ❌ No ve sección de reportes
- ❌ No ve sección de ingresos

---

## 📱 **INFORMACIÓN DE CONTACTO**

### **Redes Sociales:**
- **Instagram:** [@espaciodeportivoborderio](https://www.instagram.com/espaciodeportivoborderio/)
- **Descripción IG:** "Cancha baby fútbol ⚽️"

### **Reservas:**
- **Método 1:** DM de Instagram
- **Método 2:** WhatsApp +56 9 9982 0929
- **Método 3:** Plataforma ReservaTusCanchas (nueva)

### **Horarios de Atención:**
- **Días:** Lunes a domingo
- **Horario:** 10:00 AM - 00:00 AM (Medianoche)
- **Reservas:** Disponibles todo el horario

---

## 🎯 **CARACTERÍSTICAS DEL SISTEMA**

### **Funcionalidades Habilitadas:**
- ✅ Reservas online
- ✅ Reservas administrativas (owner/manager)
- ✅ Calendario semanal de disponibilidad
- ✅ Sistema de bloqueos temporales
- ✅ Reportes de ingresos (solo owner)
- ✅ Gestión de canchas
- ✅ Notificaciones por email

### **Comisiones:**
- **Reservas web (directa):** 3.5%
- **Reservas administrativas:** 1.75%
- **Precio base/hora:** $8,000

---

## 📈 **PRÓXIMAS CONFIGURACIONES**

### **Pendientes (Opcional):**
- [ ] Confirmar disponibilidad de estacionamiento
- [ ] Agregar fotos del complejo
- [ ] Configurar horarios especiales (si aplica)
- [ ] Definir política de cancelación
- [ ] Configurar descuentos especiales
- [ ] Agregar más canchas si se construyen

---

## 🔄 **SCRIPT DE CREACIÓN**

**Ubicación:** `/scripts/agregar-borderio.js`

**Ejecutar:**
```bash
node scripts/agregar-borderio.js
```

**Funcionalidad:**
- Crea ciudad Quilleco (si no existe)
- Crea complejo Borde Rio
- Crea cancha de baby fútbol
- Crea usuario owner
- Crea usuario manager
- Todo en una transacción atómica

---

## 📝 **NOTAS IMPORTANTES**

### **Seguridad:**
- Contraseñas hasheadas con bcrypt (12 rounds)
- Usuarios activos por defecto
- Roles correctamente asignados según jerarquía

### **Permisos:**
- Owner tiene acceso completo (reportes + ingresos)
- Manager tiene acceso limitado (sin financiero)
- Ambos pueden gestionar reservas de su complejo

### **Base de Datos:**
- PostgreSQL local (desarrollo)
- Datos ficticios para testing
- No afecta producción

---

**📅 Fecha de creación:** 7 de octubre de 2025  
**👤 Creado por:** Asistente IA  
**🎯 Estado:** ✅ Completo y funcional


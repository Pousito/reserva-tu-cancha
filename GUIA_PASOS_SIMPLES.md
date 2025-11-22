# 📋 GUÍA PASO A PASO - Qué Hacer Ahora

## 🎯 RESUMEN SIMPLE

He hecho 3 mejoras en tu código:

1. ✅ **Sistema para rastrear emails**: Ahora se guarda en la base de datos si se envió o no un email
2. ✅ **Bloqueo de emails**: No se enviarán emails automáticos a `magda.espinoza.se@gmail.com` (la dueña)
3. ✅ **Corrección de admin_id**: Ahora se valida que siempre se guarde quién creó la reserva

---

## 📝 PASOS A SEGUIR

### **PASO 1: Aplicar cambios en la base de datos**

Necesitas ejecutar un script SQL en tu base de datos de producción (Render).

**Opción A: Desde Render Dashboard (RECOMENDADO)**

1. Ve a https://dashboard.render.com
2. Entra a tu base de datos PostgreSQL
3. Haz clic en "Connect" o "Shell" (depende de tu versión)
4. Copia y pega este SQL:

```sql
-- Crear tabla de logs de email
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
  codigo_reserva VARCHAR(50),
  destinatario VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cliente', 'admin_complejo', 'super_admin')),
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('enviado', 'error', 'simulado', 'omitido')),
  error TEXT,
  message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_email_logs_reserva ON email_logs(reserva_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_codigo ON email_logs(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_email_logs_estado ON email_logs(estado);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

-- Agregar campos a tabla reservas
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS email_cliente_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_cliente_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_cliente_error TEXT,
ADD COLUMN IF NOT EXISTS email_admin_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_admin_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_admin_error TEXT;

-- Crear índices para reservas
CREATE INDEX IF NOT EXISTS idx_reservas_email_cliente_enviado ON reservas(email_cliente_enviado);
CREATE INDEX IF NOT EXISTS idx_reservas_email_admin_enviado ON reservas(email_admin_enviado);
```

5. Ejecuta el SQL (presiona Enter o el botón de ejecutar)

**Opción B: Desde tu computadora (si tienes acceso a DATABASE_URL)**

```bash
cd "/Users/pousito/Desktop/Proyecto Reserva Tu Cancha/Programacion/ReservaTuCancha"
node scripts/aplicar-migracion-email-logging.js
```

---

### **PASO 2: Desplegar el código**

Una vez que hayas aplicado el SQL en la base de datos:

1. **Haz commit de los cambios** (si usas Git):
   ```bash
   git add .
   git commit -m "Agregar sistema de logging de emails y corrección de admin_id"
   git push
   ```

2. **Render desplegará automáticamente** (si tienes auto-deploy activado)

   O si necesitas desplegar manualmente:
   - Ve a Render Dashboard
   - Selecciona tu servicio
   - Haz clic en "Manual Deploy"

---

## ✅ VERIFICAR QUE FUNCIONÓ

Después de desplegar, puedes verificar que todo funciona:

### **1. Verificar que la tabla existe:**
```sql
SELECT * FROM email_logs LIMIT 1;
```

### **2. Verificar que los campos existen:**
```sql
SELECT 
  codigo_reserva,
  email_cliente_enviado,
  email_admin_enviado
FROM reservas
LIMIT 1;
```

---

## 🎯 QUÉ CAMBIÓ EN EL CÓDIGO

### **Antes:**
- ❌ No se sabía si se envió un email o no
- ❌ Se podían enviar emails a la dueña por error
- ❌ A veces `admin_id` quedaba en null

### **Ahora:**
- ✅ Se registra en BD si se envió o no cada email
- ✅ NO se envían emails automáticos a `magda.espinoza.se@gmail.com`
- ✅ Se valida que `admin_id` siempre esté presente

---

## ⚠️ IMPORTANTE

- **NO se rompió nada**: El código sigue funcionando igual que antes
- **NO se enviarán emails** a `magda.espinoza.se@gmail.com` automáticamente
- **Solo necesitas aplicar el SQL** una vez en la base de datos

---

## 🆘 SI ALGO SALE MAL

Si tienes algún error al aplicar el SQL, es probable que:
- Algunas tablas/columnas ya existan → **Está bien, continúa**
- Necesites permisos de administrador → **Usa el usuario admin de Render**

Si tienes dudas, avísame y te ayudo.


# 🎯 CÓMO EJECUTAR EL SQL EN RENDER - PASO A PASO

## ⚠️ IMPORTANTE: NO lo ejecutes en la consola del navegador

El error que viste (`SyntaxError: Unexpected token '==='`) es porque intentaste ejecutar SQL en JavaScript. El SQL debe ejecutarse en el **Shell de PostgreSQL de Render**.

---

## 📋 PASOS CORRECTOS

### **PASO 1: Ir a Render Dashboard**

1. Ve a: https://dashboard.render.com
2. Inicia sesión con tu cuenta

### **PASO 2: Encontrar tu Base de Datos PostgreSQL**

1. En el menú lateral, busca **"Databases"** o **"PostgreSQL"**
2. Haz clic en tu base de datos (probablemente se llama algo como `reserva-tu-cancha-db` o similar)

### **PASO 3: Abrir el Shell/Console de PostgreSQL**

Tienes **2 opciones**:

#### **Opción A: Desde el Dashboard de Render (MÁS FÁCIL)**

1. En la página de tu base de datos, busca el botón **"Connect"** o **"Shell"**
2. Haz clic en **"Connect"** o **"Open Shell"**
3. Se abrirá una terminal/consola de PostgreSQL

#### **Opción B: Desde la pestaña "Connect"**

1. En la página de tu base de datos, ve a la pestaña **"Connect"**
2. Busca la sección **"Shell"** o **"psql"**
3. Haz clic en **"Connect"** o copia el comando de conexión

### **PASO 4: Ejecutar el SQL**

1. **Copia TODO el contenido** del archivo `COPIAR_Y_PEGAR_EN_RENDER.sql`
2. **Pégalo** en la terminal/consola de PostgreSQL que acabas de abrir
3. **Presiona Enter** para ejecutar

### **PASO 5: Verificar que funcionó**

Deberías ver mensajes como:
- `CREATE TABLE`
- `CREATE INDEX`
- `ALTER TABLE`

Si ves errores que dicen "already exists", **está bien**, significa que ya existía.

---

## 🖼️ DÓNDE ESTÁ EL BOTÓN "SHELL" EN RENDER

En Render Dashboard, cuando estás en la página de tu base de datos PostgreSQL, verás algo como:

```
┌─────────────────────────────────────┐
│  Tu Base de Datos PostgreSQL        │
├─────────────────────────────────────┤
│  [Overview] [Connect] [Logs] ...   │
│                                     │
│  En la pestaña "Connect" verás:     │
│  ┌───────────────────────────────┐ │
│  │ Shell                         │ │
│  │ [Connect] ← Haz clic aquí    │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔍 SI NO ENCUENTRAS EL BOTÓN "SHELL"

### **Alternativa: Usar psql desde tu computadora**

Si no encuentras el botón Shell, puedes conectarte desde tu terminal:

1. **Obtén la conexión string** desde Render:
   - Ve a tu base de datos → Pestaña "Connect"
   - Copia la **"Internal Database URL"** o **"External Database URL"**

2. **Instala psql** (si no lo tienes):
   ```bash
   # macOS
   brew install postgresql
   ```

3. **Conéctate**:
   ```bash
   psql "postgresql://usuario:password@host:puerto/database"
   ```

4. **Pega el SQL** y ejecuta

---

## ✅ VERIFICACIÓN FINAL

Después de ejecutar el SQL, verifica que funcionó:

```sql
-- Verificar que la tabla existe
SELECT * FROM email_logs LIMIT 1;

-- Verificar que los campos existen
SELECT 
  codigo_reserva,
  email_cliente_enviado,
  email_admin_enviado
FROM reservas
LIMIT 1;
```

Si estas consultas funcionan sin error, **¡todo está bien!** ✅

---

## 🆘 SI SIGUES TENIENDO PROBLEMAS

1. **Toma una captura de pantalla** de la página de tu base de datos en Render
2. **Dime qué ves** y te ayudo a encontrar el botón correcto

**Recuerda:** El SQL debe ejecutarse en PostgreSQL, NO en la consola del navegador (F12).


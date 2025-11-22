# 🔌 CÓMO CONECTARTE A POSTGRESQL DE RENDER DESDE TU TERMINAL

## ✅ Render NO tiene Shell integrado

Cuando presionas "Connect" en Render, solo ves:
- **Internal URL** (para servicios dentro de Render)
- **External URL** (para conectarte desde tu computadora)

Necesitas usar **psql** desde tu terminal local.

---

## 📋 PASOS PARA CONECTARTE

### **PASO 1: Obtener la External URL**

1. Ve a Render Dashboard → Tu base de datos PostgreSQL
2. Haz clic en **"Connect"**
3. Copia la **"External Database URL"** (se ve así: `postgresql://usuario:password@host:puerto/database`)

### **PASO 2: Instalar psql (si no lo tienes)**

#### **En macOS:**
```bash
# Opción 1: Con Homebrew (recomendado)
brew install postgresql

# Opción 2: Con MacPorts
sudo port install postgresql17
```

#### **Verificar si ya lo tienes:**
```bash
psql --version
```

Si ves un número de versión, ya lo tienes instalado ✅

### **PASO 3: Conectarte desde tu terminal**

1. **Abre tu terminal** (Terminal.app en macOS)

2. **Conéctate usando la External URL:**
   ```bash
   psql "postgresql://reserva_user:TU_PASSWORD@dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com/reserva_tu_cancha"
   ```

   **O si prefieres usar variables de entorno:**
   ```bash
   export PGHOST=dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com
   export PGPORT=5432
   export PGDATABASE=reserva_tu_cancha
   export PGUSER=reserva_user
   export PGPASSWORD=TU_PASSWORD
   
   psql
   ```

3. **Si te pide la contraseña**, cópiala desde Render Dashboard → Connect → External Database URL

### **PASO 4: Ejecutar el SQL**

Una vez conectado, verás algo como:
```
reserva_tu_cancha=>
```

1. **Abre el archivo:** `COPIAR_Y_PEGAR_EN_RENDER.sql`
2. **Copia TODO el contenido**
3. **Pega** en la terminal (donde dice `reserva_tu_cancha=>`)
4. **Presiona Enter**

Deberías ver:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
...
ALTER TABLE
CREATE INDEX
CREATE INDEX
```

### **PASO 5: Verificar que funcionó**

En la misma terminal, ejecuta:
```sql
SELECT * FROM email_logs LIMIT 1;
```

Si no da error, **¡funcionó!** ✅

Para salir de psql, escribe:
```sql
\q
```

---

## 🎯 MÉTODO ALTERNATIVO: Usar pgAdmin (Más Fácil)

Si prefieres una interfaz gráfica:

### **1. Descargar pgAdmin**
- Ve a: https://www.pgadmin.org/download/
- Descarga e instala pgAdmin 4

### **2. Conectar a tu base de datos**

1. Abre pgAdmin
2. Click derecho en "Servers" → "Register" → "Server"
3. En la pestaña **"General"**:
   - Name: `Render - Reserva Tu Cancha`
4. En la pestaña **"Connection"**:
   - Host: `dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com`
   - Port: `5432`
   - Database: `reserva_tu_cancha`
   - Username: `reserva_user`
   - Password: (cópiala desde Render)
5. Click **"Save"**

### **3. Ejecutar el SQL**

1. Click derecho en tu base de datos → **"Query Tool"**
2. Abre el archivo `COPIAR_Y_PEGAR_EN_RENDER.sql`
3. Copia y pega el contenido
4. Click en el botón **"Execute"** (⚡)

---

## 🔍 OBTENER LA CONTRASEÑA

Si no tienes la contraseña:

1. Ve a Render Dashboard → Tu base de datos
2. Click en **"Connect"**
3. En **"External Database URL"**, la contraseña está después de los dos puntos:
   ```
   postgresql://usuario:CONTRASEÑA_AQUÍ@host:puerto/database
   ```

---

## ⚠️ SI TIENES PROBLEMAS DE CONEXIÓN

### **Error: "connection refused"**
- Verifica que la External URL esté correcta
- Asegúrate de que tu IP esté permitida (Render permite todas por defecto)

### **Error: "password authentication failed"**
- Verifica que copiaste bien la contraseña desde la External URL
- La contraseña puede tener caracteres especiales, cópiala completa

### **Error: "psql: command not found"**
- Instala PostgreSQL (ver PASO 2)

---

## ✅ RESUMEN RÁPIDO

1. ✅ Copia la **External Database URL** de Render
2. ✅ Instala **psql** (si no lo tienes): `brew install postgresql`
3. ✅ Conéctate: `psql "TU_EXTERNAL_URL"`
4. ✅ Pega el SQL del archivo `COPIAR_Y_PEGAR_EN_RENDER.sql`
5. ✅ Presiona Enter
6. ✅ ¡Listo!


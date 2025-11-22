# 🎯 PASOS EXACTOS PARA EJECUTAR SQL EN RENDER

## ⚠️ NO ejecutes el SQL en la consola del navegador (F12)

El error que viste es porque intentaste ejecutar SQL en JavaScript. Debes ejecutarlo en **PostgreSQL**.

---

## 📋 PASOS EXACTOS (CON IMÁGENES CONCEPTUALES)

### **PASO 1: Ir a Render Dashboard**

1. Abre: https://dashboard.render.com
2. Inicia sesión

### **PASO 2: Buscar tu Base de Datos**

1. En el menú izquierdo, busca **"Databases"** o haz clic en **"PostgreSQL"**
2. Verás una lista de bases de datos
3. Busca la que se llama **"reserva-tu-cancha-db"** o similar
4. **Haz clic en ella**

### **PASO 3: Abrir el Shell de PostgreSQL**

Una vez dentro de tu base de datos, verás varias pestañas arriba:

```
┌─────────────────────────────────────────────────────┐
│  [Overview]  [Connect]  [Logs]  [Metrics]  [Settings] │
└─────────────────────────────────────────────────────┘
```

1. **Haz clic en la pestaña "Connect"**
2. Verás algo como esto:

```
┌─────────────────────────────────────────────────────┐
│  Connection Info                                    │
│  ┌───────────────────────────────────────────────┐ │
│  │ Internal Database URL                         │ │
│  │ postgresql://...                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Shell                                         │ │
│  │ [Connect to Shell] ← HAZ CLIC AQUÍ           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

3. **Haz clic en "Connect to Shell"** o el botón similar

### **PASO 4: Se Abrirá una Terminal**

Verás una terminal/consola que se ve así:

```
$ psql reserva_tu_cancha
reserva_tu_cancha=>
```

**Esta es la terminal de PostgreSQL, aquí es donde debes pegar el SQL.**

### **PASO 5: Ejecutar el SQL**

1. **Abre el archivo:** `COPIAR_Y_PEGAR_EN_RENDER.sql`
2. **Copia TODO el contenido** (desde `-- ============================================` hasta el final)
3. **Pega** en la terminal de PostgreSQL que acabas de abrir
4. **Presiona Enter**

Deberías ver mensajes como:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE INDEX
CREATE INDEX
```

### **PASO 6: Verificar**

En la misma terminal, ejecuta:

```sql
SELECT * FROM email_logs LIMIT 1;
```

Si no da error, **¡funcionó!** ✅

---

## 🔍 SI NO VES EL BOTÓN "SHELL"

### **Alternativa: Usar la URL de conexión externa**

1. En la pestaña "Connect", copia la **"External Database URL"**
2. Desde tu terminal local, ejecuta:

```bash
psql "postgresql://reserva_user:TU_PASSWORD@dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com/reserva_tu_cancha"
```

3. Pega el SQL y ejecuta

---

## 🆘 SI SIGUES TENIENDO PROBLEMAS

**Opción más fácil: Usar pgAdmin o DBeaver**

1. Descarga **pgAdmin** (gratis): https://www.pgadmin.org/
2. Conéctate usando la "External Database URL" de Render
3. Abre "Query Tool"
4. Pega el SQL y ejecuta

---

## ✅ RESUMEN

1. ✅ Ve a Render Dashboard
2. ✅ Entra a tu base de datos PostgreSQL
3. ✅ Pestaña "Connect" → Botón "Connect to Shell"
4. ✅ Pega el SQL del archivo `COPIAR_Y_PEGAR_EN_RENDER.sql`
5. ✅ Presiona Enter
6. ✅ ¡Listo!

**NO lo ejecutes en:**
- ❌ Consola del navegador (F12)
- ❌ Terminal de JavaScript
- ❌ Cualquier lugar que no sea PostgreSQL

**SÍ ejecútalo en:**
- ✅ Shell de PostgreSQL en Render
- ✅ psql desde tu terminal
- ✅ pgAdmin o DBeaver


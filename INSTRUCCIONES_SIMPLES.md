# 🎯 INSTRUCCIONES SIMPLES - Ejecutar SQL en Render

## ✅ Ya tienes psql instalado

Perfecto, ya tienes PostgreSQL instalado en tu Mac. Ahora solo necesitas conectarte.

---

## 📋 MÉTODO 1: Usar el Script Automático (MÁS FÁCIL)

### **PASO 1: Obtener la External URL**

1. Ve a: https://dashboard.render.com
2. Entra a tu base de datos PostgreSQL (`reserva-tu-cancha-db`)
3. Haz clic en **"Connect"** (arriba a la derecha)
4. Copia la **"External Database URL"** completa
   - Se ve así: `postgresql://reserva_user:CONTRASEÑA@dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com/reserva_tu_cancha`

### **PASO 2: Ejecutar el Script**

Abre tu terminal y ejecuta:

```bash
cd "/Users/pousito/Desktop/Proyecto Reserva Tu Cancha/Programacion/ReservaTuCancha"
./conectar-y-ejecutar-sql.sh
```

El script te pedirá que pegues la External URL y ejecutará el SQL automáticamente.

---

## 📋 MÉTODO 2: Manual (Paso a Paso)

### **PASO 1: Obtener la External URL**

1. Ve a Render Dashboard → Tu base de datos → **"Connect"**
2. Copia la **"External Database URL"** completa

### **PASO 2: Conectarte desde Terminal**

Abre tu terminal y ejecuta:

```bash
cd "/Users/pousito/Desktop/Proyecto Reserva Tu Cancha/Programacion/ReservaTuCancha"

# Reemplaza TU_EXTERNAL_URL con la URL que copiaste
psql "TU_EXTERNAL_URL"
```

Ejemplo:
```bash
psql "postgresql://reserva_user:password123@dpg-d2uhibjuibrs73fm8ec0-a.oregon.postgres.render.com/reserva_tu_cancha"
```

### **PASO 3: Ejecutar el SQL**

Una vez conectado (verás `reserva_tu_cancha=>`), ejecuta:

```bash
\i COPIAR_Y_PEGAR_EN_RENDER.sql
```

O simplemente copia y pega el contenido del archivo `COPIAR_Y_PEGAR_EN_RENDER.sql` directamente.

### **PASO 4: Verificar**

```sql
SELECT * FROM email_logs LIMIT 1;
```

Si no da error, ¡funcionó! ✅

Para salir:
```sql
\q
```

---

## 🎯 MÉTODO 3: Desde el Archivo Directo (Una Línea)

Si prefieres hacerlo todo en una línea:

```bash
cd "/Users/pousito/Desktop/Proyecto Reserva Tu Cancha/Programacion/ReservaTuCancha"

# Reemplaza TU_EXTERNAL_URL con la URL que copiaste de Render
psql "TU_EXTERNAL_URL" -f COPIAR_Y_PEGAR_EN_RENDER.sql
```

---

## 🔍 DÓNDE ESTÁ LA EXTERNAL URL EN RENDER

1. Ve a: https://dashboard.render.com
2. Click en tu base de datos PostgreSQL
3. Arriba a la derecha, click en **"Connect"**
4. Verás dos opciones:
   - **Internal Database URL** (no la uses)
   - **External Database URL** ← **ESTA ES LA QUE NECESITAS**
5. Copia toda la URL (incluye usuario, contraseña, host, etc.)

---

## ⚠️ IMPORTANTE

- ✅ Usa la **External Database URL** (no la Internal)
- ✅ Copia la URL **completa** (incluye la contraseña)
- ✅ La contraseña puede tener caracteres especiales, cópiala completa

---

## 🆘 SI TIENES PROBLEMAS

### **Error: "connection refused"**
- Verifica que copiaste bien la External URL
- Asegúrate de que tu IP esté permitida (por defecto Render permite todas)

### **Error: "password authentication failed"**
- Verifica que copiaste la contraseña completa desde la External URL
- La contraseña puede tener caracteres especiales como `@`, `#`, etc.

### **Error: "psql: command not found"**
- Ya verificamos que lo tienes instalado, pero si aparece este error:
  ```bash
  export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
  ```

---

## ✅ RESUMEN RÁPIDO

1. ✅ Ve a Render → Tu DB → **Connect** → Copia **External Database URL**
2. ✅ Ejecuta: `./conectar-y-ejecutar-sql.sh` y pega la URL
3. ✅ ¡Listo!


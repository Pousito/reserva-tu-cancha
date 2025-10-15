# 🔗 URLs de Prueba para Borde Rio

## Fecha: 14 de Octubre, 2025

---

## 🎯 URLs para Probar

Por favor, prueba estas URLs en orden hasta encontrar la que funcione correctamente:

---

### ✅ **OPCIÓN 1: Con nombre completo y tilde**
```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Espacio%20Deportivo%20Borde%20R%C3%ADo
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Espacio Deportivo Borde Río

---

### ✅ **OPCIÓN 2: Con nombre completo sin tilde**
```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Espacio%20Deportivo%20Borde%20Rio
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Espacio Deportivo Borde Rio (sin tilde)

---

### ✅ **OPCIÓN 3: Solo "Borde Rio"**
```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Borde%20Rio
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Borde Rio

---

### ✅ **OPCIÓN 4: Solo "Borde Río" (con tilde)**
```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Borde%20R%C3%ADo
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Borde Río

---

### ✅ **OPCIÓN 5: Solo parámetro de complejo (nombre completo)**
```
https://www.reservatuscanchas.cl/?complejo=Espacio%20Deportivo%20Borde%20R%C3%ADo
```

**Decodificada:**
- complejo = Espacio Deportivo Borde Río
- (La ciudad se auto-selecciona)

---

### ✅ **OPCIÓN 6: Solo parámetro de complejo (corto)**
```
https://www.reservatuscanchas.cl/?complejo=Borde%20Rio
```

**Decodificada:**
- complejo = Borde Rio
- (La ciudad se auto-selecciona)

---

## 📋 Instrucciones para Probar

### Para cada URL:

1. **Copiar la URL completa**
2. **Abrir una ventana de incógnito** (Cmd+Shift+N en Chrome)
3. **Pegar la URL en la barra de direcciones**
4. **Presionar Enter**
5. **Verificar que se cargue:**
   - ✅ ¿Aparece "Quilleco" seleccionado?
   - ✅ ¿Aparece el complejo seleccionado?
   - ✅ ¿Está en el Paso 3 o avanza automáticamente?

6. **Si funciona:**
   - ✅ Anotar cuál URL funcionó
   - ✅ Avisar para actualizar el PDF

7. **Si no funciona:**
   - ❌ Probar la siguiente URL

---

## 🔍 Qué Buscar al Probar

### ✅ **La URL funciona si:**
- El campo "Ciudad" muestra "Quilleco"
- El campo "Complejo" muestra el nombre del complejo
- Ambos campos están pre-seleccionados
- No da error
- Puede continuar con "Buscar Disponibilidad"

### ❌ **La URL NO funciona si:**
- Los campos están vacíos
- Aparece "Selecciona una ciudad..."
- Aparece "Selecciona un complejo..."
- Da error 404 o similar
- No avanza al siguiente paso

---

## 📊 Nombres Posibles del Complejo

Según la documentación del proyecto, el complejo puede tener estos nombres:

1. **"Espacio Deportivo Borde Río"** (con tilde) - Usado en producción
2. **"Espacio Deportivo Borde Rio"** (sin tilde) - Variante
3. **"Borde Río"** (con tilde) - Nombre corto
4. **"Borde Rio"** (sin tilde) - Nombre corto usado en desarrollo

---

## 🛠️ Verificar en Base de Datos

Si ninguna URL funciona, necesitamos consultar la base de datos de producción.

### Puedes ejecutar este comando:
```bash
# Conectar a la base de datos y ver el nombre exacto
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT nombre FROM complejos WHERE email = \\'admin@borderio.cl\\' OR telefono = \\'+56999820929\\'')
  .then(r => { console.log('Nombre exacto:', r.rows[0]?.nombre); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
"
```

---

## 📝 Formato de Respuesta

### Por favor, responde con:

**URL que funcionó:** [Copia aquí la URL completa]

**Ejemplo:**
```
URL que funcionó: https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Borde%20Rio

Comportamiento:
✓ Pre-seleccionó Quilleco
✓ Pre-seleccionó Borde Rio
✓ Avanzó al Paso 3
```

---

## 🔄 Próximo Paso

Una vez que confirmes cuál URL funciona correctamente:
1. ✅ Actualizaré el PDF con la URL correcta
2. ✅ Regeneraré el manual
3. ✅ Estará listo para entregar

---

## 📞 Si Ninguna Funciona

Si ninguna de las 6 opciones funciona, podemos:
1. Consultar directamente la base de datos de producción
2. Revisar el código JavaScript de pre-llenado
3. Hacer debug en la consola del navegador
4. Ajustar el código si es necesario

---

**Por favor prueba las URLs y avísame cuál funciona.** 🔍


# 🔗 URLs para Probar - Borde Rio

## Fecha: 14 de Octubre, 2025

---

## 📋 PRUEBA ESTAS URLs EN ORDEN

Por favor, prueba cada una hasta encontrar la que funcione PERFECTAMENTE (que quede visualmente seleccionado el complejo):

---

### 🔴 **OPCIÓN 1: Solo Ciudad (Más Simple)**

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco
```

**Qué debe pasar:**
- ✓ Se pre-selecciona "Quilleco"
- ⚠️ El usuario debe seleccionar manualmente el complejo
- **Ventaja:** Solo 1 parámetro, menos chance de error

**Beneficio:** Cliente solo se salta el Paso 1 (ciudad)

---

### 🟡 **OPCIÓN 2: Nombre completo con tilde**

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Espacio%20Deportivo%20Borde%20R%C3%ADo
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Espacio Deportivo Borde Río

**Estado actual:** Se selecciona pero luego se deselecciona visualmente

---

### 🟢 **OPCIÓN 3: Nombre completo sin tilde**

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Espacio%20Deportivo%20Borde%20Rio
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Espacio Deportivo Borde Rio (sin tilde)

**Probar si:** El sistema acepta el nombre sin tilde

---

### 🔵 **OPCIÓN 4: Solo "Borde Rio"**

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo=Borde%20Rio
```

**Decodificada:**
- ciudad = Quilleco
- complejo = Borde Rio

**Probar si:** El sistema hace match parcial del nombre

---

### 🟣 **OPCIÓN 5: ID del complejo (si conocemos el ID)**

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco&complejo_id=6
```

**Decodificada:**
- ciudad = Quilleco
- complejo_id = 6

**Nota:** Esto requiere modificar el código JavaScript para aceptar complejo_id

---

## 📝 INSTRUCCIONES DE PRUEBA

### Para cada URL:

1. **Copiar la URL completa**
2. **Abrir ventana de incógnito** (Cmd+Shift+N)
3. **Pegar y presionar Enter**
4. **Esperar 5 segundos** (para que cargue todo)
5. **Verificar:**
   - ¿Ciudad "Quilleco" está seleccionada? (SI/NO)
   - ¿Complejo está seleccionado? (SI/NO)
   - ¿Complejo PERMANECE seleccionado? (SI/NO)
6. **Resultado:**
   - Si TODO está OK → Esa es la URL ganadora ✅
   - Si algo falla → Probar siguiente opción

---

## 🎯 RECOMENDACIÓN

### Si ninguna funciona perfectamente:

**OPCIÓN A: Usar URL solo con ciudad**
```
https://www.reservatuscanchas.cl/?ciudad=Quilleco
```

**Ventajas:**
- ✅ Funciona perfectamente (más simple)
- ✅ Cliente solo debe seleccionar el complejo manualmente
- ✅ Como Borde Rio es el único en Quilleco, es obvio cuál elegir
- ✅ Sin problemas técnicos

**En el manual dirías:**
"Use esta URL para que sus clientes vayan directo a Quilleco. 
Como Borde Rio es el único complejo en Quilleco, solo deben 
seleccionarlo del menú y presionar Buscar Disponibilidad."

---

**OPCIÓN B: Arreglar el código JavaScript**

Si quieres que funcione perfectamente con ciudad Y complejo pre-seleccionados, puedo:
1. Revisar el código de pre-llenado
2. Identificar por qué se deselecciona
3. Aplicar fix
4. Hacer deploy

**Tiempo estimado:** 15-30 minutos

---

## 📊 DECISION

### Por favor dime:

1. **¿Cuál URL funcionó mejor?** (o ninguna)

2. **¿Qué prefieres?**
   - [ ] Usar URL solo con ciudad (más simple, funciona 100%)
   - [ ] Arreglar el código para que funcione con ciudad Y complejo
   - [ ] Dejar como está (funciona aunque no se vea)

3. **¿Probaste hacer una reserva completa?**
   - ¿Funcionó todo el proceso aunque visualmente no se vea?

---

## 💡 MI RECOMENDACIÓN

Para el PDF del manual, sugiero usar la **URL solo con ciudad**:

```
https://www.reservatuscanchas.cl/?ciudad=Quilleco
```

**Razones:**
- ✅ Funciona perfectamente sin problemas
- ✅ Como Borde Rio es único en Quilleco, es obvio
- ✅ Cliente solo hace 1 clic extra (seleccionar complejo)
- ✅ Sin bugs visuales
- ✅ Más confiable

**Texto en el PDF:**
```
"Para facilitar las reservas, comparta esta URL que pre-carga 
la ciudad de Quilleco:

https://www.reservatuscanchas.cl/?ciudad=Quilleco

Como Borde Rio es el único complejo en Quilleco, sus clientes 
solo deben seleccionarlo del menú y presionar Buscar Disponibilidad."
```

---

**¿Qué opción prefieres?** 🤔

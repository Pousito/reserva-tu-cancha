# URLs con Parámetros - Reserva Tu Cancha

## 🎯 URLs para MagnaSports

### Desarrollo (Localhost)
```
http://localhost:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

### Producción (reservatuscanchas.cl)
```
https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

## 📋 Parámetros Disponibles

### Parámetros de URL:
- `ciudad`: Nombre de la ciudad (ej: "Los Ángeles")
- `complejo`: Nombre del complejo (ej: "MagnaSports")

### Ejemplos de URLs:

#### 1. Solo Ciudad Preseleccionada
```
https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles
```

#### 2. Ciudad y Complejo Preseleccionados
```
https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

#### 3. Solo Complejo (se auto-selecciona la ciudad)
```
https://www.reservatuscanchas.cl/?complejo=MagnaSports
```

## 🔧 Funcionalidad

### Lo que hace el sistema:
1. **Lee los parámetros URL** al cargar la página
2. **Preselecciona automáticamente** la ciudad y/o complejo
3. **Avanza automáticamente** al siguiente paso si es necesario
4. **Funciona en móviles y PC** con diferentes estrategias de carga
5. **Compatible con caracteres especiales** (acentos, espacios, etc.)

### Compatibilidad:
- ✅ **Desarrollo**: `localhost:3000`
- ✅ **Producción**: `www.reservatuscanchas.cl`
- ✅ **Móviles**: Android, iOS, etc.
- ✅ **PC**: Chrome, Firefox, Safari, Edge
- ✅ **Caracteres especiales**: Los Ángeles, MagnaSports

## 🚀 Para MagnaSports

### URL Recomendada:
```
https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

### Beneficios:
- ✅ **Ahorro de tiempo**: El usuario no necesita seleccionar ciudad ni complejo
- ✅ **Experiencia mejorada**: Va directo al paso 3 (tipo de cancha)
- ✅ **Menos clics**: Reduce la fricción en el proceso de reserva
- ✅ **URLs amigables**: Fáciles de compartir y recordar

## 📱 Testing

### Para probar en desarrollo:
1. Abrir: `http://localhost:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports`
2. Verificar que se preseleccionen automáticamente
3. Verificar que avance al paso 3

### Para probar en producción:
1. Abrir: `https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles&complejo=MagnaSports`
2. Verificar que funcione igual que en desarrollo
3. Probar en diferentes dispositivos

## 🔍 Debug

### Logs en consola:
- `🔍 Iniciando lectura de parámetros URL...`
- `📱 URLSearchParams resultado: { ciudad: "Los Ángeles", complejo: "MagnaSports" }`
- `🚀 === PRE-RELLENADO MEJORADO INICIADO ===`
- `✅ === PRE-RELLENADO MEJORADO COMPLETADO ===`

### Verificar funcionamiento:
1. Abrir DevTools (F12)
2. Ir a la pestaña Console
3. Buscar los logs mencionados arriba
4. Verificar que no haya errores

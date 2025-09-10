# 📱 URLs para Acceso Móvil - Localhost

## 🎯 Tu IP Local: `192.168.1.84`

### 📱 URLs para Acceder desde tu Móvil:

#### **1. URL Principal con Parámetros:**
```
http://192.168.1.84:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

#### **2. Variaciones de Prueba:**
- **Solo Ciudad:** `http://192.168.1.84:3000/?ciudad=Los%20Ángeles`
- **Solo Complejo:** `http://192.168.1.84:3000/?complejo=MagnaSports`
- **Sin parámetros:** `http://192.168.1.84:3000/`

#### **3. Página de Prueba:**
```
http://192.168.1.84:3000/test-urls.html
```

## 🔧 Requisitos:

### ✅ **Asegúrate de que:**
1. **Tu computadora y móvil estén en la misma red WiFi**
2. **El servidor esté ejecutándose** (`node server.js`)
3. **El puerto 3000 esté abierto** (debería estar por defecto)

### 📱 **Para Probar en tu Móvil:**

1. **Abrir navegador** en tu móvil
2. **Escribir la URL:** `http://192.168.1.84:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports`
3. **Verificar que funcione** igual que en PC

## 🎯 **URL Recomendada para MagnaSports (Móvil):**
```
http://192.168.1.84:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports
```

## 🔍 **Qué Verificar en Móvil:**

- ✅ **Preselección automática:** Ciudad y complejo seleccionados
- ✅ **Avance automático:** Al paso 3 (tipo de cancha)
- ✅ **Responsive design:** Que se vea bien en móvil
- ✅ **Funcionalidad completa:** Reservas, disponibilidad, etc.

## 🚨 **Si No Funciona:**

### **Problema 1: No se conecta**
- Verificar que ambos dispositivos estén en la misma WiFi
- Verificar que el servidor esté corriendo

### **Problema 2: IP diferente**
- Ejecutar: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Usar la IP que aparezca

### **Problema 3: Puerto bloqueado**
- Verificar firewall
- Probar con otro puerto si es necesario

## 📋 **URLs de Comparación:**

| Entorno | URL |
|---------|-----|
| **PC Local** | `http://localhost:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports` |
| **Móvil Local** | `http://192.168.1.84:3000/?ciudad=Los%20Ángeles&complejo=MagnaSports` |
| **Producción** | `https://www.reservatuscanchas.cl/?ciudad=Los%20Ángeles&complejo=MagnaSports` |

## 🎉 **¡Listo para Probar!**

Usa la URL de tu móvil para verificar que el sistema de URLs con parámetros funcione correctamente en dispositivos móviles antes de implementarlo en producción.

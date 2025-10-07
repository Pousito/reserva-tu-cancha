# 🔧 Configuración PostgreSQL en Desarrollo

## 📋 **CONFIGURACIÓN CORRECTA PARA DESARROLLO LOCAL**

### ✅ **Archivo de Configuración:**
- **Usar:** `.env` (archivo principal)
- **NO usar:** `env.postgresql` (tiene credenciales incorrectas)

### 🔑 **Credenciales Correctas (Desarrollo):**
```bash
DATABASE_URL=postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable
```

**Decodificado:**
- **Usuario:** `postgres`
- **Contraseña:** `Ignacio1234*#` (en URL: `Ignacio1234%2A%23`)
- **Host:** `localhost`
- **Puerto:** `5432`
- **Base de datos:** `reserva_tu_cancha_local`
- **SSL:** Deshabilitado (`sslmode=disable`)

---

## 🚀 **Cómo Ejecutar el Servidor en Desarrollo:**

### **Comando Correcto:**
```bash
npm start
```

**NO usar:**
- ❌ `npm run dev-postgresql` (usa env.postgresql incorrecto)
- ✅ `npm start` (usa .env correcto)

---

## 🔧 **Configuración en server.js:**

```javascript
// Configuración de entorno - desarrollo vs producción
if (process.env.NODE_ENV === 'production') {
  // En producción, usar variables de entorno de Render
  require('dotenv').config();
} else {
  // En desarrollo, usar archivo .env
  require('dotenv').config();
}
```

---

## 📊 **Configuración de Database Manager:**

### **SSL Configuración:**
- **Desarrollo:** Sin SSL (PostgreSQL local)
- **Producción:** Con SSL (Neon)

```javascript
// src/config/database.js
async connectPostgreSQL() {
  try {
    const poolConfig = {};
    
    // Opción 1: Variables separadas (recomendado para desarrollo)
    if (process.env.DB_HOST) {
      poolConfig.host = process.env.DB_HOST;
      poolConfig.port = process.env.DB_PORT || 5432;
      poolConfig.database = process.env.DB_NAME;
      poolConfig.user = process.env.DB_USER;
      // Solo agregar password si está definida
      if (process.env.DB_PASSWORD) {
        poolConfig.password = process.env.DB_PASSWORD;
      }
      console.log('🔧 Usando configuración con variables separadas');
      console.log('👤 Usuario:', poolConfig.user, '| Host:', poolConfig.host);
    }
    // Opción 2: DATABASE_URL (para producción)
    else if (this.databaseUrl) {
      poolConfig.connectionString = this.databaseUrl;
      // Solo usar SSL en producción
      if (this.isProduction) {
        poolConfig.ssl = {
          rejectUnauthorized: false
        };
      }
      console.log('🔧 Usando DATABASE_URL');
    }
    
    this.pgPool = new Pool(poolConfig);
    // ... resto del código
  }
}
```

---

## 🐘 **PostgreSQL en Mac:**

### **Instalación:**
- **App:** Postgres.app
- **Ubicación:** `/Applications/Postgres.app`
- **Comando psql:** `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`

### **Verificar Estado:**
```bash
# Verificar si PostgreSQL está corriendo
pg_isready -h localhost -p 5432

# Ver proceso
ps aux | grep postgres | grep -v grep

# Abrir Postgres.app
open -a Postgres
```

### **Usuario PostgreSQL:**
- **Usuario sistema:** `pousito` (usuario de Mac)
- **Usuario app:** `postgres` (para la aplicación)
- **Contraseña:** `Ignacio1234*#`

---

## ✅ **Estado del Servidor en Desarrollo:**

### **Salida Correcta:**
```bash
📧 Configuración de email: {
  host: 'smtp.zoho.com',
  port: 587,
  user: 'Configurado',
  pass: 'Configurado'
}
✅ Servicio de email configurado correctamente
🔌 CONECTANDO A BASE DE DATOS
==============================
🌍 Entorno: development
📊 Base de datos: PostgreSQL (unificado)
🔗 DATABASE_URL: Configurado
🔧 Usando DATABASE_URL
✅ PostgreSQL conectado exitosamente
🕐 Zona horaria configurada a America/Santiago
✅ Tablas PostgreSQL creadas/verificadas exitosamente
✅ Conexión a base de datos establecida
🔒 Sistema de reservas atómicas inicializado
📊 Sistema de reportes inicializado
✅ Base de datos ya tiene 1 ciudades y 13 reservas
✅ Base de datos inicializada exitosamente
✅ Conexión email verificada exitosamente
```

### **Datos en Base de Datos:**
- **Ciudades:** 1
- **Reservas:** 13

---

## 🚨 **Problemas Comunes y Soluciones:**

### **Error: "password authentication failed"**
**Causa:** Usando `env.postgresql` en lugar de `.env`  
**Solución:** 
```bash
# En server.js, asegurar que usa .env
require('dotenv').config(); // ✅ Correcto
# NO: require('dotenv').config({ path: './env.postgresql' }); // ❌
```

### **Error: "The server does not support SSL connections"**
**Causa:** Intentando usar SSL con PostgreSQL local  
**Solución:** La configuración actual ya maneja esto - SSL solo en producción

### **Error: "client password must be a string"**
**Causa:** Contraseña vacía o mal codificada  
**Solución:** Usar DATABASE_URL completa del archivo `.env`

---

## 📝 **Archivos de Configuración:**

### **`.env` (CORRECTO - usar este):**
```bash
DATABASE_URL=postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable
```

### **`env.postgresql` (INCORRECTO - no usar):**
```bash
# PostgreSQL Local (Postgres.app)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reserva_tu_cancha_local
DB_USER=pousito  # ❌ Usuario incorrecto
DB_PASSWORD=     # ❌ Contraseña vacía
```

---

## 🎯 **Checklist para Iniciar Desarrollo:**

- [x] PostgreSQL instalado (Postgres.app)
- [x] PostgreSQL corriendo en puerto 5432
- [x] Base de datos `reserva_tu_cancha_local` creada
- [x] Archivo `.env` con DATABASE_URL correcto
- [x] Ejecutar `npm start` (no `npm run dev-postgresql`)
- [x] Verificar conexión en http://localhost:3000
- [x] Verificar logs: "✅ PostgreSQL conectado exitosamente"

---

## 🔗 **URLs Importantes:**

- **Desarrollo:** http://localhost:3000
- **Admin:** http://localhost:3000/admin-login.html
- **Producción:** https://www.reservatuscanchas.cl

---

**📅 Última actualización:** 7 de octubre de 2025  
**👤 Creado por:** Asistente IA  
**🎯 Propósito:** Documentar configuración correcta de PostgreSQL en desarrollo


# 📚 Documentación de API - Reserva Tu Cancha

## 🎯 Información General

**Base URL:** `https://reserva-tu-cancha.onrender.com`  
**Versión:** 1.0.0  
**Formato:** JSON  
**Autenticación:** JWT Bearer Token

---

## 🔐 Autenticación

### Headers Requeridos
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Obtener Token
```http
POST /api/login
```

---

## 🏢 Gestión de Complejos

### Obtener Complejos por Ciudad
```http
GET /api/complejos?ciudad={ciudad_id}
```

**Parámetros:**
- `ciudad_id` (query, required): ID de la ciudad

**Respuesta:**
```json
{
  "success": true,
  "complejos": [
    {
      "id": 1,
      "nombre": "Complejo Demo 1",
      "direccion": "Av. Principal 123",
      "telefono": "+56912345678",
      "ciudad_id": 1,
      "ciudad_nombre": "Santiago"
    }
  ]
}
```

### Obtener Canchas de un Complejo
```http
GET /api/canchas/{complejo_id}?fecha={YYYY-MM-DD}&hora={HH:MM}
```

**Parámetros:**
- `complejo_id` (path, required): ID del complejo
- `fecha` (query, optional): Fecha en formato YYYY-MM-DD
- `hora` (query, optional): Hora en formato HH:MM

**Respuesta:**
```json
{
  "success": true,
  "canchas": [
    {
      "id": 1,
      "nombre": "Cancha 1",
      "tipo": "futbol",
      "precio": 25000,
      "disponible": true,
      "promocion_activa": false,
      "precio_promocional": null
    }
  ]
}
```

---

## 📅 Gestión de Reservas

### Crear Reserva
```http
POST /api/reservas
```

**Body:**
```json
{
  "cancha_id": 1,
  "fecha": "2024-01-15",
  "hora_inicio": "10:00",
  "hora_fin": "11:00",
  "nombre_cliente": "Juan Pérez",
  "telefono": "+56912345678",
  "email": "juan@email.com"
}
```

**Respuesta:**
```json
{
  "success": true,
  "reserva": {
    "id": 123,
    "codigo_reserva": "RES-2024-001",
    "cancha_id": 1,
    "fecha": "2024-01-15",
    "hora_inicio": "10:00",
    "hora_fin": "11:00",
    "precio_total": 25000,
    "estado": "pendiente"
  }
}
```

### Obtener Reservas del Usuario
```http
GET /api/reservas/usuario
```

**Headers:** `Authorization: Bearer <token>`

**Respuesta:**
```json
{
  "success": true,
  "reservas": [
    {
      "id": 123,
      "codigo_reserva": "RES-2024-001",
      "cancha_nombre": "Cancha 1",
      "complejo_nombre": "Complejo Demo 1",
      "fecha": "2024-01-15",
      "hora_inicio": "10:00",
      "hora_fin": "11:00",
      "precio_total": 25000,
      "estado": "confirmada"
    }
  ]
}
```

### Cancelar Reserva
```http
PUT /api/reservas/{reserva_id}/cancelar
```

**Parámetros:**
- `reserva_id` (path, required): ID de la reserva

**Respuesta:**
```json
{
  "success": true,
  "message": "Reserva cancelada exitosamente"
}
```

---

## 💳 Sistema de Pagos

### Iniciar Pago
```http
POST /api/pagos/iniciar
```

**Body:**
```json
{
  "reserva_id": 123,
  "monto": 25000,
  "return_url": "https://reserva-tu-cancha.onrender.com/pago-exitoso"
}
```

**Respuesta:**
```json
{
  "success": true,
  "token": "01ab2345cd6789ef",
  "url": "https://webpay3g.transbank.cl/rswebpaytransaction/api/webpay/v1.2/transactions"
}
```

### Confirmar Pago
```http
POST /api/pagos/confirmar
```

**Body:**
```json
{
  "token": "01ab2345cd6789ef"
}
```

**Respuesta:**
```json
{
  "success": true,
  "estado": "AUTHORIZED",
  "reserva_id": 123,
  "monto": 25000
}
```

---

## 👥 Gestión de Usuarios

### Registro de Usuario
```http
POST /api/usuarios/registro
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "password": "password123",
  "telefono": "+56912345678"
}
```

**Respuesta:**
```json
{
  "success": true,
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "rol": "cliente"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login de Usuario
```http
POST /api/login
```

**Body:**
```json
{
  "email": "juan@email.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "usuario": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@email.com",
    "rol": "cliente"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🏢 Panel de Administración

### Obtener Todas las Reservas
```http
GET /api/admin/reservas
```

**Headers:** `Authorization: Bearer <admin_token>`

**Respuesta:**
```json
{
  "success": true,
  "reservas": [
    {
      "id": 123,
      "codigo_reserva": "RES-2024-001",
      "cancha_nombre": "Cancha 1",
      "complejo_nombre": "Complejo Demo 1",
      "ciudad_nombre": "Santiago",
      "fecha": "2024-01-15",
      "hora_inicio": "10:00",
      "hora_fin": "11:00",
      "precio_total": 25000,
      "estado": "confirmada",
      "nombre_cliente": "Juan Pérez",
      "telefono": "+56912345678",
      "email": "juan@email.com"
    }
  ]
}
```

### Actualizar Estado de Reserva
```http
PUT /api/admin/reservas/{reserva_id}/estado
```

**Body:**
```json
{
  "estado": "confirmada"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Estado de reserva actualizado"
}
```

---

## 📊 Reportes y Analytics

### Obtener Reportes de Ventas
```http
GET /api/admin/reportes/ventas?fecha_inicio={YYYY-MM-DD}&fecha_fin={YYYY-MM-DD}
```

**Parámetros:**
- `fecha_inicio` (query, required): Fecha de inicio
- `fecha_fin` (query, required): Fecha de fin

**Respuesta:**
```json
{
  "success": true,
  "reporte": {
    "total_ventas": 1500000,
    "total_reservas": 60,
    "promedio_por_reserva": 25000,
    "reservas_por_estado": {
      "confirmadas": 45,
      "pendientes": 10,
      "canceladas": 5
    }
  }
}
```

---

## 🔧 Sistema de Monitoreo

### Health Check
```http
GET /api/monitoring/health
```

**Respuesta:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "memory_usage": "45%",
  "uptime": "2d 5h 30m"
}
```

### Métricas de Rendimiento
```http
GET /api/monitoring/metrics
```

**Respuesta:**
```json
{
  "success": true,
  "metrics": {
    "api_response_time": 120,
    "database_queries": 45,
    "active_users": 12,
    "reservations_today": 8
  }
}
```

---

## 📧 Sistema de Notificaciones

### Enviar Email de Confirmación
```http
POST /api/send-confirmation-email
```

**Body:**
```json
{
  "codigo_reserva": "RES-2024-001",
  "email": "juan@email.com",
  "nombre_cliente": "Juan Pérez",
  "fecha": "2024-01-15",
  "hora": "10:00",
  "cancha": "Cancha 1",
  "complejo": "Complejo Demo 1"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Email enviado exitosamente"
}
```

---

## 🚨 Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos para la acción |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: reserva ya existe) |
| 422 | Unprocessable Entity - Datos no procesables |
| 429 | Too Many Requests - Límite de rate limiting |
| 500 | Internal Server Error - Error del servidor |

---

## 📝 Ejemplos de Uso

### Flujo Completo de Reserva

1. **Obtener complejos disponibles:**
```bash
curl -X GET "https://reserva-tu-cancha.onrender.com/api/complejos?ciudad=1"
```

2. **Obtener canchas disponibles:**
```bash
curl -X GET "https://reserva-tu-cancha.onrender.com/api/canchas/1?fecha=2024-01-15&hora=10:00"
```

3. **Crear reserva:**
```bash
curl -X POST "https://reserva-tu-cancha.onrender.com/api/reservas" \
  -H "Content-Type: application/json" \
  -d '{
    "cancha_id": 1,
    "fecha": "2024-01-15",
    "hora_inicio": "10:00",
    "hora_fin": "11:00",
    "nombre_cliente": "Juan Pérez",
    "telefono": "+56912345678",
    "email": "juan@email.com"
  }'
```

4. **Iniciar pago:**
```bash
curl -X POST "https://reserva-tu-cancha.onrender.com/api/pagos/iniciar" \
  -H "Content-Type: application/json" \
  -d '{
    "reserva_id": 123,
    "monto": 25000,
    "return_url": "https://reserva-tu-cancha.onrender.com/pago-exitoso"
  }'
```

---

## 🔄 Rate Limiting

- **Autenticación:** 5 intentos por minuto
- **API General:** 100 requests por minuto
- **Reservas:** 10 requests por minuto
- **Pagos:** 5 requests por minuto

---

## 📞 Soporte

Para soporte técnico o consultas sobre la API, contactar a:
- **Email:** soporte@reserva-tu-cancha.com
- **Documentación:** https://reserva-tu-cancha.onrender.com/docs
- **Status:** https://reserva-tu-cancha.onrender.com/api/monitoring/health

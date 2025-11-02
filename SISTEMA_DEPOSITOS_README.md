# 💰 Sistema de Gestión de Depósitos a Complejos

## 📋 Resumen Ejecutivo

Sistema completo para gestionar depósitos diarios a complejos deportivos con cálculo automático de comisiones + IVA. Permite control total sobre los pagos que se deben realizar a cada complejo después de descontar las comisiones de la plataforma.

---

## 🎯 Características Principales

### ✅ **Cálculo Automático de Comisiones**
- **Reservas Web**: 3.5% + IVA (19%)
- **Reservas Admin**: 1.75% + IVA (19%)
- Cálculo automático del IVA sobre la comisión
- Desglose detallado: comisión sin IVA + IVA = comisión total

### ✅ **Panel de Super Admin**
- Dashboard con estadísticas en tiempo real
- Lista de depósitos pendientes y pagados
- Filtros por complejo, fecha y estado
- Funcionalidad de marcar como pagado
- Exportación a Excel/CSV

### ✅ **Generación Automática**
- Script para generar depósitos diarios
- Función SQL para cálculos complejos
- Cron job para ejecución automática a las 23:59
- Prevención de duplicados

### ✅ **Control y Auditoría**
- Registro de quién procesó cada depósito
- Fecha y hora de procesamiento
- Detalles del método de pago
- Observaciones y notas

---

## 🗄️ Estructura de Base de Datos

### Tabla: `depositos_complejos`

```sql
CREATE TABLE depositos_complejos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id),
    fecha_deposito DATE NOT NULL,
    
    -- Montos calculados
    monto_total_reservas INTEGER NOT NULL,
    comision_porcentaje DECIMAL(5,4) NOT NULL,
    comision_sin_iva INTEGER NOT NULL,
    iva_comision INTEGER NOT NULL,
    comision_total INTEGER NOT NULL,
    monto_a_depositar INTEGER NOT NULL,
    
    -- Control de estado
    estado VARCHAR(20) DEFAULT 'pendiente',
    
    -- Detalles del pago
    metodo_pago VARCHAR(50),
    numero_transaccion VARCHAR(100),
    banco_destino VARCHAR(100),
    observaciones TEXT,
    
    -- Auditoría
    procesado_por INTEGER REFERENCES usuarios(id),
    fecha_procesado TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(complejo_id, fecha_deposito)
);
```

### Funciones SQL Creadas

1. **`calcular_comision_con_iva()`**: Calcula comisiones con IVA incluido
2. **`generar_depositos_diarios()`**: Genera depósitos para una fecha específica

---

## 🚀 Instalación

### 1. Crear Tabla y Funciones

```bash
cd /ruta/al/proyecto
node scripts/crear-tabla-depositos.js
```

### 2. Configurar Cron Job (Opcional)

```bash
# Editar crontab
crontab -e

# Agregar línea para ejecutar diariamente a las 23:59
59 23 * * * cd /ruta/al/proyecto && node scripts/generar-depositos-diarios.js
```

### 3. Acceder al Panel

1. Iniciar sesión como super admin
2. Ir a "Gestión de Depósitos" en el sidebar
3. Generar depósitos para fechas anteriores si es necesario

---

## 🔌 API Endpoints

### Base: `/api/admin/depositos`

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | `/` | Obtener todos los depósitos | super_admin |
| POST | `/generar` | Generar depósitos para una fecha | super_admin |
| PUT | `/:id/pagar` | Marcar depósito como pagado | super_admin |
| GET | `/exportar` | Exportar depósitos a CSV | super_admin |
| GET | `/estadisticas` | Obtener estadísticas | super_admin |

### Ejemplos de Uso

#### Generar Depósitos para Hoy
```javascript
POST /api/admin/depositos/generar
{
  "fecha": "2024-01-15"
}
```

#### Marcar como Pagado
```javascript
PUT /api/admin/depositos/123/pagar
{
  "metodo_pago": "transferencia",
  "numero_transaccion": "TRF123456",
  "banco_destino": "Banco de Chile",
  "observaciones": "Transferencia realizada"
}
```

---

## 📊 Flujo de Trabajo

### 1. **Generación Diaria (23:59)**
```
Reservas Confirmadas del Día
         ↓
Calcular Comisiones por Tipo
         ↓
Aplicar IVA (19%)
         ↓
Crear Registros de Depósito
         ↓
Marcar como "Pendiente"
```

### 2. **Procesamiento Manual**
```
Super Admin Revisa Depósitos
         ↓
Realiza Transferencia/Cheque
         ↓
Marca como "Pagado"
         ↓
Registra Detalles del Pago
```

### 3. **Seguimiento**
```
Dashboard con Estadísticas
         ↓
Filtros por Fecha/Complejo
         ↓
Exportación para Contabilidad
         ↓
Historial Completo
```

---

## 💡 Casos de Uso

### **Caso 1: Depósito Diario Normal**
1. A las 23:59 se ejecuta el cron job
2. Se calculan comisiones de reservas confirmadas
3. Se crean registros de depósito pendientes
4. Super admin revisa y procesa pagos

### **Caso 2: Depósito Retroactivo**
1. Super admin va a "Gestión de Depósitos"
2. Clic en "Generar Depósitos Hoy"
3. Se procesan reservas de fechas anteriores
4. Se crean depósitos pendientes

### **Caso 3: Marcar como Pagado**
1. Super admin ve lista de depósitos pendientes
2. Clic en "Marcar como Pagado"
3. Completa formulario con detalles del pago
4. Confirma y se actualiza el estado

---

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Base de datos
DATABASE_URL=postgresql://user:pass@host:port/database

# Configuración de comisiones (en código)
COMMISSIONS = {
    directa: { percentage: 0.035 },      // 3.5%
    administrativa: { percentage: 0.0175 } // 1.75%
}
IVA_RATE = 0.19  // 19%
```

### Personalización de Comisiones

Para cambiar las comisiones, editar `/src/config/commissions.js`:

```javascript
const COMMISSIONS = {
    directa: {
        percentage: 0.035,  // Cambiar aquí
        description: 'Reserva directa desde la plataforma web (3.5% + IVA)'
    },
    administrativa: {
        percentage: 0.0175,  // Cambiar aquí
        description: 'Reserva creada por administrador (1.75% + IVA)'
    }
};
```

---

## 📁 Archivos Creados

### Frontend
```
/public/
├── admin-depositos.html    # Página principal
└── admin-depositos.js      # Lógica JavaScript
```

### Backend
```
/server.js                  # Endpoints agregados
/src/config/
└── commissions.js          # Actualizado con IVA
```

### Scripts
```
/scripts/
├── sql/crear-tabla-depositos-complejos.sql
├── crear-tabla-depositos.js
└── generar-depositos-diarios.js
```

### Documentación
```
/SISTEMA_DEPOSITOS_README.md
```

---

## 🚨 Consideraciones Importantes

### **Seguridad**
- Solo super admins pueden acceder
- Autenticación JWT requerida
- Validación de permisos en cada endpoint

### **Performance**
- Índices creados para consultas rápidas
- Función SQL optimizada para cálculos
- Paginación en listados grandes

### **Auditoría**
- Registro de quién procesó cada depósito
- Timestamps de creación y actualización
- Historial completo de cambios

### **Escalabilidad**
- Diseño preparado para múltiples complejos
- Función SQL reutilizable
- Estructura normalizada

---

## 🎉 ¡Sistema Listo!

El sistema de gestión de depósitos está **100% funcional** y listo para usar. Solo necesitas:

1. ✅ Ejecutar el script de instalación
2. ✅ Configurar el cron job (opcional)
3. ✅ Acceder al panel de super admin
4. ✅ Comenzar a gestionar depósitos

**¡Ya puedes controlar completamente los pagos a tus complejos!** 🚀



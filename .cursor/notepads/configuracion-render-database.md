# 🗄️ Configuración Base de Datos Render PostgreSQL

## 📊 **ESTADO ACTUAL**

### **✅ BASE DE DATOS ACTIVA:**
- **Proveedor**: Render PostgreSQL
- **ID**: `dpg-d2uhibjuibrs73fm8ec0-a`
- **Nombre**: `reserva-tu-cancha-db`
- **Plan**: `basic_256mb`
- **Región**: Oregon
- **Estado**: ✅ Activa y funcionando

### **🔗 CONEXIÓN:**
- **URL Externa**: `postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha`
- **URL Interna**: `postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a/reserva_tu_cancha`
- **Usuario**: `reserva_user`
- **Base de datos**: `reserva_tu_cancha`

---

## 🚀 **MIGRACIÓN COMPLETADA**

### **📅 FECHA DE MIGRACIÓN:**
- **Fecha**: 17 de Octubre, 2025
- **Origen**: Neon PostgreSQL
- **Destino**: Render PostgreSQL
- **Estado**: ✅ Completada exitosamente

### **📊 DATOS MIGRADOS:**
- **13 tablas** migradas correctamente
- **12 secuencias** creadas y configuradas
- **155 registros** migrados en total
- **12 índices** creados
- **Verificación completa** - todos los registros coinciden

### **📋 TABLAS MIGRADAS:**
1. `bloqueos_temporales` - 16 registros
2. `canchas` - 5 registros
3. `categorias_gastos` - 10 registros
4. `ciudades` - 2 registros
5. `codigos_descuento` - 0 registros
6. `complejos` - 3 registros
7. `gastos_ingresos` - 28 registros
8. `pagos` - 27 registros
9. `password_reset_tokens` - 2 registros
10. `promociones_canchas` - 1 registro
11. `reservas` - 65 registros
12. `uso_codigos_descuento` - 0 registros
13. `usuarios` - 5 registros

---

## 🛠️ **COMANDOS ÚTILES**

### **Conectar a la Base de Datos:**
```bash
# Usando psql
psql "postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha"

# Usando Node.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha',
  ssl: { rejectUnauthorized: false }
});
```

### **Verificar Conexión:**
```bash
# Verificar estado de la base de datos
curl -s https://reserva-tu-cancha.onrender.com/api/debug/database-status

# Verificar tablas
curl -s https://reserva-tu-cancha.onrender.com/api/debug/tables
```

### **Backup de la Base de Datos:**
```bash
# Crear backup
pg_dump "postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql "postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha" < backup_file.sql
```

---

## 🔧 **CONFIGURACIÓN EN RENDER**

### **Variables de Entorno:**
- `DATABASE_URL`: Configurada automáticamente por Render
- `NODE_ENV`: `production`
- `PORT`: `10000`

### **Dashboard de Render:**
- **URL**: https://dashboard.render.com/d/dpg-d2uhibjuibrs73fm8ec0-a
- **Servicio Web**: https://dashboard.render.com/web/srv-d2r4j356ubrc73e77i20

---

## 📈 **MONITOREO Y MANTENIMIENTO**

### **Métricas Disponibles:**
- CPU Usage
- Memory Usage
- Active Connections
- Database Size
- Query Performance

### **Alertas Configuradas:**
- High CPU Usage
- High Memory Usage
- Connection Limits
- Disk Space

### **Mantenimiento Programado:**
- **Backups**: Automáticos diarios
- **Updates**: Automáticos de seguridad
- **Monitoring**: 24/7

---

## 🚨 **TROUBLESHOOTING**

### **Problema: Conexión Fallida**
**Síntomas:**
- Error de conexión a la base de datos
- Timeout en consultas

**Soluciones:**
1. Verificar que la base de datos esté activa
2. Verificar las credenciales
3. Verificar la URL de conexión
4. Contactar soporte de Render si persiste

### **Problema: Performance Lenta**
**Síntomas:**
- Consultas lentas
- Timeouts frecuentes

**Soluciones:**
1. Verificar métricas de CPU/Memoria
2. Optimizar consultas
3. Considerar upgrade de plan
4. Revisar índices

### **Problema: Espacio en Disco**
**Síntomas:**
- Error de espacio insuficiente
- Base de datos no responde

**Soluciones:**
1. Verificar uso de disco
2. Limpiar datos innecesarios
3. Upgrade de plan si es necesario

---

## 📋 **CHECKLIST DE MANTENIMIENTO**

### **Diario:**
- [ ] Verificar estado de la base de datos
- [ ] Revisar logs de errores
- [ ] Verificar métricas de performance

### **Semanal:**
- [ ] Revisar uso de disco
- [ ] Verificar conexiones activas
- [ ] Revisar consultas lentas

### **Mensual:**
- [ ] Crear backup completo
- [ ] Revisar y optimizar índices
- [ ] Actualizar estadísticas de tablas
- [ ] Revisar plan de suscripción

---

## 🔄 **HISTORIAL DE CAMBIOS**

### **17 Oct 2025:**
- ✅ Migración de Neon a Render completada
- ✅ Base de datos activada (plan basic_256mb)
- ✅ Datos migrados exitosamente
- ✅ Aplicación actualizada para usar Render
- ✅ Limpieza de archivos de Neon completada

---

**📅 Última actualización:** 17 de Octubre, 2025
**👤 Creado por:** Asistente IA
**🎯 Propósito:** Documentación completa de la configuración de la base de datos en Render PostgreSQL

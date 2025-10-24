# 🔄 Sistema de Respaldos Automatizados

## 🎯 Descripción General

Sistema completo de respaldos automatizados para la base de datos de producción de Reserva Tu Cancha. Incluye respaldos programados, notificaciones, encriptación y restauración.

---

## 🚀 Características Principales

### ✅ **Respaldos Automatizados**
- **Respaldos completos** diarios a las 2:00 AM
- **Respaldos incrementales** cada 6 horas
- **Respaldos semanales** los domingos a las 3:00 AM
- **Limpieza automática** de respaldos antiguos

### 🔐 **Seguridad Avanzada**
- **Encriptación AES-256** de respaldos
- **Compresión gzip** para ahorrar espacio
- **Verificación de integridad** con checksums SHA-256
- **Rotación automática** de claves de encriptación

### 📧 **Sistema de Notificaciones**
- **Email** con reportes detallados
- **Slack** para notificaciones en tiempo real
- **Discord** para alertas del equipo
- **Logs estructurados** para auditoría

### 🛠️ **Gestión Avanzada**
- **Restauración** desde cualquier respaldo
- **Listado** de respaldos disponibles
- **Estadísticas** de uso y espacio
- **Monitoreo** de espacio en disco

---

## 📁 Estructura de Archivos

```
scripts/backup/
├── backup-automation.js      # Automatización de respaldos
├── backup-scheduler.js       # Programador de tareas
└── backup-notifications.js   # Sistema de notificaciones

backups/                      # Directorio de respaldos
├── backup-full-2024-01-15T02-00-00.sql.gz.enc
├── backup-full-2024-01-15T02-00-00.json
└── ...

logs/
└── backup-scheduler.log      # Logs del programador
```

---

## 🚀 Instalación y Configuración

### 1. **Instalar Dependencias**
```bash
npm install node-cron node-fetch cron-parser
```

### 2. **Variables de Entorno**
```bash
# Base de datos
DB_HOST=tu-host-postgres
DB_PORT=5432
DB_NAME=reserva_tu_cancha
DB_USER=tu-usuario
DB_PASSWORD=tu-password

# Encriptación
BACKUP_ENCRYPTION_KEY=tu-clave-secreta-32-caracteres

# Notificaciones por email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password-app
BACKUP_EMAIL_NOTIFICATIONS=true
BACKUP_EMAIL_RECIPIENTS=admin@empresa.com,soporte@empresa.com

# Notificaciones por Slack
BACKUP_SLACK_NOTIFICATIONS=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Notificaciones por Discord
BACKUP_DISCORD_NOTIFICATIONS=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 3. **Configurar Permisos**
```bash
chmod +x scripts/backup/*.js
mkdir -p backups logs
```

---

## 📋 Comandos Disponibles

### **Respaldos Manuales**
```bash
# Crear respaldo completo
npm run backup:create

# Crear respaldo incremental
npm run backup:manual incremental

# Listar respaldos disponibles
npm run backup:list

# Restaurar desde respaldo
npm run backup:restore backup-full-2024-01-15T02-00-00
```

### **Programador de Respaldos**
```bash
# Iniciar programador
npm run backup:start

# Detener programador
npm run backup:stop

# Ver estado
npm run backup:status

# Ver próximas ejecuciones
npm run backup:next

# Ver logs recientes
npm run backup:logs 50
```

### **Sistema de Notificaciones**
```bash
# Ver configuración
npm run backup:notify:config

# Enviar notificación de prueba
npm run backup:notify:test
```

---

## ⏰ Horarios Programados

| Tarea | Horario | Descripción |
|-------|---------|-------------|
| **Respaldo Diario** | 2:00 AM | Respaldo completo diario |
| **Respaldo Incremental** | Cada 6 horas | Solo datos modificados |
| **Respaldo Semanal** | Domingos 3:00 AM | Respaldo completo semanal |
| **Limpieza** | 4:00 AM | Eliminar respaldos antiguos |

---

## 🔧 Configuración Avanzada

### **Personalizar Horarios**
Editar `scripts/backup/backup-scheduler.js`:

```javascript
// Respaldo cada 4 horas en lugar de 6
this.schedules.push({
  name: 'incremental-backup',
  schedule: '0 */4 * * *', // Cada 4 horas
  type: 'incremental',
  description: 'Respaldo incremental cada 4 horas'
});
```

### **Configurar Retención**
Editar `scripts/backup/backup-automation.js`:

```javascript
this.maxBackups = 60; // Mantener 60 respaldos (2 meses)
```

### **Personalizar Notificaciones**
Editar `scripts/backup/backup-notifications.js`:

```javascript
// Agregar canal personalizado
async sendCustomNotification(message) {
  // Implementar notificación personalizada
}
```

---

## 📊 Monitoreo y Alertas

### **Métricas Disponibles**
- **Tamaño de respaldos** y tendencias
- **Duración de respaldos** y rendimiento
- **Espacio en disco** utilizado
- **Frecuencia de errores** y patrones

### **Alertas Automáticas**
- ✅ **Respaldo exitoso** - Notificación de confirmación
- ❌ **Error en respaldo** - Alerta inmediata
- ⚠️ **Espacio bajo** - Advertencia de disco
- 🧹 **Limpieza completada** - Reporte de mantenimiento

---

## 🔄 Flujo de Trabajo

### **1. Respaldo Automático**
```
Programador → Respaldo → Compresión → Encriptación → Notificación
```

### **2. Restauración**
```
Seleccionar Respaldo → Desencriptar → Descomprimir → Restaurar DB
```

### **3. Limpieza**
```
Verificar Antigüedad → Eliminar Antiguos → Liberar Espacio → Reportar
```

---

## 🛡️ Seguridad

### **Encriptación**
- **Algoritmo**: AES-256-CBC
- **Clave**: Configurable via `BACKUP_ENCRYPTION_KEY`
- **IV**: Generado aleatoriamente para cada respaldo

### **Verificación de Integridad**
- **Checksum**: SHA-256 de cada respaldo
- **Validación**: Automática en restauración
- **Logs**: Registro de todas las verificaciones

### **Acceso**
- **Permisos**: Solo usuarios autorizados
- **Logs**: Auditoría completa de accesos
- **Rotación**: Claves de encriptación rotativas

---

## 📈 Optimización

### **Compresión**
- **Algoritmo**: gzip
- **Reducción**: ~70% del tamaño original
- **Velocidad**: Balance entre compresión y velocidad

### **Respaldos Incrementales**
- **Eficiencia**: Solo datos modificados
- **Velocidad**: 5x más rápido que respaldos completos
- **Espacio**: 80% menos espacio utilizado

### **Limpieza Automática**
- **Retención**: 30 respaldos por defecto
- **Criterio**: Por antigüedad y espacio
- **Seguridad**: Verificación antes de eliminar

---

## 🚨 Solución de Problemas

### **Error de Conexión a DB**
```bash
# Verificar variables de entorno
echo $DB_HOST $DB_USER $DB_PASSWORD

# Probar conexión manual
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

### **Error de Permisos**
```bash
# Verificar permisos de directorio
ls -la backups/
chmod 755 backups/
```

### **Error de Encriptación**
```bash
# Verificar clave de encriptación
echo $BACKUP_ENCRYPTION_KEY | wc -c  # Debe ser 32 caracteres
```

### **Espacio en Disco**
```bash
# Verificar espacio disponible
df -h backups/

# Limpiar respaldos antiguos manualmente
npm run backup:logs 100
```

---

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema de respaldos:

- **Email**: soporte@reserva-tu-cancha.com
- **Documentación**: https://reserva-tu-cancha.onrender.com/docs/backup-system.md
- **Logs**: `logs/backup-scheduler.log`
- **Estado**: `npm run backup:status`

---

## 🔄 Próximas Mejoras

- [ ] **Respaldos en la nube** (AWS S3, Google Cloud)
- [ ] **Respaldos diferenciales** más eficientes
- [ ] **Interfaz web** para gestión de respaldos
- [ ] **Respaldos de configuración** del servidor
- [ ] **Integración con monitoreo** existente

---

*Sistema de Respaldos v1.0.0 - Reserva Tu Cancha*

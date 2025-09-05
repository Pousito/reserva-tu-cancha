# 📁 Estructura del Proyecto ReservaTuCancha

## 🏗️ Nueva Arquitectura

El proyecto ha sido reorganizado siguiendo las mejores prácticas de desarrollo para mejorar la mantenibilidad, escalabilidad y colaboración.

## 📂 Estructura de Carpetas

```
ReservaTuCancha/
├── 📁 src/                          # Código fuente principal
│   ├── 📁 controllers/              # Controladores de rutas
│   │   ├── authController.js        # Autenticación y autorización
│   │   ├── reservationController.js # Lógica de reservas
│   │   └── adminController.js       # Panel de administración
│   ├── 📁 models/                   # Modelos de datos (futuro)
│   ├── 📁 routes/                   # Definición de rutas
│   │   ├── auth.js                  # Rutas de autenticación
│   │   ├── reservations.js          # Rutas de reservas
│   │   └── admin.js                 # Rutas de administración
│   ├── 📁 middleware/               # Middleware personalizado
│   │   └── security.js              # Seguridad y rate limiting
│   ├── 📁 services/                 # Lógica de negocio (futuro)
│   ├── 📁 utils/                    # Utilidades
│   │   └── logger.js                # Sistema de logging
│   ├── 📁 config/                   # Configuración
│   │   ├── config.js                # Configuración centralizada
│   │   └── database.js              # Configuración de BD
│   └── app.js                       # Aplicación Express principal
├── 📁 public/                       # Frontend organizado
│   ├── 📁 assets/                   # Recursos estáticos
│   │   ├── 📁 css/                  # Hojas de estilo
│   │   ├── 📁 js/                   # JavaScript del frontend
│   │   └── 📁 images/               # Imágenes (futuro)
│   ├── 📁 pages/                    # Páginas organizadas
│   │   ├── 📁 user/                 # Páginas de usuario
│   │   │   └── index.html           # Página principal
│   │   ├── 📁 admin/                # Panel de administración
│   │   │   ├── admin-dashboard.html
│   │   │   ├── admin-reservations.html
│   │   │   └── admin-reports.html
│   │   └── 📁 auth/                 # Autenticación
│   │       └── admin-login.html
│   └── 📁 components/               # Componentes reutilizables (futuro)
├── 📁 scripts/                      # Scripts de utilidad
│   ├── 📁 deployment/               # Scripts de deployment
│   │   ├── auto-deploy.js
│   │   └── deploy_and_populate.js
│   ├── 📁 database/                 # Scripts de BD
│   │   ├── init-db.js
│   │   ├── populate_reservas.js
│   │   └── check_render_status.js
│   └── 📁 maintenance/              # Scripts de mantenimiento
│       ├── debug_*.js
│       ├── test_*.js
│       └── emergency_*.js
├── 📁 tests/                        # Testing (futuro)
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
├── 📁 docs/                         # Documentación
│   ├── STRUCTURE.md                 # Este archivo
│   ├── API.md                       # Documentación de API
│   └── DEPLOYMENT.md                # Guía de deployment
├── 📁 logs/                         # Logs (gitignored)
├── server.js                        # Servidor original (compatibilidad)
├── server-new.js                    # Nuevo servidor refactorizado
├── package.json                     # Dependencias y scripts
├── .gitignore                       # Archivos ignorados por Git
└── README.md                        # Documentación principal
```

## 🔄 Migración Gradual

### Fase 1: Estructura Creada ✅
- [x] Carpetas organizadas
- [x] Archivos movidos a nuevas ubicaciones
- [x] Código refactorizado en módulos

### Fase 2: Testing y Validación 🔄
- [ ] Probar servidor original
- [ ] Probar servidor refactorizado
- [ ] Verificar funcionalidad completa

### Fase 3: Transición Completa 📋
- [ ] Actualizar deployment
- [ ] Migrar a nueva estructura
- [ ] Limpiar archivos antiguos

## 🚀 Comandos Disponibles

### Desarrollo
```bash
# Servidor original (actual)
npm start
npm run dev

# Servidor refactorizado (nuevo)
npm run start:new
npm run dev:new
```

### Deployment
```bash
# Deployment completo
npm run deploy-full

# Solo poblar base de datos
npm run populate-db

# Verificar estado
npm run check-db
```

## 📋 Beneficios de la Nueva Estructura

### ✅ Mantenibilidad
- Código organizado en módulos específicos
- Separación clara de responsabilidades
- Fácil localización de funcionalidades

### ✅ Escalabilidad
- Estructura preparada para crecimiento
- Fácil agregar nuevas funcionalidades
- Separación entre frontend y backend

### ✅ Colaboración
- Estructura estándar para trabajo en equipo
- Código más legible y documentado
- Facilita code reviews

### ✅ Testing
- Estructura preparada para implementar tests
- Separación clara para testing unitario
- Configuración de testing lista

## 🔧 Configuración

### Variables de Entorno
```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de Datos
DB_PATH=./database.sqlite

# Seguridad
JWT_SECRET=tu_jwt_secret_super_seguro
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=*

# Logs
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Archivos de Configuración
- `src/config/config.js` - Configuración centralizada
- `src/config/database.js` - Configuración de base de datos
- `.env` - Variables de entorno (crear desde env.example)

## 🆘 Solución de Problemas

### Si algo no funciona:
1. **Verificar rutas**: Los archivos se movieron, verificar paths
2. **Revisar imports**: Actualizar rutas de importación
3. **Probar servidor original**: `npm start` para verificar compatibilidad
4. **Revisar logs**: Verificar logs en `./logs/app.log`

### Rollback de Emergencia:
```bash
# Volver al estado anterior
git checkout backup-before-reorganization-YYYYMMDD-HHMMSS

# O usar el servidor original
npm start
```

## 📞 Soporte

Para dudas sobre la nueva estructura o problemas de migración, revisar:
1. Este archivo (STRUCTURE.md)
2. Logs de la aplicación
3. Documentación de API
4. Issues en el repositorio

# 📚 Documentación de API - Reserva Tu Cancha (Generada Automáticamente)

## 🎯 Información General

**Base URL:** `https://reserva-tu-cancha.onrender.com`  
**Versión:** 1.0.0  
**Formato:** JSON  
**Autenticación:** JWT Bearer Token  
**Generado:** 2025-10-24T00:15:03.291Z

---

## 📋 Resumen de Rutas

**Total de rutas:** 272

## GET Routes

### /monitoring

**Descripción:** Dashboard de monitoreo

```http
GET /monitoring
```

---

### /health

**Descripción:** Health check

```http
GET /health
```

---

### /api/debug/smtp-connection

**Descripción:** Endpoint para diagnosticar conexión SMTP desde Render

```http
GET /api/debug/smtp-connection
```

---

### /api/debug/test-insert

**Descripción:** Endpoint de prueba simple para insertar una ciudad

```http
GET /api/debug/test-insert
```

---

### /api/debug/insert-all-cities

**Descripción:** Endpoint para insertar todas las ciudades

```http
GET /api/debug/insert-all-cities
```

---

### /test-payment-return

**Descripción:** Ruta de prueba para simular retorno de Transbank en desarrollo

```http
GET /test-payment-return
```

---

### /api/reservas/:codigo

**Descripción:** Endpoint para obtener datos de una reserva específica

```http
GET /api/reservas/:codigo
```

---

### /api/reservas/:codigo/pdf

**Descripción:** Endpoint para generar y descargar comprobante PDF

```http
GET /api/reservas/:codigo/pdf
```

---

### /api/transbank-diagnostic

**Descripción:** Endpoint de diagnóstico para Transbank

```http
GET /api/transbank-diagnostic
```

---

### /api/bloqueos-temporales/:codigo

**Descripción:** Endpoint para obtener datos de un bloqueo temporal

```http
GET /api/bloqueos-temporales/:codigo
```

---

### /api/debug/verificar-superposicion/:canchaId/:fecha/:hora

**Descripción:** Endpoint de debug para verificar lógica de superposición

```http
GET /api/debug/verificar-superposicion/:canchaId/:fecha/:hora
```

---

### /api/disponibilidad-completa/:complejoId/:fecha

**Descripción:** Endpoint optimizado para verificar disponibilidad completa de un complejo

```http
GET /api/disponibilidad-completa/:complejoId/:fecha
```

---

### /api/admin/estadisticas

**Descripción:** Endpoints del panel de administrador

```http
GET /api/admin/estadisticas
```

**Middleware:** RolePermission

---

### /api/admin/reservas-recientes

```http
GET /api/admin/reservas-recientes
```

---

### /api/admin/disponibilidad-baja

**Descripción:** Endpoint para verificar disponibilidad baja

```http
GET /api/admin/disponibilidad-baja
```

---

### /api/admin/kpis

**Descripción:** Endpoint para KPIs avanzados

```http
GET /api/admin/kpis
```

---

### /api/admin/reservas-hoy

```http
GET /api/admin/reservas-hoy
```

---

### /api/debug/timezone

**Descripción:** Endpoint temporal para debuggear zona horaria

```http
GET /api/debug/timezone
```

---

### /api/debug/date-fix

**Descripción:** Endpoint de debug temporal para verificar correcciones de fechas

```http
GET /api/debug/date-fix
```

---

### /api/admin/reservas

**Descripción:** Endpoint para obtener todas las reservas (panel de administración)

```http
GET /api/admin/reservas
```

**Middleware:** RolePermission

---

### /api/admin/complejos

**Descripción:** Endpoint para obtener complejos (panel de administración)

```http
GET /api/admin/complejos
```

**Middleware:** RolePermission

---

### /api/admin/canchas

**Descripción:** Endpoint para obtener canchas (panel de administración)

```http
GET /api/admin/canchas
```

**Middleware:** RolePermission

---

### /api/admin/reports/income/:format

**Descripción:** Endpoint para generar reportes de ingresos en PDF/Excel

```http
GET /api/admin/reports/income/:format
```

**Middleware:** RolePermission

---

### /api/debug/clean-duplicate-complexes

**Descripción:** Endpoint para limpiar complejos duplicados

```http
GET /api/debug/clean-duplicate-complexes
```

---

### /api/debug/check-reservas-structure

**Descripción:** Endpoint para verificar estructura de tabla reservas

```http
GET /api/debug/check-reservas-structure
```

---

### /api/debug/check-blocking-table

**Descripción:** Endpoint para verificar estructura de tabla bloqueos_temporales

```http
GET /api/debug/check-blocking-table
```

---

### /api/debug/check-canchas

**Descripción:** Endpoint para verificar canchas existentes

```http
GET /api/debug/check-canchas
```

---

### /api/debug/insert-test-reservations

**Descripción:** Endpoint para insertar reservas de prueba

```http
GET /api/debug/insert-test-reservations
```

---

### /api/debug/insert-courts

**Descripción:** Endpoint para insertar canchas

```http
GET /api/debug/insert-courts
```

---

### /api/debug/insert-complexes

**Descripción:** Endpoint para insertar complejos

```http
GET /api/debug/insert-complexes
```

---

### /api/debug/force-init

**Descripción:** Endpoint para forzar inicialización de datos

```http
GET /api/debug/force-init
```

---

### /debug/postgresql

**Descripción:** Debug endpoint para verificar PostgreSQL

```http
GET /debug/postgresql
```

---

### /api/ciudades

**Descripción:** Obtener ciudades

```http
GET /api/ciudades
```

---

### /api/complejos/:ciudadId

**Descripción:** Obtener complejos por ciudad

```http
GET /api/complejos/:ciudadId
```

---

### /api/canchas

**Descripción:** Obtener todas las canchas

```http
GET /api/canchas
```

---

### /api/canchas/:complejoId

**Descripción:** Obtener canchas por complejo (con promociones activas)

```http
GET /api/canchas/:complejoId
```

---

### /api/canchas/:complejoId/:tipo

**Descripción:** Obtener canchas por complejo y tipo (con promociones activas)

```http
GET /api/canchas/:complejoId/:tipo
```

---

### /api/tipos-canchas/:complejoId

**Descripción:** Obtener tipos de cancha disponibles por complejo

```http
GET /api/tipos-canchas/:complejoId
```

---

### /api/reservas

**Descripción:** Obtener reservas

```http
GET /api/reservas
```

---

### /api/reservas/:busqueda

**Descripción:** Buscar reserva por código o nombre

```http
GET /api/reservas/:busqueda
```

---

### /api/emergency/insert-reservas

**Descripción:** Endpoint de emergencia para insertar reservas de prueba

```http
GET /api/emergency/insert-reservas
```

---

### /api/debug/table-data

**Descripción:** Endpoint de debug

```http
GET /api/debug/table-data
```

---

### /api/auth/verify-reset-token/:token

**Descripción:** Endpoint para verificar token de restablecimiento

```http
GET /api/auth/verify-reset-token/:token
```

---

### /api/debug/login-test

**Descripción:** ===== ENDPOINT DE DEBUG PARA LOGIN =====

```http
GET /api/debug/login-test
```

---

### /api/debug/check-users-structure

**Descripción:** ===== ENDPOINT DE DEBUG PARA ESTRUCTURA DE USUARIOS =====

```http
GET /api/debug/check-users-structure
```

---

### /api/debug/test-date-formatting

**Descripción:** ===== ENDPOINT DE DEBUG PARA PROBAR FORMATEO DE FECHA =====

```http
GET /api/debug/test-date-formatting
```

---

### /api/debug/add-rut-column

**Descripción:** ===== ENDPOINT PARA AGREGAR CAMPO RUT_CLIENTE =====

```http
GET /api/debug/add-rut-column
```

---

### /api/debug/test-simple

**Descripción:** ===== ENDPOINT DE PRUEBA =====

```http
GET /api/debug/test-simple
```

---

### /api/debug/test-email-config

**Descripción:** ===== ENDPOINT PARA PROBAR CONFIGURACIÓN DE EMAIL =====

```http
GET /api/debug/test-email-config
```

---

### /api/debug/env-vars

**Descripción:** ===== ENDPOINT PARA VERIFICAR VARIABLES DE ENTORNO =====

```http
GET /api/debug/env-vars
```

---

### /api/debug/email-service-status

**Descripción:** ===== ENDPOINT PARA VERIFICAR EMAIL SERVICE =====

```http
GET /api/debug/email-service-status
```

---

### /api/debug/check-all-blockings

**Descripción:** ===== ENDPOINT PARA VERIFICAR BLOQUEOS TEMPORALES =====

```http
GET /api/debug/check-all-blockings
```

---

### /api/debug/admin-users

**Descripción:** ===== ENDPOINT PARA VERIFICAR USUARIOS ADMINISTRADORES =====

```http
GET /api/debug/admin-users
```

---

### /api/disponibilidad/:cancha_id/:fecha

**Descripción:** ===== ENDPOINT PARA VERIFICAR DISPONIBILIDAD CON BLOQUEOS =====

```http
GET /api/disponibilidad/:cancha_id/:fecha
```

---

### /api/debug/sync-database

**Descripción:** ===== ENDPOINT PARA SINCRONIZAR BASE DE DATOS =====

```http
GET /api/debug/sync-database
```

---

### /api/debug/force-sync-database

**Descripción:** ===== ENDPOINT PARA SINCRONIZACIÓN FORZADA =====

```http
GET /api/debug/force-sync-database
```

---

### /api/debug/restore-reservations

**Descripción:** ===== ENDPOINT PARA RESTAURAR RESERVAS =====

```http
GET /api/debug/restore-reservations
```

---

### /api/debug/simple-restore-reservations

**Descripción:** ===== ENDPOINT PARA RESTAURACIÓN SIMPLE =====

```http
GET /api/debug/simple-restore-reservations
```

---

### /api/debug/optimize-database

**Descripción:** ===== ENDPOINT PARA OPTIMIZAR BASE DE DATOS =====

```http
GET /api/debug/optimize-database
```

---

### /api/debug/add-role-fields

**Descripción:** ===== ENDPOINT PARA AGREGAR CAMPOS DE ROL =====

```http
GET /api/debug/add-role-fields
```

---

### /api/debug/create-role-users

**Descripción:** ===== ENDPOINT PARA CREAR USUARIOS DE EJEMPLO CON ROLES =====

```http
GET /api/debug/create-role-users
```

---

### /api/debug/update-password

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑA =====

```http
GET /api/debug/update-password
```

---

### /api/debug/check-password

**Descripción:** ===== ENDPOINT PARA VERIFICAR CONTRASEÑA =====

```http
GET /api/debug/check-password
```

---

### /api/debug/verify-token

**Descripción:** ===== ENDPOINT PARA VERIFICAR TOKEN =====

```http
GET /api/debug/verify-token
```

---

### /api/debug/canchas

**Descripción:** ===== ENDPOINT PARA VER CANCHAS =====

```http
GET /api/debug/canchas
```

---

### /api/debug/verify-db

**Descripción:** ===== ENDPOINT PARA VERIFICAR BASE DE DATOS =====

```http
GET /api/debug/verify-db
```

---

### /api/debug/list-users

**Descripción:** ===== ENDPOINT PARA VER USUARIOS =====

```http
GET /api/debug/list-users
```

---

### /api/debug/clean-database

**Descripción:** ===== ENDPOINT PARA LIMPIAR BASE DE DATOS =====

```http
GET /api/debug/clean-database
```

---

### /api/admin/customers-analysis

**Descripción:** ===== ENDPOINT PARA ANÁLISIS DE CLIENTES =====

```http
GET /api/admin/customers-analysis
```

---

### /debug/database-structure

**Descripción:** Endpoint de diagnóstico para verificar estructura de BD

```http
GET /debug/database-structure
```

---

### /debug/check-blocking-table

**Descripción:** Endpoint para verificar tabla bloqueos_temporales

```http
GET /debug/check-blocking-table
```

---

### /api/debug/verify-token

**Descripción:** Endpoint para debuggear tokens JWT

```http
GET /api/debug/verify-token
```

---

### /api/debug/passwords

**Descripción:** Endpoint para debuggear contraseñas

```http
GET /api/debug/passwords
```

---

### /api/admin/debug-reservations

**Descripción:** Endpoint de diagnóstico para verificar datos de reservas en producción

```http
GET /api/admin/debug-reservations
```

**Middleware:** RolePermission

---

### /debug/test-admin-calendar-router

**Descripción:** Endpoint para verificar si el router admin-calendar está funcionando

```http
GET /debug/test-admin-calendar-router
```

---

### /debug/check-jwt-config

**Descripción:** Endpoint para verificar configuración de JWT

```http
GET /debug/check-jwt-config
```

---

### /api/diagnostic/frontend-debug/:codigo

**Descripción:** 🔍 ENDPOINT PARA DEBUGGING FRONTEND - DATOS RAW DE RESERVA

```http
GET /api/diagnostic/frontend-debug/:codigo
```

---

### /api/diagnostic/admin-reservas/:codigo

**Descripción:** 🔍 ENDPOINT PARA VERIFICAR DATOS DEL PANEL DE ADMIN

```http
GET /api/diagnostic/admin-reservas/:codigo
```

---

### /api/diagnostic/test-reserva/:codigo

**Descripción:** 🔍 ENDPOINT ESPECÍFICO PARA PROBAR RESERVA TYUY16

```http
GET /api/diagnostic/test-reserva/:codigo
```

---

### /api/diagnostic/date-analysis

**Descripción:** 🔍 ENDPOINT DE DIAGNÓSTICO AUTOMATIZADO PARA FECHAS

```http
GET /api/diagnostic/date-analysis
```

---

### /api/debug/update-magnasports

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR MAGNASPORTS EN PRODUCCIÓN =====

```http
GET /api/debug/update-magnasports
```

---

### /api/admin/create-demo3-users

**Descripción:** ===== ENDPOINT TEMPORAL PARA CREAR USUARIOS COMPLEJO DEMO 3 =====

```http
GET /api/admin/create-demo3-users
```

---

### /api/admin/update-demo3-passwords

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑAS DE USUARIOS DEMO 3 =====

```http
GET /api/admin/update-demo3-passwords
```

---

### /api/admin/limpiar-bloqueos-demo3

**Descripción:** ===== ENDPOINT PARA LIMPIAR BLOQUEOS TEMPORALES PROBLEMÁTICOS =====

```http
GET /api/admin/limpiar-bloqueos-demo3
```

---

### /api/admin/corregir-ids-duplicados

**Descripción:** ===== ENDPOINT PARA CORREGIR IDs DUPLICADOS DE CANCHAS =====

```http
GET /api/admin/corregir-ids-duplicados
```

---

### /api/admin/limpiar-bloqueos-produccion

**Descripción:** ===== ENDPOINT PARA LIMPIAR BLOQUEOS PROBLEMÁTICOS EN PRODUCCIÓN =====

```http
GET /api/admin/limpiar-bloqueos-produccion
```

---

### /api/admin/test-auth

**Descripción:** ===== ENDPOINT DE PRUEBA PARA VERIFICAR AUTENTICACIÓN =====

```http
GET /api/admin/test-auth
```

---

### /api/admin/debug-court-permissions/:id

**Descripción:** ===== ENDPOINT DE DEBUG PARA VERIFICAR PERMISOS DE CANCHAS =====

```http
GET /api/admin/debug-court-permissions/:id
```

---

### /api/admin/crear-categorias-demo3

**Descripción:** ===== ENDPOINT PARA CREAR CATEGORÍAS FINANCIERAS DEL COMPLEJO DEMO 3 =====

```http
GET /api/admin/crear-categorias-demo3
```

---

### /api/admin/registrar-movimientos-manual/:codigoReserva

**Descripción:** ===== ENDPOINT PARA REGISTRAR MOVIMIENTOS FINANCIEROS MANUALMENTE =====

```http
GET /api/admin/registrar-movimientos-manual/:codigoReserva
```

---

### /api/admin/debug-movimientos-financieros/:codigoReserva

**Descripción:** ===== ENDPOINT TEMPORAL PARA DEBUG DE MOVIMIENTOS FINANCIEROS =====

```http
GET /api/admin/debug-movimientos-financieros/:codigoReserva
```

---

### *

**Descripción:** Esta ruta es crítica para servir index.html cuando se accede a la raíz del sitio

```http
GET *
```

---

### /monitoring

**Descripción:** Dashboard de monitoreo

```http
GET /monitoring
```

---

### /health

**Descripción:** Health check

```http
GET /health
```

---

### /api/debug/smtp-connection

**Descripción:** Endpoint para diagnosticar conexión SMTP desde Render

```http
GET /api/debug/smtp-connection
```

---

### /api/debug/test-insert

**Descripción:** Endpoint de prueba simple para insertar una ciudad

```http
GET /api/debug/test-insert
```

---

### /api/debug/insert-all-cities

**Descripción:** Endpoint para insertar todas las ciudades

```http
GET /api/debug/insert-all-cities
```

---

### /test-payment-return

**Descripción:** Ruta de prueba para simular retorno de Transbank en desarrollo

```http
GET /test-payment-return
```

---

### /api/reservas/:codigo

**Descripción:** Endpoint para obtener datos de una reserva específica

```http
GET /api/reservas/:codigo
```

---

### /api/reservas/:codigo/pdf

**Descripción:** Endpoint para generar y descargar comprobante PDF

```http
GET /api/reservas/:codigo/pdf
```

---

### /api/transbank-diagnostic

**Descripción:** Endpoint de diagnóstico para Transbank

```http
GET /api/transbank-diagnostic
```

---

### /api/bloqueos-temporales/:codigo

**Descripción:** Endpoint para obtener datos de un bloqueo temporal

```http
GET /api/bloqueos-temporales/:codigo
```

---

### /api/debug/verificar-superposicion/:canchaId/:fecha/:hora

**Descripción:** Endpoint de debug para verificar lógica de superposición

```http
GET /api/debug/verificar-superposicion/:canchaId/:fecha/:hora
```

---

### /api/disponibilidad-completa/:complejoId/:fecha

**Descripción:** Endpoint optimizado para verificar disponibilidad completa de un complejo

```http
GET /api/disponibilidad-completa/:complejoId/:fecha
```

---

### /api/admin/estadisticas

**Descripción:** Endpoints del panel de administrador

```http
GET /api/admin/estadisticas
```

**Middleware:** RolePermission

---

### /api/admin/reservas-recientes

```http
GET /api/admin/reservas-recientes
```

---

### /api/admin/disponibilidad-baja

**Descripción:** Endpoint para verificar disponibilidad baja

```http
GET /api/admin/disponibilidad-baja
```

---

### /api/admin/kpis

**Descripción:** Endpoint para KPIs avanzados

```http
GET /api/admin/kpis
```

---

### /api/admin/reservas-hoy

```http
GET /api/admin/reservas-hoy
```

---

### /api/debug/timezone

**Descripción:** Endpoint temporal para debuggear zona horaria

```http
GET /api/debug/timezone
```

---

### /api/debug/date-fix

**Descripción:** Endpoint de debug temporal para verificar correcciones de fechas

```http
GET /api/debug/date-fix
```

---

### /api/admin/reservas

**Descripción:** Endpoint para obtener todas las reservas (panel de administración)

```http
GET /api/admin/reservas
```

**Middleware:** RolePermission

---

### /api/admin/complejos

**Descripción:** Endpoint para obtener complejos (panel de administración)

```http
GET /api/admin/complejos
```

**Middleware:** RolePermission

---

### /api/admin/canchas

**Descripción:** Endpoint para obtener canchas (panel de administración)

```http
GET /api/admin/canchas
```

**Middleware:** RolePermission

---

### /api/admin/reports/income/:format

**Descripción:** Endpoint para generar reportes de ingresos en PDF/Excel

```http
GET /api/admin/reports/income/:format
```

**Middleware:** RolePermission

---

### /api/debug/clean-duplicate-complexes

**Descripción:** Endpoint para limpiar complejos duplicados

```http
GET /api/debug/clean-duplicate-complexes
```

---

### /api/debug/check-reservas-structure

**Descripción:** Endpoint para verificar estructura de tabla reservas

```http
GET /api/debug/check-reservas-structure
```

---

### /api/debug/check-blocking-table

**Descripción:** Endpoint para verificar estructura de tabla bloqueos_temporales

```http
GET /api/debug/check-blocking-table
```

---

### /api/debug/check-canchas

**Descripción:** Endpoint para verificar canchas existentes

```http
GET /api/debug/check-canchas
```

---

### /api/debug/insert-test-reservations

**Descripción:** Endpoint para insertar reservas de prueba

```http
GET /api/debug/insert-test-reservations
```

---

### /api/debug/insert-courts

**Descripción:** Endpoint para insertar canchas

```http
GET /api/debug/insert-courts
```

---

### /api/debug/insert-complexes

**Descripción:** Endpoint para insertar complejos

```http
GET /api/debug/insert-complexes
```

---

### /api/debug/force-init

**Descripción:** Endpoint para forzar inicialización de datos

```http
GET /api/debug/force-init
```

---

### /debug/postgresql

**Descripción:** Debug endpoint para verificar PostgreSQL

```http
GET /debug/postgresql
```

---

### /api/ciudades

**Descripción:** Obtener ciudades

```http
GET /api/ciudades
```

---

### /api/complejos/:ciudadId

**Descripción:** Obtener complejos por ciudad

```http
GET /api/complejos/:ciudadId
```

---

### /api/canchas

**Descripción:** Obtener todas las canchas

```http
GET /api/canchas
```

---

### /api/canchas/:complejoId

**Descripción:** Obtener canchas por complejo (con promociones activas)

```http
GET /api/canchas/:complejoId
```

---

### /api/canchas/:complejoId/:tipo

**Descripción:** Obtener canchas por complejo y tipo (con promociones activas)

```http
GET /api/canchas/:complejoId/:tipo
```

---

### /api/tipos-canchas/:complejoId

**Descripción:** Obtener tipos de cancha disponibles por complejo

```http
GET /api/tipos-canchas/:complejoId
```

---

### /api/reservas

**Descripción:** Obtener reservas

```http
GET /api/reservas
```

---

### /api/reservas/:busqueda

**Descripción:** Buscar reserva por código o nombre

```http
GET /api/reservas/:busqueda
```

---

### /api/emergency/insert-reservas

**Descripción:** Endpoint de emergencia para insertar reservas de prueba

```http
GET /api/emergency/insert-reservas
```

---

### /api/debug/table-data

**Descripción:** Endpoint de debug

```http
GET /api/debug/table-data
```

---

### /api/auth/verify-reset-token/:token

**Descripción:** Endpoint para verificar token de restablecimiento

```http
GET /api/auth/verify-reset-token/:token
```

---

### /api/debug/login-test

**Descripción:** ===== ENDPOINT DE DEBUG PARA LOGIN =====

```http
GET /api/debug/login-test
```

---

### /api/debug/check-users-structure

**Descripción:** ===== ENDPOINT DE DEBUG PARA ESTRUCTURA DE USUARIOS =====

```http
GET /api/debug/check-users-structure
```

---

### /api/debug/test-date-formatting

**Descripción:** ===== ENDPOINT DE DEBUG PARA PROBAR FORMATEO DE FECHA =====

```http
GET /api/debug/test-date-formatting
```

---

### /api/debug/add-rut-column

**Descripción:** ===== ENDPOINT PARA AGREGAR CAMPO RUT_CLIENTE =====

```http
GET /api/debug/add-rut-column
```

---

### /api/debug/test-simple

**Descripción:** ===== ENDPOINT DE PRUEBA =====

```http
GET /api/debug/test-simple
```

---

### /api/debug/test-email-config

**Descripción:** ===== ENDPOINT PARA PROBAR CONFIGURACIÓN DE EMAIL =====

```http
GET /api/debug/test-email-config
```

---

### /api/debug/env-vars

**Descripción:** ===== ENDPOINT PARA VERIFICAR VARIABLES DE ENTORNO =====

```http
GET /api/debug/env-vars
```

---

### /api/debug/email-service-status

**Descripción:** ===== ENDPOINT PARA VERIFICAR EMAIL SERVICE =====

```http
GET /api/debug/email-service-status
```

---

### /api/debug/check-all-blockings

**Descripción:** ===== ENDPOINT PARA VERIFICAR BLOQUEOS TEMPORALES =====

```http
GET /api/debug/check-all-blockings
```

---

### /api/debug/admin-users

**Descripción:** ===== ENDPOINT PARA VERIFICAR USUARIOS ADMINISTRADORES =====

```http
GET /api/debug/admin-users
```

---

### /api/disponibilidad/:cancha_id/:fecha

**Descripción:** ===== ENDPOINT PARA VERIFICAR DISPONIBILIDAD CON BLOQUEOS =====

```http
GET /api/disponibilidad/:cancha_id/:fecha
```

---

### /api/debug/sync-database

**Descripción:** ===== ENDPOINT PARA SINCRONIZAR BASE DE DATOS =====

```http
GET /api/debug/sync-database
```

---

### /api/debug/force-sync-database

**Descripción:** ===== ENDPOINT PARA SINCRONIZACIÓN FORZADA =====

```http
GET /api/debug/force-sync-database
```

---

### /api/debug/restore-reservations

**Descripción:** ===== ENDPOINT PARA RESTAURAR RESERVAS =====

```http
GET /api/debug/restore-reservations
```

---

### /api/debug/simple-restore-reservations

**Descripción:** ===== ENDPOINT PARA RESTAURACIÓN SIMPLE =====

```http
GET /api/debug/simple-restore-reservations
```

---

### /api/debug/optimize-database

**Descripción:** ===== ENDPOINT PARA OPTIMIZAR BASE DE DATOS =====

```http
GET /api/debug/optimize-database
```

---

### /api/debug/add-role-fields

**Descripción:** ===== ENDPOINT PARA AGREGAR CAMPOS DE ROL =====

```http
GET /api/debug/add-role-fields
```

---

### /api/debug/create-role-users

**Descripción:** ===== ENDPOINT PARA CREAR USUARIOS DE EJEMPLO CON ROLES =====

```http
GET /api/debug/create-role-users
```

---

### /api/debug/update-password

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑA =====

```http
GET /api/debug/update-password
```

---

### /api/debug/check-password

**Descripción:** ===== ENDPOINT PARA VERIFICAR CONTRASEÑA =====

```http
GET /api/debug/check-password
```

---

### /api/debug/verify-token

**Descripción:** ===== ENDPOINT PARA VERIFICAR TOKEN =====

```http
GET /api/debug/verify-token
```

---

### /api/debug/canchas

**Descripción:** ===== ENDPOINT PARA VER CANCHAS =====

```http
GET /api/debug/canchas
```

---

### /api/debug/verify-db

**Descripción:** ===== ENDPOINT PARA VERIFICAR BASE DE DATOS =====

```http
GET /api/debug/verify-db
```

---

### /api/debug/list-users

**Descripción:** ===== ENDPOINT PARA VER USUARIOS =====

```http
GET /api/debug/list-users
```

---

### /api/debug/clean-database

**Descripción:** ===== ENDPOINT PARA LIMPIAR BASE DE DATOS =====

```http
GET /api/debug/clean-database
```

---

### /api/admin/customers-analysis

**Descripción:** ===== ENDPOINT PARA ANÁLISIS DE CLIENTES =====

```http
GET /api/admin/customers-analysis
```

---

### /debug/database-structure

**Descripción:** Endpoint de diagnóstico para verificar estructura de BD

```http
GET /debug/database-structure
```

---

### /debug/check-blocking-table

**Descripción:** Endpoint para verificar tabla bloqueos_temporales

```http
GET /debug/check-blocking-table
```

---

### /api/debug/verify-token

**Descripción:** Endpoint para debuggear tokens JWT

```http
GET /api/debug/verify-token
```

---

### /api/debug/passwords

**Descripción:** Endpoint para debuggear contraseñas

```http
GET /api/debug/passwords
```

---

### /api/admin/debug-reservations

**Descripción:** Endpoint de diagnóstico para verificar datos de reservas en producción

```http
GET /api/admin/debug-reservations
```

**Middleware:** RolePermission

---

### /debug/test-admin-calendar-router

**Descripción:** Endpoint para verificar si el router admin-calendar está funcionando

```http
GET /debug/test-admin-calendar-router
```

---

### /debug/check-jwt-config

**Descripción:** Endpoint para verificar configuración de JWT

```http
GET /debug/check-jwt-config
```

---

### /api/diagnostic/frontend-debug/:codigo

**Descripción:** 🔍 ENDPOINT PARA DEBUGGING FRONTEND - DATOS RAW DE RESERVA

```http
GET /api/diagnostic/frontend-debug/:codigo
```

---

### /api/diagnostic/admin-reservas/:codigo

**Descripción:** 🔍 ENDPOINT PARA VERIFICAR DATOS DEL PANEL DE ADMIN

```http
GET /api/diagnostic/admin-reservas/:codigo
```

---

### /api/diagnostic/test-reserva/:codigo

**Descripción:** 🔍 ENDPOINT ESPECÍFICO PARA PROBAR RESERVA TYUY16

```http
GET /api/diagnostic/test-reserva/:codigo
```

---

### /api/diagnostic/date-analysis

**Descripción:** 🔍 ENDPOINT DE DIAGNÓSTICO AUTOMATIZADO PARA FECHAS

```http
GET /api/diagnostic/date-analysis
```

---

### /api/debug/update-magnasports

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR MAGNASPORTS EN PRODUCCIÓN =====

```http
GET /api/debug/update-magnasports
```

---

### /api/admin/create-demo3-users

**Descripción:** ===== ENDPOINT TEMPORAL PARA CREAR USUARIOS COMPLEJO DEMO 3 =====

```http
GET /api/admin/create-demo3-users
```

---

### /api/admin/update-demo3-passwords

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR CONTRASEÑAS DE USUARIOS DEMO 3 =====

```http
GET /api/admin/update-demo3-passwords
```

---

### /api/admin/limpiar-bloqueos-demo3

**Descripción:** ===== ENDPOINT PARA LIMPIAR BLOQUEOS TEMPORALES PROBLEMÁTICOS =====

```http
GET /api/admin/limpiar-bloqueos-demo3
```

---

### /api/admin/corregir-ids-duplicados

**Descripción:** ===== ENDPOINT PARA CORREGIR IDs DUPLICADOS DE CANCHAS =====

```http
GET /api/admin/corregir-ids-duplicados
```

---

### /api/admin/limpiar-bloqueos-produccion

**Descripción:** ===== ENDPOINT PARA LIMPIAR BLOQUEOS PROBLEMÁTICOS EN PRODUCCIÓN =====

```http
GET /api/admin/limpiar-bloqueos-produccion
```

---

### /api/admin/test-auth

**Descripción:** ===== ENDPOINT DE PRUEBA PARA VERIFICAR AUTENTICACIÓN =====

```http
GET /api/admin/test-auth
```

---

### /api/admin/debug-court-permissions/:id

**Descripción:** ===== ENDPOINT DE DEBUG PARA VERIFICAR PERMISOS DE CANCHAS =====

```http
GET /api/admin/debug-court-permissions/:id
```

---

### /api/admin/crear-categorias-demo3

**Descripción:** ===== ENDPOINT PARA CREAR CATEGORÍAS FINANCIERAS DEL COMPLEJO DEMO 3 =====

```http
GET /api/admin/crear-categorias-demo3
```

---

### /api/admin/registrar-movimientos-manual/:codigoReserva

**Descripción:** ===== ENDPOINT PARA REGISTRAR MOVIMIENTOS FINANCIEROS MANUALMENTE =====

```http
GET /api/admin/registrar-movimientos-manual/:codigoReserva
```

---

### /api/admin/debug-movimientos-financieros/:codigoReserva

**Descripción:** ===== ENDPOINT TEMPORAL PARA DEBUG DE MOVIMIENTOS FINANCIEROS =====

```http
GET /api/admin/debug-movimientos-financieros/:codigoReserva
```

---

### *

**Descripción:** Esta ruta es crítica para servir index.html cuando se accede a la raíz del sitio

```http
GET *
```

---

## POST Routes

### /api/simulate-payment-success

**Descripción:** Endpoint para simular pago exitoso completo (bypasea Transbank)

```http
POST /api/simulate-payment-success
```

---

### /api/reservas/:codigo/reenviar-email

**Descripción:** Endpoint para reenviar email de confirmación manualmente

```http
POST /api/reservas/:codigo/reenviar-email
```

---

### /api/send-confirmation-email

**Descripción:** Endpoint separado para enviar emails de confirmación

```http
POST /api/send-confirmation-email
```

---

### /api/simulate-payment-cancelled

**Descripción:** Endpoint para simular pago cancelado

```http
POST /api/simulate-payment-cancelled
```

---

### /api/reservas/bloquear-y-pagar

**Descripción:** Endpoint para crear bloqueo temporal y proceder al pago

```http
POST /api/reservas/bloquear-y-pagar
```

---

### /api/debug/test-email-30sep

**Descripción:** Endpoint específico para probar email con fecha 2025-09-30

```http
POST /api/debug/test-email-30sep
```

---

### /api/debug/send-test-email

**Descripción:** Endpoint temporal para enviar email de prueba con fecha correcta

```http
POST /api/debug/send-test-email
```

---

### /api/admin/canchas

**Descripción:** Endpoint para crear una nueva cancha (panel de administración)

```http
POST /api/admin/canchas
```

**Middleware:** RolePermission

---

### /api/admin/reports

**Descripción:** Endpoint para generar reportes (panel de administración)

```http
POST /api/admin/reports
```

**Middleware:** RolePermission

---

### /api/reservas

**Descripción:** Crear reserva (ATÓMICA - Previene condiciones de carrera)

```http
POST /api/reservas
```

---

### /api/send-confirmation-email

**Descripción:** ===== ENDPOINT PARA ENVÍO DE EMAILS =====

```http
POST /api/send-confirmation-email
```

---

### /api/reservas/cleanup-test

**Descripción:** Endpoint para limpiar datos de prueba

```http
POST /api/reservas/cleanup-test
```

---

### /api/admin/login

**Descripción:** ===== ENDPOINT DE LOGIN PARA ADMINISTRADORES =====

```http
POST /api/admin/login
```

---

### /api/auth/request-password-reset

**Descripción:** Endpoint para solicitar restablecimiento de contraseña

```http
POST /api/auth/request-password-reset
```

---

### /api/auth/reset-password

**Descripción:** Endpoint para restablecer contraseña

```http
POST /api/auth/reset-password
```

---

### /api/debug/insert-admin-users

**Descripción:** ===== ENDPOINT PARA INSERTAR USUARIOS ADMIN =====

```http
POST /api/debug/insert-admin-users
```

---

### /api/debug/clean-production-db

**Descripción:** ===== ENDPOINT TEMPORAL PARA LIMPIAR BASE DE DATOS DE PRODUCCIÓN =====

```http
POST /api/debug/clean-production-db
```

---

### /api/debug/test-email-send

**Descripción:** ===== ENDPOINT PARA PROBAR ENVÍO DE EMAIL =====

```http
POST /api/debug/test-email-send
```

---

### /api/reservas/bloquear

**Descripción:** ===== ENDPOINT PARA BLOQUEAR TEMPORALMENTE UNA RESERVA (MEJORADO) =====

```http
POST /api/reservas/bloquear
```

---

### /api/debug/test-bloqueo

**Descripción:** ===== ENDPOINT DE DEBUG PARA PROBAR BLOQUEOS =====

```http
POST /api/debug/test-bloqueo
```

---

### /api/debug/create-admin-users

**Descripción:** ===== ENDPOINT PARA CREAR/ACTUALIZAR USUARIOS ADMINISTRADORES =====

```http
POST /api/debug/create-admin-users
```

---

### /api/debug/create-courts

**Descripción:** ===== ENDPOINT PARA CREAR CANCHAS DE PRUEBA =====

```http
POST /api/debug/create-courts
```

---

### /api/debug/migrate-fundacion-gunnen

**Descripción:** ===== ENDPOINT PARA MIGRAR FUNDACIÓN GUNNEN =====

```http
POST /api/debug/migrate-fundacion-gunnen
```

---

### /api/debug/clean-duplicate-complexes

**Descripción:** ===== ENDPOINT PARA LIMPIAR DUPLICADOS DE FUNDACIÓN GUNNEN =====

```http
POST /api/debug/clean-duplicate-complexes
```

---

### /api/debug/delete-duplicates

**Descripción:** ===== ENDPOINT SIMPLE PARA ELIMINAR DUPLICADOS =====

```http
POST /api/debug/delete-duplicates
```

---

### /api/debug/clean-localhost

**Descripción:** ===== ENDPOINT PARA LIMPIAR LOCALHOST =====

```http
POST /api/debug/clean-localhost
```

---

### /api/debug/fix-canchas-production

**Descripción:** ===== ENDPOINT PARA CORREGIR CANCHAS EN PRODUCCIÓN =====

```http
POST /api/debug/fix-canchas-production
```

---

### /api/debug/fix-complejo-ids

**Descripción:** ===== ENDPOINT PARA CORREGIR COMPLEJO_ID =====

```http
POST /api/debug/fix-complejo-ids
```

---

### /api/debug/fix-roles

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR ROLES =====

```http
POST /api/debug/fix-roles
```

---

### /debug/create-blocking-table

**Descripción:** Endpoint para crear tabla bloqueos_temporales si no existe

```http
POST /debug/create-blocking-table
```

---

### /debug/test-reservation-insert

**Descripción:** Endpoint para probar inserción de reserva

```http
POST /debug/test-reservation-insert
```

---

### /debug/add-admin-id-column

**Descripción:** Endpoint para agregar columna admin_id específicamente

```http
POST /debug/add-admin-id-column
```

---

### /api/debug/fix-passwords

**Descripción:** Endpoint para arreglar todas las contraseñas

```http
POST /api/debug/fix-passwords
```

---

### /debug/update-super-admin

**Descripción:** Endpoint para actualizar credenciales del super admin

```http
POST /debug/update-super-admin
```

---

### /debug/test-create-blocking

**Descripción:** Endpoint para probar create-blocking específicamente

```http
POST /debug/test-create-blocking
```

---

### /debug/simulate-create-blocking

**Descripción:** Endpoint para simular create-blocking sin autenticación

```http
POST /debug/simulate-create-blocking
```

---

### /api/admin/calendar/create-blocking-temp

**Descripción:** Endpoint temporal para reemplazar create-blocking

```http
POST /api/admin/calendar/create-blocking-temp
```

---

### /debug/fix-database-columns

**Descripción:** Endpoint para agregar columnas faltantes en PostgreSQL

```http
POST /debug/fix-database-columns
```

---

### /api/simulate-payment-success

**Descripción:** Endpoint para simular pago exitoso completo (bypasea Transbank)

```http
POST /api/simulate-payment-success
```

---

### /api/reservas/:codigo/reenviar-email

**Descripción:** Endpoint para reenviar email de confirmación manualmente

```http
POST /api/reservas/:codigo/reenviar-email
```

---

### /api/send-confirmation-email

**Descripción:** Endpoint separado para enviar emails de confirmación

```http
POST /api/send-confirmation-email
```

---

### /api/simulate-payment-cancelled

**Descripción:** Endpoint para simular pago cancelado

```http
POST /api/simulate-payment-cancelled
```

---

### /api/reservas/bloquear-y-pagar

**Descripción:** Endpoint para crear bloqueo temporal y proceder al pago

```http
POST /api/reservas/bloquear-y-pagar
```

---

### /api/debug/test-email-30sep

**Descripción:** Endpoint específico para probar email con fecha 2025-09-30

```http
POST /api/debug/test-email-30sep
```

---

### /api/debug/send-test-email

**Descripción:** Endpoint temporal para enviar email de prueba con fecha correcta

```http
POST /api/debug/send-test-email
```

---

### /api/admin/canchas

**Descripción:** Endpoint para crear una nueva cancha (panel de administración)

```http
POST /api/admin/canchas
```

**Middleware:** RolePermission

---

### /api/admin/reports

**Descripción:** Endpoint para generar reportes (panel de administración)

```http
POST /api/admin/reports
```

**Middleware:** RolePermission

---

### /api/reservas

**Descripción:** Crear reserva (ATÓMICA - Previene condiciones de carrera)

```http
POST /api/reservas
```

---

### /api/send-confirmation-email

**Descripción:** ===== ENDPOINT PARA ENVÍO DE EMAILS =====

```http
POST /api/send-confirmation-email
```

---

### /api/reservas/cleanup-test

**Descripción:** Endpoint para limpiar datos de prueba

```http
POST /api/reservas/cleanup-test
```

---

### /api/admin/login

**Descripción:** ===== ENDPOINT DE LOGIN PARA ADMINISTRADORES =====

```http
POST /api/admin/login
```

---

### /api/auth/request-password-reset

**Descripción:** Endpoint para solicitar restablecimiento de contraseña

```http
POST /api/auth/request-password-reset
```

---

### /api/auth/reset-password

**Descripción:** Endpoint para restablecer contraseña

```http
POST /api/auth/reset-password
```

---

### /api/debug/insert-admin-users

**Descripción:** ===== ENDPOINT PARA INSERTAR USUARIOS ADMIN =====

```http
POST /api/debug/insert-admin-users
```

---

### /api/debug/clean-production-db

**Descripción:** ===== ENDPOINT TEMPORAL PARA LIMPIAR BASE DE DATOS DE PRODUCCIÓN =====

```http
POST /api/debug/clean-production-db
```

---

### /api/debug/test-email-send

**Descripción:** ===== ENDPOINT PARA PROBAR ENVÍO DE EMAIL =====

```http
POST /api/debug/test-email-send
```

---

### /api/reservas/bloquear

**Descripción:** ===== ENDPOINT PARA BLOQUEAR TEMPORALMENTE UNA RESERVA (MEJORADO) =====

```http
POST /api/reservas/bloquear
```

---

### /api/debug/test-bloqueo

**Descripción:** ===== ENDPOINT DE DEBUG PARA PROBAR BLOQUEOS =====

```http
POST /api/debug/test-bloqueo
```

---

### /api/debug/create-admin-users

**Descripción:** ===== ENDPOINT PARA CREAR/ACTUALIZAR USUARIOS ADMINISTRADORES =====

```http
POST /api/debug/create-admin-users
```

---

### /api/debug/create-courts

**Descripción:** ===== ENDPOINT PARA CREAR CANCHAS DE PRUEBA =====

```http
POST /api/debug/create-courts
```

---

### /api/debug/migrate-fundacion-gunnen

**Descripción:** ===== ENDPOINT PARA MIGRAR FUNDACIÓN GUNNEN =====

```http
POST /api/debug/migrate-fundacion-gunnen
```

---

### /api/debug/clean-duplicate-complexes

**Descripción:** ===== ENDPOINT PARA LIMPIAR DUPLICADOS DE FUNDACIÓN GUNNEN =====

```http
POST /api/debug/clean-duplicate-complexes
```

---

### /api/debug/delete-duplicates

**Descripción:** ===== ENDPOINT SIMPLE PARA ELIMINAR DUPLICADOS =====

```http
POST /api/debug/delete-duplicates
```

---

### /api/debug/clean-localhost

**Descripción:** ===== ENDPOINT PARA LIMPIAR LOCALHOST =====

```http
POST /api/debug/clean-localhost
```

---

### /api/debug/fix-canchas-production

**Descripción:** ===== ENDPOINT PARA CORREGIR CANCHAS EN PRODUCCIÓN =====

```http
POST /api/debug/fix-canchas-production
```

---

### /api/debug/fix-complejo-ids

**Descripción:** ===== ENDPOINT PARA CORREGIR COMPLEJO_ID =====

```http
POST /api/debug/fix-complejo-ids
```

---

### /api/debug/fix-roles

**Descripción:** ===== ENDPOINT PARA ACTUALIZAR ROLES =====

```http
POST /api/debug/fix-roles
```

---

### /debug/create-blocking-table

**Descripción:** Endpoint para crear tabla bloqueos_temporales si no existe

```http
POST /debug/create-blocking-table
```

---

### /debug/test-reservation-insert

**Descripción:** Endpoint para probar inserción de reserva

```http
POST /debug/test-reservation-insert
```

---

### /debug/add-admin-id-column

**Descripción:** Endpoint para agregar columna admin_id específicamente

```http
POST /debug/add-admin-id-column
```

---

### /api/debug/fix-passwords

**Descripción:** Endpoint para arreglar todas las contraseñas

```http
POST /api/debug/fix-passwords
```

---

### /debug/update-super-admin

**Descripción:** Endpoint para actualizar credenciales del super admin

```http
POST /debug/update-super-admin
```

---

### /debug/test-create-blocking

**Descripción:** Endpoint para probar create-blocking específicamente

```http
POST /debug/test-create-blocking
```

---

### /debug/simulate-create-blocking

**Descripción:** Endpoint para simular create-blocking sin autenticación

```http
POST /debug/simulate-create-blocking
```

---

### /api/admin/calendar/create-blocking-temp

**Descripción:** Endpoint temporal para reemplazar create-blocking

```http
POST /api/admin/calendar/create-blocking-temp
```

---

### /debug/fix-database-columns

**Descripción:** Endpoint para agregar columnas faltantes en PostgreSQL

```http
POST /debug/fix-database-columns
```

---

## PUT Routes

### /api/admin/canchas/:id

**Descripción:** Endpoint para actualizar una cancha (panel de administración)

```http
PUT /api/admin/canchas/:id
```

**Middleware:** RolePermission

---

### /api/admin/reservas/:codigoReserva/confirmar

**Descripción:** Endpoint para confirmar una reserva (panel de administración)

```http
PUT /api/admin/reservas/:codigoReserva/confirmar
```

---

### /api/admin/reservas/:codigoReserva/cancelar

**Descripción:** Endpoint para cancelar una reserva (panel de administración)

```http
PUT /api/admin/reservas/:codigoReserva/cancelar
```

---

### /api/admin/canchas/:id

**Descripción:** Endpoint para actualizar una cancha (panel de administración)

```http
PUT /api/admin/canchas/:id
```

**Middleware:** RolePermission

---

### /api/admin/reservas/:codigoReserva/confirmar

**Descripción:** Endpoint para confirmar una reserva (panel de administración)

```http
PUT /api/admin/reservas/:codigoReserva/confirmar
```

---

### /api/admin/reservas/:codigoReserva/cancelar

**Descripción:** Endpoint para cancelar una reserva (panel de administración)

```http
PUT /api/admin/reservas/:codigoReserva/cancelar
```

---

## DELETE Routes

### /api/admin/canchas/:id

**Descripción:** Endpoint para eliminar una cancha (panel de administración)

```http
DELETE /api/admin/canchas/:id
```

**Middleware:** RolePermission

---

### /api/reservas/bloquear/:bloqueo_id

**Descripción:** ===== ENDPOINT PARA LIBERAR BLOQUEO TEMPORAL =====

```http
DELETE /api/reservas/bloquear/:bloqueo_id
```

---

### /api/admin/clear-all-reservations

**Descripción:** Endpoint para limpiar todas las reservas (solo para super admin en producción)

```http
DELETE /api/admin/clear-all-reservations
```

**Middleware:** RolePermission

---

### /api/admin/canchas/:id

**Descripción:** Endpoint para eliminar una cancha (panel de administración)

```http
DELETE /api/admin/canchas/:id
```

**Middleware:** RolePermission

---

### /api/reservas/bloquear/:bloqueo_id

**Descripción:** ===== ENDPOINT PARA LIBERAR BLOQUEO TEMPORAL =====

```http
DELETE /api/reservas/bloquear/:bloqueo_id
```

---

### /api/admin/clear-all-reservations

**Descripción:** Endpoint para limpiar todas las reservas (solo para super admin en producción)

```http
DELETE /api/admin/clear-all-reservations
```

**Middleware:** RolePermission

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

## 📊 Estadísticas de la API

- **Total de rutas:** 272
- **Rutas GET:** 184
- **Rutas POST:** 76
- **Rutas PUT:** 6
- **Rutas DELETE:** 6

---

*Documentación generada automáticamente el 23-10-2025, 9:15:03 p. m.*

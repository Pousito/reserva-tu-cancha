-- ====================================================================
-- SCRIPT DE CREACIÓN COMPLETA: COMPLEJO BORDE RIO - QUILLECO
-- ====================================================================
-- Fecha: 7 de octubre de 2025
-- Base de datos: PostgreSQL (desarrollo)
-- Descripción: Incluye ciudad, complejo, cancha y usuarios (owner + manager)
-- ====================================================================

BEGIN;

-- 1. CIUDAD: QUILLECO
-- ====================================================================
INSERT INTO ciudades (id, nombre) 
VALUES (6, 'Quilleco')
ON CONFLICT (id) DO NOTHING;

-- 2. COMPLEJO: BORDE RIO
-- ====================================================================
INSERT INTO complejos (id, nombre, ciudad_id, direccion, telefono, email) 
VALUES (
    6,
    'Borde Rio',
    6,
    'Ruta Q-575, Quilleco, Bio Bio',
    '+56999820929',
    'admin@borderio.cl'
)
ON CONFLICT (id) DO NOTHING;

-- 3. CANCHA: CANCHA PRINCIPAL (BABY FÚTBOL)
-- ====================================================================
INSERT INTO canchas (id, complejo_id, nombre, tipo, precio_hora) 
VALUES (
    10,
    6,
    'Cancha Principal',
    'baby futbol',
    8000
)
ON CONFLICT (id) DO NOTHING;

-- 4. USUARIO OWNER
-- ====================================================================
-- Password: borderio2024 (hasheado con bcrypt, 12 rounds)
INSERT INTO usuarios (id, email, password, nombre, rol, complejo_id, activo) 
VALUES (
    35,
    'admin@borderio.cl',
    '$2a$12$[HASH_GENERADO_POR_SCRIPT]',  -- Este hash se genera dinámicamente
    'Administrador Borde Rio',
    'owner',
    6,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 5. USUARIO MANAGER
-- ====================================================================
-- Password: manager2024 (hasheado con bcrypt, 12 rounds)
INSERT INTO usuarios (id, email, password, nombre, rol, complejo_id, activo) 
VALUES (
    36,
    'manager@borderio.cl',
    '$2a$12$[HASH_GENERADO_POR_SCRIPT]',  -- Este hash se genera dinámicamente
    'Manager Borde Rio',
    'manager',
    6,
    true
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ====================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ====================================================================

SELECT 
    'CIUDAD' as tipo,
    id,
    nombre,
    NULL as complejo_id,
    NULL as tipo_cancha,
    NULL as precio
FROM ciudades 
WHERE nombre = 'Quilleco'

UNION ALL

SELECT 
    'COMPLEJO' as tipo,
    c.id,
    c.nombre,
    c.ciudad_id,
    NULL as tipo_cancha,
    NULL as precio
FROM complejos c
WHERE c.nombre = 'Borde Rio'

UNION ALL

SELECT 
    'CANCHA' as tipo,
    ca.id,
    ca.nombre,
    ca.complejo_id,
    ca.tipo as tipo_cancha,
    ca.precio_hora as precio
FROM canchas ca
WHERE ca.complejo_id = 6

UNION ALL

SELECT 
    'USUARIO' as tipo,
    u.id,
    u.nombre || ' (' || u.rol || ')',
    u.complejo_id,
    u.email as tipo_cancha,
    NULL as precio
FROM usuarios u
WHERE u.complejo_id = 6
ORDER BY tipo, id;

-- ====================================================================
-- INFORMACIÓN DEL COMPLEJO
-- ====================================================================

/*
📋 DATOS GENERALES:
- Nombre: Borde Rio
- Ciudad: Quilleco, Bio Bio
- Dirección: Ruta Q-575
- Teléfono: +56 9 9982 0929
- Email: admin@borderio.cl
- Instagram: @espaciodeportivoborderio
- Horario: Lunes a domingo, 10:00 AM - 00:00 AM

⚽ CANCHA:
- Tipo: Baby Fútbol
- Capacidad: 7 vs 7 jugadores
- Superficie: Al aire libre (no techada)
- Precio/hora: $8,000

🔑 CREDENCIALES:
Owner:
  - Email: admin@borderio.cl
  - Password: borderio2024
  - Permisos: Completos (dashboard + reportes + ingresos)

Manager:
  - Email: manager@borderio.cl
  - Password: manager2024
  - Permisos: Limitados (sin reportes ni ingresos)

📊 IDs ASIGNADOS:
- Ciudad ID: 6
- Complejo ID: 6
- Cancha ID: 10
- Owner ID: 35
- Manager ID: 36

🚀 ACCESO:
URL Login: http://localhost:3000/admin-login.html
*/


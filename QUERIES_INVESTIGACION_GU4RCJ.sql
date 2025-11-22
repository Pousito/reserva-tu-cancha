-- ============================================
-- QUERIES PARA INVESTIGAR RESERVA GU4RCJ
-- Ejecutar estas queries en la base de datos de producción (Render)
-- ============================================

-- 1. INFORMACIÓN COMPLETA DE LA RESERVA
-- ============================================
SELECT 
  r.*,
  c.nombre as cancha_nombre,
  c.complejo_id,
  comp.nombre as complejo_nombre,
  u.email as creado_por_email,
  u.nombre as creado_por_nombre,
  u.rol as creado_por_rol,
  u.id as creado_por_id
FROM reservas r
LEFT JOIN canchas c ON r.cancha_id = c.id
LEFT JOIN complejos comp ON c.complejo_id = comp.id
LEFT JOIN usuarios u ON r.admin_id = u.id
WHERE UPPER(r.codigo_reserva) = UPPER('GU4RCJ');

-- 2. VERIFICAR SI ESTÁ EN CONTROL FINANCIERO
-- ============================================
SELECT * FROM gastos_ingresos
WHERE descripcion LIKE '%GU4RCJ%'
   OR descripcion LIKE '%Reserva #GU4RCJ%'
ORDER BY created_at DESC;

-- 3. COMPARAR CON LAS OTRAS DOS RESERVAS QUE SÍ ESTÁN
-- ============================================
SELECT 
  r.codigo_reserva,
  r.estado,
  r.tipo_reserva,
  r.precio_total,
  r.monto_abonado,
  r.email_cliente,
  r.created_at,
  COUNT(gi.id) as registros_financieros,
  STRING_AGG(gi.descripcion, ' | ') as descripciones_financieras
FROM reservas r
LEFT JOIN gastos_ingresos gi ON gi.descripcion LIKE '%' || r.codigo_reserva || '%'
WHERE r.codigo_reserva IN ('GU4RCJ', 'VIZJ4P', 'ISLTLF')
GROUP BY r.codigo_reserva, r.estado, r.tipo_reserva, r.precio_total, r.monto_abonado, r.email_cliente, r.created_at
ORDER BY r.created_at DESC;

-- 4. VERIFICAR CATEGORÍAS DE GASTOS DEL COMPLEJO
-- ============================================
-- Primero obtener el complejo_id de la reserva
SELECT 
  c.complejo_id,
  comp.nombre as complejo_nombre
FROM reservas r
JOIN canchas c ON r.cancha_id = c.id
JOIN complejos comp ON c.complejo_id = comp.id
WHERE UPPER(r.codigo_reserva) = UPPER('GU4RCJ');

-- Luego verificar categorías (usar el complejo_id obtenido arriba, probablemente 7)
SELECT id, nombre, tipo, es_predefinida
FROM categorias_gastos
WHERE complejo_id = 7  -- Cambiar por el complejo_id real
  AND tipo = 'ingreso'
  AND (nombre = 'Reservas Web' OR nombre = 'Reservas Administrativas')
ORDER BY nombre;

-- 5. VERIFICAR SI EXISTE EL TRIGGER
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'reservas'
  AND trigger_name LIKE '%sincronizar%';

-- 6. VERIFICAR SI EXISTE LA FUNCIÓN DEL TRIGGER
-- ============================================
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%sincronizar%'
  AND routine_schema = 'public';

-- 7. VERIFICAR HISTORIAL DE CAMBIOS DE ESTADO (si existe tabla de logs)
-- ============================================
-- Esta query puede no funcionar si no hay tabla de logs
SELECT * FROM reservas
WHERE codigo_reserva = 'GU4RCJ'
ORDER BY created_at DESC;

-- 8. VERIFICAR SI HAY PAGOS ASOCIADOS
-- ============================================
SELECT * FROM pagos
WHERE reservation_code = 'GU4RCJ'
   OR bloqueo_id IN (
     SELECT id FROM bloqueos_temporales 
     WHERE codigo_reserva = 'GU4RCJ'
   );

-- 9. VERIFICAR BLOQUEOS TEMPORALES ASOCIADOS
-- ============================================
SELECT * FROM bloqueos_temporales
WHERE codigo_reserva = 'GU4RCJ'
ORDER BY creado_en DESC;

-- 10. DIAGNÓSTICO COMPLETO - TODAS LAS RESERVAS DEL COMPLEJO BORDE RÍO
-- ============================================
SELECT 
  r.codigo_reserva,
  r.estado,
  r.tipo_reserva,
  r.precio_total,
  r.monto_abonado,
  r.email_cliente,
  r.created_at,
  r.admin_id,
  u.email as creado_por,
  u.rol as rol_creador,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM gastos_ingresos gi 
      WHERE gi.descripcion LIKE '%' || r.codigo_reserva || '%'
    ) THEN 'SÍ'
    ELSE 'NO'
  END as en_control_financiero
FROM reservas r
LEFT JOIN usuarios u ON r.admin_id = u.id
JOIN canchas c ON r.cancha_id = c.id
JOIN complejos comp ON c.complejo_id = comp.id
WHERE comp.id = 7  -- ID del complejo Borde Río en producción
   OR comp.nombre ILIKE '%borde%rio%'
ORDER BY r.created_at DESC
LIMIT 20;

-- ============================================
-- ANÁLISIS ESPECÍFICO PARA GU4RCJ
-- ============================================

-- Verificar condiciones del trigger para GU4RCJ
SELECT 
  'Estado' as condicion,
  CASE 
    WHEN estado = 'confirmada' THEN '✅ CUMPLE (confirmada)'
    ELSE '❌ NO CUMPLE (' || estado || ')'
  END as resultado
FROM reservas
WHERE codigo_reserva = 'GU4RCJ'

UNION ALL

SELECT 
  'Precio Total' as condicion,
  CASE 
    WHEN precio_total > 0 THEN '✅ CUMPLE ($' || precio_total || ')'
    ELSE '❌ NO CUMPLE ($' || COALESCE(precio_total::text, 'NULL') || ')'
  END as resultado
FROM reservas
WHERE codigo_reserva = 'GU4RCJ'

UNION ALL

SELECT 
  'Email Cliente' as condicion,
  CASE 
    WHEN email_cliente IS NOT NULL AND email_cliente != '' THEN '✅ CUMPLE (' || email_cliente || ')'
    ELSE '❌ NO CUMPLE (vacío o NULL)'
  END as resultado
FROM reservas
WHERE codigo_reserva = 'GU4RCJ'

UNION ALL

SELECT 
  'Categorías Existen' as condicion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM categorias_gastos cg
      JOIN canchas c ON c.complejo_id = cg.complejo_id
      JOIN reservas r ON r.cancha_id = c.id
      WHERE r.codigo_reserva = 'GU4RCJ'
        AND cg.tipo = 'ingreso'
        AND (cg.nombre = 'Reservas Web' OR cg.nombre = 'Reservas Administrativas')
    ) THEN '✅ CUMPLE'
    ELSE '❌ NO CUMPLE (no existen categorías)'
  END as resultado;


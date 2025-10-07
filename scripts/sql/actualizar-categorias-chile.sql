-- ============================================
-- ACTUALIZAR CATEGORÍAS A TÉRMINOS CHILENOS SIMPLES
-- Para complejos deportivos en Chile (pueblos pequeños)
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: INSERTAR NUEVAS CATEGORÍAS SIMPLES
-- ============================================

-- CATEGORÍAS DE GASTOS
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo, es_predefinida) VALUES
-- Gastos de Personal
('Sueldos', 'Pago de sueldos a trabajadores', 'fas fa-users', '#3498db', 'gasto', true),

-- Servicios Básicos
('Luz', 'Cuenta de electricidad', 'fas fa-bolt', '#f39c12', 'gasto', true),
('Agua', 'Cuenta de agua', 'fas fa-tint', '#3498db', 'gasto', true),
('Internet', 'Internet y teléfono', 'fas fa-wifi', '#1abc9c', 'gasto', true),

-- Mantenimiento
('Mantención Cancha', 'Arreglos y mantención de canchas', 'fas fa-tools', '#27ae60', 'gasto', true),
('Aseo', 'Productos de limpieza y aseo', 'fas fa-broom', '#16a085', 'gasto', true),
('Balones y Redes', 'Compra de balones, redes y equipo deportivo', 'fas fa-futbol', '#2980b9', 'gasto', true),

-- Otros gastos
('Arriendo', 'Arriendo del local o terreno', 'fas fa-building', '#9b59b6', 'gasto', true),
('Publicidad', 'Carteles, volantes, redes sociales', 'fas fa-ad', '#e91e63', 'gasto', true),
('Otros Gastos', 'Otros gastos varios', 'fas fa-ellipsis-h', '#bdc3c7', 'gasto', true)

ON CONFLICT (nombre) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    color = EXCLUDED.color,
    tipo = EXCLUDED.tipo;

-- CATEGORÍAS DE INGRESOS
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo, es_predefinida) VALUES
('Reservas Web', 'Reservas hechas por la página web', 'fas fa-globe', '#27ae60', 'ingreso', true),
('Reservas en Cancha', 'Reservas hechas directamente en la cancha', 'fas fa-hand-holding-usd', '#2ecc71', 'ingreso', true),
('Arriendo Balones', 'Arriendo de balones y equipamiento', 'fas fa-shopping-bag', '#1abc9c', 'ingreso', true),
('Venta Bebidas', 'Venta de bebidas y snacks', 'fas fa-shopping-cart', '#16a085', 'ingreso', true),
('Torneos', 'Organización de torneos y campeonatos', 'fas fa-trophy', '#f39c12', 'ingreso', true),
('Otros Ingresos', 'Otros ingresos varios', 'fas fa-plus-circle', '#95a5a6', 'ingreso', true)

ON CONFLICT (nombre) DO UPDATE SET
    descripcion = EXCLUDED.descripcion,
    icono = EXCLUDED.icono,
    color = EXCLUDED.color,
    tipo = EXCLUDED.tipo;

-- CATEGORÍA ESPECIAL PARA COMISIONES (automática)
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo, es_predefinida) VALUES
('Comisión Plataforma', 'Comisión cobrada por uso de la plataforma web', 'fas fa-percent', '#e91e63', 'gasto', true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- PASO 2: MIGRAR MOVIMIENTOS EXISTENTES
-- ============================================

-- Migrar movimientos de categorías antiguas a nuevas

-- Sueldos y Honorarios → Sueldos
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Sueldos' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Sueldos y Honorarios');

-- Electricidad → Luz
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Luz' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Electricidad');

-- Internet y Telefonía → Internet
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Internet' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre IN ('Internet y Telefonía', 'Internet'));

-- Mantenimiento Canchas → Mantención Cancha
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Mantención Cancha' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Mantenimiento Canchas');

-- Materiales de Limpieza → Aseo
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Aseo' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Materiales de Limpieza');

-- Equipamiento Deportivo → Balones y Redes
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Balones y Redes' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Equipamiento Deportivo');

-- Arriendos y Cánones → Arriendo
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Arriendo' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Arriendos y Cánones');

-- Publicidad Digital/Física/Marketing → Publicidad
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Publicidad' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre IN ('Publicidad Digital', 'Publicidad Física', 'Marketing y Promociones'));

-- Otras categorías complejas → Otros Gastos
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Otros Gastos' LIMIT 1)
WHERE categoria_id IN (
    SELECT id FROM categorias_gastos 
    WHERE nombre IN ('Seguros', 'Contabilidad y Legal', 'Seguridad', 'Permisos y Licencias', 'Impuestos', 'Iluminación')
);

-- INGRESOS: Reservas Online → Reservas Web
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Reservas Web' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Reservas Online');

-- Reservas Presenciales → Reservas en Cancha
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Reservas en Cancha' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Reservas Presenciales');

-- Arriendo de Equipos → Arriendo Balones
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Arriendo Balones' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Arriendo de Equipos');

-- Venta de Productos → Venta Bebidas
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Venta Bebidas' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Venta de Productos');

-- Eventos y Torneos → Torneos
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Torneos' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Eventos y Torneos');

-- Publicidad Externa → Otros Ingresos
UPDATE gastos_ingresos 
SET categoria_id = (SELECT id FROM categorias_gastos WHERE nombre = 'Otros Ingresos' LIMIT 1)
WHERE categoria_id IN (SELECT id FROM categorias_gastos WHERE nombre = 'Publicidad Externa');

-- ============================================
-- PASO 3: ELIMINAR CATEGORÍAS ANTIGUAS
-- ============================================

-- Eliminar categorías antiguas complejas de GASTOS
DELETE FROM categorias_gastos WHERE nombre IN (
    'Sueldos y Honorarios',
    'Electricidad',
    'Mantenimiento Canchas',
    'Materiales de Limpieza',
    'Equipamiento Deportivo',
    'Arriendos y Cánones',
    'Seguros',
    'Contabilidad y Legal',
    'Publicidad Digital',
    'Publicidad Física',
    'Marketing y Promociones',
    'Seguridad',
    'Permisos y Licencias',
    'Impuestos',
    'Iluminación'
);

-- Eliminar categorías antiguas de INGRESOS
DELETE FROM categorias_gastos WHERE nombre IN (
    'Reservas Online',
    'Reservas Presenciales',
    'Arriendo de Equipos',
    'Venta de Productos',
    'Eventos y Torneos',
    'Publicidad Externa'
);

COMMIT;

-- ============================================
-- VERIFICAR CATEGORÍAS
-- ============================================

SELECT 
    tipo,
    nombre,
    descripcion,
    icono,
    color,
    es_predefinida,
    COUNT(*) OVER (PARTITION BY tipo) as total_por_tipo
FROM categorias_gastos
ORDER BY tipo DESC, nombre ASC;

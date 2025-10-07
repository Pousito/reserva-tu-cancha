-- ============================================
-- ACTUALIZAR CATEGORÍAS A TÉRMINOS CHILENOS SIMPLES
-- Para complejos deportivos en Chile (pueblos pequeños)
-- ============================================

-- Limpiar categorías anteriores (opcional, comentar si no quieres perder datos)
-- DELETE FROM categorias_gastos WHERE es_predefinida = true;

-- Actualizar categorías existentes o insertar nuevas
-- Usar UPSERT para no duplicar

-- ============================================
-- CATEGORÍAS DE GASTOS
-- ============================================

-- Eliminar categorías antiguas complejas
DELETE FROM categorias_gastos WHERE nombre IN (
    'Sueldos y Honorarios',
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

-- Insertar categorías simples chilenas
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

-- ============================================
-- CATEGORÍAS DE INGRESOS
-- ============================================

-- Eliminar categorías antiguas de ingresos
DELETE FROM categorias_gastos WHERE nombre IN (
    'Reservas Online',
    'Reservas Presenciales',
    'Arriendo de Equipos',
    'Venta de Productos',
    'Eventos y Torneos',
    'Publicidad Externa'
);

-- Insertar categorías simples de ingresos
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

-- ============================================
-- VERIFICAR CATEGORÍAS
-- ============================================

-- Mostrar todas las categorías actualizadas
SELECT 
    tipo,
    nombre,
    descripcion,
    icono,
    color
FROM categorias_gastos
ORDER BY tipo DESC, nombre ASC;


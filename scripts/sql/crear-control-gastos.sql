-- ============================================
-- CONTROL DE GASTOS E INGRESOS
-- Sistema para que owners gestionen finanzas
-- ============================================

-- Tabla: categorias_gastos
-- Categorías predefinidas de gastos
CREATE TABLE IF NOT EXISTS categorias_gastos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    icono VARCHAR(50), -- Clase de Font Awesome (ej: 'fa-tools', 'fa-bolt')
    color VARCHAR(20), -- Color hex para identificación visual
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
    es_predefinida BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: gastos_ingresos
-- Registro de todos los gastos e ingresos del complejo
CREATE TABLE IF NOT EXISTS gastos_ingresos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias_gastos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50), -- 'efectivo', 'transferencia', 'tarjeta', etc.
    numero_documento VARCHAR(100), -- Número de factura, boleta, etc.
    archivo_adjunto VARCHAR(255), -- Path al archivo adjunto (opcional)
    usuario_id INTEGER REFERENCES usuarios(id), -- Usuario que registró
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_complejo ON gastos_ingresos(complejo_id);
CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_fecha ON gastos_ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_tipo ON gastos_ingresos(tipo);
CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_categoria ON gastos_ingresos(categoria_id);

-- ============================================
-- CATEGORÍAS PREDEFINIDAS
-- ============================================

-- GASTOS
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo) VALUES
-- Gastos de Administración
('Sueldos y Honorarios', 'Pagos a empleados, administradores y personal', 'fa-users', '#3498db', 'gasto'),
('Arriendos y Cánones', 'Arriendo de local, equipos o terreno', 'fa-building', '#9b59b6', 'gasto'),
('Seguros', 'Seguros del complejo, responsabilidad civil', 'fa-shield-alt', '#e74c3c', 'gasto'),
('Contabilidad y Legal', 'Servicios contables, legales, notariales', 'fa-balance-scale', '#2c3e50', 'gasto'),

-- Servicios Básicos
('Electricidad', 'Consumo eléctrico mensual', 'fa-bolt', '#f39c12', 'gasto'),
('Agua', 'Consumo de agua mensual', 'fa-tint', '#3498db', 'gasto'),
('Gas', 'Consumo de gas (calefacción, duchas)', 'fa-fire', '#e67e22', 'gasto'),
('Internet y Telefonía', 'Servicios de comunicación', 'fa-wifi', '#1abc9c', 'gasto'),

-- Mantenimiento y Operación
('Mantenimiento Canchas', 'Reparación y mantención de canchas', 'fa-tools', '#27ae60', 'gasto'),
('Materiales de Limpieza', 'Productos de aseo y limpieza', 'fa-broom', '#16a085', 'gasto'),
('Equipamiento Deportivo', 'Balones, redes, arcos, etc.', 'fa-futbol', '#2980b9', 'gasto'),
('Iluminación', 'Mantención y reparación de luces', 'fa-lightbulb', '#f1c40f', 'gasto'),

-- Marketing y Publicidad
('Publicidad Digital', 'Anuncios en redes sociales, Google Ads', 'fa-ad', '#e91e63', 'gasto'),
('Publicidad Física', 'Volantes, banners, señalética', 'fa-sign', '#9c27b0', 'gasto'),
('Marketing y Promociones', 'Campañas promocionales, descuentos', 'fa-bullhorn', '#ff5722', 'gasto'),

-- Otros
('Seguridad', 'Servicio de guardias, alarmas, cámaras', 'fa-lock', '#34495e', 'gasto'),
('Permisos y Licencias', 'Permisos municipales, patentes', 'fa-file-contract', '#95a5a6', 'gasto'),
('Impuestos', 'IVA, impuestos municipales', 'fa-receipt', '#7f8c8d', 'gasto'),
('Otros Gastos', 'Gastos misceláneos no categorizados', 'fa-ellipsis-h', '#bdc3c7', 'gasto')

ON CONFLICT (nombre) DO NOTHING;

-- INGRESOS
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo) VALUES
('Reservas Online', 'Ingresos por reservas desde la web', 'fa-globe', '#27ae60', 'ingreso'),
('Reservas Presenciales', 'Ingresos por reservas en el complejo', 'fa-hand-holding-usd', '#2ecc71', 'ingreso'),
('Arriendo de Equipos', 'Arriendo de balones, petos, etc.', 'fa-shopping-bag', '#1abc9c', 'ingreso'),
('Venta de Productos', 'Venta de bebidas, snacks, merchandising', 'fa-shopping-cart', '#16a085', 'ingreso'),
('Eventos y Torneos', 'Ingresos por organización de eventos', 'fa-trophy', '#f39c12', 'ingreso'),
('Publicidad Externa', 'Ingresos por publicidad de sponsors', 'fa-dollar-sign', '#e67e22', 'ingreso'),
('Otros Ingresos', 'Ingresos misceláneos', 'fa-plus-circle', '#95a5a6', 'ingreso')

ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_gastos_ingresos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gastos_ingresos ON gastos_ingresos;
CREATE TRIGGER trigger_update_gastos_ingresos
    BEFORE UPDATE ON gastos_ingresos
    FOR EACH ROW
    EXECUTE FUNCTION update_gastos_ingresos_timestamp();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Resumen de gastos por categoría y mes
CREATE OR REPLACE VIEW v_gastos_por_categoria AS
SELECT 
    gi.complejo_id,
    c.nombre as complejo_nombre,
    cat.nombre as categoria,
    cat.icono,
    cat.color,
    DATE_TRUNC('month', gi.fecha) as mes,
    SUM(gi.monto) as total_monto,
    COUNT(*) as cantidad_registros
FROM gastos_ingresos gi
JOIN categorias_gastos cat ON gi.categoria_id = cat.id
JOIN complejos c ON gi.complejo_id = c.id
WHERE gi.tipo = 'gasto'
GROUP BY gi.complejo_id, c.nombre, cat.nombre, cat.icono, cat.color, DATE_TRUNC('month', gi.fecha);

-- Vista: Resumen de ingresos por categoría y mes
CREATE OR REPLACE VIEW v_ingresos_por_categoria AS
SELECT 
    gi.complejo_id,
    c.nombre as complejo_nombre,
    cat.nombre as categoria,
    cat.icono,
    cat.color,
    DATE_TRUNC('month', gi.fecha) as mes,
    SUM(gi.monto) as total_monto,
    COUNT(*) as cantidad_registros
FROM gastos_ingresos gi
JOIN categorias_gastos cat ON gi.categoria_id = cat.id
JOIN complejos c ON gi.complejo_id = c.id
WHERE gi.tipo = 'ingreso'
GROUP BY gi.complejo_id, c.nombre, cat.nombre, cat.icono, cat.color, DATE_TRUNC('month', gi.fecha);

-- Vista: Balance mensual por complejo
CREATE OR REPLACE VIEW v_balance_mensual AS
SELECT 
    complejo_id,
    DATE_TRUNC('month', fecha) as mes,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance
FROM gastos_ingresos
GROUP BY complejo_id, DATE_TRUNC('month', fecha);

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================
COMMENT ON TABLE categorias_gastos IS 'Categorías de gastos e ingresos para clasificación';
COMMENT ON TABLE gastos_ingresos IS 'Registro histórico de gastos e ingresos por complejo';
COMMENT ON VIEW v_gastos_por_categoria IS 'Resumen de gastos agrupados por categoría y mes';
COMMENT ON VIEW v_ingresos_por_categoria IS 'Resumen de ingresos agrupados por categoría y mes';
COMMENT ON VIEW v_balance_mensual IS 'Balance financiero mensual por complejo';


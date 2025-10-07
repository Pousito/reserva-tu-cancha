-- ============================================
-- CONTROL DE GASTOS E INGRESOS - PRODUCCIÓN
-- Sistema para que owners gestionen finanzas
-- ============================================

-- Tabla: categorias_gastos (CON complejo_id desde el principio)
CREATE TABLE IF NOT EXISTS categorias_gastos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50), -- Clase de Font Awesome (ej: 'fas fa-bolt')
    color VARCHAR(20), -- Color hex para identificación visual
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
    es_predefinida BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nombre, complejo_id) -- Permitir mismo nombre en diferentes complejos
);

-- Tabla: gastos_ingresos
CREATE TABLE IF NOT EXISTS gastos_ingresos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias_gastos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('gasto', 'ingreso')),
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50), -- 'efectivo', 'transferencia', 'tarjeta', 'automatico'
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
CREATE INDEX IF NOT EXISTS idx_categorias_gastos_complejo ON categorias_gastos(complejo_id);

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
-- TRIGGERS PARA SINCRONIZAR RESERVAS
-- ============================================

-- Función para sincronizar reservas confirmadas con ingresos
CREATE OR REPLACE FUNCTION sincronizar_reserva_ingresos()
RETURNS TRIGGER AS $$
DECLARE
    categoria_ingreso_id INTEGER;
    categoria_comision_id INTEGER;
    precio_total DECIMAL(10,2);
    comision_monto DECIMAL(10,2);
    tipo_reserva_texto TEXT;
BEGIN
    -- Solo procesar cuando una reserva pasa a estado 'confirmada'
    IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado != 'confirmada') THEN
        
        -- Buscar categoría de ingresos para este complejo
        SELECT id INTO categoria_ingreso_id
        FROM categorias_gastos
        WHERE complejo_id = (SELECT complejo_id FROM canchas WHERE id = NEW.cancha_id)
        AND tipo = 'ingreso'
        AND nombre = 'Reservas Web'
        LIMIT 1;
        
        -- Buscar categoría de comisión para este complejo
        SELECT id INTO categoria_comision_id
        FROM categorias_gastos
        WHERE complejo_id = (SELECT complejo_id FROM canchas WHERE id = NEW.cancha_id)
        AND tipo = 'gasto'
        AND nombre = 'Comisión Plataforma'
        LIMIT 1;
        
        -- Si no existen las categorías, no hacer nada (evitar errores)
        IF categoria_ingreso_id IS NULL OR categoria_comision_id IS NULL THEN
            RAISE NOTICE 'Categorías no encontradas para complejo, saltando sincronización';
            RETURN NEW;
        END IF;
        
        precio_total := COALESCE(NEW.precio_total, 0);
        comision_monto := COALESCE(NEW.comision_aplicada, 0);
        
        tipo_reserva_texto := CASE 
            WHEN NEW.tipo_reserva = 'directa' THEN 'Web (3.5% + IVA)'
            WHEN NEW.tipo_reserva = 'administrativa' THEN 'Admin (1.75% + IVA)'
            ELSE 'Reserva'
        END;
        
        -- Crear ingreso por la reserva
        IF precio_total > 0 THEN
            INSERT INTO gastos_ingresos (
                complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago, usuario_id
            ) VALUES (
                (SELECT complejo_id FROM canchas WHERE id = NEW.cancha_id),
                categoria_ingreso_id,
                'ingreso',
                precio_total,
                NEW.fecha::DATE,
                'Reserva #' || NEW.codigo_reserva || ' - ' || (SELECT nombre FROM canchas WHERE id = NEW.cancha_id),
                'automatico',
                NULL
            );
            RAISE NOTICE 'Ingreso registrado: $ % (Reserva # %)', precio_total, NEW.codigo_reserva;
        END IF;
        
        -- Crear gasto por comisión
        IF comision_monto > 0 THEN
            INSERT INTO gastos_ingresos (
                complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago, usuario_id
            ) VALUES (
                (SELECT complejo_id FROM canchas WHERE id = NEW.cancha_id),
                categoria_comision_id,
                'gasto',
                comision_monto,
                NEW.fecha::DATE,
                'Comisión Reserva #' || NEW.codigo_reserva || ' - ' || tipo_reserva_texto,
                'automatico',
                NULL
            );
            RAISE NOTICE 'Comisión registrada: $ % (Reserva # % - %)', comision_monto, NEW.codigo_reserva, tipo_reserva_texto;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar ingresos cuando se cancela una reserva
CREATE OR REPLACE FUNCTION eliminar_ingresos_por_reserva_cancelada()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar cuando una reserva pasa a estado 'cancelada'
    IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
        -- Eliminar todos los movimientos asociados a esta reserva
        DELETE FROM gastos_ingresos
        WHERE descripcion LIKE '%Reserva #' || NEW.codigo_reserva || '%';
        
        RAISE NOTICE 'Movimientos eliminados para reserva cancelada #%', NEW.codigo_reserva;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers
DROP TRIGGER IF EXISTS trigger_sincronizar_reserva_confirmada ON reservas;
CREATE TRIGGER trigger_sincronizar_reserva_confirmada
    AFTER INSERT OR UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_reserva_ingresos();

DROP TRIGGER IF EXISTS trigger_eliminar_ingresos_reserva_cancelada ON reservas;
CREATE TRIGGER trigger_eliminar_ingresos_reserva_cancelada
    AFTER UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION eliminar_ingresos_por_reserva_cancelada();

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
COMMENT ON TABLE categorias_gastos IS 'Categorías de gastos e ingresos por complejo para clasificación';
COMMENT ON TABLE gastos_ingresos IS 'Registro histórico de gastos e ingresos por complejo';
COMMENT ON VIEW v_gastos_por_categoria IS 'Resumen de gastos agrupados por categoría y mes';
COMMENT ON VIEW v_ingresos_por_categoria IS 'Resumen de ingresos agrupados por categoría y mes';
COMMENT ON VIEW v_balance_mensual IS 'Balance financiero mensual por complejo';


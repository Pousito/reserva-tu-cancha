-- ============================================
-- SINCRONIZACIÓN AUTOMÁTICA RESERVAS → INGRESOS
-- Cuando se confirma una reserva, se crea automáticamente:
-- 1. Un ingreso por el monto de la reserva
-- 2. Un gasto por la comisión de la plataforma
-- ============================================

-- Asegurarse de que existen las categorías necesarias
INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo, es_predefinida) VALUES
('Reservas Web', 'Reservas hechas por la página web', 'fas fa-globe', '#27ae60', 'ingreso', true),
('Comisión Plataforma', 'Comisión cobrada por uso de la plataforma web', 'fas fa-percent', '#e74c3c', 'gasto', true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- FUNCIÓN PARA SINCRONIZAR RESERVA CONFIRMADA
-- ============================================

CREATE OR REPLACE FUNCTION sincronizar_reserva_ingresos()
RETURNS TRIGGER AS $$
DECLARE
    categoria_ingreso_id INTEGER;
    categoria_comision_id INTEGER;
    precio_total DECIMAL(10,2);
    comision_monto DECIMAL(10,2);
    comision_porcentaje DECIMAL(5,2) := 0.10; -- 10% de comisión
BEGIN
    -- Solo procesar cuando el estado cambia a 'confirmada'
    IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado != 'confirmada') THEN
        
        -- Obtener IDs de categorías
        SELECT id INTO categoria_ingreso_id 
        FROM categorias_gastos 
        WHERE nombre = 'Reservas Web' AND tipo = 'ingreso';
        
        SELECT id INTO categoria_comision_id 
        FROM categorias_gastos 
        WHERE nombre = 'Comisión Plataforma' AND tipo = 'gasto';
        
        -- Si no existen las categorías, salir sin error
        IF categoria_ingreso_id IS NULL OR categoria_comision_id IS NULL THEN
            RAISE WARNING 'Categorías de ingreso/gasto no encontradas. No se sincronizará la reserva.';
            RETURN NEW;
        END IF;
        
        -- Calcular monto total y comisión
        precio_total := COALESCE(NEW.precio_total, 0);
        comision_monto := ROUND(precio_total * comision_porcentaje, 0); -- Redondear a entero
        
        -- Solo crear registros si hay un precio válido
        IF precio_total > 0 THEN
            
            -- Verificar si ya existe un ingreso para esta reserva
            IF NOT EXISTS (
                SELECT 1 FROM gastos_ingresos 
                WHERE descripcion LIKE 'Reserva #' || NEW.codigo_reserva || '%'
                AND tipo = 'ingreso'
            ) THEN
                
                -- 1. Registrar INGRESO por la reserva
                INSERT INTO gastos_ingresos (
                    complejo_id,
                    categoria_id,
                    tipo,
                    monto,
                    fecha,
                    descripcion,
                    metodo_pago,
                    usuario_id
                ) VALUES (
                    NEW.complejo_id,
                    categoria_ingreso_id,
                    'ingreso',
                    precio_total,
                    NEW.fecha::DATE,
                    'Reserva #' || NEW.codigo_reserva || ' - ' || NEW.nombre_cliente,
                    CASE 
                        WHEN NEW.metodo_pago = 'webpay' THEN 'transferencia'
                        WHEN NEW.metodo_pago = 'efectivo' THEN 'efectivo'
                        ELSE 'otro'
                    END,
                    NULL
                );
                
                RAISE NOTICE 'Ingreso registrado: $% (Reserva #%)', precio_total, NEW.codigo_reserva;
            END IF;
            
            -- Verificar si ya existe un gasto de comisión para esta reserva
            IF NOT EXISTS (
                SELECT 1 FROM gastos_ingresos 
                WHERE descripcion LIKE 'Comisión Reserva #' || NEW.codigo_reserva || '%'
                AND tipo = 'gasto'
            ) THEN
                
                -- 2. Registrar GASTO por comisión (solo para reservas web, no presenciales)
                IF NEW.tipo = 'directa' OR NEW.metodo_pago = 'webpay' THEN
                    INSERT INTO gastos_ingresos (
                        complejo_id,
                        categoria_id,
                        tipo,
                        monto,
                        fecha,
                        descripcion,
                        metodo_pago,
                        usuario_id
                    ) VALUES (
                        NEW.complejo_id,
                        categoria_comision_id,
                        'gasto',
                        comision_monto,
                        NEW.fecha::DATE,
                        'Comisión Reserva #' || NEW.codigo_reserva || ' (' || (comision_porcentaje * 100)::INTEGER || '%)',
                        'automatico',
                        NULL
                    );
                    
                    RAISE NOTICE 'Comisión registrada: $% (Reserva #%)', comision_monto, NEW.codigo_reserva;
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA SINCRONIZAR EN INSERT/UPDATE
-- ============================================

DROP TRIGGER IF EXISTS trigger_sincronizar_reserva_ingresos ON reservas;

CREATE TRIGGER trigger_sincronizar_reserva_ingresos
    AFTER INSERT OR UPDATE OF estado, precio_total
    ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION sincronizar_reserva_ingresos();

-- ============================================
-- FUNCIÓN PARA ELIMINAR INGRESOS SI SE CANCELA RESERVA
-- ============================================

CREATE OR REPLACE FUNCTION eliminar_ingresos_reserva_cancelada()
RETURNS TRIGGER AS $$
BEGIN
    -- Si una reserva se cancela, eliminar los ingresos/gastos asociados
    IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
        
        DELETE FROM gastos_ingresos
        WHERE descripcion LIKE '%Reserva #' || NEW.codigo_reserva || '%';
        
        RAISE NOTICE 'Ingresos/gastos eliminados para reserva cancelada #%', NEW.codigo_reserva;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER PARA ELIMINAR EN CANCELACIÓN
-- ============================================

DROP TRIGGER IF EXISTS trigger_eliminar_ingresos_cancelacion ON reservas;

CREATE TRIGGER trigger_eliminar_ingresos_cancelacion
    AFTER UPDATE OF estado
    ON reservas
    FOR EACH ROW
    WHEN (NEW.estado = 'cancelada')
    EXECUTE FUNCTION eliminar_ingresos_reserva_cancelada();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Mostrar categorías creadas
SELECT 
    tipo,
    nombre,
    descripcion
FROM categorias_gastos
WHERE nombre IN ('Reservas Web', 'Comisión Plataforma');

-- Mostrar triggers activos
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%reserva%ingresos%'
ORDER BY trigger_name;

COMMENT ON FUNCTION sincronizar_reserva_ingresos() IS 'Sincroniza automáticamente las reservas confirmadas con ingresos y gastos por comisión';
COMMENT ON FUNCTION eliminar_ingresos_reserva_cancelada() IS 'Elimina los ingresos y gastos cuando una reserva es cancelada';


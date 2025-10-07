-- ============================================
-- SINCRONIZACIÓN AUTOMÁTICA RESERVAS → INGRESOS
-- Cuando se confirma una reserva, se crea automáticamente:
-- 1. Un ingreso por el monto de la reserva
-- 2. Un gasto por la comisión de la plataforma
-- ============================================

-- NOTA: Este script NO inserta categorías globales, ya que ahora las categorías
-- son específicas por complejo. Las categorías se crean al añadir un nuevo complejo.

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
    tipo_reserva_texto TEXT;
    complejo_id_reserva INTEGER;
BEGIN
    -- Solo procesar cuando el estado cambia a 'confirmada'
    IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado != 'confirmada') THEN
        
        -- Obtener complejo_id a partir de la cancha
        SELECT complejo_id INTO complejo_id_reserva
        FROM canchas
        WHERE id = NEW.cancha_id;
        
        IF complejo_id_reserva IS NULL THEN
            RAISE WARNING 'No se pudo obtener complejo_id para cancha_id %', NEW.cancha_id;
            RETURN NEW;
        END IF;
        
        -- Buscar categoría de ingresos para este complejo
        SELECT id INTO categoria_ingreso_id
        FROM categorias_gastos
        WHERE complejo_id = complejo_id_reserva
        AND tipo = 'ingreso'
        AND nombre = 'Reservas Web'
        LIMIT 1;
        
        -- Buscar categoría de comisión para este complejo
        SELECT id INTO categoria_comision_id
        FROM categorias_gastos
        WHERE complejo_id = complejo_id_reserva
        AND tipo = 'gasto'
        AND nombre = 'Comisión Plataforma'
        LIMIT 1;
        
        -- Si no existen las categorías, no hacer nada (evitar errores)
        IF categoria_ingreso_id IS NULL OR categoria_comision_id IS NULL THEN
            RAISE NOTICE 'Categorías no encontradas para complejo %, saltando sincronización', complejo_id_reserva;
            RETURN NEW;
        END IF;
        
        -- Obtener precio total y comisión REAL ya calculada en la reserva
        precio_total := COALESCE(NEW.precio_total, 0);
        comision_monto := COALESCE(NEW.comision_aplicada, 0); -- Usar comisión ya calculada
        
        -- Determinar tipo de reserva para descripción
        tipo_reserva_texto := CASE 
            WHEN NEW.tipo_reserva = 'directa' THEN 'Web (3.5% + IVA)'
            WHEN NEW.tipo_reserva = 'administrativa' THEN 'Admin (1.75% + IVA)'
            ELSE 'Reserva'
        END;
        
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
                    complejo_id_reserva,
                    categoria_ingreso_id,
                    'ingreso',
                    precio_total,
                    NEW.fecha::DATE,
                    'Reserva #' || NEW.codigo_reserva || ' - ' || (SELECT nombre FROM canchas WHERE id = NEW.cancha_id),
                    'automatico',
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
                
                -- 2. Registrar GASTO por comisión (solo si hay comisión > 0)
                IF comision_monto > 0 THEN
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
                        complejo_id_reserva,
                        categoria_comision_id,
                        'gasto',
                        comision_monto,
                        NEW.fecha::DATE,
                        'Comisión Reserva #' || NEW.codigo_reserva || ' - ' || tipo_reserva_texto,
                        'automatico',
                        NULL
                    );
                    
                    RAISE NOTICE 'Comisión registrada: $% (Reserva #% - %)', comision_monto, NEW.codigo_reserva, tipo_reserva_texto;
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

-- Mostrar triggers activos
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name LIKE '%reserva%ingresos%'
ORDER BY trigger_name;

COMMENT ON FUNCTION sincronizar_reserva_ingresos() IS 'Sincroniza automáticamente las reservas confirmadas con ingresos y gastos por comisión. Obtiene complejo_id mediante JOIN con tabla canchas.';
COMMENT ON FUNCTION eliminar_ingresos_reserva_cancelada() IS 'Elimina los ingresos y gastos cuando una reserva es cancelada';

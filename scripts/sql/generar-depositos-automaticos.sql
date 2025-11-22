-- ============================================
-- GENERACIÓN AUTOMÁTICA DE DEPÓSITOS
-- Cuando se confirma una reserva, se genera automáticamente
-- un depósito para el complejo correspondiente
-- ============================================

-- Función para generar depósito automáticamente
CREATE OR REPLACE FUNCTION generar_deposito_automatico()
RETURNS TRIGGER AS $$
DECLARE
    complejo_id_reserva INTEGER;
    fecha_deposito DATE;
    monto_total_reservas INTEGER;
    comision_porcentaje DECIMAL(5,4);
    comision_sin_iva INTEGER;
    iva_comision INTEGER;
    comision_total INTEGER;
    monto_a_depositar INTEGER;
    tipo_reserva_actual TEXT;
BEGIN
    -- Solo procesar cuando una reserva pasa a estado 'confirmada'
    IF NEW.estado = 'confirmada' AND (OLD.estado IS NULL OR OLD.estado != 'confirmada') THEN
        
        -- Obtener complejo_id a partir de la cancha
        SELECT complejo_id INTO complejo_id_reserva
        FROM canchas
        WHERE id = NEW.cancha_id;
        
        IF complejo_id_reserva IS NULL THEN
            RAISE WARNING 'No se pudo obtener complejo_id para cancha_id %', NEW.cancha_id;
            RETURN NEW;
        END IF;
        
        -- Usar la fecha de la reserva como fecha de depósito
        fecha_deposito := NEW.fecha::DATE;
        
        -- Determinar porcentaje de comisión según tipo de reserva
        tipo_reserva_actual := COALESCE(NEW.tipo_reserva, 'directa');
        
        IF tipo_reserva_actual = 'directa' THEN
            comision_porcentaje := 0.0350; -- 3.5% para reservas web
        ELSIF tipo_reserva_actual = 'administrativa' THEN
            comision_porcentaje := 0.0175; -- 1.75% para reservas administrativas
        ELSE
            comision_porcentaje := 0.0350; -- Default a 3.5%
        END IF;
        
        -- Calcular montos
        monto_total_reservas := COALESCE(NEW.precio_total, 0);
        comision_sin_iva := ROUND(monto_total_reservas * comision_porcentaje);
        iva_comision := ROUND(comision_sin_iva * 0.19); -- 19% IVA
        comision_total := comision_sin_iva + iva_comision;
        monto_a_depositar := monto_total_reservas - comision_total;
        
        -- Verificar si ya existe un depósito para este complejo y fecha
        IF NOT EXISTS (
            SELECT 1 FROM depositos_complejos 
            WHERE complejo_id = complejo_id_reserva 
            AND fecha_deposito = fecha_deposito
            AND estado = 'pendiente'
        ) THEN
            -- Crear nuevo depósito
            INSERT INTO depositos_complejos (
                complejo_id,
                fecha_deposito,
                monto_total_reservas,
                comision_porcentaje,
                comision_sin_iva,
                iva_comision,
                comision_total,
                monto_a_depositar,
                estado,
                observaciones,
                created_at,
                updated_at
            ) VALUES (
                complejo_id_reserva,
                fecha_deposito,
                monto_total_reservas,
                comision_porcentaje,
                comision_sin_iva,
                iva_comision,
                comision_total,
                monto_a_depositar,
                'pendiente',
                'Generado automáticamente por reserva confirmada',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            RAISE NOTICE 'Depósito creado automáticamente: Complejo %, Fecha %, Monto $%', 
                complejo_id_reserva, fecha_deposito, monto_a_depositar;
        ELSE
            -- Actualizar depósito existente
            UPDATE depositos_complejos 
            SET 
                monto_total_reservas = monto_total_reservas + NEW.precio_total,
                comision_sin_iva = ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje),
                iva_comision = ROUND(ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje) * 0.19),
                comision_total = ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje) + ROUND(ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje) * 0.19),
                monto_a_depositar = (monto_total_reservas + NEW.precio_total) - (ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje) + ROUND(ROUND((monto_total_reservas + NEW.precio_total) * comision_porcentaje) * 0.19)),
                updated_at = CURRENT_TIMESTAMP
            WHERE complejo_id = complejo_id_reserva 
            AND fecha_deposito = fecha_deposito
            AND estado = 'pendiente';
            
            RAISE NOTICE 'Depósito actualizado: Complejo %, Fecha %, Nuevo total $%', 
                complejo_id_reserva, fecha_deposito, monto_total_reservas + NEW.precio_total;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en la tabla reservas
DROP TRIGGER IF EXISTS trigger_generar_deposito_automatico ON reservas;
CREATE TRIGGER trigger_generar_deposito_automatico
    AFTER INSERT OR UPDATE ON reservas
    FOR EACH ROW
    EXECUTE FUNCTION generar_deposito_automatico();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generar_deposito_automatico';








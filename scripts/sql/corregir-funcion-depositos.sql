-- ============================================
-- FUNCIÓN CORREGIDA PARA GENERAR DEPÓSITOS DIARIOS
-- ============================================

CREATE OR REPLACE FUNCTION generar_depositos_diarios(fecha_deposito DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    complejo_id INTEGER,
    monto_total INTEGER,
    comision_total INTEGER,
    monto_deposito INTEGER,
    registros_procesados INTEGER
) AS $$
DECLARE
    rec RECORD;
    total_reservas INTEGER;
    comision_sin_iva INTEGER;
    iva_comision INTEGER;
    comision_total INTEGER;
    monto_deposito INTEGER;
    porcentaje_aplicado DECIMAL(5,4);
    reservas_procesadas INTEGER;
BEGIN
    -- Iterar por cada complejo que tenga reservas confirmadas en la fecha
    FOR rec IN 
        SELECT DISTINCT c.id as comp_id, c.nombre as comp_nombre
        FROM complejos c
        JOIN canchas ca ON c.id = ca.complejo_id
        JOIN reservas r ON ca.id = r.cancha_id
        WHERE r.fecha = fecha_deposito
        AND r.estado = 'confirmada'
        AND r.estado_pago = 'pagado'
    LOOP
        -- Calcular totales para este complejo en esta fecha
        SELECT 
            COALESCE(SUM(r.precio_total), 0),
            COUNT(*)
        INTO total_reservas, reservas_procesadas
        FROM reservas r
        JOIN canchas ca ON r.cancha_id = ca.id
        WHERE ca.complejo_id = rec.comp_id
        AND r.fecha = fecha_deposito
        AND r.estado = 'confirmada'
        AND r.estado_pago = 'pagado';
        
        -- Solo procesar si hay reservas
        IF total_reservas > 0 THEN
            -- Calcular comisiones por tipo de reserva
            SELECT 
                SUM(
                    CASE 
                        WHEN r.tipo_reserva = 'administrativa' THEN 
                            ROUND(r.precio_total * 0.0175) -- 1.75%
                        ELSE 
                            ROUND(r.precio_total * 0.035) -- 3.5%
                    END
                ),
                SUM(
                    CASE 
                        WHEN r.tipo_reserva = 'administrativa' THEN 
                            ROUND(r.precio_total * 0.0175 * 0.19) -- IVA sobre 1.75%
                        ELSE 
                            ROUND(r.precio_total * 0.035 * 0.19) -- IVA sobre 3.5%
                    END
                )
            INTO comision_sin_iva, iva_comision
            FROM reservas r
            JOIN canchas ca ON r.cancha_id = ca.id
            WHERE ca.complejo_id = rec.comp_id
            AND r.fecha = fecha_deposito
            AND r.estado = 'confirmada'
            AND r.estado_pago = 'pagado';
            
            comision_total := comision_sin_iva + iva_comision;
            monto_deposito := total_reservas - comision_total;
            
            -- Determinar porcentaje promedio aplicado
            porcentaje_aplicado := CASE 
                WHEN total_reservas > 0 THEN 
                    ROUND((comision_sin_iva::DECIMAL / total_reservas), 4)
                ELSE 0 
            END;
            
            -- Insertar o actualizar depósito
            INSERT INTO depositos_complejos (
                complejo_id, fecha_deposito, monto_total_reservas,
                comision_porcentaje, comision_sin_iva, iva_comision, comision_total,
                monto_a_depositar
            ) VALUES (
                rec.comp_id, fecha_deposito, total_reservas,
                porcentaje_aplicado, comision_sin_iva, iva_comision, comision_total,
                monto_deposito
            )
            ON CONFLICT (complejo_id, fecha_deposito) 
            DO UPDATE SET
                monto_total_reservas = EXCLUDED.monto_total_reservas,
                comision_porcentaje = EXCLUDED.comision_porcentaje,
                comision_sin_iva = EXCLUDED.comision_sin_iva,
                iva_comision = EXCLUDED.iva_comision,
                comision_total = EXCLUDED.comision_total,
                monto_a_depositar = EXCLUDED.monto_a_depositar,
                updated_at = CURRENT_TIMESTAMP;
            
            -- Retornar datos del depósito procesado
            RETURN QUERY SELECT 
                rec.comp_id,
                total_reservas,
                comision_total,
                monto_deposito,
                reservas_procesadas;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

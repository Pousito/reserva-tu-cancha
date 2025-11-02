-- ============================================
-- SISTEMA DE GESTIÓN DE DEPÓSITOS A COMPLEJOS
-- Tabla para controlar depósitos diarios con comisiones + IVA
-- ============================================

-- Tabla principal para depósitos diarios
CREATE TABLE IF NOT EXISTS depositos_complejos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
    fecha_deposito DATE NOT NULL,
    
    -- Montos calculados
    monto_total_reservas INTEGER NOT NULL, -- Total de reservas del día
    comision_porcentaje DECIMAL(5,4) NOT NULL, -- Porcentaje aplicado (0.035 o 0.0175)
    comision_sin_iva INTEGER NOT NULL, -- Comisión sin IVA
    iva_comision INTEGER NOT NULL, -- IVA sobre la comisión
    comision_total INTEGER NOT NULL, -- Comisión total (con IVA)
    monto_a_depositar INTEGER NOT NULL, -- Monto final a depositar al complejo
    
    -- Control de estado
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
    
    -- Detalles del pago (cuando se marca como pagado)
    metodo_pago VARCHAR(50), -- 'transferencia', 'cheque', 'efectivo', etc.
    numero_transaccion VARCHAR(100), -- Número de transferencia, cheque, etc.
    banco_destino VARCHAR(100), -- Banco donde se realizó el depósito
    observaciones TEXT,
    
    -- Auditoría
    procesado_por INTEGER REFERENCES usuarios(id), -- Usuario que marcó como pagado
    fecha_procesado TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices únicos para evitar duplicados
    UNIQUE(complejo_id, fecha_deposito)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_depositos_complejo ON depositos_complejos(complejo_id);
CREATE INDEX IF NOT EXISTS idx_depositos_fecha ON depositos_complejos(fecha_deposito);
CREATE INDEX IF NOT EXISTS idx_depositos_estado ON depositos_complejos(estado);
CREATE INDEX IF NOT EXISTS idx_depositos_fecha_estado ON depositos_complejos(fecha_deposito, estado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_depositos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_depositos_updated_at
    BEFORE UPDATE ON depositos_complejos
    FOR EACH ROW
    EXECUTE FUNCTION update_depositos_updated_at();

-- ============================================
-- FUNCIÓN PARA CALCULAR COMISIONES CON IVA
-- ============================================

CREATE OR REPLACE FUNCTION calcular_comision_con_iva(
    monto_reserva INTEGER,
    tipo_reserva VARCHAR(20) DEFAULT 'directa'
) RETURNS TABLE(
    comision_sin_iva INTEGER,
    iva_comision INTEGER,
    comision_total INTEGER,
    porcentaje_aplicado DECIMAL(5,4)
) AS $$
DECLARE
    porcentaje_base DECIMAL(5,4);
    comision_base INTEGER;
    iva_monto INTEGER;
    comision_final INTEGER;
BEGIN
    -- Determinar porcentaje según tipo de reserva
    IF tipo_reserva = 'administrativa' THEN
        porcentaje_base := 0.0175; -- 1.75%
    ELSE
        porcentaje_base := 0.035; -- 3.5%
    END IF;
    
    -- Calcular comisión sin IVA
    comision_base := ROUND(monto_reserva * porcentaje_base);
    
    -- Calcular IVA (19% sobre la comisión)
    iva_monto := ROUND(comision_base * 0.19);
    
    -- Comisión total con IVA
    comision_final := comision_base + iva_monto;
    
    RETURN QUERY SELECT 
        comision_base,
        iva_monto,
        comision_final,
        porcentaje_base;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN PARA GENERAR DEPÓSITOS DIARIOS
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
        SELECT DISTINCT c.id as complejo_id, c.nombre as complejo_nombre
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
        WHERE ca.complejo_id = rec.complejo_id
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
            WHERE ca.complejo_id = rec.complejo_id
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
                rec.complejo_id, fecha_deposito, total_reservas,
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
                rec.complejo_id,
                total_reservas,
                comision_total,
                monto_deposito,
                reservas_procesadas;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE depositos_complejos IS 'Control de depósitos diarios a complejos con cálculo de comisiones + IVA';
COMMENT ON COLUMN depositos_complejos.comision_porcentaje IS 'Porcentaje base aplicado (0.035 para web, 0.0175 para admin)';
COMMENT ON COLUMN depositos_complejos.comision_sin_iva IS 'Comisión calculada sin IVA';
COMMENT ON COLUMN depositos_complejos.iva_comision IS 'IVA (19%) sobre la comisión';
COMMENT ON COLUMN depositos_complejos.comision_total IS 'Comisión total con IVA incluido';
COMMENT ON COLUMN depositos_complejos.monto_a_depositar IS 'Monto final que se debe depositar al complejo';

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Ejemplo de uso de la función para generar depósitos
-- SELECT * FROM generar_depositos_diarios('2024-01-15');

-- Ejemplo de consulta de depósitos pendientes
-- SELECT 
--     dc.*,
--     c.nombre as complejo_nombre
-- FROM depositos_complejos dc
-- JOIN complejos c ON dc.complejo_id = c.id
-- WHERE dc.estado = 'pendiente'
-- ORDER BY dc.fecha_deposito DESC;



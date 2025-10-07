-- ============================================
-- AGREGAR COLUMNA porcentaje_pagado A PRODUCCIÓN
-- Para soportar pagos parciales (50%)
-- ============================================

-- Agregar columna porcentaje_pagado si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reservas' 
        AND column_name = 'porcentaje_pagado'
    ) THEN
        ALTER TABLE reservas 
        ADD COLUMN porcentaje_pagado INTEGER DEFAULT 100;
        
        RAISE NOTICE 'Columna porcentaje_pagado agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna porcentaje_pagado ya existe';
    END IF;
END $$;

-- Actualizar reservas existentes para asegurar que tengan porcentaje_pagado = 100
UPDATE reservas 
SET porcentaje_pagado = 100 
WHERE porcentaje_pagado IS NULL;

-- Comentario en la columna
COMMENT ON COLUMN reservas.porcentaje_pagado IS 'Porcentaje del total pagado online (100 = pago completo, 50 = pago del 50%)';

-- Verificación
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'reservas' 
AND column_name = 'porcentaje_pagado';


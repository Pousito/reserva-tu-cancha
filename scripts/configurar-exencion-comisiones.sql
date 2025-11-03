-- Script para configurar exención de comisiones para complejos
-- Este script agrega la columna comision_inicio_fecha si no existe
-- y configura la fecha para Espacio Deportivo Borde Río

-- 1. Agregar columna si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'complejos' 
        AND column_name = 'comision_inicio_fecha'
    ) THEN
        ALTER TABLE complejos 
        ADD COLUMN comision_inicio_fecha DATE;
        RAISE NOTICE 'Columna comision_inicio_fecha agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna comision_inicio_fecha ya existe';
    END IF;
END $$;

-- 2. Configurar fecha de inicio de comisiones para Espacio Deportivo Borde Río
-- Fecha 2026-01-01 significa que las reservas hasta el 31-12-2025 NO tendrán comisión
-- A partir del 1-1-2026 se aplicarán las comisiones normalmente
UPDATE complejos 
SET comision_inicio_fecha = '2026-01-01' 
WHERE id = 7 AND nombre = 'Espacio Deportivo Borde Río';

-- 3. Verificar configuración
SELECT 
    id, 
    nombre, 
    comision_inicio_fecha,
    CASE 
        WHEN comision_inicio_fecha IS NULL THEN 'Sin fecha configurada (comisiones aplicadas por defecto)'
        WHEN comision_inicio_fecha > CURRENT_DATE THEN 'Exento hasta ' || comision_inicio_fecha::text
        ELSE 'Comisiones activas desde ' || comision_inicio_fecha::text
    END as estado_comisiones
FROM complejos 
WHERE id = 7;


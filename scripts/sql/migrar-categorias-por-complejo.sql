-- ============================================
-- MIGRACIÓN: CATEGORÍAS POR COMPLEJO
-- Cada complejo tendrá sus propias categorías
-- ============================================

BEGIN;

-- PASO 1: Agregar columna complejo_id a categorias_gastos
ALTER TABLE categorias_gastos 
ADD COLUMN IF NOT EXISTS complejo_id INTEGER REFERENCES complejos(id) ON DELETE CASCADE;

-- PASO 2: Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_categorias_complejo 
ON categorias_gastos(complejo_id);

-- PASO 3: Obtener categorías actuales (globales) y replicarlas para cada complejo
DO $$
DECLARE
    complejo_record RECORD;
    categoria_record RECORD;
BEGIN
    -- Para cada complejo existente
    FOR complejo_record IN 
        SELECT id FROM complejos
    LOOP
        RAISE NOTICE '📋 Replicando categorías para complejo ID: %', complejo_record.id;
        
        -- Para cada categoría global existente (sin complejo_id)
        FOR categoria_record IN 
            SELECT nombre, descripcion, icono, color, tipo, es_predefinida
            FROM categorias_gastos 
            WHERE complejo_id IS NULL
        LOOP
            -- Insertar copia para este complejo (ignorar si ya existe)
            INSERT INTO categorias_gastos (
                complejo_id, 
                nombre, 
                descripcion, 
                icono, 
                color, 
                tipo, 
                es_predefinida
            )
            VALUES (
                complejo_record.id,
                categoria_record.nombre,
                categoria_record.descripcion,
                categoria_record.icono,
                categoria_record.color,
                categoria_record.tipo,
                categoria_record.es_predefinida
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
        
        RAISE NOTICE '✅ Categorías replicadas para complejo ID: %', complejo_record.id;
    END LOOP;
END $$;

-- PASO 4: Actualizar movimientos existentes para que apunten a las nuevas categorías
-- Esto es necesario porque ahora cada complejo tiene sus propias categorías
DO $$
DECLARE
    movimiento_record RECORD;
    nueva_categoria_id INTEGER;
BEGIN
    RAISE NOTICE '🔄 Actualizando referencias de movimientos a nuevas categorías...';
    
    FOR movimiento_record IN 
        SELECT 
            gi.id as movimiento_id,
            gi.complejo_id,
            gi.categoria_id,
            cat.nombre as categoria_nombre
        FROM gastos_ingresos gi
        JOIN categorias_gastos cat ON gi.categoria_id = cat.id
        WHERE cat.complejo_id IS NULL  -- Solo movimientos con categorías globales
    LOOP
        -- Buscar la categoría equivalente para el complejo específico
        SELECT id INTO nueva_categoria_id
        FROM categorias_gastos
        WHERE complejo_id = movimiento_record.complejo_id
        AND nombre = movimiento_record.categoria_nombre
        LIMIT 1;
        
        IF nueva_categoria_id IS NOT NULL THEN
            UPDATE gastos_ingresos
            SET categoria_id = nueva_categoria_id
            WHERE id = movimiento_record.movimiento_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Referencias de movimientos actualizadas';
END $$;

-- PASO 5: Eliminar categorías globales antiguas (sin complejo_id)
-- Solo eliminar las que NO tengan movimientos asociados
DO $$
DECLARE
    categoria_global_record RECORD;
    tiene_movimientos BOOLEAN;
BEGIN
    FOR categoria_global_record IN 
        SELECT id FROM categorias_gastos WHERE complejo_id IS NULL
    LOOP
        -- Verificar si tiene movimientos
        SELECT EXISTS(
            SELECT 1 FROM gastos_ingresos WHERE categoria_id = categoria_global_record.id
        ) INTO tiene_movimientos;
        
        IF NOT tiene_movimientos THEN
            DELETE FROM categorias_gastos WHERE id = categoria_global_record.id;
        ELSE
            RAISE NOTICE 'Manteniendo categoría global ID % (tiene movimientos asociados)', categoria_global_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🗑️  Categorías globales sin uso eliminadas';
END $$;

-- PASO 6: Hacer complejo_id obligatorio (NOT NULL)
-- Solo si NO quedan categorías globales con movimientos
DO $$
DECLARE
    categorias_sin_complejo INTEGER;
BEGIN
    SELECT COUNT(*) INTO categorias_sin_complejo
    FROM categorias_gastos
    WHERE complejo_id IS NULL;
    
    IF categorias_sin_complejo = 0 THEN
        ALTER TABLE categorias_gastos ALTER COLUMN complejo_id SET NOT NULL;
        RAISE NOTICE '✅ Columna complejo_id establecida como obligatoria';
    ELSE
        RAISE NOTICE '⚠️  Quedan % categorías globales con movimientos. No se establece NOT NULL', categorias_sin_complejo;
    END IF;
END $$;

COMMIT;

-- Verificar resultado final
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada. Cada complejo ahora tiene sus propias categorías.';
END $$;


-- Agregar campo visible a la tabla complejos
ALTER TABLE complejos ADD COLUMN visible BOOLEAN DEFAULT true;

-- Actualizar todos los complejos existentes como visibles
UPDATE complejos SET visible = true WHERE visible IS NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX idx_complejos_visible ON complejos(visible);

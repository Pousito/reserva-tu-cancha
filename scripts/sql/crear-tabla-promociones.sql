-- ==============================================================
-- SISTEMA DE PROMOCIONES Y PRECIOS DINÁMICOS
-- Permite a los owners crear promociones con diferentes tipos
-- de fechas y horarios para sus canchas
-- ==============================================================

-- Crear tabla de promociones
CREATE TABLE IF NOT EXISTS promociones_canchas (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    
    -- Precio promocional
    precio_promocional DECIMAL(10,2) NOT NULL,
    
    -- Tipo de aplicación de fechas
    tipo_fecha VARCHAR(30) NOT NULL CHECK (tipo_fecha IN ('especifico', 'rango', 'recurrente_semanal')),
    
    -- Campos para fecha específica (tipo_fecha = 'especifico')
    fecha_especifica DATE,
    
    -- Campos para rango de fechas (tipo_fecha = 'rango')
    fecha_inicio DATE,
    fecha_fin DATE,
    
    -- Campos para recurrencia semanal (tipo_fecha = 'recurrente_semanal')
    -- Almacena array de días: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
    dias_semana TEXT[], -- PostgreSQL array de texto
    
    -- Tipo de aplicación de horarios
    tipo_horario VARCHAR(30) NOT NULL CHECK (tipo_horario IN ('especifico', 'rango')),
    
    -- Campos para horario específico (tipo_horario = 'especifico')
    hora_especifica TIME,
    
    -- Campos para rango de horarios (tipo_horario = 'rango')
    hora_inicio TIME,
    hora_fin TIME,
    
    -- Metadata
    activo BOOLEAN DEFAULT true,
    nombre VARCHAR(255), -- Nombre descriptivo de la promoción (ej: "Promoción Mediodía Lunes-Viernes")
    descripcion TEXT, -- Descripción adicional opcional
    creado_por INTEGER REFERENCES usuarios(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validaciones a nivel de tabla
    CONSTRAINT validar_fecha_especifica CHECK (
        (tipo_fecha = 'especifico' AND fecha_especifica IS NOT NULL) OR tipo_fecha != 'especifico'
    ),
    CONSTRAINT validar_rango_fechas CHECK (
        (tipo_fecha = 'rango' AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_inicio <= fecha_fin) 
        OR tipo_fecha != 'rango'
    ),
    CONSTRAINT validar_dias_semana CHECK (
        (tipo_fecha = 'recurrente_semanal' AND dias_semana IS NOT NULL AND array_length(dias_semana, 1) > 0) 
        OR tipo_fecha != 'recurrente_semanal'
    ),
    CONSTRAINT validar_hora_especifica CHECK (
        (tipo_horario = 'especifico' AND hora_especifica IS NOT NULL) OR tipo_horario != 'especifico'
    ),
    CONSTRAINT validar_rango_horarios CHECK (
        (tipo_horario = 'rango' AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL) 
        OR tipo_horario != 'rango'
    )
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_promociones_cancha_id ON promociones_canchas(cancha_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activo ON promociones_canchas(activo);
CREATE INDEX IF NOT EXISTS idx_promociones_tipo_fecha ON promociones_canchas(tipo_fecha);
CREATE INDEX IF NOT EXISTS idx_promociones_fecha_especifica ON promociones_canchas(fecha_especifica) WHERE fecha_especifica IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promociones_rango_fechas ON promociones_canchas(fecha_inicio, fecha_fin) WHERE fecha_inicio IS NOT NULL;

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION actualizar_timestamp_promocion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_promocion
    BEFORE UPDATE ON promociones_canchas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp_promocion();

-- Comentarios para documentación
COMMENT ON TABLE promociones_canchas IS 'Almacena promociones y precios dinámicos para canchas deportivas';
COMMENT ON COLUMN promociones_canchas.tipo_fecha IS 'Tipo de aplicación de fechas: especifico (un día), rango (varios días), recurrente_semanal (todos los X días de la semana)';
COMMENT ON COLUMN promociones_canchas.tipo_horario IS 'Tipo de aplicación de horarios: especifico (una hora exacta), rango (múltiples horas)';
COMMENT ON COLUMN promociones_canchas.dias_semana IS 'Array de días de la semana para promociones recurrentes: [''lunes'', ''martes'', etc.]';
COMMENT ON COLUMN promociones_canchas.activo IS 'Indica si la promoción está activa y debe aplicarse';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla promociones_canchas creada exitosamente';
    RAISE NOTICE '📊 Sistema de precios dinámicos listo para usar';
    RAISE NOTICE '⚠️  Recuerda: Las promociones requieren 7 días de anticipación';
END $$;


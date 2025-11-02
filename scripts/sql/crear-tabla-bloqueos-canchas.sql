-- ==============================================================
-- SISTEMA DE BLOQUEOS PERMANENTES DE CANCHAS
-- Permite a owners y managers bloquear canchas para feriados,
-- campeonatos, mantenimiento, etc.
-- ==============================================================

-- Crear tabla de bloqueos
CREATE TABLE IF NOT EXISTS bloqueos_canchas (
    id SERIAL PRIMARY KEY,
    cancha_id INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
    
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
    tipo_horario VARCHAR(30) NOT NULL CHECK (tipo_horario IN ('especifico', 'rango', 'todo_el_dia')),
    
    -- Campos para horario específico (tipo_horario = 'especifico')
    hora_especifica TIME,
    
    -- Campos para rango de horarios (tipo_horario = 'rango')
    hora_inicio TIME,
    hora_fin TIME,
    
    -- Motivo y descripción
    motivo VARCHAR(255) NOT NULL, -- Ej: "Feriado", "Campeonato", "Mantenimiento"
    descripcion TEXT, -- Descripción adicional opcional
    
    -- Metadata
    activo BOOLEAN DEFAULT true,
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
CREATE INDEX IF NOT EXISTS idx_bloqueos_cancha_id ON bloqueos_canchas(cancha_id);
CREATE INDEX IF NOT EXISTS idx_bloqueos_activo ON bloqueos_canchas(activo);
CREATE INDEX IF NOT EXISTS idx_bloqueos_tipo_fecha ON bloqueos_canchas(tipo_fecha);
CREATE INDEX IF NOT EXISTS idx_bloqueos_fecha_especifica ON bloqueos_canchas(fecha_especifica) WHERE fecha_especifica IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bloqueos_rango_fechas ON bloqueos_canchas(fecha_inicio, fecha_fin) WHERE fecha_inicio IS NOT NULL;

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION actualizar_timestamp_bloqueo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_bloqueo
    BEFORE UPDATE ON bloqueos_canchas
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp_bloqueo();

-- Comentarios para documentación
COMMENT ON TABLE bloqueos_canchas IS 'Almacena bloqueos permanentes de canchas para feriados, campeonatos, mantenimiento, etc.';
COMMENT ON COLUMN bloqueos_canchas.tipo_fecha IS 'Tipo de aplicación de fechas: especifico (un día), rango (varios días), recurrente_semanal (todos los X días de la semana)';
COMMENT ON COLUMN bloqueos_canchas.tipo_horario IS 'Tipo de aplicación de horarios: especifico (una hora exacta), rango (múltiples horas), todo_el_dia (todo el día bloqueado)';
COMMENT ON COLUMN bloqueos_canchas.dias_semana IS 'Array de días de la semana para bloqueos recurrentes: [''lunes'', ''martes'', etc.]';
COMMENT ON COLUMN bloqueos_canchas.motivo IS 'Motivo del bloqueo: Feriado, Campeonato, Mantenimiento, etc.';
COMMENT ON COLUMN bloqueos_canchas.activo IS 'Indica si el bloqueo está activo y debe aplicarse';

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla bloqueos_canchas creada exitosamente';
    RAISE NOTICE '🚫 Sistema de bloqueos permanentes listo para usar';
END $$;


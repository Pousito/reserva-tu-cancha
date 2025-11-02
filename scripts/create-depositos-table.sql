-- Script para crear tabla depositos_complejos en producción
-- Ejecutar este script en la base de datos de producción

CREATE TABLE IF NOT EXISTS depositos_complejos (
    id SERIAL PRIMARY KEY,
    complejo_id INTEGER NOT NULL,
    fecha_deposito DATE NOT NULL,
    monto_total_reservas INTEGER NOT NULL,
    comision_porcentaje NUMERIC(5,2) NOT NULL,
    comision_sin_iva INTEGER NOT NULL,
    iva_comision INTEGER NOT NULL,
    comision_total INTEGER NOT NULL,
    monto_a_depositar INTEGER NOT NULL,
    estado VARCHAR(50),
    metodo_pago VARCHAR(50),
    numero_transaccion VARCHAR(100),
    banco_destino VARCHAR(100),
    observaciones TEXT,
    procesado_por INTEGER,
    fecha_procesado TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (complejo_id) REFERENCES complejos(id) ON DELETE CASCADE,
    FOREIGN KEY (procesado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_depositos_complejos_complejo_id ON depositos_complejos(complejo_id);
CREATE INDEX IF NOT EXISTS idx_depositos_complejos_fecha ON depositos_complejos(fecha_deposito);
CREATE INDEX IF NOT EXISTS idx_depositos_complejos_estado ON depositos_complejos(estado);

-- Insertar algunos datos de ejemplo para testing
INSERT INTO depositos_complejos (
    complejo_id, 
    fecha_deposito, 
    monto_total_reservas, 
    comision_porcentaje, 
    comision_sin_iva, 
    iva_comision, 
    comision_total, 
    monto_a_depositar, 
    estado
) VALUES 
(8, '2025-10-18', 15000, 3.50, 525, 100, 625, 14375, 'pendiente'),
(8, '2025-10-26', 16000, 1.75, 280, 53, 333, 15667, 'pendiente'),
(8, '2025-10-31', 15000, 3.50, 525, 100, 625, 14375, 'pendiente');

-- Verificar que la tabla se creó correctamente
SELECT 
    'Tabla creada exitosamente' as resultado,
    COUNT(*) as total_registros
FROM depositos_complejos;



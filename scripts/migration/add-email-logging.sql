-- ============================================
-- MIGRACIÓN: Sistema de Logging de Emails
-- ============================================
-- Fecha: 2025-11-12
-- Descripción: Agregar tracking de envío de emails

-- 1. Crear tabla de logs de email
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
  codigo_reserva VARCHAR(50),
  destinatario VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cliente', 'admin_complejo', 'super_admin')),
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('enviado', 'error', 'simulado', 'omitido')),
  error TEXT,
  message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para email_logs
CREATE INDEX IF NOT EXISTS idx_email_logs_reserva ON email_logs(reserva_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_codigo ON email_logs(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_email_logs_estado ON email_logs(estado);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

-- 2. Agregar campos a tabla reservas para tracking de email
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS email_cliente_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_cliente_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_cliente_error TEXT,
ADD COLUMN IF NOT EXISTS email_admin_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_admin_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_admin_error TEXT;

-- 3. Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_reservas_email_cliente_enviado ON reservas(email_cliente_enviado);
CREATE INDEX IF NOT EXISTS idx_reservas_email_admin_enviado ON reservas(email_admin_enviado);

-- 4. Comentarios para documentación
COMMENT ON TABLE email_logs IS 'Registro de todos los intentos de envío de emails relacionados con reservas';
COMMENT ON COLUMN email_logs.estado IS 'enviado: email enviado exitosamente, error: falló el envío, simulado: modo simulación, omitido: no se intentó enviar';
COMMENT ON COLUMN reservas.email_cliente_enviado IS 'Indica si se envió email de confirmación al cliente';
COMMENT ON COLUMN reservas.email_admin_enviado IS 'Indica si se enviaron notificaciones a administradores';


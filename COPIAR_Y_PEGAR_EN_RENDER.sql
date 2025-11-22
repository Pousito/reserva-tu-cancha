-- ============================================
-- COPIAR Y PEGAR ESTO EN RENDER POSTGRESQL
-- ============================================
-- 1. Ve a Render Dashboard → Tu Base de Datos → Shell/Console
-- 2. Copia TODO este archivo
-- 3. Pégalo y ejecuta

-- Crear tabla de logs de email
-- Nota: reserva_id no tiene foreign key porque la tabla reservas no tiene PK en id
-- Usamos codigo_reserva para relacionar los registros
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER, -- Sin foreign key, usamos codigo_reserva para relacionar
  codigo_reserva VARCHAR(50),
  destinatario VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cliente', 'admin_complejo', 'super_admin')),
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('enviado', 'error', 'simulado', 'omitido')),
  error TEXT,
  message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_email_logs_reserva ON email_logs(reserva_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_codigo ON email_logs(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_email_logs_estado ON email_logs(estado);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

-- Agregar campos a tabla reservas
ALTER TABLE reservas 
ADD COLUMN IF NOT EXISTS email_cliente_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_cliente_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_cliente_error TEXT,
ADD COLUMN IF NOT EXISTS email_admin_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_admin_enviado_en TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_admin_error TEXT;

-- Crear índices para reservas
CREATE INDEX IF NOT EXISTS idx_reservas_email_cliente_enviado ON reservas(email_cliente_enviado);
CREATE INDEX IF NOT EXISTS idx_reservas_email_admin_enviado ON reservas(email_admin_enviado);

-- ✅ LISTO! Si no hay errores, todo está bien.


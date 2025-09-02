
-- SCRIPT PARA INSERTAR RESERVAS EN RENDER
-- Ejecutar en la base de datos de Render


INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756348337596LD9DG',
  'Daniel Orellana Peña',
  '19.051.993-7',
  'ignacio.araya.lillo@gmail.com',
  '2025-08-29',
  '23:00',
  '00:00',
  28000,
  'pendiente',
  '2025-08-28 02:32:17',
  5
);

INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756348222489XLXZ7',
  'Ignacio Alejandro Araya Lillo',
  '19.372.087-0',
  'ignacio.araya.lillo@gmail.com',
  '2025-08-28',
  '16:00',
  '17:00',
  28000,
  'pendiente',
  '2025-08-28 02:30:22',
  6
);

INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756346753025IZSCY',
  'Ignacio Alejandro Araya Lillo',
  '19.372.087-0',
  'ignacio.araya.lillo@gmail.com',
  '2025-08-28',
  '16:00',
  '17:00',
  28000,
  'pendiente',
  '2025-08-28 02:05:53',
  5
);

INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756346441728A',
  'Juan Pérez',
  '12345678-9',
  'juan@email.com',
  '2025-08-27',
  '16:00',
  '17:00',
  28000,
  'pendiente',
  '2025-08-28 02:00:41',
  5
);

INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756346441729B',
  'María González',
  '98765432-1',
  'maria@email.com',
  '2025-08-27',
  '16:00',
  '17:00',
  28000,
  'pendiente',
  '2025-08-28 02:00:41',
  5
);

INSERT OR REPLACE INTO reservas (
  codigo_reserva,
  nombre_cliente,
  rut_cliente,
  email_cliente,
  fecha,
  hora_inicio,
  hora_fin,
  precio_total,
  estado,
  fecha_creacion,
  cancha_id
) VALUES (
  'RTC1756346441729C',
  'Carlos López',
  '11223344-5',
  'carlos@email.com',
  '2025-08-28',
  '14:00',
  '15:00',
  25000,
  'confirmada',
  '2025-08-28 02:00:41',
  1
);

-- Verificar que se insertaron
SELECT COUNT(*) as total_reservas FROM reservas;
SELECT codigo_reserva, nombre_cliente, fecha, precio_total FROM reservas ORDER BY fecha_creacion DESC LIMIT 5;

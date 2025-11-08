-- Script SQL para actualizar la reserva VIZJ4P
-- Ejecutar directamente en la base de datos de Render

-- Verificar estado actual
SELECT r.id, r.codigo_reserva, r.precio_total, r.porcentaje_pagado, r.monto_abonado,
       p.id as pago_id, p.amount as monto_pago
FROM reservas r
LEFT JOIN pagos p ON r.codigo_reserva = p.reservation_code
WHERE UPPER(r.codigo_reserva) = UPPER('VIZJ4P');

-- Actualizar reserva
UPDATE reservas 
SET precio_total = 20700, 
    monto_abonado = 10350
WHERE UPPER(codigo_reserva) = UPPER('VIZJ4P');

-- Actualizar pago si existe
UPDATE pagos 
SET amount = 10350
WHERE reservation_code = 'VIZJ4P';

-- Verificar resultado
SELECT r.id, r.codigo_reserva, r.precio_total, r.porcentaje_pagado, r.monto_abonado,
       p.id as pago_id, p.amount as monto_pago
FROM reservas r
LEFT JOIN pagos p ON r.codigo_reserva = p.reservation_code
WHERE UPPER(r.codigo_reserva) = UPPER('VIZJ4P');


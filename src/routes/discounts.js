const express = require('express');
const router = express.Router();

// Variable para almacenar la instancia de la base de datos
let db = null;

// Función para establecer la instancia de la base de datos
const setDatabase = (databaseInstance) => {
  db = databaseInstance;
};

// Endpoint para validar un código de descuento
router.post('/validar', async (req, res) => {
  try {
    const { codigo, email_cliente, monto_original } = req.body;

    if (!codigo || !email_cliente || !monto_original) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos: codigo, email_cliente, monto_original' 
      });
    }

    // Buscar el código de descuento
    const codigoDescuento = await db.get(`
      SELECT * FROM codigos_descuento 
      WHERE codigo = $1 AND activo = true
    `, [codigo.toUpperCase()]);

    if (!codigoDescuento) {
      return res.status(404).json({ 
        error: 'Código de descuento no válido o inactivo' 
      });
    }

    // Verificar fechas de vigencia
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy < codigoDescuento.fecha_inicio || hoy > codigoDescuento.fecha_fin) {
      return res.status(400).json({ 
        error: 'El código de descuento no está vigente' 
      });
    }

    // Verificar límite de usos
    if (codigoDescuento.usos_maximos && 
        codigoDescuento.usos_actuales >= codigoDescuento.usos_maximos) {
      return res.status(400).json({ 
        error: 'El código de descuento ha alcanzado su límite de usos' 
      });
    }

    // Calcular descuento
    let montoDescuento = Math.round(monto_original * (codigoDescuento.porcentaje_descuento / 100));
    
    // Aplicar monto máximo de descuento si existe
    if (codigoDescuento.monto_maximo_descuento && 
        montoDescuento > codigoDescuento.monto_maximo_descuento) {
      montoDescuento = codigoDescuento.monto_maximo_descuento;
    }

    const montoFinal = monto_original - montoDescuento;

    res.json({
      valido: true,
      codigo: codigoDescuento.codigo,
      descripcion: codigoDescuento.descripcion,
      porcentaje_descuento: codigoDescuento.porcentaje_descuento,
      monto_original: monto_original,
      monto_descuento: montoDescuento,
      monto_final: montoFinal,
      fecha_fin: codigoDescuento.fecha_fin,
      usos_restantes: codigoDescuento.usos_maximos ? 
        (codigoDescuento.usos_maximos - codigoDescuento.usos_actuales) : null
    });

  } catch (error) {
    console.error('❌ Error validando código de descuento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para aplicar un código de descuento (usado al confirmar reserva)
router.post('/aplicar', async (req, res) => {
  try {
    const { codigo, email_cliente, monto_original, reserva_id } = req.body;

    if (!codigo || !email_cliente || !monto_original || !reserva_id) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos' 
      });
    }

    // Validar el código nuevamente
    const codigoDescuento = await db.get(`
      SELECT * FROM codigos_descuento 
      WHERE codigo = $1 AND activo = true
    `, [codigo.toUpperCase()]);

    if (!codigoDescuento) {
      return res.status(404).json({ 
        error: 'Código de descuento no válido' 
      });
    }

    // Verificar fechas de vigencia
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy < codigoDescuento.fecha_inicio || hoy > codigoDescuento.fecha_fin) {
      return res.status(400).json({ 
        error: 'El código de descuento no está vigente' 
      });
    }

    // Verificar límite de usos
    if (codigoDescuento.usos_maximos && 
        codigoDescuento.usos_actuales >= codigoDescuento.usos_maximos) {
      return res.status(400).json({ 
        error: 'El código de descuento ha alcanzado su límite de usos' 
      });
    }

    // Calcular descuento
    let montoDescuento = Math.round(monto_original * (codigoDescuento.porcentaje_descuento / 100));
    
    if (codigoDescuento.monto_maximo_descuento && 
        montoDescuento > codigoDescuento.monto_maximo_descuento) {
      montoDescuento = codigoDescuento.monto_maximo_descuento;
    }

    const montoFinal = monto_original - montoDescuento;

    // Actualizar contador de usos del código
    await db.run(`
      UPDATE codigos_descuento 
      SET usos_actuales = usos_actuales + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [codigoDescuento.id]);

    // Registrar el uso del código
    await db.run(`
      INSERT INTO uso_codigos_descuento 
      (codigo_id, reserva_id, email_cliente, monto_descuento, monto_original, monto_final)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [codigoDescuento.id, reserva_id, email_cliente, montoDescuento, monto_original, montoFinal]);

    // Actualizar el precio de la reserva
    await db.run(`
      UPDATE reservas 
      SET precio_total = $1
      WHERE id = $2
    `, [montoFinal, reserva_id]);

    res.json({
      aplicado: true,
      codigo: codigoDescuento.codigo,
      monto_original: monto_original,
      monto_descuento: montoDescuento,
      monto_final: montoFinal,
      reserva_id: reserva_id
    });

  } catch (error) {
    console.error('❌ Error aplicando código de descuento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para crear códigos de descuento (admin)
router.post('/crear', async (req, res) => {
  try {
    const { 
      codigo, 
      descripcion, 
      porcentaje_descuento, 
      monto_maximo_descuento,
      fecha_inicio, 
      fecha_fin, 
      usos_maximos 
    } = req.body;

    if (!codigo || !porcentaje_descuento || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos' 
      });
    }

    // Verificar que el código no exista
    const codigoExistente = await db.get(`
      SELECT id FROM codigos_descuento WHERE codigo = $1
    `, [codigo.toUpperCase()]);

    if (codigoExistente) {
      return res.status(400).json({ 
        error: 'El código de descuento ya existe' 
      });
    }

    // Crear el código de descuento
    const resultado = await db.run(`
      INSERT INTO codigos_descuento 
      (codigo, descripcion, porcentaje_descuento, monto_maximo_descuento, 
       fecha_inicio, fecha_fin, usos_maximos)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [codigo.toUpperCase(), descripcion, porcentaje_descuento, 
        monto_maximo_descuento, fecha_inicio, fecha_fin, usos_maximos]);

    res.json({
      creado: true,
      id: resultado.lastID,
      codigo: codigo.toUpperCase(),
      mensaje: 'Código de descuento creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error creando código de descuento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para listar códigos de descuento (admin)
router.get('/listar', async (req, res) => {
  try {
    const codigos = await db.query(`
      SELECT 
        id, codigo, descripcion, porcentaje_descuento, 
        monto_maximo_descuento, fecha_inicio, fecha_fin,
        usos_maximos, usos_actuales, activo, created_at
      FROM codigos_descuento 
      ORDER BY created_at DESC
    `);

    res.json({ codigos });

  } catch (error) {
    console.error('❌ Error listando códigos de descuento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = { router, setDatabase };

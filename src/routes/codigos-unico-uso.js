const express = require('express');
const router = express.Router();

// Variable para almacenar la instancia de la base de datos
let db = null;

// Función para establecer la instancia de la base de datos
const setDatabase = (databaseInstance) => {
  db = databaseInstance;
};

// Endpoint para crear un código de un solo uso
router.post('/crear', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        success: false,
        error: 'Base de datos no configurada' 
      });
    }

    const { codigo, email_cliente, monto_descuento, descripcion, expira_en } = req.body;

    if (!codigo || !email_cliente || monto_descuento === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan parámetros requeridos: codigo, email_cliente, monto_descuento' 
      });
    }

    // Verificar que el código no exista
    const codigoExistente = await db.get(`
      SELECT id FROM codigos_unico_uso WHERE codigo = $1
    `, [codigo.toUpperCase()]);

    if (codigoExistente) {
      return res.status(400).json({ 
        success: false,
        error: 'El código ya existe' 
      });
    }

    // Crear el código
    const resultado = await db.run(`
      INSERT INTO codigos_unico_uso 
      (codigo, email_cliente, monto_descuento, descripcion, expira_en)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      codigo.toUpperCase(), 
      email_cliente.toLowerCase(), 
      monto_descuento,
      descripcion || null,
      expira_en || null
    ]);

    console.log(`✅ Código de un solo uso creado: ${codigo.toUpperCase()} para ${email_cliente}`);

    res.json({
      success: true,
      message: 'Código creado exitosamente',
      codigo: codigo.toUpperCase(),
      id: resultado.lastID
    });

  } catch (error) {
    console.error('❌ Error creando código de un solo uso:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Endpoint para validar y usar un código de un solo uso
// Este endpoint se llama ANTES de ir a Transbank, cuando el usuario hace clic en "Pagar"
router.post('/validar-y-usar', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        success: false,
        error: 'Base de datos no configurada' 
      });
    }

    const { codigo, email_cliente, bloqueo_id } = req.body;

    if (!codigo || !email_cliente || !bloqueo_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan parámetros requeridos: codigo, email_cliente, bloqueo_id' 
      });
    }

    console.log('🎫 Validando código de un solo uso:', {
      codigo: codigo.toUpperCase(),
      email_cliente,
      bloqueo_id
    });

    // Buscar el código
    const codigoData = await db.get(`
      SELECT * FROM codigos_unico_uso 
      WHERE codigo = $1
    `, [codigo.toUpperCase()]);

    if (!codigoData) {
      return res.status(404).json({ 
        success: false,
        error: 'Código no válido' 
      });
    }

    // Verificar que el código no haya sido usado
    if (codigoData.usado) {
      return res.status(400).json({ 
        success: false,
        error: 'Este código ya ha sido utilizado' 
      });
    }

    // Verificar que el email coincida
    if (codigoData.email_cliente.toLowerCase() !== email_cliente.toLowerCase()) {
      return res.status(403).json({ 
        success: false,
        error: 'Este código no corresponde a tu email' 
      });
    }

    // Verificar expiración si existe
    if (codigoData.expira_en) {
      const ahora = new Date();
      const expiraEn = new Date(codigoData.expira_en);
      if (ahora > expiraEn) {
        return res.status(400).json({ 
          success: false,
          error: 'Este código ha expirado' 
        });
      }
    }

    // IMPORTANTE: Marcar como usado ANTES de ir a Transbank
    // Usar transacción para asegurar atomicidad
    const client = await db.pgPool.connect();
    try {
      await client.query('BEGIN');

      // Verificar nuevamente que no esté usado (double-check para evitar race conditions)
      const codigoVerificado = await client.query(`
        SELECT usado FROM codigos_unico_uso 
        WHERE codigo = $1 FOR UPDATE
      `, [codigo.toUpperCase()]);

      if (codigoVerificado.rows[0].usado) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false,
          error: 'Este código ya ha sido utilizado' 
        });
      }

      // Marcar como usado
      await client.query(`
        UPDATE codigos_unico_uso 
        SET usado = TRUE, 
            usado_en = NOW(),
            bloqueo_id = $1
        WHERE codigo = $2
      `, [bloqueo_id, codigo.toUpperCase()]);

      await client.query('COMMIT');

      console.log(`✅ Código ${codigo.toUpperCase()} marcado como usado para bloqueo ${bloqueo_id}`);

      res.json({
        success: true,
        message: 'Código válido y marcado como usado',
        monto_descuento: codigoData.monto_descuento,
        codigo: codigo.toUpperCase()
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error validando/usando código de un solo uso:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Endpoint para verificar si un código es válido (sin usarlo)
router.post('/verificar', async (req, res) => {
  try {
    console.log('🔍 Endpoint /verificar llamado');
    
    if (!db) {
      console.error('❌ Base de datos no configurada en router codigos-unico-uso');
      return res.status(500).json({ 
        success: false,
        error: 'Base de datos no configurada' 
      });
    }

    const { codigo, email_cliente } = req.body;
    console.log('📋 Parámetros recibidos:', { codigo, email_cliente });

    if (!codigo || !email_cliente) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan parámetros requeridos: codigo, email_cliente' 
      });
    }

    // Buscar el código
    console.log('🔍 Buscando código:', codigo.toUpperCase());
    const codigoData = await db.get(`
      SELECT * FROM codigos_unico_uso 
      WHERE codigo = $1
    `, [codigo.toUpperCase()]);
    console.log('📦 Código encontrado:', codigoData ? 'Sí' : 'No');

    if (!codigoData) {
      return res.json({
        success: false,
        valido: false,
        error: 'Código no válido'
      });
    }

    // Verificar que no haya sido usado
    if (codigoData.usado) {
      return res.json({
        success: false,
        valido: false,
        error: 'Este código ya ha sido utilizado'
      });
    }

    // Verificar email
    if (codigoData.email_cliente.toLowerCase() !== email_cliente.toLowerCase()) {
      return res.json({
        success: false,
        valido: false,
        error: 'Este código no corresponde a tu email'
      });
    }

    // Verificar expiración
    if (codigoData.expira_en) {
      const ahora = new Date();
      const expiraEn = new Date(codigoData.expira_en);
      if (ahora > expiraEn) {
        return res.json({
          success: false,
          valido: false,
          error: 'Este código ha expirado'
        });
      }
    }

    res.json({
      success: true,
      valido: true,
      monto_descuento: codigoData.monto_descuento
    });

  } catch (error) {
    console.error('❌ Error verificando código:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = { router, setDatabase };


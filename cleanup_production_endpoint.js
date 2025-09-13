// Endpoint para limpiar usuarios en producción
// Este código se debe agregar temporalmente al server.js

app.post('/api/admin/cleanup-users', async (req, res) => {
  try {
    console.log('🧹 LIMPIEZA DE USUARIOS EN PRODUCCIÓN');
    console.log('====================================');
    
    // Verificar que sea el super admin
    const { email, password } = req.body;
    if (email !== 'admin@reservatuscanchas.cl' || password !== 'admin123') {
      return res.status(401).json({ success: false, error: 'Credenciales de super admin requeridas' });
    }
    
    // Obtener todos los usuarios actuales
    const allUsers = await db.query('SELECT email, nombre, rol, activo FROM usuarios ORDER BY id');
    
    console.log(`📊 Usuarios encontrados: ${allUsers.rows.length}`);
    
    // Usuarios que SÍ queremos mantener
    const usuariosCorrectos = [
      'admin@reservatuscanchas.cl',
      'naxiin320@gmail.com', 
      'naxiin_320@hotmail.com'
    ];
    
    // Eliminar usuarios que NO están en la lista de correctos
    const deleteResult = await db.query(`
      DELETE FROM usuarios 
      WHERE email NOT IN ($1, $2, $3)
    `, usuariosCorrectos);
    
    console.log(`✅ Eliminados ${deleteResult.rowCount} usuarios no deseados`);
    
    // Actualizar roles
    await db.query(`UPDATE usuarios SET rol = 'owner' WHERE email = 'naxiin_320@hotmail.com'`);
    await db.query(`UPDATE usuarios SET rol = 'manager' WHERE email = 'naxiin320@gmail.com'`);
    
    // Actualizar contraseñas
    const bcrypt = require('bcryptjs');
    
    const passwordUpdates = [
      { email: 'admin@reservatuscanchas.cl', password: 'admin123' },
      { email: 'naxiin320@gmail.com', password: 'magnasports2024' },
      { email: 'naxiin_320@hotmail.com', password: 'complejo2024' }
    ];
    
    for (const user of passwordUpdates) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query(`UPDATE usuarios SET password = $1 WHERE email = $2`, [hashedPassword, user.email]);
    }
    
    // Verificar usuarios finales
    const usuariosFinales = await db.query('SELECT email, nombre, rol, activo FROM usuarios ORDER BY id');
    
    res.json({
      success: true,
      message: 'Limpieza completada',
      eliminados: deleteResult.rowCount,
      usuarios_finales: usuariosFinales.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

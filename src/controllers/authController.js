const db = require('../config/database');

/**
 * Middleware de autenticación para admin
 */
function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  
  // Verificar si es un token dinámico del login (admin-token-{id}-{timestamp})
  if (token.startsWith('admin-token-')) {
    // Extraer el ID del usuario del token
    const tokenParts = token.split('-');
    if (tokenParts.length >= 3) {
      const userId = parseInt(tokenParts[2]);
      
      console.log('🔍 Verificando usuario con ID:', userId);
      
      // Buscar el usuario en la base de datos para obtener su información
      db.get("SELECT id, email, nombre, rol FROM usuarios WHERE id = ? AND activo = 1", [userId], (err, usuario) => {
        if (err) {
          console.error('❌ Error verificando usuario:', err);
          return res.status(500).json({ 
            error: 'Error de conexión', 
            details: err.message,
            token: token.substring(0, 20) + '...',
            userId: userId
          });
        }
        
        if (!usuario) {
          console.log('❌ Usuario no encontrado o inactivo para ID:', userId);
          return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
        }
        
        console.log('✅ Usuario encontrado:', usuario);
        
        // Establecer la información del admin en req.admin
        req.admin = {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          rol: usuario.rol
        };
        
        next();
      });
      return;
    }
  }
  
  // Verificación de tokens hardcodeados (para compatibilidad)
  if (token === 'super-admin-token-123') {
    req.admin = { 
      id: 1, 
      email: 'admin@reservatuscanchas.cl', 
      nombre: 'Super Administrador',
      rol: 'super_admin'
    };
    next();
  } else if (token === 'complex-owner-token-456') {
    req.admin = { 
      id: 2, 
      email: 'magnasports@reservatuscanchas.cl', 
      nombre: 'Dueño MagnaSports',
      rol: 'complex_owner',
      complejo_id: 3
    };
    next();
  } else if (token === 'complex-owner-token-789') {
    req.admin = { 
      id: 3, 
      email: 'deportivo@reservatuscanchas.cl', 
      nombre: 'Dueño Deportivo Central',
      rol: 'complex_owner',
      complejo_id: 1
    };
    next();
  } else {
    res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Middleware para verificar si es super admin
 */
function requireSuperAdmin(req, res, next) {
  if (req.admin.rol !== 'super_admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Administrador.' });
  }
  next();
}

/**
 * Middleware para verificar si es dueño de complejo
 */
function requireComplexOwner(req, res, next) {
  if (req.admin.rol !== 'complex_owner') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Dueño de Complejo.' });
  }
  next();
}

/**
 * Login de administrador
 */
function loginAdmin(req, res) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  
  // Buscar usuario en la base de datos
  db.get("SELECT * FROM usuarios WHERE email = ? AND password = ? AND activo = 1", [email, password], (err, usuario) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ error: 'Error de conexión. Intenta nuevamente.' });
    }
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token simple (en producción usar JWT)
    const token = `admin-token-${usuario.id}-${Date.now()}`;
    
    // Actualizar último acceso
    db.run("UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?", [usuario.id]);
    
    res.json({
      token: token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });
  });
}

module.exports = {
  authenticateAdmin,
  requireSuperAdmin,
  requireComplexOwner,
  loginAdmin
};

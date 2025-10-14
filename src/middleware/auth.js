// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

const jwt = require('jsonwebtoken');

// ============================================
// Verificar Token JWT
// ============================================

function verifyToken(req, res, next) {
    console.log('🔑 verifyToken - Verificando token...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('❌ Token no proporcionado');
        return res.status(401).json({ 
            success: false, 
            error: 'Token no proporcionado' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt', (err, user) => {
        if (err) {
            console.log('❌ Token inválido:', err.message);
            return res.status(403).json({ 
                success: false, 
                error: 'Token inválido' 
            });
        }
        
        console.log('✅ Token válido, usuario:', user);
        req.user = user;
        next();
    });
}

// ============================================
// Verificar que sea Owner o Super Admin
// ============================================

function verifyOwnerOrAdmin(req, res, next) {
    console.log('🔐 verifyOwnerOrAdmin - Verificando permisos...');
    console.log('👤 req.user:', req.user);
    
    const user = req.user;
    
    if (!user) {
        console.log('❌ Usuario no autenticado en verifyOwnerOrAdmin');
        return res.status(401).json({ 
            success: false, 
            error: 'Usuario no autenticado' 
        });
    }
    
    console.log('🔍 Rol del usuario:', user.rol);
    
    if (!['owner', 'super_admin'].includes(user.rol)) {
        console.log('❌ Rol no autorizado:', user.rol);
        return res.status(403).json({ 
            success: false, 
            error: 'No tienes permisos para acceder a este recurso. Solo owners y super admins.' 
        });
    }
    
    console.log('✅ Usuario autorizado en verifyOwnerOrAdmin');
    next();
}

// ============================================
// Verificar que sea Super Admin
// ============================================

function verifySuperAdmin(req, res, next) {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Usuario no autenticado' 
        });
    }
    
    if (user.rol !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'No tienes permisos para acceder a este recurso. Solo super admins.' 
        });
    }
    
    next();
}

module.exports = {
    verifyToken,
    verifyOwnerOrAdmin,
    verifySuperAdmin
};


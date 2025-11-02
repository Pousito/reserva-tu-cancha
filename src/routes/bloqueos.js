const express = require('express');
const router = express.Router();
const bloqueosController = require('../controllers/bloqueosController');
const { verifyToken } = require('../middleware/auth');

// Función para configurar la base de datos
function setDatabase(databaseInstance) {
    bloqueosController.setDatabase(databaseInstance);
}

// Middleware para verificar que sea owner, manager o super_admin
function verifyOwnerManagerOrAdmin(req, res, next) {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Usuario no autenticado' 
        });
    }
    
    if (!['owner', 'manager', 'super_admin'].includes(user.rol)) {
        return res.status(403).json({ 
            success: false, 
            error: 'No tienes permisos para acceder a este recurso. Solo owners, managers y super admins.' 
        });
    }
    
    next();
}

// Todas las rutas requieren autenticación y rol owner/manager/super_admin
router.use(verifyToken);
router.use(verifyOwnerManagerOrAdmin);

// Obtener todos los bloqueos del complejo del usuario
router.get('/', bloqueosController.getBloqueosComplejo);

// Obtener bloqueos de una cancha específica (query parameter)
router.get('/cancha', bloqueosController.getBloqueosCancha);

// Obtener un bloqueo por ID
router.get('/:id', bloqueosController.getBloqueoById);

// Crear un nuevo bloqueo
router.post('/', bloqueosController.createBloqueo);

// Actualizar un bloqueo
router.put('/:id', bloqueosController.updateBloqueo);

// Eliminar un bloqueo
router.delete('/:id', bloqueosController.deleteBloqueo);

// Activar/Desactivar un bloqueo
router.patch('/:id/toggle', bloqueosController.toggleBloqueo);

module.exports = { router, setDatabase };


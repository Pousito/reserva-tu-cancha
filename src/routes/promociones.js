const express = require('express');
const router = express.Router();
const promocionesController = require('../controllers/promocionesController');
const { verifyToken, verifyOwnerOrAdmin } = require('../middleware/auth');

// Función para configurar la base de datos
function setDatabase(databaseInstance) {
    promocionesController.setDatabase(databaseInstance);
}

// Todas las rutas requieren autenticación y rol owner/super_admin
router.use(verifyToken);
router.use(verifyOwnerOrAdmin);

// Obtener todas las promociones del complejo del usuario
router.get('/', promocionesController.getPromocionesComplejo);

// Obtener promociones de una cancha específica
router.get('/cancha/:cancha_id', promocionesController.getPromocionesCancha);

// Crear una nueva promoción
router.post('/', promocionesController.createPromocion);

// Actualizar una promoción
router.put('/:id', promocionesController.updatePromocion);

// Eliminar una promoción
router.delete('/:id', promocionesController.deletePromocion);

// Activar/Desactivar una promoción
router.patch('/:id/toggle', promocionesController.togglePromocion);

module.exports = { router, setDatabase };


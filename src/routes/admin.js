const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

// Aplicar middleware de autenticación a todas las rutas
router.use(authController.authenticateAdmin);

// Rutas de estadísticas y dashboard
router.get('/estadisticas', adminController.getEstadisticas);
router.get('/reservas-recientes', adminController.getReservasRecientes);
router.get('/reservas-hoy', adminController.getReservasHoy);
router.get('/reservas', adminController.getAllReservasAdmin);

// Rutas de gestión de complejos
router.get('/complejos', adminController.getComplejos);
router.post('/complejos', authController.requireSuperAdmin, adminController.createComplejo);
router.put('/complejos/:id', authController.requireSuperAdmin, adminController.updateComplejo);
router.delete('/complejos/:id', authController.requireSuperAdmin, adminController.deleteComplejo);

module.exports = router;

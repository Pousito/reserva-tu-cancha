const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availabilityController');

// Rutas optimizadas de disponibilidad
router.get('/cancha/:canchaId/:fecha', availabilityController.getDisponibilidad);
router.get('/complejo/:complejoId/:fecha', availabilityController.getDisponibilidadComplejo);
router.get('/disponibilidad-completa/:complejoId/:fecha', availabilityController.getDisponibilidadCompleta);

// Rutas de administración del caché
router.get('/cache/stats', availabilityController.getCacheStats);
router.delete('/cache', availabilityController.clearCache);

module.exports = router;

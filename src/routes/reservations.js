const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// Rutas públicas de reservas
router.get('/ciudades', reservationController.getCiudades);
router.get('/complejos/:ciudadId', reservationController.getComplejosByCiudad);
router.get('/canchas/:complejoId/:tipo', reservationController.getCanchasByComplejoAndTipo);
router.get('/disponibilidad/:canchaId/:fecha', reservationController.getDisponibilidad);
router.post('/reservas', reservationController.createReserva);
router.get('/reservas', reservationController.getAllReservas);
router.get('/reservas/:busqueda', reservationController.getReservaByCodigo);

// Rutas de prueba y debug
router.get('/test/database', reservationController.testDatabase);

// Ruta de prueba para /api
router.get('/', (req, res) => {
  res.json({ 
    message: 'API de ReservaTuCancha funcionando correctamente',
    version: '1.0.0',
    endpoints: [
      '/api/ciudades',
      '/api/complejos/:ciudadId',
      '/api/canchas/:complejoId/:tipo',
      '/api/disponibilidad/:canchaId/:fecha',
      '/api/reservas',
      '/api/reservas/:codigo'
    ]
  });
});

module.exports = router;

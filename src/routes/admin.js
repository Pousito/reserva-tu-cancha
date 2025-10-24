const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

// Función para establecer la instancia de la base de datos
function setDatabase(databaseInstance) {
    adminController.setDatabase(databaseInstance);
}

// Middleware CORS para todas las rutas de admin
router.use((req, res, next) => {
  // Agregar headers CORS explícitos
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://www.reservatuscanchas.cl');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  
  // Manejar preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// Rutas de gestión de canchas
router.get('/canchas', adminController.getCanchas);

module.exports = { router, setDatabase };

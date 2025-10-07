// ============================================
// CONTROL DE GASTOS E INGRESOS - ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const {
    getCategorias,
    getMovimientos,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    getEstadisticas
} = require('../controllers/gastosController');
const { verifyToken, verifyOwnerOrAdmin } = require('../middleware/auth');

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================

// Categorías
router.get('/categorias', verifyToken, getCategorias);

// Movimientos
router.get('/movimientos', verifyToken, verifyOwnerOrAdmin, getMovimientos);
router.post('/movimientos', verifyToken, verifyOwnerOrAdmin, createMovimiento);
router.put('/movimientos/:id', verifyToken, verifyOwnerOrAdmin, updateMovimiento);
router.delete('/movimientos/:id', verifyToken, verifyOwnerOrAdmin, deleteMovimiento);

// Estadísticas
router.get('/estadisticas', verifyToken, verifyOwnerOrAdmin, getEstadisticas);

module.exports = router;


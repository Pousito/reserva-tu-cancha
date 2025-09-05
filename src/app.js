const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const securityMiddleware = require('./middleware/security');
const db = require('./config/database');

// Importar rutas
const reservationRoutes = require('./routes/reservations');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = config.server.port;

// Middleware de seguridad
const { authLimiter, apiLimiter, reservationLimiter } = securityMiddleware(app);

// Middleware básico
app.use(cors(config.cors));
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
app.use('/api/admin/login', authLimiter);
app.use('/api', apiLimiter);
app.use('/api/reservas', reservationLimiter);

// Rutas API
app.use('/api', reservationRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check para Render
app.get('/health', (req, res) => {
  const diagnosticInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: config.app.version,
    dbPath: config.database.path
  };
  
  // Verificar estado de la base de datos
  db.get('SELECT COUNT(*) as count FROM ciudades', (err, row) => {
    if (err) {
      diagnosticInfo.databaseConnection = 'error';
      diagnosticInfo.databaseError = err.message;
    } else {
      diagnosticInfo.databaseConnection = 'connected';
      diagnosticInfo.citiesCount = row.count;
    }
    
    // Verificar reservas
    db.get('SELECT COUNT(*) as reservas FROM reservas', (err, reservasRow) => {
      if (!err) {
        diagnosticInfo.reservasCount = reservasRow.reservas;
      }
      
      res.status(200).json(diagnosticInfo);
    });
  });
});

// Manejo de rutas no encontradas (DEBE IR AL FINAL)
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = app;

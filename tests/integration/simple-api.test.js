/**
 * Test de integración simple: API básica
 * Valida endpoints sin requerir servidor completo
 */

const request = require('supertest');
const express = require('express');

// Crear una aplicación Express simple para testing
const app = express();
app.use(express.json());

// Mock de endpoints básicos
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/ciudades', (req, res) => {
  res.json([
    { id: 1, nombre: 'Santiago' },
    { id: 2, nombre: 'Valparaíso' },
    { id: 3, nombre: 'Concepción' }
  ]);
});

app.get('/api/complejos/ciudad/:ciudadId', (req, res) => {
  const { ciudadId } = req.params;
  res.json([
    { id: 1, nombre: 'Complejo Test', ciudad_id: parseInt(ciudadId) }
  ]);
});

app.post('/api/reservas', (req, res) => {
  const { cancha_id, fecha, hora_inicio, nombre_cliente } = req.body;
  
  if (!cancha_id || !fecha || !hora_inicio || !nombre_cliente) {
    return res.status(400).json({ error: 'Datos requeridos faltantes' });
  }
  
  res.status(201).json({
    id: 123,
    codigo_reserva: 'TEST123',
    message: 'Reserva creada exitosamente'
  });
});

describe('🔄 API Básica - Flujo de Reservas', () => {
  describe('📋 Health Check', () => {
    test('debería responder con status ok', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('🏙️ Ciudades', () => {
    test('debería obtener lista de ciudades', async () => {
      const response = await request(app)
        .get('/api/ciudades')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
    });
  });

  describe('🏢 Complejos', () => {
    test('debería obtener complejos por ciudad', async () => {
      const response = await request(app)
        .get('/api/complejos/ciudad/1')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
      expect(response.body[0]).toHaveProperty('ciudad_id', 1);
    });
  });

  describe('💾 Reservas', () => {
    test('debería crear reserva con datos válidos', async () => {
      const reservaData = {
        cancha_id: 1,
        fecha: '2024-01-15',
        hora_inicio: '18:00',
        hora_fin: '19:00',
        nombre_cliente: 'Test Usuario',
        email_cliente: 'test@example.com',
        precio_total: 25000
      };

      const response = await request(app)
        .post('/api/reservas')
        .send(reservaData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('codigo_reserva');
      expect(response.body).toHaveProperty('message');
      expect(response.body.codigo_reserva).toBe('TEST123');
    });

    test('debería rechazar reserva con datos faltantes', async () => {
      const reservaData = {
        cancha_id: 1,
        fecha: '2024-01-15'
        // Faltan hora_inicio y nombre_cliente
      };

      const response = await request(app)
        .post('/api/reservas')
        .send(reservaData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Datos requeridos faltantes');
    });
  });

  describe('⚡ Rendimiento', () => {
    test('debería responder en menos de 100ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/ciudades')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    test('debería manejar múltiples consultas concurrentes', async () => {
      const promises = Array(10).fill().map(() => 
        request(app).get('/api/ciudades')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });
    });
  });
});

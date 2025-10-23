/**
 * Test de integración: Flujo completo de reservas
 * Valida todo el proceso desde selección hasta confirmación
 */

const request = require('supertest');
const { Pool } = require('pg');

// Importar la aplicación
const app = require('../../server');

describe('🔄 Flujo Completo de Reservas', () => {
  let testDb;
  let testReservationId;
  let testReservationCode;

  beforeAll(async () => {
    // Configurar base de datos de test
    testDb = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    // Limpiar datos de test anteriores
    await testDb.query('DELETE FROM reservas WHERE email_cliente LIKE $1', ['test_%']);
  });

  afterAll(async () => {
    // Limpiar datos de test
    if (testReservationId) {
      await testDb.query('DELETE FROM reservas WHERE id = $1', [testReservationId]);
    }
    await testDb.end();
  });

  describe('📋 Paso 1: Obtener Ciudades', () => {
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

  describe('🏢 Paso 2: Obtener Complejos por Ciudad', () => {
    test('debería obtener complejos para una ciudad específica', async () => {
      const response = await request(app)
        .get('/api/complejos/ciudad/1')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
      expect(response.body[0]).toHaveProperty('ciudad_id');
    });
  });

  describe('🏟️ Paso 3: Obtener Canchas por Complejo', () => {
    test('debería obtener canchas para un complejo específico', async () => {
      const response = await request(app)
        .get('/api/canchas/complejo/1/tipo/futbol')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('nombre');
      expect(response.body[0]).toHaveProperty('tipo');
      expect(response.body[0]).toHaveProperty('precio_hora');
    });
  });

  describe('📅 Paso 4: Verificar Disponibilidad', () => {
    test('debería verificar disponibilidad de cancha', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/disponibilidad/1/${fecha}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // Puede estar vacío si no hay reservas
    });
  });

  describe('💾 Paso 5: Crear Reserva', () => {
    test('debería crear una reserva exitosamente', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const reservaData = {
        cancha_id: 1,
        fecha: fecha,
        hora_inicio: '18:00',
        hora_fin: '19:00',
        nombre_cliente: 'Test Usuario',
        rut_cliente: '12345678-9',
        email_cliente: 'test_usuario@example.com',
        precio_total: 25000
      };

      const response = await request(app)
        .post('/api/reservas')
        .send(reservaData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('codigo_reserva');
      expect(response.body).toHaveProperty('message');
      expect(response.body.codigo_reserva).toMatch(/^[A-Z0-9]{5,6}$/);

      // Guardar para cleanup
      testReservationId = response.body.id;
      testReservationCode = response.body.codigo_reserva;
    });

    test('debería rechazar reserva duplicada', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const reservaData = {
        cancha_id: 1,
        fecha: fecha,
        hora_inicio: '18:00',
        hora_fin: '19:00',
        nombre_cliente: 'Test Usuario 2',
        rut_cliente: '87654321-0',
        email_cliente: 'test_usuario2@example.com',
        precio_total: 25000
      };

      const response = await request(app)
        .post('/api/reservas')
        .send(reservaData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Ya existe una reserva');
    });
  });

  describe('🔍 Paso 6: Buscar Reserva por Código', () => {
    test('debería encontrar reserva por código', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const response = await request(app)
        .get(`/api/reservas/codigo/${testReservationCode}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('codigo_reserva');
      expect(response.body).toHaveProperty('nombre_cliente');
      expect(response.body).toHaveProperty('email_cliente');
      expect(response.body.codigo_reserva).toBe(testReservationCode);
    });

    test('debería rechazar código inexistente', async () => {
      const response = await request(app)
        .get('/api/reservas/codigo/INVALID')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('📊 Paso 7: Verificar Estadísticas', () => {
    test('debería obtener estadísticas del dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/estadisticas')
        .expect(200);

      expect(response.body).toHaveProperty('totalReservas');
      expect(response.body).toHaveProperty('ingresosTotales');
      expect(response.body).toHaveProperty('totalCanchas');
      expect(response.body).toHaveProperty('totalComplejos');
      expect(response.body).toHaveProperty('reservasPorDia');
      expect(response.body).toHaveProperty('rol');

      expect(typeof response.body.totalReservas).toBe('number');
      expect(typeof response.body.ingresosTotales).toBe('number');
      expect(typeof response.body.totalCanchas).toBe('number');
      expect(typeof response.body.totalComplejos).toBe('number');
      expect(response.body.reservasPorDia).toBeInstanceOf(Array);
    });
  });

  describe('⚡ Rendimiento', () => {
    test('debería responder en menos de 1 segundo', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/ciudades')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
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

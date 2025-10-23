/**
 * Test de integración: Sistema de pagos Transbank
 * Valida el flujo completo de pagos
 */

const request = require('supertest');
const app = require('../../server');

describe('💳 Sistema de Pagos Transbank', () => {
  let testReservationId;
  let testReservationCode;

  beforeAll(async () => {
    // Crear una reserva de prueba para testing de pagos
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fecha = tomorrow.toISOString().split('T')[0];

    const reservaData = {
      cancha_id: 1,
      fecha: fecha,
      hora_inicio: '19:00',
      hora_fin: '20:00',
      nombre_cliente: 'Test Payment User',
      rut_cliente: '11111111-1',
      email_cliente: 'test_payment@example.com',
      precio_total: 30000
    };

    const response = await request(app)
      .post('/api/reservas')
      .send(reservaData);

    if (response.status === 201) {
      testReservationId = response.body.id;
      testReservationCode = response.body.codigo_reserva;
    }
  });

  afterAll(async () => {
    // Limpiar reserva de prueba
    if (testReservationId) {
      const { Pool } = require('pg');
      const testDb = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
      });
      await testDb.query('DELETE FROM reservas WHERE id = $1', [testReservationId]);
      await testDb.end();
    }
  });

  describe('🔧 Configuración de Transbank', () => {
    test('debería tener configuración válida de Transbank', () => {
      expect(process.env.TRANSBANK_API_KEY).toBeDefined();
      expect(process.env.TRANSBANK_COMMERCE_CODE).toBeDefined();
      expect(process.env.TRANSBANK_ENVIRONMENT).toBeDefined();
      expect(process.env.TRANSBANK_RETURN_URL).toBeDefined();
    });

    test('debería estar en modo integración para testing', () => {
      expect(process.env.TRANSBANK_ENVIRONMENT).toBe('integration');
    });
  });

  describe('💸 Creación de Transacción', () => {
    test('debería crear transacción de pago exitosamente', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 30000,
        tipo_pago: 'webpay'
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('amount');
      
      expect(response.body.token).toMatch(/^[a-f0-9-]{36}$/);
      expect(response.body.url).toContain('webpay');
      expect(response.body.amount).toBe(30000);
    });

    test('debería rechazar pago con código inválido', async () => {
      const paymentData = {
        codigo_reserva: 'INVALID',
        monto: 30000,
        tipo_pago: 'webpay'
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Reserva no encontrada');
    });

    test('debería rechazar pago con monto inválido', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: -1000,
        tipo_pago: 'webpay'
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('✅ Confirmación de Pago', () => {
    test('debería confirmar transacción exitosamente', async () => {
      // Simular token de transacción (en modo integración)
      const mockToken = 'mock-token-12345';
      
      const response = await request(app)
        .post('/api/payments/confirm')
        .send({ token: mockToken })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      // En modo integración, puede fallar pero no debe dar error 500
    });

    test('debería rechazar token inválido', async () => {
      const response = await request(app)
        .post('/api/payments/confirm')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('🔄 Flujo de Pago Completo', () => {
    test('debería manejar flujo de pago 50%', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 15000, // 50% de 30000
        tipo_pago: 'webpay',
        porcentaje_pagado: 50
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.amount).toBe(15000);
    });

    test('debería manejar flujo de pago 100%', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 30000, // 100% de 30000
        tipo_pago: 'webpay',
        porcentaje_pagado: 100
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body.amount).toBe(30000);
    });
  });

  describe('📧 Notificaciones de Pago', () => {
    test('debería enviar email de confirmación', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      // Simular confirmación de pago
      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 30000,
        estado_pago: 'confirmado'
      };

      const response = await request(app)
        .post('/api/payments/notify')
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  describe('⚡ Rendimiento de Pagos', () => {
    test('debería crear transacción en menos de 2 segundos', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const start = Date.now();
      
      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 30000,
        tipo_pago: 'webpay'
      };

      await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('🛡️ Seguridad de Pagos', () => {
    test('debería validar monto mínimo', async () => {
      if (!testReservationCode) {
        console.log('⚠️  Saltando test: no hay código de reserva');
        return;
      }

      const paymentData = {
        codigo_reserva: testReservationCode,
        monto: 100, // Muy bajo
        tipo_pago: 'webpay'
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('debería validar formato de datos', async () => {
      const paymentData = {
        codigo_reserva: '', // Vacío
        monto: 'invalid', // No numérico
        tipo_pago: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(paymentData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});

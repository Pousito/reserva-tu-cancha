/**
 * Test de concurrencia: Reservas simultáneas
 * Valida que no se puedan crear reservas duplicadas
 */

const request = require('supertest');
const { Pool } = require('pg');
const app = require('../../server');

describe('⚡ Tests de Concurrencia', () => {
  let testDb;

  beforeAll(async () => {
    testDb = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
  });

  afterAll(async () => {
    await testDb.end();
  });

  describe('🔄 Reservas Concurrentes', () => {
    test('debería prevenir doble reserva en mismo horario', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const reservaData = {
        cancha_id: 1,
        fecha: fecha,
        hora_inicio: '20:00',
        hora_fin: '21:00',
        nombre_cliente: 'Test Concurrency',
        rut_cliente: '22222222-2',
        email_cliente: 'test_concurrency@example.com',
        precio_total: 25000
      };

      // Crear múltiples reservas simultáneas para el mismo horario
      const promises = Array(5).fill().map((_, index) => 
        request(app)
          .post('/api/reservas')
          .send({
            ...reservaData,
            nombre_cliente: `Test Concurrency ${index}`,
            email_cliente: `test_concurrency_${index}@example.com`,
            rut_cliente: `2222222${index}-${index}`
          })
      );

      const responses = await Promise.allSettled(promises);
      
      // Solo una reserva debería ser exitosa
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = responses.filter(r => r.status === 'fulfilled' && r.value.status === 400);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(4);
      
      // Verificar que los fallos son por conflicto de reserva
      failed.forEach(response => {
        expect(response.value.body.error).toContain('Ya existe una reserva');
      });

      // Limpiar reserva exitosa
      if (successful.length > 0) {
        const reservationId = successful[0].value.body.id;
        await testDb.query('DELETE FROM reservas WHERE id = $1', [reservationId]);
      }
    });

    test('debería manejar consultas concurrentes de disponibilidad', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      // Hacer múltiples consultas de disponibilidad simultáneas
      const promises = Array(10).fill().map(() => 
        request(app)
          .get(`/api/disponibilidad/1/${fecha}`)
      );

      const responses = await Promise.all(promises);
      
      // Todas deberían ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });
    });

    test('debería manejar búsquedas concurrentes de reservas', async () => {
      // Crear una reserva de prueba
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const reservaData = {
        cancha_id: 1,
        fecha: fecha,
        hora_inicio: '21:00',
        hora_fin: '22:00',
        nombre_cliente: 'Test Concurrent Search',
        rut_cliente: '33333333-3',
        email_cliente: 'test_concurrent_search@example.com',
        precio_total: 25000
      };

      const createResponse = await request(app)
        .post('/api/reservas')
        .send(reservaData);

      if (createResponse.status === 201) {
        const codigoReserva = createResponse.body.codigo_reserva;

        // Hacer múltiples búsquedas simultáneas
        const promises = Array(5).fill().map(() => 
          request(app)
            .get(`/api/reservas/codigo/${codigoReserva}`)
        );

        const responses = await Promise.all(promises);
        
        // Todas deberían encontrar la reserva
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.codigo_reserva).toBe(codigoReserva);
        });

        // Limpiar
        await testDb.query('DELETE FROM reservas WHERE id = $1', [createResponse.body.id]);
      }
    });
  });

  describe('📊 Consultas Concurrentes del Dashboard', () => {
    test('debería manejar múltiples consultas de estadísticas', async () => {
      const promises = Array(5).fill().map(() => 
        request(app)
          .get('/api/admin/estadisticas')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalReservas');
        expect(response.body).toHaveProperty('ingresosTotales');
      });
    });

    test('debería manejar consultas concurrentes de reservas recientes', async () => {
      const promises = Array(3).fill().map(() => 
        request(app)
          .get('/api/admin/reservas/recientes')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });
    });
  });

  describe('🔐 Autenticación Concurrente', () => {
    test('debería manejar múltiples intentos de login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword'
      };

      const promises = Array(3).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.allSettled(promises);
      
      // Todas deberían fallar (credenciales inválidas) pero no dar error 500
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect([401, 404]).toContain(response.value.status);
        }
      });
    });
  });

  describe('⚡ Rendimiento bajo Carga', () => {
    test('debería mantener rendimiento con 50 consultas simultáneas', async () => {
      const start = Date.now();
      
      const promises = Array(50).fill().map(() => 
        request(app)
          .get('/api/ciudades')
      );

      const responses = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      // Todas deberían ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Debería completarse en menos de 5 segundos
      expect(duration).toBeLessThan(5000);
      
      console.log(`✅ 50 consultas simultáneas completadas en ${duration}ms`);
    });

    test('debería manejar picos de tráfico', async () => {
      const start = Date.now();
      
      // Simular pico de tráfico con diferentes tipos de consultas
      const promises = [
        ...Array(10).fill().map(() => request(app).get('/api/ciudades')),
        ...Array(10).fill().map(() => request(app).get('/api/complejos/ciudad/1')),
        ...Array(10).fill().map(() => request(app).get('/api/admin/estadisticas')),
        ...Array(10).fill().map(() => request(app).get('/api/admin/reservas/recientes'))
      ];

      const responses = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      // Todas deberían ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Debería completarse en menos de 10 segundos
      expect(duration).toBeLessThan(10000);
      
      console.log(`✅ Pico de tráfico (40 consultas) completado en ${duration}ms`);
    });
  });

  describe('🛡️ Validación de Integridad', () => {
    test('debería mantener consistencia de datos bajo concurrencia', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      // Crear reservas concurrentes para diferentes canchas
      const promises = Array(3).fill().map((_, index) => 
        request(app)
          .post('/api/reservas')
          .send({
            cancha_id: index + 1,
            fecha: fecha,
            hora_inicio: '22:00',
            hora_fin: '23:00',
            nombre_cliente: `Test Integrity ${index}`,
            rut_cliente: `4444444${index}-${index}`,
            email_cliente: `test_integrity_${index}@example.com`,
            precio_total: 25000
          })
      );

      const responses = await Promise.allSettled(promises);
      
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      
      // Verificar que se crearon las reservas correctamente
      for (const response of successful) {
        const reservationId = response.value.body.id;
        const result = await testDb.query('SELECT * FROM reservas WHERE id = $1', [reservationId]);
        
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].estado).toBe('pendiente');
        
        // Limpiar
        await testDb.query('DELETE FROM reservas WHERE id = $1', [reservationId]);
      }
    });
  });
});

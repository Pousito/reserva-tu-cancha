/**
 * Test de rendimiento: Base de datos optimizada
 * Valida que las optimizaciones funcionen correctamente
 */

const request = require('supertest');
const { Pool } = require('pg');
const app = require('../../server');

describe('⚡ Rendimiento de Base de Datos', () => {
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

  describe('📊 Consultas del Dashboard', () => {
    test('estadísticas generales deberían ser rápidas', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/estadisticas')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(response.body).toHaveProperty('totalReservas');
      expect(response.body).toHaveProperty('ingresosTotales');
      
      console.log(`📊 Estadísticas generales: ${duration}ms`);
    });

    test('reservas por día deberían ser rápidas', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/estadisticas')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(response.body.reservasPorDia).toBeInstanceOf(Array);
      
      console.log(`📅 Reservas por día: ${duration}ms`);
    });

    test('reservas recientes deberían ser rápidas', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/reservas/recientes')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(response.body).toBeInstanceOf(Array);
      
      console.log(`🕐 Reservas recientes: ${duration}ms`);
    });
  });

  describe('🔍 Consultas de Disponibilidad', () => {
    test('disponibilidad de cancha específica debería ser instantánea', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const start = Date.now();
      
      const response = await request(app)
        .get(`/api/disponibilidad/1/${fecha}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Menos de 50ms
      expect(response.body).toBeInstanceOf(Array);
      
      console.log(`🏟️ Disponibilidad cancha específica: ${duration}ms`);
    });

    test('disponibilidad completa de complejo debería ser rápida', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const start = Date.now();
      
      const response = await request(app)
        .get(`/api/disponibilidad/complejo/1/${fecha}`)
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(response.body).toBeInstanceOf(Array);
      
      console.log(`🏢 Disponibilidad complejo completo: ${duration}ms`);
    });
  });

  describe('🔎 Búsquedas', () => {
    test('búsqueda por código de reserva debería ser instantánea', async () => {
      // Crear una reserva de prueba
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const reservaData = {
        cancha_id: 1,
        fecha: fecha,
        hora_inicio: '23:00',
        hora_fin: '00:00',
        nombre_cliente: 'Test Performance Search',
        rut_cliente: '55555555-5',
        email_cliente: 'test_performance_search@example.com',
        precio_total: 25000
      };

      const createResponse = await request(app)
        .post('/api/reservas')
        .send(reservaData);

      if (createResponse.status === 201) {
        const codigoReserva = createResponse.body.codigo_reserva;

        const start = Date.now();
        
        const response = await request(app)
          .get(`/api/reservas/codigo/${codigoReserva}`)
          .expect(200);
        
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(50); // Menos de 50ms
        expect(response.body.codigo_reserva).toBe(codigoReserva);
        
        console.log(`🔍 Búsqueda por código: ${duration}ms`);
        
        // Limpiar
        await testDb.query('DELETE FROM reservas WHERE id = $1', [createResponse.body.id]);
      }
    });

    test('obtener canchas por complejo debería ser rápida', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/canchas/complejo/1/tipo/futbol')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(response.body).toBeInstanceOf(Array);
      
      console.log(`🏟️ Canchas por complejo: ${duration}ms`);
    });
  });

  describe('📈 Consultas Complejas', () => {
    test('reportes de ingresos deberían ser eficientes', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/estadisticas')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200); // Menos de 200ms
      expect(response.body.ingresosTotales).toBeGreaterThanOrEqual(0);
      
      console.log(`💰 Reportes de ingresos: ${duration}ms`);
    });

    test('consultas con JOINs deberían ser optimizadas', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/reservas/recientes')
        .expect(200);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(150); // Menos de 150ms
      expect(response.body).toBeInstanceOf(Array);
      
      console.log(`🔗 Consultas con JOINs: ${duration}ms`);
    });
  });

  describe('⚡ Rendimiento bajo Carga', () => {
    test('debería mantener rendimiento con consultas repetidas', async () => {
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        
        await request(app)
          .get('/api/admin/estadisticas')
          .expect(200);
        
        const duration = Date.now() - start;
        times.push(duration);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(100); // Promedio menos de 100ms
      expect(maxTime).toBeLessThan(200); // Máximo menos de 200ms
      
      console.log(`📊 Rendimiento promedio: ${avgTime.toFixed(2)}ms`);
      console.log(`📊 Tiempo máximo: ${maxTime}ms`);
    });

    test('debería manejar consultas concurrentes eficientemente', async () => {
      const start = Date.now();
      
      const promises = Array(20).fill().map(() => 
        request(app).get('/api/admin/estadisticas')
      );

      const responses = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo para 20 consultas
      
      console.log(`⚡ 20 consultas concurrentes: ${duration}ms`);
    });
  });

  describe('🔍 Validación de Índices', () => {
    test('debería usar índices para consultas de disponibilidad', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      // Ejecutar consulta y verificar que usa índices
      const result = await testDb.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT hora_inicio, hora_fin 
        FROM reservas 
        WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
        ORDER BY hora_inicio
      `, [1, fecha]);

      const plan = result.rows[0]['QUERY PLAN'];
      
      // Verificar que usa el índice
      expect(plan).toContain('Index Scan');
      expect(plan).toContain('idx_reservas_cancha_fecha_estado');
      
      console.log(`✅ Índice usado: idx_reservas_cancha_fecha_estado`);
    });

    test('debería usar índices para búsqueda por código', async () => {
      // Ejecutar consulta y verificar que usa índices
      const result = await testDb.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM reservas WHERE codigo_reserva = $1
      `, ['TEST123']);

      const plan = result.rows[0]['QUERY PLAN'];
      
      // Verificar que usa el índice
      expect(plan).toContain('Index Scan');
      expect(plan).toContain('idx_reservas_codigo');
      
      console.log(`✅ Índice usado: idx_reservas_codigo`);
    });
  });
});

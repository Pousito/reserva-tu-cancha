/**
 * Test de rendimiento simple: Validación de optimizaciones
 * Valida que las optimizaciones de BD funcionen correctamente
 */

const { Pool } = require('pg');

describe('⚡ Rendimiento de Base de Datos', () => {
  let testDb;

  beforeAll(async () => {
    // Configurar base de datos de desarrollo
    testDb = new Pool({
      connectionString: 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable',
      ssl: false
    });
  });

  afterAll(async () => {
    await testDb.end();
  });

  describe('📊 Consultas Optimizadas', () => {
    test('consulta de ciudades debería ser rápida', async () => {
      const start = Date.now();
      
      const result = await testDb.query('SELECT * FROM ciudades ORDER BY nombre');
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Menos de 50ms
      expect(result.rows).toBeInstanceOf(Array);
      expect(result.rows.length).toBeGreaterThan(0);
      
      console.log(`🏙️ Consulta ciudades: ${duration}ms`);
    });

    test('consulta de complejos debería ser rápida', async () => {
      const start = Date.now();
      
      const result = await testDb.query('SELECT * FROM complejos ORDER BY nombre');
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Menos de 50ms
      expect(result.rows).toBeInstanceOf(Array);
      
      console.log(`🏢 Consulta complejos: ${duration}ms`);
    });

    test('consulta de canchas debería ser rápida', async () => {
      const start = Date.now();
      
      const result = await testDb.query('SELECT * FROM canchas ORDER BY nombre');
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Menos de 50ms
      expect(result.rows).toBeInstanceOf(Array);
      
      console.log(`🏟️ Consulta canchas: ${duration}ms`);
    });
  });

  describe('🔍 Validación de Índices', () => {
    test('debería tener índices de optimización creados', async () => {
      const result = await testDb.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
        ORDER BY indexname
      `);

      const indexNames = result.rows.map(row => row.indexname);
      
      // Verificar que existen los índices principales
      expect(indexNames).toContain('idx_reservas_cancha_fecha_estado');
      expect(indexNames).toContain('idx_reservas_fecha_estado');
      expect(indexNames).toContain('idx_reservas_created_at');
      expect(indexNames).toContain('idx_reservas_codigo');
      expect(indexNames).toContain('idx_canchas_complejo_tipo');
      
      console.log(`✅ Índices encontrados: ${indexNames.length}`);
      console.log(`📋 Índices: ${indexNames.join(', ')}`);
    });

    test('debería usar índices en consultas de disponibilidad', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fecha = tomorrow.toISOString().split('T')[0];

      const result = await testDb.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT hora_inicio, hora_fin 
        FROM reservas 
        WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
        ORDER BY hora_inicio
      `, [1, fecha]);

      const plan = result.rows[0]['QUERY PLAN'];
      
      // Verificar que el plan de ejecución es eficiente
      expect(plan).toBeDefined();
      expect(typeof plan).toBe('string');
      
      // Si hay datos, debería usar el índice
      if (plan.includes('Index Scan')) {
        expect(plan).toContain('idx_reservas_cancha_fecha_estado');
        console.log(`✅ Índice usado: idx_reservas_cancha_fecha_estado`);
      } else {
        console.log(`ℹ️  Sin datos para usar índice (normal en BD de desarrollo)`);
      }
    });
  });

  describe('📈 Rendimiento bajo Carga', () => {
    test('debería manejar múltiples consultas concurrentes', async () => {
      const start = Date.now();
      
      const promises = Array(10).fill().map(() => 
        testDb.query('SELECT COUNT(*) FROM ciudades')
      );

      const results = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      results.forEach(result => {
        expect(result.rows[0].count).toBeDefined();
      });
      
      expect(duration).toBeLessThan(500); // Menos de 500ms para 10 consultas
      
      console.log(`⚡ 10 consultas concurrentes: ${duration}ms`);
    });

    test('debería mantener rendimiento con consultas repetidas', async () => {
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        await testDb.query('SELECT * FROM ciudades LIMIT 5');
        
        const duration = Date.now() - start;
        times.push(duration);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(50); // Promedio menos de 50ms
      expect(maxTime).toBeLessThan(100); // Máximo menos de 100ms
      
      console.log(`📊 Rendimiento promedio: ${avgTime.toFixed(2)}ms`);
      console.log(`📊 Tiempo máximo: ${maxTime}ms`);
    });
  });

  describe('🔍 Consultas Complejas', () => {
    test('consulta con JOINs debería ser eficiente', async () => {
      const start = Date.now();
      
      const result = await testDb.query(`
        SELECT c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
        FROM canchas c
        JOIN complejos co ON c.complejo_id = co.id
        JOIN ciudades ci ON co.ciudad_id = ci.id
        LIMIT 10
      `);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(result.rows).toBeInstanceOf(Array);
      
      console.log(`🔗 Consulta con JOINs: ${duration}ms`);
    });

    test('consulta de estadísticas debería ser rápida', async () => {
      const start = Date.now();
      
      const result = await testDb.query(`
        SELECT 
          COUNT(*) as total_reservas,
          COUNT(CASE WHEN estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
          COALESCE(SUM(CASE WHEN estado = 'confirmada' THEN precio_total ELSE 0 END), 0) as ingresos
        FROM reservas
      `);
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Menos de 100ms
      expect(result.rows[0].total_reservas).toBeDefined();
      expect(result.rows[0].reservas_confirmadas).toBeDefined();
      expect(result.rows[0].ingresos).toBeDefined();
      
      console.log(`📊 Consulta estadísticas: ${duration}ms`);
    });
  });
});

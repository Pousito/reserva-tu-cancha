/**
 * Setup global para tests
 */

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_test';

// Configurar timeout global
jest.setTimeout(30000);

// Configurar console para tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Silenciar logs en tests por defecto
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Configurar cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
});

// Configurar cleanup global
afterAll(async () => {
  // Cerrar conexiones de base de datos si es necesario
  if (global.testDatabase) {
    await global.testDatabase.close();
  }
});

// Configurar manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

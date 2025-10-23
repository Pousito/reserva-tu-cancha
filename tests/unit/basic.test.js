/**
 * Test básico para verificar que Jest funciona
 */

describe('🧪 Tests Básicos', () => {
  test('debería sumar números correctamente', () => {
    expect(2 + 2).toBe(4);
  });

  test('debería verificar que las variables de entorno están configuradas', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('debería verificar que Jest está funcionando', () => {
    expect(true).toBe(true);
  });
});

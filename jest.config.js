module.exports = {
  // Entorno de testing
  testEnvironment: 'node',
  
  // Directorios de tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Configuración de cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Archivos a excluir de cobertura
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/scripts/',
    '/coverage/'
  ],
  
  // Timeout para tests
  testTimeout: 30000,
  
  // Configuración de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Variables de entorno para testing
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Configuración de módulos
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Configuración de transformación
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Configuración de verbose
  verbose: true,
  
  // Configuración de bail
  bail: false,
  
  // Configuración de forceExit
  forceExit: true,
  
  // Configuración de detectOpenHandles
  detectOpenHandles: true
};

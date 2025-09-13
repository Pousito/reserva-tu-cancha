#!/usr/bin/env node

/**
 * Pruebas Básicas de Reservas y Bloqueos Temporales
 * 
 * Este script ejecuta las pruebas usando directamente las APIs del servidor
 * sin depender de la interfaz web
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testTimeout: 10000,
  testData: {
    cliente: {
      nombre: 'Cliente Test Automatizado',
      email: 'test@automatizado.com',
      telefono: '+56912345678',
      rut: '12345678-9'
    },
    admin: {
      email: 'admin@reservatuscanchas.cl',
      password: 'admin123'
    }
  }
};

class BasicReservationTester {
  constructor() {
    this.testResults = [];
    this.adminToken = null;
  }

  async initialize() {
    console.log('🚀 INICIANDO PRUEBAS BÁSICAS DE RESERVAS');
    console.log('========================================');
    
    // Obtener token de admin
    this.adminToken = await this.getAdminToken();
    if (!this.adminToken) {
      console.log('⚠️  No se pudo obtener token de admin, algunas pruebas se saltarán');
    }
    
    console.log('✅ Sistema inicializado correctamente');
  }

  async runAllTests() {
    try {
      await this.initialize();
      
      // Ejecutar todas las pruebas
      await this.testWebToAdminReservation();
      await this.testAdminToWebReservation();
      await this.testNormalTemporalBlocks();
      await this.testConcurrentTemporalBlocks();
      
      // Generar reporte
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Error en las pruebas:', error);
      await this.generateReport();
    }
  }

  async testWebToAdminReservation() {
    console.log('\n🧪 PRUEBA 1: Reserva Web → Admin');
    console.log('================================');
    
    const startTime = Date.now();
    
    try {
      // Paso 1: Hacer reserva desde web
      console.log('📝 Paso 1: Creando reserva desde web...');
      const reservaData = await this.createReservationFromWeb();
      
      if (!reservaData.success) {
        throw new Error(`Error creando reserva desde web: ${reservaData.error}`);
      }
      
      console.log('✅ Reserva creada desde web:', reservaData.codigo);
      
      // Paso 2: Intentar hacer la misma reserva desde admin
      console.log('📝 Paso 2: Intentando crear la misma reserva desde admin...');
      const adminResult = await this.attemptReservationFromAdmin(reservaData);
      
      // Paso 3: Verificar que la reserva desde admin falló
      if (adminResult.success) {
        throw new Error('❌ ERROR: Se pudo crear reserva duplicada desde admin');
      }
      
      console.log('✅ Correcto: No se pudo crear reserva duplicada desde admin');
      
      this.testResults.push({
        test: 'WebToAdmin',
        status: 'PASSED',
        duration: Date.now() - startTime,
        details: {
          webReservation: reservaData,
          adminAttempt: adminResult
        }
      });
      
    } catch (error) {
      console.error('❌ Prueba WebToAdmin falló:', error.message);
      this.testResults.push({
        test: 'WebToAdmin',
        status: 'FAILED',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  async testAdminToWebReservation() {
    console.log('\n🧪 PRUEBA 2: Reserva Admin → Web');
    console.log('================================');
    
    const startTime = Date.now();
    
    try {
      if (!this.adminToken) {
        throw new Error('No hay token de admin disponible');
      }
      
      // Paso 1: Hacer reserva desde admin
      console.log('📝 Paso 1: Creando reserva desde admin...');
      const reservaData = await this.createReservationFromAdmin();
      
      if (!reservaData.success) {
        throw new Error(`Error creando reserva desde admin: ${reservaData.error}`);
      }
      
      console.log('✅ Reserva creada desde admin:', reservaData.codigo);
      
      // Paso 2: Intentar hacer la misma reserva desde web
      console.log('📝 Paso 2: Intentando crear la misma reserva desde web...');
      const webResult = await this.attemptReservationFromWeb(reservaData);
      
      // Paso 3: Verificar que la reserva desde web falló
      if (webResult.success) {
        throw new Error('❌ ERROR: Se pudo crear reserva duplicada desde web');
      }
      
      console.log('✅ Correcto: No se pudo crear reserva duplicada desde web');
      
      this.testResults.push({
        test: 'AdminToWeb',
        status: 'PASSED',
        duration: Date.now() - startTime,
        details: {
          adminReservation: reservaData,
          webAttempt: webResult
        }
      });
      
    } catch (error) {
      console.error('❌ Prueba AdminToWeb falló:', error.message);
      this.testResults.push({
        test: 'AdminToWeb',
        status: 'FAILED',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  async testNormalTemporalBlocks() {
    console.log('\n🧪 PRUEBA 3: Bloqueos Temporales Normales');
    console.log('==========================================');
    
    const startTime = Date.now();
    
    try {
      // Paso 1: Crear bloqueo temporal desde web
      console.log('📝 Paso 1: Creando bloqueo temporal desde web...');
      const bloqueoData = await this.createTemporalBlockFromWeb();
      
      if (!bloqueoData.success) {
        throw new Error(`Error creando bloqueo temporal: ${bloqueoData.error}`);
      }
      
      console.log('✅ Bloqueo temporal creado:', bloqueoData.id);
      
      // Paso 2: Verificar que no se puede reservar desde admin
      console.log('📝 Paso 2: Verificando que no se puede reservar desde admin...');
      const adminCheck = await this.checkAvailabilityFromAdmin(bloqueoData);
      
      if (adminCheck.available) {
        throw new Error('❌ ERROR: Admin puede reservar horario con bloqueo temporal');
      }
      
      console.log('✅ Correcto: Admin no puede reservar horario con bloqueo temporal');
      
      // Paso 3: Verificar que sí se puede completar la reserva desde web
      console.log('📝 Paso 3: Completando reserva desde web...');
      const webCompletion = await this.completeReservationFromWeb(bloqueoData);
      
      if (!webCompletion.success) {
        throw new Error(`Error completando reserva desde web: ${webCompletion.error}`);
      }
      
      console.log('✅ Reserva completada desde web:', webCompletion.codigo);
      
      this.testResults.push({
        test: 'NormalTemporalBlocks',
        status: 'PASSED',
        duration: Date.now() - startTime,
        details: {
          temporalBlock: bloqueoData,
          adminCheck: adminCheck,
          webCompletion: webCompletion
        }
      });
      
    } catch (error) {
      console.error('❌ Prueba NormalTemporalBlocks falló:', error.message);
      this.testResults.push({
        test: 'NormalTemporalBlocks',
        status: 'FAILED',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  async testConcurrentTemporalBlocks() {
    console.log('\n🧪 PRUEBA 4: Bloqueos Temporales Concurrentes');
    console.log('=============================================');
    
    const startTime = Date.now();
    
    try {
      // Paso 1: Crear bloqueos temporales concurrentes
      console.log('📝 Paso 1: Creando bloqueos temporales concurrentes...');
      const bloqueos = await this.createConcurrentTemporalBlocks();
      
      if (bloqueos.length !== 2) {
        throw new Error(`Error: Se esperaban 2 bloqueos, se crearon ${bloqueos.length}`);
      }
      
      console.log('✅ Bloqueos temporales concurrentes creados:', bloqueos.map(b => b.id));
      
      // Paso 2: Intentar completar ambas reservas
      console.log('📝 Paso 2: Intentando completar ambas reservas...');
      const results = await this.attemptConcurrentReservations(bloqueos);
      
      // Paso 3: Verificar que solo una reserva se completó
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length !== 1) {
        throw new Error(`Error: Se esperaba 1 reserva exitosa, se completaron ${successful.length}`);
      }
      
      if (failed.length !== 1) {
        throw new Error(`Error: Se esperaba 1 reserva fallida, fallaron ${failed.length}`);
      }
      
      console.log('✅ Correcto: Solo una reserva se completó exitosamente');
      console.log(`   - Exitosa: ${successful[0].codigo}`);
      console.log(`   - Fallida: ${failed[0].error}`);
      
      this.testResults.push({
        test: 'ConcurrentTemporalBlocks',
        status: 'PASSED',
        duration: Date.now() - startTime,
        details: {
          concurrentBlocks: bloqueos,
          results: results,
          successful: successful,
          failed: failed
        }
      });
      
    } catch (error) {
      console.error('❌ Prueba ConcurrentTemporalBlocks falló:', error.message);
      this.testResults.push({
        test: 'ConcurrentTemporalBlocks',
        status: 'FAILED',
        duration: Date.now() - startTime,
        error: error.message
      });
    }
  }

  // Métodos auxiliares
  async getAdminToken() {
    try {
      const response = await this.makeRequest('POST', '/api/admin/login', {
        email: CONFIG.testData.admin.email,
        password: CONFIG.testData.admin.password
      });
      
      if (response.success && response.token) {
        console.log('✅ Token de admin obtenido');
        return response.token;
      } else {
        console.log('❌ Error obteniendo token de admin:', response.error);
        return null;
      }
    } catch (error) {
      console.log('❌ Error obteniendo token de admin:', error.message);
      return null;
    }
  }

  async createReservationFromWeb() {
    try {
      const response = await this.makeRequest('POST', '/api/reservas/bloquear-y-pagar', {
        cancha_id: 1,
        nombre_cliente: CONFIG.testData.cliente.nombre,
        email_cliente: CONFIG.testData.cliente.email,
        telefono_cliente: CONFIG.testData.cliente.telefono,
        rut_cliente: CONFIG.testData.cliente.rut,
        fecha: this.getTomorrowDate(),
        hora_inicio: this.getUniqueHour(),
        hora_fin: this.getNextHour(this.getUniqueHour()),
        precio_total: 25000,
        session_id: 'test-session-' + Date.now()
      });
      
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createReservationFromAdmin() {
    try {
      if (!this.adminToken) {
        throw new Error('No hay token de admin disponible');
      }
      
      const response = await this.makeRequest('POST', '/api/reservas', {
        cancha_id: 1,
        fecha: this.getTomorrowDate(),
        hora_inicio: '15:00',
        hora_fin: '16:00',
        nombre_cliente: 'Cliente Test Admin',
        email_cliente: 'admin.test@automatizado.com',
        telefono_cliente: CONFIG.testData.cliente.telefono,
        rut_cliente: '87654321-0',
        precio_total: 25000,
        estado: 'confirmada'
      }, this.adminToken);
      
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async attemptReservationFromAdmin(reservaData) {
    try {
      if (!this.adminToken) {
        throw new Error('No hay token de admin disponible');
      }
      
      const response = await this.makeRequest('POST', '/api/reservas', {
        cancha_id: reservaData.cancha_id,
        fecha: reservaData.fecha,
        hora_inicio: reservaData.hora_inicio,
        hora_fin: reservaData.hora_fin,
        nombre_cliente: 'Test Duplicado',
        email_cliente: 'duplicado@test.com',
        telefono_cliente: '+56999999999',
        rut_cliente: '11111111-1',
        precio_total: 25000,
        estado: 'confirmada'
      }, this.adminToken);
      
      return {
        success: response.success,
        error: response.error || 'Reserva duplicada creada incorrectamente'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async attemptReservationFromWeb(reservaData) {
    try {
      const response = await this.makeRequest('POST', '/api/reservas/bloquear-y-pagar', {
        cancha_id: reservaData.cancha_id,
        nombre_cliente: 'Test Duplicado',
        email_cliente: 'duplicado@test.com',
        telefono_cliente: '+56999999999',
        rut_cliente: '11111111-1',
        fecha: reservaData.fecha,
        hora_inicio: reservaData.hora_inicio,
        hora_fin: reservaData.hora_fin,
        precio_total: 25000,
        session_id: 'test-duplicate-' + Date.now()
      });
      
      return {
        success: response.success,
        error: response.error || 'Reserva duplicada creada incorrectamente'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createTemporalBlockFromWeb() {
    try {
      const response = await this.makeRequest('POST', '/api/reservas/bloquear', {
        cancha_id: 1,
        fecha: this.getTomorrowDate(),
        hora_inicio: '16:00',
        hora_fin: '17:00',
        session_id: 'test-block-' + Date.now(),
        datos_cliente: {
          nombre: 'Cliente Test Bloqueo',
          email: 'bloqueo@test.com',
          telefono: CONFIG.testData.cliente.telefono,
          rut: CONFIG.testData.cliente.rut
        }
      });
      
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkAvailabilityFromAdmin(bloqueoData) {
    try {
      const response = await this.makeRequest('GET', `/api/disponibilidad-completa/1/${bloqueoData.fecha}`);
      
      // Verificar si el horario está disponible
      const isAvailable = !response['1'] || 
                         !response['1'].reservas.some(r => 
                           r.hora_inicio === bloqueoData.hora_inicio
                         );
      
      return { available: isAvailable };
    } catch (error) {
      return { available: true }; // Asumir disponible en caso de error
    }
  }

  async completeReservationFromWeb(bloqueoData) {
    try {
      const response = await this.makeRequest('POST', '/api/reservas/bloquear-y-pagar', {
        bloqueo_id: bloqueoData.id,
        cancha_id: 1,
        nombre_cliente: 'Cliente Test Bloqueo',
        email_cliente: 'bloqueo@test.com',
        telefono_cliente: CONFIG.testData.cliente.telefono,
        rut_cliente: CONFIG.testData.cliente.rut,
        fecha: this.getTomorrowDate(),
        hora_inicio: '16:00',
        hora_fin: '17:00',
        precio_total: 25000,
        session_id: 'test-block-' + Date.now()
      });
      
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createConcurrentTemporalBlocks() {
    try {
      const bloqueos = [];
      const sessionIds = ['concurrent-session-1', 'concurrent-session-2'];
      
      for (let i = 0; i < 2; i++) {
        const sessionId = sessionIds[i];
        const hora = '17:00'; // Misma hora para ambos
        
        const response = await this.makeRequest('POST', '/api/reservas/bloquear', {
          cancha_id: 1,
          fecha: this.getTomorrowDate(),
          hora_inicio: hora,
          hora_fin: '18:00',
          session_id: sessionId,
          datos_cliente: {
            nombre: `Cliente Concurrente ${sessionId}`,
            email: `concurrente${sessionId}@test.com`,
            telefono: CONFIG.testData.cliente.telefono,
            rut: CONFIG.testData.cliente.rut
          }
        });
        
        if (response.success) {
          bloqueos.push({
            id: response.bloqueo_id,
            session_id: sessionId,
            cancha_id: 1,
            fecha: this.getTomorrowDate(),
            hora_inicio: hora,
            hora_fin: '18:00'
          });
        }
        
        // Pequeña pausa entre bloqueos
        await this.sleep(500);
      }
      
      return bloqueos;
    } catch (error) {
      console.error('❌ Error creando bloqueos concurrentes:', error);
      return [];
    }
  }

  async attemptConcurrentReservations(bloqueos) {
    try {
      const results = [];
      
      for (const bloqueo of bloqueos) {
        const response = await this.makeRequest('POST', '/api/reservas/bloquear-y-pagar', {
          bloqueo_id: bloqueo.id,
          cancha_id: 1,
          nombre_cliente: 'Cliente Concurrente',
          email_cliente: 'concurrente@test.com',
          telefono_cliente: CONFIG.testData.cliente.telefono,
          rut_cliente: CONFIG.testData.cliente.rut,
          fecha: this.getTomorrowDate(),
          hora_inicio: '17:00',
          hora_fin: '18:00',
          precio_total: 25000,
          session_id: 'concurrent-' + Date.now()
        });
        
        results.push({
          success: response.success,
          codigo: response.codigo_reserva,
          error: response.error,
          bloqueo_id: bloqueo.id
        });
        
        // Pequeña pausa entre intentos
        await this.sleep(100);
      }
      
      return results;
    } catch (error) {
      console.error('❌ Error intentando reservas concurrentes:', error);
      return [{ success: false, error: error.message }];
    }
  }

  // Métodos de utilidad
  async makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, CONFIG.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.testTimeout
      };
      
      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
      
      const req = http.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (error) {
            reject(new Error(`Error parsing response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  getUniqueHour() {
    // Generar una hora única basada en el timestamp actual
    const now = new Date();
    const hour = 10 + (now.getSeconds() % 8); // Horas entre 10:00 y 17:00
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  getNextHour(hour) {
    const hourNum = parseInt(hour.split(':')[0]);
    const nextHour = hourNum + 1;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateReport() {
    console.log('\n📊 REPORTE DE PRUEBAS');
    console.log('=====================');
    
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(t => t.status === 'PASSED').length,
      failed: this.testResults.filter(t => t.status === 'FAILED').length,
      results: this.testResults
    };
    
    // Mostrar resumen en consola
    console.log(`Total de pruebas: ${report.totalTests}`);
    console.log(`✅ Exitosas: ${report.passed}`);
    console.log(`❌ Fallidas: ${report.failed}`);
    
    // Mostrar detalles de cada prueba
    this.testResults.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${test.test}: ${test.status} (${test.duration}ms)`);
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    
    // Guardar reporte en archivo
    const reportPath = path.join(__dirname, `basic-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado en: ${reportPath}`);
    
    // Determinar si todas las pruebas pasaron
    if (report.failed > 0) {
      console.log('\n❌ ALGUNAS PRUEBAS FALLARON - REVISAR ANTES DE PRODUCCIÓN');
      process.exit(1);
    } else {
      console.log('\n🎉 TODAS LAS PRUEBAS PASARON - LISTO PARA PRODUCCIÓN');
      process.exit(0);
    }
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  const tester = new BasicReservationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = BasicReservationTester;

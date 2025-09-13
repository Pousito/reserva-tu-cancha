#!/usr/bin/env node

/**
 * Pruebas Funcionales de Reservas y Bloqueos Temporales
 * 
 * Este script ejecuta las pruebas usando los endpoints correctos del servidor
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3000/admin-reservations.html',
  testTimeout: 30000,
  headless: process.env.HEADLESS === 'true' || false,
  slowMo: process.env.HEADLESS === 'true' ? 0 : 100,
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

class WorkingReservationTester {
  constructor() {
    this.browser = null;
    this.pages = {
      web: null,
      admin: null
    };
    this.testResults = [];
    this.currentTest = null;
  }

  async initialize() {
    console.log('🚀 INICIANDO PRUEBAS FUNCIONALES DE RESERVAS');
    console.log('============================================');
    
    // Inicializar navegador
    this.browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Crear páginas
    this.pages.web = await this.browser.newPage();
    this.pages.admin = await this.browser.newPage();

    // Configurar páginas
    await this.setupPage(this.pages.web, 'Web Principal');
    await this.setupPage(this.pages.admin, 'Panel Admin');

    console.log('✅ Sistema inicializado correctamente');
  }

  async setupPage(page, name) {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Interceptar requests para logging
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`📡 ${name} - ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/') && !response.ok()) {
        console.log(`❌ ${name} - Error ${response.status()} en ${response.url()}`);
      }
    });
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
    } finally {
      await this.cleanup();
    }
  }

  async testWebToAdminReservation() {
    console.log('\n🧪 PRUEBA 1: Reserva Web → Admin');
    console.log('================================');
    
    this.currentTest = 'WebToAdmin';
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
    
    this.currentTest = 'AdminToWeb';
    const startTime = Date.now();
    
    try {
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
    
    this.currentTest = 'NormalTemporalBlocks';
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
    
    this.currentTest = 'ConcurrentTemporalBlocks';
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
  async createReservationFromWeb() {
    try {
      console.log('🌐 Navegando a página web...');
      await this.pages.web.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
      
      // Crear reserva directamente via API usando el endpoint correcto
      console.log('🔒 Creando reserva desde web...');
      const reservaResponse = await this.pages.web.evaluate(async () => {
        const response = await fetch('/api/reservas/bloquear-y-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: 1,
            nombre_cliente: 'Cliente Test Automatizado',
            email_cliente: 'test@automatizado.com',
            telefono_cliente: '+56912345678',
            rut_cliente: '12345678-9',
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: '14:00',
            hora_fin: '15:00',
            precio_total: 25000,
            session_id: 'test-session-' + Date.now()
          })
        });
        return await response.json();
      });
      
      if (!reservaResponse.success) {
        throw new Error(`Error creando reserva: ${reservaResponse.error}`);
      }
      
      return {
        success: true,
        codigo: reservaResponse.codigo_reserva,
        cancha_id: 1,
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hora_inicio: '14:00',
        hora_fin: '15:00'
      };
      
    } catch (error) {
      console.error('❌ Error creando reserva desde web:', error);
      return { success: false, error: error.message };
    }
  }

  async createReservationFromAdmin() {
    try {
      console.log('🔐 Navegando a panel admin...');
      await this.pages.admin.goto(CONFIG.adminUrl, { waitUntil: 'networkidle2' });
      
      // Verificar si ya estamos logueados
      const isLoggedIn = await this.pages.admin.evaluate(() => {
        return localStorage.getItem('adminToken') !== null;
      });
      
      if (!isLoggedIn) {
        console.log('🔑 Iniciando sesión en admin...');
        await this.pages.admin.goto(`${CONFIG.baseUrl}/admin-login.html`);
        await this.pages.admin.waitForSelector('#email');
        
        await this.pages.admin.type('#email', CONFIG.testData.admin.email);
        await this.pages.admin.type('#password', CONFIG.testData.admin.password);
        await this.pages.admin.click('button[type="submit"]');
        
        await this.pages.admin.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Crear reserva directamente via API
      console.log('💾 Creando reserva desde admin...');
      const reservaResponse = await this.pages.admin.evaluate(async () => {
        const response = await fetch('/api/reservas', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            cancha_id: 1,
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: '15:00',
            hora_fin: '16:00',
            nombre_cliente: 'Cliente Test Admin',
            email_cliente: 'admin.test@automatizado.com',
            telefono_cliente: '+56912345678',
            rut_cliente: '87654321-0',
            precio_total: 25000,
            estado: 'confirmada'
          })
        });
        return await response.json();
      });
      
      if (!reservaResponse.success) {
        throw new Error(`Error creando reserva desde admin: ${reservaResponse.error}`);
      }
      
      return {
        success: true,
        codigo: reservaResponse.codigo_reserva,
        cancha_id: 1,
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hora_inicio: '15:00',
        hora_fin: '16:00'
      };
      
    } catch (error) {
      console.error('❌ Error creando reserva desde admin:', error);
      return { success: false, error: error.message };
    }
  }

  async attemptReservationFromAdmin(reservaData) {
    try {
      console.log('🔄 Intentando reserva duplicada desde admin...');
      
      const reservaResponse = await this.pages.admin.evaluate(async (data) => {
        const response = await fetch('/api/reservas', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            cancha_id: data.cancha_id,
            fecha: data.fecha,
            hora_inicio: data.hora_inicio,
            hora_fin: data.hora_fin,
            nombre_cliente: 'Test Duplicado',
            email_cliente: 'duplicado@test.com',
            telefono_cliente: '+56999999999',
            rut_cliente: '11111111-1',
            precio_total: 25000,
            estado: 'confirmada'
          })
        });
        return await response.json();
      }, reservaData);
      
      return {
        success: reservaResponse.success,
        error: reservaResponse.error || 'Reserva duplicada creada incorrectamente'
      };
      
    } catch (error) {
      console.error('❌ Error intentando reserva duplicada desde admin:', error);
      return { success: false, error: error.message };
    }
  }

  async attemptReservationFromWeb(reservaData) {
    try {
      console.log('🔄 Intentando reserva duplicada desde web...');
      
      const reservaResponse = await this.pages.web.evaluate(async (data) => {
        const response = await fetch('/api/reservas/bloquear-y-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: data.cancha_id,
            nombre_cliente: 'Test Duplicado',
            email_cliente: 'duplicado@test.com',
            telefono_cliente: '+56999999999',
            rut_cliente: '11111111-1',
            fecha: data.fecha,
            hora_inicio: data.hora_inicio,
            hora_fin: data.hora_fin,
            precio_total: 25000,
            session_id: 'test-duplicate-' + Date.now()
          })
        });
        return await response.json();
      }, reservaData);
      
      return {
        success: reservaResponse.success,
        error: reservaResponse.error || 'Reserva duplicada creada incorrectamente'
      };
      
    } catch (error) {
      console.error('❌ Error intentando reserva duplicada desde web:', error);
      return { success: false, error: error.message };
    }
  }

  async createTemporalBlockFromWeb() {
    try {
      console.log('🔒 Creando bloqueo temporal desde web...');
      
      const bloqueoResponse = await this.pages.web.evaluate(async () => {
        const response = await fetch('/api/reservas/bloquear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: 1,
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: '16:00',
            hora_fin: '17:00',
            session_id: 'test-block-' + Date.now(),
            datos_cliente: {
              nombre: 'Cliente Test Bloqueo',
              email: 'bloqueo@test.com',
              telefono: '+56912345678',
              rut: '12345678-9'
            }
          })
        });
        return await response.json();
      });
      
      if (!bloqueoResponse.success) {
        throw new Error(`Error creando bloqueo temporal: ${bloqueoResponse.error}`);
      }
      
      return {
        success: true,
        id: bloqueoResponse.bloqueo_id,
        cancha_id: 1,
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hora_inicio: '16:00',
        hora_fin: '17:00',
        session_id: 'test-block-' + Date.now()
      };
      
    } catch (error) {
      console.error('❌ Error creando bloqueo temporal:', error);
      return { success: false, error: error.message };
    }
  }

  async checkAvailabilityFromAdmin(bloqueoData) {
    try {
      console.log('🔍 Verificando disponibilidad desde admin...');
      
      // Verificar disponibilidad via API
      const availabilityResponse = await this.pages.admin.evaluate(async (data) => {
        const response = await fetch(`/api/disponibilidad-completa/1/${data.fecha}`);
        return await response.json();
      }, bloqueoData);
      
      // Verificar si el horario está disponible
      const isAvailable = !availabilityResponse['1'] || 
                         !availabilityResponse['1'].reservas.some(r => 
                           r.hora_inicio === bloqueoData.hora_inicio
                         );
      
      return { available: isAvailable };
      
    } catch (error) {
      console.error('❌ Error verificando disponibilidad desde admin:', error);
      return { available: true }; // Asumir disponible en caso de error
    }
  }

  async completeReservationFromWeb(bloqueoData) {
    try {
      console.log('💳 Completando reserva desde web...');
      
      const reservaResponse = await this.pages.web.evaluate(async (bloqueoId) => {
        const response = await fetch('/api/reservas/bloquear-y-pagar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bloqueo_id: bloqueoId,
            cancha_id: 1,
            nombre_cliente: 'Cliente Test Bloqueo',
            email_cliente: 'bloqueo@test.com',
            telefono_cliente: '+56912345678',
            rut_cliente: '12345678-9',
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: '16:00',
            hora_fin: '17:00',
            precio_total: 25000,
            session_id: 'test-block-' + Date.now()
          })
        });
        return await response.json();
      }, bloqueoData.id);
      
      if (!reservaResponse.success) {
        throw new Error(`Error completando reserva: ${reservaResponse.error}`);
      }
      
      return {
        success: true,
        codigo: reservaResponse.codigo_reserva
      };
      
    } catch (error) {
      console.error('❌ Error completando reserva:', error);
      return { success: false, error: error.message };
    }
  }

  async createConcurrentTemporalBlocks() {
    try {
      console.log('🔄 Creando bloqueos temporales concurrentes...');
      
      const bloqueos = [];
      const sessionIds = ['concurrent-session-1', 'concurrent-session-2'];
      
      for (let i = 0; i < 2; i++) {
        const sessionId = sessionIds[i];
        const hora = '17:00'; // Misma hora para ambos
        
        const bloqueoResponse = await this.pages.web.evaluate(async (sessionId, hora) => {
          const response = await fetch('/api/reservas/bloquear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cancha_id: 1,
              fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              hora_inicio: hora,
              hora_fin: '18:00',
              session_id: sessionId,
              datos_cliente: {
                nombre: `Cliente Concurrente ${sessionId}`,
                email: `concurrente${sessionId}@test.com`,
                telefono: '+56912345678',
                rut: '12345678-9'
              }
            })
          });
          return await response.json();
        }, sessionId, hora);
        
        if (bloqueoResponse.success) {
          bloqueos.push({
            id: bloqueoResponse.bloqueo_id,
            session_id: sessionId,
            cancha_id: 1,
            fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hora_inicio: hora,
            hora_fin: '18:00'
          });
        }
        
        // Pequeña pausa entre bloqueos
        await this.pages.web.waitForTimeout(500);
      }
      
      return bloqueos;
      
    } catch (error) {
      console.error('❌ Error creando bloqueos concurrentes:', error);
      return [];
    }
  }

  async attemptConcurrentReservations(bloqueos) {
    try {
      console.log('🔄 Intentando reservas concurrentes...');
      
      const results = [];
      
      for (const bloqueo of bloqueos) {
        const reservaResponse = await this.pages.web.evaluate(async (bloqueoId) => {
          const response = await fetch('/api/reservas/bloquear-y-pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bloqueo_id: bloqueoId,
              cancha_id: 1,
              nombre_cliente: 'Cliente Concurrente',
              email_cliente: 'concurrente@test.com',
              telefono_cliente: '+56912345678',
              rut_cliente: '12345678-9',
              fecha: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              hora_inicio: '17:00',
              hora_fin: '18:00',
              precio_total: 25000,
              session_id: 'concurrent-' + Date.now()
            })
          });
          return await response.json();
        }, bloqueo.id);
        
        results.push({
          success: reservaResponse.success,
          codigo: reservaResponse.codigo_reserva,
          error: reservaResponse.error,
          bloqueo_id: bloqueo.id
        });
        
        // Pequeña pausa entre intentos
        await this.pages.web.waitForTimeout(100);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Error intentando reservas concurrentes:', error);
      return [{ success: false, error: error.message }];
    }
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
    const reportPath = path.join(__dirname, `working-test-report-${Date.now()}.json`);
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

  async cleanup() {
    console.log('\n🧹 Limpiando recursos...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    console.log('✅ Limpieza completada');
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  const tester = new WorkingReservationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WorkingReservationTester;

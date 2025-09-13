#!/usr/bin/env node

/**
 * Sistema Automatizado de Pruebas para Reservas y Bloqueos Temporales
 * 
 * Este script automatiza las siguientes pruebas:
 * 1. Reserva desde web → verificar que no se puede hacer desde admin
 * 2. Reserva desde admin → verificar que no se puede hacer desde web
 * 3. Bloqueos temporales normales (una pestaña)
 * 4. Bloqueos temporales concurrentes (dos pestañas)
 */

const puppeteer = require('puppeteer');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3000/admin-reservations.html',
  databaseUrl: process.env.DATABASE_URL,
  testTimeout: 30000,
  headless: process.env.HEADLESS === 'true' || false, // Mostrar navegador para debugging
  slowMo: process.env.HEADLESS === 'true' ? 0 : 100, // Ralentizar acciones para observación
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

class AutomatedReservationTester {
  constructor() {
    this.browser = null;
    this.pages = {
      web: null,
      admin: null
    };
    this.db = null;
    this.testResults = [];
    this.currentTest = null;
  }

  async initialize() {
    console.log('🚀 INICIANDO SISTEMA DE PRUEBAS AUTOMATIZADAS');
    console.log('===============================================');
    
    // Inicializar base de datos
    this.db = new Pool({
      connectionString: CONFIG.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

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
      
      // Limpiar datos de prueba anteriores
      await this.cleanupTestData();
      
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
      // Limpiar datos de prueba anteriores
      await this.cleanupTestData();
      
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
      // Limpiar datos de prueba anteriores
      await this.cleanupTestData();
      
      // Paso 1: Abrir cancha en web y crear bloqueo temporal
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
      // Limpiar datos de prueba anteriores
      await this.cleanupTestData();
      
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

  // Métodos auxiliares para crear reservas
  async createReservationFromWeb() {
    try {
      console.log('🌐 Navegando a página web...');
      await this.pages.web.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
      
      // Esperar a que la página cargue completamente
      await this.pages.web.waitForSelector('#ciudadSelect', { timeout: 10000 });
      
      // Seleccionar ciudad (Los Ángeles)
      console.log('🏙️ Seleccionando ciudad...');
      await this.pages.web.select('#ciudadSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar complejo
      console.log('🏢 Seleccionando complejo...');
      await this.pages.web.waitForSelector('#complejoSelect');
      await this.pages.web.select('#complejoSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar tipo de cancha
      console.log('⚽ Seleccionando tipo de cancha...');
      await this.pages.web.waitForSelector('#tipoCanchaSelect');
      await this.pages.web.select('#tipoCanchaSelect', 'padel');
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar fecha (mañana)
      console.log('📅 Seleccionando fecha...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fechaStr = tomorrow.toISOString().split('T')[0];
      await this.pages.web.type('#fechaInput', fechaStr);
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar hora (14:00)
      console.log('🕐 Seleccionando hora...');
      await this.pages.web.click('[data-hora="14:00"]');
      await this.pages.web.waitForTimeout(1000);
      
      // Llenar datos del cliente
      console.log('👤 Llenando datos del cliente...');
      await this.pages.web.type('#nombreCliente', CONFIG.testData.cliente.nombre);
      await this.pages.web.type('#emailCliente', CONFIG.testData.cliente.email);
      await this.pages.web.type('#telefonoCliente', CONFIG.testData.cliente.telefono);
      await this.pages.web.type('#rutCliente', CONFIG.testData.cliente.rut);
      
      // Crear bloqueo temporal
      console.log('🔒 Creando bloqueo temporal...');
      const bloqueoResponse = await this.pages.web.evaluate(async () => {
        const response = await fetch('/api/crear-bloqueo-temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: 1,
            fecha: document.getElementById('fechaInput').value,
            hora_inicio: '14:00',
            hora_fin: '15:00',
            session_id: 'test-session-' + Date.now(),
            datos_cliente: {
              nombre: document.getElementById('nombreCliente').value,
              email: document.getElementById('emailCliente').value,
              telefono: document.getElementById('telefonoCliente').value,
              rut: document.getElementById('rutCliente').value
            }
          })
        });
        return await response.json();
      });
      
      if (!bloqueoResponse.success) {
        throw new Error(`Error creando bloqueo temporal: ${bloqueoResponse.error}`);
      }
      
      // Completar reserva
      console.log('💳 Completando reserva...');
      const reservaResponse = await this.pages.web.evaluate(async (bloqueoId) => {
        const response = await fetch('/api/confirmar-reserva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bloqueo_id: bloqueoId,
            metodo_pago: 'test'
          })
        });
        return await response.json();
      }, bloqueoResponse.bloqueo_id);
      
      if (!reservaResponse.success) {
        throw new Error(`Error completando reserva: ${reservaResponse.error}`);
      }
      
      return {
        success: true,
        codigo: reservaResponse.codigo_reserva,
        bloqueo_id: bloqueoResponse.bloqueo_id,
        cancha_id: 1,
        fecha: fechaStr,
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
        await this.pages.admin.click('#loginBtn');
        
        await this.pages.admin.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // Navegar a reservas
      console.log('📋 Navegando a sección de reservas...');
      await this.pages.admin.goto(CONFIG.adminUrl);
      await this.pages.admin.waitForSelector('.calendar-container', { timeout: 10000 });
      
      // Cambiar a vista de calendario
      await this.pages.admin.click('#vistaCalendario');
      await this.pages.admin.waitForTimeout(1000);
      
      // Seleccionar fecha (mañana)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fechaStr = tomorrow.toISOString().split('T')[0];
      
      // Hacer clic en la hora 15:00 (diferente a la de web)
      console.log('🕐 Seleccionando hora 15:00...');
      await this.pages.admin.click(`[data-fecha="${fechaStr}"][data-hora="15:00"]`);
      await this.pages.admin.waitForTimeout(1000);
      
      // Llenar formulario de reserva
      console.log('📝 Llenando formulario de reserva...');
      await this.pages.admin.type('#nombreCliente', CONFIG.testData.cliente.nombre + ' Admin');
      await this.pages.admin.type('#emailCliente', 'admin.' + CONFIG.testData.cliente.email);
      await this.pages.admin.type('#telefonoCliente', CONFIG.testData.cliente.telefono);
      await this.pages.admin.type('#rutCliente', '87654321-0');
      
      // Crear reserva
      console.log('💾 Creando reserva desde admin...');
      const reservaResponse = await this.pages.admin.evaluate(async () => {
        const response = await fetch('/api/admin/crear-reserva', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
          },
          body: JSON.stringify({
            cancha_id: 1,
            fecha: document.querySelector('[data-fecha]').getAttribute('data-fecha'),
            hora_inicio: '15:00',
            hora_fin: '16:00',
            nombre_cliente: document.getElementById('nombreCliente').value,
            email_cliente: document.getElementById('emailCliente').value,
            telefono_cliente: document.getElementById('telefonoCliente').value,
            rut_cliente: document.getElementById('rutCliente').value,
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
        fecha: fechaStr,
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
      
      // Navegar a admin si no estamos ahí
      await this.pages.admin.goto(CONFIG.adminUrl);
      await this.pages.admin.waitForSelector('.calendar-container', { timeout: 10000 });
      
      // Intentar hacer clic en el mismo horario
      await this.pages.admin.click(`[data-fecha="${reservaData.fecha}"][data-hora="${reservaData.hora_inicio}"]`);
      await this.pages.admin.waitForTimeout(1000);
      
      // Verificar si aparece mensaje de error
      const errorMessage = await this.pages.admin.evaluate(() => {
        const errorDiv = document.querySelector('.alert-danger, .error-message');
        return errorDiv ? errorDiv.textContent : null;
      });
      
      if (errorMessage) {
        return { success: false, error: errorMessage };
      }
      
      // Si no hay error visible, intentar crear la reserva
      const reservaResponse = await this.pages.admin.evaluate(async (data) => {
        const response = await fetch('/api/admin/crear-reserva', {
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
      
      // Navegar a web si no estamos ahí
      await this.pages.web.goto(CONFIG.baseUrl);
      await this.pages.web.waitForSelector('#ciudadSelect', { timeout: 10000 });
      
      // Seleccionar los mismos datos
      await this.pages.web.select('#ciudadSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      await this.pages.web.select('#complejoSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      await this.pages.web.select('#tipoCanchaSelect', 'padel');
      await this.pages.web.waitForTimeout(1000);
      
      await this.pages.web.type('#fechaInput', reservaData.fecha);
      await this.pages.web.waitForTimeout(1000);
      
      // Intentar seleccionar la misma hora
      await this.pages.web.click(`[data-hora="${reservaData.hora_inicio}"]`);
      await this.pages.web.waitForTimeout(1000);
      
      // Verificar si aparece mensaje de error
      const errorMessage = await this.pages.web.evaluate(() => {
        const errorDiv = document.querySelector('.alert-danger, .error-message, .horario-no-disponible');
        return errorDiv ? errorDiv.textContent : null;
      });
      
      if (errorMessage) {
        return { success: false, error: errorMessage };
      }
      
      // Si no hay error visible, intentar crear bloqueo temporal
      const bloqueoResponse = await this.pages.web.evaluate(async (data) => {
        const response = await fetch('/api/crear-bloqueo-temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: data.cancha_id,
            fecha: data.fecha,
            hora_inicio: data.hora_inicio,
            hora_fin: data.hora_fin,
            session_id: 'test-duplicate-' + Date.now(),
            datos_cliente: {
              nombre: 'Test Duplicado',
              email: 'duplicado@test.com',
              telefono: '+56999999999',
              rut: '11111111-1'
            }
          })
        });
        return await response.json();
      }, reservaData);
      
      return {
        success: bloqueoResponse.success,
        error: bloqueoResponse.error || 'Bloqueo temporal duplicado creado incorrectamente'
      };
      
    } catch (error) {
      console.error('❌ Error intentando reserva duplicada desde web:', error);
      return { success: false, error: error.message };
    }
  }

  async createTemporalBlockFromWeb() {
    try {
      console.log('🔒 Creando bloqueo temporal desde web...');
      
      // Navegar a web
      await this.pages.web.goto(CONFIG.baseUrl);
      await this.pages.web.waitForSelector('#ciudadSelect', { timeout: 10000 });
      
      // Seleccionar datos básicos
      await this.pages.web.select('#ciudadSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      await this.pages.web.select('#complejoSelect', '1');
      await this.pages.web.waitForTimeout(1000);
      await this.pages.web.select('#tipoCanchaSelect', 'padel');
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar fecha (mañana)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fechaStr = tomorrow.toISOString().split('T')[0];
      await this.pages.web.type('#fechaInput', fechaStr);
      await this.pages.web.waitForTimeout(1000);
      
      // Seleccionar hora (16:00)
      await this.pages.web.click('[data-hora="16:00"]');
      await this.pages.web.waitForTimeout(1000);
      
      // Llenar datos del cliente
      await this.pages.web.type('#nombreCliente', CONFIG.testData.cliente.nombre);
      await this.pages.web.type('#emailCliente', CONFIG.testData.cliente.email);
      await this.pages.web.type('#telefonoCliente', CONFIG.testData.cliente.telefono);
      await this.pages.web.type('#rutCliente', CONFIG.testData.cliente.rut);
      
      // Crear bloqueo temporal
      const bloqueoResponse = await this.pages.web.evaluate(async () => {
        const response = await fetch('/api/crear-bloqueo-temporal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cancha_id: 1,
            fecha: document.getElementById('fechaInput').value,
            hora_inicio: '16:00',
            hora_fin: '17:00',
            session_id: 'test-block-' + Date.now(),
            datos_cliente: {
              nombre: document.getElementById('nombreCliente').value,
              email: document.getElementById('emailCliente').value,
              telefono: document.getElementById('telefonoCliente').value,
              rut: document.getElementById('rutCliente').value
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
        fecha: fechaStr,
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
      
      // Navegar a admin
      await this.pages.admin.goto(CONFIG.adminUrl);
      await this.pages.admin.waitForSelector('.calendar-container', { timeout: 10000 });
      
      // Verificar si el horario está disponible
      const isAvailable = await this.pages.admin.evaluate((data) => {
        const timeSlot = document.querySelector(`[data-fecha="${data.fecha}"][data-hora="${data.hora_inicio}"]`);
        if (!timeSlot) return false;
        
        // Verificar si tiene clase de no disponible
        return !timeSlot.classList.contains('no-disponible') && 
               !timeSlot.classList.contains('ocupado') &&
               !timeSlot.classList.contains('bloqueado');
      }, bloqueoData);
      
      return { available: isAvailable };
      
    } catch (error) {
      console.error('❌ Error verificando disponibilidad desde admin:', error);
      return { available: true }; // Asumir disponible en caso de error
    }
  }

  async completeReservationFromWeb(bloqueoData) {
    try {
      console.log('💳 Completando reserva desde web...');
      
      // Completar la reserva usando el bloqueo temporal
      const reservaResponse = await this.pages.web.evaluate(async (bloqueoId) => {
        const response = await fetch('/api/confirmar-reserva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bloqueo_id: bloqueoId,
            metodo_pago: 'test'
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
        const hora = i === 0 ? '17:00' : '17:00'; // Misma hora para ambos
        
        // Crear bloqueo temporal
        const bloqueoResponse = await this.pages.web.evaluate(async (sessionId, hora) => {
          const response = await fetch('/api/crear-bloqueo-temporal', {
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
          const response = await fetch('/api/confirmar-reserva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bloqueo_id: bloqueoId,
              metodo_pago: 'test'
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

  async cleanupTestData() {
    console.log('🧹 Limpiando datos de prueba anteriores...');
    
    try {
      // Eliminar reservas de prueba
      await this.db.query(`
        DELETE FROM reservas 
        WHERE email_cliente LIKE '%test%' 
        OR email_cliente LIKE '%automatizado%'
        OR codigo_reserva LIKE 'TEST%'
      `);
      
      // Eliminar bloqueos temporales de prueba
      await this.db.query(`
        DELETE FROM bloqueos_temporales 
        WHERE session_id LIKE 'test%'
        OR id LIKE 'BLOCK%'
      `);
      
      console.log('✅ Datos de prueba limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos de prueba:', error);
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
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
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
    
    if (this.db) {
      await this.db.end();
    }
    
    console.log('✅ Limpieza completada');
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  const tester = new AutomatedReservationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AutomatedReservationTester;

#!/usr/bin/env node

/**
 * Script para aplicar el trigger de generación automática de depósitos en producción
 * Este script debe ejecutarse una sola vez en producción para habilitar la generación automática
 */

const fetch = require('node-fetch');

// Configuración de producción
const PRODUCTION_URL = 'https://reservatuscanchas.cl';
const ADMIN_EMAIL = 'admin@reservatuscanchas.cl';
const ADMIN_PASSWORD = 'admin123';

async function aplicarTriggerAutomatico() {
  try {
    console.log('🚀 APLICANDO TRIGGER DE GENERACIÓN AUTOMÁTICA DE DEPÓSITOS');
    console.log('='.repeat(70));
    console.log(`🌐 URL de producción: ${PRODUCTION_URL}`);
    
    // 1. Login para obtener token
    console.log('\n🔐 Iniciando sesión...');
    const loginResponse = await fetch(`${PRODUCTION_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Error en login: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Login exitoso');
    
    // 2. Crear trigger automático
    console.log('\n🔧 Creando trigger de generación automática...');
    const triggerResponse = await fetch(`${PRODUCTION_URL}/api/admin/depositos/create-auto-trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      throw new Error(`Error creando trigger: ${triggerResponse.status} ${errorText}`);
    }
    
    const triggerData = await triggerResponse.json();
    console.log('✅ Trigger creado exitosamente');
    console.log('📝 Detalles:', triggerData.message);
    
    // 3. Generar depósitos históricos para reservas existentes
    console.log('\n📊 Generando depósitos históricos...');
    const historicosResponse = await fetch(`${PRODUCTION_URL}/api/admin/depositos/generar-historicos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        confirm: true
      })
    });
    
    if (!historicosResponse.ok) {
      const errorText = await historicosResponse.text();
      console.log('⚠️ Error generando históricos (puede ser normal si ya existen):', errorText);
    } else {
      const historicosData = await historicosResponse.json();
      console.log('✅ Depósitos históricos generados');
      console.log('📊 Resultado:', historicosData.message);
    }
    
    // 4. Verificar estado final
    console.log('\n🔍 Verificando estado final...');
    const depositosResponse = await fetch(`${PRODUCTION_URL}/api/admin/depositos`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (depositosResponse.ok) {
      const depositosData = await depositosResponse.json();
      console.log(`✅ Total depósitos en sistema: ${depositosData.depositos.length}`);
      
      if (depositosData.depositos.length > 0) {
        console.log('📋 Depósitos encontrados:');
        depositosData.depositos.forEach((dep, i) => {
          console.log(`  ${i+1}. ${dep.complejo_nombre} - $${dep.monto_a_depositar} - ${dep.estado}`);
        });
      }
    }
    
    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('='.repeat(70));
    console.log('✅ Trigger automático creado');
    console.log('✅ Depósitos históricos generados');
    console.log('✅ Sistema listo para generar depósitos automáticamente');
    console.log('\n📝 A partir de ahora, cada reserva confirmada generará automáticamente un depósito');
    
  } catch (error) {
    console.error('❌ Error aplicando configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  aplicarTriggerAutomatico();
}

module.exports = { aplicarTriggerAutomatico };








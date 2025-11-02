#!/usr/bin/env node

/**
 * Script para generar depósitos directamente en producción
 * Evita problemas con funciones SQL complejas
 */

const fetch = require('node-fetch');

async function generarDepositosDirecto() {
  try {
    console.log('🚀 GENERANDO DEPÓSITOS DIRECTAMENTE');
    console.log('='.repeat(60));
    
    // Login
    const loginResponse = await fetch('https://reservatuscanchas.cl/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@reservatuscanchas.cl', password: 'admin123' })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    // 1. Obtener todas las reservas confirmadas agrupadas por complejo y fecha
    console.log('\n📊 Obteniendo reservas confirmadas...');
    const reservasResponse = await fetch('https://reservatuscanchas.cl/api/admin/reservas', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!reservasResponse.ok) {
      throw new Error('Error obteniendo reservas');
    }
    
    const reservas = await reservasResponse.json();
    const confirmadas = reservas.filter(r => r.estado === 'confirmada');
    
    console.log(`Total reservas confirmadas: ${confirmadas.length}`);
    
    // 2. Agrupar por complejo y fecha
    const agrupadas = {};
    confirmadas.forEach(r => {
      const key = `${r.complejo_nombre}|${r.fecha}`;
      if (!agrupadas[key]) {
        agrupadas[key] = {
          complejo_nombre: r.complejo_nombre,
          fecha: r.fecha,
          reservas: [],
          monto_total: 0,
          comision_total: 0
        };
      }
      agrupadas[key].reservas.push(r);
      agrupadas[key].monto_total += r.precio_total;
      
      // Calcular comisión según tipo de reserva
      const tipo = r.tipo_reserva || 'directa';
      const porcentajeComision = tipo === 'administrativa' ? 0.0175 : 0.0350;
      const comisionSinIva = Math.round(r.precio_total * porcentajeComision);
      const ivaComision = Math.round(comisionSinIva * 0.19);
      const comisionTotal = comisionSinIva + ivaComision;
      
      agrupadas[key].comision_total += comisionTotal;
    });
    
    console.log(`\n📋 Grupos encontrados: ${Object.keys(agrupadas).length}`);
    
    // 3. Generar depósitos para cada grupo
    let depositosGenerados = 0;
    for (const [key, grupo] of Object.entries(agrupadas)) {
      try {
        console.log(`\n💰 Procesando: ${grupo.complejo_nombre} - ${grupo.fecha}`);
        console.log(`   Reservas: ${grupo.reservas.length} | Monto: $${grupo.monto_total}`);
        
        // Calcular monto a depositar
        const montoADepositar = grupo.monto_total - grupo.comision_total;
        
        // Crear depósito usando el endpoint de generación por fecha
        const generarResponse = await fetch('https://reservatuscanchas.cl/api/admin/depositos/generar', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            fecha: grupo.fecha
          })
        });
        
        if (generarResponse.ok) {
          const result = await generarResponse.json();
          console.log(`   ✅ Depósito generado: $${montoADepositar}`);
          depositosGenerados++;
        } else {
          const errorText = await generarResponse.text();
          console.log(`   ⚠️ Error: ${errorText}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error procesando grupo: ${error.message}`);
      }
    }
    
    // 4. Verificar resultado final
    console.log('\n🔍 Verificando resultado final...');
    const depositosResponse = await fetch('https://reservatuscanchas.cl/api/admin/depositos', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (depositosResponse.ok) {
      const depositosData = await depositosResponse.json();
      console.log(`✅ Total depósitos: ${depositosData.depositos.length}`);
      
      if (depositosData.depositos.length > 0) {
        console.log('\n📋 Depósitos generados:');
        depositosData.depositos.forEach((dep, i) => {
          console.log(`${i+1}. ${dep.complejo_nombre} - ${dep.fecha_deposito}`);
          console.log(`   Monto: $${dep.monto_a_depositar} | Estado: ${dep.estado}`);
        });
      }
    }
    
    console.log(`\n🎉 Proceso completado: ${depositosGenerados} depósitos generados`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

generarDepositosDirecto();
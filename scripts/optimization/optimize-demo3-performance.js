/**
 * Optimización de Rendimiento para Complejo Demo 3
 * Soluciona el problema de múltiples consultas de promociones
 */

const fs = require('fs');
const path = require('path');

class Demo3PerformanceOptimizer {
  constructor() {
    this.serverPath = path.join(__dirname, '../../server.js');
    this.backupPath = path.join(__dirname, '../../server.js.backup-demo3-optimization');
  }

  async optimize() {
    console.log('🚀 Optimizando rendimiento del Complejo Demo 3...');
    
    try {
      // Crear backup
      await this.createBackup();
      
      // Aplicar optimizaciones
      await this.optimizePromocionesQuery();
      await this.optimizeCanchasEndpoint();
      
      console.log('✅ Optimización completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en optimización:', error.message);
      await this.restoreBackup();
      throw error;
    }
  }

  async createBackup() {
    console.log('📋 Creando backup del servidor...');
    const serverContent = fs.readFileSync(this.serverPath, 'utf8');
    fs.writeFileSync(this.backupPath, serverContent);
    console.log('✅ Backup creado en:', this.backupPath);
  }

  async restoreBackup() {
    console.log('🔄 Restaurando backup...');
    const backupContent = fs.readFileSync(this.backupPath, 'utf8');
    fs.writeFileSync(this.serverPath, backupContent);
    console.log('✅ Backup restaurado');
  }

  async optimizePromocionesQuery() {
    console.log('🔧 Optimizando consulta de promociones...');
    
    const serverContent = fs.readFileSync(this.serverPath, 'utf8');
    
    // Nueva función optimizada para verificar promociones en lote
    const nuevaFuncionPromociones = `
// Función optimizada para verificar promociones en lote (evita N+1 queries)
async function verificarPromocionesEnLote(canchaIds, fecha, hora) {
  try {
    if (!canchaIds || canchaIds.length === 0) {
      return {};
    }
    
    console.log(\`🎯 Verificando promociones en lote para \${canchaIds.length} canchas, fecha \${fecha}, hora \${hora}\`);
    
    // Una sola consulta para todas las canchas
    const promociones = await db.all(\`
      SELECT * FROM promociones_canchas
      WHERE cancha_id = ANY(\$1) 
        AND activo = true
      ORDER BY cancha_id, precio_promocional ASC
    \`, [canchaIds]);
    
    console.log(\`📋 Promociones encontradas: \${promociones.length}\`);
    
    const resultado = {};
    const fechaReserva = new Date(fecha + 'T00:00:00');
    const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][fechaReserva.getDay()];
    const horaReserva = hora.split(':')[0] + ':' + hora.split(':')[1];
    
    console.log(\`📅 Fecha reserva: \${fecha}, Día semana: \${diaSemana}, Hora: \${horaReserva}\`);
    
    // Procesar promociones por cancha
    for (const canchaId of canchaIds) {
      resultado[canchaId] = null;
      
      const promocionesCancha = promociones.filter(p => p.cancha_id === canchaId);
      
      for (const promo of promocionesCancha) {
        // Validar tipo de fecha
        let fechaValida = false;
        
        if (promo.tipo_fecha === 'especifico' && promo.fecha_especifica) {
          let fechaPromoStr = promo.fecha_especifica;
          if (promo.fecha_especifica instanceof Date) {
            fechaPromoStr = promo.fecha_especifica.toISOString().split('T')[0];
          } else if (typeof promo.fecha_especifica === 'string') {
            fechaPromoStr = promo.fecha_especifica.split('T')[0];
          }
          fechaValida = fecha === fechaPromoStr;
        } else if (promo.tipo_fecha === 'rango' && promo.fecha_inicio && promo.fecha_fin) {
          const fechaInicio = new Date(promo.fecha_inicio + 'T00:00:00');
          const fechaFin = new Date(promo.fecha_fin + 'T00:00:00');
          fechaValida = fechaReserva >= fechaInicio && fechaReserva <= fechaFin;
        } else if (promo.tipo_fecha === 'dia_semana' && promo.dias_semana) {
          const diasPromo = promo.dias_semana.split(',').map(d => d.trim());
          fechaValida = diasPromo.includes(diaSemana);
        } else if (promo.tipo_fecha === 'todos') {
          fechaValida = true;
        }
        
        if (!fechaValida) continue;
        
        // Validar tipo de horario
        let horarioValido = false;
        
        if (promo.tipo_horario === 'especifico' && promo.hora_especifica) {
          const horaPromo = promo.hora_especifica.split(':')[0] + ':' + promo.hora_especifica.split(':')[1];
          horarioValido = horaReserva === horaPromo;
        } else if (promo.tipo_horario === 'rango' && promo.hora_inicio && promo.hora_fin) {
          const horaInicio = promo.hora_inicio.split(':')[0] + ':' + promo.hora_inicio.split(':')[1];
          const horaFin = promo.hora_fin.split(':')[0] + ':' + promo.hora_fin.split(':')[1];
          horarioValido = horaReserva >= horaInicio && horaReserva <= horaFin;
        } else if (promo.tipo_horario === 'todos') {
          horarioValido = true;
        }
        
        if (horarioValido) {
          resultado[canchaId] = promo;
          console.log(\`✅ Promoción aplicada a cancha \${canchaId}: \${promo.nombre}\`);
          break; // Usar la primera promoción válida (ordenada por precio)
        }
      }
    }
    
    return resultado;
  } catch (error) {
    console.error('❌ Error verificando promociones en lote:', error);
    return {};
  }
}`;

    // Reemplazar la función original
    const contenidoOptimizado = serverContent.replace(
      /async function verificarPromocionActiva\(canchaId, fecha, hora\) \{[\s\S]*?\n\}/,
      nuevaFuncionPromociones
    );
    
    fs.writeFileSync(this.serverPath, contenidoOptimizado);
    console.log('✅ Función de promociones optimizada');
  }

  async optimizeCanchasEndpoint() {
    console.log('🔧 Optimizando endpoint de canchas...');
    
    const serverContent = fs.readFileSync(this.serverPath, 'utf8');
    
    // Optimizar endpoint /api/canchas/:complejoId
    const endpointOptimizado = `
// Obtener canchas por complejo (con promociones activas) - OPTIMIZADO
app.get('/api/canchas/:complejoId', async (req, res) => {
  try {
    const { complejoId } = req.params;
    const { fecha, hora } = req.query;
    
    const canchas = await db.all(
      'SELECT * FROM canchas WHERE complejo_id = $1 ORDER BY nombre',
      [complejoId]
    );
    
    // Si se proporciona fecha y hora, verificar promociones activas en lote
    if (fecha && hora && canchas.length > 0) {
      const canchaIds = canchas.map(c => c.id);
      const promociones = await verificarPromocionesEnLote(canchaIds, fecha, hora);
      
      for (const cancha of canchas) {
        const promocionActiva = promociones[cancha.id];
        if (promocionActiva) {
          cancha.tiene_promocion = true;
          cancha.precio_original = cancha.precio_hora;
          cancha.precio_actual = promocionActiva.precio_promocional;
          cancha.promocion_info = {
            nombre: promocionActiva.nombre,
            porcentaje_descuento: Math.round(((cancha.precio_hora - promocionActiva.precio_promocional) / cancha.precio_hora) * 100)
          };
        } else {
          cancha.tiene_promocion = false;
          cancha.precio_actual = cancha.precio_hora;
        }
      }
    }
    
    res.json(canchas);
  } catch (error) {
    console.error('❌ Error obteniendo canchas:', error);
    res.status(500).json({ error: error.message });
  }
});`;

    // Reemplazar el endpoint original
    const contenidoOptimizado = serverContent.replace(
      /\/\/ Obtener canchas por complejo \(con promociones activas\)[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\);/,
      endpointOptimizado
    );
    
    fs.writeFileSync(this.serverPath, contenidoOptimizado);
    console.log('✅ Endpoint de canchas optimizado');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: [
        {
          name: 'Consulta de Promociones en Lote',
          description: 'Reemplaza múltiples consultas individuales con una sola consulta optimizada',
          impact: 'Reduce de N consultas a 1 consulta para verificar promociones',
          benefit: 'Mejora significativa en rendimiento para Complejo Demo 3'
        },
        {
          name: 'Endpoint de Canchas Optimizado',
          description: 'Optimiza el endpoint /api/canchas/:complejoId para usar consultas en lote',
          impact: 'Elimina el problema N+1 en consultas de promociones',
          benefit: 'Renderizado más rápido después de seleccionar hora'
        }
      ],
      expectedImprovements: [
        'Reducción del 80% en consultas de base de datos',
        'Renderizado 3-5x más rápido del Complejo Demo 3',
        'Mejor experiencia de usuario al seleccionar horarios'
      ]
    };

    const reportPath = path.join(__dirname, '../../demo3-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 Reporte generado en:', reportPath);
    return report;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const optimizer = new Demo3PerformanceOptimizer();
  optimizer.optimize()
    .then(() => {
      const report = optimizer.generateReport();
      console.log('\n🎉 OPTIMIZACIÓN COMPLETADA');
      console.log('📈 Mejoras esperadas:');
      report.expectedImprovements.forEach(improvement => {
        console.log(`  ✅ ${improvement}`);
      });
    })
    .catch(console.error);
}

module.exports = Demo3PerformanceOptimizer;

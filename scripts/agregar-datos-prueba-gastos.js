// ============================================
// AGREGAR DATOS DE PRUEBA - CONTROL DE GASTOS
// ============================================

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function agregarDatosPrueba() {
    console.log('📝 AGREGANDO DATOS DE PRUEBA AL CONTROL DE GASTOS\n');
    console.log('='.repeat(60));
    
    try {
        // Obtener categorías
        const categorias = await pool.query('SELECT id, nombre, tipo FROM categorias_gastos');
        const categoriasGastos = categorias.rows.filter(c => c.tipo === 'gasto');
        const categoriasIngresos = categorias.rows.filter(c => c.tipo === 'ingreso');
        
        console.log(`\n✅ Categorías encontradas:`);
        console.log(`   - ${categoriasGastos.length} categorías de gastos`);
        console.log(`   - ${categoriasIngresos.length} categorías de ingresos`);
        
        // Obtener complejos
        const complejos = await pool.query('SELECT id, nombre FROM complejos ORDER BY id');
        console.log(`\n✅ Complejos encontrados: ${complejos.rows.length}`);
        complejos.rows.forEach(c => console.log(`   - [${c.id}] ${c.nombre}`));
        
        // Generar datos de los últimos 3 meses
        const hoy = new Date();
        const datos = [];
        
        for (const complejo of complejos.rows) {
            console.log(`\n📊 Generando datos para: ${complejo.nombre}`);
            
            // Gastos mensuales típicos
            const gastosRecurrentes = [
                { categoria: 'Electricidad', monto: () => 45000 + Math.random() * 15000, descripcion: 'Cuenta mensual de electricidad' },
                { categoria: 'Agua', monto: () => 25000 + Math.random() * 10000, descripcion: 'Cuenta mensual de agua' },
                { categoria: 'Internet y Telefonía', monto: () => 30000, descripcion: 'Plan internet y telefonía' },
                { categoria: 'Mantenimiento Canchas', monto: () => 60000 + Math.random() * 40000, descripcion: 'Mantenimiento preventivo' },
                { categoria: 'Materiales de Limpieza', monto: () => 15000 + Math.random() * 10000, descripcion: 'Productos de limpieza' },
            ];
            
            // Ingresos de reservas
            const ingresosRecurrentes = [
                { categoria: 'Reservas Online', monto: () => 200000 + Math.random() * 150000 },
                { categoria: 'Reservas Presenciales', monto: () => 150000 + Math.random() * 100000 },
            ];
            
            // Generar datos para los últimos 3 meses
            for (let mes = 0; mes < 3; mes++) {
                const fechaMes = new Date(hoy.getFullYear(), hoy.getMonth() - mes, 1);
                
                // Gastos recurrentes
                for (const gasto of gastosRecurrentes) {
                    const cat = categoriasGastos.find(c => c.nombre === gasto.categoria);
                    if (cat) {
                        const dia = 5 + Math.floor(Math.random() * 10);
                        const fecha = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), dia);
                        
                        datos.push({
                            complejo_id: complejo.id,
                            categoria_id: cat.id,
                            tipo: 'gasto',
                            monto: Math.round(gasto.monto()),
                            fecha: fecha.toISOString().split('T')[0],
                            descripcion: `${gasto.descripcion} - ${fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`
                        });
                    }
                }
                
                // Ingresos recurrentes (varias veces por mes)
                for (let semana = 0; semana < 4; semana++) {
                    for (const ingreso of ingresosRecurrentes) {
                        const cat = categoriasIngresos.find(c => c.nombre === ingreso.categoria);
                        if (cat) {
                            const dia = 1 + (semana * 7) + Math.floor(Math.random() * 7);
                            if (dia <= 28) {
                                const fecha = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), dia);
                                
                                datos.push({
                                    complejo_id: complejo.id,
                                    categoria_id: cat.id,
                                    tipo: 'ingreso',
                                    monto: Math.round(ingreso.monto()),
                                    fecha: fecha.toISOString().split('T')[0],
                                    descripcion: ingreso.categoria === 'Reservas Online' 
                                        ? 'Ingresos por reservas web' 
                                        : 'Ingresos por reservas directas'
                                });
                            }
                        }
                    }
                }
                
                // Gastos ocasionales (aleatorio)
                if (Math.random() > 0.5) {
                    const categoriaRandom = categoriasGastos[Math.floor(Math.random() * categoriasGastos.length)];
                    const dia = Math.floor(Math.random() * 28) + 1;
                    const fecha = new Date(fechaMes.getFullYear(), fechaMes.getMonth(), dia);
                    
                    datos.push({
                        complejo_id: complejo.id,
                        categoria_id: categoriaRandom.id,
                        tipo: 'gasto',
                        monto: Math.round(20000 + Math.random() * 80000),
                        fecha: fecha.toISOString().split('T')[0],
                        descripcion: `Gasto ocasional - ${categoriaRandom.nombre}`
                    });
                }
            }
        }
        
        console.log(`\n✅ Total de registros a insertar: ${datos.length}`);
        
        // Insertar datos
        console.log('\n📥 Insertando datos...');
        
        for (const dato of datos) {
            await pool.query(`
                INSERT INTO gastos_ingresos (
                    complejo_id, categoria_id, tipo, monto, fecha, descripcion
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                dato.complejo_id,
                dato.categoria_id,
                dato.tipo,
                dato.monto,
                dato.fecha,
                dato.descripcion
            ]);
        }
        
        console.log('✅ Datos insertados correctamente');
        
        // Mostrar resumen
        console.log('\n📊 RESUMEN POR COMPLEJO:');
        
        for (const complejo of complejos.rows) {
            const resumen = await pool.query(`
                SELECT 
                    tipo,
                    COUNT(*) as cantidad,
                    SUM(monto) as total
                FROM gastos_ingresos
                WHERE complejo_id = $1
                GROUP BY tipo
            `, [complejo.id]);
            
            console.log(`\n   ${complejo.nombre}:`);
            resumen.rows.forEach(r => {
                const emoji = r.tipo === 'ingreso' ? '💰' : '💸';
                console.log(`      ${emoji} ${r.tipo}: ${r.cantidad} registros - $${Number(r.total).toLocaleString('es-CL')}`);
            });
            
            const balance = await pool.query(`
                SELECT 
                    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance
                FROM gastos_ingresos
                WHERE complejo_id = $1
            `, [complejo.id]);
            
            const bal = Number(balance.rows[0].balance);
            const emoji = bal >= 0 ? '✅' : '⚠️';
            console.log(`      ${emoji} Balance: $${bal.toLocaleString('es-CL')}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ DATOS DE PRUEBA AGREGADOS EXITOSAMENTE\n');
        console.log('📌 Ahora puedes acceder a http://localhost:3000/admin-gastos.html');
        console.log('📌 Verás datos de los últimos 3 meses\n');
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

// Ejecutar
agregarDatosPrueba();


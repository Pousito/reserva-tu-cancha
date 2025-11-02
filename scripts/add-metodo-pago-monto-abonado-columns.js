#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function addMetodoPagoAndMontoAbonadoColumns() {
    console.log('🔧 Agregando columnas metodo_pago y monto_abonado a tabla reservas...');
    console.log('==========================================');
    
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no está definido en las variables de entorno');
        process.exit(1);
    }
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
    });
    
    try {
        // Verificar si las columnas ya existen
        const checkQuery = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('metodo_pago', 'monto_abonado')
        `);
        
        const existingColumns = checkQuery.rows.map(row => row.column_name);
        console.log('📋 Columnas existentes:', existingColumns);
        
        // Agregar metodo_pago si no existe
        if (!existingColumns.includes('metodo_pago')) {
            try {
                console.log('📝 Agregando columna metodo_pago...');
                await pool.query(`
                    ALTER TABLE reservas 
                    ADD COLUMN metodo_pago VARCHAR(50) DEFAULT NULL
                `);
                console.log('✅ Columna metodo_pago agregada exitosamente');
                
                // Agregar comentario
                await pool.query(`
                    COMMENT ON COLUMN reservas.metodo_pago IS 'Método de pago utilizado: efectivo, transferencia, webpay, tarjeta, otros'
                `).catch(err => console.log('⚠️ No se pudo agregar comentario a metodo_pago:', err.message));
            } catch (error) {
                console.error('❌ Error agregando columna metodo_pago:', error.message);
                throw error;
            }
        } else {
            console.log('ℹ️  La columna metodo_pago ya existe');
        }
        
        // Agregar monto_abonado si no existe
        if (!existingColumns.includes('monto_abonado')) {
            try {
                console.log('📝 Agregando columna monto_abonado...');
                await pool.query(`
                    ALTER TABLE reservas 
                    ADD COLUMN monto_abonado INTEGER DEFAULT 0
                `);
                console.log('✅ Columna monto_abonado agregada exitosamente');
                
                // Agregar comentario
                await pool.query(`
                    COMMENT ON COLUMN reservas.monto_abonado IS 'Monto abonado por el cliente en esta reserva'
                `).catch(err => console.log('⚠️ No se pudo agregar comentario a monto_abonado:', err.message));
            } catch (error) {
                console.error('❌ Error agregando columna monto_abonado:', error.message);
                throw error;
            }
        } else {
            console.log('ℹ️  La columna monto_abonado ya existe');
        }
        
        // Verificación final
        const finalCheck = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('metodo_pago', 'monto_abonado')
            ORDER BY column_name
        `);
        
        console.log('📊 Verificación final:');
        finalCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
        });
        
        console.log('✅ Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    addMetodoPagoAndMontoAbonadoColumns()
        .then(() => {
            console.log('🎉 Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error fatal:', error);
            process.exit(1);
        });
}

module.exports = { addMetodoPagoAndMontoAbonadoColumns };


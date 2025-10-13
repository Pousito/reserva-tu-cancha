#!/usr/bin/env node

const { Pool } = require('pg');

async function fixProductionSchema() {
    console.log('🔧 CORRIGIENDO ESQUEMA DE PRODUCCIÓN EN RENDER');
    console.log('==============================================');
    
    // Usar la URL de la base de datos de producción desde las variables de entorno
    const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/reserva_tu_cancha';
    
    if (!DATABASE_URL.includes('render.com')) {
        console.log('⚠️  No se detectó URL de producción de Render');
        console.log('🔍 DATABASE_URL actual:', DATABASE_URL);
        console.log('💡 Este script debe ejecutarse en el entorno de producción');
        return;
    }
    
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        console.log('📋 Verificando columnas existentes...');
        
        // Verificar si las columnas existen
        const columnasCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            AND column_name IN ('tipo_reserva', 'creada_por_admin', 'admin_id', 'metodo_contacto', 'comision_aplicada', 'porcentaje_pagado')
            ORDER BY column_name;
        `);
        
        const columnasExistentes = columnasCheck.rows.map(row => row.column_name);
        console.log('📊 Columnas existentes:', columnasExistentes);
        
        // Agregar columnas faltantes
        const columnasAAgregar = [
            { nombre: 'tipo_reserva', tipo: 'VARCHAR(50) DEFAULT \'directa\'' },
            { nombre: 'creada_por_admin', tipo: 'BOOLEAN DEFAULT false' },
            { nombre: 'admin_id', tipo: 'INTEGER' },
            { nombre: 'metodo_contacto', tipo: 'VARCHAR(50) DEFAULT \'web\'' },
            { nombre: 'comision_aplicada', tipo: 'DECIMAL(10,2) DEFAULT 0' },
            { nombre: 'porcentaje_pagado', tipo: 'INTEGER DEFAULT 100' }
        ];
        
        for (const columna of columnasAAgregar) {
            if (!columnasExistentes.includes(columna.nombre)) {
                try {
                    console.log(`➕ Agregando columna: ${columna.nombre}`);
                    await pool.query(`ALTER TABLE reservas ADD COLUMN ${columna.nombre} ${columna.tipo};`);
                    console.log(`✅ Columna ${columna.nombre} agregada exitosamente`);
                } catch (error) {
                    console.log(`❌ Error agregando columna ${columna.nombre}:`, error.message);
                }
            } else {
                console.log(`ℹ️  Columna ${columna.nombre} ya existe`);
            }
        }
        
        // Verificar tabla canchas
        const canchasCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'canchas' 
            AND column_name = 'numero'
        `);
        
        if (canchasCheck.rows.length === 0) {
            try {
                console.log('➕ Agregando columna canchas.numero');
                await pool.query('ALTER TABLE canchas ADD COLUMN numero INTEGER;');
                console.log('✅ Columna canchas.numero agregada exitosamente');
            } catch (error) {
                console.log('❌ Error agregando columna canchas.numero:', error.message);
            }
        } else {
            console.log('ℹ️  Columna canchas.numero ya existe');
        }
        
        // Crear índices si no existen
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_reservas_tipo_reserva ON reservas(tipo_reserva);',
            'CREATE INDEX IF NOT EXISTS idx_reservas_comision ON reservas(comision_aplicada);',
            'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_complejo ON gastos_ingresos(complejo_id);',
            'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_fecha ON gastos_ingresos(fecha);',
            'CREATE INDEX IF NOT EXISTS idx_gastos_ingresos_tipo ON gastos_ingresos(tipo);'
        ];
        
        console.log('🔍 Creando índices...');
        for (const indice of indices) {
            try {
                await pool.query(indice);
                console.log('✅ Índice creado:', indice.split(' ')[5]);
            } catch (error) {
                console.log('❌ Error creando índice:', error.message);
            }
        }
        
        // Verificación final
        console.log('📋 Verificación final de estructura...');
        const estructuraFinal = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'reservas' 
            ORDER BY ordinal_position;
        `);
        
        console.log('📊 Columnas de la tabla reservas:');
        estructuraFinal.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
        
        console.log('✅ Esquema de producción corregido exitosamente');
        console.log('🎉 Script completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    fixProductionSchema().catch(console.error);
}

module.exports = { fixProductionSchema };



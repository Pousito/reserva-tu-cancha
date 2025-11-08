#!/usr/bin/env node

/**
 * Script para crear código de un solo uso para Sebastián
 * Código: BASTIANCABRERA5MIL
 * Descuento: $5,000
 */

process.env.NODE_ENV = 'production';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const DatabaseManager = require('../src/config/database-unified');

async function crearCodigo() {
    let db = null;
    
    try {
        console.log('🔌 Conectando a base de datos...');
        db = new DatabaseManager();
        await db.connect();
        console.log('✅ Conectado');

        const codigo = 'BASTIANCABRERA5MIL';
        const emailSebastian = 'eliecer.castillo.cabrera@gmail.com';
        const montoDescuento = 5000;

        // Verificar si el código ya existe
        const codigoExistente = await db.get(`
            SELECT * FROM codigos_unico_uso WHERE codigo = $1
        `, [codigo]);

        if (codigoExistente) {
            console.log('⚠️ El código ya existe. Estado:', codigoExistente.usado ? 'USADO' : 'DISPONIBLE');
            
            if (codigoExistente.usado) {
                console.log('❌ El código ya fue utilizado. No se puede reutilizar.');
                return;
            } else {
                console.log('✅ El código existe y está disponible.');
            }
        } else {
            // Crear el código
            console.log(`\n🎫 Creando código de un solo uso: ${codigo}`);
            await db.run(`
                INSERT INTO codigos_unico_uso 
                (codigo, email_cliente, monto_descuento, descripcion)
                VALUES ($1, $2, $3, $4)
            `, [
                codigo,
                emailSebastian,
                montoDescuento,
                'Código de compensación para Sebastián Cabrera - Descuento de $5,000'
            ]);
            console.log('✅ Código creado exitosamente');
        }

        console.log('\n✅ Proceso completado exitosamente');
        console.log(`\n📋 Resumen:`);
        console.log(`   - Código: ${codigo}`);
        console.log(`   - Email asociado: ${emailSebastian}`);
        console.log(`   - Descuento: $${montoDescuento.toLocaleString()}`);
        console.log(`   - Estado: ${codigoExistente && codigoExistente.usado ? 'USADO' : 'DISPONIBLE'}`);
        console.log(`\n💡 El código está listo para ser enviado a Sebastián.`);

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        if (db) {
            await db.close();
        }
    }
}

crearCodigo()
    .then(() => {
        console.log('\n✅ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script falló:', error);
        process.exit(1);
    });


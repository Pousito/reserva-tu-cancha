#!/usr/bin/env node

/**
 * Script para agregar el complejo Borde Rio en Quilleco
 * Incluye: ciudad, complejo, cancha, usuarios (owner y manager)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Usar .env por defecto

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function agregarBordeRio() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log('🏟️  AGREGANDO COMPLEJO BORDE RIO');
        console.log('=====================================\n');
        
        // 1. Verificar/Agregar ciudad Quilleco
        console.log('📍 Paso 1: Verificando ciudad Quilleco...');
        let ciudadResult = await client.query(
            'SELECT id FROM ciudades WHERE nombre = $1',
            ['Quilleco']
        );
        
        let ciudadId;
        if (ciudadResult.rows.length === 0) {
            console.log('   ➕ Creando ciudad Quilleco...');
            const insertCiudad = await client.query(
                'INSERT INTO ciudades (nombre) VALUES ($1) RETURNING id',
                ['Quilleco']
            );
            ciudadId = insertCiudad.rows[0].id;
            console.log(`   ✅ Ciudad creada con ID: ${ciudadId}`);
        } else {
            ciudadId = ciudadResult.rows[0].id;
            console.log(`   ✅ Ciudad ya existe con ID: ${ciudadId}`);
        }
        
        // 2. Agregar complejo Borde Rio
        console.log('\n🏢 Paso 2: Creando complejo Borde Rio...');
        const complejoResult = await client.query(
            `INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [
                'Borde Rio',
                ciudadId,
                'Ruta Q-575, Quilleco, Bio Bio',
                '+56999820929',
                'admin@borderio.cl'
            ]
        );
        const complejoId = complejoResult.rows[0].id;
        console.log(`   ✅ Complejo creado con ID: ${complejoId}`);
        console.log(`   📍 Dirección: Ruta Q-575, Quilleco`);
        console.log(`   📱 Teléfono: +56 9 9982 0929`);
        console.log(`   📧 Email: admin@borderio.cl`);
        console.log(`   📸 Instagram: @espaciodeportivoborderio`);
        console.log(`   🕐 Horario: Lunes a domingo, 10:00 AM - 00:00 AM`);
        
        // 3. Agregar cancha
        console.log('\n⚽ Paso 3: Creando cancha de baby fútbol...');
        const canchaResult = await client.query(
            `INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [
                complejoId,
                'Cancha Principal',
                'baby futbol',
                8000  // Precio estándar por hora
            ]
        );
        const canchaId = canchaResult.rows[0].id;
        console.log(`   ✅ Cancha creada con ID: ${canchaId}`);
        console.log(`   ⚽ Tipo: Baby Fútbol (7 vs 7)`);
        console.log(`   🌤️  Características: Al aire libre, no techada`);
        console.log(`   💰 Precio: $8,000/hora`);
        
        // 4. Crear usuario Owner
        console.log('\n👤 Paso 4: Creando usuario Owner...');
        const ownerPassword = await bcrypt.hash('borderio2024', 12);
        const ownerResult = await client.query(
            `INSERT INTO usuarios (email, password, nombre, rol, complejo_id, activo) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
                'admin@borderio.cl',
                ownerPassword,
                'Administrador Borde Rio',
                'owner',
                complejoId,
                true
            ]
        );
        const ownerId = ownerResult.rows[0].id;
        console.log(`   ✅ Owner creado con ID: ${ownerId}`);
        console.log(`   📧 Email: admin@borderio.cl`);
        console.log(`   🔑 Password: borderio2024`);
        console.log(`   👑 Rol: owner (acceso completo al complejo)`);
        
        // 5. Crear usuario Manager
        console.log('\n👥 Paso 5: Creando usuario Manager...');
        const managerPassword = await bcrypt.hash('manager2024', 12);
        const managerResult = await client.query(
            `INSERT INTO usuarios (email, password, nombre, rol, complejo_id, activo) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [
                'manager@borderio.cl',
                managerPassword,
                'Manager Borde Rio',
                'manager',
                complejoId,
                true
            ]
        );
        const managerId = managerResult.rows[0].id;
        console.log(`   ✅ Manager creado con ID: ${managerId}`);
        console.log(`   📧 Email: manager@borderio.cl`);
        console.log(`   🔑 Password: manager2024`);
        console.log(`   👤 Rol: manager (acceso limitado, sin reportes)`);
        
        // Commit de la transacción
        await client.query('COMMIT');
        
        // Resumen final
        console.log('\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ COMPLEJO BORDE RIO AGREGADO EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        console.log('📊 RESUMEN DE DATOS CREADOS:');
        console.log('─────────────────────────────────────────────────────');
        console.log(`🏢 Complejo:     Borde Rio (ID: ${complejoId})`);
        console.log(`📍 Ciudad:       Quilleco (ID: ${ciudadId})`);
        console.log(`⚽ Cancha:       Cancha Principal (ID: ${canchaId})`);
        console.log(`👑 Owner:        admin@borderio.cl (ID: ${ownerId})`);
        console.log(`👤 Manager:      manager@borderio.cl (ID: ${managerId})`);
        console.log('─────────────────────────────────────────────────────');
        console.log('');
        console.log('🔑 CREDENCIALES DE ACCESO:');
        console.log('─────────────────────────────────────────────────────');
        console.log('Owner (Dueño):');
        console.log('  Email:    admin@borderio.cl');
        console.log('  Password: borderio2024');
        console.log('  Rol:      owner (acceso completo + reportes)');
        console.log('');
        console.log('Manager (Gestor):');
        console.log('  Email:    manager@borderio.cl');
        console.log('  Password: manager2024');
        console.log('  Rol:      manager (acceso limitado, sin reportes)');
        console.log('─────────────────────────────────────────────────────');
        console.log('');
        console.log('📱 INFORMACIÓN DEL COMPLEJO:');
        console.log('─────────────────────────────────────────────────────');
        console.log('Nombre:           Borde Rio');
        console.log('Ciudad:           Quilleco, Bio Bio');
        console.log('Dirección:        Ruta Q-575');
        console.log('Teléfono:         +56 9 9982 0929');
        console.log('Email:            admin@borderio.cl');
        console.log('Instagram:        @espaciodeportivoborderio');
        console.log('Horario:          Lunes a domingo, 10:00 AM - 00:00 AM');
        console.log('Estacionamiento:  Por confirmar');
        console.log('─────────────────────────────────────────────────────');
        console.log('');
        console.log('⚽ CARACTERÍSTICAS DE LA CANCHA:');
        console.log('─────────────────────────────────────────────────────');
        console.log('Tipo:             Baby Fútbol');
        console.log('Capacidad:        7 vs 7 jugadores');
        console.log('Superficie:       Al aire libre (no techada)');
        console.log('Ubicación:        Calle lateral derecha (Ruta Q-575)');
        console.log('Precio/hora:      $8,000');
        console.log('─────────────────────────────────────────────────────');
        console.log('');
        console.log('🚀 PRÓXIMOS PASOS:');
        console.log('─────────────────────────────────────────────────────');
        console.log('1. Acceder a http://localhost:3000/admin-login.html');
        console.log('2. Iniciar sesión con admin@borderio.cl');
        console.log('3. Verificar que el complejo aparezca correctamente');
        console.log('4. Configurar horarios disponibles si es necesario');
        console.log('5. Probar creación de reservas administrativas');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ ERROR al agregar Borde Rio:', error.message);
        console.error('Detalles:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar script
agregarBordeRio()
    .then(() => {
        console.log('✅ Script completado exitosamente\n');
        pool.end();
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script falló:', error.message);
        pool.end();
        process.exit(1);
    });


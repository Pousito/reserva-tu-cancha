const { Pool } = require('pg');
const path = require('path');

// ⚠️ IMPORTANTE: Este script debe ejecutarse contra la base de datos de PRODUCCIÓN
// Asegúrate de tener la variable DATABASE_URL correcta en tu entorno

async function insertarBordeRioProduccion() {
    // Conectar a la base de datos (debe ser la de producción)
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🚀 INICIANDO INSERCIÓN EN PRODUCCIÓN...\n');
        console.log(`⚠️  Base de datos: ${process.env.DATABASE_URL ? 'Configurada' : '❌ NO CONFIGURADA'}\n`);
        
        // Iniciar transacción
        await pool.query('BEGIN');
        
        // 1. VERIFICAR SI EL COMPLEJO YA EXISTE
        console.log('🔍 Verificando si el complejo ya existe...');
        const existente = await pool.query(
            `SELECT id, nombre FROM complejos WHERE nombre = 'Espacio Deportivo Borde Río'`
        );
        
        if (existente.rows.length > 0) {
            console.log(`⚠️  El complejo ya existe (ID: ${existente.rows[0].id})`);
            console.log('   Abortando inserción para evitar duplicados\n');
            await pool.query('ROLLBACK');
            await pool.end();
            return;
        }
        
        console.log('✅ El complejo no existe, procediendo con la inserción...\n');
        
        // 1.5 BUSCAR O CREAR CIUDAD QUILLECO
        console.log('📍 Buscando ciudad Quilleco...');
        let ciudadResult = await pool.query(
            `SELECT id FROM ciudades WHERE nombre = 'Quilleco'`
        );
        
        let ciudadId;
        if (ciudadResult.rows.length === 0) {
            console.log('   Ciudad no existe, creándola...');
            const nuevaCiudad = await pool.query(
                `INSERT INTO ciudades (nombre) VALUES ('Quilleco') RETURNING id`
            );
            ciudadId = nuevaCiudad.rows[0].id;
            console.log(`   ✅ Ciudad creada con ID: ${ciudadId}`);
        } else {
            ciudadId = ciudadResult.rows[0].id;
            console.log(`   ✅ Ciudad encontrada con ID: ${ciudadId}`);
        }
        
        // 2. INSERTAR COMPLEJO
        console.log('\n📍 Insertando complejo...');
        const complejoResult = await pool.query(`
            INSERT INTO complejos (nombre, ciudad_id, direccion, telefono, email)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [
            'Espacio Deportivo Borde Río',
            ciudadId, // ID dinámico de la ciudad
            'Ruta Q-575, Quilleco, Bio Bio',
            '+56999820929',
            'admin@borderio.cl'
        ]);
        
        const complejoId = complejoResult.rows[0].id;
        console.log(`✅ Complejo insertado con ID: ${complejoId}\n`);
        
        // 3. INSERTAR CANCHA
        console.log('🎾 Insertando cancha...');
        await pool.query(`
            INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora)
            VALUES ($1, $2, $3, $4)
        `, [complejoId, 'Cancha Principal', 'futbol', 8000]);
        console.log('✅ Cancha insertada\n');
        
        // 4. INSERTAR USUARIOS (owner y manager)
        console.log('👥 Insertando usuarios...');
        
        // Usuario Owner
        await pool.query(`
            INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            'admin@borderio.cl',
            '$2a$10$xxPf6VV2tRugXmHq1G1kUO0S3FbUoVwAj0Kpeitnd8nPDsTW4O2jq', // Contraseña hasheada
            'Administrador Borde Rio',
            'owner',
            true,
            complejoId
        ]);
        console.log('  ✅ Owner: admin@borderio.cl');
        
        // Usuario Manager
        await pool.query(`
            INSERT INTO usuarios (email, password, nombre, rol, activo, complejo_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            'manager@borderio.cl',
            '$2a$12$oAQkI/cORrwzQU0BQMq4kuNsNMzmAgjLKACSNwuTGhesmkd1wkaLq', // Contraseña hasheada
            'Manager Borde Rio',
            'manager',
            true,
            complejoId
        ]);
        console.log('  ✅ Manager: manager@borderio.cl\n');
        
        // 5. INSERTAR CATEGORÍAS DE GASTOS E INGRESOS
        console.log('💰 Insertando categorías...');
        
        const categorias = [
            // GASTOS
            ['Luz', 'Cuenta de electricidad', 'fas fa-bolt', '#f39c12', 'gasto'],
            ['Agua', 'Cuenta de agua', 'fas fa-tint', '#3498db', 'gasto'],
            ['Internet', 'Internet y teléfono', 'fas fa-wifi', '#1abc9c', 'gasto'],
            ['Mantención Cancha', 'Arreglos y mantención de canchas', 'fas fa-tools', '#27ae60', 'gasto'],
            ['Aseo', 'Productos de limpieza y aseo', 'fas fa-broom', '#16a085', 'gasto'],
            ['Publicidad', 'Carteles, volantes, redes sociales', 'fas fa-ad', '#e91e63', 'gasto'],
            ['Otros Gastos', 'Otros gastos varios', 'fas fa-ellipsis-h', '#bdc3c7', 'gasto'],
            ['Comisión Plataforma', 'Comisión cobrada por uso de la plataforma web', 'fas fa-percent', '#e91e63', 'gasto'],
            // INGRESOS
            ['Reservas Web', 'Reservas hechas por la página web', 'fas fa-globe', '#27ae60', 'ingreso'],
            ['Reservas en Cancha', 'Reservas hechas directamente en la cancha', 'fas fa-hand-holding-usd', '#2ecc71', 'ingreso']
        ];
        
        for (const [nombre, descripcion, icono, color, tipo] of categorias) {
            await pool.query(`
                INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
                VALUES ($1, $2, $3, $4, $5, $6, true)
            `, [complejoId, nombre, descripcion, icono, color, tipo]);
            console.log(`  ✅ ${tipo === 'gasto' ? '💸' : '💰'} ${nombre}`);
        }
        
        console.log('\n🎉 TODAS LAS INSERCIONES COMPLETADAS EXITOSAMENTE\n');
        
        // Confirmar transacción
        await pool.query('COMMIT');
        
        // 6. MOSTRAR RESUMEN
        console.log('📊 RESUMEN FINAL:');
        console.log(`   ✅ Complejo: Espacio Deportivo Borde Río (ID: ${complejoId})`);
        console.log(`   ✅ Canchas: 1`);
        console.log(`   ✅ Usuarios: 2 (1 owner, 1 manager)`);
        console.log(`   ✅ Categorías: ${categorias.length} (${categorias.filter(c => c[4] === 'gasto').length} gastos, ${categorias.filter(c => c[4] === 'ingreso').length} ingresos)`);
        console.log(`\n🔐 CREDENCIALES:`);
        console.log(`   Owner: admin@borderio.cl / password: borderio2024`);
        console.log(`   Manager: manager@borderio.cl / password: manager123\n`);
        
        await pool.end();
        console.log('✅ Conexión cerrada\n');
        
    } catch (error) {
        console.error('\n❌ ERROR DURANTE LA INSERCIÓN:', error.message);
        console.error('   Realizando ROLLBACK...\n');
        await pool.query('ROLLBACK');
        await pool.end();
        process.exit(1);
    }
}

// Verificar que se esté ejecutando contra producción
console.log('\n⚠️  ═══════════════════════════════════════════════════════════════');
console.log('⚠️  ESTE SCRIPT INSERTARÁ DATOS EN LA BASE DE DATOS DE PRODUCCIÓN');
console.log('⚠️  ═══════════════════════════════════════════════════════════════\n');

if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL no está configurada');
    console.error('   Configura la variable de entorno DATABASE_URL con la conexión de producción\n');
    process.exit(1);
}

// Confirmar antes de ejecutar
console.log('📋 Datos a insertar:');
console.log('   - Complejo: Espacio Deportivo Borde Río');
console.log('   - 1 cancha de fútbol');
console.log('   - 2 usuarios (owner + manager)');
console.log('   - 10 categorías de gastos/ingresos');
console.log('   - 0 reservas (excluidas intencionalmente)\n');

insertarBordeRioProduccion();


const { Client } = require('pg');
require('dotenv').config();

async function buscarReservaPorAutorizacion(authorizationCode, databaseUrl) {
    console.log('\n🔍 BUSCANDO RESERVA POR CÓDIGO DE AUTORIZACIÓN');
    console.log('===============================================');
    console.log(`Código de autorización: ${authorizationCode}\n`);

    // Usar la URL proporcionada o la del .env
    const connectionString = databaseUrl || process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.log('❌ Error: No se encontró DATABASE_URL');
        console.log('\n💡 Opciones:');
        console.log('   1. Configurar DATABASE_URL en tu archivo .env');
        console.log('   2. Pasar la URL como segundo parámetro:');
        console.log('      node scripts/buscar-reserva-por-autorizacion.js 025930 "postgresql://..."');
        console.log('   3. Usar variable de entorno:');
        console.log('      DATABASE_URL="postgresql://..." node scripts/buscar-reserva-por-autorizacion.js 025930');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Buscar el pago con el código de autorización
        const pagoResult = await client.query(`
            SELECT 
                p.*,
                r.id as reserva_id,
                r.codigo_reserva,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                r.rut_cliente,
                TO_CHAR(r.fecha, 'YYYY-MM-DD') as fecha_reserva,
                r.hora_inicio,
                r.hora_fin,
                r.precio_total,
                r.estado as estado_reserva,
                r.estado_pago,
                r.porcentaje_pagado,
                c.nombre as cancha_nombre,
                c.tipo as cancha_tipo,
                co.nombre as complejo_nombre,
                co.direccion as complejo_direccion,
                co.telefono as complejo_telefono
            FROM pagos p
            LEFT JOIN reservas r ON p.reservation_code = r.codigo_reserva
            LEFT JOIN canchas c ON r.cancha_id = c.id
            LEFT JOIN complejos co ON c.complejo_id = co.id
            WHERE p.authorization_code = $1
            ORDER BY p.created_at DESC
            LIMIT 1
        `, [authorizationCode]);

        if (pagoResult.rows.length === 0) {
            console.log('❌ No se encontró ningún pago con ese código de autorización');
            console.log('\n🔍 Buscando en todos los pagos recientes...\n');
            
            // Buscar pagos recientes para ayudar a identificar
            const pagosRecientes = await client.query(`
                SELECT 
                    authorization_code,
                    transbank_token,
                    amount,
                    status,
                    reservation_code,
                    created_at
                FROM pagos
                WHERE created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 20
            `);
            
            if (pagosRecientes.rows.length > 0) {
                console.log('📋 Pagos recientes (últimos 7 días):');
                pagosRecientes.rows.forEach((pago, index) => {
                    console.log(`\n${index + 1}. Código de autorización: ${pago.authorization_code || 'N/A'}`);
                    console.log(`   Token: ${pago.transbank_token.substring(0, 30)}...`);
                    console.log(`   Monto: $${pago.amount}`);
                    console.log(`   Estado: ${pago.status}`);
                    console.log(`   Código de reserva: ${pago.reservation_code || 'N/A'}`);
                    console.log(`   Fecha: ${pago.created_at}`);
                });
            }
            
            return;
        }

        const pago = pagoResult.rows[0];

        console.log('✅ PAGO ENCONTRADO\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 INFORMACIÓN DEL PAGO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`ID del pago: ${pago.id}`);
        console.log(`Token Transbank: ${pago.transbank_token}`);
        console.log(`Order ID: ${pago.order_id}`);
        console.log(`Código de autorización: ${pago.authorization_code}`);
        console.log(`Monto: $${pago.amount.toLocaleString()}`);
        console.log(`Estado del pago: ${pago.status}`);
        console.log(`Tipo de pago: ${pago.payment_type_code || 'N/A'}`);
        console.log(`Código de respuesta: ${pago.response_code || 'N/A'}`);
        console.log(`Número de cuotas: ${pago.installments_number || 'N/A'}`);
        console.log(`Fecha de transacción: ${pago.transaction_date || 'N/A'}`);
        console.log(`Fecha de creación: ${pago.created_at}`);

        if (pago.reserva_id) {
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log('🏟️  INFORMACIÓN DE LA RESERVA');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`Código de reserva: ${pago.codigo_reserva}`);
            console.log(`ID de reserva: ${pago.reserva_id}`);
            console.log(`Estado de reserva: ${pago.estado_reserva}`);
            console.log(`Estado de pago: ${pago.estado_pago}`);
            console.log(`Porcentaje pagado: ${pago.porcentaje_pagado || 100}%`);
            console.log(`\n👤 DATOS DEL CLIENTE`);
            console.log(`   Nombre: ${pago.nombre_cliente}`);
            console.log(`   Email: ${pago.email_cliente}`);
            console.log(`   Teléfono: ${pago.telefono_cliente || 'N/A'}`);
            console.log(`   RUT: ${pago.rut_cliente || 'N/A'}`);
            console.log(`\n📅 DETALLES DE LA RESERVA`);
            console.log(`   Complejo: ${pago.complejo_nombre || 'N/A'}`);
            console.log(`   Dirección: ${pago.complejo_direccion || 'N/A'}`);
            console.log(`   Teléfono complejo: ${pago.complejo_telefono || 'N/A'}`);
            console.log(`   Cancha: ${pago.cancha_nombre || 'N/A'} (${pago.cancha_tipo || 'N/A'})`);
            console.log(`   Fecha: ${pago.fecha_reserva}`);
            console.log(`   Horario: ${pago.hora_inicio} - ${pago.hora_fin}`);
            console.log(`   Precio total: $${pago.precio_total?.toLocaleString() || 'N/A'}`);
        } else {
            console.log('\n⚠️  ADVERTENCIA: No se encontró una reserva asociada a este pago');
            console.log(`   Código de reserva en pago: ${pago.reservation_code || 'N/A'}`);
            
            // Intentar buscar la reserva por el código
            if (pago.reservation_code) {
                const reservaResult = await client.query(`
                    SELECT 
                        r.*,
                        c.nombre as cancha_nombre,
                        co.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos co ON c.complejo_id = co.id
                    WHERE r.codigo_reserva = $1
                `, [pago.reservation_code]);
                
                if (reservaResult.rows.length > 0) {
                    const reserva = reservaResult.rows[0];
                    console.log('\n✅ RESERVA ENCONTRADA POR CÓDIGO:');
                    console.log(`   Código: ${reserva.codigo_reserva}`);
                    console.log(`   Cliente: ${reserva.nombre_cliente}`);
                    console.log(`   Email: ${reserva.email_cliente}`);
                    console.log(`   Complejo: ${reserva.complejo_nombre || 'N/A'}`);
                    console.log(`   Cancha: ${reserva.cancha_nombre || 'N/A'}`);
                } else {
                    console.log('\n❌ No se encontró reserva con ese código');
                }
            }
        }

        // Verificar si hay bloqueo temporal asociado
        if (pago.bloqueo_id) {
            const bloqueoResult = await client.query(`
                SELECT * FROM bloqueos_temporales WHERE id = $1
            `, [pago.bloqueo_id]);
            
            if (bloqueoResult.rows.length > 0) {
                console.log('\n⚠️  BLOQUEO TEMPORAL AÚN EXISTE');
                console.log(`   ID: ${bloqueoResult.rows[0].id}`);
                console.log(`   Expira: ${bloqueoResult.rows[0].expira_en}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await client.end();
    }
}

// Obtener el código de autorización de los argumentos de línea de comandos
const authorizationCode = process.argv[2];
const databaseUrl = process.argv[3]; // URL opcional como segundo parámetro

if (!authorizationCode) {
    console.log('❌ Por favor, proporciona el código de autorización');
    console.log('\n📖 Uso:');
    console.log('   node scripts/buscar-reserva-por-autorizacion.js <codigo_autorizacion> [database_url]');
    console.log('\n📝 Ejemplos:');
    console.log('   # Usando DATABASE_URL del .env:');
    console.log('   node scripts/buscar-reserva-por-autorizacion.js 025930');
    console.log('\n   # Pasando URL directamente:');
    console.log('   node scripts/buscar-reserva-por-autorizacion.js 025930 "postgresql://user:pass@host:5432/db"');
    console.log('\n   # Usando variable de entorno:');
    console.log('   DATABASE_URL="postgresql://..." node scripts/buscar-reserva-por-autorizacion.js 025930');
    process.exit(1);
}

buscarReservaPorAutorizacion(authorizationCode, databaseUrl);


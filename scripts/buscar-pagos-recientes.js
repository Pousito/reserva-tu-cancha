const { Client } = require('pg');
require('dotenv').config();

async function buscarPagosRecientes() {
    console.log('\n🔍 BUSCANDO PAGOS RECIENTES');
    console.log('===========================\n');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos\n');

        // Buscar pagos de las últimas 48 horas
        const pagosResult = await client.query(`
            SELECT 
                p.*,
                r.codigo_reserva,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                c.nombre as cancha_nombre,
                co.nombre as complejo_nombre
            FROM pagos p
            LEFT JOIN reservas r ON p.reservation_code = r.codigo_reserva
            LEFT JOIN canchas c ON r.cancha_id = c.id
            LEFT JOIN complejos co ON c.complejo_id = co.id
            WHERE p.created_at > NOW() - INTERVAL '48 hours'
            ORDER BY p.created_at DESC
        `);

        console.log(`📊 Total de pagos en las últimas 48 horas: ${pagosResult.rows.length}\n`);

        if (pagosResult.rows.length === 0) {
            console.log('❌ No se encontraron pagos recientes');
            return;
        }

        pagosResult.rows.forEach((pago, index) => {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`📋 PAGO #${index + 1}`);
            console.log(`${'═'.repeat(60)}`);
            console.log(`ID: ${pago.id}`);
            console.log(`Token Transbank: ${pago.transbank_token.substring(0, 40)}...`);
            console.log(`Código de autorización: ${pago.authorization_code || '❌ NO REGISTRADO'}`);
            console.log(`Order ID: ${pago.order_id}`);
            console.log(`Monto: $${pago.amount.toLocaleString()}`);
            console.log(`Estado: ${pago.status}`);
            console.log(`Tipo de pago: ${pago.payment_type_code || 'N/A'}`);
            console.log(`Código de respuesta: ${pago.response_code || 'N/A'}`);
            console.log(`Fecha de transacción: ${pago.transaction_date || 'N/A'}`);
            console.log(`Fecha de creación: ${pago.created_at}`);
            
            if (pago.codigo_reserva) {
                console.log(`\n🏟️  RESERVA ASOCIADA:`);
                console.log(`   Código: ${pago.codigo_reserva}`);
                console.log(`   Cliente: ${pago.nombre_cliente || 'N/A'}`);
                console.log(`   Email: ${pago.email_cliente || 'N/A'}`);
                console.log(`   Teléfono: ${pago.telefono_cliente || 'N/A'}`);
                console.log(`   Complejo: ${pago.complejo_nombre || 'N/A'}`);
                console.log(`   Cancha: ${pago.cancha_nombre || 'N/A'}`);
            } else {
                console.log(`\n⚠️  Código de reserva: ${pago.reservation_code || 'N/A'}`);
            }
        });

        // Buscar específicamente por el token mencionado anteriormente
        const tokenAnterior = '1231b73e215dcf89df9a9de77cecf69035e5490dbf02621b3b430237c0c390d4';
        console.log(`\n\n🔍 Buscando token específico: ${tokenAnterior.substring(0, 30)}...`);
        
        const tokenResult = await client.query(`
            SELECT 
                p.*,
                r.codigo_reserva,
                r.nombre_cliente,
                r.email_cliente,
                r.telefono_cliente,
                c.nombre as cancha_nombre,
                co.nombre as complejo_nombre
            FROM pagos p
            LEFT JOIN reservas r ON p.reservation_code = r.codigo_reserva
            LEFT JOIN canchas c ON r.cancha_id = c.id
            LEFT JOIN complejos co ON c.complejo_id = co.id
            WHERE p.transbank_token = $1
        `, [tokenAnterior]);

        if (tokenResult.rows.length > 0) {
            const pago = tokenResult.rows[0];
            console.log('\n✅ PAGO ENCONTRADO POR TOKEN:');
            console.log(`   Código de autorización: ${pago.authorization_code || 'NO REGISTRADO'}`);
            console.log(`   Estado: ${pago.status}`);
            console.log(`   Código de reserva: ${pago.codigo_reserva || pago.reservation_code || 'N/A'}`);
        } else {
            console.log('❌ No se encontró el pago con ese token');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    } finally {
        await client.end();
    }
}

buscarPagosRecientes();


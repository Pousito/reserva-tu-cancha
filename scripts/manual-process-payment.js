const { Client } = require('pg');
require('dotenv').config();

async function manualProcessPayment() {
    console.log('\n🔧 PROCESAMIENTO MANUAL DE PAGO');
    console.log('=================================');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        // Obtener el pago pendiente más reciente
        const payment = await client.query(`
            SELECT * FROM pagos 
            WHERE status = 'pending' 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (payment.rows.length === 0) {
            console.log('❌ No hay pagos pendientes');
            return;
        }

        const paymentData = payment.rows[0];
        console.log('📊 Procesando pago:', {
            token: paymentData.transbank_token.substring(0, 20) + '...',
            amount: paymentData.amount,
            orderId: paymentData.order_id
        });

        // Obtener datos del bloqueo temporal
        const bloqueoData = await client.query(`
            SELECT * FROM bloqueos_temporales 
            WHERE id = $1
        `, [paymentData.bloqueo_id]);
        
        if (bloqueoData.rows.length === 0) {
            console.log('❌ Bloqueo temporal no encontrado');
            return;
        }
        
        const bloqueo = bloqueoData.rows[0];
        const datosCliente = JSON.parse(bloqueo.datos_cliente);
        
        console.log('📋 Datos del cliente:', {
            nombre: datosCliente.nombre_cliente,
            email: datosCliente.email_cliente,
            telefono: datosCliente.telefono_cliente
        });
        
        // Crear la reserva manualmente
        console.log('\n🎯 Creando reserva manualmente...');
        const reservaResult = await client.query(`
            INSERT INTO reservas (
                cancha_id, nombre_cliente, email_cliente, telefono_cliente, 
                rut_cliente, fecha, hora_inicio, hora_fin, precio_total, 
                codigo_reserva, estado, estado_pago, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING codigo_reserva
        `, [
            bloqueo.cancha_id,
            datosCliente.nombre_cliente,
            datosCliente.email_cliente,
            datosCliente.telefono_cliente,
            datosCliente.rut_cliente,
            bloqueo.fecha,
            bloqueo.hora_inicio,
            bloqueo.hora_fin,
            datosCliente.precio_total,
            paymentData.reservation_code,
            'confirmada',
            'pagado',
            new Date().toISOString()
        ]);
        
        console.log('✅ Reserva creada:', reservaResult.rows[0].codigo_reserva);
        
        // Actualizar el pago como aprobado
        await client.query(`
            UPDATE pagos SET 
                status = $1, 
                authorization_code = $2, 
                payment_type_code = $3, 
                response_code = $4, 
                installments_number = $5, 
                transaction_date = $6,
                updated_at = NOW()
            WHERE transbank_token = $7
        `, [
            'approved',
            'MANUAL_AUTH', // Código manual
            'VD', // Venta débito
            0, // Código de respuesta exitoso
            1, // 1 cuota
            new Date().toISOString(),
            paymentData.transbank_token
        ]);
        
        console.log('✅ Pago actualizado a aprobado');
        
        // Eliminar bloqueo temporal
        await client.query('DELETE FROM bloqueos_temporales WHERE id = $1', [paymentData.bloqueo_id]);
        console.log('✅ Bloqueo temporal eliminado');
        
        console.log('\n🎉 ¡PAGO PROCESADO MANUALMENTE!');
        console.log(`📋 Código de reserva: ${reservaResult.rows[0].codigo_reserva}`);
        console.log(`💰 Monto: $${paymentData.amount}`);
        console.log(`👤 Cliente: ${datosCliente.nombre_cliente}`);
        console.log(`📧 Email: ${datosCliente.email_cliente}`);
        
        console.log('\n📝 PRÓXIMOS PASOS:');
        console.log('1. Autorizar la transacción en el panel de Transbank');
        console.log('2. Enviar email de confirmación al cliente');
        console.log('3. Verificar que la reserva aparezca en "Mis Reservas"');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

manualProcessPayment();

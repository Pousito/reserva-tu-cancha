const { Client } = require('pg');
const PaymentService = require('../src/services/paymentService');
require('dotenv').config();

async function checkTransactionStatus() {
    console.log('\n🔍 VERIFICANDO ESTADO DE TRANSACCIÓN');
    console.log('=====================================');

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
        console.log('📊 Pago encontrado:', {
            token: paymentData.transbank_token,
            amount: paymentData.amount,
            orderId: paymentData.order_id,
            status: paymentData.status,
            created: paymentData.created_at
        });

        // Verificar estado con Transbank
        console.log('\n🏦 Verificando estado con Transbank...');
        const paymentService = new PaymentService();
        
        try {
            const statusResult = await paymentService.getTransactionStatus(paymentData.transbank_token);
            console.log('📊 Estado de la transacción:', statusResult);
            
            if (statusResult.success) {
                console.log('\n📋 DETALLES DE LA TRANSACCIÓN:');
                console.log(`  Status: ${statusResult.status}`);
                console.log(`  Amount: $${statusResult.amount}`);
                console.log(`  Order ID: ${statusResult.orderId}`);
                console.log(`  Authorization Code: ${statusResult.authorizationCode || 'N/A'}`);
                console.log(`  Payment Type: ${statusResult.paymentTypeCode || 'N/A'}`);
                console.log(`  Response Code: ${statusResult.responseCode || 'N/A'}`);
                console.log(`  Transaction Date: ${statusResult.transactionDate || 'N/A'}`);
                
                if (statusResult.status === 'AUTHORIZED') {
                    console.log('\n✅ TRANSACCIÓN AUTORIZADA - Lista para procesar');
                } else if (statusResult.status === 'FAILED') {
                    console.log('\n❌ TRANSACCIÓN FALLIDA');
                } else {
                    console.log(`\n⏳ TRANSACCIÓN EN ESTADO: ${statusResult.status}`);
                }
            } else {
                console.log('❌ Error obteniendo estado:', statusResult.error);
            }
            
        } catch (error) {
            console.error('❌ Error verificando estado:', error);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

checkTransactionStatus();


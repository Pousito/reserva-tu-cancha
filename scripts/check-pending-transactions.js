const { Client } = require('pg');
const PaymentService = require('../src/services/paymentService');
require('dotenv').config();

async function checkPendingTransactions() {
    console.log('\n🔍 VERIFICANDO TRANSACCIONES PENDIENTES');
    console.log('========================================');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        // Buscar transacciones recientes
        const recentTransactions = await client.query(`
            SELECT * FROM pagos 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        `);

        console.log(`\n📊 Transacciones en las últimas 24 horas: ${recentTransactions.rows.length}`);
        
        for (const transaction of recentTransactions.rows) {
            console.log(`\n🔍 Transacción: ${transaction.transbank_token.substring(0, 20)}...`);
            console.log(`   Status: ${transaction.status}`);
            console.log(`   Amount: $${transaction.amount}`);
            console.log(`   Order ID: ${transaction.order_id}`);
            console.log(`   Created: ${transaction.created_at}`);
            
            // Verificar estado en Transbank
            if (transaction.status === 'pending') {
                console.log('   ⏳ Verificando estado en Transbank...');
                const paymentService = new PaymentService();
                
                try {
                    const statusResult = await paymentService.getTransactionStatus(transaction.transbank_token);
                    
                    if (statusResult.success) {
                        console.log(`   📊 Estado en Transbank: ${statusResult.status}`);
                        
                        if (statusResult.status === 'AUTHORIZED') {
                            console.log('   ✅ ¡TRANSACCIÓN AUTORIZADA! - Lista para procesar');
                        } else if (statusResult.status === 'FAILED') {
                            console.log('   ❌ Transacción fallida');
                        } else {
                            console.log(`   ⏳ Transacción en estado: ${statusResult.status}`);
                        }
                    } else {
                        console.log(`   ❌ Error verificando estado: ${statusResult.error}`);
                    }
                } catch (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }
        }

        // Verificar si hay transacciones pendientes sin reserva
        const pendingWithoutReservation = await client.query(`
            SELECT p.*, bt.session_id, bt.datos_cliente
            FROM pagos p
            LEFT JOIN bloqueos_temporales bt ON p.bloqueo_id = bt.id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
        `);
        
        if (pendingWithoutReservation.rows.length > 0) {
            console.log(`\n⚠️  TRANSACCIONES PENDIENTES SIN RESERVA: ${pendingWithoutReservation.rows.length}`);
            pendingWithoutReservation.rows.forEach((payment, index) => {
                console.log(`\n${index + 1}. Token: ${payment.transbank_token.substring(0, 20)}...`);
                console.log(`   Amount: $${payment.amount}`);
                console.log(`   Session: ${payment.session_id}`);
                console.log(`   Cliente: ${payment.datos_cliente ? JSON.parse(payment.datos_cliente).nombre_cliente : 'N/A'}`);
                console.log(`   Creado: ${payment.created_at}`);
            });
        } else {
            console.log('\n✅ No hay transacciones pendientes sin reserva');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

checkPendingTransactions();

